import React from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Home, Search, Library, PlusSquare, Heart, Trash2, ListMusic, Plus, User as UserIcon } from './Icons.tsx';
import { ViewState } from '../types.ts';

export const Sidebar = () => {
  const { setView, playlists, deletePlaylist, view, setCreatePlaylistOpen, setPlaylistIdToEdit, tracks, currentUser, setProfileModalOpen } = useStore();

  const isActive = (type: ViewState['type'], id?: string) => {
    if (view.type !== type) return false;
    if (id && view.type === 'PLAYLIST' && (view as any).id !== id) return false;
    return true;
  };

  const navClass = (active: boolean) => 
    `flex items-center gap-4 px-4 py-2 cursor-pointer transition font-bold text-sm ${active ? 'text-white' : 'text-secondary hover:text-white'}`;

  const handleCreate = () => {
    setPlaylistIdToEdit(null); 
    setCreatePlaylistOpen(true);
  };

  return (
    <div className="w-64 bg-black h-full flex flex-col pt-6 pb-24 hidden md:flex">
      <div className="px-6 mb-2">
        <h1 className="text-2xl font-bold text-white tracking-tighter flex items-center gap-2">
          <span className="w-8 h-8 bg-huevify rounded-full flex items-center justify-center text-lg">H</span>
          Huevify
        </h1>
      </div>

      {/* User Profile Desktop */}
      {currentUser && (
        <div 
            onClick={() => setProfileModalOpen(true)}
            className="mx-4 mb-4 mt-2 p-2 rounded hover:bg-surface-highlight cursor-pointer flex items-center gap-3 transition group"
        >
            <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden flex items-center justify-center border border-transparent group-hover:border-white transition-colors">
                {currentUser.avatar ? (
                    <img src={currentUser.avatar} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                    <UserIcon size={16} className="text-secondary" />
                )}
            </div>
            <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold truncate text-white">{currentUser.displayName}</span>
                <span className="text-[10px] font-bold text-secondary uppercase">View Profile</span>
            </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div onClick={() => setView({ type: 'HOME' })} className={navClass(isActive('HOME'))}>
          <Home size={24} />
          Home
        </div>
        <div onClick={() => setView({ type: 'SEARCH' })} className={navClass(isActive('SEARCH'))}>
          <Search size={24} />
          Search
        </div>
        <div onClick={() => setView({ type: 'LIBRARY' })} className={navClass(isActive('LIBRARY'))}>
          <Library size={24} />
          Your Library
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-surface-highlight mx-4"></div>

      <div className="flex flex-col gap-3 px-4 mt-2">
        
        <div 
            onClick={handleCreate} 
            className="flex items-center gap-3 cursor-pointer group text-secondary hover:text-white transition"
        >
            <div className="w-12 h-12 bg-surface-highlight group-hover:bg-white transition-colors flex items-center justify-center rounded-sm shrink-0">
               <Plus size={20} className="text-secondary group-hover:text-black" />
            </div>
            <span className="font-bold text-sm">Create Playlist</span>
        </div>

        <div 
            onClick={() => setView({ type: 'PLAYLIST', id: 'liked' })} 
            className={`flex items-center gap-3 cursor-pointer group transition ${isActive('PLAYLIST', 'liked') ? 'text-white' : 'text-secondary hover:text-white'}`}
        >
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-700 to-blue-300 flex items-center justify-center rounded-sm shrink-0">
            <Heart size={20} fill="white" className="text-white" />
          </div>
          <span className="font-bold text-sm">Liked Songs</span>
        </div>
      </div>

      <div className="mt-4 px-4 border-t border-surface-highlight pt-4 flex-1 overflow-y-auto">
        <ul className="flex flex-col gap-3">
          {playlists.filter(p => !p.isSystem).map(pl => {
              let cover = pl.customCover;
              if (!cover && pl.tracks.length > 0) {
                  cover = tracks.find(t => t.id === pl.tracks[0])?.cover;
              }

              return (
                <li 
                    key={pl.id} 
                    onClick={() => setView({ type: 'PLAYLIST', id: pl.id })}
                    className={`flex items-center gap-3 cursor-pointer group transition ${isActive('PLAYLIST', pl.id) ? 'bg-surface-highlight rounded' : ''}`}
                >
                    <div className="w-10 h-10 bg-surface-highlight rounded-sm overflow-hidden shrink-0 flex items-center justify-center">
                        {cover ? (
                            <img src={cover} alt={pl.name} className="w-full h-full object-cover" />
                        ) : (
                            <ListMusic size={16} className="text-secondary" />
                        )}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className={`truncate text-sm font-medium ${isActive('PLAYLIST', pl.id) ? 'text-primary' : 'text-secondary group-hover:text-white'}`}>
                            {pl.name}
                        </span>
                        <span className="text-xs text-secondary truncate">Playlist</span>
                    </div>
                </li>
              );
          })}
        </ul>
      </div>
    </div>
  );
};