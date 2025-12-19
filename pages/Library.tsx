import React from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Play, Heart, ListMusic, Trash2, ArrowLeft, PlusSquare, Plus, Edit, Mic2 } from '../components/Icons.tsx';

const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
};

const formatPlays = (plays: number) => {
    return new Intl.NumberFormat('en-US').format(plays);
};

export const Library = () => {
  const { 
    view, playlists, tracks, albums, isLiked, toggleLike, playTrack, 
    removeFromPlaylist, goBack, setCreatePlaylistOpen, setPlaylistIdToEdit, setView, 
    toggleAlbumLike, isAlbumLiked, deletePlaylist, openAddToPlaylist, recentlyPlayed,
    goToArtist, getArtistStats, followedArtists, toggleFollowArtist, isArtistFollowed
  } = useStore();

  const handleCreate = () => {
    setPlaylistIdToEdit(null);
    setCreatePlaylistOpen(true);
  };

  const handleEdit = (id: string) => {
      setPlaylistIdToEdit(id);
      setCreatePlaylistOpen(true);
  };

  if (view.type === 'CHARTS') {
      const chartTracks = [...tracks].sort((a, b) => b.plays - a.plays).slice(0, 25);
      return (
        <div className="h-full overflow-y-auto pb-32 relative w-full page-enter">
            <div className="p-8 bg-gradient-to-b from-purple-900 to-background animate-appear">
                 <div className="absolute top-4 left-4 z-20">
                    <button onClick={goBack} className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white"><ArrowLeft size={20}/></button>
                 </div>
                 <h1 className="text-4xl md:text-6xl font-bold mt-8 mb-4">Top 25 Charts</h1>
                 <p className="text-white/70">The most played tracks today.</p>
            </div>
            <div className="px-4 md:px-8 py-4 animate-slide-up">
               {chartTracks.map((track, idx) => (
                   <div key={track.id} className="grid grid-cols-[30px_1fr_60px] md:grid-cols-[30px_4fr_2fr_1fr_60px] gap-4 px-2 py-3 rounded hover:bg-surface-highlight group items-center">
                        <div className="flex justify-center text-xl font-bold text-secondary">{idx + 1}</div>
                        <div className="flex items-center gap-3 overflow-hidden">
                             <img src={track.cover} className="w-10 h-10 rounded" alt="" />
                             <div className="flex flex-col overflow-hidden">
                                <span className="text-white font-medium truncate">{track.title}</span>
                                <span onClick={(e) => { e.stopPropagation(); goToArtist(track.artist); }} className="text-xs text-secondary hover:underline cursor-pointer">{track.artist}</span>
                             </div>
                        </div>
                        <span className="text-secondary text-sm hidden md:block truncate">{formatPlays(track.plays)} plays</span>
                        <span className="text-secondary text-sm hidden md:block">{formatDuration(track.duration)}</span>
                        <div className="flex items-center gap-3 justify-end">
                            <button onClick={() => toggleLike(track.id)} className={`${isLiked(track.id) ? 'text-primary' : 'text-transparent group-hover:text-secondary hover:text-white'}`}>
                                <Heart size={16} fill={isLiked(track.id) ? 'currentColor' : 'none'} />
                            </button>
                            <button onClick={() => playTrack(track)} className="text-white"><Play size={20} fill="white"/></button>
                        </div>
                   </div>
               ))}
            </div>
        </div>
      );
  }

  if (view.type === 'ARTIST') {
      const artistName = (view as any).id;
      const artistTracks = tracks.filter(t => t.artist === artistName);
      const topTracks = [...artistTracks].sort((a, b) => b.plays - a.plays).slice(0, 5);
      const artistAlbums = albums.filter(a => a.artist === artistName);
      
      const { monthlyPlays, globalRank } = getArtistStats(artistName);
      const totalPlays = artistTracks.reduce((acc, t) => acc + t.plays, 0);
      const isFollowing = isArtistFollowed(artistName);

      return (
        <div className="h-full overflow-y-auto pb-32 relative w-full page-enter">
            {/* Artist Header */}
            <div 
                className="relative h-[40vh] bg-cover bg-center flex items-end p-8 animate-appear"
                style={{ backgroundImage: artistTracks.length ? `linear-gradient(to bottom, rgba(0,0,0,0.2), #121212), url(${artistTracks[0].cover})` : '' }}
            >
                <div className="absolute top-4 left-4 z-20">
                    <button onClick={goBack} className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white"><ArrowLeft size={20}/></button>
                </div>
                <div className="relative z-10 w-full">
                    <div className="flex items-center gap-2 mb-2 text-white">
                        <div className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                            <span className="w-3 h-3 bg-white rounded-full flex items-center justify-center"><i className="block w-1 h-1 bg-blue-600 rounded-full"></i></span>
                            Verified Artist
                        </div>
                    </div>
                    <h1 className="text-5xl md:text-8xl font-bold tracking-tight mb-4">{artistName}</h1>
                    <p className="text-white font-medium text-lg drop-shadow-md">{formatPlays(monthlyPlays)} monthly plays</p>
                </div>
            </div>

            <div className="px-4 md:px-8 py-6 animate-slide-up">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => topTracks.length && playTrack(topTracks[0])} className="w-14 h-14 bg-primary rounded-full flex items-center justify-center hover:scale-105 transition shadow-lg">
                        <Play size={28} fill="black" className="ml-1 text-black" />
                    </button>
                    
                    <button 
                        onClick={() => toggleFollowArtist(artistName)}
                        className={`px-6 py-1.5 font-bold text-sm rounded-full uppercase tracking-widest border transition ${isFollowing ? 'border-white text-white hover:bg-white/10' : 'border-secondary text-white hover:border-white'}`}
                    >
                        {isFollowing ? 'Following' : 'Follow'}
                    </button>
                    
                    <button className="text-secondary hover:text-white"><ListMusic size={24}/></button>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Main Content */}
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-4">Popular</h2>
                        <div className="flex flex-col gap-1 mb-8">
                            {topTracks.map((track, idx) => (
                                <div key={track.id} className="grid grid-cols-[20px_1fr_60px] md:grid-cols-[20px_1fr_60px_60px] items-center gap-4 p-2 rounded hover:bg-surface-highlight group cursor-pointer" onClick={() => playTrack(track)}>
                                    <span className="text-secondary text-sm">{idx + 1}</span>
                                    <div className="flex items-center gap-3">
                                        <img src={track.cover} className="w-10 h-10 rounded" alt=""/>
                                        <span className="font-medium text-white truncate">{track.title}</span>
                                    </div>
                                    <span className="text-secondary text-sm hidden md:block">{formatPlays(track.plays)}</span>
                                    <span className="text-secondary text-sm text-right">{formatDuration(track.duration)}</span>
                                </div>
                            ))}
                        </div>

                        <h2 className="text-2xl font-bold mb-4">Discography</h2>
                        <div className="flex overflow-x-auto gap-4 pb-4">
                            {artistAlbums.map(album => (
                                <div key={album.id} onClick={() => setView({type: 'ALBUM', id: album.id})} className="min-w-[150px] bg-surface p-4 rounded-md cursor-pointer hover:bg-surface-highlight hover-scale">
                                    <img src={album.cover} className="w-full aspect-square object-cover rounded mb-2 shadow-lg" />
                                    <div className="font-bold truncate">{album.title}</div>
                                    <div className="text-sm text-secondary">{album.year} • Album</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* About Column */}
                    <div className="w-full md:w-1/3">
                        <h2 className="text-2xl font-bold mb-4">About</h2>
                        <div className="bg-surface rounded-lg overflow-hidden relative group cursor-pointer h-96 hover:scale-[1.02] transition">
                            {topTracks[0] && <img src={topTracks[0].cover} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition" />}
                            <div className="absolute inset-0 p-6 flex flex-col justify-end">
                                <div className="mb-4">
                                    <div className="text-3xl font-bold text-white mb-2">#{globalRank}</div>
                                    <div className="text-sm font-bold uppercase tracking-widest text-white">in the world</div>
                                </div>
                                <p className="text-white font-medium line-clamp-3">
                                    {artistName} is a chart-topping artist known for their unique blend of {artistTracks[0]?.genre || 'music'}. 
                                    With over {formatPlays(totalPlays)} total streams, they continue to redefine the sound of modern music.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )
  }

  if (view.type === 'PLAYLIST' || view.type === 'ALBUM') {
    let title = "", subtitle = "", cover = "", description = "", items: any[] = [];
    let year: number | undefined = undefined;
    let label = "";
    let isPlaylist = view.type === 'PLAYLIST';
    let id = (view as any).id;
    let isLikedSongs = id === 'liked';
    let isHistory = id === 'history';
    let isSystem = false;
    
    if (isPlaylist) {
      if (isHistory) {
         title = "Recently Played";
         subtitle = `${recentlyPlayed.length} tracks`;
         isSystem = true;
         items = recentlyPlayed;
         if (recentlyPlayed.length > 0) cover = recentlyPlayed[0].cover;
      } else {
          const pl = playlists.find(p => p.id === id);
          if (!pl) {
             return (
                 <div className="flex flex-col items-center justify-center h-full pb-32">
                     <h2 className="text-2xl font-bold mb-4">Playlist not found</h2>
                     <button onClick={() => setView({type:'HOME'})} className="px-6 py-2 bg-white text-black rounded-full font-bold">Return Home</button>
                 </div>
             );
          }
          title = pl.name;
          subtitle = `Playlist • ${pl.tracks.length} songs`;
          description = pl.description || "";
          isSystem = !!pl.isSystem;
          label = "Huevify User Playlist";
          
          if (isLikedSongs) {
          } else if (pl.customCover) {
              cover = pl.customCover;
          } else {
              cover = pl.tracks.length > 0 ? (tracks.find(t => t.id === pl.tracks[0])?.cover || "") : "";
          }
          items = pl.tracks.map(tid => tracks.find(t => t.id === tid)).filter(Boolean);
      }
    } else {
      const alb = albums.find(a => a.id === id);
      if (!alb) return <div>Not Found</div>;
      title = alb.title;
      subtitle = `Album • ${alb.artist}`;
      if (alb.year) subtitle += ` • ${alb.year}`;
      cover = alb.cover;
      items = alb.trackIds.map(tid => tracks.find(t => t.id === tid)).filter(Boolean);
      year = alb.year;
      label = alb.recordLabel || "Huevify Records";
    }

    const totalDurationSeconds = items.reduce((acc, t) => acc + t.duration, 0);
    const totalMinutes = Math.floor(totalDurationSeconds / 60);
    const totalReleasePlays = items.reduce((acc, t) => acc + t.plays, 0);

    return (
      <div className="h-full overflow-y-auto pb-64 relative w-full page-enter">
        <div className="relative p-6 md:p-8 bg-gradient-to-b from-slate-700 to-background animate-appear">
          <div className="absolute top-4 left-4 md:top-6 md:left-6 z-20">
            <button 
              onClick={goBack} 
              className="w-8 h-8 bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition"
            >
              <ArrowLeft size={20} />
            </button>
          </div>

          <div className="flex flex-col items-center text-center md:flex-row md:items-end md:text-left gap-6 mt-8 md:mt-8">
            <div className="w-48 h-48 md:w-56 md:h-56 shadow-2xl shrink-0 flex items-center justify-center bg-surface-highlight overflow-hidden rounded-md animate-appear">
                {isLikedSongs ? (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-700 to-blue-300 flex items-center justify-center">
                        <Heart size={64} fill="white" className="text-white" />
                    </div>
                ) : isHistory ? (
                    <div className="w-full h-full bg-surface-highlight flex items-center justify-center">
                        <ListMusic size={64} className="text-secondary" />
                    </div>
                ) : cover ? (
                    <img src={cover} alt={title} className="w-full h-full object-cover" />
                ) : (
                    <ListMusic size={64} className="text-secondary" />
                )}
            </div>

            <div className="flex flex-col gap-2 w-full md:w-auto animate-appear">
              <span className="uppercase text-xs font-bold hidden md:block">{view.type}</span>
              <h1 className="text-3xl md:text-7xl font-bold tracking-tighter leading-tight line-clamp-2">
                  {title}
              </h1>
              {description && <p className="text-secondary/80 text-sm md:text-base font-medium">{description}</p>}
              <p className="text-white font-semibold text-sm md:text-base mt-1">{subtitle}</p>
              
              {isPlaylist && !isSystem && (
                  <div className="flex gap-4 justify-center md:justify-start mt-2 md:hidden">
                      <button onClick={() => handleEdit(id)} className="text-xs border border-secondary/50 rounded-full px-3 py-1 text-secondary hover:text-white hover:border-white">
                          Edit
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deletePlaylist(id); }} className="text-xs border border-secondary/50 rounded-full px-3 py-1 text-secondary hover:text-white hover:border-white">
                          Delete
                      </button>
                  </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 md:px-8 py-4 md:py-6 bg-background/50 backdrop-blur-sm sticky top-0 z-30 flex items-center gap-6 animate-appear">
          <button 
             onClick={() => items.length > 0 && playTrack(items[0])}
             className="w-12 h-12 md:w-14 md:h-14 bg-primary rounded-full flex items-center justify-center hover:scale-105 transition shadow-lg"
          >
            <Play size={24} fill="black" className="ml-1 text-black md:w-7 md:h-7" />
          </button>
          
          {!isPlaylist && (
             <button onClick={() => toggleAlbumLike(id)} className="hover:scale-105 transition">
                <Heart size={32} fill={isAlbumLiked(id) ? '#1ed760' : 'none'} className={isAlbumLiked(id) ? 'text-primary' : 'text-secondary hover:text-white'} />
             </button>
          )}

          {isPlaylist && !isSystem && (
              <div className="hidden md:flex gap-4 ml-auto">
                 <button onClick={() => handleEdit(id)} className="text-secondary hover:text-white hover:scale-105"><Edit size={24}/></button>
                 <button onClick={(e) => { e.stopPropagation(); deletePlaylist(id); }} className="text-secondary hover:text-white hover:scale-105"><Trash2 size={24}/></button>
              </div>
          )}
        </div>

        <div className="px-4 md:px-8 animate-slide-up">
           <div className="hidden md:grid grid-cols-[16px_4fr_2fr_1fr_60px] gap-4 px-4 py-2 border-b border-surface-highlight text-secondary text-sm mb-4">
             <span>#</span>
             <span>Title</span>
             <span>Plays</span>
             <span><ListMusic size={16} /></span>
             <span></span>
           </div>
           
           {items.map((track, idx) => (
             <div key={track.id} className="grid grid-cols-[16px_1fr_60px] md:grid-cols-[16px_4fr_2fr_1fr_60px] gap-4 px-2 md:px-4 py-3 rounded hover:bg-surface-highlight group items-center">
               
               <div className="w-4 flex justify-center">
                   <span className="text-secondary group-hover:hidden text-sm">{idx + 1}</span>
                   <button onClick={() => playTrack(track)} className="hidden group-hover:block text-white"><Play size={12} fill="white"/></button>
               </div>
               
               <div className="flex items-center gap-3 overflow-hidden">
                 <img src={track.cover} className="w-10 h-10 md:hidden rounded" alt="" />
                 <div className="flex flex-col overflow-hidden">
                   <span className="text-white font-medium truncate">
                      {track.title} 
                      <span className="md:hidden text-secondary font-normal"> (feat. {track.artist})</span>
                   </span>
                   <div className="md:hidden text-xs text-secondary truncate mt-0.5">
                      {formatPlays(track.plays)} • {track.artist}
                   </div>
                   <span 
                        onClick={(e) => { e.stopPropagation(); goToArtist(track.artist); }} 
                        className="hidden md:block text-secondary text-xs group-hover:text-white hover:underline cursor-pointer"
                   >
                       {track.artist}
                   </span>
                 </div>
               </div>

               <span className="text-secondary text-sm hidden md:block truncate">{formatPlays(track.plays)}</span>

               <span className="text-secondary text-sm hidden md:block">{formatDuration(track.duration)}</span>

               <div className="flex items-center gap-3 justify-end">
                 <button onClick={() => toggleLike(track.id)} className={`${isLiked(track.id) ? 'text-primary' : 'text-transparent group-hover:text-secondary hover:text-white'}`}>
                    <Heart size={16} fill={isLiked(track.id) ? 'currentColor' : 'none'} />
                 </button>
                 
                 <button onClick={(e) => { e.stopPropagation(); openAddToPlaylist(track.id); }} className="text-transparent group-hover:text-secondary hover:text-white" title="Add to Playlist">
                    <Plus size={16} />
                 </button>

                 {isPlaylist && !isLikedSongs && !isHistory && (
                    <button onClick={() => removeFromPlaylist((view as any).id, track.id)} className="text-transparent group-hover:text-secondary hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                 )}
               </div>
             </div>
           ))}

           {items.length > 0 && (
             <div className="mt-8 pt-8 border-t border-surface-highlight text-secondary text-sm font-medium pb-8 flex flex-col gap-1">
                 {year && <p>Released {year}</p>}
                 <p>{items.length} songs, {totalMinutes} min</p>
                 <p>{formatPlays(totalReleasePlays)} plays</p>
                 <p className="mt-4 text-[10px] uppercase tracking-widest font-bold">© {label}</p>
             </div>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 pb-32 h-full overflow-y-auto bg-background page-enter">
      <h2 className="text-2xl font-bold mb-6 animate-appear">Your Library</h2>
      
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 animate-slide-up">
        <div 
          onClick={handleCreate}
          className="p-4 bg-surface hover:bg-surface-highlight rounded-lg cursor-pointer transition group flex flex-col justify-center items-center text-center min-h-[150px] md:min-h-[200px] hover-scale"
        >
           <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-surface-highlight group-hover:bg-white flex items-center justify-center mb-4 transition-colors">
              <PlusSquare size={24} className="text-secondary group-hover:text-black md:w-8 md:h-8" />
           </div>
           <h3 className="font-bold text-white text-sm md:text-base">Create Playlist</h3>
        </div>

        {playlists.map(pl => {
           let cover = pl.customCover;
           if (!cover && pl.tracks.length > 0) {
               cover = tracks.find(t => t.id === pl.tracks[0])?.cover;
           }

           return (
           <div 
             key={pl.id} 
             onClick={() => setView({ type: 'PLAYLIST', id: pl.id })}
             className="p-3 md:p-4 bg-surface hover:bg-surface-highlight rounded-lg cursor-pointer transition group hover-scale"
           >
              <div className={`aspect-square mb-2 md:mb-4 shadow-lg flex items-center justify-center rounded-md overflow-hidden ${pl.id === 'liked' ? 'bg-gradient-to-br from-indigo-700 to-blue-300' : 'bg-surface-highlight'}`}>
                 {pl.id === 'liked' ? (
                     <Heart size={32} fill="white" className="text-white md:w-12 md:h-12" />
                 ) : cover ? (
                     <img src={cover} alt={pl.name} className="w-full h-full object-cover" />
                 ) : (
                     <ListMusic size={32} className="text-secondary md:w-12 md:h-12" />
                 )}
              </div>
              <h3 className="font-bold truncate text-white text-sm md:text-base">{pl.name}</h3>
              <p className="text-xs md:text-sm text-secondary truncate">Playlist</p>
           </div>
           );
        })}
        
        {followedArtists.map(artist => {
            const cover = tracks.find(t => t.artist === artist)?.cover || "";
            return (
                <div 
                    key={artist}
                    onClick={() => goToArtist(artist)}
                    className="p-3 md:p-4 bg-surface hover:bg-surface-highlight rounded-lg transition cursor-pointer group flex flex-col items-center text-center hover-scale"
                >
                    <div className="aspect-square w-full mb-2 md:mb-4 shadow-lg rounded-full overflow-hidden">
                        {cover ? (
                            <img src={cover} alt={artist} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-surface-highlight flex items-center justify-center">
                                <Mic2 size={32} className="text-secondary" />
                            </div>
                        )}
                    </div>
                    <h4 className="font-bold truncate text-white text-sm md:text-base w-full">{artist}</h4>
                    <p className="text-xs md:text-sm text-secondary truncate">Artist</p>
                </div>
            );
        })}
        
        {albums.filter(a => isAlbumLiked(a.id)).map(album => (
           <div 
            key={album.id} 
            onClick={() => setView({ type: 'ALBUM', id: album.id })}
            className="p-3 md:p-4 bg-surface hover:bg-surface-highlight rounded-lg transition cursor-pointer group hover-scale"
          >
            <div className="relative mb-2 md:mb-4">
              <img src={album.cover} alt={album.title} className="w-full aspect-square object-cover rounded-md shadow-lg" />
            </div>
            <h4 className="font-bold truncate text-white text-sm md:text-base">{album.title}</h4>
            <p className="text-xs md:text-sm text-secondary truncate">Album • {album.artist}</p>
          </div>
        ))}
      </div>
    </div>
  );
};