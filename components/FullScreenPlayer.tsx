import React from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { 
  ChevronDown, Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, 
  Heart, Plus, ListMusic, Volume2
} from './Icons.tsx';
import { PlayMode } from '../types.ts';

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
    isShuffle, toggleShuffle, volume, setVolume, goToArtist
  } = useStore();

  if (!isMobilePlayerOpen || !currentTrack) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-indigo-900 via-background to-black z-[60] flex flex-col p-6 animate-in slide-in-from-bottom duration-300 md:hidden">
      
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => setMobilePlayerOpen(false)} className="text-white">
          <ChevronDown size={32} />
        </button>
        <span className="text-xs font-bold tracking-widest uppercase">Now Playing</span>
        <button className="text-white" onClick={() => openAddToPlaylist(currentTrack.id)}>
          <Plus size={24} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center mb-8">
        <div className="w-full aspect-square shadow-2xl rounded-lg overflow-hidden">
          <img src={currentTrack.cover} alt={currentTrack.title} className="w-full h-full object-cover" />
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col overflow-hidden mr-4">
          <h2 className="text-2xl font-bold text-white truncate marquee">{currentTrack.title}</h2>
          <p 
            onClick={() => goToArtist(currentTrack.artist)} 
            className="text-lg text-secondary truncate underline decoration-transparent hover:decoration-secondary cursor-pointer transition"
          >
            {currentTrack.artist}
          </p>
        </div>
        <button 
            onClick={() => toggleLike(currentTrack.id)}
            className={`${isLiked(currentTrack.id) ? 'text-primary' : 'text-white'}`}
        >
            <Heart size={32} fill={isLiked(currentTrack.id) ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="mb-6">
        <div className="w-full h-1 bg-surface-highlight rounded-full mb-2 relative group">
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
        <div className="flex justify-between text-xs text-secondary font-medium">
          <span>{formatTime(progress)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex justify-between items-center mb-8">
        <button 
            onClick={toggleShuffle}
            className={`${isShuffle ? 'text-primary' : 'text-secondary hover:text-white'} transition`}
        >
          <Shuffle size={24} />
        </button>
        
        <button onClick={prevTrack} className="text-white hover:scale-110 transition">
          <SkipBack size={36} fill="currentColor" />
        </button>
        
        <button 
          onClick={togglePlay} 
          className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-105 transition text-black"
        >
          {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
        </button>

        <button onClick={nextTrack} className="text-white hover:scale-110 transition">
          <SkipForward size={36} fill="currentColor" />
        </button>
        
        <button 
            onClick={toggleRepeat} 
            className={`${playMode !== PlayMode.OFF ? 'text-primary' : 'text-secondary'} transition relative`}
        >
          <Repeat size={24} />
          {playMode === PlayMode.ONE && <span className="absolute text-[8px] font-bold top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary">1</span>}
          {playMode === PlayMode.CONTEXT && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>}
        </button>
      </div>

      <div className="flex items-center gap-3">
         <Volume2 size={20} className="text-secondary" />
         <div className="flex-1 h-1 bg-surface-highlight rounded-full relative group">
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
              className="h-full bg-white rounded-full"
              style={{ width: `${volume * 100}%` }}
            />
         </div>
      </div>

    </div>
  );
};