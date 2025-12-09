import { useRef, useEffect, useState } from 'react';
import { useGetCharacterSpriteSheet } from '../hooks/useQueries';

interface SpriteSelectorProps {
    blob_id: string;
    onSelect: (x: number, y: number, width: number, height: number) => void;
}

export function SpriteSelector({ blob_id, onSelect }: SpriteSelectorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
    const [currentSelection, setCurrentSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [image, setImage] = useState<HTMLImageElement | null>(null);

    const { data: blobData } = useGetCharacterSpriteSheet(blob_id);

    // Load sprite sheet image
    useEffect(() => {
        if (!blobData) return;

        const img = new Image();
        img.onload = () => {
            setImage(img);
            // Draw image on canvas
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                }
            }
        };

        const uint8Array = blobData instanceof Uint8Array ? blobData : new Uint8Array(blobData);
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
            binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        const base64 = btoa(binary);
        img.src = `data:image/png;base64,${base64}`;
    }, [blobData]);

    // Redraw canvas with selection box
    useEffect(() => {
        if (!image || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear and redraw image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);

        // Draw selection box if exists
        if (currentSelection) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(
                currentSelection.x,
                currentSelection.y,
                currentSelection.width,
                currentSelection.height
            );
            ctx.setLineDash([]);

            // Draw coordinates label
            ctx.fillStyle = '#00ff00';
            ctx.font = '12px monospace';
            const label = `X:${currentSelection.x} Y:${currentSelection.y} W:${currentSelection.width} H:${currentSelection.height}`;
            ctx.fillText(label, currentSelection.x, currentSelection.y - 5);
        }
    }, [image, currentSelection]);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = Math.floor(e.clientX - rect.left);
        const y = Math.floor(e.clientY - rect.top);

        setIsSelecting(true);
        setSelectionStart({ x, y });
        setCurrentSelection({ x, y, width: 0, height: 0 });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isSelecting || !selectionStart) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const currentX = Math.floor(e.clientX - rect.left);
        const currentY = Math.floor(e.clientY - rect.top);

        const width = currentX - selectionStart.x;
        const height = currentY - selectionStart.y;

        setCurrentSelection({
            x: width < 0 ? currentX : selectionStart.x,
            y: height < 0 ? currentY : selectionStart.y,
            width: Math.abs(width),
            height: Math.abs(height)
        });
    };

    const handleMouseUp = () => {
        if (!isSelecting || !currentSelection) return;

        setIsSelecting(false);

        // Only call onSelect if we have a meaningful selection
        if (currentSelection.width > 5 && currentSelection.height > 5) {
            onSelect(
                currentSelection.x,
                currentSelection.y,
                currentSelection.width,
                currentSelection.height
            );
        }
    };

    return (
        <div className="border rounded p-4 bg-muted/30">
            <div className="mb-2 text-sm font-medium">Click and drag to select a sprite frame:</div>
            <div className="overflow-auto max-h-[600px] border rounded bg-black/5">
                <canvas
                    ref={canvasRef}
                    className="cursor-crosshair"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />
            </div>
            {currentSelection && currentSelection.width > 0 && currentSelection.height > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                    Selection: X={currentSelection.x}, Y={currentSelection.y}, Width={currentSelection.width}, Height={currentSelection.height}
                </div>
            )}
        </div>
    );
}
