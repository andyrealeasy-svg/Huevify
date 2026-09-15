import React from 'react';
import { useStore } from '../context/StoreContext';

export const DeletePlaylistModal = () => {
  const { 
    isDeleteModalOpen, closeDeleteModal, confirmDeletePlaylist, playlistToDelete, playlists, t, appSettings 
  } = useStore();
  const isLiquidGlass = appSettings?.liquidGlassNav !== false;

  if (!isDeleteModalOpen) return null;

  const playlistName = playlists.find(p => p.id === playlistToDelete)?.name || "this playlist";

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div 
        className={`w-full max-w-sm p-6 relative transition-all duration-200 animate-in fade-in zoom-in ${
          isLiquidGlass
            ? 'max-md:bg-[#15151e]/85 max-md:backdrop-blur-3xl max-md:border max-md:border-white/20 max-md:rounded-3xl max-md:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.3)] md:bg-surface md:rounded-lg md:border md:border-surface-highlight md:shadow-2xl'
            : 'bg-surface rounded-lg border border-surface-highlight shadow-2xl'
        }`}
      >
        <h2 className="text-xl font-bold mb-4">{t('deleteLibTitle')}</h2>
        <p className="text-secondary mb-6 text-sm">
          {t('deleteLibMsg')} <span className="font-bold text-white">{playlistName}</span>.
        </p>
        
        <div className="flex gap-4 justify-end">
            <button 
                onClick={closeDeleteModal}
                className="px-6 py-2 rounded-full font-bold text-white hover:scale-105 transition"
            >
                {t('cancel')}
            </button>
            <button 
                onClick={confirmDeletePlaylist}
                className={`px-6 py-2 rounded-full font-bold transition ${
                  isLiquidGlass
                    ? 'max-md:bg-red-500/90 max-md:text-white max-md:shadow-[0_4px_16px_rgba(239,68,68,0.4),inset_0_1px_0_rgba(255,255,255,0.4)] max-md:active:scale-95 md:bg-white md:text-black md:hover:scale-105 md:hover:bg-red-500 md:hover:text-white'
                    : 'bg-white text-black hover:scale-105 hover:bg-red-500 hover:text-white'
                }`}
            >
                {t('delete')}
            </button>
        </div>
      </div>
    </div>
  );
};