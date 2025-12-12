import { useState, useRef, useEffect } from 'react';
import { Upload, ZoomIn, ZoomOut, Play, Pause, Plus, Trash2, Edit2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import {
    useCreateSpriteSheet,
    useUploadCharacterSpriteSheet,
    useAddAnimationToSheet
} from '../hooks/useQueries';
import { BackgroundRemover } from '../components/BackgroundRemover';
import { analyzeSpriteSheet, type DetectionMode } from '../utils/spriteSheetAnalyzer';
import type { Animation, Direction, PREDEFINED_ACTION_TYPES } from '../types/spriteSheet';

const PREDEFINED_ACTIONS = [
    'walk', 'run', 'sprint', 'crouch', 'crawl',
    'attack', 'defend', 'block', 'dodge', 'cast',
    'idle', 'death', 'hurt', 'stunned',
    'interact', 'pickup', 'use', 'throw',
    'celebrate', 'taunt', 'emote',
] as const;

export default function SpritesView() {
    const createSpriteSheet = useCreateSpriteSheet();
    const uploadBlob = useUploadCharacterSpriteSheet();
    const addAnimation = useAddAnimationToSheet();

    // Workflow step: 'upload' | 'define-animations' | 'complete'
    const [step, setStep] = useState<'upload' | 'define-animations' | 'complete'>('upload');

    // Sheet-level state
    const [sheetData, setSheetData] = useState({
        id: '',
        name: '',
        file: null as File | null,
        blob_id: '',
        frameWidth: 32,
        frameHeight: 32,
        totalFrames: 0,
    });

    // Animation being edited
    const [editingAnimation, setEditingAnimation] = useState<Animation | null>(null);
    const [animations, setAnimations] = useState<Animation[]>([]);

    // Preview state
    const [previewImage, setPreviewImage] = useState<HTMLImageElement | null>(null);
    const [zoom, setZoom] = useState(1);
    const [detectedFrames, setDetectedFrames] = useState<any[]>([]);
    const [isAnimating, setIsAnimating] = useState(true);
    const [currentFrame, setCurrentFrame] = useState(0);

    // Background removal
    const [removeBackground, setRemoveBackground] = useState(false);
    const [processedImageBlob, setProcessedImageBlob] = useState<Blob | null>(null);

    // Manual frame selection
    const [detectionMode, setDetectionMode] = useState<DetectionMode>('alpha');
    const [manualOffset, setManualOffset] = useState({ x: 0, y: 0 });
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
    const [drawEnd, setDrawEnd] = useState<{ x: number; y: number } | null>(null);

    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const animationCanvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load sprite sheet image
    useEffect(() => {
        if (!sheetData.file) {
            setPreviewImage(null);
            return;
        }

        const img = new Image();
        const url = URL.createObjectURL(removeBackground && processedImageBlob ? processedImageBlob : sheetData.file);

        img.onload = () => {
            setPreviewImage(img);
            // Auto-calculate total frames based on sheet size
            const cols = Math.floor(img.width / sheetData.frameWidth);
            const rows = Math.floor(img.height / sheetData.frameHeight);
            setSheetData(prev => ({ ...prev, totalFrames: cols * rows }));
        };

        img.src = url;
        return () => URL.revokeObjectURL(url);
    }, [sheetData.file, sheetData.frameWidth, sheetData.frameHeight, removeBackground, processedImageBlob]);

    // Analyze sprite sheet for frame detection
    useEffect(() => {
        if (!previewImage) return;

        const analyze = async () => {
            const analysis = await analyzeSpriteSheet(previewImage, {
                expectedFrameWidth: sheetData.frameWidth,
                expectedFrameHeight: sheetData.frameHeight,
                expectedFrameCount: sheetData.totalFrames,
                detectionMode,
                manualOffsetX: manualOffset.x,
                manualOffsetY: manualOffset.y,
            });
            setDetectedFrames(analysis.frames);
        };

        analyze();
    }, [previewImage, sheetData.frameWidth, sheetData.frameHeight, sheetData.totalFrames, detectionMode, manualOffset]);

    // Draw preview canvas with frame overlays
    useEffect(() => {
        if (!previewCanvasRef.current || !previewImage) return;

        const canvas = previewCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = previewImage.width;
        canvas.height = previewImage.height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(previewImage, 0, 0);

        // Draw frame overlays
        if (detectionMode !== 'manual' || !isDrawing) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            detectedFrames.forEach(frame => {
                ctx.strokeRect(frame.x, frame.y, frame.width, frame.height);
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
    }, [previewImage, detectedFrames, detectionMode, isDrawing, drawStart, drawEnd]);

    // Animation preview
    useEffect(() => {
        if (!isAnimating || detectedFrames.length === 0) return;

        const interval = setInterval(() => {
            setCurrentFrame(prev => (prev + 1) % detectedFrames.length);
        }, 100);

        return () => clearInterval(interval);
    }, [isAnimating, detectedFrames.length]);

    // Draw animation preview
    useEffect(() => {
        if (!animationCanvasRef.current || !previewImage || detectedFrames.length === 0) return;

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
        setSheetData(prev => ({
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

    // Step 1: Upload sprite sheet
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSheetData(prev => ({ ...prev, file }));
    };

    const handleContinueToAnimations = async () => {
        if (!sheetData.file || !sheetData.name) {
            toast.error('Please provide a name and upload a sprite sheet');
            return;
        }

        // Upload the blob
        const arrayBuffer = await (removeBackground && processedImageBlob ? processedImageBlob : sheetData.file).arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const blob_id = `sprite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            await uploadBlob.mutateAsync({ blob_id, data: Array.from(uint8Array) });
            setSheetData(prev => ({ ...prev, blob_id, id: blob_id }));
            setStep('define-animations');
            toast.success('Sprite sheet uploaded!');
        } catch (error) {
            toast.error('Failed to upload sprite sheet');
            console.error(error);
        }
    };

    // Step 2: Define animations
    const handleAddAnimation = () => {
        setEditingAnimation({
            name: '',
            action_type: 'idle',
            direction: undefined,
            frame_start: 0,
            frame_count: detectedFrames.length,
            frame_rate: 10,
        });
    };

    const handleSaveAnimation = () => {
        if (!editingAnimation || !editingAnimation.name) {
            toast.error('Please provide an animation name');
            return;
        }

        setAnimations(prev => [...prev, editingAnimation]);
        setEditingAnimation(null);
        toast.success(`Animation "${editingAnimation.name}" added!`);
    };

    const handleDeleteAnimation = (index: number) => {
        setAnimations(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveSheet = async () => {
        if (animations.length === 0) {
            toast.error('Please define at least one animation');
            return;
        }

        try {
            await createSpriteSheet.mutateAsync({
                id: sheetData.id,
                name: sheetData.name,
                blob_id: sheetData.blob_id,
                frame_width: sheetData.frameWidth,
                frame_height: sheetData.frameHeight,
                total_frames: sheetData.totalFrames,
                animations,
                created_at: BigInt(Date.now()),
                updated_at: BigInt(Date.now()),
            });

            toast.success('Sprite sheet saved successfully!');
            setStep('complete');
        } catch (error) {
            toast.error('Failed to save sprite sheet');
            console.error(error);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Sprite Sheet Editor</h1>
                <div className="text-sm text-muted-foreground">
                    Step {step === 'upload' ? '1' : step === 'define-animations' ? '2' : '3'} of 3
                </div>
            </div>

            {step === 'upload' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Upload Sprite Sheet</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="sheet-name">Sheet Name</Label>
                            <Input
                                id="sheet-name"
                                value={sheetData.name}
                                onChange={(e) => setSheetData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g., Hero Character"
                            />
                        </div>

                        <div>
                            <Label>Sprite Sheet Image</Label>
                            <div className="flex gap-2">
                                <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                                    <Upload className="w-4 h-4 mr-2" />
                                    Choose File
                                </Button>
                                {sheetData.file && <span className="text-sm text-muted-foreground self-center">{sheetData.file.name}</span>}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </div>

                        {sheetData.file && (
                            <>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="remove-bg"
                                        checked={removeBackground}
                                        onChange={(e) => setRemoveBackground(e.target.checked)}
                                    />
                                    <Label htmlFor="remove-bg">Remove Background</Label>
                                </div>

                                {removeBackground && (
                                    // Background removal with auto-detection
                                    <BackgroundRemover
                                        imageFile={sheetData.file}
                                        onProcessed={setProcessedImageBlob}
                                        onCancel={() => setRemoveBackground(false)}
                                    />
                                )}

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label htmlFor="frame-width">Frame Width</Label>
                                        <Input
                                            id="frame-width"
                                            type="number"
                                            value={sheetData.frameWidth}
                                            onChange={(e) => setSheetData(prev => ({ ...prev, frameWidth: parseInt(e.target.value) || 32 }))}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="frame-height">Frame Height</Label>
                                        <Input
                                            id="frame-height"
                                            type="number"
                                            value={sheetData.frameHeight}
                                            onChange={(e) => setSheetData(prev => ({ ...prev, frameHeight: parseInt(e.target.value) || 32 }))}
                                        />
                                    </div>
                                    <div>
                                        <Label>Total Frames</Label>
                                        <Input value={sheetData.totalFrames} disabled />
                                    </div>
                                </div>

                                {previewImage && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label>Preview</Label>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.max(0.5, z - 0.5))}>
                                                    <ZoomOut className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => setZoom(z => Math.min(4, z + 0.5))}>
                                                    <ZoomIn className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="border rounded-lg overflow-auto max-h-96">
                                            <canvas
                                                ref={previewCanvasRef}
                                                style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', cursor: detectionMode === 'manual' ? 'crosshair' : 'default' }}
                                                onMouseDown={handleCanvasMouseDown}
                                                onMouseMove={handleCanvasMouseMove}
                                                onMouseUp={handleCanvasMouseUp}
                                                onMouseLeave={handleCanvasMouseLeave}
                                            />
                                        </div>
                                    </div>
                                )}

                                <Button onClick={handleContinueToAnimations} className="w-full">
                                    Continue to Define Animations
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {step === 'define-animations' && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Define Animations</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-muted-foreground">
                                    Define multiple animations from this sprite sheet
                                </p>
                                <Button onClick={handleAddAnimation}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Animation
                                </Button>
                            </div>

                            {animations.length > 0 && (
                                <div className="border rounded-lg">
                                    <table className="w-full">
                                        <thead className="bg-muted">
                                            <tr>
                                                <th className="p-2 text-left">Name</th>
                                                <th className="p-2 text-left">Action</th>
                                                <th className="p-2 text-left">Direction</th>
                                                <th className="p-2 text-left">Frames</th>
                                                <th className="p-2 text-left">FPS</th>
                                                <th className="p-2 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {animations.map((anim, index) => (
                                                <tr key={index} className="border-t">
                                                    <td className="p-2">{anim.name}</td>
                                                    <td className="p-2">{anim.action_type}</td>
                                                    <td className="p-2">{anim.direction || '-'}</td>
                                                    <td className="p-2">{anim.frame_start} - {anim.frame_start + anim.frame_count - 1}</td>
                                                    <td className="p-2">{anim.frame_rate || 10}</td>
                                                    <td className="p-2 text-right">
                                                        <Button size="sm" variant="ghost" onClick={() => handleDeleteAnimation(index)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {editingAnimation && (
                                <Card className="border-2 border-primary">
                                    <CardHeader>
                                        <CardTitle className="text-lg">New Animation</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label>Animation Name</Label>
                                                <Input
                                                    value={editingAnimation.name}
                                                    onChange={(e) => setEditingAnimation(prev => prev ? { ...prev, name: e.target.value } : null)}
                                                    placeholder="e.g., walk_down"
                                                />
                                            </div>
                                            <div>
                                                <Label>Action Type</Label>
                                                <select
                                                    className="w-full p-2 border rounded"
                                                    value={editingAnimation.action_type}
                                                    onChange={(e) => setEditingAnimation(prev => prev ? { ...prev, action_type: e.target.value } : null)}
                                                >
                                                    {PREDEFINED_ACTIONS.map(action => (
                                                        <option key={action} value={action}>{action}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <Label>Direction (Optional)</Label>
                                                <select
                                                    className="w-full p-2 border rounded"
                                                    value={editingAnimation.direction || ''}
                                                    onChange={(e) => setEditingAnimation(prev => prev ? { ...prev, direction: e.target.value as Direction || undefined } : null)}
                                                >
                                                    <option value="">None</option>
                                                    <option value="up">Up</option>
                                                    <option value="down">Down</option>
                                                    <option value="left">Left</option>
                                                    <option value="right">Right</option>
                                                </select>
                                            </div>
                                            <div>
                                                <Label>Frame Rate (FPS)</Label>
                                                <Input
                                                    type="number"
                                                    value={editingAnimation.frame_rate || 10}
                                                    onChange={(e) => setEditingAnimation(prev => prev ? { ...prev, frame_rate: parseInt(e.target.value) || 10 } : null)}
                                                />
                                            </div>
                                            <div>
                                                <Label>Start Frame</Label>
                                                <Input
                                                    type="number"
                                                    value={editingAnimation.frame_start}
                                                    onChange={(e) => setEditingAnimation(prev => prev ? { ...prev, frame_start: parseInt(e.target.value) || 0 } : null)}
                                                />
                                            </div>
                                            <div>
                                                <Label>Frame Count</Label>
                                                <Input
                                                    type="number"
                                                    value={editingAnimation.frame_count}
                                                    onChange={(e) => setEditingAnimation(prev => prev ? { ...prev, frame_count: parseInt(e.target.value) || 1 } : null)}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button onClick={handleSaveAnimation}>
                                                <Save className="w-4 h-4 mr-2" />
                                                Save Animation
                                            </Button>
                                            <Button variant="outline" onClick={() => setEditingAnimation(null)}>
                                                Cancel
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <Button onClick={handleSaveSheet} className="w-full" disabled={animations.length === 0}>
                                Save Sprite Sheet
                            </Button>
                        </CardContent>
                    </Card>

                    {previewImage && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Animation Preview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-center p-4 border rounded-lg bg-muted">
                                    <canvas ref={animationCanvasRef} className="pixelated" style={{ imageRendering: 'pixelated' }} />
                                </div>
                                <div className="flex items-center justify-center gap-2 mt-4">
                                    <Button size="sm" onClick={() => setIsAnimating(!isAnimating)}>
                                        {isAnimating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        Frame {currentFrame + 1} / {detectedFrames.length}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {step === 'complete' && (
                <Card>
                    <CardContent className="p-8 text-center space-y-4">
                        <div className="text-6xl">✅</div>
                        <h2 className="text-2xl font-bold">Sprite Sheet Saved!</h2>
                        <p className="text-muted-foreground">
                            Your sprite sheet "{sheetData.name}" with {animations.length} animation(s) has been saved successfully.
                        </p>
                        <Button onClick={() => {
                            setStep('upload');
                            setSheetData({ id: '', name: '', file: null, blob_id: '', frameWidth: 32, frameHeight: 32, totalFrames: 0 });
                            setAnimations([]);
                        }}>
                            Create Another Sprite Sheet
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
