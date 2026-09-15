import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  ChevronDown, Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, 
  Heart, Plus, ListMusic, Volume, Volume1, Volume2, VolumeX,
  MoreVertical, Trash2, Disc, User, ArrowLeft, ChevronRight, X
} from './Icons';
import { ExplicitBadge } from './ExplicitBadge';
import { PlayMode, Track } from '../types';
import { extractColorFromImage, getCachedColor, getHashPalette, ExtractedColors } from '../utils/colorExtractor';

const formatTime = (seconds: number) => {
    if (!seconds) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
};

export const FullScreenPlayer = () => {
  const { 
    isMobilePlayerOpen, setMobilePlayerOpen, currentTrack, isPlaying, 
    togglePlay, nextTrack, prevTrack, progress, duration, seek,
    playMode, toggleRepeat, isLiked, toggleLike, openAddToPlaylist,
    isShuffle, toggleShuffle, volume, setVolume, goToArtist, getTrackCover,
    albums, playlists, removeFromPlaylist, playNext, setView, view,
    currentUser, showNotification, tracks, appSettings
  } = useStore();

  const isLiquidGlass = appSettings?.liquidGlassNav !== false;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<'main' | 'artists' | 'remove_playlist'>('main');

  const cover = currentTrack ? getTrackCover(currentTrack) : '';
  const prevVolumeRef = React.useRef(volume > 0 ? volume : 1);

  const toggleMute = () => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(prevVolumeRef.current || 1);
    }
  };

  const [palette, setPalette] = useState<ExtractedColors>(() => {
    if (cover) {
      const cached = getCachedColor(cover);
      if (cached) return cached;
    }
    return currentTrack ? getHashPalette(currentTrack.id || currentTrack.title) : {
      primary: 'rgb(55, 65, 81)',
      dark: 'rgb(15, 18, 25)',
      gradient: 'linear-gradient(180deg, #2b3040 0%, #171b24 45%, #0f1117 75%, #08090c 100%)',
      glow: 'radial-gradient(circle at 50% 32%, rgba(65, 75, 95, 0.45) 0%, transparent 68%)',
      rgb: [43, 48, 64]
    };
  });

  useEffect(() => {
    if (!isMobilePlayerOpen) {
      setIsMenuOpen(false);
      setMenuView('main');
    }
  }, [isMobilePlayerOpen, currentTrack?.id]);

  useEffect(() => {
    if (!cover) return;
    let isCancelled = false;

    const cached = getCachedColor(cover);
    if (cached) {
      setPalette(cached);
      return;
    }

    extractColorFromImage(cover, currentTrack?.id || currentTrack?.title || '').then(colors => {
      if (!isCancelled) {
        setPalette(colors);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [cover, currentTrack?.id]);

  if (!currentTrack) return null;

  const getTrackArtists = (track: Track): string[] => {
    const result: string[] = [];
    const seen = new Set<string>();

    const add = (name?: string) => {
      if (!name) return;
      const parts = name.split(/\s*,\s*|\s+&\s+|\s+feat\.?\s+|\s+ft\.?\s+|\s+with\s+/i).map(s => s.trim()).filter(Boolean);
      for (const part of parts) {
        const lower = part.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          result.push(part);
        }
      }
    };

    if (track.mainArtists && track.mainArtists.length > 0) {
      track.mainArtists.forEach(add);
    }
    if (track.artist) {
      add(track.artist);
    }
    return result.length > 0 ? result : (track.artist ? [track.artist] : []);
  };

  const allArtists = getTrackArtists(currentTrack);

  const handleToggleLike = () => {
    if (!currentTrack) return;
    const liked = isLiked(currentTrack.id);
    toggleLike(currentTrack.id);
    showNotification(liked ? "Удалено из любимых треков" : "Добавлено в любимые треки", "success");
    setIsMenuOpen(false);
  };

  const handleAddToPlaylist = () => {
    if (!currentTrack) return;
    setIsMenuOpen(false);
    openAddToPlaylist(currentTrack.id);
  };

  const handleRemoveFromPlaylist = () => {
    if (!currentTrack) return;
    const userPlaylistsWithTrack = playlists.filter(p => {
      if (p.isSystem || p.id.startsWith('liked') || p.id === 'liked') return false;
      const isOwner = currentUser ? p.ownerId === currentUser.id : (!p.ownerId || p.ownerId === 'guest');
      return isOwner && p.tracks && p.tracks.includes(currentTrack.id);
    });

    if (view.type === 'PLAYLIST' && (view as any).id) {
      const curPl = userPlaylistsWithTrack.find(p => p.id === (view as any).id);
      if (curPl) {
        removeFromPlaylist(curPl.id, currentTrack.id);
        showNotification(`Трек удален из плейлиста "${curPl.name}"`, "success");
        setIsMenuOpen(false);
        return;
      }
    }

    if (userPlaylistsWithTrack.length === 0) {
      showNotification("Трек не найден в ваших плейлистах", "info");
      setIsMenuOpen(false);
    } else if (userPlaylistsWithTrack.length === 1) {
      removeFromPlaylist(userPlaylistsWithTrack[0].id, currentTrack.id);
      showNotification(`Трек удален из плейлиста "${userPlaylistsWithTrack[0].name}"`, "success");
      setIsMenuOpen(false);
    } else {
      setMenuView('remove_playlist');
    }
  };

  const handlePlayNext = () => {
    if (!currentTrack) return;
    playNext(currentTrack);
    showNotification("Трек будет включен следующим", "success");
    setIsMenuOpen(false);
  };

  const handleOpenAlbum = () => {
    if (!currentTrack) return;
    const album = albums.find(a => a.trackIds && a.trackIds.includes(currentTrack.id));
    if (album) {
      setIsMenuOpen(false);
      setMobilePlayerOpen(false);
      setView({ type: 'ALBUM', id: album.id });
      return;
    }
    const fallbackAlbum = albums.find(a => 
      (currentTrack.album && a.title.toLowerCase() === currentTrack.album.toLowerCase()) ||
      (a.title.toLowerCase() === currentTrack.title.toLowerCase())
    );
    if (fallbackAlbum) {
      setIsMenuOpen(false);
      setMobilePlayerOpen(false);
      setView({ type: 'ALBUM', id: fallbackAlbum.id });
    } else {
      showNotification("Альбом для этого трека не найден", "info");
    }
  };

  const handleGoToArtistClick = () => {
    if (!currentTrack) return;
    const trackArtists = getTrackArtists(currentTrack);
    if (trackArtists.length > 1) {
      setMenuView('artists');
    } else {
      const target = trackArtists[0] || currentTrack.artist;
      setIsMenuOpen(false);
      setMobilePlayerOpen(false);
      goToArtist(target);
    }
  };

  const handleSelectArtist = (artistName: string) => {
    setIsMenuOpen(false);
    setMobilePlayerOpen(false);
    goToArtist(artistName);
  };

  return (
    <div 
        id="fullscreen-player"
        className={`fixed inset-0 z-[60] flex flex-col p-6 transition-transform duration-300 ease-in-out md:hidden overflow-hidden ${isMobilePlayerOpen ? 'translate-y-0' : 'translate-y-[100%]'}`}
        style={{
          background: palette.gradient,
          transition: 'background 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.3s ease-in-out'
        }}
    >
      {/* Ambient Radial Glow matching the cover art */}
      <div 
        className="absolute inset-0 pointer-events-none transition-all duration-700 opacity-60"
        style={{
          background: palette.glow
        }}
      />

      <div className="relative z-10 flex flex-col h-full justify-between">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={() => setMobilePlayerOpen(false)} 
            className={`transition active:scale-90 ${
              isLiquidGlass 
                ? 'w-10 h-10 rounded-full bg-white/[0.12] backdrop-blur-xl border border-white/20 flex items-center justify-center text-white shadow-[0_4px_12px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.3)]' 
                : 'text-white hover:opacity-80'
            }`} 
            aria-label="Close player"
          >
            <ChevronDown size={28} />
          </button>
          
          <span className={`text-[11px] font-bold tracking-widest uppercase transition-all ${
            isLiquidGlass
              ? 'px-3.5 py-1 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/15 text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
              : 'text-white/90'
          }`}>
            Now Playing
          </span>

          <button 
            className={`transition active:scale-90 ${
              isLiquidGlass 
                ? 'w-10 h-10 rounded-full bg-white/[0.12] backdrop-blur-xl border border-white/20 flex items-center justify-center text-white shadow-[0_4px_12px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.3)]' 
                : 'text-white hover:opacity-80 p-1.5 -mr-1.5 rounded-full hover:bg-white/10 active:bg-white/20'
            }`} 
            onClick={() => { setMenuView('main'); setIsMenuOpen(true); }} 
            aria-label="Track options"
          >
            <MoreVertical size={20} />
          </button>
        </div>

        {/* Cover Art */}
        <div className="flex-1 flex items-center justify-center my-auto min-h-0 py-2">
          <div 
            className="w-full max-w-[340px] aspect-square rounded-xl overflow-hidden transition-all duration-500"
            style={{
              boxShadow: `0 24px 48px -12px rgba(0,0,0,0.75), 0 8px 30px -8px ${palette.primary}`
            }}
          >
            <img 
              src={cover} 
              alt={currentTrack.title} 
              crossOrigin="anonymous"
              className="w-full h-full object-cover" 
              onLoad={() => {
                if (!getCachedColor(cover)) {
                  extractColorFromImage(cover, currentTrack?.id || currentTrack?.title || '').then(setPalette);
                }
              }}
            />
          </div>
        </div>

        {/* Track Info */}
        <div className="flex justify-between items-center mt-4 mb-4">
          <div className="flex flex-col overflow-hidden mr-4 min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-2xl font-bold text-white truncate marquee">{currentTrack.title}</h2>
              {currentTrack.explicit && <ExplicitBadge size="md" />}
            </div>
            <div className="text-lg text-white/80 truncate">
                {allArtists.map((a, i) => (
                    <span key={a}>
                        {i > 0 && ", "}
                        <span 
                          onClick={() => { setMobilePlayerOpen(false); goToArtist(a); }} 
                          className="underline decoration-transparent hover:decoration-white/60 cursor-pointer transition"
                        >
                            {a}
                        </span>
                    </span>
                ))}
            </div>
          </div>
          <button 
              onClick={() => toggleLike(currentTrack.id)}
              className={`${isLiked(currentTrack.id) ? 'text-primary' : 'text-white'} hover:scale-105 transition`}
              aria-label="Like track"
          >
              <Heart size={32} fill={isLiked(currentTrack.id) ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="w-full h-1 bg-white/20 rounded-full mb-2 relative group">
             <input
                type="range"
                min={0}
                max={duration || 100}
                value={progress}
                onChange={(e) => seek(Number(e.target.value))}
                className="absolute w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div 
                className="h-full bg-white rounded-full"
                style={{ width: `${(progress / (duration || 1)) * 100}%` }}
              />
              <div 
                  className="absolute h-3 w-3 bg-white rounded-full top-1/2 -translate-y-1/2 shadow-md"
                  style={{ left: `${(progress / (duration || 1)) * 100}%` }}
              />
          </div>
          <div className="flex justify-between text-xs text-white/70 font-medium">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center mb-6">
          <button 
              onClick={toggleShuffle}
              className={`${isShuffle ? 'text-primary' : 'text-white/70 hover:text-white'} transition`}
              aria-label="Shuffle"
          >
            <Shuffle size={24} />
          </button>
          
          <button onClick={prevTrack} className="text-white hover:scale-110 active:scale-95 transition" aria-label="Previous track">
            <SkipBack size={36} fill="currentColor" />
          </button>
          
          <button 
            onClick={togglePlay} 
            className={`w-16 h-16 rounded-full flex items-center justify-center transition active:scale-90 ${
              isLiquidGlass
                ? 'bg-white/90 text-black shadow-[0_10px_28px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.8)] border border-white/50 backdrop-blur-md'
                : 'bg-white text-black shadow-lg hover:scale-105 active:scale-95'
            }`}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" className="ml-1" />}
          </button>

          <button onClick={nextTrack} className="text-white hover:scale-110 active:scale-95 transition" aria-label="Next track">
            <SkipForward size={36} fill="currentColor" />
          </button>
          
          <button 
              onClick={toggleRepeat} 
              className={`${playMode !== PlayMode.OFF ? 'text-primary' : 'text-white/70 hover:text-white'} transition relative`}
              aria-label="Repeat mode"
          >
            <Repeat size={24} />
            {playMode === PlayMode.ONE && <span className="absolute text-[8px] font-bold top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary">1</span>}
            {playMode === PlayMode.CONTEXT && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>}
          </button>
        </div>

        {/* Mobile Volume Control */}
        <div className="flex items-center gap-3 pb-1">
           <button 
             type="button"
             onClick={toggleMute}
             className="text-white/70 hover:text-white transition focus:outline-none p-1 rounded"
             title={volume === 0 ? "Включить звук" : `Выключить звук (${Math.round(volume * 100)}%)`}
             aria-label="Громкость"
           >
             {volume === 0 ? (
               <VolumeX size={20} />
             ) : volume < 0.5 ? (
               <Volume1 size={20} />
             ) : (
               <Volume2 size={20} />
             )}
           </button>
           <div 
             className="flex-1 h-1 bg-white/20 rounded-full relative group cursor-pointer"
             title={`Громкость: ${Math.round(volume * 100)}%`}
           >
              <input 
                type="range" 
                min={0} 
                max={1} 
                step={0.01} 
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Регулятор громкости"
                className="absolute w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div 
                className="h-full bg-white rounded-full"
                style={{ width: `${volume * 100}%` }}
              />
           </div>
        </div>
      </div>

      {/* Options Menu Bottom Sheet Modal */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => { setIsMenuOpen(false); setMenuView('main'); }}
        >
          <div 
            className={`border-t rounded-t-3xl p-5 w-full max-h-[85vh] flex flex-col shadow-2xl text-white animate-slide-up ${
              isLiquidGlass
                ? 'bg-zinc-900/85 backdrop-blur-3xl border-white/20 shadow-[0_-16px_48px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.3)]'
                : 'bg-[#18181b] border-white/10'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab pill */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 shrink-0" />

            {menuView === 'main' && (
              <>
                {/* Track mini info header */}
                <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-2">
                  <img 
                    src={cover} 
                    alt={currentTrack.title} 
                    className="w-12 h-12 rounded-lg object-cover shadow-md shrink-0"
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-base truncate">{currentTrack.title}</span>
                      {currentTrack.explicit && <ExplicitBadge size="sm" />}
                    </div>
                    <span className="text-xs text-white/60 truncate">{currentTrack.artist}</span>
                  </div>
                  <button 
                    onClick={() => setIsMenuOpen(false)}
                    className="text-white/60 hover:text-white p-1 rounded-full"
                    aria-label="Close menu"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Menu list */}
                <div className="flex flex-col gap-1 overflow-y-auto">
                  {/* 1. Добавить в любимые треки */}
                  <button 
                    onClick={handleToggleLike}
                    className="flex items-center gap-3.5 w-full py-3 px-2 rounded-xl text-left hover:bg-white/10 active:bg-white/15 transition group"
                  >
                    <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition">
                      <Heart 
                        size={18} 
                        fill={isLiked(currentTrack.id) ? "currentColor" : "none"} 
                        className={isLiked(currentTrack.id) ? "text-primary" : "text-white/80 group-hover:text-white"} 
                      />
                    </div>
                    <span className="text-sm font-medium text-white/90 group-hover:text-white">
                      {isLiked(currentTrack.id) ? "Удалить из любимых треков" : "Добавить в любимые треки"}
                    </span>
                  </button>

                  {/* 2. Добавить в плейлист */}
                  <button 
                    onClick={handleAddToPlaylist}
                    className="flex items-center gap-3.5 w-full py-3 px-2 rounded-xl text-left hover:bg-white/10 active:bg-white/15 transition group"
                  >
                    <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition text-white/80 group-hover:text-white">
                      <Plus size={18} />
                    </div>
                    <span className="text-sm font-medium text-white/90 group-hover:text-white">
                      Добавить в плейлист
                    </span>
                  </button>

                  {/* 3. Удалить из плейлиста */}
                  <button 
                    onClick={handleRemoveFromPlaylist}
                    className="flex items-center gap-3.5 w-full py-3 px-2 rounded-xl text-left hover:bg-white/10 active:bg-white/15 transition group"
                  >
                    <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition text-red-400">
                      <Trash2 size={18} />
                    </div>
                    <span className="text-sm font-medium text-white/90 group-hover:text-white">
                      Удалить из плейлиста
                    </span>
                  </button>

                  {/* 4. Включить следующим */}
                  <button 
                    onClick={handlePlayNext}
                    className="flex items-center gap-3.5 w-full py-3 px-2 rounded-xl text-left hover:bg-white/10 active:bg-white/15 transition group"
                  >
                    <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition text-white/80 group-hover:text-white">
                      <ListMusic size={18} />
                    </div>
                    <span className="text-sm font-medium text-white/90 group-hover:text-white">
                      Включить следующим
                    </span>
                  </button>

                  {/* 5. Открыть альбом */}
                  <button 
                    onClick={handleOpenAlbum}
                    className="flex items-center gap-3.5 w-full py-3 px-2 rounded-xl text-left hover:bg-white/10 active:bg-white/15 transition group"
                  >
                    <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition text-white/80 group-hover:text-white">
                      <Disc size={18} />
                    </div>
                    <span className="text-sm font-medium text-white/90 group-hover:text-white">
                      Открыть альбом
                    </span>
                  </button>

                  {/* 6. Перейти на страницу артиста */}
                  <button 
                    onClick={handleGoToArtistClick}
                    className="flex items-center justify-between w-full py-3 px-2 rounded-xl text-left hover:bg-white/10 active:bg-white/15 transition group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition text-white/80 group-hover:text-white">
                        <User size={18} />
                      </div>
                      <span className="text-sm font-medium text-white/90 group-hover:text-white truncate">
                        Перейти на страницу артиста
                      </span>
                    </div>
                    {getTrackArtists(currentTrack).length > 1 && (
                      <ChevronRight size={18} className="text-white/40 group-hover:text-white shrink-0 ml-2" />
                    )}
                  </button>
                </div>
              </>
            )}

            {menuView === 'artists' && (
              <>
                {/* Header for Artist Selection */}
                <div className="flex items-center gap-3 pb-3 border-b border-white/10 mb-2">
                  <button 
                    onClick={() => setMenuView('main')}
                    className="p-1.5 -ml-1.5 rounded-full hover:bg-white/10 transition text-white/80 hover:text-white"
                    aria-label="Back to main menu"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <h3 className="font-bold text-base text-white">Выберите артиста</h3>
                </div>

                <div className="flex flex-col gap-1 overflow-y-auto max-h-[50vh]">
                  {getTrackArtists(currentTrack).map((artistName) => {
                    const artistTrack = tracks.find(t => t.artist === artistName || (t.mainArtists && t.mainArtists.includes(artistName)));
                    const artistImg = artistTrack ? getTrackCover(artistTrack) : null;
                    return (
                      <button 
                        key={artistName}
                        onClick={() => handleSelectArtist(artistName)}
                        className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-white/10 active:bg-white/15 transition group text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {artistImg ? (
                            <img src={artistImg} alt={artistName} className="w-11 h-11 rounded-full object-cover shrink-0 shadow" />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                              <User size={20} className="text-white/70" />
                            </div>
                          )}
                          <span className="font-semibold text-white text-base truncate">{artistName}</span>
                        </div>
                        <ChevronRight size={18} className="text-white/40 group-hover:text-white shrink-0 ml-2" />
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {menuView === 'remove_playlist' && (
              <>
                {/* Header for Remove Playlist Selection */}
                <div className="flex items-center gap-3 pb-3 border-b border-white/10 mb-2">
                  <button 
                    onClick={() => setMenuView('main')}
                    className="p-1.5 -ml-1.5 rounded-full hover:bg-white/10 transition text-white/80 hover:text-white"
                    aria-label="Back to main menu"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <h3 className="font-bold text-base text-white">Удалить из плейлиста</h3>
                </div>

                <div className="flex flex-col gap-1 overflow-y-auto max-h-[50vh]">
                  {playlists
                    .filter(p => {
                      if (p.isSystem || p.id.startsWith('liked') || p.id === 'liked') return false;
                      const isOwner = currentUser ? p.ownerId === currentUser.id : (!p.ownerId || p.ownerId === 'guest');
                      return isOwner && p.tracks && p.tracks.includes(currentTrack.id);
                    })
                    .map((pl) => (
                      <button 
                        key={pl.id}
                        onClick={() => {
                          removeFromPlaylist(pl.id, currentTrack.id);
                          showNotification(`Трек удален из плейлиста "${pl.name}"`, "success");
                          setIsMenuOpen(false);
                          setMenuView('main');
                        }}
                        className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-white/10 active:bg-white/15 transition group text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 bg-white/10 flex items-center justify-center rounded-lg overflow-hidden shrink-0">
                            {pl.customCover ? (
                              <img src={pl.customCover} alt={pl.name} className="w-full h-full object-cover" />
                            ) : (
                              <ListMusic size={20} className="text-white/70" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-white text-base truncate">{pl.name}</span>
                            <span className="text-xs text-white/60">{pl.tracks.length} {pl.tracks.length === 1 ? 'трек' : 'треков'}</span>
                          </div>
                        </div>
                        <Trash2 size={18} className="text-red-400 shrink-0 ml-2" />
                      </button>
                    ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};