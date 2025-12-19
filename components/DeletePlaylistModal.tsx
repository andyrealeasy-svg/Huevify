import React from 'react';
import { useStore } from '../context/StoreContext.tsx';

export const DeletePlaylistModal = () => {
  const { 
    isDeleteModalOpen, closeDeleteModal, confirmDeletePlaylist, playlistToDelete, playlists 
  } = useStore();

  if (!isDeleteModalOpen) return null;

  const playlistName = playlists.find(p => p.id === playlistToDelete)?.name || "this playlist";

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-sm rounded-lg p-6 relative shadow-2xl border border-surface-highlight animate-in fade-in zoom-in duration-200">
        <h2 className="text-xl font-bold mb-4">Delete from Library?</h2>
        <p className="text-secondary mb-6 text-sm">
          This will delete <span className="font-bold text-white">{playlistName}</span> from Your Library.
        </p>
        
        <div className="flex gap-4 justify-end">
            <button 
                onClick={closeDeleteModal}
                className="px-6 py-2 rounded-full font-bold text-white hover:scale-105 transition"
            >
                Cancel
            </button>
            <button 
                onClick={confirmDeletePlaylist}
                className="px-6 py-2 rounded-full font-bold bg-white text-black hover:scale-105 transition hover:bg-red-500 hover:text-white"
            >
                Delete
            </button>
        </div>
      </div>
    </div>
  );
};