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
import { ArtistHub } from './components/ArtistHub.tsx';
import { Auth } from './components/Auth.tsx';
import { Home } from './pages/Home.tsx';
import { Search } from './pages/Search.tsx';
import { Library } from './pages/Library.tsx';
import { XCircle, CheckCircle, ShieldAlert } from './components/Icons.tsx';

const NotificationOverlay = () => {
    const { notifications, dismissNotification } = useStore();

    if (notifications.length === 0) return null;

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
            {notifications.map(n => (
                <div 
                    key={n.id} 
                    className={`p-4 rounded-lg shadow-2xl flex items-center justify-between gap-3 animate-slide-in-bottom pointer-events-auto ${
                        n.type === 'error' ? 'bg-red-600 text-white' : 
                        n.type === 'success' ? 'bg-green-600 text-white' : 
                        'bg-surface-highlight text-white border border-primary'
                    }`}
                >
                    <div className="flex items-center gap-3">
                        {n.type === 'error' && <XCircle size={20}/>}
                        {n.type === 'success' && <CheckCircle size={20}/>}
                        {n.type === 'info' && <ShieldAlert size={20}/>}
                        <span className="text-sm font-bold">{n.message}</span>
                    </div>
                    <button onClick={() => dismissNotification(n.id)} className="text-white/80 hover:text-white">OK</button>
                </div>
            ))}
        </div>
    );
};

const MainView = () => {
  const { view } = useStore();

  const renderContent = () => {
    switch (view.type) {
      case 'HOME': return <Home />;
      case 'SEARCH': return <Search />;
      case 'GENRE': return <Search />;
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
        </main>
        
        {/* Modals and Overlays moved outside of main to ensure correct stacking context */}
        <Player />
        <FullScreenPlayer />
        <CreatePlaylistModal />
        <AddToPlaylistModal />
        <DeletePlaylistModal />
        <ProfileModal />
        <ArtistHub />
        <NotificationOverlay />
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
