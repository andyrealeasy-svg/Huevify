import React, { useState } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Play, Heart, ListMusic, Trash2, ArrowLeft, PlusSquare, Plus, Edit, Mic2, User, Check, ChevronLeft, ChevronRight, X, CheckCircle } from '../components/Icons.tsx';

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
    goToArtist, getArtistStats, followedArtists, toggleFollowArtist, isArtistFollowed,
    currentUser, togglePlaylistSave, getAlbumCover, changeAlbumCover, dailyChart, artistAccounts, getTrackCover
  } = useStore();

  const [isCoverPickerOpen, setCoverPickerOpen] = useState(false);

  const handleCreate = () => {
    setPlaylistIdToEdit(null);
    setCreatePlaylistOpen(true);
  };

  const handleEditPlaylist = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setPlaylistIdToEdit(id);
      setCreatePlaylistOpen(true);
  };

  // --- LIBRARY ROOT VIEW ---
  if (view.type === 'LIBRARY') {
      // System playlists OR Owned by me OR Saved by me
      // Also filter out Liked Songs from OTHER users (they start with liked_ but ownerId mismatch)
      const myPlaylists = playlists.filter(pl => {
          // If system playlist (liked songs), only show mine
          if (pl.id.startsWith('liked_') && pl.ownerId !== currentUser?.id) return false;
          
          return pl.isSystem || 
          (currentUser && pl.ownerId === currentUser.id) ||
          (currentUser && pl.savedBy?.includes(currentUser.id));
      });
      
      const likedAlbums = albums.filter(a => isAlbumLiked(a.id));

      return (
          <div className="h-full overflow-y-auto pb-32 relative w-full page-enter px-4 md:px-8 py-8">
              <h1 className="text-3xl font-bold mb-6">Your Library</h1>
              
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                  {myPlaylists.map(pl => {
                      let cover = pl.customCover;
                      if (!cover && pl.tracks.length > 0) {
                          const t = tracks.find(t => t.id === pl.tracks[0]);
                          if (t) cover = getTrackCover(t);
                      }
                      // Hide system text for Liked Songs
                      const subText = pl.id.startsWith('liked_') ? 'Playlist' : (pl.isSystem ? 'System' : `By ${pl.creatorName || 'You'}`);

                      return (
                          <div 
                              key={pl.id} 
                              onClick={() => setView({ type: 'PLAYLIST', id: pl.id })}
                              className="bg-surface hover:bg-surface-highlight p-3 md:p-4 rounded-lg cursor-pointer transition group hover-scale"
                          >
                              <div className="aspect-square mb-3 md:mb-4 shadow-lg flex items-center justify-center rounded-md overflow-hidden bg-surface-highlight relative">
                                  {pl.id.startsWith('liked_') ? (
                                      <div className="w-full h-full bg-gradient-to-br from-indigo-700 to-blue-300 flex items-center justify-center">
                                          <Heart size={32} fill="white" className="text-white md:w-10 md:h-10" />
                                      </div>
                                  ) : cover ? (
                                      <img src={cover} className="w-full h-full object-cover" />
                                  ) : (
                                      <ListMusic size={32} className="text-secondary md:w-10 md:h-10" />
                                  )}
                                  <div className="absolute bottom-2 right-2 w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                      <Play fill="black" size={16} className="text-black ml-1 md:w-5 md:h-5" />
                                  </div>
                              </div>
                              <h3 className="font-bold truncate text-white text-sm md:text-base">{pl.name}</h3>
                              <p className="text-xs md:text-sm text-secondary truncate">{subText}</p>
                          </div>
                      );
                  })}

                  {likedAlbums.map(album => (
                      <div 
                          key={album.id} 
                          onClick={() => setView({ type: 'ALBUM', id: album.id })}
                          className="bg-surface hover:bg-surface-highlight p-3 md:p-4 rounded-lg cursor-pointer transition group hover-scale"
                      >
                          <div className="aspect-square mb-3 md:mb-4 shadow-lg rounded-md overflow-hidden bg-surface-highlight relative">
                              <img src={getAlbumCover(album.id)} className="w-full h-full object-cover" />
                              <div className="absolute bottom-2 right-2 w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                  <Play fill="black" size={16} className="text-black ml-1 md:w-5 md:h-5" />
                              </div>
                          </div>
                          <h3 className="font-bold truncate text-white text-sm md:text-base">{album.title}</h3>
                          <p className="text-xs md:text-sm text-secondary truncate">{album.artist}</p>
                      </div>
                  ))}

                  {/* Followed Artists */}
                  {followedArtists.map(artistName => {
                      const acc = artistAccounts.find(a => a.artistName === artistName);
                      // Fallback image search
                      const artistTrack = tracks.find(t => t.artist === artistName);
                      const image = acc?.avatar || (artistTrack ? getTrackCover(artistTrack) : undefined);

                      return (
                          <div 
                              key={artistName} 
                              onClick={() => goToArtist(artistName)}
                              className="bg-surface hover:bg-surface-highlight p-3 md:p-4 rounded-lg cursor-pointer transition group hover-scale"
                          >
                              <div className="aspect-square mb-3 md:mb-4 shadow-lg flex items-center justify-center rounded-full overflow-hidden bg-surface-highlight relative">
                                  {image ? (
                                      <img src={image} className="w-full h-full object-cover" />
                                  ) : (
                                      <User size={32} className="text-secondary md:w-10 md:h-10" />
                                  )}
                              </div>
                              <h3 className="font-bold truncate text-white text-center text-sm md:text-base">{artistName}</h3>
                              <p className="text-xs md:text-sm text-secondary truncate text-center">Artist</p>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  }

  // --- CHARTS VIEW ---
  if (view.type === 'CHARTS') {
      return (
        <div className="h-full overflow-y-auto pb-32 relative w-full page-enter">
            <div className="p-8 bg-gradient-to-b from-purple-900 to-background animate-appear">
                 <div className="absolute top-4 left-4 z-20">
                    <button onClick={goBack} className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white"><ArrowLeft size={20}/></button>
                 </div>
                 <h1 className="text-3xl md:text-5xl font-bold mt-8 mb-4">Huevify Daily Top 25</h1>
                 <p className="text-white/70">Most played tracks in the last 24h. Updates at 21:00 UTC+3.</p>
            </div>
            <div className="px-4 md:px-8 py-4 animate-slide-up">
               {dailyChart.length === 0 ? (
                   <div className="text-secondary text-center py-10">Chart is calculating... check back later.</div>
               ) : (
                   dailyChart.map((track, idx) => {
                       const allArtists = Array.from(new Set([track.artist, ...(track.mainArtists || [])]));
                       
                       return (
                       <div key={track.id} className="grid grid-cols-[30px_1fr_60px] md:grid-cols-[30px_4fr_2fr_1fr_60px] gap-4 px-2 py-3 rounded hover:bg-surface-highlight group items-center">
                            <div className="flex justify-center text-xl font-bold text-secondary">{idx + 1}</div>
                            <div className="flex items-center gap-3 overflow-hidden">
                                 <img src={getTrackCover(track)} className="w-10 h-10 rounded object-cover" alt="" />
                                 <div className="flex flex-col overflow-hidden">
                                    <span className="text-white font-medium truncate flex items-center gap-2">
                                        {track.title}
                                        {track.explicit && <span className="text-[8px] border border-secondary text-secondary px-1 rounded bg-surface">E</span>}
                                    </span>
                                    <div className="text-xs text-secondary truncate">
                                        {allArtists.map((a, i) => (
                                            <span key={a}>
                                                {i > 0 && ", "}
                                                <span onClick={(e) => { e.stopPropagation(); goToArtist(a); }} className="hover:underline cursor-pointer">{a}</span>
                                            </span>
                                        ))}
                                    </div>
                                 </div>
                            </div>
                            <span className="text-secondary text-sm hidden md:block truncate">{formatPlays(track.dailyPlays)} daily plays</span>
                            <span className="text-secondary text-sm hidden md:block">{formatDuration(track.duration)}</span>
                            <div className="flex items-center gap-3 justify-end">
                                <button onClick={() => toggleLike(track.id)} className={`${isLiked(track.id) ? 'text-primary' : 'text-transparent group-hover:text-secondary hover:text-white'}`}>
                                    <Heart size={16} fill={isLiked(track.id) ? 'currentColor' : 'none'} />
                                </button>
                                <button onClick={() => playTrack(track)} className="text-white"><Play size={20} fill="white"/></button>
                            </div>
                       </div>
                   )})
               )}
            </div>
        </div>
      );
  }

  // --- ARTIST VIEW ---
  if (view.type === 'ARTIST') {
      const artistName = (view as any).id;
      const artistTracks = tracks.filter(t => t.artist === artistName || t.mainArtists?.includes(artistName));
      const topTracks = [...artistTracks].sort((a, b) => b.plays - a.plays).slice(0, 5);
      const artistAlbums = albums.filter(a => a.artist === artistName);
      
      const { monthlyPlays, globalRank } = getArtistStats(artistName);
      
      // Get Bio and Pick if available
      const artistAccount = artistAccounts.find(a => a.artistName === artistName && a.status === 'APPROVED');
      const bio = artistAccount?.bio;
      const pick = artistAccount?.artistPick;
      
      // Only verify if account exists and is approved
      const isVerified = !!artistAccount;

      const isFollowing = isArtistFollowed(artistName);

      return (
        <div className="h-full overflow-y-auto pb-32 relative w-full page-enter">
            {/* Artist Header */}
            <div 
                className="relative h-[40vh] bg-cover bg-center flex items-end p-8 animate-appear"
                style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), #121212), url(${artistAccount?.avatar || (topTracks[0] ? getTrackCover(topTracks[0]) : '')})` }}
            >
                <div className="absolute top-4 left-4 z-20">
                    <button onClick={goBack} className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white"><ArrowLeft size={20}/></button>
                </div>
                <div className="relative z-10 w-full">
                    <div className="flex items-center gap-2 mb-2 text-white">
                        {isVerified && (
                            <div className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                <span className="w-3 h-3 bg-white rounded-full flex items-center justify-center"><i className="block w-1 h-1 bg-blue-600 rounded-full"></i></span>
                                Verified Artist
                            </div>
                        )}
                    </div>
                    <h1 className="text-5xl md:text-8xl font-bold tracking-tight mb-4 drop-shadow-lg">{artistName}</h1>
                    <p className="text-white font-medium text-lg drop-shadow-md">{formatPlays(monthlyPlays)} monthly plays</p>
                </div>
            </div>

            <div className="px-4 md:px-8 py-6 animate-slide-up">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => topTracks.length && playTrack(topTracks[0])} className="w-14 h-14 bg-primary rounded-full flex items-center justify-center hover:scale-105 transition shadow-lg">
                        <Play size={28} fill="black" className="ml-1 text-black" />
                    </button>
                    
                    {/* Follow Button */}
                    <button 
                        onClick={() => toggleFollowArtist(artistName)}
                        className={`px-6 py-1.5 font-bold text-sm rounded-full uppercase tracking-widest border transition ${isFollowing ? 'border-white text-white hover:bg-white/10' : 'border-secondary text-white hover:border-white'}`}
                    >
                        {isFollowing ? 'Following' : 'Follow'}
                    </button>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Main Content */}
                    <div className="flex-1">
                        
                        {/* Artist Pick */}
                        {pick && (
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold mb-4">Artist Pick</h2>
                                <div 
                                    className="flex items-start gap-4 cursor-pointer hover:bg-surface-highlight p-4 rounded transition group bg-surface"
                                    onClick={() => pick.id && setView({ type: pick.type as any, id: pick.id })}
                                >
                                    <img src={pick.image} className="w-20 h-20 rounded object-cover shadow-lg" />
                                    <div className="flex flex-col justify-center">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-5 h-5 rounded-full overflow-hidden bg-zinc-800">
                                                <img src={artistAccount?.avatar || pick.image} className="w-full h-full object-cover"/>
                                            </div>
                                            <span className="text-xs text-secondary font-bold">Posted By {artistName}</span>
                                        </div>
                                        <div className="font-bold group-hover:underline text-lg">{pick.subtitle}</div>
                                        <div className="text-sm text-secondary">Latest Release</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <h2 className="text-2xl font-bold mb-4">Popular</h2>
                        <div className="flex flex-col gap-1 mb-8">
                            {topTracks.map((track, idx) => (
                                <div key={track.id} className="grid grid-cols-[20px_1fr_60px] md:grid-cols-[20px_1fr_60px_60px] items-center gap-4 p-2 rounded hover:bg-surface-highlight group cursor-pointer" onClick={() => playTrack(track)}>
                                    <span className="text-secondary text-sm">{idx + 1}</span>
                                    <div className="flex items-center gap-3">
                                        <img src={getTrackCover(track)} className="w-10 h-10 rounded object-cover" alt=""/>
                                        <span className="font-medium text-white truncate flex items-center gap-2">
                                            {track.title}
                                            {track.explicit && <span className="text-[8px] border border-secondary text-secondary px-1 rounded bg-surface">E</span>}
                                        </span>
                                    </div>
                                    <span className="text-secondary text-sm hidden md:block">{formatPlays(track.plays)}</span>
                                    <span className="text-secondary text-sm text-right">{formatDuration(track.duration)}</span>
                                </div>
                            ))}
                        </div>

                        <h2 className="text-2xl font-bold mb-4">Discography</h2>
                        <div className="flex overflow-x-auto gap-4 pb-4 md:grid md:grid-cols-4 lg:grid-cols-5">
                            {artistAlbums.map(album => (
                                <div key={album.id} onClick={() => setView({type: 'ALBUM', id: album.id})} className="min-w-[140px] md:min-w-0 p-3 bg-surface hover:bg-surface-highlight rounded-md cursor-pointer hover:scale-[1.02] transition flex-col">
                                    <img src={getAlbumCover(album.id)} className="w-full aspect-square object-cover rounded mb-2 shadow-lg" />
                                    <div className="font-bold truncate text-sm">{album.title}</div>
                                    <div className="text-xs text-secondary">{album.year} • {album.type || 'Album'}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* About Column */}
                    <div className="w-full md:w-1/3">
                        <h2 className="text-2xl font-bold mb-4">About</h2>
                        <div className="bg-surface rounded-lg overflow-hidden relative group cursor-pointer min-h-[300px] hover:scale-[1.02] transition">
                            {/* Use avatar or fallback to first track cover */}
                            <img 
                                src={artistAccount?.avatar || (topTracks[0] ? getTrackCover(topTracks[0]) : '')} 
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition absolute inset-0 bg-zinc-800" 
                            />
                            
                            <div className="absolute inset-0 p-6 flex flex-col justify-end z-10">
                                <div className="mb-4">
                                    <div className="text-3xl font-bold text-white mb-2">#{globalRank}</div>
                                    <div className="text-sm font-bold uppercase tracking-widest text-white">in the world</div>
                                </div>
                                <p className="text-white font-medium line-clamp-4 text-sm md:text-base drop-shadow-md">
                                    {bio || `Listen to ${artistName} on Huevify. ${artistName} is verified artist.`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )
  }

  // --- Render Album or Playlist Detail ---
  if (view.type === 'PLAYLIST' || view.type === 'ALBUM') {
    let title = "", subtitle = "", cover = "", description = "", items: any[] = [];
    let year: number | undefined = undefined;
    let fullReleaseDate: string | undefined = undefined;
    let label = "";
    let isPlaylist = view.type === 'PLAYLIST';
    let id = (view as any).id;
    let isLikedSongs = id.startsWith('liked');
    let isHistory = id === 'history';
    let isSystem = false;
    let playlistOwnerId: string | undefined;
    let creatorName: string | undefined;
    let creatorAvatar: string | undefined;
    let releaseType = "Album"; // Default
    let hasMultipleCovers = false;
    let allAlbumArtists: string[] = [];
    let currentAlbumObj: any = null;
    let isSavedPlaylist = false;
    let isPublic = false;
    
    if (isPlaylist) {
      if (isHistory) {
         title = "Recently Played";
         subtitle = `${recentlyPlayed.length} tracks`;
         isSystem = true;
         items = recentlyPlayed;
         if (recentlyPlayed.length > 0) cover = getTrackCover(recentlyPlayed[0]);
         releaseType = "Playlist";
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
          playlistOwnerId = pl.ownerId;
          creatorName = pl.creatorName;
          creatorAvatar = pl.creatorAvatar;
          releaseType = "Playlist";
          isPublic = !!pl.isPublic;
          isSavedPlaylist = pl.savedBy?.includes(currentUser?.id || "") || false;
          
          if (isLikedSongs) {
          } else if (pl.customCover) {
              cover = pl.customCover;
          } else {
              const firstTrack = tracks.find(t => t.id === pl.tracks[0]);
              cover = firstTrack ? getTrackCover(firstTrack) : "";
          }
          items = pl.tracks.map(tid => tracks.find(t => t.id === tid)).filter(Boolean);
      }
    } else {
      const alb = albums.find(a => a.id === id);
      if (!alb) return <div>Not Found</div>;
      title = alb.title;
      currentAlbumObj = alb;
      
      allAlbumArtists = [alb.artist, ...(alb.mainArtists || [])];
      
      subtitle = `${alb.type || 'Album'} • ${alb.artist}`;
      if (alb.year) subtitle += ` • ${alb.year}`;
      cover = getAlbumCover(alb.id);
      items = alb.trackIds.map(tid => tracks.find(t => t.id === tid)).filter(Boolean);
      year = alb.year;
      fullReleaseDate = alb.releaseDate;
      label = alb.recordLabel || "Huevify Records";
      releaseType = alb.type || "Album";
      hasMultipleCovers = alb.covers.length > 1;
    }

    const totalDurationSeconds = items.reduce((acc, t) => acc + t.duration, 0);
    const totalMinutes = Math.floor(totalDurationSeconds / 60);
    const totalReleasePlays = items.reduce((acc, t) => acc + t.plays, 0);
    const isOwner = currentUser && playlistOwnerId === currentUser.id;

    // --- Empty Liked Songs View ---
    if (isLikedSongs && items.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center pb-32 relative w-full page-enter p-4 text-center">
                 <div className="absolute top-4 left-4 md:top-6 md:left-6 z-20">
                    <button onClick={goBack} className="w-8 h-8 bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition"><ArrowLeft size={20} /></button>
                 </div>
                 <div className="w-24 h-24 bg-gradient-to-br from-indigo-700 to-blue-300 rounded-full flex items-center justify-center mb-6 shadow-xl">
                    <Heart size={48} fill="white" className="text-white" />
                 </div>
                 <h2 className="text-2xl md:text-4xl font-bold mb-4">Songs you like will appear here</h2>
                 <p className="text-secondary mb-8">Save songs by tapping the heart icon.</p>
                 <button 
                    onClick={() => setView({type:'HOME'})} 
                    className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition"
                 >
                    Return Home
                 </button>
            </div>
        );
    }

    return (
      <div className="h-full overflow-y-auto pb-64 relative w-full page-enter">
        {/* Header */}
        <div className="relative p-6 md:p-8 bg-gradient-to-b from-slate-700 to-background animate-appear">
          {/* Back Button */}
          <div className="absolute top-4 left-4 md:top-6 md:left-6 z-20">
            <button 
              onClick={goBack} 
              className="w-8 h-8 bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition"
            >
              <ArrowLeft size={20} />
            </button>
          </div>

          <div className="flex flex-col items-center text-center md:flex-row md:items-end md:text-left gap-6 mt-8 md:mt-8">
            {/* Cover Art Logic */}
            <div 
                className={`w-48 h-48 md:w-56 md:h-56 shadow-2xl shrink-0 flex items-center justify-center bg-surface-highlight overflow-hidden rounded-md animate-appear relative group ${hasMultipleCovers ? 'cursor-pointer' : ''}`}
                onClick={() => { if(hasMultipleCovers) setCoverPickerOpen(true); }}
            >
                {isLikedSongs ? (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-700 to-blue-300 flex items-center justify-center">
                        <Heart size={64} fill="white" className="text-white" />
                    </div>
                ) : isHistory ? (
                    <div className="w-full h-full bg-surface-highlight flex items-center justify-center">
                        <ListMusic size={64} className="text-secondary" />
                    </div>
                ) : cover ? (
                    <>
                        <img src={cover} alt={title} className="w-full h-full object-cover" />
                        
                        {/* Overlay for multiple covers */}
                        {hasMultipleCovers && (
                             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                 <span className="text-xs font-bold border border-white px-2 py-1 rounded">CHANGE COVER</span>
                             </div>
                        )}
                    </>
                ) : (
                    <ListMusic size={64} className="text-secondary" />
                )}
            </div>

            <div className="flex flex-col gap-2 w-full md:w-auto animate-appear items-center md:items-start">
              <span className="uppercase text-xs font-bold hidden md:block">
                  {releaseType}
              </span>
              <h1 className="text-3xl md:text-7xl font-bold tracking-tighter leading-tight line-clamp-2">
                  {title}
              </h1>
              {description && <p className="text-secondary/80 text-sm md:text-base font-medium">{description}</p>}
              
              {!isPlaylist && (
                  <div className="flex flex-wrap justify-center md:justify-start items-center gap-1 font-semibold text-sm md:text-base mt-1 text-white">
                      {allAlbumArtists.map((art, idx) => (
                          <span key={art}>
                              {idx > 0 && ", "}
                              <span onClick={() => goToArtist(art)} className="hover:underline cursor-pointer">{art}</span>
                          </span>
                      ))}
                      {year && <span className="text-secondary"> • {year}</span>}
                  </div>
              )}
              
              {isPlaylist && !isSystem && creatorName && (
                  <div className="flex items-center gap-2 justify-center md:justify-start mt-2">
                      <div className="w-6 h-6 rounded-full bg-zinc-700 overflow-hidden">
                          {creatorAvatar ? <img src={creatorAvatar} className="w-full h-full object-cover" /> : <User size={16} className="text-white m-1" />}
                      </div>
                      <span className="font-bold text-sm hover:underline cursor-pointer">{creatorName}</span>
                  </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Bar */}
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

          {isPlaylist && isOwner && !isSystem && (
              <>
                <button onClick={(e) => handleEditPlaylist(id, e)} className="text-secondary hover:text-white transition hover:scale-105" title="Edit Playlist">
                    <Edit size={32} />
                </button>
                <button onClick={() => deletePlaylist(id)} className="text-secondary hover:text-red-500 transition hover:scale-105" title="Delete Playlist">
                    <Trash2 size={32} />
                </button>
              </>
          )}

          {isPlaylist && !isOwner && !isSystem && isPublic && (
              <button onClick={() => togglePlaylistSave(id)} className="hover:scale-105 transition" title={isSavedPlaylist ? "Remove from Library" : "Add to Library"}>
                  {isSavedPlaylist ? (
                      <CheckCircle size={32} className="text-primary" />
                  ) : (
                      <PlusSquare size={32} className="text-secondary hover:text-white" />
                  )}
              </button>
          )}
        </div>

        {/* List */}
        <div className="px-4 md:px-8 animate-slide-up">
           <div className="hidden md:grid grid-cols-[16px_4fr_2fr_1fr_60px] gap-4 px-4 py-2 border-b border-surface-highlight text-secondary text-sm mb-4">
             <span>#</span>
             <span>Title</span>
             <span>Plays</span>
             <span><ListMusic size={16} /></span>
             <span></span>
           </div>
           
           {items.map((track, idx) => {
               // Logic: If displaying a track inside an Album View, use the Album's cover, not the Track's canonical cover
               // This allows "reused" tracks via HUEQ to show the correct context-aware cover art
               const displayCover = !isPlaylist ? cover : getTrackCover(track);

               const albumArtist = !isPlaylist ? (subtitle.split(' • ')[1] || "") : "";
               const showFeatOnMobile = track.artist !== albumArtist;
               const allTrackArtists = Array.from(new Set([track.artist, ...(track.mainArtists || [])]));

               return (
             <div key={track.id} className="grid grid-cols-[16px_1fr_60px] md:grid-cols-[16px_4fr_2fr_1fr_60px] gap-4 px-2 md:px-4 py-3 rounded hover:bg-surface-highlight group items-center">
               
               <div className="w-4 flex justify-center">
                   <span className="text-secondary group-hover:hidden text-sm">{idx + 1}</span>
                   <button onClick={() => playTrack(track)} className="hidden group-hover:block text-white"><Play size={12} fill="white"/></button>
               </div>
               
               <div className="flex items-center gap-3 overflow-hidden">
                 <img src={displayCover} className="w-10 h-10 md:hidden rounded object-cover" alt="" />
                 <div className="flex flex-col overflow-hidden">
                   <span className="text-white font-medium truncate flex items-center gap-2">
                      {track.title} 
                      {track.explicit && <span className="text-[8px] border border-secondary text-secondary px-1 rounded bg-surface">E</span>}
                      <span className="md:hidden text-secondary font-normal">
                          {showFeatOnMobile && track.feat ? ` (feat. ${track.feat})` : ''}
                      </span>
                   </span>
                   <div className="md:hidden text-xs text-secondary truncate mt-0.5">
                      {showFeatOnMobile ? track.artist : ""}
                   </div>
                   <div className="hidden md:block text-secondary text-xs group-hover:text-white truncate">
                       {allTrackArtists.map((a, i) => (
                           <span key={a}>
                               {i > 0 && ", "}
                               <span onClick={(e) => { e.stopPropagation(); goToArtist(a); }} className="hover:underline cursor-pointer">{a}</span>
                           </span>
                       ))}
                   </div>
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

                 {isPlaylist && !isLikedSongs && !isHistory && isOwner && (
                    <button onClick={() => removeFromPlaylist((view as any).id, track.id)} className="text-transparent group-hover:text-secondary hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                 )}
               </div>
             </div>
           )})}

           {items.length > 0 && (
             <div className="mt-8 pt-8 border-t border-surface-highlight text-secondary text-sm font-medium pb-8 flex flex-col gap-1">
                 {fullReleaseDate && <p>Released {new Date(fullReleaseDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>}
                 {!fullReleaseDate && year && <p>Released {year}</p>}
                 <p>{items.length} songs, {totalMinutes} min</p>
                 <p>{formatPlays(totalReleasePlays)} plays</p>
                 <p className="mt-4 text-[10px] uppercase tracking-widest font-bold">© {label}</p>
             </div>
           )}
        </div>

        {/* Cover Picker Modal */}
        {isCoverPickerOpen && currentAlbumObj && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                <div className="bg-surface w-full max-w-lg rounded-xl p-6 relative animate-zoom-in">
                    <button onClick={() => setCoverPickerOpen(false)} className="absolute top-4 right-4 text-white"><X size={24}/></button>
                    <h2 className="text-xl font-bold mb-4">Choose Album Cover</h2>
                    <p className="text-sm text-secondary mb-4">Select your preferred artwork for this release.</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
                        {currentAlbumObj.covers.map((c: string, idx: number) => (
                            <div 
                                key={idx} 
                                onClick={() => { changeAlbumCover(currentAlbumObj.id, idx); setCoverPickerOpen(false); }}
                                className="cursor-pointer group relative"
                            >
                                <img src={c} className="w-full aspect-square object-cover rounded shadow-lg group-hover:opacity-80 transition" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <span className="bg-primary text-black font-bold text-xs px-2 py-1 rounded">SELECT</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

      </div>
    );
  }

  // Fallback
  return null;
};