import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
    type Animation,
    type SpriteState,
    ACTION_TYPES,
    DIRECTIONS,
    DEFAULT_ANIMATION,
    type Direction
} from './types';

interface AnimationEditorProps {
    animations: Animation[];
    setAnimations: (animations: Animation[]) => void;
    spriteState: SpriteState;
    manualOffset: { x: number; y: number };
    onSelectAnimation: (index: number) => void;
    selectedAnimationIndex: number | null;
}

export function AnimationEditor({
    animations,
    setAnimations,
    spriteState,
    manualOffset,
    onSelectAnimation,
    selectedAnimationIndex,
}: AnimationEditorProps) {
    const [showAnimationForm, setShowAnimationForm] = useState(false);
    const [editingAnimationIndex, setEditingAnimationIndex] = useState<number | null>(null);
    const [newAnimation, setNewAnimation] = useState<Animation>({
        ...DEFAULT_ANIMATION,
        start_x: manualOffset.x,
        start_y: manualOffset.y,
        frame_count: spriteState.frameCount || 1,
    });

    const handleAddAnimation = () => {
        if (!newAnimation.name.trim()) {
            return;
        }

        if (editingAnimationIndex !== null) {
            // Update existing animation
            const updatedAnimations = [...animations];
            updatedAnimations[editingAnimationIndex] = newAnimation;
            setAnimations(updatedAnimations);
        } else {
            // Add new animation
            setAnimations([...animations, newAnimation]);
        }

        // Reset form
        setNewAnimation({
            ...DEFAULT_ANIMATION,
            start_x: manualOffset.x,
            start_y: manualOffset.y,
            frame_count: spriteState.frameCount || 1,
        });
        setEditingAnimationIndex(null);
        setShowAnimationForm(false);
    };

    const handleEditAnimation = (index: number) => {
        setNewAnimation(animations[index]);
        setEditingAnimationIndex(index);
        setShowAnimationForm(true);
    };

    const handleDeleteAnimation = (index: number) => {
        const updatedAnimations = animations.filter((_, i) => i !== index);
        setAnimations(updatedAnimations);
    };

    return (
        <div className="space-y-2 border-t pt-3 mt-3">
            <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Animations ({animations.length})</Label>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    disabled={!spriteState.frameCount || spriteState.frameCount < 1}
                    onClick={() => {
                        setNewAnimation({
                            ...DEFAULT_ANIMATION,
                            start_x: manualOffset.x,
                            start_y: manualOffset.y,
                            frame_count: spriteState.frameCount || 1,
                        });
                        setEditingAnimationIndex(null);
                        setShowAnimationForm(!showAnimationForm);
                    }}
                >
                    <Plus className="h-3 w-3 mr-1" />
                    Add ({spriteState.frameCount} frames)
                </Button>
            </div>

            {/* Animation Form */}
            {showAnimationForm && (
                <div className="space-y-2 border rounded p-2 bg-muted/30">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-xs">Name *</Label>
                            <Input
                                value={newAnimation.name}
                                onChange={(e) => setNewAnimation(prev => ({
                                    ...prev,
                                    name: e.target.value
                                }))}
                                placeholder="walk_down"
                                className="text-xs h-7"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Action</Label>
                            <select
                                value={newAnimation.action_type}
                                onChange={(e) => setNewAnimation(prev => ({
                                    ...prev,
                                    action_type: e.target.value
                                }))}
                                className="w-full text-xs h-7 rounded border bg-background px-2"
                            >
                                {ACTION_TYPES.map(action => (
                                    <option key={action} value={action}>{action}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <Label className="text-xs">Direction</Label>
                        <select
                            value={newAnimation.direction || ''}
                            onChange={(e) => setNewAnimation(prev => ({
                                ...prev,
                                direction: e.target.value ? e.target.value as Direction : null
                            }))}
                            className="w-full text-xs h-7 rounded border bg-background px-2"
                        >
                            <option value="">No direction</option>
                            {DIRECTIONS.filter(d => d !== null).map(dir => (
                                <option key={dir} value={dir!}>{dir}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-xs">Start X (px)</Label>
                            <Input
                                type="number"
                                min={0}
                                value={newAnimation.start_x}
                                onChange={(e) => setNewAnimation(prev => ({
                                    ...prev,
                                    start_x: Math.max(0, parseInt(e.target.value) || 0)
                                }))}
                                className="text-xs h-7"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Start Y (px)</Label>
                            <Input
                                type="number"
                                min={0}
                                value={newAnimation.start_y}
                                onChange={(e) => setNewAnimation(prev => ({
                                    ...prev,
                                    start_y: Math.max(0, parseInt(e.target.value) || 0)
                                }))}
                                className="text-xs h-7"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-xs">Start Frame</Label>
                            <Input
                                type="number"
                                min={0}
                                max={spriteState.frameCount - 1}
                                value={newAnimation.frame_start}
                                onChange={(e) => setNewAnimation(prev => ({
                                    ...prev,
                                    frame_start: Math.max(0, parseInt(e.target.value) || 0)
                                }))}
                                className="text-xs h-7"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Frame Count</Label>
                            <Input
                                type="number"
                                min={1}
                                max={spriteState.frameCount}
                                value={newAnimation.frame_count}
                                onChange={(e) => setNewAnimation(prev => ({
                                    ...prev,
                                    frame_count: Math.max(1, parseInt(e.target.value) || 1)
                                }))}
                                className="text-xs h-7"
                            />
                        </div>
                    </div>

                    <div>
                        <Label className="text-xs">Frame Rate (fps)</Label>
                        <Input
                            type="number"
                            min={1}
                            max={60}
                            value={newAnimation.frame_rate || ''}
                            onChange={(e) => setNewAnimation(prev => ({
                                ...prev,
                                frame_rate: e.target.value ? parseInt(e.target.value) : null
                            }))}
                            placeholder="Auto"
                            className="text-xs h-7"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            size="sm"
                            className="flex-1 text-xs h-7"
                            onClick={handleAddAnimation}
                            disabled={!newAnimation.name.trim()}
                        >
                            {editingAnimationIndex !== null ? 'Update' : 'Add'} Animation
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => {
                                setShowAnimationForm(false);
                                setEditingAnimationIndex(null);
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {/* Animation List */}
            {animations.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                    {animations.map((anim, index) => (
                        <div
                            key={index}
                            className={`flex items-center justify-between p-1.5 rounded text-xs cursor-pointer transition-colors ${selectedAnimationIndex === index
                                    ? 'bg-primary/20 border border-primary/50'
                                    : 'bg-muted/50 hover:bg-muted'
                                }`}
                            onClick={() => onSelectAnimation(index)}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{anim.name}</div>
                                <div className="text-muted-foreground truncate">
                                    {anim.action_type}{anim.direction ? ` (${anim.direction})` : ''} -
                                    {anim.frame_count} frames @ ({anim.start_x}, {anim.start_y})
                                </div>
                            </div>
                            <div className="flex gap-1 ml-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditAnimation(index);
                                    }}
                                >
                                    ✏️
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 text-destructive"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteAnimation(index);
                                    }}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
