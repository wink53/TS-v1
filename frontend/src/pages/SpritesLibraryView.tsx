import { useState, useEffect, useRef } from 'react';
import { useListSpriteSheets, useCreateSpriteSheet, useUploadCharacterSpriteSheet, useDeleteSpriteSheet, useGetCharacterSpriteSheet } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Search, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { TagInput } from '../components/TagInput';
import { analyzeSpriteSheet } from '../utils/spriteSheetAnalyzer';
import type { SpriteSheet } from '../declarations/backend/backend.did.d.ts';

// Thumbnail component that loads and displays sprite sheet image
function SpriteThumbnail({ blobId }: { blobId: string }) {
    const { data: blobData, isLoading } = useGetCharacterSpriteSheet(blobId);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!blobData) return;

        // Convert blob data to image URL
        const uint8Array = blobData instanceof Uint8Array ? blobData : new Uint8Array(blobData);
        const blob = new Blob([uint8Array.buffer as ArrayBuffer], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        setImageUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [blobData]);

    if (isLoading) {
        return (
            <div className="w-full h-32 bg-muted/50 rounded flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground text-xs">Loading...</div>
            </div>
        );
    }

    if (!imageUrl) {
        return (
            <div className="w-full h-32 bg-muted/50 rounded flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="w-full h-32 bg-checkerboard rounded overflow-hidden flex items-center justify-center">
            <img
                src={imageUrl}
                alt="Sprite thumbnail"
                className="max-w-full max-h-full object-contain"
                style={{ imageRendering: 'pixelated' }}
            />
        </div>
    );
}

