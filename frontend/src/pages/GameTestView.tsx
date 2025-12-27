import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useActor } from '../hooks/useActor';
import { useGetCharacterSpriteSheet, useListPlayableCharacters, useGetSpriteSheet } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, Pause, ZoomIn, ZoomOut, Gauge, Film } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import type { PlayableCharacter, SpriteSheet } from '../backend';

interface GameTestViewProps {
    mapId: string;
    characterId: string;
    onBack: () => void;
}

const TILE_SIZE = 32;
const DEFAULT_MOVE_SPEED = 4; // pixels per frame
const DEFAULT_ANIMATION_FPS = 8; // fps

// Default character hitbox - used as fallback if sprite sheet doesn't define one
// This accounts for transparent space around the character sprite
const DEFAULT_HITBOX = {
    offsetX: 8,   // Pixels from left edge of sprite to hitbox left
    offsetY: 40,  // Pixels from top of sprite to hitbox top (for 64px tall sprite, this puts hitbox at feet)
    width: 16,    // Hitbox width in pixels
    height: 24    // Hitbox height in pixels
};

// Tile color fallback map for when images are missing
const TILE_COLOR_MAP: Record<string, string> = {
    'grass': '#4ade80',  // green
    'dirt': '#a16207',   // brown
    'stone': '#6b7280',  // grey
    'water': '#3b82f6',  // blue
    'sand': '#fcd34d',   // yellow
    'default': '#333',   // dark grey
};

