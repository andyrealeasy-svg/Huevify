import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Sidebar } from './components/Sidebar';
import { Player } from './components/Player';
import { MobileNav } from './components/MobileNav';
import { FullScreenPlayer } from './components/FullScreenPlayer';
import { CreatePlaylistModal } from './components/CreatePlaylistModal';
import { AddToPlaylistModal } from './components/AddToPlaylistModal';
import { DeletePlaylistModal } from './components/DeletePlaylistModal';
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { Library } from './pages/Library';

const MainView = () => {
  const { view } = useStore();

  const renderContent = () => {
    switch (view.type) {
      case 'HOME': return <Home />;
      case 'SEARCH': return <Search />;
      case 'LIBRARY': return <Library />;
      case 'PLAYLIST': return <Library />; // Reusing library component for detail view
      case 'ALBUM': return <Library />;
      case 'ARTIST': return <Library />;
      case 'CHARTS': return <Library />;
      default: return <Home />;
    }
  };

  // Removed overflow-y-auto here because individual pages handle their own scrolling
  // This allows sticky headers inside pages to work correctly against the page viewport
  return (
    <div className="flex-1 flex flex-col bg-background min-h-0 overflow-hidden relative">
      {renderContent()}
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <div className="flex h-screen w-full bg-black text-white font-sans overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
           {/* Top bar filler to prevent content from hiding behind transparent sticky headers too awkwardly */}
           <div className="h-16 w-full absolute top-0 left-0 bg-gradient-to-b from-black/20 to-transparent z-20 pointer-events-none" />
           <MainView />
           <MobileNav />
           <Player />
           <FullScreenPlayer />
           <CreatePlaylistModal />
           <AddToPlaylistModal />
           <DeletePlaylistModal />
        </main>
      </div>
    </StoreProvider>
  );
}