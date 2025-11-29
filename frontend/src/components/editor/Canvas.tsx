import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { MapData } from '@/backend';
import type { PaletteTab } from '@/App';

interface CanvasProps {
  map: MapData | null;
  mode: PaletteTab;
  onCellClick: (x: number, y: number) => void;
  onObjectClick: (index: number) => void;
  selectedObjectInstanceId: string | null;
}

const CELL_SIZE = 28;
const DEFAULT_WIDTH = 20;
const DEFAULT_HEIGHT = 15;

export function Canvas({
  map,
  mode,
  onCellClick,
  onObjectClick,
  selectedObjectInstanceId,
}: CanvasProps) {
  // Calculate map dimensions from instances or use defaults
  const getMapDimensions = () => {
    if (!map) return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };

    let maxX = DEFAULT_WIDTH - 1;
    let maxY = DEFAULT_HEIGHT - 1;

    // Check tile instances
    map.tile_instances.forEach((tile) => {
      const x = Number(tile.position.x);
      const y = Number(tile.position.y);
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });

    // Check object instances
    map.object_instances.forEach((obj) => {
      const x = Number(obj.position.x);
      const y = Number(obj.position.y);
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });

    return { width: maxX + 1, height: maxY + 1 };
  };

  const { width, height } = getMapDimensions();

  const handleCellClick = (x: number, y: number) => {
    // Check if clicking on an object
    if (map && mode === 'objects') {
      const clickedObjectIndex = map.object_instances.findIndex(
        (obj) => Number(obj.position.x) === x && Number(obj.position.y) === y
      );
      
      if (clickedObjectIndex !== -1) {
        onObjectClick(clickedObjectIndex);
        return;
      }
    }
    
    onCellClick(x, y);
  };

  const getTileAtPosition = (x: number, y: number) => {
    if (!map) return null;
    return map.tile_instances.find(
      (tile) => Number(tile.position.x) === x && Number(tile.position.y) === y
    );
  };

  const getObjectAtPosition = (x: number, y: number) => {
    if (!map) return null;
    const index = map.object_instances.findIndex(
      (obj) => Number(obj.position.x) === x && Number(obj.position.y) === y
    );
    return index !== -1 ? { obj: map.object_instances[index], index } : null;
  };

  const modeLabel = mode === 'tiles' ? 'Tile Mode' : mode === 'objects' ? 'Object Mode' : 'Character Mode';

  if (!map) {
    return (
      <main className="flex-1 overflow-hidden bg-muted/30 relative flex items-center justify-center min-h-[300px]">
        <div className="text-center max-w-md p-6">
          <p className="text-lg text-muted-foreground">
            No map selected
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Create or select a map to start editing.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-hidden bg-muted/30 relative min-h-[300px]">
      <ScrollArea className="h-full">
        <div className="flex min-h-full items-center justify-center p-4 lg:p-8">
          <div className="relative">
            <Badge className="absolute -top-8 left-0 z-10 bg-primary text-primary-foreground">
              {modeLabel}
            </Badge>
            
            {/* Debug label */}
            <div className="absolute -top-8 right-0 text-xs text-muted-foreground font-mono">
              Map: {map.id} – {width} × {height}
            </div>

            {/* Grid container */}
            <div
              className="bg-background border-2 border-border shadow-lg"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${width}, ${CELL_SIZE}px)`,
                gridTemplateRows: `repeat(${height}, ${CELL_SIZE}px)`,
                gap: 0,
              }}
            >
              {Array.from({ length: height }, (_, y) =>
                Array.from({ length: width }, (_, x) => {
                  const tile = getTileAtPosition(x, y);
                  const objectData = getObjectAtPosition(x, y);
                  const isSelected = objectData && selectedObjectInstanceId === `obj_${objectData.index}`;

                  return (
                    <div
                      key={`${x}-${y}`}
                      onClick={() => handleCellClick(x, y)}
                      className="relative border border-border/40 cursor-crosshair transition-colors hover:bg-accent/20 hover:border-accent"
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                      }}
                    >
                      {/* Tile content */}
                      {tile && (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                          <span className="text-[8px] font-mono text-muted-foreground leading-none text-center px-0.5 break-all">
                            {tile.tile_id.length > 6 ? tile.tile_id.substring(0, 6) : tile.tile_id}
                          </span>
                        </div>
                      )}

                      {/* Object overlay */}
                      {objectData && (
                        <div
                          className={`absolute inset-0.5 flex items-center justify-center border-2 transition-colors ${
                            isSelected
                              ? 'bg-primary/20 border-primary'
                              : 'bg-secondary/30 border-secondary'
                          }`}
                        >
                          <span className="text-[8px] font-mono font-bold text-foreground leading-none text-center px-0.5 break-all">
                            {objectData.obj.object_id.length > 5
                              ? objectData.obj.object_id.substring(0, 5)
                              : objectData.obj.object_id}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </main>
  );
}
