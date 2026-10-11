import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Play, ListMusic, User as UserIcon, Clock } from '../components/Icons.tsx';
import { ExplicitBadge } from '../components/ExplicitBadge.tsx';
import { PlayingVisualizer } from '../components/PlayingVisualizer.tsx';
import { TrackRow } from '../components/TrackRow.tsx';
import { StorageService } from '../services/storage.ts';
import { SupabaseService, isSupabaseConfigured } from '../services/supabase.ts';
import { formatCompactNumber } from '../utils/formatters.ts';

const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
};

export const Home = () => {
  const { albums, setView, tracks, playTrack, recommendations, recentlyPlayed, currentUser, setProfileModalOpen, appSettings, dailyChart, goToArtist, likedPlaylistId, getTrackCover, getAlbumCover, getArtistAvatar, getArtistStats, existingArtists, artistAccounts, currentTrack, isPlaying, t } = useStore();
  const isLiquidGlass = appSettings?.liquidGlassNav !== false;

  const [remotePlays14d, setRemotePlays14d] = useState<Record<string, number>>({});

  useEffect(() => {
    let isMounted = true;
    if (isSupabaseConfigured()) {
      const twoWeeksAgoISO = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

      SupabaseService.fetchDailyPlaysSince(twoWeeksAgoISO).then(res => {
        if (isMounted && res) {
          setRemotePlays14d(res);
        }
      }).catch(err => console.warn('Home 14d plays fetch error:', err));
    }
    return () => { isMounted = false; };
  }, []);

  const previewCharts = dailyChart.slice(0, 5);
  
  const latestReleases = useMemo(() => {
    return [...albums]
      .filter(a => !a.isUpcoming && !a.isAnnouncement)
      .sort((a, b) => {
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : new Date(a.year, 0, 1).getTime();
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : new Date(b.year, 0, 1).getTime();
        return dateB - dateA;
      }).slice(0, 5);
  }, [albums]);

  // Top 5 most listened releases in the last 2 weeks (14 days)
  const popularAlbums = useMemo(() => {
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const localLogs = StorageService.load<Array<{ trackId: string; plays: number; timestamp: number }>>('huevify_play_logs', []);
    const recentLogs = localLogs.filter(l => l.timestamp >= twoWeeksAgo);
    const localMap: Record<string, number> = {};
    recentLogs.forEach(l => {
      localMap[l.trackId] = (localMap[l.trackId] || 0) + (l.plays || 0);
    });

    const getAlbum14DayPlays = (album: typeof albums[0]): number => {
      const albumTracks = tracks.filter(t => (album.trackIds && album.trackIds.includes(t.id)) || t.album === album.title);
      
      // Sum plays from logs (Supabase remote logs + local logs)
      const logsSum = albumTracks.reduce((sum, t) => {
        const pRemote = remotePlays14d[t.id] || 0;
        const pLocal = localMap[t.id] || 0;
        return sum + Math.max(pRemote, pLocal);
      }, 0);

      if (logsSum > 0) return logsSum;

      // If release was published in the last 14 days, count all its track plays
      const relDate = album.releaseDate ? new Date(album.releaseDate).getTime() : 0;
      if (relDate >= twoWeeksAgo) {
        return albumTracks.reduce((sum, t) => sum + (t.plays || 0), 0);
      }

      // Proportional or baseline fallback based on release track plays
      return albumTracks.reduce((sum, t) => sum + (t.plays || 0), 0);
    };

    return [...albums]
      .filter(a => !a.isUpcoming && !a.isAnnouncement)
      .sort((a, b) => {
        const playsA = getAlbum14DayPlays(a);
        const playsB = getAlbum14DayPlays(b);
        if (playsB !== playsA) return playsB - playsA;
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : new Date(a.year, 0, 1).getTime();
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : new Date(b.year, 0, 1).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [albums, tracks, remotePlays14d]);

  // Top 10 artists by monthly plays (taken directly from artist stats / artist card)
  const topArtists = useMemo(() => {
    // 1. Gather all unique artist names across tracks, albums, artist accounts, and existingArtists list
    const artistNamesMap = new Map<string, string>(); // lowercase clean -> original display name

    existingArtists.forEach(name => {
      if (name && name.trim()) {
        const clean = name.trim().toLowerCase();
        if (!artistNamesMap.has(clean)) artistNamesMap.set(clean, name.trim());
      }
    });

    artistAccounts.forEach(acc => {
      if (acc.artistName && acc.artistName.trim()) {
        const clean = acc.artistName.trim().toLowerCase();
        if (!artistNamesMap.has(clean)) artistNamesMap.set(clean, acc.artistName.trim());
      }
    });

    albums.forEach(alb => {
      if (alb.artist && alb.artist.trim()) {
        const clean = alb.artist.trim().toLowerCase();
        if (!artistNamesMap.has(clean)) artistNamesMap.set(clean, alb.artist.trim());
      }
    });

    tracks.forEach(tr => {
      if (tr.artist && tr.artist.trim()) {
        const clean = tr.artist.trim().toLowerCase();
        if (!artistNamesMap.has(clean)) artistNamesMap.set(clean, tr.artist.trim());
      }
      if (Array.isArray(tr.mainArtists)) {
        tr.mainArtists.forEach(ma => {
          if (ma && ma.trim()) {
            const clean = ma.trim().toLowerCase();
            if (!artistNamesMap.has(clean)) artistNamesMap.set(clean, ma.trim());
          }
        });
      }
    });

    // 2. Build list with exact monthly plays from getArtistStats (same as on artist card)
    const list = Array.from(artistNamesMap.values()).map(name => {
      const clean = name.toLowerCase();

      // Find all tracks involving this artist
      const artistTracks = tracks.filter(t => {
        const matchesArtist = (t.artist || '').trim().toLowerCase() === clean;
        const matchesMain = Array.isArray(t.mainArtists) && t.mainArtists.some(m => (m || '').trim().toLowerCase() === clean);
        return matchesArtist || matchesMain;
      });

      // Monthly plays taken directly from the artist card stats (e.g. 12M for SiCk)
      const stats = getArtistStats(name);
      const monthlyPlays = stats ? stats.monthlyPlays : artistTracks.reduce((sum, t) => sum + (t.plays || 0), 0);

      // Resolve artist photo
      const acc = artistAccounts.find(a => (a.artistName || '').trim().toLowerCase() === clean && a.status === 'APPROVED' && a.avatar) ||
                  artistAccounts.find(a => (a.artistName || '').trim().toLowerCase() === clean && a.avatar);
      const photo = acc?.avatar || getArtistAvatar(name) || (artistTracks[0] ? getTrackCover(artistTracks[0]) : '');

      return {
        name,
        photo,
        monthlyPlays
      };
    });

    // Sort descending by monthly plays and take top 10
    return list
      .sort((a, b) => b.monthlyPlays - a.monthlyPlays)
      .slice(0, 10);
  }, [existingArtists, artistAccounts, albums, tracks, getArtistStats, getArtistAvatar, getTrackCover]);

  const formatArtistMonthlyPlays = (plays: number): string => {
    const isEn = appSettings?.language === 'English';
    return `${formatCompactNumber(plays, isEn)} ${t('monthlyPlays')}`;
  };

  const getGreeting = () => {
      const hour = new Date().getHours();
      
      if (hour < 12) return t('greeting_morning');
      if (hour < 18) return t('greeting_afternoon');
      return t('greeting_evening');
  };

  return (
    <div className="p-4 md:p-8 pb-64 w-full h-full overflow-y-auto page-enter">
      {/* Mobile Header with Avatar */}
      <div className="flex items-center gap-3 mb-6 animate-appear">
          <div 
             onClick={() => setProfileModalOpen(true)}
             className={`w-9 h-9 md:hidden rounded-full overflow-hidden flex items-center justify-center cursor-pointer flex-shrink-0 transition-transform active:scale-90 ${
               isLiquidGlass
                 ? 'ring-1.5 ring-white/30 shadow-[0_2px_12px_rgba(0,0,0,0.35)] bg-white/10 backdrop-blur-xl'
                 : 'bg-zinc-700'
             }`}
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
          className={`overflow-hidden flex items-center cursor-pointer group order-first hover-scale transition-all ${
            isLiquidGlass
              ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-2xl max-md:border max-md:border-white/15 max-md:rounded-2xl max-md:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] md:bg-surface/50 md:hover:bg-surface md:rounded'
              : 'bg-surface/50 hover:bg-surface rounded'
          }`}
        >
          <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-indigo-700 to-blue-300 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold">♥</span>
          </div>
          <span className="font-bold ml-4">{t('likedSongs')}</span>
          <div className="ml-auto mr-4 w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-primary-glow opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
            <Play fill="black" className="text-black ml-1" />
          </div>
        </div>

        {/* Recently Played */}
        {recentlyPlayed.length > 0 && (
            <div 
                onClick={() => setView({ type: 'PLAYLIST', id: 'history' })}
                className={`overflow-hidden flex items-center cursor-pointer group order-2 hover-scale transition-all ${
                  isLiquidGlass
                    ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-2xl max-md:border max-md:border-white/15 max-md:rounded-2xl max-md:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] md:bg-surface/50 md:hover:bg-surface md:rounded'
                    : 'bg-surface/50 hover:bg-surface rounded'
                }`}
            >
                <div className="w-16 h-16 md:w-20 md:h-20 bg-surface-highlight flex items-center justify-center shrink-0">
                    <ListMusic size={32} className="text-secondary" />
                </div>
                <div className="flex flex-col ml-4 overflow-hidden">
                    <span className="font-bold">{t('recentlyPlayed')}</span>
                    <span className="text-xs text-secondary truncate">{recentlyPlayed.length} {t('tracksLower')}</span>
                </div>
                <div className="ml-auto mr-4 w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-primary-glow opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                    <Play fill="black" className="text-black ml-1" />
                </div>
            </div>
        )}

      </div>
      
      {recommendations.length > 0 && (
        <div className="mb-8 animate-appear">
          <h3 className="text-xl md:text-2xl font-bold mb-4">{t('recForYou')}</h3>
          <div className="flex overflow-x-auto gap-4 md:grid md:grid-cols-4 lg:grid-cols-6 pb-4 md:pb-0 snap-x no-scrollbar">
             {recommendations.map(track => {
               const allArtists = Array.from(new Set([track.artist, ...(track.mainArtists || [])]));
               const isCurrent = currentTrack?.id === track.id;
               return (
               <div 
                 key={track.id} 
                 onClick={() => playTrack(track, recommendations)}
                 className={`w-[140px] md:w-auto p-3 md:p-4 cursor-pointer group snap-start flex-col flex-shrink-0 hover-scale transition-all ${
                   isLiquidGlass
                     ? 'max-md:bg-white/[0.06] max-md:backdrop-blur-2xl max-md:border max-md:border-white/15 max-md:rounded-2xl max-md:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] md:bg-surface md:hover:bg-surface-highlight md:rounded-lg'
                     : 'bg-surface hover:bg-surface-highlight rounded-lg'
                 }`}
               >
                 <div className="relative mb-3 md:mb-4 w-full aspect-square">
                   <img src={getTrackCover(track)} alt={track.title} className="w-full h-full object-cover rounded shadow-lg" />
                   <div className="absolute bottom-2 right-2 w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-primary-glow opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                     <Play fill="black" size={20} className="text-black ml-1" />
                   </div>
                 </div>
                 <div className="flex items-center gap-1.5 min-w-0">
                     {isCurrent && (
                         <PlayingVisualizer size="xs" isPlaying={isPlaying} className="mr-1 inline-flex" />
                     )}
                     <h4 className={`font-bold truncate text-sm ${isCurrent ? 'text-primary' : 'text-white'}`}>
                         {track.title}
                     </h4>
                     {track.explicit && <ExplicitBadge />}
                 </div>
                 <p className="text-xs text-secondary truncate">
                     {allArtists.join(", ")}
                 </p>
               </div>
             )})}
          </div>
        </div>
      )}

      <div className="flex items-end justify-between mb-4 animate-appear">
          <h3 className="text-xl md:text-2xl font-bold">{t('dailyTop')}</h3>
          <button 
            onClick={() => setView({ type: 'CHARTS' })}
            className="text-xs font-bold text-secondary hover:text-white uppercase tracking-wider mb-1"
          >
            {t('showAll')}
          </button>
      </div>
      
      <div className="flex flex-col gap-1 mb-8 animate-slide-up">
        {previewCharts.length === 0 ? (
            <div className="text-secondary text-sm p-4 bg-surface/30 rounded-lg flex items-center gap-2">
                <Clock size={16} className="text-primary" />
                <span>{t('chartCyclePendingDesc') || 'Суточный учёт в процессе. Обновление чарта ежедневно в 21:00 UTC+3.'}</span>
            </div>
        ) : (
            previewCharts.map((track, idx) => (
                <TrackRow 
                    key={track.id} 
                    track={track} 
                    index={idx} 
                    queue={previewCharts} 
                    showDailyPlays={true} 
                />
            ))
        )}
      </div>

      <h3 className="text-xl md:text-2xl font-bold mb-4 animate-appear">{t('latestReleases')}</h3>
      <div className="flex overflow-x-auto gap-4 md:grid md:grid-cols-4 lg:grid-cols-5 pb-4 md:pb-0 snap-x no-scrollbar animate-slide-up mb-8">
        {latestReleases.length === 0 ? (
          <div className="text-secondary text-sm p-4 bg-surface/40 rounded-lg col-span-full">{t('noReleases')}</div>
        ) : (
          latestReleases.map(album => (
            <div 
              key={album.id} 
              onClick={() => setView({ type: 'ALBUM', id: album.id })}
              className={`w-[150px] md:w-auto p-3 md:p-4 cursor-pointer group snap-start flex-shrink-0 hover-scale transition-all ${
                isLiquidGlass
                  ? 'max-md:bg-white/[0.06] max-md:backdrop-blur-2xl max-md:border max-md:border-white/15 max-md:rounded-2xl max-md:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] md:bg-surface md:hover:bg-surface-highlight md:rounded-lg'
                  : 'bg-surface hover:bg-surface-highlight rounded-lg'
              }`}
            >
              <div className="relative mb-3 md:mb-4 w-full aspect-square">
                <img src={album.covers[0]} alt={album.title} className="w-full h-full object-cover rounded shadow-lg" />
                <div className="absolute bottom-2 right-2 w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-primary-glow opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  <Play fill="black" size={24} className="text-black ml-1" />
                </div>
              </div>
              <h4 className="font-bold truncate text-sm md:text-base">{album.title}</h4>
              <p className="text-xs md:text-sm text-secondary truncate">{album.artist}</p>
            </div>
          ))
        )}
      </div>

      <h3 className="text-xl md:text-2xl font-bold mb-4 animate-appear">{t('popularAlbums')}</h3>
      <div className="flex overflow-x-auto gap-4 md:grid md:grid-cols-4 lg:grid-cols-5 pb-4 md:pb-0 snap-x no-scrollbar animate-slide-up mb-8">
        {popularAlbums.length === 0 ? (
          <div className="text-secondary text-sm p-4 bg-surface/40 rounded-lg col-span-full">{t('noReleases')}</div>
        ) : (
          popularAlbums.map(album => (
            <div 
              key={album.id} 
              onClick={() => setView({ type: 'ALBUM', id: album.id })}
              className={`w-[150px] md:w-auto p-3 md:p-4 cursor-pointer group snap-start flex-shrink-0 hover-scale transition-all ${
                isLiquidGlass
                  ? 'max-md:bg-white/[0.06] max-md:backdrop-blur-2xl max-md:border max-md:border-white/15 max-md:rounded-2xl max-md:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] md:bg-surface md:hover:bg-surface-highlight md:rounded-lg'
                  : 'bg-surface hover:bg-surface-highlight rounded-lg'
              }`}
            >
              <div className="relative mb-3 md:mb-4 w-full aspect-square">
                <img src={getAlbumCover ? getAlbumCover(album.id) : (album.covers[0] || '')} alt={album.title} className="w-full h-full object-cover rounded shadow-lg" />
                <div className="absolute bottom-2 right-2 w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-primary-glow opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  <Play fill="black" size={24} className="text-black ml-1" />
                </div>
              </div>
              <h4 className="font-bold truncate text-sm md:text-base">{album.title}</h4>
              <p className="text-xs md:text-sm text-secondary truncate">{album.artist} • {album.year}</p>
            </div>
          ))
        )}
      </div>

      {/* Top 10 Artists Section */}
      <h3 className="text-xl md:text-2xl font-bold mb-4 animate-appear">{t('topArtists', 'Топ артистов')}</h3>
      <div className="flex overflow-x-auto gap-4 md:grid md:grid-cols-4 lg:grid-cols-5 pb-4 md:pb-0 snap-x no-scrollbar animate-slide-up">
        {topArtists.length === 0 ? (
          <div className="text-secondary text-sm p-4 bg-surface/40 rounded-lg col-span-full">{t('noResults', 'Нет артистов')}</div>
        ) : (
          topArtists.map((artist, idx) => (
            <div 
              key={artist.name} 
              onClick={() => goToArtist(artist.name)}
              className={`w-[155px] md:w-auto p-4 cursor-pointer group snap-start flex-shrink-0 hover-scale transition-all flex flex-col items-center text-center ${
                isLiquidGlass
                  ? 'max-md:bg-white/[0.06] max-md:backdrop-blur-2xl max-md:border max-md:border-white/15 max-md:rounded-2xl max-md:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] md:bg-surface md:hover:bg-surface-highlight md:rounded-2xl'
                  : 'bg-surface hover:bg-surface-highlight rounded-2xl'
              }`}
            >
              {/* фото артиста 1:1 круглое и без всяких бейджей */}
              <div className="w-28 h-28 sm:w-32 sm:h-32 aspect-square rounded-full overflow-hidden bg-zinc-800 shadow-xl mb-3 flex-shrink-0">
                {artist.photo ? (
                  <img 
                    src={artist.photo} 
                    alt={artist.name} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-secondary">
                    <UserIcon size={44} />
                  </div>
                )}
              </div>

              {/* ниже №Х большое белое */}
              <div className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none mb-1.5">
                №{idx + 1}
              </div>

              {/* ниже ник артиста тоже крупненько */}
              <h4 className="text-base md:text-lg font-bold text-white truncate max-w-full px-1 group-hover:text-primary transition-colors leading-snug mb-1">
                {artist.name}
              </h4>

              {/* ниже серым маленьким текстом количество прослушиваний */}
              <p className="text-xs text-secondary truncate max-w-full font-medium">
                {formatArtistMonthlyPlays(artist.monthlyPlays)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
