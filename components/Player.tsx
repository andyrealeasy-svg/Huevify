import React, { useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume, Volume1, Volume2, VolumeX, Heart, Plus } from './Icons';
import { PlayMode } from '../types';
import { extractColorFromImage } from '../utils/colorExtractor';

const formatTime = (seconds: number) => {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const Player = () => {
  const { 
    currentTrack, isPlaying, togglePlay, nextTrack, prevTrack, 
    progress, duration, seek, volume, setVolume, playMode, toggleRepeat,
    isLiked, toggleLike, setMobilePlayerOpen, isShuffle, toggleShuffle,
    openAddToPlaylist, goToArtist, getTrackCover, t
  } = useStore();

  const cover = currentTrack ? getTrackCover(currentTrack) : '';
  const prevVolumeRef = useRef(volume > 0 ? volume : 1);

  const toggleMute = () => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(prevVolumeRef.current || 1);
    }
  };

  useEffect(() => {
    if (cover && currentTrack) {
      extractColorFromImage(cover, currentTrack.id || currentTrack.title || '');
    }
  }, [cover, currentTrack?.id]);

  if (!currentTrack) {
    return null;
  }

  const allArtists = Array.from(new Set([currentTrack.artist, ...(currentTrack.mainArtists || [])]));

  return (
    // On mobile: floating card bottom-[68px] with horizontal margins, rounded corners and shadow. On desktop: full-width bottom bar height-24.
    <div className="fixed bottom-[68px] left-2 right-2 md:bottom-0 md:left-0 md:right-0 md:w-full h-14 md:h-24 bg-[#212124]/95 md:bg-surface backdrop-blur-xl md:backdrop-blur-none rounded-lg md:rounded-none border border-white/10 md:border-t md:border-surface-highlight md:border-x-0 md:border-b-0 shadow-[0_8px_24px_rgba(0,0,0,0.85)] md:shadow-none px-2.5 md:px-4 flex items-center justify-between z-50 transition-all select-none overflow-hidden">
      
      {/* Track Info - Clickable on mobile to open full player */}
      <div 
        className="flex items-center flex-1 min-w-0 mr-2 md:mr-0 md:w-1/4 md:min-w-[180px] overflow-hidden cursor-pointer md:cursor-default"
        onClick={() => {
            if (window.innerWidth < 768) {
                setMobilePlayerOpen(true);
            }
        }}
      >
        <img 
          src={cover} 
          alt="Cover" 
          className="h-10 w-10 md:h-14 md:w-14 rounded md:rounded-md shadow-md mr-2.5 md:mr-4 flex-shrink-0 object-cover" 
        />
        <div className="flex flex-col overflow-hidden min-w-0 mr-2 md:mr-4 flex-1">
          <span className="text-xs md:text-sm font-semibold text-white truncate hover:underline cursor-pointer leading-tight">
            {currentTrack.title}
          </span>
          <div className="text-[11px] md:text-xs text-white/70 md:text-secondary truncate mt-0.5 leading-tight">
              {allArtists.map((a, i) => (
                  <span key={a}>
                      {i > 0 && ", "}
                      <span 
                        onClick={(e) => { e.stopPropagation(); goToArtist(a); }} 
                        className="hover:text-white hover:underline cursor-pointer"
                      >
                          {a}
                      </span>
                  </span>
              ))}
          </div>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); toggleLike(currentTrack.id); }} 
          className={`hidden md:block hover:scale-105 transition mr-2 ${isLiked(currentTrack.id) ? 'text-primary' : 'text-secondary hover:text-white'}`}
          title={isLiked(currentTrack.id) ? "В любимых" : "Добавить в любимые"}
        >
          <Heart size={20} fill={isLiked(currentTrack.id) ? 'currentColor' : 'none'} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); openAddToPlaylist(currentTrack.id); }} 
          className="hidden md:block hover:scale-105 transition text-secondary hover:text-white"
          title="Добавить в плейлист"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Mobile Controls Right Side */}
      <div className="flex items-center gap-1.5 md:hidden shrink-0">
        <button 
          onClick={(e) => { e.stopPropagation(); toggleLike(currentTrack.id); }} 
          className={`p-2 transition active:scale-90 ${isLiked(currentTrack.id) ? 'text-primary' : 'text-white/70 hover:text-white'}`}
          title={isLiked(currentTrack.id) ? "В любимых" : "Добавить в любимые"}
        >
          <Heart size={20} fill={isLiked(currentTrack.id) ? 'currentColor' : 'none'} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
          className="p-2 text-white hover:text-white/90 active:scale-90 transition flex items-center justify-center"
          title={isPlaying ? "Пауза" : "Воспроизведение"}
        >
          {isPlaying ? (
            <Pause size={22} fill="currentColor" />
          ) : (
            <Play size={22} fill="currentColor" className="ml-0.5" />
          )}
        </button>
      </div>

      {/* Controls (Desktop Centered) */}
      <div className="hidden md:flex flex-col items-center w-auto md:w-2/4 max-w-2xl">
        <div className="flex items-center gap-4 md:gap-6 mb-0 md:mb-2">
          <button 
             onClick={toggleShuffle}
             className={`transition ${isShuffle ? 'text-primary' : 'text-secondary hover:text-white'}`}
             title="Перемешать"
          >
            <Shuffle size={20} />
          </button>
          <button onClick={prevTrack} className="text-secondary hover:text-white transition" title="Предыдущий трек">
            <SkipBack size={24} fill="currentColor" />
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
            className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-105 transition text-black shadow-md"
            title={isPlaying ? "Пауза" : "Воспроизведение"}
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
          </button>

          <button onClick={nextTrack} className="text-secondary hover:text-white transition" title="Следующий трек">
            <SkipForward size={24} fill="currentColor" />
          </button>
          <button 
            onClick={toggleRepeat} 
            className={`transition relative ${playMode !== PlayMode.OFF ? 'text-primary' : 'text-secondary hover:text-white'}`}
            title="Повтор"
          >
            <Repeat size={20} />
            {playMode === PlayMode.ONE && <span className="absolute text-[8px] font-bold top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary">1</span>}
            {playMode === PlayMode.CONTEXT && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>}
          </button>
        </div>

        {/* Progress Bar (Desktop) */}
        <div className="flex items-center w-full gap-2 text-xs text-secondary">
          <span>{formatTime(progress)}</span>
          <div className="flex-1 h-1 bg-surface-highlight rounded-full relative group">
             <input
                type="range"
                min={0}
                max={duration || 100}
                value={progress}
                onChange={(e) => seek(Number(e.target.value))}
                className="absolute w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div 
                className="h-full bg-white rounded-full group-hover:bg-primary transition-colors"
                style={{ width: `${(progress / (duration || 1)) * 100}%` }}
              />
          </div>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume (Desktop) */}
      <div className="hidden md:flex items-center justify-end w-1/4 min-w-[150px] gap-2">
        <button 
          type="button"
          onClick={toggleMute}
          className="text-secondary hover:text-white transition focus:outline-none p-1 rounded hover:bg-white/5"
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
          className="w-24 h-1 bg-surface-highlight rounded-full relative group cursor-pointer"
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
              className="h-full bg-white rounded-full group-hover:bg-primary transition-colors"
              style={{ width: `${volume * 100}%` }}
            />
        </div>
      </div>

      {/* Floating Mini Player Progress Bar (Bottom outline on mobile) */}
      <div className="absolute bottom-0 left-0 right-0 w-full h-[2.5px] bg-white/15 md:hidden pointer-events-none rounded-b-lg overflow-hidden">
        <div 
          className="h-full bg-white transition-[width] duration-150 ease-linear" 
          style={{ width: `${(progress / (duration || 1)) * 100}%` }} 
        />
      </div>
    </div>
  );
};