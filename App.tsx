import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { Player } from './components/Player.tsx';
import { MobileNav } from './components/MobileNav.tsx';
import { FullScreenPlayer } from './components/FullScreenPlayer.tsx';
import { CreatePlaylistModal } from './components/CreatePlaylistModal.tsx';
import { AddToPlaylistModal } from './components/AddToPlaylistModal.tsx';
import { DeletePlaylistModal } from './components/DeletePlaylistModal.tsx';
import { ProfileModal } from './components/ProfileModal.tsx';
import { Auth } from './components/Auth.tsx';
import { Home } from './pages/Home.tsx';
import { Search } from './pages/Search.tsx';
import { Library } from './pages/Library.tsx';

const MainView = () => {
  const { view } = useStore();

  const renderContent = () => {
    switch (view.type) {
      case 'HOME': return <Home />;
      case 'SEARCH': return <Search />;
      case 'LIBRARY': return <Library />;
      case 'PLAYLIST': return <Library />;
      case 'ALBUM': return <Library />;
      case 'ARTIST': return <Library />;
      case 'CHARTS': return <Library />;
      default: return <Home />;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background min-h-0 overflow-hidden relative">
      {renderContent()}
    </div>
  );
};

const AppContent = () => {
    const { currentUser } = useStore();

    if (!currentUser) {
        return <Auth />;
    }

    return (
        <div className="flex h-screen w-full bg-black text-white font-sans overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
           <div className="h-16 w-full absolute top-0 left-0 bg-gradient-to-b from-black/20 to-transparent z-20 pointer-events-none" />
           <MainView />
           <MobileNav />
           <Player />
           <FullScreenPlayer />
           <CreatePlaylistModal />
           <AddToPlaylistModal />
           <DeletePlaylistModal />
           <ProfileModal />
        </main>
      </div>
    );
};

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}