export function GameTestView({ mapId, characterId, onBack }: GameTestViewProps) {
    const { actor } = useActor();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Character state
    const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
    const [playerDirection, setPlayerDirection] = useState<'up' | 'down' | 'left' | 'right'>('down');
    const [isMoving, setIsMoving] = useState(false);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [showCollisionDebug, setShowCollisionDebug] = useState(false); // Show solid tile overlay (red boxes)
    const [showCharacterHitbox, setShowCharacterHitbox] = useState(false); // Show character hitbox overlay

    // Controls state
    const [zoom, setZoom] = useState(2); // 1 = 100%, 2 = 200%, etc.
    const [moveSpeed, setMoveSpeed] = useState(DEFAULT_MOVE_SPEED);
    const [animationFPS, setAnimationFPS] = useState(DEFAULT_ANIMATION_FPS);

    // Camera state
    const [camera, setCamera] = useState({ x: 0, y: 0 });

    // Keys pressed
    const keysPressed = useRef<Set<string>>(new Set());

    // Animation timing refs (persist across effect re-runs)
    const animationTimingRef = useRef({ lastTime: 0, frameTime: 0 });
    const animationFPSRef = useRef(animationFPS);

    // Image caches
    const [tileImages, setTileImages] = useState<Record<string, HTMLImageElement>>({});
    const [objectImages, setObjectImages] = useState<Record<string, HTMLImageElement>>({});
    const [characterImage, setCharacterImage] = useState<HTMLImageElement | null>(null);

    // Collision map - set of "x,y" grid positions that are solid
    const [collisionMap, setCollisionMap] = useState<Set<string>>(new Set());

    // Queries
    const { data: mapData, isLoading: isMapLoading } = useQuery({
        queryKey: ['map', mapId],
        queryFn: async () => {
            if (!actor || !mapId) return null;
            const result = await (actor as any).getMap(mapId);
            if (Array.isArray(result) && result.length > 0) {
                const map = result[0];
                // Transform to local format
                return {
                    ...map,
                    width: Number(map.width),
                    height: Number(map.height),
                    tile_instances: map.tile_instances.map((t: any) => ({
                        tileId: t.tile_id,
                        x: Number(t.position.x),
                        y: Number(t.position.y)
                    })),
                    object_instances: map.object_instances.map((o: any) => ({
                        objectId: o.object_id,
                        x: Number(o.position.x),
                        y: Number(o.position.y)
                    })),
                    spawn_points: (map.spawn_points || []).map((s: any) => ({
                        id: s.id,
                        characterId: s.character_id,
                        x: Number(s.position?.x || s.x || 0),
                        y: Number(s.position?.y || s.y || 0)
                    }))
                };
            }
            throw new Error("Map not found");
        },
        enabled: !!actor && !!mapId,
    });

    const { data: tiles = [] } = useQuery({
        queryKey: ['tiles'],
        queryFn: async () => {
            if (!actor) return [];
            return (actor as any).listTiles();
        },
        enabled: !!actor,
    });

    const { data: objects = [] } = useQuery({
        queryKey: ['objects'],
        queryFn: async () => {
            if (!actor) return [];
            return (actor as any).getObjects();
        },
        enabled: !!actor,
    });

    const { data: characters = [] } = useListPlayableCharacters();

    // Get selected character
    const selectedCharacter = characters.find((c: PlayableCharacter) => c.id === characterId);
    // Get sprite sheet ID from character, then fetch fresh data from sprite_sheets table
    // (character's embedded copy may have stale hitbox data)
    const embeddedSpriteSheet = selectedCharacter?.sprite_sheets[0];
    const spriteSheetId = embeddedSpriteSheet?.id || '';
    const { data: freshSpriteSheet } = useGetSpriteSheet(spriteSheetId);
    // Use fresh data if available, otherwise fall back to embedded copy
    const spriteSheet = freshSpriteSheet || embeddedSpriteSheet;

    // DEBUG: Log hitbox values from sprite sheet
    useEffect(() => {
        if (spriteSheet) {
            console.log('🎯 SPRITE SHEET HITBOX DATA:', {
                hasHitbox: !!spriteSheet.hitbox,
                hitboxArray: spriteSheet.hitbox,
                hitboxLength: spriteSheet.hitbox?.length || 0,
                firstHitbox: spriteSheet.hitbox?.[0],
                offset_x: spriteSheet.hitbox?.[0]?.offset_x,
                offset_y: spriteSheet.hitbox?.[0]?.offset_y,
                width: spriteSheet.hitbox?.[0]?.width,
                height: spriteSheet.hitbox?.[0]?.height,
            });
        }
    }, [spriteSheet]);

    // Load sprite sheet image
    const { data: spriteSheetBlob } = useGetCharacterSpriteSheet(spriteSheet?.blob_id || '');

    useEffect(() => {
        if (!spriteSheetBlob) return;

        const img = new Image();
        img.onload = () => setCharacterImage(img);

        try {
            const uint8Array = spriteSheetBlob instanceof Uint8Array ? spriteSheetBlob : new Uint8Array(spriteSheetBlob);
            let binary = '';
            const chunkSize = 0x8000;
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
                const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
                binary += String.fromCharCode.apply(null, Array.from(chunk));
            }
            const base64 = btoa(binary);
            img.src = `data:image/png;base64,${base64}`;
        } catch (error) {
            console.error('Error loading sprite sheet:', error);
        }
    }, [spriteSheetBlob]);

    // Initialize player position from spawn point
    useEffect(() => {
        if (!mapData) return;

        const spawn = mapData.spawn_points.find((s: any) => s.characterId === characterId);
        if (spawn) {
            setPlayerPos({ x: spawn.x * TILE_SIZE, y: spawn.y * TILE_SIZE });
            setCamera({
                x: spawn.x * TILE_SIZE - (canvasRef.current?.width || 800) / 2,
                y: spawn.y * TILE_SIZE - (canvasRef.current?.height || 600) / 2
            });
        }
    }, [mapData, characterId]);

    // Build collision map when map data and tiles are loaded
    useEffect(() => {
        if (!mapData || tiles.length === 0) return;

        const newCollisionMap = new Set<string>();

        // Create a lookup map for tiles by ID
        const tileById: Record<string, any> = {};
        const tileDebugInfo: { id: string, name: string, is_solid: boolean }[] = [];
        for (const tile of tiles) {
            tileById[tile.id] = tile;
            tileDebugInfo.push({ id: tile.id, name: tile.name, is_solid: tile.is_solid });
        }

        // Log tile solid status as a table
        console.log('=== TILE SOLID STATUS ===');
        console.table(tileDebugInfo);

        // Check each tile instance on the map
        const solidPositions: { x: number, y: number, tileId: string, name: string }[] = [];
        const orphanInstances: { x: number, y: number, tileId: string }[] = [];

        for (const instance of mapData.tile_instances) {
            const tile = tileById[instance.tileId];
            if (!tile) {
                // Tile instance references unknown tile ID
                orphanInstances.push({ x: instance.x, y: instance.y, tileId: instance.tileId });
                continue;
            }
            if (tile?.is_solid) {
                // Add this grid position to collision map
                newCollisionMap.add(`${instance.x},${instance.y}`);
                solidPositions.push({ x: instance.x, y: instance.y, tileId: instance.tileId, name: tile.name });
            }
        }

        // Log solid tile positions as a table
        console.log('=== SOLID TILE POSITIONS ===');
        console.table(solidPositions);

        // Log orphan instances (if any)
        if (orphanInstances.length > 0) {
            console.log('⚠️ === ORPHAN TILE INSTANCES (unknown tile IDs) ===');
            console.table(orphanInstances);
        }

        setCollisionMap(newCollisionMap);
        console.log('Collision map built:', newCollisionMap.size, 'solid tiles out of', mapData.tile_instances.length, 'total instances', 'orphans:', orphanInstances.length);
    }, [mapData, tiles]);

    // Load tile images
    useEffect(() => {
        if (!actor || tiles.length === 0) return;

        const loadImages = async () => {
            const newImages: Record<string, HTMLImageElement> = {};

            for (const tile of tiles) {
                if (tileImages[tile.id] || !tile.blob_id) continue;

                try {
                    const result = await (actor as any).getTileImage(tile.id);
                    if (Array.isArray(result) && result.length > 0) {
                        const blobData = result[0];
                        const blob = new Blob([new Uint8Array(blobData)], { type: 'image/png' });
                        const url = URL.createObjectURL(blob);
                        const img = new Image();
                        img.src = url;
                        await new Promise((resolve) => { img.onload = resolve; });
                        newImages[tile.id] = img;
                    }
                } catch (err) {
                    console.error(`Failed to load tile ${tile.id}:`, err);
                }
            }

            if (Object.keys(newImages).length > 0) {
                setTileImages(prev => ({ ...prev, ...newImages }));
            }
        };

        loadImages();
    }, [tiles, actor]);

    // Load object images
    useEffect(() => {
        if (!actor || objects.length === 0) return;

        const loadImages = async () => {
            const newImages: Record<string, HTMLImageElement> = {};

            for (const obj of objects) {
                if (objectImages[obj.id]) continue;

                try {
                    const result = await (actor as any).getObjectImage(obj.id);
                    if (Array.isArray(result) && result.length > 0) {
                        const blobData = result[0];
                        const blob = new Blob([new Uint8Array(blobData)], { type: 'image/png' });
                        const url = URL.createObjectURL(blob);
                        const img = new Image();
                        img.src = url;
                        await new Promise((resolve) => { img.onload = resolve; });
                        newImages[obj.id] = img;
                    }
                } catch (err) {
                    console.error(`Failed to load object ${obj.id}:`, err);
                }
            }

            if (Object.keys(newImages).length > 0) {
                setObjectImages(prev => ({ ...prev, ...newImages }));
            }
        };

        loadImages();
    }, [objects, actor]);

    // Keyboard handlers
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                keysPressed.current.add(e.key.toLowerCase());
            }
            if (e.key === 'Escape') {
                setIsPaused(p => !p);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            keysPressed.current.delete(e.key.toLowerCase());
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Get animation for direction
    const getAnimationForDirection = useCallback((direction: string, sheet: SpriteSheet) => {
        // Find animation matching direction
        for (const anim of sheet.animations) {
            let animDir: string | null = null;
            if (Array.isArray(anim.direction) && anim.direction.length > 0 && anim.direction[0]) {
                const dirObj = anim.direction[0] as Record<string, unknown>;
                animDir = Object.keys(dirObj)[0] || null;
            }

            if (animDir === direction) {
                return anim;
            }
        }
        // Fallback to first animation
        return sheet.animations[0];
    }, []);

    // Keep FPS ref in sync with state
    useEffect(() => {
        animationFPSRef.current = animationFPS;
    }, [animationFPS]);

    // Game loop
    useEffect(() => {
        if (!mapData || isPaused) return;

        let animationId: number;

        const gameLoop = (time: number) => {
            const timing = animationTimingRef.current;
            const deltaTime = time - timing.lastTime;
            timing.lastTime = time;
            timing.frameTime += deltaTime;

            // Movement
            let dx = 0, dy = 0;
            let moving = false;
            let newDirection = playerDirection;

            const keys = keysPressed.current;

            if (keys.has('w') || keys.has('arrowup')) {
                dy = -moveSpeed;
                newDirection = 'up';
                moving = true;
            }
            if (keys.has('s') || keys.has('arrowdown')) {
                dy = moveSpeed;
                newDirection = 'down';
                moving = true;
            }
            if (keys.has('a') || keys.has('arrowleft')) {
                dx = -moveSpeed;
                newDirection = 'left';
                moving = true;
            }
            if (keys.has('d') || keys.has('arrowright')) {
                dx = moveSpeed;
                newDirection = 'right';
                moving = true;
            }

            if (moving) {
                setPlayerDirection(newDirection);
                setIsMoving(true);

                // Apply movement with bounds and collision check
                setPlayerPos(prev => {
                    const newX = Math.max(0, Math.min(prev.x + dx, (mapData.width - 1) * TILE_SIZE));
                    const newY = Math.max(0, Math.min(prev.y + dy, (mapData.height - 1) * TILE_SIZE));

                    // Get hitbox from sprite sheet or use defaults
                    let hitbox = DEFAULT_HITBOX;
                    if (spriteSheet?.hitbox && Array.isArray(spriteSheet.hitbox) && spriteSheet.hitbox.length > 0) {
                        const sheetHitbox = spriteSheet.hitbox[0];
                        if (sheetHitbox) {
                            // Get sprite frame dimensions for scaling
                            const frameWidth = Number(spriteSheet.frame_width) || TILE_SIZE;
                            const frameHeight = Number(spriteSheet.frame_height) || TILE_SIZE;

                            // Scale hitbox from sprite frame coordinates to TILE_SIZE
                            // The sprite is drawn scaled from frameWidth×frameHeight to TILE_SIZE×TILE_SIZE
                            const scaleX = TILE_SIZE / frameWidth;
                            const scaleY = TILE_SIZE / frameHeight;

                            hitbox = {
                                offsetX: Number(sheetHitbox.offset_x) * scaleX,
                                offsetY: Number(sheetHitbox.offset_y) * scaleY,
                                width: Number(sheetHitbox.width) * scaleX,
                                height: Number(sheetHitbox.height) * scaleY
                            };
                        }
                    }

                    // Calculate hitbox corners in world coordinates
                    const hitboxLeft = newX + hitbox.offsetX;
                    const hitboxTop = newY + hitbox.offsetY;
                    const hitboxRight = hitboxLeft + hitbox.width - 1;
                    const hitboxBottom = hitboxTop + hitbox.height - 1;

                    // Check all tiles the hitbox overlaps - not just corners
                    // This prevents slipping through walls when hitbox spans multiple tiles
                    const tileStartX = Math.floor(hitboxLeft / TILE_SIZE);
                    const tileEndX = Math.floor(hitboxRight / TILE_SIZE);
                    const tileStartY = Math.floor(hitboxTop / TILE_SIZE);
                    const tileEndY = Math.floor(hitboxBottom / TILE_SIZE);

                    // Check every tile the hitbox touches
                    for (let tileX = tileStartX; tileX <= tileEndX; tileX++) {
                        for (let tileY = tileStartY; tileY <= tileEndY; tileY++) {
                            const collisionKey = `${tileX},${tileY}`;
                            if (collisionMap.has(collisionKey)) {
                                // Debug: Log when collision is detected
                                console.log('🛑 BLOCKED at tile:', collisionKey,
                                    'playerPos:', Math.round(newX), Math.round(newY),
                                    'hitbox:', Math.round(hitboxLeft), Math.round(hitboxTop), '->', Math.round(hitboxRight), Math.round(hitboxBottom),
                                    'tiles:', tileStartX, tileStartY, '->', tileEndX, tileEndY);
                                return prev; // Block movement
                            }
                        }
                    }

                    return { x: newX, y: newY };
                });
            } else {
                setIsMoving(false);
            }

            // Animation frame update - use ref for current FPS value
            const currentFPS = animationFPSRef.current;
            if (timing.frameTime > 1000 / currentFPS) {
                setCurrentFrame(prev => prev + 1);
                timing.frameTime = 0;
            }

            // Update camera - account for zoom level
            const canvas = canvasRef.current;
            if (canvas) {
                // When zoomed, the visible area is smaller, so divide by zoom
                const viewWidth = canvas.width / zoom;
                const viewHeight = canvas.height / zoom;
                setCamera({
                    x: playerPos.x - viewWidth / 2 + TILE_SIZE / 2,
                    y: playerPos.y - viewHeight / 2 + TILE_SIZE / 2
                });
            }

            animationId = requestAnimationFrame(gameLoop);
        };

        animationId = requestAnimationFrame(gameLoop);

        return () => cancelAnimationFrame(animationId);
    }, [mapData, isPaused, playerPos, playerDirection, moveSpeed, zoom, collisionMap]);

    // Render
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !mapData) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Apply camera and zoom
        ctx.save();
        ctx.scale(zoom, zoom);
        ctx.translate(-camera.x, -camera.y);

        // Draw tiles
        mapData.tile_instances.forEach((instance: any) => {
            const img = tileImages[instance.tileId];
            const x = instance.x * TILE_SIZE;
            const y = instance.y * TILE_SIZE;

            if (img) {
                ctx.drawImage(img, x, y, TILE_SIZE, TILE_SIZE);
            } else {
                // Use smart color based on tile name
                const tileId = instance.tileId.toLowerCase();
                let color = TILE_COLOR_MAP['default'];
                for (const [key, value] of Object.entries(TILE_COLOR_MAP)) {
                    if (tileId.includes(key)) {
                        color = value;
                        break;
                    }
                }
                ctx.fillStyle = color;
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            }
        });

        // DEBUG: Draw collision map overlay
        if (showCollisionDebug) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 2;
            collisionMap.forEach((key) => {
                const [tx, ty] = key.split(',').map(Number);
                const x = tx * TILE_SIZE;
                const y = ty * TILE_SIZE;
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
                // Draw coordinate text
                ctx.fillStyle = 'white';
                ctx.font = 'bold 10px sans-serif';
                ctx.fillText(`${tx},${ty}`, x + 2, y + 12);
                ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            });
        }

        // Draw objects
        mapData.object_instances.forEach((instance: any) => {
            const img = objectImages[instance.objectId];
            const x = instance.x * TILE_SIZE;
            const y = instance.y * TILE_SIZE;

            if (img) {
                ctx.drawImage(img, x, y, TILE_SIZE, TILE_SIZE);
            }
        });

        // Draw character
        if (characterImage && spriteSheet) {
            const animation = getAnimationForDirection(playerDirection, spriteSheet);
            const frameWidth = Number(spriteSheet.frame_width);
            const frameHeight = Number(spriteSheet.frame_height);
            const frameStart = animation ? Number(animation.frame_start) : 0;
            const frameCount = animation ? Number(animation.frame_count) : 1;
            const startX = animation?.start_x !== undefined ? Number(animation.start_x) : 0;
            const startY = animation?.start_y !== undefined ? Number(animation.start_y) : 0;

            const frameIndex = isMoving ? (currentFrame % frameCount) : 0;
            const actualFrame = frameStart + frameIndex;

            // Calculate frame position in sprite sheet
            const framesPerRow = Math.floor(characterImage.width / frameWidth);
            const col = framesPerRow > 0 ? actualFrame % framesPerRow : 0;
            const row = framesPerRow > 0 ? Math.floor(actualFrame / framesPerRow) : 0;
            const srcX = startX + col * frameWidth;
            const srcY = startY + row * frameHeight;

            ctx.drawImage(
                characterImage,
                srcX, srcY, frameWidth, frameHeight,
                playerPos.x, playerPos.y, TILE_SIZE, TILE_SIZE
            );

            // DEBUG: Draw character hitbox overlay
            if (showCharacterHitbox && spriteSheet?.hitbox && Array.isArray(spriteSheet.hitbox) && spriteSheet.hitbox.length > 0) {
                const sheetHitbox = spriteSheet.hitbox[0];
                if (sheetHitbox) {
                    const scaleX = TILE_SIZE / frameWidth;
                    const scaleY = TILE_SIZE / frameHeight;
                    const hitboxX = playerPos.x + Number(sheetHitbox.offset_x) * scaleX;
                    const hitboxY = playerPos.y + Number(sheetHitbox.offset_y) * scaleY;
                    const hitboxW = Number(sheetHitbox.width) * scaleX;
                    const hitboxH = Number(sheetHitbox.height) * scaleY;

                    ctx.strokeStyle = 'cyan';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(hitboxX, hitboxY, hitboxW, hitboxH);
                    ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
                    ctx.fillRect(hitboxX, hitboxY, hitboxW, hitboxH);
                }
            }
        } else {
            // Fallback - draw a circle
            ctx.fillStyle = '#4ade80';
            ctx.beginPath();
            ctx.arc(playerPos.x + TILE_SIZE / 2, playerPos.y + TILE_SIZE / 2, TILE_SIZE / 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Draw UI overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 220, 80);
        ctx.fillStyle = '#fff';
        ctx.font = '14px sans-serif';
        ctx.fillText(`Character: ${selectedCharacter?.name || 'Unknown'}`, 20, 30);
        ctx.fillText(`Position: (${Math.floor(playerPos.x / TILE_SIZE)}, ${Math.floor(playerPos.y / TILE_SIZE)})`, 20, 50);
        ctx.fillText(`Zoom: ${zoom}x | Speed: ${moveSpeed} | FPS: ${animationFPS}`, 20, 70);
        ctx.fillText('Press ESC to pause', 20, 90);

        if (isPaused) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 32px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
            ctx.font = '16px sans-serif';
            ctx.fillText('Press ESC to resume', canvas.width / 2, canvas.height / 2 + 30);
            ctx.textAlign = 'left';
        }

    }, [mapData, camera, playerPos, playerDirection, currentFrame, isMoving, tileImages, objectImages, characterImage, spriteSheet, isPaused, selectedCharacter, zoom, moveSpeed, showCollisionDebug, showCharacterHitbox]);

    if (isMapLoading) {
        return <div className="flex items-center justify-center h-screen">Loading map...</div>;
    }

    if (!mapData) {
        return <div className="flex items-center justify-center h-screen text-destructive">Map not found</div>;
    }

    if (!selectedCharacter) {
        return <div className="flex items-center justify-center h-screen text-destructive">Character not found</div>;
    }

    return (
        <div className="flex flex-col h-screen bg-background">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 border-b bg-card">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="font-semibold">Game Test: {mapData.name}</h2>
                <div className="flex-1" />

                {/* Zoom Control */}
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg">
                    <ZoomOut className="h-4 w-4 text-muted-foreground" />
                    <Slider
                        value={[zoom]}
                        min={0.5}
                        max={3}
                        step={0.5}
                        onValueChange={(value: number[]) => setZoom(value[0])}
                        className="w-24"
                    />
                    <ZoomIn className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground w-12">{zoom}x</span>
                </div>

                {/* Speed Control */}
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    <Slider
                        value={[moveSpeed]}
                        min={1}
                        max={10}
                        step={1}
                        onValueChange={(value: number[]) => setMoveSpeed(value[0])}
                        className="w-24"
                    />
                    <span className="text-sm text-muted-foreground w-8">{moveSpeed}</span>
                </div>

                {/* Animation FPS Control */}
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg">
                    <Film className="h-4 w-4 text-muted-foreground" />
                    <Slider
                        value={[animationFPS]}
                        min={1}
                        max={30}
                        step={1}
                        onValueChange={(value: number[]) => setAnimationFPS(value[0])}
                        className="w-24"
                    />
                    <span className="text-sm text-muted-foreground w-12">{animationFPS} fps</span>
                </div>

                <Button
                    variant={isPaused ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsPaused(p => !p)}
                >
                    {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                    {isPaused ? 'Resume' : 'Pause'}
                </Button>

                {/* Debug Toggle Buttons */}
                <div className="flex items-center gap-2 ml-4">
                    <Button
                        variant={showCollisionDebug ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowCollisionDebug(prev => !prev)}
                        title="Toggle solid tile collision overlay"
                    >
                        {showCollisionDebug ? '🟥 Tiles On' : '⬜ Tiles Off'}
                    </Button>
                    <Button
                        variant={showCharacterHitbox ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowCharacterHitbox(prev => !prev)}
                        title="Toggle character hitbox overlay"
                    >
                        {showCharacterHitbox ? '🟦 Hitbox On' : '⬜ Hitbox Off'}
                    </Button>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 flex items-center justify-center bg-black">
                <canvas
                    ref={canvasRef}
                    width={960}
                    height={640}
                    className="border border-border"
                    style={{ imageRendering: 'pixelated' }}
                />
            </div>

            {/* Controls hint */}
            <div className="p-4 bg-card border-t text-center text-sm text-muted-foreground">
                Use <kbd className="px-2 py-1 bg-muted rounded">W</kbd> <kbd className="px-2 py-1 bg-muted rounded">A</kbd> <kbd className="px-2 py-1 bg-muted rounded">S</kbd> <kbd className="px-2 py-1 bg-muted rounded">D</kbd> or Arrow Keys to move
            </div>
        </div>
    );
}
