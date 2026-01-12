import React from 'react';
import { useStore } from '../context/StoreContext';
import { X, ListMusic, Plus } from './Icons';

export const AddToPlaylistModal = () => {
  const { 
    isAddToPlaylistOpen, closeAddToPlaylist, playlists, addToPlaylist, trackIdToAdd, 
    setCreatePlaylistOpen, setPlaylistIdToEdit 
  } = useStore();

  if (!isAddToPlaylistOpen || !trackIdToAdd) return null;

  const userPlaylists = playlists.filter(p => !p.isSystem);

  const handleAdd = (playlistId: string) => {
    addToPlaylist(playlistId, trackIdToAdd);
    closeAddToPlaylist();
  };

  const handleCreateNew = () => {
    closeAddToPlaylist();
    setPlaylistIdToEdit(null);
    setCreatePlaylistOpen(true);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-sm rounded-lg p-4 relative shadow-2xl border border-surface-highlight animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-4 border-b border-surface-highlight pb-2">
            <h2 className="text-xl font-bold">Add to Playlist</h2>
            <button onClick={closeAddToPlaylist} className="text-secondary hover:text-white"><X size={24}/></button>
        </div>

        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto mb-4">
            <button 
                onClick={handleCreateNew}
                className="flex items-center gap-3 p-3 rounded hover:bg-surface-highlight transition text-left"
            >
                <div className="w-12 h-12 bg-surface-highlight flex items-center justify-center rounded">
                    <Plus size={24} />
                </div>
                <span className="font-bold">New Playlist</span>
            </button>

            {userPlaylists.map(pl => (
                <button 
                    key={pl.id}
                    onClick={() => handleAdd(pl.id)}
                    className="flex items-center gap-3 p-2 rounded hover:bg-surface-highlight transition text-left group"
                >
                    <div className="w-12 h-12 bg-surface-highlight flex items-center justify-center rounded overflow-hidden shrink-0">
                         {pl.customCover ? <img src={pl.customCover} className="w-full h-full object-cover"/> : <ListMusic className="text-secondary"/>}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="font-bold truncate text-white">{pl.name}</span>
                        <span className="text-xs text-secondary">{pl.tracks.length} songs</span>
                    </div>
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};