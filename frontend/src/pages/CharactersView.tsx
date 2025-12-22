import { useState, useEffect, useRef } from 'react';
import { useListPlayableCharacters, useCreatePlayableCharacter, useUpdatePlayableCharacter, useDeletePlayableCharacter, useGetCharacterSpriteSheet, useListSpriteSheets } from '../hooks/useQueries';
import type { SpriteSheet } from '../declarations/backend/backend.did.d.ts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, User, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PlayableCharacter, CharacterStats, AnimationState, Direction } from '../backend';
import type { DetectionMode } from '../utils/spriteSheetAnalyzer';
import { SpriteSelector } from '../components/SpriteSelector';

// Compact Animation Preview - displays a looping animation preview
interface CompactAnimationPreviewProps {
    spriteSheet: SpriteSheet;
}

function CompactAnimationPreview({ spriteSheet }: CompactAnimationPreviewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [imageLoaded, setImageLoaded] = useState(false);

    // Get the first animation (if any)
    const firstAnimation = spriteSheet.animations[0];
    const frameStart = firstAnimation ? Number(firstAnimation.frame_start) : 0;
    const frameCount = firstAnimation ? Number(firstAnimation.frame_count) : Number(spriteSheet.total_frames);
    const frameRate = firstAnimation ? Number(firstAnimation.frame_rate) : 8;
    const startX = firstAnimation?.start_x !== undefined ? Number(firstAnimation.start_x) : 0;
    const startY = firstAnimation?.start_y !== undefined ? Number(firstAnimation.start_y) : 0;
    const frameWidth = Number(spriteSheet.frame_width);
    const frameHeight = Number(spriteSheet.frame_height);

    // Fetch the sprite sheet blob from backend
    const { data: blobData, isLoading } = useGetCharacterSpriteSheet(spriteSheet.blob_id);

    // Load the sprite sheet image when blob data is available
    useEffect(() => {
        if (!blobData) return;

        const img = new Image();
        img.onload = () => {
            imageRef.current = img;
            setImageLoaded(true);
        };
        img.onerror = () => setImageLoaded(false);

        try {
            const uint8Array = blobData instanceof Uint8Array ? blobData : new Uint8Array(blobData);
            let binary = '';
            const chunkSize = 0x8000;
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
                const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
                binary += String.fromCharCode.apply(null, Array.from(chunk));
            }
            const base64 = btoa(binary);
            img.src = `data:image/png;base64,${base64}`;
        } catch (error) {
            console.error('Error converting blob:', error);
        }

        return () => {
            imageRef.current = null;
            setImageLoaded(false);
        };
    }, [blobData, spriteSheet.blob_id]);

    // Animate through frames
    useEffect(() => {
        if (!imageLoaded || frameCount === 0) return;
        const interval = setInterval(() => {
            setCurrentFrame((prev) => (prev + 1) % frameCount);
        }, frameRate > 0 ? 1000 / frameRate : 125);
        return () => clearInterval(interval);
    }, [imageLoaded, frameCount, frameRate]);

    // Draw the current frame
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !imageLoaded || !imageRef.current) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Calculate frame position
        const frameIndex = frameStart + currentFrame;
        const imgWidth = imageRef.current.width;
        const framesPerRow = Math.floor(imgWidth / frameWidth);
        const col = framesPerRow > 0 ? frameIndex % framesPerRow : 0;
        const row = framesPerRow > 0 ? Math.floor(frameIndex / framesPerRow) : 0;
        const x = startX + (col * frameWidth);
        const y = startY + (row * frameHeight);

        // Clear and draw
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        try {
            ctx.drawImage(
                imageRef.current,
                x, y, frameWidth, frameHeight,
                0, 0, canvas.width, canvas.height
            );
        } catch (error) {
            console.error('Error drawing frame:', error);
        }
    }, [currentFrame, imageLoaded, frameStart, frameWidth, frameHeight, startX, startY]);

    const displaySize = 80;

    if (isLoading) {
        return <Skeleton className="w-20 h-20 rounded" />;
    }

    return (
        <div className="flex flex-col items-center gap-1">
            <canvas
                ref={canvasRef}
                width={displaySize}
                height={displaySize}
                className="border rounded bg-[#1a1a2e]"
                style={{
                    imageRendering: 'pixelated',
                    width: displaySize,
                    height: displaySize
                }}
            />
            {firstAnimation && (
                <div className="text-xs text-muted-foreground text-center">
                    {firstAnimation.name}
                </div>
            )}
        </div>
    );
}


