import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import type { MapData } from '@/backend';

interface InspectorProps {
  currentMap: MapData | null;
  selectedObjectIndex: number | null;
  onObjectStateChange: (index: number, newState: string) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

const OBJECT_STATES = ['default', 'alive', 'chopped', 'open', 'closed'];

export function Inspector({
  currentMap,
  selectedObjectIndex,
  onObjectStateChange,
  isVisible,
  onToggleVisibility,
}: InspectorProps) {
  const selectedObject =
    currentMap && selectedObjectIndex !== null
      ? currentMap.object_instances[selectedObjectIndex]
      : null;

  return (
    <>
      {/* Mobile toggle button */}
      <Button
        variant="outline"
        size="sm"
        className="lg:hidden fixed bottom-4 right-4 z-50 shadow-lg"
        onClick={onToggleVisibility}
      >
        {isVisible ? 'Hide Inspector' : 'Show Inspector'}
      </Button>

      {/* Inspector panel */}
      <aside
        className={`${
          isVisible ? 'block' : 'hidden'
        } lg:block w-full lg:w-72 border-t lg:border-t-0 lg:border-l bg-card`}
      >
        <div className="p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Inspector</h2>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onToggleVisibility}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {!selectedObject && currentMap && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Map Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">ID</Label>
                  <p className="text-sm font-medium break-all">{currentMap.id}</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <p className="text-sm font-medium">{currentMap.name}</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm">{currentMap.description || 'No description'}</p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Tiles</Label>
                    <p className="text-2xl font-bold text-primary">
                      {currentMap.tile_instances.length}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Objects</Label>
                    <p className="text-2xl font-bold text-accent">
                      {currentMap.object_instances.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedObject && selectedObjectIndex !== null && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Object Instance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Instance ID</Label>
                  <p className="text-sm font-medium">obj_{selectedObjectIndex}</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground">Object ID</Label>
                  <p className="text-sm font-medium break-all">{selectedObject.object_id}</p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">X Position</Label>
                    <p className="text-sm font-medium">{Number(selectedObject.position.x)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Y Position</Label>
                    <p className="text-sm font-medium">{Number(selectedObject.position.y)}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label htmlFor="object-state" className="text-xs text-muted-foreground">
                    State
                  </Label>
                  <Select
                    value={selectedObject.state}
                    onValueChange={(value) => onObjectStateChange(selectedObjectIndex, value)}
                  >
                    <SelectTrigger id="object-state" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OBJECT_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {!currentMap && (
            <p className="text-sm text-muted-foreground">
              Select a map to view details
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
