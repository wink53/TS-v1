import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useListTiles, useListObjects, useListTileSets, useListPrefabs, useListMaps } from '../hooks/useQueries';
import { Square, Box, Layers, Package, Map, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ViewType } from '../App';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardProps {
  onNavigate: (view: ViewType) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { data: tiles, isLoading: tilesLoading } = useListTiles();
  const { data: objects, isLoading: objectsLoading } = useListObjects();
  const { data: tileSets, isLoading: tileSetsLoading } = useListTileSets();
  const { data: prefabs, isLoading: prefabsLoading } = useListPrefabs();
  const { data: maps, isLoading: mapsLoading } = useListMaps();

  const stats = [
    {
      title: 'Tiles',
      count: tiles?.length ?? 0,
      icon: Square,
      description: '32×32 PNG assets',
      view: 'tiles' as ViewType,
      loading: tilesLoading,
    },
    {
      title: 'Objects',
      count: objects?.length ?? 0,
      icon: Box,
      description: 'Multi-state game objects',
      view: 'objects' as ViewType,
      loading: objectsLoading,
    },
    {
      title: 'Tile Sets',
      count: tileSets?.length ?? 0,
      icon: Layers,
      description: 'Grouped tile collections',
      view: 'tileSets' as ViewType,
      loading: tileSetsLoading,
    },
    {
      title: 'Prefabs',
      count: prefabs?.length ?? 0,
      icon: Package,
      description: 'Pre-configured objects',
      view: 'prefabs' as ViewType,
      loading: prefabsLoading,
    },
    {
      title: 'Maps',
      count: maps?.length ?? 0,
      icon: Map,
      description: 'Game level layouts',
      view: 'maps' as ViewType,
      loading: mapsLoading,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Manage your game assets and data collections
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {stat.loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stat.count}</div>
                )}
                <p className="text-xs text-muted-foreground">{stat.description}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 h-8 px-2"
                  onClick={() => onNavigate(stat.view)}
                >
                  View all
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>About Tile Smith</CardTitle>
          <CardDescription>
            A tile-based game asset management system with validation and storage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="mb-2 font-semibold">Key Features</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Strict PNG validation (32×32 for tiles, multiples of 32 for objects)</li>
              <li>• Alpha transparency preservation and background correction</li>
              <li>• Multi-state object support with consistent dimensions</li>
              <li>• Collision detection with footprints and anchors</li>
              <li>• Event hooks for interactive game elements</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <footer className="border-t pt-6 text-center text-sm text-muted-foreground">
        © 2025. Built with love using{' '}
        <a
          href="https://caffeine.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
