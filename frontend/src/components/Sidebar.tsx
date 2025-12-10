import { cn } from '@/lib/utils';
import { LayoutDashboard, Square, Box, Layers, Package, Map, User, Image } from 'lucide-react';
import type { ViewType } from '../App';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

const navItems = [
  { id: 'dashboard' as ViewType, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tiles' as ViewType, label: 'Tiles', icon: Square },
  { id: 'objects' as ViewType, label: 'Objects', icon: Box },
  { id: 'tileSets' as ViewType, label: 'Tile Sets', icon: Layers },
  { id: 'prefabs' as ViewType, label: 'Prefabs', icon: Package },
  { id: 'maps' as ViewType, label: 'Maps', icon: Map },
  { id: 'sprites' as ViewType, label: 'Sprites', icon: Image },
  { id: 'characters' as ViewType, label: 'Characters', icon: User },
];

import { getStoredCanisterId, setStoredCanisterId } from '../hooks/useActor';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings } from 'lucide-react';

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const [canisterId, setCanisterId] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const id = getStoredCanisterId();
    if (id) setCanisterId(id);
  }, []);

  const handleSaveId = () => {
    if (canisterId) {
      setStoredCanisterId(canisterId);
      setIsSettingsOpen(false);
    }
  };

  return (
    <aside className="w-64 border-r bg-card flex flex-col">
      <nav className="space-y-1 p-4 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2">
              <Settings className="h-4 w-4" />
              <span className="truncate text-xs">
                {canisterId ? `Backend: ${canisterId.slice(0, 5)}...` : 'Configure Backend'}
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Backend Configuration</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Canister ID</label>
                <Input
                  value={canisterId}
                  onChange={(e) => setCanisterId(e.target.value)}
                  placeholder="Enter backend canister ID"
                />
                <p className="text-xs text-muted-foreground">
                  Found in your ICP Ninja deployment URL or logs.
                </p>
              </div>
              <Button onClick={handleSaveId} className="w-full">
                Save & Reload
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </aside>
  );
}
