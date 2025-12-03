import { useState } from 'react';
import { useListPlayableCharacters, useCreatePlayableCharacter, useUpdatePlayableCharacter, useDeletePlayableCharacter, useUploadCharacterSpriteSheet } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, User, Pencil, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PlayableCharacter, CharacterStats, AnimationState, Direction } from '../backend';

export function CharactersView() {
    const { data: characters, isLoading } = useListPlayableCharacters();
    const createCharacter = useCreatePlayableCharacter();
    const updateCharacter = useUpdatePlayableCharacter();
    const deleteCharacter = useDeletePlayableCharacter();
    const uploadSpriteSheet = useUploadCharacterSpriteSheet();

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedCharacter, setSelectedCharacter] = useState<PlayableCharacter | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        description: '',
        tags: '',
        stats: {
            health: 100,
            speed: 5,
            strength: 10,
            mana: 50,
            overshield: 0,
        },
        statsEnabled: {
            health: true,
            speed: true,
            strength: true,
            mana: true,
            overshield: false,
        }
    });

    // Sprite Upload State
    const [spriteUploadState, setSpriteUploadState] = useState<{
        state: 'idle' | 'walk' | 'run' | 'attack';
        direction: 'up' | 'down' | 'left' | 'right';
        file: File | null;
        frameCount: number;
        frameWidth: number;
        frameHeight: number;
    }>({
        state: 'idle',
        direction: 'down',
        file: null,
        frameCount: 1,
        frameWidth: 32,
        frameHeight: 32,
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        const stats: CharacterStats = {
            health: formData.statsEnabled.health ? [BigInt(formData.stats.health)] : [],
            speed: formData.statsEnabled.speed ? [BigInt(formData.stats.speed)] : [],
            strength: formData.statsEnabled.strength ? [BigInt(formData.stats.strength)] : [],
            mana: formData.statsEnabled.mana ? [BigInt(formData.stats.mana)] : [],
            overshield: formData.statsEnabled.overshield ? [BigInt(formData.stats.overshield)] : [],
        };

        const character: PlayableCharacter = {
            id: formData.id,
            name: formData.name,
            description: formData.description,
            tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
            stats,
            sprite_sheets: [],
            created_at: BigInt(Date.now()),
            updated_at: BigInt(Date.now()),
        };

        try {
            const result = await createCharacter.mutateAsync(character);

            if ("ok" in result) {
                toast.success('Character created successfully');
                setIsCreateDialogOpen(false);
                resetForm();
            } else {
                toast.error(`Error: ${result.err.message}`);
            }
        } catch (error) {
            console.error('Failed to create character:', error);
            toast.error('Failed to create character');
        }
    };

    const handleEdit = (char: PlayableCharacter) => {
        setSelectedCharacter(char);
        setFormData({
            id: char.id,
            name: char.name,
            description: char.description,
            tags: char.tags.join(', '),
            stats: {
                health: Number(char.stats.health[0] ?? 0),
                speed: Number(char.stats.speed[0] ?? 0),
                strength: Number(char.stats.strength[0] ?? 0),
                mana: Number(char.stats.mana[0] ?? 0),
                overshield: Number(char.stats.overshield[0] ?? 0),
            },
            statsEnabled: {
                health: char.stats.health.length > 0,
                speed: char.stats.speed.length > 0,
                strength: char.stats.strength.length > 0,
                mana: char.stats.mana.length > 0,
                overshield: char.stats.overshield.length > 0,
            }
        });
        setIsEditDialogOpen(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCharacter) return;

        const stats: CharacterStats = {
            health: formData.stats.health ? [BigInt(formData.stats.health)] : [],
            speed: formData.stats.speed ? [BigInt(formData.stats.speed)] : [],
            strength: formData.stats.strength ? [BigInt(formData.stats.strength)] : [],
            mana: formData.stats.mana ? [BigInt(formData.stats.mana)] : [],
            overshield: formData.stats.overshield ? [BigInt(formData.stats.overshield)] : [],
        };

        const updatedChar: PlayableCharacter = {
            ...selectedCharacter,
            name: formData.name,
            description: formData.description,
            tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
            stats,
            updated_at: BigInt(Date.now()),
        };

        try {
            const result = await updateCharacter.mutateAsync({
                id: selectedCharacter.id,
                character: updatedChar
            });

            if ("ok" in result) {
                toast.success('Character updated successfully');
                setIsEditDialogOpen(false);
                setSelectedCharacter(null);
                resetForm();
            } else {
                toast.error(`Error: ${result.err.message}`);
            }
        } catch (error) {
            console.error('Failed to update character:', error);
            toast.error('Failed to update character');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this character?')) return;

        try {
            const result = await deleteCharacter.mutateAsync(id);
            if ("ok" in result) {
                toast.success('Character deleted successfully');
            } else {
                toast.error(`Error: ${result.err.message}`);
            }
        } catch (error) {
            console.error('Failed to delete character:', error);
            toast.error('Failed to delete character');
        }
    };

    const handleSpriteUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCharacter || !spriteUploadState.file) return;

        const blobId = `${selectedCharacter.id}_${spriteUploadState.state}_${spriteUploadState.direction}`;

        try {
            // 1. Upload the sprite sheet blob
            const buffer = await spriteUploadState.file.arrayBuffer();
            const uint8Array = new Uint8Array(buffer);
            await uploadSpriteSheet.mutateAsync({
                blob_id: blobId,
                data: uint8Array
            });

            // 2. Update the character with the new sprite sheet reference
            const stateVariant: AnimationState = { [spriteUploadState.state]: null } as any;
            const directionVariant: Direction = { [spriteUploadState.direction]: null } as any;

            const newSpriteSheet = {
                state: stateVariant,
                direction: directionVariant,
                blob_id: blobId,
                frame_count: BigInt(spriteUploadState.frameCount),
                frame_width: BigInt(spriteUploadState.frameWidth),
                frame_height: BigInt(spriteUploadState.frameHeight),
            };

            // Filter out existing sprite sheet for this state/direction if it exists
            const updatedSpriteSheets = selectedCharacter.sprite_sheets.filter((sheet: any) => {
                const sheetState = Object.keys(sheet.state)[0];
                const sheetDir = Object.keys(sheet.direction)[0];
                return !(sheetState === spriteUploadState.state && sheetDir === spriteUploadState.direction);
            });

            const updatedChar: PlayableCharacter = {
                ...selectedCharacter,
                sprite_sheets: [...updatedSpriteSheets, newSpriteSheet],
                updated_at: BigInt(Date.now()),
            };

            const result = await updateCharacter.mutateAsync({
                id: selectedCharacter.id,
                character: updatedChar
            });

            if ("ok" in result) {
                toast.success('Sprite sheet uploaded successfully');
                // Update local state to reflect changes immediately
                setSelectedCharacter(updatedChar);
            } else {
                toast.error(`Error: ${result.err.message}`);
            }
        } catch (error) {
            console.error('Failed to upload sprite sheet:', error);
            toast.error('Failed to upload sprite sheet');
        }
    };

    const resetForm = () => {
        setFormData({
            id: '',
            name: '',
            description: '',
            tags: '',
            stats: {
                health: 100,
                speed: 5,
                strength: 10,
                mana: 50,
                overshield: 0,
            },
            statsEnabled: {
                health: true,
                speed: true,
                strength: true,
                mana: true,
                overshield: false,
            }
        });
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[200px] w-full rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Playable Characters</h2>
                    <p className="text-muted-foreground">Manage playable characters, stats, and sprite sheets.</p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Character
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Create New Character</DialogTitle>
                            <DialogDescription>Define a new playable character and their base stats.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="id">ID (Unique)</Label>
                                    <Input
                                        id="id"
                                        value={formData.id}
                                        onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tags">Tags (comma separated)</Label>
                                <Input
                                    id="tags"
                                    value={formData.tags}
                                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                    placeholder="hero, warrior, magic"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Base Stats</Label>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <Label htmlFor="health" className="text-xs">Health</Label>
                                            <input
                                                type="checkbox"
                                                checked={formData.statsEnabled.health}
                                                onChange={(e) => setFormData({ ...formData, statsEnabled: { ...formData.statsEnabled, health: e.target.checked } })}
                                                className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"
                                            />
                                        </div>
                                        <Input
                                            id="health"
                                            type="number"
                                            value={formData.stats.health}
                                            onChange={(e) => setFormData({ ...formData, stats: { ...formData.stats, health: parseInt(e.target.value) } })}
                                            disabled={!formData.statsEnabled.health}
                                            className={!formData.statsEnabled.health ? 'opacity-50' : ''}
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <Label htmlFor="speed" className="text-xs">Speed</Label>
                                            <input
                                                type="checkbox"
                                                checked={formData.statsEnabled.speed}
                                                onChange={(e) => setFormData({ ...formData, statsEnabled: { ...formData.statsEnabled, speed: e.target.checked } })}
                                                className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"
                                            />
                                        </div>
                                        <Input
                                            id="speed"
                                            type="number"
                                            value={formData.stats.speed}
                                            onChange={(e) => setFormData({ ...formData, stats: { ...formData.stats, speed: parseInt(e.target.value) } })}
                                            disabled={!formData.statsEnabled.speed}
                                            className={!formData.statsEnabled.speed ? 'opacity-50' : ''}
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <Label htmlFor="strength" className="text-xs">Strength</Label>
                                            <input
                                                type="checkbox"
                                                checked={formData.statsEnabled.strength}
                                                onChange={(e) => setFormData({ ...formData, statsEnabled: { ...formData.statsEnabled, strength: e.target.checked } })}
                                                className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"
                                            />
                                        </div>
                                        <Input
                                            id="strength"
                                            type="number"
                                            value={formData.stats.strength}
                                            onChange={(e) => setFormData({ ...formData, stats: { ...formData.stats, strength: parseInt(e.target.value) } })}
                                            disabled={!formData.statsEnabled.strength}
                                            className={!formData.statsEnabled.strength ? 'opacity-50' : ''}
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <Label htmlFor="mana" className="text-xs">Mana</Label>
                                            <input
                                                type="checkbox"
                                                checked={formData.statsEnabled.mana}
                                                onChange={(e) => setFormData({ ...formData, statsEnabled: { ...formData.statsEnabled, mana: e.target.checked } })}
                                                className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"
                                            />
                                        </div>
                                        <Input
                                            id="mana"
                                            type="number"
                                            value={formData.stats.mana}
                                            onChange={(e) => setFormData({ ...formData, stats: { ...formData.stats, mana: parseInt(e.target.value) } })}
                                            disabled={!formData.statsEnabled.mana}
                                            className={!formData.statsEnabled.mana ? 'opacity-50' : ''}
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <Label htmlFor="overshield" className="text-xs">Overshield</Label>
                                            <input
                                                type="checkbox"
                                                checked={formData.statsEnabled.overshield}
                                                onChange={(e) => setFormData({ ...formData, statsEnabled: { ...formData.statsEnabled, overshield: e.target.checked } })}
                                                className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"
                                            />
                                        </div>
                                        <Input
                                            id="overshield"
                                            type="number"
                                            value={formData.stats.overshield}
                                            onChange={(e) => setFormData({ ...formData, stats: { ...formData.stats, overshield: parseInt(e.target.value) } })}
                                            disabled={!formData.statsEnabled.overshield}
                                            className={!formData.statsEnabled.overshield ? 'opacity-50' : ''}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                                <Button type="submit">Create Character</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {characters?.map((char: PlayableCharacter) => (
                    <Card key={char.id} className="overflow-hidden">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>{char.name}</CardTitle>
                                    <CardDescription className="font-mono text-xs mt-1">{char.id}</CardDescription>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(char)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(char.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{char.description}</p>

                            <div className="flex flex-wrap gap-1 mb-4">
                                {char.tags.map((tag: string) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                ))}
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-xs mb-4">
                                <div className="bg-muted p-2 rounded text-center">
                                    <div className="font-bold">{String(char.stats.health[0] ?? '-')}</div>
                                    <div className="text-[10px] text-muted-foreground">HP</div>
                                </div>
                                <div className="bg-muted p-2 rounded text-center">
                                    <div className="font-bold">{String(char.stats.speed[0] ?? '-')}</div>
                                    <div className="text-[10px] text-muted-foreground">SPD</div>
                                </div>
                                <div className="bg-muted p-2 rounded text-center">
                                    <div className="font-bold">{String(char.stats.strength[0] ?? '-')}</div>
                                    <div className="text-[10px] text-muted-foreground">STR</div>
                                </div>
                            </div>

                            <div className="text-xs text-muted-foreground">
                                {char.sprite_sheets.length} sprite sheets configured
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {characters?.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg text-muted-foreground">
                        <User className="h-12 w-12 mb-4 opacity-50" />
                        <p>No characters found. Create one to get started.</p>
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Character: {selectedCharacter?.name}</DialogTitle>
                    </DialogHeader>

                    <Tabs defaultValue="details">
                        <TabsList className="w-full">
                            <TabsTrigger value="details" className="flex-1">Details & Stats</TabsTrigger>
                            <TabsTrigger value="sprites" className="flex-1">Sprite Sheets</TabsTrigger>
                        </TabsList>

                        <TabsContent value="details" className="space-y-4 mt-4">
                            <form onSubmit={handleUpdate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-name">Name</Label>
                                    <Input
                                        id="edit-name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-description">Description</Label>
                                    <Textarea
                                        id="edit-description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-tags">Tags</Label>
                                    <Input
                                        id="edit-tags"
                                        value={formData.tags}
                                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Base Stats</Label>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <Label className="text-xs">Health</Label>
                                            <Input
                                                type="number"
                                                value={formData.stats.health}
                                                onChange={(e) => setFormData({ ...formData, stats: { ...formData.stats, health: parseInt(e.target.value) } })}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Speed</Label>
                                            <Input
                                                type="number"
                                                value={formData.stats.speed}
                                                onChange={(e) => setFormData({ ...formData, stats: { ...formData.stats, speed: parseInt(e.target.value) } })}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Strength</Label>
                                            <Input
                                                type="number"
                                                value={formData.stats.strength}
                                                onChange={(e) => setFormData({ ...formData, stats: { ...formData.stats, strength: parseInt(e.target.value) } })}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Mana</Label>
                                            <Input
                                                type="number"
                                                value={formData.stats.mana}
                                                onChange={(e) => setFormData({ ...formData, stats: { ...formData.stats, mana: parseInt(e.target.value) } })}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Overshield</Label>
                                            <Input
                                                type="number"
                                                value={formData.stats.overshield}
                                                onChange={(e) => setFormData({ ...formData, stats: { ...formData.stats, overshield: parseInt(e.target.value) } })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-4">
                                    <Button type="submit">Save Changes</Button>
                                </div>
                            </form>
                        </TabsContent>

                        <TabsContent value="sprites" className="space-y-6 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Upload Form */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Upload Sprite Sheet</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleSpriteUpload} className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Animation State</Label>
                                                    <select
                                                        className="w-full p-2 border rounded-md bg-background"
                                                        value={spriteUploadState.state}
                                                        onChange={(e) => setSpriteUploadState({ ...spriteUploadState, state: e.target.value as any })}
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
                                                        value={spriteUploadState.direction}
                                                        onChange={(e) => setSpriteUploadState({ ...spriteUploadState, direction: e.target.value as any })}
                                                    >
                                                        <option value="up">Up</option>
                                                        <option value="down">Down</option>
                                                        <option value="left">Left</option>
                                                        <option value="right">Right</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Frames</Label>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={spriteUploadState.frameCount}
                                                        onChange={(e) => setSpriteUploadState({ ...spriteUploadState, frameCount: parseInt(e.target.value) })}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Width (px)</Label>
                                                    <Input
                                                        type="number"
                                                        value={spriteUploadState.frameWidth}
                                                        onChange={(e) => setSpriteUploadState({ ...spriteUploadState, frameWidth: parseInt(e.target.value) })}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Height (px)</Label>
                                                    <Input
                                                        type="number"
                                                        value={spriteUploadState.frameHeight}
                                                        onChange={(e) => setSpriteUploadState({ ...spriteUploadState, frameHeight: parseInt(e.target.value) })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Sprite Sheet Image (PNG)</Label>
                                                <Input
                                                    type="file"
                                                    accept="image/png"
                                                    onChange={(e) => setSpriteUploadState({ ...spriteUploadState, file: e.target.files?.[0] || null })}
                                                />
                                            </div>

                                            <Button type="submit" className="w-full" disabled={!spriteUploadState.file}>
                                                <Upload className="mr-2 h-4 w-4" />
                                                Upload Sprite Sheet
                                            </Button>
                                        </form>
                                    </CardContent>
                                </Card>

                                {/* Existing Sheets List */}
                                <div className="space-y-4">
                                    <h3 className="font-medium">Configured Sprite Sheets</h3>
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                        {selectedCharacter?.sprite_sheets.map((sheet: any, idx: number) => {
                                            const state = Object.keys(sheet.state)[0];
                                            const direction = Object.keys(sheet.direction)[0];
                                            return (
                                                <div key={idx} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                                                    <div>
                                                        <div className="font-medium capitalize">{state} - {direction}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {String(sheet.frame_count)} frames • {String(sheet.frame_width)}x{String(sheet.frame_height)}px
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline" className="font-mono text-[10px]">
                                                        {sheet.blob_id.substring(0, 8)}...
                                                    </Badge>
                                                </div>
                                            );
                                        })}
                                        {selectedCharacter?.sprite_sheets.length === 0 && (
                                            <div className="text-sm text-muted-foreground text-center py-8">
                                                No sprite sheets uploaded yet.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </div>
    );
}
