import { useState } from 'react';
import { useListMaps, useCreateMap, useUpdateMap, useDeleteMap } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Map, Pencil, Trash2, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import type { MapData } from '../backend';

interface MapsViewProps {
  onOpenEditor?: (mapId: string) => void;
}

export function MapsView({ onOpenEditor }: MapsViewProps) {
  const { data: maps, isLoading } = useListMaps();
  const createMap = useCreateMap();
  const updateMap = useUpdateMap();
  const deleteMap = useDeleteMap();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMap, setSelectedMap] = useState<MapData | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    width: 32,
    height: 24,
  });

  // ... (handlers remain the same)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const mapData: MapData = {
      id: formData.id,
      name: formData.name,
      description: formData.description,
      width: formData.width,
      height: formData.height,
      tile_instances: [],
      object_instances: [],
      created_at: BigInt(Date.now()),
      updated_at: BigInt(Date.now()),
    };

    try {
      const result = await createMap.mutateAsync(mapData);

      if ("ok" in result) {
        toast.success('Map created successfully');
        setIsCreateDialogOpen(false);
        setFormData({ id: '', name: '', description: '', width: 32, height: 24 });
      } else {
        toast.error(`Error: ${result.err.message}`, {
          description: `Code: ${result.err.code}`,
        });
      }
    } catch (error) {
      console.error('Failed to create map:', error);
      toast.error('Failed to create map', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const handleEdit = (map: MapData) => {
    setSelectedMap(map);
    setFormData({
      id: map.id,
      name: map.name,
      description: map.description,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMap) return;

    const mapData: MapData = {
      ...selectedMap,
      name: formData.name,
      description: formData.description,
      updated_at: BigInt(Date.now()),
    };

    try {
      const result = await updateMap.mutateAsync({ id: selectedMap.id, mapData });

      if ("ok" in result) {
        toast.success('Map updated successfully');
        setIsEditDialogOpen(false);
        setSelectedMap(null);
        setFormData({ id: '', name: '', description: '' });
      } else {
        toast.error(`Error: ${result.err.message}`, {
          description: `Code: ${result.err.code}`,
        });
      }
    } catch (error) {
      console.error('Failed to update map:', error);
      toast.error('Failed to update map', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const handleDeleteClick = async (map: MapData) => {
    if (!window.confirm(`Are you sure you want to delete the map "${map.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await deleteMap.mutateAsync(map.id);

      if ("ok" in result) {
        toast.success('Map deleted successfully');
      } else {
        toast.error(`Error: ${result.err.message}`, {
          description: `Code: ${result.err.code}`,
        });
      }
    } catch (error) {
      console.error('Failed to delete map:', error);
      toast.error('Failed to delete map', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ... (Header and Create Dialog remain the same) */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Maps</h2>
          <p className="text-muted-foreground">
            Manage game level layouts
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-id">ID</Label>
                <Input
                  id="create-id"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="map_001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Forest Level"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">Description</Label>
                <Textarea
                  id="create-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="A forest-themed game level"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-width">Width (tiles)</Label>
                  <Input
                    id="create-width"
                    type="number"
                    min="1"
                    max="256"
                    value={formData.width}
                    onChange={(e) => setFormData({ ...formData, width: parseInt(e.target.value) || 32 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-height">Height (tiles)</Label>
                  <Input
                    id="create-height"
                    type="number"
                    min="1"
                    max="256"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) || 24 })}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMap.isPending}>
                {createMap.isPending ? 'Creating...' : 'Create Map'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Map</DialogTitle>
            <DialogDescription>
              Update map details
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
            <Button type="submit" className="w-full" disabled={updateMap.isPending}>
              {updateMap.isPending ? 'Updating...' : 'Update Map'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

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
                  <div className="flex gap-1">
                    {onOpenEditor && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onOpenEditor(map.id)}
                        title="Open Editor"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(map)}
                      title="Edit Details"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(map)}
                      disabled={deleteMap.isPending}
                      title="Delete Map"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Map
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
