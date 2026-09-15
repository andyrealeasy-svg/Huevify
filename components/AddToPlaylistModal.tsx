import React from 'react';
import { useStore } from '../context/StoreContext';
import { X, ListMusic, Plus, Check } from './Icons';

export const AddToPlaylistModal = () => {
  const { 
    isAddToPlaylistOpen, closeAddToPlaylist, playlists, addToPlaylist, removeFromPlaylist, trackIdToAdd, 
    setCreatePlaylistOpen, setPlaylistIdToEdit, t, currentUser, appSettings
  } = useStore();
  const isLiquidGlass = appSettings?.liquidGlassNav !== false;

  if (!isAddToPlaylistOpen || !trackIdToAdd) return null;

  // Show only playlists created and owned by the current user (exclude system and other users' playlists)
  const userPlaylists = playlists.filter(p => {
    if (p.isSystem || p.id.startsWith('liked') || p.id === 'liked') return false;
    if (currentUser) {
      return p.ownerId === currentUser.id;
    }
    return !p.ownerId || p.ownerId === 'guest';
  });

  const handleToggle = (pl: (typeof playlists)[0]) => {
    if (pl.tracks && pl.tracks.includes(trackIdToAdd)) {
      removeFromPlaylist(pl.id, trackIdToAdd);
    } else {
      addToPlaylist(pl.id, trackIdToAdd);
    }
    closeAddToPlaylist();
  };

  const handleCreateNew = () => {
    closeAddToPlaylist();
    setPlaylistIdToEdit(null);
    setCreatePlaylistOpen(true);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4">
      <div 
        className={`w-full max-w-sm p-4 relative transition-all duration-200 animate-in fade-in zoom-in ${
          isLiquidGlass
            ? 'max-md:bg-[#15151e]/85 max-md:backdrop-blur-3xl max-md:border max-md:border-white/20 max-md:rounded-3xl max-md:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.3)] md:bg-surface md:rounded-lg md:border md:border-surface-highlight md:shadow-2xl'
            : 'bg-surface rounded-lg border border-surface-highlight shadow-2xl'
        }`}
      >
        <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
            <h2 className="text-xl font-bold">{t('addToPlaylist')}</h2>
            <button onClick={closeAddToPlaylist} className="text-secondary hover:text-white"><X size={24}/></button>
        </div>

        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto mb-4">
            <button 
                onClick={handleCreateNew}
                className={`flex items-center gap-3 p-3 transition text-left ${
                  isLiquidGlass
                    ? 'max-md:rounded-2xl max-md:bg-white/[0.06] max-md:hover:bg-white/[0.12] max-md:border max-md:border-white/10 md:rounded md:hover:bg-surface-highlight'
                    : 'rounded hover:bg-surface-highlight'
                }`}
            >
                <div className="w-12 h-12 bg-surface-highlight flex items-center justify-center rounded">
                    <Plus size={24} />
                </div>
                <span className="font-bold">{t('newPlaylist')}</span>
            </button>

            {userPlaylists.map(pl => {
                const isAlreadyIn = (pl.tracks || []).includes(trackIdToAdd);
                return (
                  <button 
                      key={pl.id}
                      onClick={() => handleToggle(pl)}
                      className={`flex items-center justify-between gap-3 p-2 transition text-left group ${
                        isLiquidGlass
                          ? 'max-md:rounded-2xl max-md:bg-white/[0.06] max-md:hover:bg-white/[0.12] max-md:border max-md:border-white/10 md:rounded md:hover:bg-surface-highlight'
                          : 'rounded hover:bg-surface-highlight'
                      }`}
                  >
                      <div className="flex items-center gap-3 overflow-hidden min-w-0">
                          <div className="w-12 h-12 bg-surface-highlight flex items-center justify-center rounded overflow-hidden shrink-0">
                               {pl.customCover ? <img src={pl.customCover} className="w-full h-full object-cover"/> : <ListMusic className="text-secondary"/>}
                          </div>
                          <div className="flex flex-col overflow-hidden">
                              <span className="font-bold truncate text-white">{pl.name}</span>
                              <span className="text-xs text-secondary">{pl.tracks.length} {t('songs')}</span>
                          </div>
                      </div>
                      {isAlreadyIn && (
                          <div className="shrink-0 mr-1 p-1 bg-primary/20 rounded-full text-primary">
                              <Check size={16} />
                          </div>
                      )}
                  </button>
                );
            })}
        </div>
      </div>
    </div>
  );
};