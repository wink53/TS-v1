import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { TagInput } from '../TagInput';
import { type SpriteState, type DetectionMode } from './types';

interface SpriteConfigFormProps {
    spriteState: SpriteState;
    setSpriteState: (state: SpriteState) => void;
    detectionMode: DetectionMode;
    setDetectionMode: (mode: DetectionMode) => void;
    spriteId?: string;
    isSubmitting: boolean;
}

export function SpriteConfigForm({
    spriteState,
    setSpriteState,
    detectionMode,
    setDetectionMode,
    spriteId,
    isSubmitting,
}: SpriteConfigFormProps) {
    // Ensure tags is always an array
    const safeTags = Array.isArray(spriteState.tags) ? spriteState.tags : [];

    return (
        <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
                <Label className="text-xs">Sprite Name *</Label>
                <Input
                    placeholder="e.g., knight, wizard"
                    value={spriteState.name}
                    onChange={(e) => setSpriteState({ ...spriteState, name: e.target.value })}
                    required
                />
            </div>

            {/* Description */}
            <div className="space-y-2">
                <Label className="text-xs">Description</Label>
                <textarea
                    className="w-full p-2 text-xs border rounded-md bg-background min-h-[60px] resize-none"
                    placeholder="Optional description of the sprite..."
                    value={spriteState.description}
                    onChange={(e) => setSpriteState({ ...spriteState, description: e.target.value })}
                />
            </div>

            {/* Tags */}
            <TagInput
                tags={safeTags}
                onTagsChange={(tags) => setSpriteState({ ...spriteState, tags: tags || [] })}
                suggestions={['typing', 'run', 'walk', 'shoot', 'jump', 'duck', 'roll', 'left', 'right', 'up', 'down', 'crawl']}
                label="Tags"
                placeholder="Type to add tags..."
            />

            {/* Detection Mode */}
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
                        variant={detectionMode === 'grid' ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs flex-1"
                        onClick={() => setDetectionMode('grid')}
                    >
                        Grid
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

            {/* Frame Dimensions */}
            <div className="space-y-2">
                <Label className="text-xs">Frame Dimensions</Label>
                <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs">Count</Label>
                        <Input
                            type="number"
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
            </div>

            {/* Collision Hitbox */}
            <div className="space-y-2 border-t pt-3 mt-3">
                <Label className="text-xs font-medium">Collision Hitbox</Label>
                <p className="text-xs text-muted-foreground">
                    Define the collision area relative to the sprite.
                </p>
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs">Offset X</Label>
                        <Input
                            type="number"
                            min="0"
                            className="text-xs h-8"
                            value={spriteState.hitboxOffsetX}
                            onChange={(e) => setSpriteState({ ...spriteState, hitboxOffsetX: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Offset Y</Label>
                        <Input
                            type="number"
                            min="0"
                            className="text-xs h-8"
                            value={spriteState.hitboxOffsetY}
                            onChange={(e) => setSpriteState({ ...spriteState, hitboxOffsetY: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Width</Label>
                        <Input
                            type="number"
                            min="1"
                            className="text-xs h-8"
                            value={spriteState.hitboxWidth}
                            onChange={(e) => setSpriteState({ ...spriteState, hitboxWidth: parseInt(e.target.value) || 16 })}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Height</Label>
                        <Input
                            type="number"
                            min="1"
                            className="text-xs h-8"
                            value={spriteState.hitboxHeight}
                            onChange={(e) => setSpriteState({ ...spriteState, hitboxHeight: parseInt(e.target.value) || 24 })}
                        />
                    </div>
                </div>
            </div>

            {/* File Upload - only for new sprites */}
            {!spriteId && (
                <div className="space-y-2">
                    <Label className="text-xs">Sprite Sheet (PNG)</Label>
                    <Input
                        type="file"
                        accept="image/png"
                        className="text-xs"
                        onChange={(e) => setSpriteState({ ...spriteState, file: e.target.files?.[0] || null })}
                    />
                </div>
            )}

            {/* Submit Button */}
            <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || (!spriteId && !spriteState.file && !spriteState.name)}
            >
                {isSubmitting ? 'Saving...' : (spriteId ? 'Update Sprite' : 'Save Sprite')}
            </Button>
        </div>
    );
}
