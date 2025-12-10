import { useState } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useUploadCharacterSpriteSheet, useGetCharacterSpriteSheet } from '../hooks/useQueries';
import { BackgroundRemover } from '../components/BackgroundRemover';
import { SpriteSelector } from '../components/SpriteSelector';
import type { DetectionMode } from '../utils/spriteSheetAnalyzer';

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
    const [savedSprites, setSavedSprites] = useState<string[]>([]);

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
            setSavedSprites([...savedSprites, blobId]);

            // Reset form
            setSpriteState({
                ...spriteState,
                file: null,
                name: ''
            });
            setProcessedImageBlob(null);
            setRemoveBackground(false);
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to upload sprite');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Sprite Editor</h1>
                <p className="text-muted-foreground mt-1">
                    Upload and configure sprite sheets for use in your game
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upload Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Create New Sprite</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSpriteUpload} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Sprite Name *</Label>
                                <Input
                                    placeholder="e.g., knight, wizard, goblin"
                                    value={spriteState.name}
                                    onChange={(e) => setSpriteState({ ...spriteState, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Animation State</Label>
                                    <select
                                        className="w-full p-2 border rounded-md bg-background"
                                        value={spriteState.state}
                                        onChange={(e) => setSpriteState({ ...spriteState, state: e.target.value as any })}
                                    >
                                        <option value="idle">Idle</option>
                                        <option value="walk">Walk</option>
                                        <option value="run">Run</option>
                                        <option value="attack">Attack</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Direction</Label>
                                    <select
                                        className="w-full p-2 border rounded-md bg-background"
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
                                <Label>Detection Mode</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={detectionMode === 'alpha' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setDetectionMode('alpha')}
                                    >
                                        Alpha
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={detectionMode === 'blackBorder' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setDetectionMode('blackBorder')}
                                    >
                                        Black Border
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={detectionMode === 'manual' ? 'default' : 'outline'}
                                        size="sm"
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
                                                value={manualOffset.x}
                                                onChange={(e) => setManualOffset({ ...manualOffset, x: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Y Offset</Label>
                                            <Input
                                                type="number"
                                                value={manualOffset.y}
                                                onChange={(e) => setManualOffset({ ...manualOffset, y: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => setShowSpriteSelector(!showSpriteSelector)}
                                        disabled={!spriteState.file}
                                    >
                                        {showSpriteSelector ? 'Hide Selector' : 'Select on Image'}
                                    </Button>
                                </div>
                            )}

                            {showSpriteSelector && detectionMode === 'manual' && spriteState.file && (
                                <SpriteSelector
                                    blob_id={URL.createObjectURL(spriteState.file)}
                                    onSelect={(x, y, width, height) => {
                                        setManualOffset({ x, y });
                                        setSpriteState({ ...spriteState, frameWidth: width, frameHeight: height });
                                    }}
                                />
                            )}

                            <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-xs">Frames</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={spriteState.frameCount}
                                        onChange={(e) => setSpriteState({ ...spriteState, frameCount: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Width (px)</Label>
                                    <Input
                                        type="number"
                                        value={spriteState.frameWidth}
                                        onChange={(e) => setSpriteState({ ...spriteState, frameWidth: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Height (px)</Label>
                                    <Input
                                        type="number"
                                        value={spriteState.frameHeight}
                                        onChange={(e) => setSpriteState({ ...spriteState, frameHeight: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Sprite Sheet Image (PNG)</Label>
                                <Input
                                    type="file"
                                    accept="image/png"
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
                                <Label htmlFor="removeBackground" className="text-sm cursor-pointer">
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
                                className="w-full"
                                disabled={!spriteState.file || !spriteState.name || (removeBackground && !processedImageBlob && !showBackgroundRemover)}
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                Save Sprite
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Saved Sprites List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Saved Sprites</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {savedSprites.length === 0 ? (
                            <p className="text-muted-foreground text-sm text-center py-8">
                                No sprites saved yet. Upload your first sprite to get started!
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {savedSprites.map((spriteId) => (
                                    <div key={spriteId} className="flex items-center justify-between p-3 border rounded-md">
                                        <span className="text-sm font-medium">{spriteId}</span>
                                        <Button variant="ghost" size="sm">
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
