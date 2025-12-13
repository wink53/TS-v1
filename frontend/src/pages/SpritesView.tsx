import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Play, Pause, ZoomIn, ZoomOut, Upload, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useUploadCharacterSpriteSheet, useCreateSpriteSheet, useGetSpriteSheet, useGetCharacterSpriteSheet } from '../hooks/useQueries';
import { BackgroundRemover } from '../components/BackgroundRemover';
import { SpriteSelector } from '../components/SpriteSelector';
import { TagInput } from '../components/TagInput';
import { analyzeSpriteSheet, type DetectionMode } from '../utils/spriteSheetAnalyzer';

export default function SpritesView({ spriteId, onBack }: { spriteId?: string; onBack?: () => void }) {
    const uploadSpriteSheet = useUploadCharacterSpriteSheet();
    const createSpriteSheet = useCreateSpriteSheet();
    const { data: existingSprite, isLoading: isLoadingSprite } = spriteId
        ? useGetSpriteSheet(spriteId)
        : { data: null, isLoading: false };
    const { data: spriteImageBlob } = existingSprite
        ? useGetCharacterSpriteSheet(existingSprite.blob_id)
        : { data: null };

    const [spriteState, setSpriteState] = useState<{
        name: string;
        description: string;
        tags: string[];
        file: File | null;
        frameCount: number;
        frameWidth: number;
        frameHeight: number;
    }>({
        name: '',
        description: '',
        tags: [],
        file: null,
        frameCount: 1,
        frameWidth: 32,
        frameHeight: 32,
    });

    const [detectionMode, setDetectionMode] = useState<DetectionMode>('alpha');
    const [manualOffset, setManualOffset] = useState({ x: 0, y: 0 });
    const [removeBackground, setRemoveBackground] = useState(false);
    const [showBackgroundRemover, setShowBackgroundRemover] = useState(false);
    const [processedImageBlob, setProcessedImageBlob] = useState<Blob | null>(null);
    const [showSpriteSelector, setShowSpriteSelector] = useState(false);

    // Preview state
    const [previewImage, setPreviewImage] = useState<HTMLImageElement | null>(null);
    const [zoom, setZoom] = useState(1);
    const [detectedFrames, setDetectedFrames] = useState<any[]>([]);
    const [isAnimating, setIsAnimating] = useState(true);
    const [currentFrame, setCurrentFrame] = useState(0);

    // Manual selection drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
    const [drawEnd, setDrawEnd] = useState<{ x: number; y: number } | null>(null);

    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const animationCanvasRef = useRef<HTMLCanvasElement>(null);

    // Load existing sprite sheet when editing
    useEffect(() => {
        if (!existingSprite || !spriteImageBlob) return;

        // Populate sprite state with existing data
        setSpriteState({
            name: existingSprite.name,
            description: existingSprite.description,
            tags: existingSprite.tags,
            file: null, // We don't have the original file, just the blob
            frameCount: Number(existingSprite.total_frames),
            frameWidth: Number(existingSprite.frame_width),
            frameHeight: Number(existingSprite.frame_height),
        });

        // Load the image from blob
        const blob = new Blob([spriteImageBlob.buffer], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = async () => {
            setPreviewImage(img);

            // Analyze the loaded sprite sheet
            const analysis = await analyzeSpriteSheet(img, {
                expectedFrameWidth: Number(existingSprite.frame_width),
                expectedFrameHeight: Number(existingSprite.frame_height),
                expectedFrameCount: Number(existingSprite.total_frames),
                detectionMode: detectionMode,
                manualOffsetX: manualOffset.x,
                manualOffsetY: manualOffset.y,
            });

            setDetectedFrames(analysis.frames);
        };
        img.src = url;

        return () => URL.revokeObjectURL(url);
    }, [existingSprite, spriteImageBlob]);

    // Load and analyze sprite sheet when file changes
    useEffect(() => {
        if (!spriteState.file) {
            setPreviewImage(null);
            setDetectedFrames([]);
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const img = new Image();
            img.onload = async () => {
                setPreviewImage(img);

                // Analyze sprite sheet with manual offset
                const analysis = await analyzeSpriteSheet(img, {
                    expectedFrameWidth: spriteState.frameWidth,
                    expectedFrameHeight: spriteState.frameHeight,
                    expectedFrameCount: spriteState.frameCount,
                    detectionMode: detectionMode,
                    manualOffsetX: manualOffset.x,
                    manualOffsetY: manualOffset.y,
                });

                setDetectedFrames(analysis.frames);
            };
            img.src = e.target?.result as string;
        };

        // Use processed image if background was removed, otherwise use original file
        const fileToRead = processedImageBlob || spriteState.file;
        if (fileToRead) {
            reader.readAsDataURL(fileToRead);
        }
    }, [spriteState.file, detectionMode, spriteState.frameWidth, spriteState.frameHeight, spriteState.frameCount, manualOffset, processedImageBlob]);

    // Draw preview with frame overlays
    useEffect(() => {
        if (!previewImage || !previewCanvasRef.current) return;

        const canvas = previewCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = previewImage.width;
        canvas.height = previewImage.height;

        // Draw image
        ctx.drawImage(previewImage, 0, 0);

        // Draw boxes over detected frames (only if not currently drawing in manual mode)
        if (detectionMode !== 'manual' || !isDrawing) {
            detectedFrames.forEach((frame, i) => {
                // Use subtle red for current frame if multiple frames exist
                const isCurrentFrame = i === currentFrame && detectedFrames.length > 1;
                const color = isCurrentFrame ? '#ff6b6b' : '#00ff00';

                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);

                // Draw frame number centered above the frame
                ctx.fillStyle = color;
                ctx.font = isCurrentFrame ? 'bold 14px monospace' : '12px monospace';
                const text = `${i + 1}`;
                const textWidth = ctx.measureText(text).width;
                const centerX = frame.x + (frame.width / 2) - (textWidth / 2);
                ctx.fillText(text, centerX, frame.y - 6);
            });
        }

        // Draw selection box in manual mode
        if (detectionMode === 'manual' && drawStart && drawEnd) {
            const x = Math.min(drawStart.x, drawEnd.x);
            const y = Math.min(drawStart.y, drawEnd.y);
            const width = Math.abs(drawEnd.x - drawStart.x);
            const height = Math.abs(drawEnd.y - drawStart.y);

            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);

            // Draw dimensions
            ctx.fillStyle = '#00ff00';
            ctx.font = '14px monospace';
            ctx.fillText(`${Math.round(width)} × ${Math.round(height)}`, x, y - 5);
        }
    }, [previewImage, detectedFrames, detectionMode, isDrawing, drawStart, drawEnd, currentFrame, isAnimating]);

    // Animate sprite preview
    useEffect(() => {
        if (!isAnimating || detectedFrames.length === 0 || !previewImage) return;

        const interval = setInterval(() => {
            setCurrentFrame((prev) => (prev + 1) % detectedFrames.length);
        }, 150);

        return () => clearInterval(interval);
    }, [isAnimating, detectedFrames.length, previewImage]);

    // Draw animated preview
    useEffect(() => {
        if (!previewImage || !animationCanvasRef.current || detectedFrames.length === 0) return;

        const canvas = animationCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const frame = detectedFrames[currentFrame];
        if (!frame) return;

        canvas.width = frame.width;
        canvas.height = frame.height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
            previewImage,
            frame.x, frame.y, frame.width, frame.height,
            0, 0, frame.width, frame.height
        );
    }, [previewImage, detectedFrames, currentFrame]);

    const handleSpriteUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!spriteState.file || !spriteState.name) {
            toast.error('Please provide a name and select a file');
            return;
        }

        // Generate auto-generated immutable sprite ID
        const spriteId = `sprite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const blobId = `${spriteId}_blob`;

        try {
            // Step 1: Upload sprite sheet image blob
            const fileToUpload = processedImageBlob || spriteState.file;
            const buffer = await fileToUpload.arrayBuffer();
            const uint8Array = new Uint8Array(buffer);

            await uploadSpriteSheet.mutateAsync({
                blob_id: blobId,
                data: uint8Array
            });

            // Step 2: Create sprite sheet metadata record
            const spriteSheetRecord = {
                id: spriteId,
                name: spriteState.name,
                description: spriteState.description,
                tags: spriteState.tags,
                blob_id: blobId,
                frame_width: spriteState.frameWidth,
                frame_height: spriteState.frameHeight,
                total_frames: spriteState.frameCount,
                animations: [], // Empty for now, will add animation UI later
                created_at: BigInt(Date.now() * 1000000), // Convert to nanoseconds
                updated_at: BigInt(Date.now() * 1000000)
            };

            const result = await createSpriteSheet.mutateAsync(spriteSheetRecord);

            if ('err' in result) {
                throw new Error(result.err.message);
            }

            toast.success(`Sprite "${spriteState.name}" saved successfully!`);

            // Reset form including metadata
            setSpriteState({
                name: '',
                description: '',
                tags: [],
                file: null,
                frameCount: 1,
                frameWidth: 32,
                frameHeight: 32,
            });
            setProcessedImageBlob(null);
            setRemoveBackground(false);
            setPreviewImage(null);
            setDetectedFrames([]);
        } catch (error: any) {
            console.error('Save error:', error);
            if (error.message?.includes('409') || error.message?.includes('already exists')) {
                toast.error('Sprite ID already exists. Please try again.');
            } else if (error.message?.includes('blob')) {
                toast.error('Failed to upload sprite image.');
            } else {
                toast.error('Failed to save sprite: ' + (error.message || 'Unknown error'));
            }
        }
    };

    // Mouse handlers for manual selection
    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (detectionMode !== 'manual' || !previewCanvasRef.current) return;

        const canvas = previewCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;

        setIsDrawing(true);
        setDrawStart({ x, y });
        setDrawEnd({ x, y });
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !previewCanvasRef.current) return;

        const canvas = previewCanvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;

        setDrawEnd({ x, y });
    };

    const handleCanvasMouseUp = () => {
        if (!isDrawing || !drawStart || !drawEnd) return;

        const x = Math.min(drawStart.x, drawEnd.x);
        const y = Math.min(drawStart.y, drawEnd.y);
        const width = Math.abs(drawEnd.x - drawStart.x);
        const height = Math.abs(drawEnd.y - drawStart.y);

        setManualOffset({ x: Math.round(x), y: Math.round(y) });
        setSpriteState(prev => ({
            ...prev,
            frameWidth: Math.round(width),
            frameHeight: Math.round(height),
        }));

        setIsDrawing(false);
        setDrawStart(null);
        setDrawEnd(null);
    };

    const handleCanvasMouseLeave = () => {
        if (isDrawing) {
            setIsDrawing(false);
            setDrawStart(null);
            setDrawEnd(null);
        }
    };


    return (
        <div className="p-6 max-w-[1800px] mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Sprite Editor</h1>
                <p className="text-muted-foreground mt-1">
                    Upload and configure sprite sheets for use in your game
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Upload Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Configuration</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSpriteUpload} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs">Sprite Name *</Label>
                                <Input
                                    placeholder="e.g., knight, wizard"
                                    value={spriteState.name}
                                    onChange={(e) => setSpriteState({ ...spriteState, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs">Description</Label>
                                <textarea
                                    className="w-full p-2 text-xs border rounded-md bg-background min-h-[60px] resize-none"
                                    placeholder="Optional description of the sprite..."
                                    value={spriteState.description}
                                    onChange={(e) => setSpriteState({ ...spriteState, description: e.target.value })}
                                />
                            </div>

                            <TagInput
                                tags={spriteState.tags}
                                onTagsChange={(tags) => setSpriteState({ ...spriteState, tags })}
                                suggestions={['typing', 'run', 'walk', 'shoot', 'jump', 'duck', 'roll', 'left', 'right', 'up', 'down', 'crawl']}
                                label="Tags"
                                placeholder="Type to add tags..."
                            />

                            <div className="space-y-2">
                                <Label className="text-xs">Detection Mode</Label>
                                <div className="flex gap-1">
                                    <Button
                                        type="button"
                                        variant={detectionMode === 'alpha' ? 'default' : 'outline'}
                                        size="sm"
                                        className="text-xs flex-1"
                                        onClick={() => setDetectionMode('alpha')}
                                    >
                                        Alpha
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={detectionMode === 'blackBorder' ? 'default' : 'outline'}
                                        size="sm"
                                        className="text-xs flex-1"
                                        onClick={() => setDetectionMode('blackBorder')}
                                    >
                                        Border
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={detectionMode === 'manual' ? 'default' : 'outline'}
                                        size="sm"
                                        className="text-xs flex-1"
                                        onClick={() => setDetectionMode('manual')}
                                    >
                                        Manual
                                    </Button>
                                </div>
                            </div>

                            {detectionMode === 'manual' && (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label className="text-xs">X Offset</Label>
                                            <Input
                                                type="number"
                                                className="text-xs h-8"
                                                value={manualOffset.x}
                                                onChange={(e) => setManualOffset({ ...manualOffset, x: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Y Offset</Label>
                                            <Input
                                                type="number"
                                                className="text-xs h-8"
                                                value={manualOffset.y}
                                                onChange={(e) => setManualOffset({ ...manualOffset, y: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-xs">Frames</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        className="text-xs h-8"
                                        value={spriteState.frameCount}
                                        onChange={(e) => setSpriteState({ ...spriteState, frameCount: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Width</Label>
                                    <Input
                                        type="number"
                                        className="text-xs h-8"
                                        value={spriteState.frameWidth}
                                        onChange={(e) => setSpriteState({ ...spriteState, frameWidth: parseInt(e.target.value) || 32 })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Height</Label>
                                    <Input
                                        type="number"
                                        className="text-xs h-8"
                                        value={spriteState.frameHeight}
                                        onChange={(e) => setSpriteState({ ...spriteState, frameHeight: parseInt(e.target.value) || 32 })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs">Sprite Sheet (PNG)</Label>
                                <Input
                                    type="file"
                                    accept="image/png"
                                    className="text-xs"
                                    onChange={(e) => setSpriteState({ ...spriteState, file: e.target.files?.[0] || null })}
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="removeBackground"
                                    checked={removeBackground}
                                    onChange={(e) => {
                                        setRemoveBackground(e.target.checked);
                                        if (e.target.checked && spriteState.file) {
                                            setShowBackgroundRemover(true);
                                        } else {
                                            setShowBackgroundRemover(false);
                                            setProcessedImageBlob(null);
                                        }
                                    }}
                                    className="h-4 w-4"
                                />
                                <Label htmlFor="removeBackground" className="text-xs cursor-pointer">
                                    Remove background
                                </Label>
                            </div>

                            {showBackgroundRemover && spriteState.file && (
                                <BackgroundRemover
                                    imageFile={spriteState.file}
                                    onProcessed={(blob) => {
                                        setProcessedImageBlob(blob);
                                        setShowBackgroundRemover(false);
                                    }}
                                    onCancel={() => {
                                        setShowBackgroundRemover(false);
                                        setRemoveBackground(false);
                                        setProcessedImageBlob(null);
                                    }}
                                />
                            )}

                            <Button
                                type="submit"
                                className="w-full text-xs"
                                size="sm"
                                disabled={!spriteState.file || !spriteState.name || (removeBackground && !processedImageBlob && !showBackgroundRemover)}
                            >
                                <Upload className="mr-2 h-3 w-3" />
                                Save Sprite
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Center: Large Preview */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Sprite Sheet Preview</CardTitle>
                            {previewImage && (
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setZoom(Math.max(0.5, zoom - 0.5))}
                                    >
                                        <ZoomOut className="h-4 w-4" />
                                    </Button>
                                    <span className="text-xs flex items-center px-2">{Math.round(zoom * 100)}%</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setZoom(Math.min(4, zoom + 0.5))}
                                    >
                                        <ZoomIn className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {!previewImage ? (
                            <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
                                <p className="text-muted-foreground text-sm">Upload a sprite sheet to see preview</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="overflow-auto border rounded-lg bg-checkerboard p-4" style={{ maxHeight: '500px' }}>
                                    <canvas
                                        ref={previewCanvasRef}
                                        style={{
                                            imageRendering: 'pixelated',
                                            transform: `scale(${zoom})`,
                                            transformOrigin: 'top left',
                                            cursor: detectionMode === 'manual' ? 'crosshair' : 'default',
                                        }}
                                        onMouseDown={handleCanvasMouseDown}
                                        onMouseMove={handleCanvasMouseMove}
                                        onMouseUp={handleCanvasMouseUp}
                                        onMouseLeave={handleCanvasMouseLeave}
                                    />
                                </div>

                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Green boxes show detected frames ({detectedFrames.length} found)</span>
                                    <span>{previewImage.width} × {previewImage.height}px</span>
                                </div>

                                {/* Animated Preview */}
                                {detectedFrames.length > 0 && (
                                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                                        <div className="flex flex-col gap-2">
                                            <div className="text-xs font-semibold">Animation Preview</div>
                                            <div className="border rounded bg-checkerboard p-2">
                                                <canvas
                                                    ref={animationCanvasRef}
                                                    style={{
                                                        imageRendering: 'pixelated',
                                                        width: '128px',
                                                        height: '128px',
                                                    }}
                                                />
                                            </div>
                                            <div className="text-xs text-center text-muted-foreground">
                                                Frame {currentFrame + 1}/{detectedFrames.length}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsAnimating(!isAnimating)}
                                            >
                                                {isAnimating ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                                {isAnimating ? 'Pause' : 'Play'}
                                            </Button>
                                            <div className="text-xs text-muted-foreground">
                                                {spriteState.frameWidth} × {spriteState.frameHeight}px per frame
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <style>{`
                .bg-checkerboard {
                    background-image: 
                        linear-gradient(45deg, #ccc 25%, transparent 25%),
                        linear-gradient(-45deg, #ccc 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #ccc 75%),
                        linear-gradient(-45deg, transparent 75%, #ccc 75%);
                    background-size: 20px 20px;
                    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
                }
            `}</style>
        </div>
    );
}