export default function SpritesLibraryView({ onNavigate }: { onNavigate?: (spriteId: string) => void }) {
    const { data: spriteSheets = [], isLoading } = useListSpriteSheets();
    const uploadSpriteSheet = useUploadCharacterSpriteSheet();
    const createSpriteSheet = useCreateSpriteSheet();
    const deleteSpriteSheet = useDeleteSpriteSheet();

    const [searchQuery, setSearchQuery] = useState('');
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [spriteState, setSpriteState] = useState({
        name: '',
        description: '',
        tags: [] as string[],
        file: null as File | null,
        frameCount: 1,
        frameWidth: 32,
        frameHeight: 32,
    });
    const [detectionMode, setDetectionMode] = useState<'auto' | 'manual'>('auto');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [detectedFrames, setDetectedFrames] = useState<any[]>([]);

    const predefinedTags = ['typing', 'run', 'walk', 'shoot', 'jump', 'duck', 'roll', 'left', 'right', 'up', 'down', 'crawl'];

    // Filter sprites by search query
    const filteredSprites = spriteSheets.filter((sprite: SpriteSheet) => {
        const query = searchQuery.toLowerCase();
        return (
            sprite.name.toLowerCase().includes(query) ||
            sprite.description.toLowerCase().includes(query) ||
            sprite.tags.some(tag => tag.toLowerCase().includes(query))
        );
    });

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSpriteState({ ...spriteState, file });
        const url = URL.createObjectURL(file);
        setPreviewImage(url);

        if (detectionMode === 'auto') {
            try {
                const img = new Image();
                img.src = url;
                await new Promise((resolve) => { img.onload = resolve; });

                const analysis = await analyzeSpriteSheet(img, {
                    expectedFrameWidth: spriteState.frameWidth,
                    expectedFrameHeight: spriteState.frameHeight
                });
                setDetectedFrames(analysis.frames);
                setSpriteState(prev => ({ ...prev, frameCount: analysis.frames.length }));
                toast.success(`Detected ${analysis.frames.length} frames`);
            } catch (error) {
                console.error('Frame detection error:', error);
                toast.error('Failed to detect frames');
            }
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!spriteState.file || !spriteState.name) {
            toast.error('Please provide a name and select a file');
            return;
        }

        const spriteId = `sprite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const blobId = `${spriteId}_blob`;

        try {
            // Step 1: Upload image blob
            const buffer = await spriteState.file.arrayBuffer();
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
                frame_width: BigInt(spriteState.frameWidth),
                frame_height: BigInt(spriteState.frameHeight),
                total_frames: BigInt(spriteState.frameCount),
                animations: [],
                created_at: BigInt(Date.now() * 1000000),
                updated_at: BigInt(Date.now() * 1000000),
            };

            const result = await createSpriteSheet.mutateAsync(spriteSheetRecord);

            if ('err' in result) {
                throw new Error(result.err.message);
            }

            toast.success(`Sprite "${spriteState.name}" saved successfully!`);

            // Reset form and close dialog
            setSpriteState({
                name: '',
                description: '',
                tags: [],
                file: null,
                frameCount: 1,
                frameWidth: 32,
                frameHeight: 32,
            });
            setPreviewImage(null);
            setDetectedFrames([]);
            setUploadDialogOpen(false);
        } catch (error: any) {
            console.error('Save error:', error);
            toast.error('Failed to save sprite: ' + (error.message || 'Unknown error'));
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete sprite "${name}"? This cannot be undone.`)) return;

        try {
            await deleteSpriteSheet.mutateAsync(id);
            toast.success(`Deleted "${name}"`);
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete sprite');
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Sprite Library</h1>
                    <p className="text-muted-foreground">Manage your sprite sheets and animations</p>
                </div>
                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Upload Sprite Sheet
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Upload New Sprite Sheet</DialogTitle>
                            <DialogDescription>
                                Upload a sprite sheet image and configure frame detection
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleUpload} className="space-y-4">
                            {/* File Upload */}
                            <div className="space-y-2">
                                <Label>Sprite Sheet Image *</Label>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    required
                                />
                            </div>

                            {/* Preview */}
                            {previewImage && (
                                <div className="border rounded p-4">
                                    <Label className="text-xs mb-2 block">Preview</Label>
                                    <img src={previewImage} alt="Preview" className="max-w-full h-auto" />
                                </div>
                            )}

                            {/* Metadata */}
                            <div className="space-y-2">
                                <Label>Sprite Name *</Label>
                                <Input
                                    value={spriteState.name}
                                    onChange={(e) => setSpriteState({ ...spriteState, name: e.target.value })}
                                    placeholder="e.g., Knight Character"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={spriteState.description}
                                    onChange={(e) => setSpriteState({ ...spriteState, description: e.target.value })}
                                    placeholder="Optional description"
                                    rows={3}
                                />
                            </div>

                            <TagInput
                                tags={spriteState.tags}
                                onTagsChange={(tags) => setSpriteState({ ...spriteState, tags })}
                                suggestions={predefinedTags}
                                label="Tags"
                            />

                            {/* Frame Configuration */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Frame Width</Label>
                                    <Input
                                        type="number"
                                        value={spriteState.frameWidth}
                                        onChange={(e) => setSpriteState({ ...spriteState, frameWidth: parseInt(e.target.value) })}
                                        min="1"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Frame Height</Label>
                                    <Input
                                        type="number"
                                        value={spriteState.frameHeight}
                                        onChange={(e) => setSpriteState({ ...spriteState, frameHeight: parseInt(e.target.value) })}
                                        min="1"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Frame Count</Label>
                                    <Input
                                        type="number"
                                        value={spriteState.frameCount}
                                        onChange={(e) => setSpriteState({ ...spriteState, frameCount: parseInt(e.target.value) })}
                                        min="1"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    Upload & Save
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search sprites by name, description, or tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-md"
                />
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="text-center py-12">Loading sprites...</div>
            ) : filteredSprites.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <ImageIcon className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                            {searchQuery ? 'No sprites match your search' : 'No sprites yet. Upload your first sprite sheet!'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredSprites.map((sprite: SpriteSheet) => (
                        <Card key={sprite.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                            {/* Sprite Thumbnail */}
                            <div className="p-2">
                                <SpriteThumbnail blobId={sprite.blob_id} />
                            </div>
                            <CardHeader className="pb-2 pt-0">
                                <CardTitle className="text-lg">{sprite.name}</CardTitle>
                                {sprite.description && (
                                    <CardDescription className="line-clamp-2">{sprite.description}</CardDescription>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-3 pt-0">
                                <div className="text-sm text-muted-foreground">
                                    <div className="flex gap-4">
                                        <span>Frames: {Number(sprite.total_frames)}</span>
                                        <span>{Number(sprite.frame_width)}×{Number(sprite.frame_height)}px</span>
                                    </div>
                                    <div>Animations: {sprite.animations.length}</div>
                                </div>
                                {sprite.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {sprite.tags.map(tag => (
                                            <span key={tag} className="text-xs bg-secondary px-2 py-1 rounded">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => onNavigate?.(sprite.id)}
                                    >
                                        <Edit className="w-3 h-3 mr-1" />
                                        Edit Animations
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleDelete(sprite.id, sprite.name)}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <style>{`
                .bg-checkerboard {
                    background-image: 
                        linear-gradient(45deg, #ccc 25%, transparent 25%),
                        linear-gradient(-45deg, #ccc 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #ccc 75%),
                        linear-gradient(-45deg, transparent 75%, #ccc 75%);
                    background-size: 16px 16px;
                    background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
                }
            `}</style>
        </div>
    );
}
