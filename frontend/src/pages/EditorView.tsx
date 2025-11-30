import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Fix import path
import { useActor } from '../hooks/useActor';
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
    Grid3X3
} from 'lucide-react';
import { toast } from 'sonner';

// Types
type Tool = 'select' | 'paint' | 'erase' | 'pan';

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
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [showGrid, setShowGrid] = useState(true);

    // Local State for editing
    const [localMapData, setLocalMapData] = useState<any>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

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

    // Mutations
    const updateMap = useMutation({
        mutationFn: async (data: any) => {
            if (!actor) throw new Error('Actor not initialized');
            return (actor as any).updateMap(data.id, data);
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
            setLocalMapData(JSON.parse(JSON.stringify(mapData)));
        }
    }, [mapData, isDirty]);

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
            ctx.fillStyle = getTileColor(instance.tileId);
            ctx.fillRect(instance.x * 32, instance.y * 32, 32, 32);
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
            ctx.fillStyle = getObjectColor(instance.objectId);
            ctx.beginPath();
            ctx.arc(instance.x * 32 + 16, instance.y * 32 + 16, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Draw Map Border
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2 / zoom;
        ctx.strokeRect(0, 0, localMapData.width * 32, localMapData.height * 32);

        ctx.restore();

    }, [localMapData, zoom, pan, showGrid, tiles, objects]);

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

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        if (activeTool === 'pan') return;
        handlePaint(e);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;

        if (activeTool === 'pan') {
            setPan(prev => ({
                x: prev.x + e.movementX,
                y: prev.y + e.movementY
            }));
            return;
        }

        handlePaint(e);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handlePaint = (e: React.MouseEvent) => {
        if (!localMapData) return;
        const pos = getGridPos(e);
        if (!pos) return;

        // Bounds check
        if (pos.x < 0 || pos.x >= localMapData.width || pos.y < 0 || pos.y >= localMapData.height) return;

        const newMapData = { ...localMapData };
        let changed = false;

        if (activeTool === 'paint') {
            if (selectedTileId) {
                // Remove existing tile at this position
                const existingIndex = newMapData.tile_instances.findIndex((t: any) => t.x === pos.x && t.y === pos.y);
                if (existingIndex >= 0) {
                    if (newMapData.tile_instances[existingIndex].tileId !== selectedTileId) {
                        newMapData.tile_instances[existingIndex].tileId = selectedTileId;
                        changed = true;
                    }
                } else {
                    newMapData.tile_instances.push({
                        id: `${pos.x}_${pos.y}_${Date.now()}`,
                        tileId: selectedTileId,
                        x: pos.x,
                        y: pos.y,
                        rotation: 0
                    });
                    changed = true;
                }
            } else if (selectedObjectId) {
                // Object placement logic (allow multiple objects per tile? for now, one)
                const existingIndex = newMapData.object_instances.findIndex((o: any) => o.x === pos.x && o.y === pos.y);
                if (existingIndex === -1) {
                    newMapData.object_instances.push({
                        id: `${pos.x}_${pos.y}_${Date.now()}`,
                        objectId: selectedObjectId,
                        x: pos.x,
                        y: pos.y,
                        rotation: 0,
                        state: 'default' // Default state
                    });
                    changed = true;
                }
            }
        } else if (activeTool === 'erase') {
            // Erase tile
            const tileIndex = newMapData.tile_instances.findIndex((t: any) => t.x === pos.x && t.y === pos.y);
            if (tileIndex >= 0) {
                newMapData.tile_instances.splice(tileIndex, 1);
                changed = true;
            }
            // Erase object
            const objIndex = newMapData.object_instances.findIndex((o: any) => o.x === pos.x && o.y === pos.y);
            if (objIndex >= 0) {
                newMapData.object_instances.splice(objIndex, 1);
                changed = true;
            }
        }

        if (changed) {
            setLocalMapData(newMapData);
            setIsDirty(true);
        }
    };

    const handleSave = () => {
        if (!localMapData) return;
        updateMap.mutate(localMapData);
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
                    <TabsList className="w-full justify-start rounded-none border-b px-4 h-12">
                        <TabsTrigger value="tiles">Tiles</TabsTrigger>
                        <TabsTrigger value="objects">Objects</TabsTrigger>
                    </TabsList>

                    <TabsContent value="tiles" className="flex-1 p-0 m-0">
                        <ScrollArea className="h-full">
                            <div className="p-4 grid grid-cols-3 gap-2">
                                {tiles.map((tile: any) => (
                                    <button
                                        key={tile.id}
                                        onClick={() => {
                                            setSelectedTileId(tile.id);
                                            setActiveTool('paint');
                                        }}
                                        className={`aspect-square border rounded-md p-1 hover:bg-accent transition-colors ${selectedTileId === tile.id ? 'ring-2 ring-primary border-primary' : ''
                                            }`}
                                    >
                                        <div className="w-full h-full bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                                            {/* Placeholder for tile image */}
                                            {tile.name.substring(0, 2)}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="objects" className="flex-1 p-0 m-0">
                        <ScrollArea className="h-full">
                            <div className="p-4 grid grid-cols-2 gap-2">
                                {objects.map((obj: any) => (
                                    <button
                                        key={obj.id}
                                        onClick={() => {
                                            setSelectedObjectId(obj.id);
                                            setActiveTool('paint');
                                        }}
                                        className={`aspect-square border rounded-md p-2 hover:bg-accent transition-colors flex flex-col items-center justify-center gap-2 ${selectedObjectId === obj.id ? 'ring-2 ring-primary border-primary' : ''
                                            }`}
                                    >
                                        <div className="w-8 h-8 bg-muted rounded-full" />
                                        <span className="text-xs truncate w-full text-center">{obj.name}</span>
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

                    <Button onClick={() => toast.success('Map saved!')}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Map
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
                    />
                </div>

                {/* Status Bar */}
                <div className="h-6 bg-primary text-primary-foreground text-xs flex items-center px-4 justify-between select-none">
                    <span>{mapData.width}x{mapData.height} Tiles</span>
                    <span>Zoom: {Math.round(zoom * 100)}%</span>
                </div>
            </div>
        </div>
    );
}
