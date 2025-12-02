import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Hammer, Save, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateMap, useUpdateMap } from '@/hooks/useQueries';
import type { MapData } from '@/backend';

interface TopBarProps {
  mapsList: MapData[];
  currentMap: MapData | null;
  onMapSelect: (mapId: string) => void;
  onNewMap: (mapData: MapData) => void;
  onSave: (mapData: MapData) => void;
}

export function TopBar({ mapsList, currentMap, onMapSelect, onNewMap, onSave }: TopBarProps) {
  const [isNewMapOpen, setIsNewMapOpen] = useState(false);
  const [newMapId, setNewMapId] = useState('');
  const [newMapName, setNewMapName] = useState('');
  const [newMapWidth, setNewMapWidth] = useState('20');
  const [newMapHeight, setNewMapHeight] = useState('15');

  const createMapMutation = useCreateMap();
  const updateMapMutation = useUpdateMap();

  const handleCreateMap = async () => {
    if (!newMapId || !newMapName) {
      toast.error('Please fill in all required fields');
      return;
    }

    const width = parseInt(newMapWidth);
    const height = parseInt(newMapHeight);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      toast.error('Width and height must be positive numbers');
      return;
    }

    const newMap: MapData = {
      id: newMapId,
      name: newMapName,
      description: '',
      width: BigInt(width),
      height: BigInt(height),
      tile_instances: [],
      object_instances: [],
      spawn_points: [],
      created_at: BigInt(Date.now()),
      updated_at: BigInt(Date.now()),
    };

    try {
      await createMapMutation.mutateAsync(newMap);
      toast.success('Map created successfully');
      onNewMap(newMap);
      setIsNewMapOpen(false);
      setNewMapId('');
      setNewMapName('');
      setNewMapWidth('20');
      setNewMapHeight('15');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to create map: ${errorMessage}`);
    }
  };

  const handleSaveMap = async () => {
    if (!currentMap) {
      toast.error('No map selected');
      return;
    }

    try {
      const updatedMap = {
        ...currentMap,
        updated_at: BigInt(Date.now()),
      };

      await updateMapMutation.mutateAsync({
        id: currentMap.id,
        mapData: updatedMap,
      });

      toast.success('Map saved successfully');
      onSave(updatedMap);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to save map: ${errorMessage}`);
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
      <div className="flex items-center gap-2 lg:gap-4">
        <div className="flex items-center gap-2">
          <Hammer className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
          <h1 className="text-lg lg:text-xl font-bold">Tile Smith Editor</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={currentMap?.id || ''}
          onValueChange={onMapSelect}
        >
          <SelectTrigger className="w-[140px] lg:w-[200px]">
            <SelectValue placeholder="Select map" />
          </SelectTrigger>
          <SelectContent>
            {mapsList.map((map) => (
              <SelectItem key={map.id} value={map.id}>
                {map.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={isNewMapOpen} onOpenChange={setIsNewMapOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">New Map</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Map</DialogTitle>
              <DialogDescription>
                Enter the details for your new map.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="map-id">Map ID</Label>
                <Input
                  id="map-id"
                  value={newMapId}
                  onChange={(e) => setNewMapId(e.target.value)}
                  placeholder="e.g., level_1"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="map-name">Map Name</Label>
                <Input
                  id="map-name"
                  value={newMapName}
                  onChange={(e) => setNewMapName(e.target.value)}
                  placeholder="e.g., Level 1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="map-width">Width (tiles)</Label>
                  <Input
                    id="map-width"
                    type="number"
                    value={newMapWidth}
                    onChange={(e) => setNewMapWidth(e.target.value)}
                    min="1"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="map-height">Height (tiles)</Label>
                  <Input
                    id="map-height"
                    type="number"
                    value={newMapHeight}
                    onChange={(e) => setNewMapHeight(e.target.value)}
                    min="1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateMap}
                disabled={createMapMutation.isPending}
              >
                {createMapMutation.isPending ? 'Creating...' : 'Create Map'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          onClick={handleSaveMap}
          disabled={!currentMap || updateMapMutation.isPending}
          size="sm"
        >
          <Save className="h-4 w-4 lg:mr-2" />
          <span className="hidden lg:inline">
            {updateMapMutation.isPending ? 'Saving...' : 'Save Map'}
          </span>
        </Button>
      </div>
    </header>
  );
}
