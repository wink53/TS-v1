import { useState } from 'react';
import { useListTiles, useCreateTile } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Square } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { TileMetadata } from '../backend';

export function TilesView() {
  const { data: tiles, isLoading } = useListTiles();
  const createTile = useCreateTile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    tags: '',
    blob_id: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
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

    const result = await createTile.mutateAsync(metadata);
    
    if (result.__kind__ === 'ok') {
      toast.success('Tile created successfully');
      setIsDialogOpen(false);
      setFormData({ id: '', name: '', description: '', tags: '', blob_id: '' });
    } else {
      toast.error(`Error: ${result.err.message}`, {
        description: `Code: ${result.err.code}`,
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="id">ID</Label>
                <Input
                  id="id"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="tile_001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Grass Tile"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="A basic grass tile for outdoor scenes"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="grass, outdoor, nature"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blob_id">Blob ID</Label>
                <Input
                  id="blob_id"
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
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Tile
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
