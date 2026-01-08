import React, { useState } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Search as SearchIcon, Play, Heart, ListMusic, User, ArrowLeft } from '../components/Icons.tsx';

const formatDuration = (seconds: number) => {
    // Ensure seconds is an integer to avoid float residuals like .123 showing up in modulo
    const totalSeconds = Math.floor(seconds);
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
};

const formatPlays = (plays: number) => {
    return new Intl.NumberFormat('en-US').format(plays);
};

export const Search = () => {
  const { tracks, playlists, playTrack, isLiked, toggleLike, setView, currentUser, existingArtists, artistAccounts, goToArtist, view, albums, goBack, appSettings, getTrackCover } = useStore();
  const [query, setQuery] = useState("");

  const filteredTracks = tracks.filter(t => {
    const matchesQuery = t.title.toLowerCase().includes(query.toLowerCase()) || 
    t.artist.toLowerCase().includes(query.toLowerCase()) ||
    t.album.toLowerCase().includes(query.toLowerCase());
    
    if (!appSettings.allowExplicitContent && t.explicit) return false;
    
    return matchesQuery;
  });

  // Filter Public Playlists
  const filteredPlaylists = playlists.filter(p => 
    !p.isSystem && 
    p.isPublic &&
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  // Filter Artists
  const filteredArtists = existingArtists.filter(a => a.toLowerCase().includes(query.toLowerCase()));

  // Restricted Genres (Removed Indie, Rock, Jazz)
  const genres = [
    { name: 'Pop', color: 'bg-pink-600' },
    { name: 'Rap/Hip-Hop', color: 'bg-orange-600' },
    { name: 'R&B', color: 'bg-purple-600' },
    { name: 'Electronic/Dance', color: 'bg-teal-600' }
  ];

  const getArtistImage = (name: string) => {
      const acc = artistAccounts.find(a => a.artistName === name);
      if (acc && acc.avatar) return acc.avatar;
      const track = tracks.find(t => t.artist === name);
      return track ? getTrackCover(track) : null;
  };

  const getGenreImage = (genreName: string) => {
      // Find top track in this genre to show as tile background
      const genreTracks = tracks.filter(t => t.genre === genreName || t.genre?.includes(genreName));
      if(genreTracks.length === 0) return null;
      const topTrack = genreTracks.sort((a,b) => b.plays - a.plays)[0];
      return getTrackCover(topTrack);
  };

  // --- GENRE VIEW ---
  if (view.type === 'GENRE') {
      const genreName = view.id;
      const genreTracks = tracks.filter(t => {
          const match = t.genre === genreName || (t.genre && t.genre.includes(genreName));
          if (!appSettings.allowExplicitContent && t.explicit) return false;
          return match;
      });
      
      // Filter albums: Must match genre AND NOT be a Single
      const genreAlbums = albums.filter(a => {
          if (a.type === 'Single') return false; 
          const track = tracks.find(t => t.id === a.trackIds[0]);
          return track && (track.genre === genreName || track.genre?.includes(genreName));
      });
      
      const genreColor = genres.find(g => g.name === genreName)?.color || 'bg-gray-600';

      return (
          <div className="h-full overflow-y-auto pb-32 relative w-full page-enter">
              <div className={`p-8 ${genreColor} bg-gradient-to-b from-transparent to-background/90 animate-appear`}>
                   <div className="absolute top-4 left-4 z-20">
                      <button onClick={goBack} className="w-8 h-8 bg-black/30 rounded-full flex items-center justify-center text-white"><ArrowLeft size={20}/></button>
                   </div>
                   <h1 className="text-4xl md:text-6xl font-bold mt-8 mb-4">{genreName}</h1>
                   <p className="text-white/80 font-bold">Discover the best {genreName} tracks and releases.</p>
              </div>

              <div className="px-4 md:px-8 py-4 animate-slide-up">
                  
                  {/* Genre Albums */}
                  {genreAlbums.length > 0 && (
                      <div className="mb-8">
                          <h2 className="text-2xl font-bold mb-4">Popular Releases</h2>
                          <div className="flex overflow-x-auto gap-4 pb-4 snap-x no-scrollbar">
                              {genreAlbums.map(album => (
                                  <div 
                                    key={album.id} 
                                    onClick={() => setView({ type: 'ALBUM', id: album.id })}
                                    className="w-[150px] md:w-[180px] p-3 md:p-4 bg-surface hover:bg-surface-highlight rounded-lg cursor-pointer group snap-start flex-shrink-0 hover-scale"
                                  >
                                      <div className="relative mb-3 md:mb-4 w-full aspect-square">
                                          <img src={album.covers[0]} className="w-full h-full object-cover rounded shadow-lg" />
                                          <div className="absolute bottom-2 right-2 w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                              <Play fill="black" size={24} className="text-black ml-1" />
                                          </div>
                                      </div>
                                      <div className="font-bold truncate text-sm md:text-base">{album.title}</div>
                                      <div className="text-xs md:text-sm text-secondary truncate">{album.artist}</div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* Genre Tracks */}
                  <h2 className="text-2xl font-bold mb-4">All Tracks</h2>
                  <div className="flex flex-col gap-2">
                      {genreTracks.length === 0 && <div className="text-secondary">No tracks found in this genre.</div>}
                      {genreTracks.map((track, idx) => (
                          <div 
                             key={track.id} 
                             className="grid grid-cols-[16px_1fr_60px] md:grid-cols-[16px_1fr_100px_60px] items-center gap-4 p-3 rounded hover:bg-surface-highlight group"
                          >
                             <div className="flex items-center justify-center" onClick={() => playTrack(track)}>
                                <div className="text-secondary text-center group-hover:hidden text-sm">{idx + 1}</div>
                                <div className="hidden group-hover:block cursor-pointer"><Play size={16} fill="white"/></div>
                             </div>
                             
                             <div className="flex items-center gap-4 overflow-hidden" onClick={() => playTrack(track)}>
                                <img src={getTrackCover(track)} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                                <div className="flex flex-col overflow-hidden">
                                  <div className="font-semibold text-white flex items-center gap-2 truncate cursor-pointer hover:underline">
                                      {track.title}
                                      {track.explicit && <span className="text-[8px] border border-secondary text-secondary px-1 rounded bg-surface">E</span>}
                                  </div>
                                  <div className="text-sm text-secondary truncate">{track.artist}</div>
                                </div>
                             </div>

                             <div className="text-secondary text-sm hidden md:block text-right">{formatPlays(track.plays)}</div>
                             
                             <div className="flex items-center gap-4 justify-end">
                                <span className="text-sm text-secondary hidden md:block">{formatDuration(track.duration)}</span>
                                <button onClick={() => toggleLike(track.id)} className={`${isLiked(track.id) ? 'text-primary' : 'text-transparent group-hover:text-secondary hover:text-white'}`}>
                                  <Heart size={18} fill={isLiked(track.id) ? 'currentColor' : 'none'} />
                                </button>
                             </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      );
  }

  // --- SEARCH VIEW ---
  return (
    <div className="p-8 pb-32 bg-background flex-1 overflow-y-auto h-full page-enter">
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

      {query ? (
        <div className="flex flex-col gap-8 animate-in fade-in">
           
           {/* Artists Section */}
           {filteredArtists.length > 0 && (
               <div>
                   <h2 className="text-xl font-bold mb-4">Artists</h2>
                   <div className="flex gap-4 overflow-x-auto pb-2">
                       {filteredArtists.map(artist => (
                           <div key={artist} onClick={() => goToArtist(artist)} className="flex flex-col items-center gap-2 cursor-pointer hover:bg-surface-highlight p-4 rounded-lg transition min-w-[140px]">
                               <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-800 shadow-lg">
                                   {getArtistImage(artist) ? (
                                       <img src={getArtistImage(artist)!} className="w-full h-full object-cover"/>
                                   ) : (
                                       <User size={48} className="text-secondary m-auto h-full p-4"/>
                                   )}
                               </div>
                               <div className="font-bold text-center">{artist}</div>
                               <div className="text-xs text-secondary bg-surface-highlight px-2 py-1 rounded-full">Artist</div>
                           </div>
                       ))}
                   </div>
               </div>
           )}

           {/* Songs Section */}
           {filteredTracks.length > 0 && (
             <div>
                <h2 className="text-xl font-bold mb-4">Songs</h2>
                <div className="flex flex-col gap-2">
                 {filteredTracks.map(track => (
                   <div 
                     key={track.id} 
                     className="flex items-center justify-between p-3 rounded hover:bg-surface-highlight group"
                   >
                     <div className="flex items-center gap-4 flex-1" onClick={() => playTrack(track)}>
                        <div className="relative w-10 h-10">
                          <img src={getTrackCover(track)} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Play size={16} fill="white" />
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center gap-2">
                              {track.title}
                              {track.explicit && <span className="text-[8px] border border-secondary text-secondary px-1 rounded bg-surface">E</span>}
                          </div>
                          <div className="text-sm text-secondary">{track.artist}</div>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <span className="text-sm text-secondary hidden md:block">{formatDuration(track.duration)}</span>
                        <button onClick={() => toggleLike(track.id)} className={`${isLiked(track.id) ? 'text-primary' : 'text-secondary hover:text-white'}`}>
                          <Heart size={18} fill={isLiked(track.id) ? 'currentColor' : 'none'} />
                        </button>
                     </div>
                   </div>
                 ))}
                </div>
             </div>
           )}

           {/* Public Playlists Section */}
           {filteredPlaylists.length > 0 && (
               <div>
                   <h2 className="text-xl font-bold mb-4">Public Playlists</h2>
                   <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                       {filteredPlaylists.map(pl => {
                            let cover = pl.customCover;
                            if (!cover && pl.tracks.length > 0) {
                                const t = tracks.find(t => t.id === pl.tracks[0]);
                                if (t) cover = getTrackCover(t);
                            }
                            return (
                                <div 
                                    key={pl.id} 
                                    onClick={() => setView({ type: 'PLAYLIST', id: pl.id })}
                                    className="p-4 bg-surface hover:bg-surface-highlight rounded-lg cursor-pointer transition group hover-scale"
                                >
                                    <div className="aspect-square mb-4 shadow-lg flex items-center justify-center rounded-md overflow-hidden bg-surface-highlight relative">
                                        {cover ? (
                                            <img src={cover} alt={pl.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <ListMusic size={32} className="text-secondary" />
                                        )}
                                        {/* Overlay Play Button */}
                                        <div className="absolute bottom-2 right-2 w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                            <Play fill="black" size={20} className="text-black ml-1" />
                                        </div>
                                    </div>
                                    <h3 className="font-bold truncate text-white">{pl.name}</h3>
                                    <p className="text-sm text-secondary truncate">By {pl.creatorName}</p>
                                </div>
                            );
                       })}
                   </div>
               </div>
           )}

           {filteredTracks.length === 0 && filteredPlaylists.length === 0 && filteredArtists.length === 0 && (
                <div className="text-secondary text-lg text-center mt-10">No results found for "{query}"</div>
           )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 animate-appear">
           {/* Genres Tiles */}
           {genres.map(genre => {
             const cover = getGenreImage(genre.name);
             return (
             <div 
               key={genre.name} 
               onClick={() => setView({ type: 'GENRE', id: genre.name })}
               className={`aspect-[2/1] ${genre.color} rounded-lg p-6 font-bold text-3xl md:text-4xl relative overflow-hidden cursor-pointer hover:scale-[1.02] transition shadow-lg group`}
             >
                <span className="relative z-10">{genre.name}</span>
                {cover && (
                    <div className="absolute -bottom-4 -right-8 w-32 h-32 rotate-[25deg] rounded-lg group-hover:rotate-[30deg] group-hover:scale-110 transition shadow-2xl overflow-hidden">
                        <img src={cover} className="w-full h-full object-cover" />
                    </div>
                )}
             </div>
           )})}
        </div>
      )}
    </div>
  );
};