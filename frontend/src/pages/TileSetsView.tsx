import { useState } from 'react';
import { useListTileSets, useCreateTileSet } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import type { TileSet } from '../backend';

export function TileSetsView() {
  const { data: tileSets, isLoading } = useListTileSets();
  const createTileSet = useCreateTileSet();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    tile_ids: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const tileSet: TileSet = {
      id: formData.id,
      name: formData.name,
      description: formData.description,
      tile_ids: formData.tile_ids.split(',').map(t => t.trim()).filter(Boolean),
      created_at: BigInt(Date.now()),
      updated_at: BigInt(Date.now()),
    };

    const result = await createTileSet.mutateAsync(tileSet);
    
    if ("ok" in result) {
      toast.success('Tile set created successfully');
      setIsDialogOpen(false);
      setFormData({ id: '', name: '', description: '', tile_ids: '' });
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
          <h2 className="text-3xl font-bold tracking-tight">Tile Sets</h2>
          <p className="text-muted-foreground">
            Manage grouped tile collections
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                Group related tiles into a collection
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="id">ID</Label>
                <Input
                  id="id"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="tileset_001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Outdoor Tiles"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="A collection of outdoor environment tiles"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tile_ids">Tile IDs (comma-separated)</Label>
                <Textarea
                  id="tile_ids"
                  value={formData.tile_ids}
                  onChange={(e) => setFormData({ ...formData, tile_ids: e.target.value })}
                  placeholder="tile_001, tile_002, tile_003"
                />
              </div>
              <Button type="submit" className="w-full" disabled={createTileSet.isPending}>
                {createTileSet.isPending ? 'Creating...' : 'Create Tile Set'}
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
      ) : tileSets && tileSets.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tileSets.map((tileSet) => (
            <Card key={tileSet.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">{tileSet.name}</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-xs">{tileSet.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{tileSet.description}</p>
                <div className="text-sm font-medium">
                  {tileSet.tile_ids.length} tile{tileSet.tile_ids.length !== 1 ? 's' : ''}
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
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Tile Set
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
