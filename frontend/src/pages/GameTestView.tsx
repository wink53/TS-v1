import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useActor } from '../hooks/useActor';
import { useGetCharacterSpriteSheet, useListPlayableCharacters } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, Pause, ZoomIn, ZoomOut, Gauge } from 'lucide-react';
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
const ANIMATION_FRAME_RATE = 8; // fps

export function GameTestView({ mapId, characterId, onBack }: GameTestViewProps) {
    const { actor } = useActor();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Character state
    const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
    const [playerDirection, setPlayerDirection] = useState<'up' | 'down' | 'left' | 'right'>('down');
    const [isMoving, setIsMoving] = useState(false);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    // Controls state
    const [zoom, setZoom] = useState(2); // 1 = 100%, 2 = 200%, etc.
    const [moveSpeed, setMoveSpeed] = useState(DEFAULT_MOVE_SPEED);

    // Camera state
    const [camera, setCamera] = useState({ x: 0, y: 0 });

    // Keys pressed
    const keysPressed = useRef<Set<string>>(new Set());

    // Image caches
    const [tileImages, setTileImages] = useState<Record<string, HTMLImageElement>>({});
    const [objectImages, setObjectImages] = useState<Record<string, HTMLImageElement>>({});
    const [characterImage, setCharacterImage] = useState<HTMLImageElement | null>(null);

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
            return (actor as any).getTiles();
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
    const spriteSheet = selectedCharacter?.sprite_sheets[0];

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

    // Game loop
    useEffect(() => {
        if (!mapData || isPaused) return;

        let animationId: number;
        let lastTime = 0;
        let frameTime = 0;

        const gameLoop = (time: number) => {
            const deltaTime = time - lastTime;
            lastTime = time;
            frameTime += deltaTime;

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

                // Apply movement with bounds check
                setPlayerPos(prev => {
                    const newX = Math.max(0, Math.min(prev.x + dx, (mapData.width - 1) * TILE_SIZE));
                    const newY = Math.max(0, Math.min(prev.y + dy, (mapData.height - 1) * TILE_SIZE));
                    return { x: newX, y: newY };
                });
            } else {
                setIsMoving(false);
            }

            // Animation frame update
            if (frameTime > 1000 / ANIMATION_FRAME_RATE) {
                setCurrentFrame(prev => prev + 1);
                frameTime = 0;
            }

            // Update camera
            const canvas = canvasRef.current;
            if (canvas) {
                setCamera({
                    x: playerPos.x - canvas.width / 2 + TILE_SIZE / 2,
                    y: playerPos.y - canvas.height / 2 + TILE_SIZE / 2
                });
            }

            animationId = requestAnimationFrame(gameLoop);
        };

        animationId = requestAnimationFrame(gameLoop);

        return () => cancelAnimationFrame(animationId);
    }, [mapData, isPaused, playerPos, playerDirection, moveSpeed]);

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
                ctx.fillStyle = '#333';
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            }
        });

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
        ctx.fillText(`Zoom: ${zoom}x | Speed: ${moveSpeed}`, 20, 70);
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

    }, [mapData, camera, playerPos, playerDirection, currentFrame, isMoving, tileImages, objectImages, characterImage, spriteSheet, isPaused, selectedCharacter, zoom, moveSpeed]);

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
                        onValueChange={(value) => setZoom(value[0])}
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
                        onValueChange={(value) => setMoveSpeed(value[0])}
                        className="w-24"
                    />
                    <span className="text-sm text-muted-foreground w-8">{moveSpeed}</span>
                </div>

                <Button
                    variant={isPaused ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsPaused(p => !p)}
                >
                    {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                    {isPaused ? 'Resume' : 'Pause'}
                </Button>
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