// Animated Sprite Preview Component
interface AnimatedSpritePreviewProps {
    blob_id: string;
    frameCount: number;
    frameWidth: number;
    frameHeight: number;
    offsetX?: number;
    offsetY?: number;
    detectionMode?: DetectionMode;
}

function AnimatedSpritePreview({ blob_id, frameCount, frameWidth, frameHeight, offsetX = 0, offsetY = 0, detectionMode = 'alpha' }: AnimatedSpritePreviewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const debugCanvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [detectedFrames, setDetectedFrames] = useState<Array<{ x: number, y: number, width: number, height: number }>>([]);

    // Fetch the sprite sheet blob from backend
    const { data: blobData, isLoading: isBlobLoading, error: blobError } = useGetCharacterSpriteSheet(blob_id);

    // Load the sprite sheet image when blob data is available
    useEffect(() => {
        if (!blobData) {
            console.log('⏳ Waiting for blob data...');
            return;
        }

        console.log('🔄 Starting to load sprite sheet, blob size:', blobData.length);

        const img = new Image();

        img.onload = async () => {
            console.log('✅ Sprite sheet image loaded successfully:', img.width, 'x', img.height);
            imageRef.current = img;

            // Use manual offset for frame positions
            const fallbackFrames = [];
            for (let i = 0; i < frameCount; i++) {
                fallbackFrames.push({
                    x: offsetX + (i * frameWidth),
                    y: offsetY,
                    width: frameWidth,
                    height: frameHeight
                });
            }
            console.log('📍 Using offset:', offsetX, offsetY);

            console.log('📦 Fallback frames prepared:', fallbackFrames.length);

            // In manual mode, skip analysis and use the manual offset directly
            if (detectionMode === 'manual') {
                console.log('📍 Manual mode: Using offset-based frames directly');
                setDetectedFrames(fallbackFrames);
                setImageLoaded(true);
                return;
            }

            // Analyze sprite sheet to detect frames
            try {
                console.log('🔍 Attempting to analyze sprite sheet...');
                const { analyzeSpriteSheet } = await import('../utils/spriteSheetAnalyzer');
                console.log('✅ Analyzer module loaded');

                const analysis = await analyzeSpriteSheet(img, {
                    expectedFrameWidth: frameWidth,
                    expectedFrameHeight: frameHeight,
                    expectedFrameCount: frameCount,
                    minWidth: Math.min(frameWidth, 8),
                    minHeight: Math.min(frameHeight, 8),
                    detectionMode: detectionMode
                });

                console.log('📊 Analysis complete! Detected', analysis.frames.length, 'frames');
                console.log('📐 Layout:', analysis.layout, `(${analysis.rows}x${analysis.columns})`);
                console.log('📏 Suggested frame size:', analysis.suggestedFrameSize);

                // Use detected frames only if they match expected count
                // Otherwise the sprites might be connected without transparent gaps
                if (analysis.frames.length === frameCount) {
                    console.log('✨ Using detected frames (count matches)');
                    setDetectedFrames(analysis.frames);
                } else {
                    console.warn(`⚠️ Detected ${analysis.frames.length} frames but expected ${frameCount}. Using fallback coordinates.`);
                    setDetectedFrames(fallbackFrames);
                }
            } catch (error) {
                console.error('❌ Failed to analyze sprite sheet:', error);
                console.log('🔄 Using fallback frame coordinates');
                setDetectedFrames(fallbackFrames);
            }

            setImageLoaded(true);
            console.log('✅ Image loading complete');
        };

        img.onerror = (e) => {
            console.error('❌ Failed to load sprite sheet image:', blob_id, e);
            // Even on error, set fallback frames so something displays
            const fallbackFrames = [];
            for (let i = 0; i < frameCount; i++) {
                fallbackFrames.push({
                    x: offsetX + (i * frameWidth),
                    y: offsetY,
                    width: frameWidth,
                    height: frameHeight
                });
            }
            setDetectedFrames(fallbackFrames);
            setImageLoaded(false);
        };

        try {
            console.log('🔄 Converting blob to base64...');
            const uint8Array = blobData instanceof Uint8Array ? blobData : new Uint8Array(blobData);
            let binary = '';
            const chunkSize = 0x8000;
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
                const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
                binary += String.fromCharCode.apply(null, Array.from(chunk));
            }
            const base64 = btoa(binary);
            console.log('✅ Base64 conversion complete, length:', base64.length);
            img.src = `data:image/png;base64,${base64}`;
            console.log('✅ Image src set, waiting for load...');
        } catch (error) {
            console.error('❌ Error converting blob to base64:', error);
        }

        return () => {
            console.log('🧹 Cleaning up sprite sheet');
            imageRef.current = null;
            setImageLoaded(false);
            setDetectedFrames([]);
        };
    }, [blobData, blob_id, frameCount, frameWidth, frameHeight, offsetX, offsetY, detectionMode]);

    // Animate through frames
    useEffect(() => {
        if (!imageLoaded) return;
        const interval = setInterval(() => {
            setCurrentFrame((prev: number) => (prev + 1) % frameCount);
        }, 150);
        return () => clearInterval(interval);
    }, [imageLoaded, frameCount]);

    // Draw the current frame AND debug view
    useEffect(() => {
        const canvas = canvasRef.current;
        const debugCanvas = debugCanvasRef.current;
        if (!canvas || !debugCanvas || !imageLoaded || !imageRef.current || detectedFrames.length === 0) return;

        const ctx = canvas.getContext('2d');
        const debugCtx = debugCanvas.getContext('2d');
        if (!ctx || !debugCtx) return;

        // Get the frame to display (cycle through detected frames)
        const frameIndex = currentFrame % detectedFrames.length;
        const frame = detectedFrames[frameIndex];

        console.log(`📍 Frame ${frameIndex + 1}/${detectedFrames.length}: (${frame.x}, ${frame.y}) ${frame.width}x${frame.height}`);

        // Draw extracted frame
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        try {
            ctx.drawImage(
                imageRef.current,
                frame.x, frame.y, frame.width, frame.height,
                0, 0, canvas.width, canvas.height
            );
        } catch (error) {
            console.error('Error drawing frame:', error);
        }

        // Draw debug view - full sprite sheet with frame indicator
        const scale = Math.min(200 / imageRef.current.width, 200 / imageRef.current.height);
        debugCtx.fillStyle = '#000000';
        debugCtx.fillRect(0, 0, debugCanvas.width, debugCanvas.height);

        debugCtx.drawImage(
            imageRef.current,
            0, 0,
            imageRef.current.width * scale,
            imageRef.current.height * scale
        );

        // Draw red rectangle showing current frame location
        debugCtx.strokeStyle = '#ff0000';
        debugCtx.lineWidth = 2;
        debugCtx.strokeRect(
            frame.x * scale,
            frame.y * scale,
            frame.width * scale,
            frame.height * scale
        );

        // Draw green rectangles for all other detected frames
        debugCtx.strokeStyle = '#00ff00';
        debugCtx.lineWidth = 1;
        detectedFrames.forEach((f, i) => {
            if (i !== frameIndex) {
                debugCtx.strokeRect(
                    f.x * scale,
                    f.y * scale,
                    f.width * scale,
                    f.height * scale
                );
            }
        });
    }, [currentFrame, imageLoaded, detectedFrames]);

    const displaySize = 128;

    return (
        <div className="flex gap-2">
            <div className="flex flex-col gap-1">
                <div className="text-xs font-semibold">Extracted Frame</div>
                <canvas
                    ref={canvasRef}
                    width={displaySize}
                    height={displaySize}
                    className="border rounded bg-white"
                    style={{
                        imageRendering: 'pixelated',
                        width: displaySize,
                        height: displaySize
                    }}
                />
                <div className="text-xs text-muted-foreground text-center">
                    {detectedFrames.length > 0
                        ? `Frame ${(currentFrame % detectedFrames.length) + 1}/${detectedFrames.length}`
                        : 'Analyzing...'}
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <div className="text-xs font-semibold">Full Sprite Sheet</div>
                <canvas
                    ref={debugCanvasRef}
                    width={200}
                    height={200}
                    className="border rounded bg-black"
                    style={{
                        imageRendering: 'pixelated',
                        width: 200,
                        height: 200
                    }}
                />
                <div className="text-xs text-muted-foreground">
                    Red box = current frame
                </div>
            </div>
        </div>
    );
}

