import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Fix import path
import { useActor } from '../hooks/useActor';
import { useListPlayableCharacters } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    ArrowLeft,
    Save,
    MousePointer2,
    Paintbrush,
    Eraser,
    Move,
    ZoomIn,
    ZoomOut,
    Grid3X3,
    Undo,
    Redo,
    Square,
    Circle,
    User
} from 'lucide-react';
import { toast } from 'sonner';

// Types
type Tool = 'select' | 'paint' | 'erase' | 'pan' | 'rectangle' | 'circle' | 'spawn';

interface EditorViewProps {
    mapId: string;
    onBack: () => void;
}

export function EditorView({ mapId, onBack }: EditorViewProps) {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    // State
    const [activeTool, setActiveTool] = useState<Tool>('paint');
    const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
    const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
    const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [showGrid, setShowGrid] = useState(true);

    // Local State for editing
    const [localMapData, setLocalMapData] = useState<any>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
    const [currentMousePos, setCurrentMousePos] = useState<{ x: number, y: number } | null>(null);
    const [isDraggingShape, setIsDraggingShape] = useState(false);

    // Canvas Ref
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Queries
    const { data: mapData, isLoading: isMapLoading } = useQuery({
        queryKey: ['map', mapId],
        queryFn: async () => {
            if (!actor || !mapId) return null;
            const result = await (actor as any).getMap(mapId);
            if (Array.isArray(result) && result.length > 0) {
                return result[0];
            }
            throw new Error("Map not found");
        },
        enabled: !!actor && !!mapId,
    });

    const { data: tiles = [] } = useQuery({
        queryKey: ['tiles'],
        queryFn: async () => {
            if (!actor) return [];
            const result = await (actor as any).getTiles();
            return result;
        },
        enabled: !!actor,
    });

    const { data: objects = [] } = useQuery({
        queryKey: ['objects'],
        queryFn: async () => {
            if (!actor) return [];
            const result = await (actor as any).getObjects();
            return result;
        },
        enabled: !!actor,
    });

    const { data: characters = [] } = useListPlayableCharacters();

    // Mutations
    const updateMap = useMutation({
        mutationFn: async (data: any) => {
            if (!actor) throw new Error('Actor not initialized');
            return (actor as any).updateMap(data.id, data.mapData);
        },
        onSuccess: () => {
            toast.success('Map saved successfully');
            setIsDirty(false);
            queryClient.invalidateQueries({ queryKey: ['map', mapId] });
        },
        onError: (err: any) => {
            toast.error('Failed to save map', { description: err.message });
        },
    });

    // Sync local state with fetched data
    useEffect(() => {
        if (mapData && !isDirty) {
            // Transform backend data to local format
            const localData = {
                ...mapData,
                width: Number(mapData.width),
                height: Number(mapData.height),
                created_at: Number(mapData.created_at),
                updated_at: Number(mapData.updated_at),
                tile_instances: mapData.tile_instances.map((t: any) => ({
                    tileId: t.tile_id,
                    x: Number(t.position.x),
                    y: Number(t.position.y)
                })),
                object_instances: mapData.object_instances.map((o: any) => ({
                    objectId: o.object_id,
                    state: o.state,
                    x: Number(o.position.x),
                    y: Number(o.position.y)
                })),
                spawn_points: (mapData.spawn_points || []).map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    characterId: s.character_id,
                    x: Number(s.x),
                    y: Number(s.y)
                }))
            };
            setLocalMapData(localData);
            // Initialize history
            setHistory([localData]);
            setHistoryIndex(0);
        }
    }, [mapData, isDirty]);

    // Undo/Redo State
    const [history, setHistory] = useState<any[]>([]);
    const [historyIndex, setHistoryIndex] = useState(0);

    const addToHistory = (newState: any) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newState);
        // Limit history size
        if (newHistory.length > 50) {
            newHistory.shift();
        }
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const undo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setLocalMapData(history[newIndex]);
            setIsDirty(true); // Assuming undo implies unsaved changes unless we track save state in history
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setLocalMapData(history[newIndex]);
            setIsDirty(true);
        }
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
                e.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [history, historyIndex]);

    // Helper to get tile color (placeholder for image)
    const getTileColor = (tileId: string) => {
        const tile = tiles.find((t: any) => t.id === tileId);
        if (!tile) return '#444';
        // Generate consistent color from name
        let hash = 0;
        for (let i = 0; i < tile.name.length; i++) {
            hash = tile.name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + '00000'.substring(0, 6 - c.length) + c;
    };

    // Helper to get object color
    const getObjectColor = (objectId: string) => {
        const obj = objects.find((o: any) => o.id === objectId);
        if (!obj) return '#fff';
        return '#fff'; // Objects are white circles for now
    };

    // Image Cache
    const [tileImages, setTileImages] = useState<Record<string, HTMLImageElement>>({});
    const [objectImages, setObjectImages] = useState<Record<string, HTMLImageElement>>({});

    // Fetch Tile Images
    useEffect(() => {
        if (!actor || tiles.length === 0) return;

        const loadImages = async () => {
            const newImages: Record<string, HTMLImageElement> = {};
            let changed = false;

            for (const tile of tiles) {
                // Skip if already loaded or no blob_id
                if (tileImages[tile.id] || !tile.blob_id) continue;

                try {
                    const result = await (actor as any).getTileImage(tile.id);
                    if (Array.isArray(result) && result.length > 0) {
                        const blobData = result[0];
                        const blob = new Blob([new Uint8Array(blobData)], { type: 'image/png' });
                        const url = URL.createObjectURL(blob);
                        const img = new Image();
                        img.src = url;
                        await new Promise((resolve) => {
                            img.onload = resolve;
                        });
                        newImages[tile.id] = img;
                        changed = true;
                    }
                } catch (err) {
                    console.error(`Failed to load image for tile ${tile.id}:`, err);
                }
            }

            if (changed) {
                setTileImages(prev => ({ ...prev, ...newImages }));
            }
        };

        loadImages();
    }, [tiles, actor]); // Intentionally not including tileImages to avoid loops, logic handles checks

    // Fetch Object Images
    useEffect(() => {
        if (!actor || objects.length === 0) return;

        const loadImages = async () => {
            const newImages: Record<string, HTMLImageElement> = {};
            let changed = false;

            for (const obj of objects) {
                // Skip if already loaded
                if (objectImages[obj.id]) continue;

                try {
                    const result = await (actor as any).getObjectImage(obj.id);
                    if (Array.isArray(result) && result.length > 0) {
                        const blobData = result[0];
                        const blob = new Blob([new Uint8Array(blobData)], { type: 'image/png' });
                        const url = URL.createObjectURL(blob);
                        const img = new Image();
                        img.src = url;
                        await new Promise((resolve) => {
                            img.onload = resolve;
                        });
                        newImages[obj.id] = img;
                        changed = true;
                    }
                } catch (err) {
                    console.error(`Failed to load image for object ${obj.id}:`, err);
                }
            }

            if (changed) {
                setObjectImages(prev => ({ ...prev, ...newImages }));
            }
        };

        loadImages();
    }, [objects, actor]); // Intentionally not including objectImages to avoid loops

    // Render Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !localMapData) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Fill background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Apply transformations
        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);

        // Draw Tiles
        localMapData.tile_instances.forEach((instance: any) => {
            const img = tileImages[instance.tileId];
            if (img) {
                ctx.drawImage(img, instance.x * 32, instance.y * 32, 32, 32);
            } else {
                ctx.fillStyle = getTileColor(instance.tileId);
                ctx.fillRect(instance.x * 32, instance.y * 32, 32, 32);

                // Draw Tile Label (fallback)
                const tile = tiles.find((t: any) => t.id === instance.tileId);
                if (tile) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                    ctx.font = '10px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(tile.name.substring(0, 2).toUpperCase(), instance.x * 32 + 16, instance.y * 32 + 16);
                }
            }
        });

        // Draw Grid
        if (showGrid) {
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1 / zoom;
            const gridSize = 32;

            // Vertical lines
            for (let x = 0; x <= localMapData.width * gridSize; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, localMapData.height * gridSize);
                ctx.stroke();
            }

            // Horizontal lines
            for (let y = 0; y <= localMapData.height * gridSize; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(localMapData.width * gridSize, y);
                ctx.stroke();
            }
        }

        // Draw Objects
        localMapData.object_instances.forEach((instance: any) => {
            const obj = objects.find((o: any) => o.id === instance.objectId);
            const img = objectImages[instance.objectId];

            if (img) {
                // Draw image centered on the grid cell (supports transparency)
                const drawX = instance.x * 32;
                const drawY = instance.y * 32;
                ctx.drawImage(img, drawX, drawY, 32, 32);
            } else {
                // Fallback to circle rendering
                ctx.fillStyle = getObjectColor(instance.objectId);
                ctx.beginPath();
                ctx.arc(instance.x * 32 + 16, instance.y * 32 + 16, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Draw Object Label (fallback)
                if (obj) {
                    ctx.fillStyle = '#000';
                    ctx.font = 'bold 12px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(obj.name.substring(0, 1).toUpperCase(), instance.x * 32 + 16, instance.y * 32 + 16);
                }
            }
        });

        // Draw Spawn Points
        if (localMapData.spawn_points) {
            for (const spawn of localMapData.spawn_points) {
                const x = (spawn.x * 32 * zoom) + pan.x;
                const y = (spawn.y * 32 * zoom) + pan.y;
                const size = 32 * zoom;

                // Check if visible
                if (x + size < 0 || x > canvas.width || y + size < 0 || y > canvas.height) continue;

                // Draw spawn point marker
                ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
                ctx.beginPath();
                ctx.arc(x + size / 2, y + size / 2, size / 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2 * zoom;
                ctx.stroke();

                // Draw "S" label
                ctx.fillStyle = '#fff';
                ctx.font = `bold ${14 * zoom}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('S', x + size / 2, y + size / 2);

                // Draw Character Name if zoomed in enough
                if (zoom > 0.8) {
                    const charName = characters.find((c: any) => c.id === spawn.characterId)?.name || 'Unknown';
                    ctx.fillStyle = '#fff';
                    ctx.font = `${10 * zoom}px sans-serif`;
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 2;
                    ctx.strokeText(charName, x + size / 2, y - 5);
                    ctx.fillText(charName, x + size / 2, y - 5);
                }
            }
        }

        // Draw Map Border
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2 / zoom;
        ctx.strokeRect(0, 0, localMapData.width * 32, localMapData.height * 32);

        // Draw Shape Preview
        if (isDraggingShape && dragStart && currentMousePos) {
            const startX = dragStart.x * 32;
            const startY = dragStart.y * 32;
            const endX = currentMousePos.x * 32;
            const endY = currentMousePos.y * 32;
            const width = endX - startX + (endX >= startX ? 32 : -32); // Include the last cell
            const height = endY - startY + (endY >= startY ? 32 : -32);

            ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'; // Blue semi-transparent
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
            ctx.lineWidth = 2;

            if (activeTool === 'rectangle') {
                ctx.fillRect(startX, startY, width, height);
                ctx.strokeRect(startX, startY, width, height);
            } else if (activeTool === 'circle') {
                const centerX = startX + width / 2;
                const centerY = startY + height / 2;
                const radiusX = Math.abs(width / 2);
                const radiusY = Math.abs(height / 2);

                ctx.beginPath();
                ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
            }
        }

        ctx.restore();

    }, [localMapData, zoom, pan, showGrid, tiles, objects, characters, isDraggingShape, dragStart, currentMousePos, activeTool, tileImages, objectImages]);

    // Interaction Handlers
    const getGridPos = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - pan.x) / zoom;
        const y = (e.clientY - rect.top - pan.y) / zoom;

        return {
            x: Math.floor(x / 32),
            y: Math.floor(y / 32)
        };
    };

    const handlePaint = (e: React.MouseEvent) => {
        if (!localMapData) return;
        const pos = getGridPos(e);
        if (!pos) return;

        // Bounds check with fallback dimensions
        const mapWidth = localMapData.width ? Number(localMapData.width) : 32;
        const mapHeight = localMapData.height ? Number(localMapData.height) : 24;
        if (pos.x < 0 || pos.x >= mapWidth || pos.y < 0 || pos.y >= mapHeight) return;

        const newMapData = {
            ...localMapData,
            tile_instances: [...localMapData.tile_instances],
            object_instances: [...localMapData.object_instances]
        };
        let changed = false;

        if (activeTool === 'paint') {
            if (selectedTileId) {
                // Remove any existing tile at this position
                newMapData.tile_instances = newMapData.tile_instances.filter(
                    (t: any) => !(t.x === pos.x && t.y === pos.y)
                );

                // Add new tile instance
                newMapData.tile_instances.push({
                    tileId: selectedTileId,
                    x: pos.x,
                    y: pos.y,
                    z: 0,
                });
                changed = true;
            } else if (selectedObjectId) {
                // Check if object already exists at this position (optional, depending on game logic)
                // For now, allow multiple objects or just add it
                newMapData.object_instances.push({
                    objectId: selectedObjectId,
                    x: pos.x,
                    y: pos.y,
                    state: 'default'
                });
                changed = true;
            }
        } else if (activeTool === 'spawn' && selectedCharacterId) {
            // Remove any existing spawn point for this character at this position
            newMapData.spawn_points = newMapData.spawn_points.filter(
                (s: any) => !(s.x === pos.x && s.y === pos.y)
            );
            // Add new spawn point
            newMapData.spawn_points.push({
                id: crypto.randomUUID(),
                name: `Spawn ${characters.find((c: any) => c.id === selectedCharacterId)?.name || 'Point'}`,
                characterId: selectedCharacterId,
                x: pos.x,
                y: pos.y
            });
            changed = true;
        } else if (activeTool === 'erase') {
            const beforeTileLength = newMapData.tile_instances.length;
            const beforeObjectLength = newMapData.object_instances.length;
            const beforeSpawnLength = newMapData.spawn_points.length;

            // Remove tile at this position
            newMapData.tile_instances = newMapData.tile_instances.filter(
                (t: any) => !(t.x === pos.x && t.y === pos.y)
            );

            // Remove object at this position
            newMapData.object_instances = newMapData.object_instances.filter(
                (o: any) => !(Math.abs(o.x - pos.x) < 0.5 && Math.abs(o.y - pos.y) < 0.5) // Simple proximity check for objects
            );

            // Remove spawn point at this position
            newMapData.spawn_points = newMapData.spawn_points.filter(
                (s: any) => !(s.x === pos.x && s.y === pos.y)
            );

            if (
                beforeTileLength !== newMapData.tile_instances.length ||
                beforeObjectLength !== newMapData.object_instances.length ||
                beforeSpawnLength !== newMapData.spawn_points.length
            ) {
                changed = true;
            }
        }

        if (changed) {
            setLocalMapData(newMapData);
            addToHistory(newMapData);
            setIsDirty(true);
        }
    };

    // Mouse Handlers
    const [isPanning, setIsPanning] = useState(false);
    const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0) { // Left mouse button
            if (activeTool === 'pan') {
                setIsPanning(true);
                setLastPanPos({ x: e.clientX, y: e.clientY });
            } else if (activeTool === 'rectangle' || activeTool === 'circle') {
                const pos = getGridPos(e);
                if (pos) {
                    setDragStart(pos);
                    setCurrentMousePos(pos);
                    setIsDraggingShape(true);
                }
            } else {
                setIsDragging(true);
                handlePaint(e); // Paint immediately on click
            }
        } else if (e.button === 1) { // Middle mouse button
            e.preventDefault();
            setIsPanning(true);
            setLastPanPos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning && lastPanPos) {
            const dx = e.clientX - lastPanPos.x;
            const dy = e.clientY - lastPanPos.y;
            setPan((prev: { x: number, y: number }) => ({ x: prev.x + dx, y: prev.y + dy }));
            setLastPanPos({ x: e.clientX, y: e.clientY });
            return;
        }

        if (isDraggingShape) {
            const pos = getGridPos(e);
            if (pos) {
                setCurrentMousePos(pos);
            }
        }

        if (isDragging) {
            handlePaint(e);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setIsPanning(false);

        if (isDraggingShape && dragStart && currentMousePos && localMapData) {
            // Commit shape
            const startX = Math.min(dragStart.x, currentMousePos.x);
            const endX = Math.max(dragStart.x, currentMousePos.x);
            const startY = Math.min(dragStart.y, currentMousePos.y);
            const endY = Math.max(dragStart.y, currentMousePos.y);

            const newMapData = {
                ...localMapData,
                tile_instances: [...localMapData.tile_instances],
                object_instances: [...localMapData.object_instances],
                spawn_points: [...(localMapData.spawn_points || [])]
            };
            let changed = false;

            if (selectedTileId) {
                for (let x = startX; x <= endX; x++) {
                    for (let y = startY; y <= endY; y++) {
                        // Check if point is inside shape
                        let inside = false;
                        if (activeTool === 'rectangle') {
                            inside = true;
                        } else if (activeTool === 'circle') {
                            // Ellipse check
                            const centerX = (startX + endX) / 2;
                            const centerY = (startY + endY) / 2;
                            const radiusX = (endX - startX) / 2 + 0.5; // +0.5 to include edges better
                            const radiusY = (endY - startY) / 2 + 0.5;
                            const normalizedX = (x - centerX) / radiusX;
                            const normalizedY = (y - centerY) / radiusY;
                            if (normalizedX * normalizedX + normalizedY * normalizedY <= 1) {
                                inside = true;
                            }
                        }

                        if (inside) {
                            // Bounds check
                            if (x >= 0 && x < localMapData.width && y >= 0 && y < localMapData.height) {
                                // Remove existing
                                newMapData.tile_instances = newMapData.tile_instances.filter(
                                    (t: any) => !(t.x === x && t.y === y)
                                );
                                // Add new
                                newMapData.tile_instances.push({
                                    tileId: selectedTileId,
                                    x,
                                    y,
                                    z: 0
                                });
                                changed = true;
                            }
                        }
                    }
                }
            }

            // Draw Objects (Removed misplaced code)
            // Draw Spawn Points (Removed misplaced code)

            if (changed) {
                setLocalMapData(newMapData);
                addToHistory(newMapData);
                setIsDirty(true);
            }

            setIsDraggingShape(false);
            setDragStart(null);
            setCurrentMousePos(null);
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = -e.deltaY / 1000;
        setZoom(prev => Math.max(0.1, Math.min(5, prev + delta)));
    };

    const handleSave = () => {
        if (!localMapData) return;

        // Transform local data back to backend format
        const mapDataForBackend = {
            ...localMapData,
            width: BigInt(localMapData.width),
            height: BigInt(localMapData.height),
            created_at: BigInt(localMapData.created_at),
            updated_at: BigInt(Date.now()),
            tile_instances: localMapData.tile_instances.map((t: any) => ({
                tile_id: t.tileId,
                position: { x: BigInt(t.x), y: BigInt(t.y) }
            })),
            object_instances: localMapData.object_instances.map((o: any) => ({
                object_id: o.objectId,
                state: o.state || 'default',
                position: { x: BigInt(o.x), y: BigInt(o.y) }
            })),
            spawn_points: (localMapData.spawn_points || []).map((s: any) => ({
                id: s.id,
                name: s.name,
                character_id: s.characterId,
                x: BigInt(s.x),
                y: BigInt(s.y)
            }))
        };

        updateMap.mutate({ id: mapId, mapData: mapDataForBackend });
    };

    console.log('[EditorView] Render - mapId:', mapId, 'isMapLoading:', isMapLoading, 'mapData:', mapData);

    if (isMapLoading) {
        return <div className="flex items-center justify-center h-screen">Loading map...</div>;
    }

    if (!mapData) {
        console.error('[EditorView] No mapData available after loading!');
        return <div className="flex items-center justify-center h-screen text-destructive"><div className="text-center"><p className="text-2xl font-bold mb-2">Map not found</p><p className="text-sm">Map ID: {mapId}</p></div></div>;
    }

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            {/* Sidebar - Palette */}
            <div className="w-80 border-r bg-card flex flex-col">
                <div className="p-4 border-b flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="font-semibold truncate">{mapData.name}</h2>
                </div>

                <Tabs defaultValue="tiles" className="flex-1 flex flex-col">
                    <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                        <TabsTrigger
                            value="tiles"
                            className="relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                        >
                            Tiles
                        </TabsTrigger>
                        <TabsTrigger
                            value="objects"
                            className="relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                        >
                            Objects
                        </TabsTrigger>
                        <TabsTrigger
                            value="characters"
                            className="relative h-9 rounded-none border-b-2 border-b-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                        >
                            Characters
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="tiles" className="flex-1 p-0 m-0">
                        <ScrollArea className="h-full">
                            <div className="p-4 grid grid-cols-3 gap-2">
                                {tiles.map((tile: any) => (
                                    <button
                                        key={tile.id}
                                        onClick={() => {
                                            setSelectedTileId(tile.id);
                                            setSelectedObjectId(null); // Clear object selection
                                            setSelectedCharacterId(null); // Clear character selection
                                            setActiveTool('paint');
                                        }}
                                        className={`aspect-square border rounded-md p-1 hover:bg-accent transition-colors ${selectedTileId === tile.id ? 'ring-2 ring-primary border-primary' : ''
                                            }`}
                                    >
                                        <div className="w-full h-full bg-muted rounded flex items-center justify-center text-xs text-muted-foreground overflow-hidden">
                                            {/* Tile Image or Placeholder */}
                                            {tileImages[tile.id] ? (
                                                <img src={tileImages[tile.id].src} alt={tile.name} className="w-full h-full object-cover pixelated" />
                                            ) : (
                                                tile.name.substring(0, 2)
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="objects" className="mt-0 h-full">
                        <ScrollArea className="h-full">
                            <div className="grid grid-cols-4 gap-2 p-4">
                                {objects.map((obj: any) => (
                                    <button
                                        key={obj.id}
                                        onClick={() => {
                                            setSelectedObjectId(obj.id);
                                            setSelectedTileId(null); // Clear tile selection
                                            setSelectedCharacterId(null);
                                            setActiveTool('paint');
                                        }}
                                        className={`aspect-square border rounded-md p-2 hover:bg-accent transition-colors flex flex-col items-center justify-center gap-2 ${selectedObjectId === obj.id ? 'ring-2 ring-primary border-primary' : ''
                                            }`}
                                    >
                                        {objectImages[obj.id] ? (
                                            <img
                                                src={objectImages[obj.id].src}
                                                alt={obj.name}
                                                className="w-8 h-8 object-contain"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 bg-muted rounded-full" />
                                        )}
                                        <span className="text-xs truncate w-full text-center">{obj.name}</span>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="characters" className="mt-0 h-full">
                        <ScrollArea className="h-full">
                            <div className="grid grid-cols-4 gap-2 p-4">
                                {characters.map((char: any) => (
                                    <button
                                        key={char.id}
                                        onClick={() => {
                                            setSelectedCharacterId(char.id);
                                            setSelectedTileId(null);
                                            setSelectedObjectId(null);
                                            setActiveTool('spawn');
                                        }}
                                        className={`aspect-square border rounded-md p-2 hover:bg-accent transition-colors flex flex-col items-center justify-center gap-2 ${selectedCharacterId === char.id ? 'ring-2 ring-primary border-primary' : ''
                                            }`}
                                    >
                                        <User className="w-8 h-8 text-muted-foreground" />
                                        <span className="text-xs truncate w-full text-center">{char.name}</span>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col relative">
                {/* Toolbar */}
                <div className="h-14 border-b bg-card flex items-center px-4 justify-between z-10">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center border rounded-md bg-background p-1">
                            <Button
                                variant={activeTool === 'select' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveTool('select')}
                                title="Select (V)"
                            >
                                <MousePointer2 className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={activeTool === 'paint' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveTool('paint')}
                                title="Paint (B)"
                            >
                                <Paintbrush className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={activeTool === 'erase' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveTool('erase')}
                                title="Erase (E)"
                            >
                                <Eraser className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={activeTool === 'rectangle' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveTool('rectangle')}
                                title="Rectangle (R)"
                            >
                                <Square className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={activeTool === 'circle' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveTool('circle')}
                                title="Circle (C)"
                            >
                                <Circle className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={activeTool === 'pan' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setActiveTool('pan')}
                                title="Pan (H)"
                            >
                                <Move className="h-4 w-4" />
                            </Button>
                        </div>

                        <Separator orientation="vertical" className="h-6 mx-2" />

                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={undo}
                                disabled={historyIndex <= 0}
                                title="Undo (Ctrl+Z)"
                            >
                                <Undo className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={redo}
                                disabled={historyIndex >= history.length - 1}
                                title="Redo (Ctrl+Y)"
                            >
                                <Redo className="h-4 w-4" />
                            </Button>
                        </div>

                        <Separator orientation="vertical" className="h-6 mx-2" />

                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}>
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                            <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
                            <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(5, z + 0.1))}>
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                        </div>

                        <Separator orientation="vertical" className="h-6 mx-2" />

                        <Button
                            variant={showGrid ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => setShowGrid(!showGrid)}
                            title="Toggle Grid"
                        >
                            <Grid3X3 className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={!isDirty || updateMap.isPending}
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {updateMap.isPending ? 'Saving...' : 'Save Map'}
                    </Button>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 bg-neutral-900 overflow-hidden relative cursor-crosshair">
                    <canvas
                        ref={canvasRef}
                        width={window.innerWidth - 320} // Subtract sidebar width
                        height={window.innerHeight - 56} // Subtract toolbar height
                        className="block touch-none"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onWheel={handleWheel}
                    />
                </div>

                {/* Status Bar */}
                <div className="h-6 bg-primary text-primary-foreground text-xs flex items-center px-4 justify-between select-none">
                    <span>{mapData.width}x{mapData.height} Tiles</span>
                    <span>Zoom: {Math.round(zoom * 100)}%</span>
                </div>
            </div>
        </div >
    );
}
