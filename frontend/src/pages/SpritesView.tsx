import { useState, useRef, useEffect } from 'react';
import { Upload, ZoomIn, ZoomOut, Play, Pause } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useUploadCharacterSpriteSheet } from '../hooks/useQueries';
import { BackgroundRemover } from '../components/BackgroundRemover';
import { SpriteSelector } from '../components/SpriteSelector';
import { analyzeSpriteSheet, type DetectionMode } from '../utils/spriteSheetAnalyzer';

export default function SpritesView() {
    const uploadSpriteSheet = useUploadCharacterSpriteSheet();

    const [spriteState, setSpriteState] = useState<{
        name: string;
        state: 'idle' | 'walk' | 'run' | 'attack';
        direction: 'up' | 'down' | 'left' | 'right';
        file: File | null;
        frameCount: number;
        frameWidth: number;
        frameHeight: number;
    }>({
        name: '',
        state: 'idle',
        direction: 'down',
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
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Manual selection drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
    const [drawEnd, setDrawEnd] = useState<{ x: number; y: number } | null>(null);

    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const animationCanvasRef = useRef<HTMLCanvasElement>(null);

    // Re-analyze sprite sheet when settings change
    useEffect(() => {
        if (!previewImage) return;

        const analyzeSprite = async () => {
            setIsAnalyzing(true);
            try {
                const analysis = await analyzeSpriteSheet(previewImage, {
                    expectedFrameWidth: spriteState.frameWidth,
                    expectedFrameHeight: spriteState.frameHeight,
                    expectedFrameCount: spriteState.frameCount,
                    detectionMode: detectionMode,
                    manualOffsetX: manualOffset.x,
                    manualOffsetY: manualOffset.y,
                });
                setDetectedFrames(analysis.frames);
            } catch (error) {
                console.error('Analysis error:', error);
            } finally {
                setIsAnalyzing(false);
            }
        };

        analyzeSprite();
    }, [previewImage, detectionMode, spriteState.frameWidth, spriteState.frameHeight, spriteState.frameCount, manualOffset]);

    // Load sprite sheet when file changes
    useEffect(() => {
        if (!spriteState.file) {
            setPreviewImage(null);
            setDetectedFrames([]);
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const img = new Image();
            img.onload = () => {
                setPreviewImage(img);
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(spriteState.file);
    }, [spriteState.file]);

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

        // In manual mode, draw selection box if drawing
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
            ctx.font = '12px monospace';
            ctx.fillText(`${width} × ${height}`, x + 4, y - 4);
        }

        // Draw green boxes over detected frames (not in manual mode while drawing)
        if (detectionMode !== 'manual' || !drawStart) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            detectedFrames.forEach((frame: any, i: number) => {
                ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);

                // Draw frame number
                ctx.fillStyle = '#00ff00';
                ctx.font = '12px monospace';
                ctx.fillText(`${i + 1}`, frame.x + 4, frame.y + 14);
            });
        }
    }, [previewImage, detectedFrames, detectionMode, drawStart, drawEnd]);

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

        const blobId = `sprite_${spriteState.name}_${spriteState.state}_${spriteState.direction}`;

        try {
            const fileToUpload = processedImageBlob || spriteState.file;
            const buffer = await fileToUpload.arrayBuffer();
            const uint8Array = new Uint8Array(buffer);

            await uploadSpriteSheet.mutateAsync({
                blob_id: blobId,
                data: uint8Array
            });

            toast.success(`Sprite "${spriteState.name}" saved!`);

            // Reset form
            setSpriteState({
                ...spriteState,
                file: null,
                name: ''
            });
            setProcessedImageBlob(null);
            setRemoveBackground(false);
            setPreviewImage(null);
            setDetectedFrames([]);
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload sprite');
        }
    };

    // Mouse handlers for drawing on canvas in manual mode
    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (detectionMode !== 'manual' || !previewCanvasRef.current) return;

        const canvas = previewCanvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // Calculate actual position on the canvas (accounting for zoom)
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;

        setIsDrawing(true);
        setDrawStart({ x, y });
        setDrawEnd({ x, y });
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || detectionMode !== 'manual' || !previewCanvasRef.current) return;

        const canvas = previewCanvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // Calculate actual position on the canvas (accounting for zoom)
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

        // Update manual offset and frame dimensions
        setManualOffset({ x: Math.round(x), y: Math.round(y) });
        setSpriteState({
            ...spriteState,
            frameWidth: Math.round(width),
            frameHeight: Math.round(height)
        });

        // Reset drawing state
        setIsDrawing(false);
        setDrawStart(null);
        setDrawEnd(null);
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

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-xs">State</Label>
                                    <select
                                        className="w-full p-2 text-xs border rounded-md bg-background"
                                        value={spriteState.state}
                                        onChange={(e) => setSpriteState({ ...spriteState, state: e.target.value as any })}
                                    >
                                        <option value="idle">Idle</option>
                                        <option value="walk">Walk</option>
                                        <option value="run">Run</option>
                                        <option value="attack">Attack</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Direction</Label>
                                    <select
                                        className="w-full p-2 text-xs border rounded-md bg-background"
                                        value={spriteState.direction}
                                        onChange={(e) => setSpriteState({ ...spriteState, direction: e.target.value as any })}
                                    >
                                        <option value="up">Up</option>
                                        <option value="down">Down</option>
                                        <option value="left">Left</option>
                                        <option value="right">Right</option>
                                    </select>
                                </div>
                            </div>

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
                                        const checked = e.target.checked;
                                        setRemoveBackground(checked);

                                        if (checked && previewImage) {
                                            // Show background remover with current image
                                            setShowBackgroundRemover(true);
                                        } else {
                                            setShowBackgroundRemover(false);
                                            setProcessedImageBlob(null);
                                            // Reset to original image if unchecking
                                            if (spriteState.file && !checked) {
                                                const reader = new FileReader();
                                                reader.onload = (e) => {
                                                    const img = new Image();
                                                    img.onload = () => setPreviewImage(img);
                                                    img.src = e.target?.result as string;
                                                };
                                                reader.readAsDataURL(spriteState.file);
                                            }
                                        }
                                    }}
                                    className="h-4 w-4"
                                    disabled={!previewImage}
                                />
                                <Label htmlFor="removeBackground" className="text-xs cursor-pointer">
                                    Remove background {!previewImage && '(load image first)'}
                                </Label>
                            </div>

                            {showBackgroundRemover && spriteState.file && (
                                <BackgroundRemover
                                    imageFile={spriteState.file}
                                    onProcessed={(blob) => {
                                        setProcessedImageBlob(blob);
                                        setShowBackgroundRemover(false);

                                        // Update preview image with processed version
                                        const reader = new FileReader();
                                        reader.onload = (e) => {
                                            const img = new Image();
                                            img.onload = () => setPreviewImage(img);
                                            img.src = e.target?.result as string;
                                        };
                                        reader.readAsDataURL(blob);
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
                                        onMouseDown={handleCanvasMouseDown}
                                        onMouseMove={handleCanvasMouseMove}
                                        onMouseUp={handleCanvasMouseUp}
                                        onMouseLeave={handleCanvasMouseUp}
                                        style={{
                                            imageRendering: 'pixelated',
                                            transform: `scale(${zoom})`,
                                            transformOrigin: 'top left',
                                            cursor: detectionMode === 'manual' ? 'crosshair' : 'default',
                                        }}
                                    />
                                </div>

                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>
                                        {isAnalyzing ? (
                                            <span className="text-blue-500">⏳ Analyzing...</span>
                                        ) : (
                                            <>Green boxes show detected frames ({detectedFrames.length} found)</>
                                        )}
                                    </span>
                                    <span>{previewImage.width} × {previewImage.height}px</span>
                                </div>

                                <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded border border-blue-200 dark:border-blue-800">
                                    💡 <strong>Tip:</strong> Adjust detection mode, frame dimensions, or offsets above - the preview updates instantly!
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
