import React from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Play, ListMusic, User as UserIcon } from '../components/Icons.tsx';

const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
};

export const Home = () => {
  const { albums, setView, tracks, playTrack, recommendations, recentlyPlayed, currentUser, setProfileModalOpen, appSettings, dailyChart, goToArtist, likedPlaylistId, getTrackCover } = useStore();

  const previewCharts = dailyChart.slice(0, 5);
  
  const latestReleases = [...albums].sort((a, b) => {
      const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : new Date(a.year, 0, 1).getTime();
      const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : new Date(b.year, 0, 1).getTime();
      return dateB - dateA;
  }).slice(0, 5);

  const getGreeting = () => {
      const hour = new Date().getHours();
      const lang = appSettings.language;
      
      let morning = "Good morning";
      let afternoon = "Good afternoon";
      let evening = "Good evening";

      if (lang === 'Russian') {
          morning = "Доброе утро";
          afternoon = "Добрый день";
          evening = "Добрый вечер";
      }

      if (hour < 12) return morning;
      if (hour < 18) return afternoon;
      return evening;
  };

  return (
    <div className="p-4 md:p-8 pb-64 w-full h-full overflow-y-auto page-enter">
      {/* Mobile Header with Avatar */}
      <div className="flex items-center gap-3 mb-6 animate-appear">
          <div 
             onClick={() => setProfileModalOpen(true)}
             className="w-9 h-9 md:hidden rounded-full bg-zinc-700 overflow-hidden flex items-center justify-center cursor-pointer flex-shrink-0"
          >
              {currentUser?.avatar ? (
                  <img src={currentUser.avatar} className="w-full h-full object-cover" alt="Me" />
              ) : (
                  <UserIcon size={18} className="text-secondary" />
              )}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold">{getGreeting()}</h2>
      </div>

      <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 animate-appear">
        
        {/* Liked Songs */}
        <div 
          onClick={() => setView({ type: 'PLAYLIST', id: likedPlaylistId })}
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
             {recommendations.map(track => {
               const allArtists = Array.from(new Set([track.artist, ...(track.mainArtists || [])]));
               return (
               <div 
                 key={track.id} 
                 onClick={() => playTrack(track)}
                 className="w-[140px] md:w-auto p-3 md:p-4 bg-surface hover:bg-surface-highlight rounded-lg cursor-pointer group snap-start flex-col flex-shrink-0 hover-scale"
               >
                 <div className="relative mb-3 md:mb-4 w-full aspect-square">
                   <img src={getTrackCover(track)} alt={track.title} className="w-full h-full object-cover rounded shadow-lg" />
                   <div className="absolute bottom-2 right-2 w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                     <Play fill="black" size={20} className="text-black ml-1" />
                   </div>
                 </div>
                 <h4 className="font-bold truncate text-sm flex items-center gap-1">
                     {track.title}
                     {track.explicit && <span className="text-[8px] border border-secondary text-secondary px-1 rounded bg-surface">E</span>}
                 </h4>
                 <p className="text-xs text-secondary truncate">
                     {allArtists.join(", ")}
                 </p>
               </div>
             )})}
          </div>
        </div>
      )}

      <div className="flex items-end justify-between mb-4 animate-appear">
          <h3 className="text-xl md:text-2xl font-bold">Huevify Daily Top 25</h3>
          <button 
            onClick={() => setView({ type: 'CHARTS' })}
            className="text-xs font-bold text-secondary hover:text-white uppercase tracking-wider mb-1"
          >
            Show All
          </button>
      </div>
      
      <div className="flex flex-col gap-2 mb-8 animate-slide-up">
        {previewCharts.length === 0 ? (
            <div className="text-secondary text-sm">Chart data updating...</div>
        ) : (
            previewCharts.map((track, idx) => {
                const allArtists = Array.from(new Set([track.artist, ...(track.mainArtists || [])]));
                return (
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
                        <img src={getTrackCover(track)} alt={track.title} className="w-10 h-10 md:w-10 md:h-10 rounded object-cover" />
                        <div className="flex-1 overflow-hidden">
                        <div className="font-semibold text-white truncate group-hover:underline text-sm md:text-base flex items-center gap-2">
                            {track.title}
                            {track.explicit && <span className="text-[8px] border border-secondary text-secondary px-1 rounded bg-surface">E</span>}
                        </div>
                        <div className="text-xs text-secondary truncate flex items-center gap-1">
                            {allArtists.map((a, i) => (
                                <span key={a}>
                                    {i > 0 && ", "}
                                    <span onClick={(e) => { e.stopPropagation(); goToArtist(a); }} className="hover:underline cursor-pointer">{a}</span>
                                </span>
                            ))}
                            {/* Mobile Plays */}
                            <span className="md:hidden">• +{track.dailyPlays.toLocaleString()}</span>
                        </div>
                        </div>
                    </div>

                    <div className="text-xs text-secondary hidden md:block">+{track.dailyPlays.toLocaleString()}</div>
                    <div className="text-xs text-secondary text-right">{formatDuration(track.duration)}</div>
                </div>
            )})
        )}
      </div>

      <h3 className="text-xl md:text-2xl font-bold mb-4 animate-appear">Latest Releases</h3>
      <div className="flex overflow-x-auto gap-4 md:grid md:grid-cols-4 lg:grid-cols-5 pb-4 md:pb-0 snap-x no-scrollbar animate-slide-up mb-8">
        {latestReleases.map(album => (
          <div 
            key={album.id} 
            onClick={() => setView({ type: 'ALBUM', id: album.id })}
            className="w-[150px] md:w-auto p-3 md:p-4 bg-surface hover:bg-surface-highlight rounded-lg cursor-pointer group snap-start flex-shrink-0 hover-scale"
          >
            <div className="relative mb-3 md:mb-4 w-full aspect-square">
              <img src={album.covers[0]} alt={album.title} className="w-full h-full object-cover rounded shadow-lg" />
              <div className="absolute bottom-2 right-2 w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                <Play fill="black" size={24} className="text-black ml-1" />
              </div>
            </div>
            <h4 className="font-bold truncate text-sm md:text-base">{album.title}</h4>
            <p className="text-xs md:text-sm text-secondary truncate">{album.artist}</p>
          </div>
        ))}
      </div>

      <h3 className="text-xl md:text-2xl font-bold mb-4 animate-appear">Popular Albums</h3>
      <div className="flex overflow-x-auto gap-4 md:grid md:grid-cols-4 lg:grid-cols-5 pb-4 md:pb-0 snap-x no-scrollbar animate-slide-up">
        {albums.map(album => (
          <div 
            key={album.id} 
            onClick={() => setView({ type: 'ALBUM', id: album.id })}
            className="w-[150px] md:w-auto p-3 md:p-4 bg-surface hover:bg-surface-highlight rounded-lg cursor-pointer group snap-start flex-shrink-0 hover-scale"
          >
            <div className="relative mb-3 md:mb-4 w-full aspect-square">
              <img src={album.covers[0]} alt={album.title} className="w-full h-full object-cover rounded shadow-lg" />
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