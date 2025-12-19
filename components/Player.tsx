import React from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, Heart, Plus } from './Icons.tsx';
import { PlayMode } from '../types.ts';

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
    openAddToPlaylist, goToArtist
  } = useStore();

  if (!currentTrack) {
    return (
      <div className="fixed bottom-16 md:bottom-0 w-full h-16 md:h-24 bg-surface border-t border-surface-highlight flex items-center justify-center text-secondary text-sm z-50">
        Select a track to start listening
      </div>
    );
  }

  return (
    <div className="fixed bottom-16 md:bottom-0 left-0 w-full h-16 md:h-24 bg-surface border-t border-surface-highlight px-4 flex items-center justify-between z-50 transition-all">
      
      <div 
        className="flex items-center w-full md:w-1/4 md:min-w-[180px] overflow-hidden cursor-pointer md:cursor-default"
        onClick={() => {
            if (window.innerWidth < 768) {
                setMobilePlayerOpen(true);
            }
        }}
      >
        <img src={currentTrack.cover} alt="Cover" className="h-10 w-10 md:h-14 md:w-14 rounded shadow mr-3 md:mr-4 flex-shrink-0" />
        <div className="flex flex-col overflow-hidden mr-2 md:mr-4 flex-1">
          <span className="text-sm font-semibold text-white truncate hover:underline cursor-pointer">{currentTrack.title}</span>
          <span 
            onClick={(e) => { e.stopPropagation(); goToArtist(currentTrack.artist); }} 
            className="text-xs text-secondary truncate hover:text-white hover:underline cursor-pointer"
          >
            {currentTrack.artist}
          </span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); toggleLike(currentTrack.id); }} 
          className={`hidden md:block hover:scale-105 transition mr-2 ${isLiked(currentTrack.id) ? 'text-primary' : 'text-secondary hover:text-white'}`}
        >
          <Heart size={20} fill={isLiked(currentTrack.id) ? 'currentColor' : 'none'} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); openAddToPlaylist(currentTrack.id); }} 
          className="hidden md:block hover:scale-105 transition text-secondary hover:text-white"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex flex-col items-center w-auto md:w-2/4 max-w-2xl md:static absolute right-4 md:right-auto">
        <div className="flex items-center gap-4 md:gap-6 mb-0 md:mb-2">
          <button 
             onClick={toggleShuffle}
             className={`hidden md:block transition ${isShuffle ? 'text-primary' : 'text-secondary hover:text-white'}`}
          >
            <Shuffle size={20} />
          </button>
          <button onClick={prevTrack} className="hidden md:block text-secondary hover:text-white transition">
            <SkipBack size={24} fill="currentColor" />
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
            className="w-8 h-8 md:w-8 md:h-8 bg-white rounded-full flex items-center justify-center hover:scale-105 transition text-black"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
          </button>

          <button onClick={nextTrack} className="text-secondary hover:text-white transition ml-2 md:ml-0">
            <SkipForward size={24} fill="currentColor" />
          </button>
          <button 
            onClick={toggleRepeat} 
            className={`hidden md:block transition relative ${playMode !== PlayMode.OFF ? 'text-primary' : 'text-secondary hover:text-white'}`}
          >
            <Repeat size={20} />
            {playMode === PlayMode.ONE && <span className="absolute text-[8px] font-bold top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary">1</span>}
            {playMode === PlayMode.CONTEXT && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>}
          </button>
        </div>

        <div className="hidden md:flex items-center w-full gap-2 text-xs text-secondary">
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

      <div className="hidden md:flex items-center justify-end w-1/4 min-w-[150px] gap-2">
        <Volume2 size={20} className="text-secondary" />
        <div className="w-24 h-1 bg-surface-highlight rounded-full relative group">
            <input 
              type="range" 
              min={0} 
              max={1} 
              step={0.01} 
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="absolute w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div 
              className="h-full bg-white rounded-full group-hover:bg-primary transition-colors"
              style={{ width: `${volume * 100}%` }}
            />
        </div>
      </div>

      <div className="absolute top-0 left-0 w-full h-[2px] bg-transparent md:hidden pointer-events-none">
        <div className="h-full bg-primary" style={{ width: `${(progress / (duration || 1)) * 100}%` }} />
      </div>
    </div>
  );
};