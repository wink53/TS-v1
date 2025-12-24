import { useRef, useEffect } from 'react';
import { Play, Pause, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import type { SpriteState } from './types';

interface SpritePreviewProps {
    previewImage: HTMLImageElement | null;
    spriteState: SpriteState;
    detectedFrames: { x: number; y: number; width: number; height: number }[];
    currentFrame: number;
    setCurrentFrame: (frame: number) => void;
    zoom: number;
    setZoom: (zoom: number) => void;
    isAnimating: boolean;
    setIsAnimating: (value: boolean) => void;
    manualOffset: { x: number; y: number };
    setManualOffset: (offset: { x: number; y: number }) => void;
    // Manual selection drawing
    isDrawing: boolean;
    setIsDrawing: (value: boolean) => void;
    drawStart: { x: number; y: number } | null;
    setDrawStart: (start: { x: number; y: number } | null) => void;
    drawEnd: { x: number; y: number } | null;
    setDrawEnd: (end: { x: number; y: number } | null) => void;
    onFrameDetected?: (frame: { x: number; y: number; width: number; height: number }) => void;
}

export function SpritePreview({
    previewImage,
    spriteState,
    detectedFrames,
    currentFrame,
    setCurrentFrame,
    zoom,
    setZoom,
    isAnimating,
    setIsAnimating,
    manualOffset,
    setManualOffset,
    isDrawing,
    setIsDrawing,
    drawStart,
    setDrawStart,
    drawEnd,
    setDrawEnd,
    onFrameDetected,
}: SpritePreviewProps) {
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const animationCanvasRef = useRef<HTMLCanvasElement>(null);

    // Draw the sprite sheet with frame overlay
    useEffect(() => {
        const canvas = previewCanvasRef.current;
        if (!canvas || !previewImage) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const scaledWidth = previewImage.width * zoom;
        const scaledHeight = previewImage.height * zoom;

        canvas.width = scaledWidth;
        canvas.height = scaledHeight;

        // Clear and draw image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(previewImage, 0, 0, scaledWidth, scaledHeight);

        // Draw frame grid
        const frameWidth = spriteState.frameWidth * zoom;
        const frameHeight = spriteState.frameHeight * zoom;
        const offsetX = manualOffset.x * zoom;
        const offsetY = manualOffset.y * zoom;

        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 1;

        // Draw detected frames
        detectedFrames.forEach((frame, i) => {
            const x = frame.x * zoom;
            const y = frame.y * zoom;
            const w = frame.width * zoom;
            const h = frame.height * zoom;

            ctx.strokeStyle = i === currentFrame ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 0, 0, 0.5)';
            ctx.lineWidth = i === currentFrame ? 2 : 1;
            ctx.strokeRect(x, y, w, h);

            // Draw frame number
            ctx.fillStyle = i === currentFrame ? '#00ff00' : '#ff0000';
            ctx.font = `${10 * zoom}px monospace`;
            ctx.fillText(`${i}`, x + 2, y + 10 * zoom);
        });

        // Draw current manual selection during drawing
        if (isDrawing && drawStart && drawEnd) {
            const x = Math.min(drawStart.x, drawEnd.x);
            const y = Math.min(drawStart.y, drawEnd.y);
            const w = Math.abs(drawEnd.x - drawStart.x);
            const h = Math.abs(drawEnd.y - drawStart.y);

            ctx.strokeStyle = 'rgba(0, 0, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(x, y, w, h);
            ctx.setLineDash([]);
        }
    }, [previewImage, zoom, spriteState, manualOffset, detectedFrames, currentFrame, isDrawing, drawStart, drawEnd]);

    // Animation preview effect
    useEffect(() => {
        const canvas = animationCanvasRef.current;
        if (!canvas || !previewImage || detectedFrames.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const frame = detectedFrames[currentFrame];
        if (!frame) return;

        // Set canvas to single frame size
        canvas.width = frame.width;
        canvas.height = frame.height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
            previewImage,
            frame.x, frame.y, frame.width, frame.height,
            0, 0, frame.width, frame.height
        );
    }, [previewImage, detectedFrames, currentFrame]);

    // Animation loop
    useEffect(() => {
        if (!isAnimating || detectedFrames.length === 0) return;

        const interval = setInterval(() => {
            setCurrentFrame((currentFrame + 1) % detectedFrames.length);
        }, 150);

        return () => clearInterval(interval);
    }, [isAnimating, detectedFrames.length, currentFrame, setCurrentFrame]);

    // Mouse handlers for manual selection
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = previewCanvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setIsDrawing(true);
        setDrawStart({ x, y });
        setDrawEnd({ x, y });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const canvas = previewCanvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        setDrawEnd({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    const handleMouseUp = () => {
        if (!isDrawing || !drawStart || !drawEnd) {
            setIsDrawing(false);
            return;
        }

        // Calculate frame from selection
        const x = Math.min(drawStart.x, drawEnd.x) / zoom;
        const y = Math.min(drawStart.y, drawEnd.y) / zoom;
        const w = Math.abs(drawEnd.x - drawStart.x) / zoom;
        const h = Math.abs(drawEnd.y - drawStart.y) / zoom;

        if (w > 5 && h > 5 && onFrameDetected) {
            onFrameDetected({
                x: Math.round(x),
                y: Math.round(y),
                width: Math.round(w),
                height: Math.round(h),
            });
        }

        setIsDrawing(false);
        setDrawStart(null);
        setDrawEnd(null);
    };

    if (!previewImage) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Upload an image to preview
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Zoom and Animation Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setZoom(Math.max(0.5, zoom - 0.5))}
                    >
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-xs">{Math.round(zoom * 100)}%</span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setZoom(Math.min(4, zoom + 0.5))}
                    >
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAnimating(!isAnimating)}
                    >
                        {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <span className="text-xs">
                        Frame: {currentFrame + 1}/{detectedFrames.length || 1}
                    </span>
                </div>
            </div>

            {/* Manual Offset Controls */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <Label className="text-xs">Preview Offset X</Label>
                    <Input
                        type="number"
                        value={manualOffset.x}
                        onChange={(e) => setManualOffset({ ...manualOffset, x: parseInt(e.target.value) || 0 })}
                        className="text-xs h-7"
                    />
                </div>
                <div>
                    <Label className="text-xs">Preview Offset Y</Label>
                    <Input
                        type="number"
                        value={manualOffset.y}
                        onChange={(e) => setManualOffset({ ...manualOffset, y: parseInt(e.target.value) || 0 })}
                        className="text-xs h-7"
                    />
                </div>
            </div>

            {/* Preview Canvas */}
            <div className="border rounded overflow-auto max-h-[300px] bg-muted/30">
                <canvas
                    ref={previewCanvasRef}
                    className="cursor-crosshair"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />
            </div>

            {/* Animation Preview */}
            {detectedFrames.length > 0 && (
                <div className="flex flex-col items-center gap-2">
                    <Label className="text-xs">Animation Preview</Label>
                    <div className="border-2 rounded p-2 bg-muted/30">
                        <canvas
                            ref={animationCanvasRef}
                            className="pixelated"
                            style={{ imageRendering: 'pixelated' }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
