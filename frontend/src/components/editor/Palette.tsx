import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, User, Shield, Store, Scroll, Skull } from 'lucide-react';
import type { TileMetadata, ObjectMetadata } from '@/backend';
import type { PaletteTab } from '@/App';

// NPC Preset definitions
export interface NPCPreset {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  movementType: 'static' | 'patrol' | 'wander';
  interactionType: 'dialogue' | 'shop' | 'quest' | 'none';
  combatEnabled: boolean;
}

export const NPC_PRESETS: NPCPreset[] = [
  { id: 'villager', name: 'Villager', description: 'Static NPC with dialogue', icon: null, movementType: 'static', interactionType: 'dialogue', combatEnabled: false },
  { id: 'guard', name: 'Guard', description: 'Patrol with alert behavior', icon: null, movementType: 'patrol', interactionType: 'dialogue', combatEnabled: true },
  { id: 'shopkeeper', name: 'Shopkeeper', description: 'Static merchant NPC', icon: null, movementType: 'static', interactionType: 'shop', combatEnabled: false },
  { id: 'quest_giver', name: 'Quest Giver', description: 'Issues quests to player', icon: null, movementType: 'static', interactionType: 'quest', combatEnabled: false },
  { id: 'hostile', name: 'Hostile', description: 'Wanders and attacks player', icon: null, movementType: 'wander', interactionType: 'none', combatEnabled: true },
];

interface PaletteProps {
  activeTab: PaletteTab;
  onTabChange: (tab: PaletteTab) => void;
  tilesList: TileMetadata[];
  objectsList: ObjectMetadata[];
  currentTileId: string | null;
  currentObjectId: string | null;
  currentNpcId: string | null;
  onTileSelect: (tileId: string) => void;
  onObjectSelect: (objectId: string) => void;
  onNpcSelect: (npcId: string) => void;
  onGenerateSampleTiles: () => void;
  hasBackendTiles: boolean;
}

export function Palette({
  activeTab,
  onTabChange,
  tilesList,
  objectsList,
  currentTileId,
  currentObjectId,
  currentNpcId,
  onTileSelect,
  onObjectSelect,
  onNpcSelect,
  onGenerateSampleTiles,
  hasBackendTiles,
}: PaletteProps) {
  return (
    <aside className="w-full lg:w-60 border-b lg:border-b-0 lg:border-r bg-card">
      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as PaletteTab)} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-4 rounded-none border-b">
          <TabsTrigger value="tiles" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Tiles
          </TabsTrigger>
          <TabsTrigger value="objects" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Objects
          </TabsTrigger>
          <TabsTrigger value="npcs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            NPCs
          </TabsTrigger>
          <TabsTrigger value="characters" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Chars
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tiles" className="flex-1 p-0 m-0">
          <ScrollArea className="h-[200px] lg:h-[calc(100vh-8rem)]">
            <div className="space-y-1 p-3">
              {tilesList.length === 0 && !hasBackendTiles && (
                <Alert className="mb-3">
                  <AlertDescription className="text-xs">
                    No tiles available from backend.
                  </AlertDescription>
                </Alert>
              )}

              {tilesList.length === 0 && !hasBackendTiles && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={onGenerateSampleTiles}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate sample tiles for testing
                </Button>
              )}

              {tilesList.map((tile) => (
                <button
                  key={tile.id}
                  onClick={() => onTileSelect(tile.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${currentTileId === tile.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'hover:bg-secondary'
                    }`}
                >
                  <div className="font-medium truncate">{tile.name || tile.id}</div>
                  {tile.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {tile.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="objects" className="flex-1 p-0 m-0">
          <ScrollArea className="h-[200px] lg:h-[calc(100vh-8rem)]">
            <div className="space-y-1 p-3">
              {objectsList.length === 0 ? (
                <p className="text-sm text-muted-foreground px-3 py-2">No objects available</p>
              ) : (
                objectsList.map((obj) => (
                  <button
                    key={obj.id}
                    onClick={() => onObjectSelect(obj.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${currentObjectId === obj.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-secondary'
                      }`}
                  >
                    <div className="font-medium truncate">{obj.name || obj.id}</div>
                    {obj.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {obj.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="npcs" className="flex-1 p-0 m-0">
          <ScrollArea className="h-[200px] lg:h-[calc(100vh-8rem)]">
            <div className="space-y-1 p-3">
              {NPC_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onNpcSelect(preset.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${currentNpcId === preset.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-secondary'
                    }`}
                >
                  <div className="font-medium truncate">{preset.name}</div>
                  <div className="text-xs opacity-70">{preset.description}</div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="characters" className="flex-1 p-4 m-0">
          <p className="text-sm text-muted-foreground">
            Character assets coming soon...
          </p>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
