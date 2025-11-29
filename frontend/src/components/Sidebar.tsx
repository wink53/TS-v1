import { cn } from '@/lib/utils';
import { LayoutDashboard, Square, Box, Layers, Package, Map } from 'lucide-react';
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
];

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  return (
    <aside className="w-64 border-r bg-card">
      <nav className="space-y-1 p-4">
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
    </aside>
  );
}
