import { useRef, useEffect, useState } from 'react';
import { Button } from './ui/button';

interface BackgroundRemoverProps {
    imageFile: File;
    onProcessed: (processedBlob: Blob) => void;
    onCancel: () => void;
}

export function BackgroundRemover({ imageFile, onProcessed, onCancel }: BackgroundRemoverProps) {
    const originalCanvasRef = useRef<HTMLCanvasElement>(null);
    const processedCanvasRef = useRef<HTMLCanvasElement>(null);
    const [tolerance, setTolerance] = useState(30);
    const [backgroundColor, setBackgroundColor] = useState<{ r: number; g: number; b: number } | null>(null);
    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Load original image
    useEffect(() => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                setOriginalImage(img);

                // Draw original image
                const canvas = originalCanvasRef.current;
                if (canvas) {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0);

                        // Auto-detect background color
                        const detectedColor = detectBackgroundColor(ctx, img.width, img.height);
                        setBackgroundColor(detectedColor);
                    }
                }
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(imageFile);
    }, [imageFile]);

    // Process image when tolerance or background color changes
    useEffect(() => {
        if (!originalImage || !backgroundColor) return;

        const canvas = processedCanvasRef.current;
        if (!canvas) return;

        canvas.width = originalImage.width;
        canvas.height = originalImage.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw original image
        ctx.drawImage(originalImage, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Remove background
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Calculate color difference
            const diff = Math.sqrt(
                Math.pow(r - backgroundColor.r, 2) +
                Math.pow(g - backgroundColor.g, 2) +
                Math.pow(b - backgroundColor.b, 2)
            );

            // If color is close to background, make it transparent
            if (diff <= tolerance) {
                data[i + 3] = 0; // Set alpha to 0 (transparent)
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }, [originalImage, backgroundColor, tolerance]);

    const detectBackgroundColor = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        // Sample the 4 corners
        const samples = [
            ctx.getImageData(0, 0, 1, 1).data, // Top-left
            ctx.getImageData(width - 1, 0, 1, 1).data, // Top-right
            ctx.getImageData(0, height - 1, 1, 1).data, // Bottom-left
            ctx.getImageData(width - 1, height - 1, 1, 1).data, // Bottom-right
        ];

        // Average the colors (simple approach - assumes all corners are background)
        let r = 0, g = 0, b = 0;
        samples.forEach(sample => {
            r += sample[0];
            g += sample[1];
            b += sample[2];
        });

        return {
            r: Math.round(r / samples.length),
            g: Math.round(g / samples.length),
            b: Math.round(b / samples.length),
        };
    };

    const handleApply = async () => {
        setIsProcessing(true);
        const canvas = processedCanvasRef.current;
        if (!canvas) return;

        canvas.toBlob((blob) => {
            if (blob) {
                onProcessed(blob);
            }
            setIsProcessing(false);
        }, 'image/png');
    };

    return (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div>
                <h3 className="text-sm font-semibold mb-2">Background Removal</h3>
                {backgroundColor && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <span>Detected background:</span>
                        <div
                            className="w-6 h-6 border rounded"
                            style={{ backgroundColor: `rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})` }}
                        />
                        <span>RGB({backgroundColor.r}, {backgroundColor.g}, {backgroundColor.b})</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <div className="text-xs font-medium mb-1">Original</div>
                    <div className="border rounded bg-white/50 overflow-hidden">
                        <canvas ref={originalCanvasRef} className="max-w-full h-auto" />
                    </div>
                </div>
                <div>
                    <div className="text-xs font-medium mb-1">Preview (Transparent)</div>
                    <div className="border rounded bg-checkerboard overflow-hidden">
                        <canvas ref={processedCanvasRef} className="max-w-full h-auto" />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <label className="font-medium">Tolerance: {tolerance}</label>
                    <span className="text-muted-foreground">Adjust to remove more/less background</span>
                </div>
                <input
                    type="range"
                    value={tolerance}
                    onChange={(e) => setTolerance(parseInt(e.target.value))}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
            </div>

            <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={onCancel}>
                    Skip
                </Button>
                <Button size="sm" onClick={handleApply} disabled={isProcessing}>
                    {isProcessing ? 'Processing...' : 'Apply & Continue'}
                </Button>
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
