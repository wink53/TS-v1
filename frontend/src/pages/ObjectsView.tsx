import { useState } from 'react';
import { useListObjects, useCreateObject } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Box } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { ObjectMetadata } from '../backend';

export function ObjectsView() {
  const { data: objects, isLoading } = useListObjects();
  const createObject = useCreateObject();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    tags: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const metadata: ObjectMetadata = {
      id: formData.id,
      name: formData.name,
      description: formData.description,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      states: [],
      anchors: [],
      footprints: [],
      event_hooks: [],
      created_at: BigInt(Date.now()),
      updated_at: BigInt(Date.now()),
    };

    const result = await createObject.mutateAsync(metadata);
    
    if ("ok" in result) {
      toast.success('Object created successfully');
      setIsDialogOpen(false);
      setFormData({ id: '', name: '', description: '', tags: '' });
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
          <h2 className="text-3xl font-bold tracking-tight">Objects</h2>
          <p className="text-muted-foreground">
            Manage multi-state game objects
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Object
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Object</DialogTitle>
              <DialogDescription>
                Add a new multi-state object to your collection
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="id">ID</Label>
                <Input
                  id="id"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="object_001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Tree"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="An animated tree with multiple states"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="tree, nature, animated"
                />
              </div>
              <Button type="submit" className="w-full" disabled={createObject.isPending}>
                {createObject.isPending ? 'Creating...' : 'Create Object'}
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
      ) : objects && objects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {objects.map((object) => (
            <Card key={object.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Box className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">{object.name}</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-xs">{object.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{object.description}</p>
                {object.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {object.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>States: {object.states.length}</div>
                  <div>Anchors: {object.anchors.length}</div>
                  <div>Footprints: {object.footprints.length}</div>
                  <div>Events: {object.event_hooks.length}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Box className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No objects yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Create your first object to get started
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Object
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
