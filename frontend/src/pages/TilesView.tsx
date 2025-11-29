import { useState } from 'react';
import { useListTiles, useCreateTile, useUpdateTile, useDeleteTile } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Square, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { TileMetadata } from '../backend';

export function TilesView() {
  const { data: tiles, isLoading } = useListTiles();
  const createTile = useCreateTile();
  const updateTile = useUpdateTile();
  const deleteTile = useDeleteTile();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTile, setSelectedTile] = useState<TileMetadata | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    tags: '',
    blob_id: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const metadata: TileMetadata = {
      id: formData.id,
      name: formData.name,
      description: formData.description,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      blob_id: formData.blob_id,
      created_at: BigInt(Date.now()),
      updated_at: BigInt(Date.now()),
    };

    try {
      const result = await createTile.mutateAsync(metadata);

      if ("ok" in result) {
        toast.success('Tile created successfully');
        setIsCreateDialogOpen(false);
        setFormData({ id: '', name: '', description: '', tags: '', blob_id: '' });
      } else {
        toast.error(`Error: ${result.err.message}`, {
          description: `Code: ${result.err.code}`,
        });
      }
    } catch (error) {
      console.error('Failed to create tile:', error);
      toast.error('Failed to create tile', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const handleEdit = (tile: TileMetadata) => {
    setSelectedTile(tile);
    setFormData({
      id: tile.id,
      name: tile.name,
      description: tile.description,
      tags: tile.tags.join(', '),
      blob_id: tile.blob_id,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTile) return;

    const metadata: TileMetadata = {
      ...selectedTile,
      name: formData.name,
      description: formData.description,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      blob_id: formData.blob_id,
      updated_at: BigInt(Date.now()),
    };

    try {
      const result = await updateTile.mutateAsync({ id: selectedTile.id, metadata });

      if ("ok" in result) {
        toast.success('Tile updated successfully');
        setIsEditDialogOpen(false);
        setSelectedTile(null);
        setFormData({ id: '', name: '', description: '', tags: '', blob_id: '' });
      } else {
        toast.error(`Error: ${result.err.message}`, {
          description: `Code: ${result.err.code}`,
        });
      }
    } catch (error) {
      console.error('Failed to update tile:', error);
      toast.error('Failed to update tile', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const handleDeleteClick = (tile: TileMetadata) => {
    setSelectedTile(tile);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedTile) return;

    try {
      const result = await deleteTile.mutateAsync(selectedTile.id);

      if ("ok" in result) {
        toast.success('Tile deleted successfully');
        setIsDeleteDialogOpen(false);
        setSelectedTile(null);
      } else {
        toast.error(`Error: ${result.err.message}`, {
          description: `Code: ${result.err.code}`,
        });
      }
    } catch (error) {
      console.error('Failed to delete tile:', error);
      toast.error('Failed to delete tile', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tiles</h2>
          <p className="text-muted-foreground">
            Manage 32×32 PNG tile assets
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Tile
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Tile</DialogTitle>
              <DialogDescription>
                Add a new 32×32 PNG tile to your collection
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-id">ID</Label>
                <Input
                  id="create-id"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="tile_001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Grass Tile"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">Description</Label>
                <Textarea
                  id="create-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="A basic grass tile for outdoor scenes"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-tags">Tags (comma-separated)</Label>
                <Input
                  id="create-tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="grass, outdoor, nature"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-blob_id">Blob ID</Label>
                <Input
                  id="create-blob_id"
                  value={formData.blob_id}
                  onChange={(e) => setFormData({ ...formData, blob_id: e.target.value })}
                  placeholder="blob_abc123"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Reference to the stored PNG asset
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={createTile.isPending}>
                {createTile.isPending ? 'Creating...' : 'Create Tile'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Tile</DialogTitle>
            <DialogDescription>
              Update tile details
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
              <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
              <Input
                id="edit-tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-blob_id">Blob ID</Label>
              <Input
                id="edit-blob_id"
                value={formData.blob_id}
                onChange={(e) => setFormData({ ...formData, blob_id: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={updateTile.isPending}>
              {updateTile.isPending ? 'Updating...' : 'Update Tile'}
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
              This will permanently delete the tile "{selectedTile?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteTile.isPending ? 'Deleting...' : 'Delete'}
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
      ) : tiles && tiles.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tiles.map((tile) => (
            <Card key={tile.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Square className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">{tile.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(tile)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(tile)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-xs">{tile.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{tile.description}</p>
                {tile.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tile.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  Blob: {tile.blob_id}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Square className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No tiles yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Create your first tile to get started
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Tile
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
