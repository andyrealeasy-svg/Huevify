import React, { Component, ReactNode } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Sidebar } from './components/Sidebar';
import { Player } from './components/Player';
import { MobileNav } from './components/MobileNav';
import { FullScreenPlayer } from './components/FullScreenPlayer';
import { CreatePlaylistModal } from './components/CreatePlaylistModal';
import { AddToPlaylistModal } from './components/AddToPlaylistModal';
import { DeletePlaylistModal } from './components/DeletePlaylistModal';
import { ProfileModal } from './components/ProfileModal';
import { ArtistHub } from './components/ArtistHub';
import { Auth } from './components/Auth';
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { Library } from './pages/Library';
import { XCircle, CheckCircle, ShieldAlert } from './components/Icons';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen w-full bg-black text-white p-4 text-center">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-4">
             <span className="text-2xl font-bold">!</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Something went wrong.</h1>
          <p className="text-secondary mb-6">Please try reloading the page.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-2 bg-white text-black font-bold rounded-full hover:scale-105 transition"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

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
    <ErrorBoundary>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </ErrorBoundary>
  );
}