import { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { TilesView } from './pages/TilesView';
import { ObjectsView } from './pages/ObjectsView';
import { TileSetsView } from './pages/TileSetsView';
import { PrefabsView } from './pages/PrefabsView';
import { MapsView } from './pages/MapsView';
import { EditorView } from './pages/EditorView';
import { GameTestView } from './pages/GameTestView';
import { CharactersView } from './pages/CharactersView';
import SpritesView from './pages/SpritesView';
import SpritesLibraryView from './pages/SpritesLibraryView';
import { Dashboard } from './pages/Dashboard';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from './components/ErrorBoundary';

export type ViewType = 'dashboard' | 'tiles' | 'objects' | 'tileSets' | 'prefabs' | 'maps' | 'editor' | 'gameTest' | 'characters' | 'sprites' | 'spriteEditor';
export type PaletteTab = 'tiles' | 'objects' | 'characters' | 'npcs';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [selectedSpriteId, setSelectedSpriteId] = useState<string | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  const handleOpenEditor = (mapId: string) => {
    setSelectedMapId(mapId);
    setCurrentView('editor');
  };

  const handleBackFromEditor = () => {
    setSelectedMapId(null);
    setCurrentView('maps');
  };

  const handleOpenGameTest = (mapId: string, characterId: string) => {
    setSelectedMapId(mapId);
    setSelectedCharacterId(characterId);
    setCurrentView('gameTest');
  };

  const handleBackFromGameTest = () => {
    setSelectedMapId(null);
    setSelectedCharacterId(null);
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
        return <MapsView onOpenEditor={handleOpenEditor} onOpenGameTest={handleOpenGameTest} />;
      case 'editor':
        if (!selectedMapId) return <MapsView onOpenEditor={handleOpenEditor} onOpenGameTest={handleOpenGameTest} />;
        return <EditorView mapId={selectedMapId} onBack={handleBackFromEditor} />;
      case 'gameTest':
        if (!selectedMapId || !selectedCharacterId) return <MapsView onOpenEditor={handleOpenEditor} onOpenGameTest={handleOpenGameTest} />;
        return <GameTestView mapId={selectedMapId} characterId={selectedCharacterId} onBack={handleBackFromGameTest} />;
      case 'characters':
        return <CharactersView />;
      case 'sprites':
        return <SpritesLibraryView onNavigate={(spriteId) => {
          setSelectedSpriteId(spriteId);
          setCurrentView('spriteEditor');
        }} />;
      case 'spriteEditor':
        if (!selectedSpriteId) return <SpritesLibraryView onNavigate={(spriteId) => {
          setSelectedSpriteId(spriteId);
          setCurrentView('spriteEditor');
        }} />;
        return (
          <ErrorBoundary name="SpritesView">
            <SpritesView spriteId={selectedSpriteId} onBack={() => {
              setSelectedSpriteId(null);
              setCurrentView('sprites');
            }} />
          </ErrorBoundary>
        );
      default:
        return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {currentView !== 'editor' && currentView !== 'gameTest' && <Header />}
      <div className="flex flex-1 overflow-hidden">
        {currentView !== 'editor' && currentView !== 'gameTest' && <Sidebar currentView={currentView} onNavigate={setCurrentView} />}
        <main className={`flex-1 overflow-y-auto ${currentView !== 'editor' && currentView !== 'gameTest' ? 'p-6' : ''}`}>
          {renderView()}
        </main>
      </div>
      <Toaster />
    </div>
  );
}

export default App;
