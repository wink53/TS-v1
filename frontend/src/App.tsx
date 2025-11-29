import { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { TilesView } from './pages/TilesView';
import { ObjectsView } from './pages/ObjectsView';
import { TileSetsView } from './pages/TileSetsView';
import { PrefabsView } from './pages/PrefabsView';
import { MapsView } from './pages/MapsView';
import { Dashboard } from './pages/Dashboard';
import { Toaster } from '@/components/ui/sonner';

export type ViewType = 'dashboard' | 'tiles' | 'objects' | 'tileSets' | 'prefabs' | 'maps';
export type PaletteTab = 'tiles' | 'objects' | 'characters' | 'npcs';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentView} />;
      case 'tiles':
        return <TilesView />;
      case 'objects':
        return <ObjectsView />;
      case 'tileSets':
        return <TileSetsView />;
      case 'prefabs':
        return <PrefabsView />;
      case 'maps':
        return <MapsView />;
      default:
        return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentView={currentView} onNavigate={setCurrentView} />
        <main className="flex-1 overflow-y-auto p-6">
          {renderView()}
        </main>
      </div>
      <Toaster />
    </div>
  );
}

export default App;
