import { useState } from 'react';
import { useListTileSets, useCreateTileSet, useUpdateTileSet, useDeleteTileSet } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Layers, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { TileSet } from '../backend';

export function TileSetsView() {
  const { data: tileSets, isLoading } = useListTileSets();
  const createTileSet = useCreateTileSet();
  const updateTileSet = useUpdateTileSet();
  const deleteTileSet = useDeleteTileSet();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTileSet, setSelectedTileSet] = useState<TileSet | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    tile_ids: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const tileSet: TileSet = {
      id: formData.id,
      name: formData.name,
      description: formData.description,
      tile_ids: formData.tile_ids.split(',').map(t => t.trim()).filter(Boolean),
      created_at: BigInt(Date.now()),
      updated_at: BigInt(Date.now()),
    };

    try {
      const result = await createTileSet.mutateAsync(tileSet);

      if ("ok" in result) {
        toast.success('Tile Set created successfully');
        setIsCreateDialogOpen(false);
        setFormData({ id: '', name: '', description: '', tile_ids: '' });
      } else {
        toast.error(`Error: ${result.err.message}`, {
          description: `Code: ${result.err.code}`,
        });
      }
    } catch (error) {
      console.error('Failed to create tile set:', error);
      toast.error('Failed to create tile set', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const handleEdit = (tileSet: TileSet) => {
    setSelectedTileSet(tileSet);
    setFormData({
      id: tileSet.id,
      name: tileSet.name,
      description: tileSet.description,
      tile_ids: tileSet.tile_ids.join(', '),
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTileSet) return;

    const tileSet: TileSet = {
      ...selectedTileSet,
      name: formData.name,
      description: formData.description,
      tile_ids: formData.tile_ids.split(',').map(t => t.trim()).filter(Boolean),
      updated_at: BigInt(Date.now()),
    };

    try {
      const result = await updateTileSet.mutateAsync({ id: selectedTileSet.id, tileSet });

      if ("ok" in result) {
        toast.success('Tile Set updated successfully');
        setIsEditDialogOpen(false);
        setSelectedTileSet(null);
        setFormData({ id: '', name: '', description: '', tile_ids: '' });
      } else {
        toast.error(`Error: ${result.err.message}`, {
          description: `Code: ${result.err.code}`,
        });
      }
    } catch (error) {
      console.error('Failed to update tile set:', error);
      toast.error('Failed to update tile set', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const handleDeleteClick = (tileSet: TileSet) => {
    setSelectedTileSet(tileSet);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedTileSet) return;

    try {
      const result = await deleteTileSet.mutateAsync(selectedTileSet.id);

      if ("ok" in result) {
        toast.success('Tile Set deleted successfully');
        setIsDeleteDialogOpen(false);
        setSelectedTileSet(null);
      } else {
        toast.error(`Error: ${result.err.message}`, {
          description: `Code: ${result.err.code}`,
        });
      }
    } catch (error) {
      console.error('Failed to delete tile set:', error);
      toast.error('Failed to delete tile set', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tile Sets</h2>
          <p className="text-muted-foreground">
            Group tiles into logical sets
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Tile Set
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Tile Set</DialogTitle>
              <DialogDescription>
                Group existing tiles into a set
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-id">ID</Label>
                <Input
                  id="create-id"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="set_dungeon_base"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Dungeon Base Set"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">Description</Label>
                <Textarea
                  id="create-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Basic dungeon floor and wall tiles"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-tiles">Tile IDs (comma-separated)</Label>
                <Input
                  id="create-tiles"
                  value={formData.tile_ids}
                  onChange={(e) => setFormData({ ...formData, tile_ids: e.target.value })}
                  placeholder="tile_floor_01, tile_wall_01"
                />
              </div>
              <Button type="submit" className="w-full" disabled={createTileSet.isPending}>
                {createTileSet.isPending ? 'Creating...' : 'Create Tile Set'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Tile Set</DialogTitle>
            <DialogDescription>
              Update tile set details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-id">ID</Label>
              <Input
                id="edit-id"
                value={formData.id}
                disabled
                className="bg-muted"
              />
            </div>
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
              <Label htmlFor="edit-tiles">Tile IDs (comma-separated)</Label>
              <Input
                id="edit-tiles"
                value={formData.tile_ids}
                onChange={(e) => setFormData({ ...formData, tile_ids: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full" disabled={updateTileSet.isPending}>
              {updateTileSet.isPending ? 'Updating...' : 'Update Tile Set'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the tile set "{selectedTileSet?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteTileSet.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tileSets && tileSets.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tileSets.map((set) => (
            <Card key={set.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">{set.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(set)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(set)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-xs">{set.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{set.description}</p>
                <div className="flex flex-wrap gap-1">
                  {set.tile_ids.slice(0, 5).map((id) => (
                    <Badge key={id} variant="outline" className="text-xs">
                      {id}
                    </Badge>
                  ))}
                  {set.tile_ids.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{set.tile_ids.length - 5} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No tile sets yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Create your first tile set to get started
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Tile Set
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