export function CharactersView() {
    const { data: characters, isLoading } = useListPlayableCharacters();
    const { data: availableSpriteSheets = [], isLoading: isLoadingSpriteSheets } = useListSpriteSheets();
    const createCharacter = useCreatePlayableCharacter();
    const updateCharacter = useUpdatePlayableCharacter();
    const deleteCharacter = useDeletePlayableCharacter();


    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedCharacter, setSelectedCharacter] = useState<PlayableCharacter | null>(null);
    const [selectedSpriteSheetId, setSelectedSpriteSheetId] = useState<string | null>(null);
    const [detectionMode, setDetectionMode] = useState<'alpha' | 'blackBorder' | 'manual'>('alpha');
    const [manualOffset, setManualOffset] = useState({ x: 0, y: 0 });
    const [showSpriteSelector, setShowSpriteSelector] = useState(false);
    const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
    const selectorCanvasRef = useRef<HTMLCanvasElement>(null);

    // Get the currently selected sprite sheet details
    const selectedSpriteSheet = availableSpriteSheets.find((s: SpriteSheet) => s.id === selectedSpriteSheetId);

    // Form State
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        description: '',
        tags: '',
        stats: {
            health: 100,
            speed: 5,
            strength: 10,
            mana: 50,
            overshield: 0,
        },
        statsEnabled: {
            health: true,
            speed: true,
            strength: true,
            mana: true,
            overshield: false,
        }
    });



    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        // Auto-generate character ID
        const characterId = `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const stats: CharacterStats = {
            health: formData.statsEnabled.health ? [BigInt(formData.stats.health)] : [],
            speed: formData.statsEnabled.speed ? [BigInt(formData.stats.speed)] : [],
            strength: formData.statsEnabled.strength ? [BigInt(formData.stats.strength)] : [],
            mana: formData.statsEnabled.mana ? [BigInt(formData.stats.mana)] : [],
            overshield: formData.statsEnabled.overshield ? [BigInt(formData.stats.overshield)] : [],
        };

        const character: PlayableCharacter = {
            id: characterId,
            name: formData.name,
            description: formData.description,
            tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
            stats,
            sprite_sheets: [],
            created_at: BigInt(Date.now()),
            updated_at: BigInt(Date.now()),
        };

        try {
            const result = await createCharacter.mutateAsync(character);

            if ("ok" in result) {
                toast.success('Character created successfully');
                setIsCreateDialogOpen(false);
                resetForm();
            } else {
                toast.error(`Error: ${result.err.message}`);
            }
        } catch (error) {
            console.error('Failed to create character:', error);
            toast.error('Failed to create character');
        }
    };

    const handleEdit = (char: PlayableCharacter) => {
        setSelectedCharacter(char);
        setFormData({
            id: char.id,
            name: char.name,
            description: char.description,
            tags: char.tags.join(', '),
            stats: {
                health: Number(char.stats.health[0] ?? 0),
                speed: Number(char.stats.speed[0] ?? 0),
                strength: Number(char.stats.strength[0] ?? 0),
                mana: Number(char.stats.mana[0] ?? 0),
                overshield: Number(char.stats.overshield[0] ?? 0),
            },
            statsEnabled: {
                health: char.stats.health.length > 0,
                speed: char.stats.speed.length > 0,
                strength: char.stats.strength.length > 0,
                mana: char.stats.mana.length > 0,
                overshield: char.stats.overshield.length > 0,
            }
        });
        setIsEditDialogOpen(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCharacter) return;

        const stats: CharacterStats = {
            health: formData.stats.health ? [BigInt(formData.stats.health)] : [],
            speed: formData.stats.speed ? [BigInt(formData.stats.speed)] : [],
            strength: formData.stats.strength ? [BigInt(formData.stats.strength)] : [],
            mana: formData.stats.mana ? [BigInt(formData.stats.mana)] : [],
            overshield: formData.stats.overshield ? [BigInt(formData.stats.overshield)] : [],
        };

        const updatedChar: PlayableCharacter = {
            ...selectedCharacter,
            name: formData.name,
            description: formData.description,
            tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
            stats,
            updated_at: BigInt(Date.now()),
        };

        try {
            const result = await updateCharacter.mutateAsync({
                id: selectedCharacter.id,
                character: updatedChar
            });

            if ("ok" in result) {
                toast.success('Character updated successfully');
                setIsEditDialogOpen(false);
                setSelectedCharacter(null);
                resetForm();
            } else {
                toast.error(`Error: ${result.err.message}`);
            }
        } catch (error) {
            console.error('Failed to update character:', error);
            toast.error('Failed to update character');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this character?')) return;

        try {
            const result = await deleteCharacter.mutateAsync(id);
            if ("ok" in result) {
                toast.success('Character deleted successfully');
            } else {
                toast.error(`Error: ${result.err.message}`);
            }
        } catch (error) {
            console.error('Failed to delete character:', error);
            toast.error('Failed to delete character');
        }
    };

    const resetForm = () => {
        setFormData({
            id: '',
            name: '',
            description: '',
            tags: '',
            stats: {
                health: 100,
                speed: 5,
                strength: 10,
                mana: 50,
                overshield: 0,
            },
            statsEnabled: {
                health: true,
                speed: true,
                strength: true,
                mana: true,
                overshield: false,
            }
        });
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[200px] w-full rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Playable Characters</h2>
                    <p className="text-muted-foreground">Manage playable characters, stats, and sprite sheets.</p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Character
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Create New Character</DialogTitle>
                            <DialogDescription>Define a new playable character and their base stats.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Knight, Wizard, Archer"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tags">Tags (comma separated)</Label>
                                <Input
                                    id="tags"
                                    value={formData.tags}
                                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                    placeholder="hero, warrior, magic"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Base Stats</Label>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <Label htmlFor="health" className="text-xs">Health</Label>
                                            <input
                                                type="checkbox"
                                                checked={formData.statsEnabled.health}
                                                onChange={(e) => setFormData({ ...formData, statsEnabled: { ...formData.statsEnabled, health: e.target.checked } })}
                                                className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"
                                            />
                                        </div>
                                        <Input
                                            id="health"
                                            type="number"
                                            value={formData.stats.health}
                                            onChange={(e) => setFormData({ ...formData, stats: { ...formData.stats, health: parseInt(e.target.value) } })}
                                            disabled={!formData.statsEnabled.health}
                                            className={!formData.statsEnabled.health ? 'opacity-50' : ''}
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <Label htmlFor="speed" className="text-xs">Speed</Label>
                                            <input
                                                type="checkbox"
                                                checked={formData.statsEnabled.speed}
                                                onChange={(e) => setFormData({ ...formData, statsEnabled: { ...formData.statsEnabled, speed: e.target.checked } })}
                                                className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"
                                            />
                                        </div>
                                        <Input
                                            id="speed"
                                            type="number"
                                            value={formData.stats.speed}
                                            onChange={(e) => setFormData({ ...formData, stats: { ...formData.stats, speed: parseInt(e.target.value) } })}
                                            disabled={!formData.statsEnabled.speed}
                                            className={!formData.statsEnabled.speed ? 'opacity-50' : ''}
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <Label htmlFor="strength" className="text-xs">Strength</Label>
                                            <input
                                                type="checkbox"
                                                checked={formData.statsEnabled.strength}
                                                onChange={(e) => setFormData({ ...formData, statsEnabled: { ...formData.statsEnabled, strength: e.target.checked } })}
                                                className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"
                                            />
                                        </div>
                                        <Input
                                            id="strength"
                                            type="number"
                                            value={formData.stats.strength}
                                            onChange={(e) => setFormData({ ...formData, stats: { ...formData.stats, strength: parseInt(e.target.value) } })}
                                            disabled={!formData.statsEnabled.strength}
                                            className={!formData.statsEnabled.strength ? 'opacity-50' : ''}
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <Label htmlFor="mana" className="text-xs">Mana</Label>
                                            <input
                                                type="checkbox"
                                                checked={formData.statsEnabled.mana}
                                                onChange={(e) => setFormData({ ...formData, statsEnabled: { ...formData.statsEnabled, mana: e.target.checked } })}
                                                className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"
                                            />
                                        </div>
                                        <Input
                                            id="mana"
                                            type="number"
                                            value={formData.stats.mana}
                                            onChange={(e) => setFormData({ ...formData, stats: { ...formData.stats, mana: parseInt(e.target.value) } })}
                                            disabled={!formData.statsEnabled.mana}
                                            className={!formData.statsEnabled.mana ? 'opacity-50' : ''}
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <Label htmlFor="overshield" className="text-xs">Overshield</Label>
                                            <input
                                                type="checkbox"
                                                checked={formData.statsEnabled.overshield}
                                                onChange={(e) => setFormData({ ...formData, statsEnabled: { ...formData.statsEnabled, overshield: e.target.checked } })}
                                                className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"
                                            />
                                        </div>
                                        <Input
                                            id="overshield"
                                            type="number"
                                            value={formData.stats.overshield}
                                            onChange={(e) => setFormData({ ...formData, stats: { ...formData.stats, overshield: parseInt(e.target.value) } })}
                                            disabled={!formData.statsEnabled.overshield}
                                            className={!formData.statsEnabled.overshield ? 'opacity-50' : ''}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                                <Button type="submit">Create Character</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {characters?.map((char: PlayableCharacter) => (
                    <Card key={char.id} className="overflow-hidden">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>{char.name}</CardTitle>
                                    <CardDescription className="font-mono text-xs mt-1">{char.id}</CardDescription>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(char)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(char.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{char.description}</p>

                            <div className="flex flex-wrap gap-1 mb-4">
                                {char.tags.map((tag: string) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                ))}
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-xs mb-4">
                                <div className="bg-muted p-2 rounded text-center">
                                    <div className="font-bold">{String(char.stats.health[0] ?? '-')}</div>
                                    <div className="text-[10px] text-muted-foreground">HP</div>
                                </div>
                                <div className="bg-muted p-2 rounded text-center">
                                    <div className="font-bold">{String(char.stats.speed[0] ?? '-')}</div>
                                    <div className="text-[10px] text-muted-foreground">SPD</div>
                                </div>
                                <div className="bg-muted p-2 rounded text-center">
                                    <div className="font-bold">{String(char.stats.strength[0] ?? '-')}</div>
                                    <div className="text-[10px] text-muted-foreground">STR</div>
                                </div>
                            </div>

                            <div className="text-xs text-muted-foreground">
                                {char.sprite_sheets.length} sprite sheets configured
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {characters?.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg text-muted-foreground">
                        <User className="h-12 w-12 mb-4 opacity-50" />
                        <p>No characters found. Create one to get started.</p>
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Character: {selectedCharacter?.name}</DialogTitle>
                    </DialogHeader>

                    <Tabs defaultValue="details">
                        <TabsList className="w-full">
                            <TabsTrigger value="details" className="flex-1">Details & Stats</TabsTrigger>
                            <TabsTrigger value="sprites" className="flex-1">Sprite Sheets</TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="space-y-4 mt-4">
                            <form onSubmit={handleUpdate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-name">Name</Label>
                                    <Input
                                        id="edit-name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-description">Description</Label>
                                    <Textarea
                                        id="edit-description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-tags">Tags</Label>
                                    <Input
                                        id="edit-tags"
                                        value={formData.tags}
                                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Base Stats</Label>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <Label className="text-xs">Health</Label>
                                            <Input
                                                type="number"
                                                value={formData.stats.health}
                                                onChange={(e) => setFormData({ ...formData, stats: { ...formData.stats, health: parseInt(e.target.value) } })}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Speed</Label>
                                            <Input
                                                type="number"
                                                value={formData.stats.speed}
                                                onChange={(e) => setFormData({ ...formData, stats: { ...formData.stats, speed: parseInt(e.target.value) } })}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Strength</Label>
                                            <Input
                                                type="number"
                                                value={formData.stats.strength}
                                                onChange={(e) => setFormData({ ...formData, stats: { ...formData.stats, strength: parseInt(e.target.value) } })}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Mana</Label>
                                            <Input
                                                type="number"
                                                value={formData.stats.mana}
                                                onChange={(e) => setFormData({ ...formData, stats: { ...formData.stats, mana: parseInt(e.target.value) } })}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Overshield</Label>
                                            <Input
                                                type="number"
                                                value={formData.stats.overshield}
                                                onChange={(e) => setFormData({ ...formData, stats: { ...formData.stats, overshield: parseInt(e.target.value) } })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-4">
                                    <Button type="submit">Save Changes</Button>
                                </div>
                            </form>
                        </TabsContent>

                        <TabsContent value="sprites" className="space-y-6 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Sprite Sheet Selector */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Select Sprite Sheet</CardTitle>
                                        <CardDescription>Choose a sprite sheet from your library to assign to this character</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Sprite Sheet Dropdown */}
                                        <div className="space-y-2">
                                            <Label>Sprite Sheet</Label>
                                            <select
                                                className="w-full p-2 border rounded-md bg-background"
                                                value={selectedSpriteSheetId || ''}
                                                onChange={(e) => setSelectedSpriteSheetId(e.target.value || null)}
                                            >
                                                <option value="">-- Select a sprite sheet --</option>
                                                {availableSpriteSheets
                                                    .filter((sheet: SpriteSheet) => sheet.animations.length > 0)
                                                    .map((sheet: SpriteSheet) => (
                                                        <option key={sheet.id} value={sheet.id}>
                                                            {sheet.name} ({sheet.animations.length} animations)
                                                        </option>
                                                    ))
                                                }
                                            </select>
                                            {availableSpriteSheets.filter((s: SpriteSheet) => s.animations.length > 0).length === 0 && (
                                                <p className="text-xs text-muted-foreground">
                                                    No sprite sheets with animations found. Go to the Sprites page to create and edit sprite sheets.
                                                </p>
                                            )}
                                        </div>

                                        {/* Selected Sprite Sheet Info */}
                                        {selectedSpriteSheet && (
                                            <div className="p-3 bg-muted/50 rounded-md space-y-3">
                                                <div className="flex gap-4 items-start">
                                                    {/* Animation Preview */}
                                                    <CompactAnimationPreview spriteSheet={selectedSpriteSheet} />

                                                    {/* Info */}
                                                    <div className="flex-1 space-y-1">
                                                        <div className="font-medium">{selectedSpriteSheet.name}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {Number(selectedSpriteSheet.frame_width)}×{Number(selectedSpriteSheet.frame_height)}px • {Number(selectedSpriteSheet.total_frames)} frames
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {selectedSpriteSheet.animations.length} animation{selectedSpriteSheet.animations.length !== 1 ? 's' : ''}
                                                        </div>
                                                        {selectedSpriteSheet.tags.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 pt-1">
                                                                {selectedSpriteSheet.tags.map((tag: string) => (
                                                                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Assign Button */}
                                        {selectedSpriteSheet && (
                                            <Button
                                                className="w-full"
                                                onClick={async () => {
                                                    if (!selectedCharacter || !selectedSpriteSheet) return;

                                                    // Check if already assigned
                                                    const alreadyAssigned = selectedCharacter.sprite_sheets.some(
                                                        (s: SpriteSheet) => s.id === selectedSpriteSheet.id
                                                    );

                                                    if (alreadyAssigned) {
                                                        toast.error('This sprite sheet is already assigned to this character');
                                                        return;
                                                    }

                                                    // Add sprite sheet to character
                                                    const updatedChar: PlayableCharacter = {
                                                        ...selectedCharacter,
                                                        sprite_sheets: [...selectedCharacter.sprite_sheets, selectedSpriteSheet],
                                                        updated_at: BigInt(Date.now()),
                                                    };

                                                    try {
                                                        const result = await updateCharacter.mutateAsync({
                                                            id: selectedCharacter.id,
                                                            character: updatedChar
                                                        });

                                                        if ("ok" in result) {
                                                            toast.success('Sprite sheet assigned successfully');
                                                            setSelectedCharacter(updatedChar);
                                                            setSelectedSpriteSheetId(null);
                                                        } else {
                                                            toast.error(`Error: ${result.err.message}`);
                                                        }
                                                    } catch (error) {
                                                        console.error('Failed to assign sprite sheet:', error);
                                                        toast.error('Failed to assign sprite sheet');
                                                    }
                                                }}
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Assign to Character
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Assigned Sprite Sheets & Animations */}
                                <div className="space-y-4">
                                    <h3 className="font-medium">Assigned Sprite Sheets</h3>
                                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                        {selectedCharacter?.sprite_sheets.map((sheet: SpriteSheet, idx: number) => (
                                            <Card key={idx} className="overflow-hidden">
                                                <CardHeader className="pb-2">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <CardTitle className="text-base">{sheet.name}</CardTitle>
                                                            <CardDescription>
                                                                {Number(sheet.frame_width)}×{Number(sheet.frame_height)}px • {Number(sheet.total_frames)} frames • {sheet.animations.length} animations
                                                            </CardDescription>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive hover:text-destructive h-8 w-8"
                                                            onClick={async () => {
                                                                if (!selectedCharacter) return;
                                                                const updatedSpriteSheets = selectedCharacter.sprite_sheets.filter(
                                                                    (s: SpriteSheet) => s.id !== sheet.id
                                                                );
                                                                const updatedChar: PlayableCharacter = {
                                                                    ...selectedCharacter,
                                                                    sprite_sheets: updatedSpriteSheets,
                                                                    updated_at: BigInt(Date.now()),
                                                                };
                                                                try {
                                                                    const result = await updateCharacter.mutateAsync({
                                                                        id: selectedCharacter.id,
                                                                        character: updatedChar
                                                                    });
                                                                    if ("ok" in result) {
                                                                        toast.success('Sprite sheet removed');
                                                                        setSelectedCharacter(updatedChar);
                                                                    }
                                                                } catch (error) {
                                                                    toast.error('Failed to remove sprite sheet');
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="pt-0">
                                                    {sheet.animations.length > 0 ? (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {sheet.animations.map((anim: any, animIdx: number) => {
                                                                // Handle Candid optional format: [] | [value]
                                                                // Direction: [] = none, [{ 'up': null }] = 'up'
                                                                // Frame rate: [] = none, [12n] = 12
                                                                const getDirection = (val: any): string => {
                                                                    if (!val || (Array.isArray(val) && val.length === 0)) return '—';
                                                                    if (typeof val === 'string') return val;
                                                                    if (Array.isArray(val) && val.length > 0) {
                                                                        const inner = val[0];
                                                                        if (typeof inner === 'object') return Object.keys(inner)[0];
                                                                        return String(inner);
                                                                    }
                                                                    if (typeof val === 'object') return Object.keys(val)[0];
                                                                    return String(val);
                                                                };
                                                                const getFrameRate = (val: any): number => {
                                                                    if (!val || (Array.isArray(val) && val.length === 0)) return 8; // default
                                                                    if (typeof val === 'number') return val;
                                                                    if (typeof val === 'bigint') return Number(val);
                                                                    if (Array.isArray(val) && val.length > 0) return Number(val[0]);
                                                                    return Number(val) || 8;
                                                                };
                                                                const actionType = typeof anim.action_type === 'string' ? anim.action_type : String(anim.action_type);
                                                                const direction = getDirection(anim.direction);
                                                                const frameRate = getFrameRate(anim.frame_rate);
                                                                return (
                                                                    <div key={animIdx} className="p-2 bg-muted/50 rounded text-xs space-y-1">
                                                                        <div className="font-medium">{anim.name}</div>
                                                                        <div className="text-muted-foreground">
                                                                            {actionType} • {direction}
                                                                        </div>
                                                                        <div className="text-muted-foreground">
                                                                            Frames {Number(anim.frame_start)}–{Number(anim.frame_start) + Number(anim.frame_count) - 1} @ {frameRate}fps
                                                                        </div>
                                                                        {(Number(anim.start_x) > 0 || Number(anim.start_y) > 0) && (
                                                                            <div className="text-muted-foreground">
                                                                                Start: ({Number(anim.start_x)}, {Number(anim.start_y)})px
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground">No animations defined</p>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))}
                                        {selectedCharacter?.sprite_sheets.length === 0 && (
                                            <div className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed rounded-lg">
                                                No sprite sheets assigned. Select a sprite sheet from the library to assign it to this character.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </div >
    );
}
