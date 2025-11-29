import { useState } from 'react';
import { useListPrefabs, useCreatePrefab, useUpdatePrefab, useDeletePrefab } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Component, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import type { Prefab } from '../backend';

export function PrefabsView() {
  const { data: prefabs, isLoading } = useListPrefabs();
  const createPrefab = useCreatePrefab();
  const updatePrefab = useUpdatePrefab();
  const deletePrefab = useDeletePrefab();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPrefab, setSelectedPrefab] = useState<Prefab | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    object_id: '',
    default_state: '',
    position_x: '0',
    position_y: '0',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const prefab: Prefab = {
      id: formData.id,
      name: formData.name,
      description: formData.description,
      object_id: formData.object_id,
      default_state: formData.default_state,
      position: {
        x: BigInt(parseInt(formData.position_x) || 0),
        y: BigInt(parseInt(formData.position_y) || 0),
      },
      created_at: BigInt(Date.now()),
      updated_at: BigInt(Date.now()),
    };

    try {
      const result = await createPrefab.mutateAsync(prefab);

      if ("ok" in result) {
        toast.success('Prefab created successfully');
        setIsCreateDialogOpen(false);
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

  const handleEdit = (prefab: Prefab) => {
    setSelectedPrefab(prefab);
    setFormData({
      id: prefab.id,
      name: prefab.name,
      description: prefab.description,
      object_id: prefab.object_id,
      default_state: prefab.default_state,
      position_x: prefab.position.x.toString(),
      position_y: prefab.position.y.toString(),
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrefab) return;

    const prefab: Prefab = {
      ...selectedPrefab,
      name: formData.name,
      description: formData.description,
      object_id: formData.object_id,
      default_state: formData.default_state,
      position: {
        x: BigInt(parseInt(formData.position_x) || 0),
        y: BigInt(parseInt(formData.position_y) || 0),
      },
      updated_at: BigInt(Date.now()),
    };

    try {
      const result = await updatePrefab.mutateAsync({ id: selectedPrefab.id, prefab });

      if ("ok" in result) {
        toast.success('Prefab updated successfully');
        setIsEditDialogOpen(false);
        setSelectedPrefab(null);
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
      console.error('Failed to update prefab:', error);
      toast.error('Failed to update prefab', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };

  const handleDeleteClick = (prefab: Prefab) => {
    setSelectedPrefab(prefab);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedPrefab) return;

    try {
      const result = await deletePrefab.mutateAsync(selectedPrefab.id);

      if ("ok" in result) {
        toast.success('Prefab deleted successfully');
        setIsDeleteDialogOpen(false);
        setSelectedPrefab(null);
      } else {
        toast.error(`Error: ${result.err.message}`, {
          description: `Code: ${result.err.code}`,
        });
      }
    } catch (error) {
      console.error('Failed to delete prefab:', error);
      toast.error('Failed to delete prefab', {
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
            Pre-configured object instances
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
                Configure a reusable object instance
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-id">ID</Label>
                <Input
                  id="create-id"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="prefab_chest_locked"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Locked Chest"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">Description</Label>
                <Textarea
                  id="create-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="A chest that requires a key"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-object_id">Object ID</Label>
                <Input
                  id="create-object_id"
                  value={formData.object_id}
                  onChange={(e) => setFormData({ ...formData, object_id: e.target.value })}
                  placeholder="obj_chest_01"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-default_state">Default State</Label>
                <Input
                  id="create-default_state"
                  value={formData.default_state}
                  onChange={(e) => setFormData({ ...formData, default_state: e.target.value })}
                  placeholder="locked"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-pos-x">Position X</Label>
                  <Input
                    id="create-pos-x"
                    type="number"
                    value={formData.position_x}
                    onChange={(e) => setFormData({ ...formData, position_x: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-pos-y">Position Y</Label>
                  <Input
                    id="create-pos-y"
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Prefab</DialogTitle>
            <DialogDescription>
              Update prefab details
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
              <Label htmlFor="edit-object_id">Object ID</Label>
              <Input
                id="edit-object_id"
                value={formData.object_id}
                onChange={(e) => setFormData({ ...formData, object_id: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-default_state">Default State</Label>
              <Input
                id="edit-default_state"
                value={formData.default_state}
                onChange={(e) => setFormData({ ...formData, default_state: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-pos-x">Position X</Label>
                <Input
                  id="edit-pos-x"
                  type="number"
                  value={formData.position_x}
                  onChange={(e) => setFormData({ ...formData, position_x: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-pos-y">Position Y</Label>
                <Input
                  id="edit-pos-y"
                  type="number"
                  value={formData.position_y}
                  onChange={(e) => setFormData({ ...formData, position_y: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={updatePrefab.isPending}>
              {updatePrefab.isPending ? 'Updating...' : 'Update Prefab'}
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
              This will permanently delete the prefab "{selectedPrefab?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletePrefab.isPending ? 'Deleting...' : 'Delete'}
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
      ) : prefabs && prefabs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {prefabs.map((prefab) => (
            <Card key={prefab.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Component className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">{prefab.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(prefab)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(prefab)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-xs">{prefab.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{prefab.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>Object: {prefab.object_id}</div>
                  <div>State: {prefab.default_state || 'default'}</div>
                  <div className="col-span-2">
                    Pos: ({prefab.position.x.toString()}, {prefab.position.y.toString()})
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Component className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No prefabs yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Create your first prefab to get started
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Prefab
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
