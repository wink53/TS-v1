import { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { TilesView } from './pages/TilesView';
import { ObjectsView } from './pages/ObjectsView';
import { TileSetsView } from './pages/TileSetsView';
import { PrefabsView } from './pages/PrefabsView';
import { MapsView } from './pages/MapsView';
import { EditorView } from './pages/EditorView';
import { CharactersView } from './pages/CharactersView';
import { Dashboard } from './pages/Dashboard';
import { Toaster } from '@/components/ui/sonner';

export type ViewType = 'dashboard' | 'tiles' | 'objects' | 'tileSets' | 'prefabs' | 'maps' | 'editor' | 'characters';
export type PaletteTab = 'tiles' | 'objects' | 'characters' | 'npcs';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  const handleOpenEditor = (mapId: string) => {
    setSelectedMapId(mapId);
    setCurrentView('editor');
  };

  const handleBackFromEditor = () => {
    setSelectedMapId(null);
    setCurrentView('maps');
  };

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
        return <MapsView onOpenEditor={handleOpenEditor} />;
      case 'editor':
        if (!selectedMapId) return <MapsView onOpenEditor={handleOpenEditor} />;
        return <EditorView mapId={selectedMapId} onBack={handleBackFromEditor} />;
      case 'characters':
        return <CharactersView />;
      default:
        return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {currentView !== 'editor' && <Header />}
      <div className="flex flex-1 overflow-hidden">
        {currentView !== 'editor' && <Sidebar currentView={currentView} onNavigate={setCurrentView} />}
        <main className={`flex-1 overflow-y-auto ${currentView !== 'editor' ? 'p-6' : ''}`}>
          {renderView()}
        </main>
      </div>
      <Toaster />
    </div>
  );
}

export default App;
