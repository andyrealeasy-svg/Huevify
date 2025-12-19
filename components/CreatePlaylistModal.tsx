import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { X, Image } from './Icons.tsx';

export const CreatePlaylistModal = () => {
  const { 
    isCreatePlaylistOpen, setCreatePlaylistOpen, createPlaylist, editPlaylist,
    playlistIdToEdit, playlists 
  } = useStore();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreatePlaylistOpen) {
      if (playlistIdToEdit) {
        const pl = playlists.find(p => p.id === playlistIdToEdit);
        if (pl) {
            setName(pl.name);
            setDescription(pl.description || "");
            setCover(pl.customCover || null);
        }
      } else {
        setName("");
        setDescription("");
        setCover(null);
      }
    }
  }, [isCreatePlaylistOpen, playlistIdToEdit, playlists]);

  if (!isCreatePlaylistOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCover(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return alert("Name is required");
    
    if (playlistIdToEdit) {
        editPlaylist(playlistIdToEdit, name, description, cover || undefined);
    } else {
        createPlaylist(name, description, cover || undefined);
    }
    
    setCreatePlaylistOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-md rounded-lg p-6 relative shadow-2xl border border-surface-highlight animate-in fade-in zoom-in duration-200">
        <button 
          onClick={() => setCreatePlaylistOpen(false)} 
          className="absolute top-4 right-4 text-secondary hover:text-white"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold mb-6 text-center">{playlistIdToEdit ? 'Edit Playlist' : 'Create Playlist'}</h2>

        <div className="flex flex-col gap-6">
          <div className="flex justify-center">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-40 h-40 bg-surface-highlight rounded shadow-inner flex flex-col items-center justify-center cursor-pointer hover:bg-[#333] transition relative overflow-hidden group"
            >
              {cover ? (
                <img src={cover} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Image size={48} className="text-secondary mb-2" />
                  <span className="text-xs text-secondary font-bold">Choose Photo</span>
                </>
              )}
              
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                 <span className="text-white font-bold">Edit</span>
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange}
            />
          </div>

          <div className="flex flex-col gap-4">
            <input 
              type="text" 
              placeholder="Playlist Name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-surface-highlight text-white p-3 rounded focus:outline-none focus:ring-1 focus:ring-white font-bold"
            />
            <textarea 
              placeholder="Description" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-surface-highlight text-white p-3 rounded focus:outline-none focus:ring-1 focus:ring-white resize-none h-24 text-sm"
            />
          </div>

          <div className="flex justify-end">
            <button 
              onClick={handleSave}
              className="bg-white text-black font-bold py-3 px-8 rounded-full hover:scale-105 transition"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};