import { useState } from 'react';
import { useListMaps, useCreateMap } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Map } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import type { MapData } from '../backend';

export function MapsView() {
  const { data: maps, isLoading } = useListMaps();
  const createMap = useCreateMap();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const mapData: MapData = {
      id: formData.id,
      name: formData.name,
      description: formData.description,
      tile_instances: [],
      object_instances: [],
      created_at: BigInt(Date.now()),
      updated_at: BigInt(Date.now()),
    };

    const result = await createMap.mutateAsync(mapData);
    
    if ("ok" in result) {
      toast.success('Map created successfully');
      setIsDialogOpen(false);
      setFormData({ id: '', name: '', description: '' });
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
          <h2 className="text-3xl font-bold tracking-tight">Maps</h2>
          <p className="text-muted-foreground">
            Manage game level layouts
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Map
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Map</DialogTitle>
              <DialogDescription>
                Create a new game level layout
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="id">ID</Label>
                <Input
                  id="id"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="map_001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Forest Level"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="A forest-themed game level"
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMap.isPending}>
                {createMap.isPending ? 'Creating...' : 'Create Map'}
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
      ) : maps && maps.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {maps.map((map) => (
            <Card key={map.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Map className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">{map.name}</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-xs">{map.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{map.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Tiles: {map.tile_instances.length}</div>
                  <div>Objects: {map.object_instances.length}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Map className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No maps yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Create your first map to get started
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Map
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
