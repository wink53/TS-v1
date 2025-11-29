import { useState } from 'react';
import { useListPrefabs, useCreatePrefab } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import type { Prefab } from '../backend';

export function PrefabsView() {
  const { data: prefabs, isLoading } = useListPrefabs();
  const createPrefab = useCreatePrefab();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    object_id: '',
    default_state: '',
    position_x: '0',
    position_y: '0',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const prefab: Prefab = {
      id: formData.id,
      name: formData.name,
      description: formData.description,
      object_id: formData.object_id,
      default_state: formData.default_state,
      position: {
        x: BigInt(formData.position_x),
        y: BigInt(formData.position_y),
      },
      created_at: BigInt(Date.now()),
      updated_at: BigInt(Date.now()),
    };

    try {
      const result = await createPrefab.mutateAsync(prefab);

      if ("ok" in result) {
        toast.success('Prefab created successfully');
        setIsDialogOpen(false);
        setFormData({
          id: '',
          name: '',
          description: '',
          object_id: '',
          default_state: '',
          position_x: '0',
          position_y: '0'
        });
      } else {
        toast.error(`Error: ${result.err.message}`, {
          description: `Code: ${result.err.code}`,
        });
      }
    } catch (error) {
      console.error('Failed to create prefab:', error);
      toast.error('Failed to create prefab', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Prefabs</h2>
          <p className="text-muted-foreground">
            Manage pre-configured object instances
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Prefab
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Prefab</DialogTitle>
              <DialogDescription>
                Create a pre-configured object instance
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="id">ID</Label>
                <Input
                  id="id"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="prefab_001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Oak Tree"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="A pre-configured oak tree"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="object_id">Object ID</Label>
                <Input
                  id="object_id"
                  value={formData.object_id}
                  onChange={(e) => setFormData({ ...formData, object_id: e.target.value })}
                  placeholder="object_001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_state">Default State</Label>
                <Input
                  id="default_state"
                  value={formData.default_state}
                  onChange={(e) => setFormData({ ...formData, default_state: e.target.value })}
                  placeholder="idle"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="position_x">Position X</Label>
                  <Input
                    id="position_x"
                    type="number"
                    value={formData.position_x}
                    onChange={(e) => setFormData({ ...formData, position_x: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position_y">Position Y</Label>
                  <Input
                    id="position_y"
                    type="number"
                    value={formData.position_y}
                    onChange={(e) => setFormData({ ...formData, position_y: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createPrefab.isPending}>
                {createPrefab.isPending ? 'Creating...' : 'Create Prefab'}
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
      ) : prefabs && prefabs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {prefabs.map((prefab) => (
            <Card key={prefab.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">{prefab.name}</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-xs">{prefab.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{prefab.description}</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>Object: {prefab.object_id}</div>
                  <div>State: {prefab.default_state}</div>
                  <div>Position: ({prefab.position.x.toString()}, {prefab.position.y.toString()})</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No prefabs yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Create your first prefab to get started
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Prefab
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
