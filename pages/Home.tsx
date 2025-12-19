import React from 'react';
import { useStore } from '../context/StoreContext';
import { Play, ListMusic } from '../components/Icons';

const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
};

export const Home = () => {
  const { albums, setView, tracks, playTrack, recommendations, recentlyPlayed } = useStore();

  const allCharts = [...tracks].sort((a, b) => b.plays - a.plays).slice(0, 25);
  const previewCharts = allCharts.slice(0, 5);

  return (
    <div className="p-4 md:p-8 pb-64 w-full h-full overflow-y-auto page-enter">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 animate-appear">Good evening</h2>

      <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 animate-appear">
        
        {/* Liked Songs */}
        <div 
          onClick={() => setView({ type: 'PLAYLIST', id: 'liked' })}
          className="bg-surface/50 hover:bg-surface rounded overflow-hidden flex items-center cursor-pointer group order-first hover-scale"
        >
          <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-indigo-700 to-blue-300 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold">♥</span>
          </div>
          <span className="font-bold ml-4">Liked Songs</span>
          <div className="ml-auto mr-4 w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
            <Play fill="black" className="text-black ml-1" />
          </div>
        </div>

        {/* Recently Played */}
        {recentlyPlayed.length > 0 && (
            <div 
                onClick={() => setView({ type: 'PLAYLIST', id: 'history' })}
                className="bg-surface/50 hover:bg-surface rounded overflow-hidden flex items-center cursor-pointer group order-2 hover-scale"
            >
                <div className="w-16 h-16 md:w-20 md:h-20 bg-surface-highlight flex items-center justify-center shrink-0">
                    <ListMusic size={32} className="text-secondary" />
                </div>
                <div className="flex flex-col ml-4 overflow-hidden">
                    <span className="font-bold">Recently Played</span>
                    <span className="text-xs text-secondary truncate">{recentlyPlayed.length} tracks</span>
                </div>
                <div className="ml-auto mr-4 w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                    <Play fill="black" className="text-black ml-1" />
                </div>
            </div>
        )}

      </div>
      
      {recommendations.length > 0 && (
        <div className="mb-8 animate-appear">
          <h3 className="text-xl md:text-2xl font-bold mb-4">Recommended for you</h3>
          <div className="flex overflow-x-auto gap-4 md:grid md:grid-cols-4 lg:grid-cols-6 pb-4 md:pb-0 snap-x no-scrollbar">
             {recommendations.map(track => (
               <div 
                 key={track.id} 
                 onClick={() => playTrack(track)}
                 className="min-w-[140px] md:min-w-0 p-3 md:p-4 bg-surface hover:bg-surface-highlight rounded-lg cursor-pointer group snap-start flex-col flex-shrink-0 hover-scale"
               >
                 <div className="relative mb-3 md:mb-4">
                   <img src={track.cover} alt={track.title} className="w-full aspect-square object-cover rounded shadow-lg" />
                   <div className="absolute bottom-2 right-2 w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                     <Play fill="black" size={20} className="text-black ml-1" />
                   </div>
                 </div>
                 <h4 className="font-bold truncate text-sm">{track.title}</h4>
                 <p className="text-xs text-secondary truncate">{track.artist}</p>
               </div>
             ))}
          </div>
        </div>
      )}

      <div className="flex items-end justify-between mb-4 animate-appear">
          <h3 className="text-xl md:text-2xl font-bold">Daily Charts (Top 25)</h3>
          <button 
            onClick={() => setView({ type: 'CHARTS' })}
            className="text-xs font-bold text-secondary hover:text-white uppercase tracking-wider mb-1"
          >
            Show All
          </button>
      </div>
      
      <div className="flex flex-col gap-2 mb-8 animate-slide-up">
        {previewCharts.map((track, idx) => (
          <div 
            key={track.id} 
            className="grid grid-cols-[16px_1fr_60px] md:grid-cols-[16px_1fr_80px_60px] items-center gap-4 p-2 rounded hover:bg-surface-highlight group cursor-pointer"
            onClick={() => playTrack(track)}
          >
            <div className="w-4 text-center">
                 <span className="text-secondary font-mono block group-hover:hidden text-sm">{idx + 1}</span>
                 <Play size={16} fill="white" className="hidden group-hover:block" />
            </div>
            
            <div className="flex items-center gap-3 md:gap-4 flex-1 overflow-hidden">
                <img src={track.cover} alt={track.title} className="w-10 h-10 md:w-10 md:h-10 rounded" />
                <div className="flex-1 overflow-hidden">
                  <div className="font-semibold text-white truncate group-hover:underline text-sm md:text-base">{track.title}</div>
                  <div className="text-xs text-secondary truncate">{track.artist}</div>
                </div>
            </div>

            <div className="text-xs text-secondary hidden md:block">{track.plays.toLocaleString()} plays</div>
            <div className="text-xs text-secondary text-right">{formatDuration(track.duration)}</div>
          </div>
        ))}
      </div>

      <h3 className="text-xl md:text-2xl font-bold mb-4 animate-appear">Popular Albums</h3>
      <div className="flex overflow-x-auto gap-4 md:grid md:grid-cols-4 lg:grid-cols-5 pb-4 md:pb-0 snap-x no-scrollbar animate-slide-up">
        {albums.map(album => (
          <div 
            key={album.id} 
            onClick={() => setView({ type: 'ALBUM', id: album.id })}
            className="min-w-[150px] md:min-w-0 p-3 md:p-4 bg-surface hover:bg-surface-highlight rounded-lg cursor-pointer group snap-start flex-shrink-0 hover-scale"
          >
            <div className="relative mb-3 md:mb-4">
              <img src={album.cover} alt={album.title} className="w-full aspect-square object-cover rounded shadow-lg" />
              <div className="absolute bottom-2 right-2 w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                <Play fill="black" size={24} className="text-black ml-1" />
              </div>
            </div>
            <h4 className="font-bold truncate text-sm md:text-base">{album.title}</h4>
            <p className="text-xs md:text-sm text-secondary truncate">{album.artist} • {album.year}</p>
          </div>
        ))}
      </div>
    </div>
  );
};