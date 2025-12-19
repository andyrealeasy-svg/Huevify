import React, { useState } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Search as SearchIcon, Play, Heart } from '../components/Icons.tsx';

export const Search = () => {
  const { tracks, playTrack, isLiked, toggleLike } = useStore();
  const [query, setQuery] = useState("");

  const filteredTracks = tracks.filter(t => 
    t.title.toLowerCase().includes(query.toLowerCase()) || 
    t.artist.toLowerCase().includes(query.toLowerCase()) ||
    t.album.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="p-8 pb-32 bg-background flex-1 overflow-y-auto h-full">
      <div className="mb-8 relative">
        <SearchIcon className="absolute left-4 top-3.5 text-black" size={24} />
        <input 
          type="text" 
          placeholder="What do you want to listen to?" 
          className="w-full md:w-96 py-3 pl-12 pr-4 rounded-full text-black font-semibold focus:outline-none focus:ring-2 focus:ring-white"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {query && (
        <div className="flex flex-col gap-2">
           <h2 className="text-xl font-bold mb-4">Songs</h2>
           {filteredTracks.length === 0 ? (
             <div className="text-secondary">No results found for "{query}"</div>
           ) : (
             filteredTracks.map(track => (
               <div 
                 key={track.id} 
                 className="flex items-center justify-between p-3 rounded hover:bg-surface-highlight group"
               >
                 <div className="flex items-center gap-4 flex-1" onClick={() => playTrack(track)}>
                    <div className="relative w-10 h-10">
                      <img src={track.cover} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Play size={16} fill="white" />
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-white">{track.title}</div>
                      <div className="text-sm text-secondary">{track.artist}</div>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <span className="text-sm text-secondary hidden md:block">{Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2,'0')}</span>
                    <button onClick={() => toggleLike(track.id)} className={`${isLiked(track.id) ? 'text-primary' : 'text-secondary hover:text-white'}`}>
                      <Heart size={18} fill={isLiked(track.id) ? 'currentColor' : 'none'} />
                    </button>
                 </div>
               </div>
             ))
           )}
        </div>
      )}

      {!query && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           {/* Categories placeholders */}
           {['Pop', 'Hip-Hop', 'Rock', 'Electronic', 'Indie', 'Focus', 'Sleep', 'Jazz'].map(genre => (
             <div key={genre} className="aspect-square bg-surface-highlight rounded-lg p-4 font-bold text-2xl relative overflow-hidden cursor-pointer hover:bg-surface">
                {genre}
                <div className="absolute -bottom-2 -right-4 w-24 h-24 bg-gradient-to-br from-transparent to-black/50 rotate-12 rounded"></div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};