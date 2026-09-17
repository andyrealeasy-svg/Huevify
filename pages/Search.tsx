import React, { useState } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Search as SearchIcon, Play, Heart, ListMusic, User, ArrowLeft, Music2 } from '../components/Icons.tsx';
import { ExplicitBadge } from '../components/ExplicitBadge.tsx';
import { PlayingVisualizer } from '../components/PlayingVisualizer.tsx';
import { TrackRow } from '../components/TrackRow.tsx';

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
  const { tracks, playlists, playTrack, isLiked, toggleLike, setView, currentUser, existingArtists, artistAccounts, goToArtist, view, albums, goBack, appSettings, getTrackCover, getAlbumCover, releaseRequests, currentTrack, isPlaying, t } = useStore();
  const isLiquidGlass = appSettings?.liquidGlassNav !== false;
  const [query, setQuery] = useState("");
  const [selectedGenreYear, setSelectedGenreYear] = useState<string>("all");

  const filteredTracks = tracks.filter(t => {
    const q = query.toLowerCase();
    const matchesQuery = t.title.toLowerCase().includes(q) || 
      t.artist.toLowerCase().includes(q) ||
      t.album.toLowerCase().includes(q) ||
      (t.mainArtists && t.mainArtists.some(a => a.toLowerCase().includes(q))) ||
      (t.feat && t.feat.toLowerCase().includes(q));
    
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

  // Filter Albums
  const filteredAlbums = albums.filter(a => {
    const q = query.toLowerCase();
    const allAlbumArtists = [a.artist, ...(a.mainArtists || [])];
    const matchesTitle = a.title.toLowerCase().includes(q);
    const matchesArtist = allAlbumArtists.some(artist => artist.toLowerCase().includes(q));
    const matchesRecordLabel = a.recordLabel ? a.recordLabel.toLowerCase().includes(q) : false;

    if (!matchesTitle && !matchesArtist && !matchesRecordLabel) return false;

    if (!appSettings.allowExplicitContent) {
      const albumTracks = tracks.filter(t => a.trackIds.includes(t.id));
      const hasOnlyExplicit = albumTracks.length > 0 && albumTracks.every(t => t.explicit);
      if (hasOnlyExplicit) return false;
    }

    return true;
  });

  // Restricted Genres with translation keys
  const genres = [
    { id: 'Pop', key: 'genre_Pop', color: 'bg-pink-600' },
    { id: 'Rap/Hip-Hop', key: 'genre_RapHipHop', color: 'bg-orange-600' },
    { id: 'R&B', key: 'genre_RnB', color: 'bg-purple-600' },
    { id: 'Electronic/Dance', key: 'genre_ElectronicDance', color: 'bg-teal-600' }
  ];

  const getArtistImage = (name: string) => {
      const acc = artistAccounts.find(a => a.artistName === name);
      if (acc && acc.avatar) return acc.avatar;
      const track = tracks.find(t => t.artist === name);
      return track ? getTrackCover(track) : null;
  };

  const normalizeGenre = (g?: string): string => {
      if (!g) return '';
      const s = g.trim().toLowerCase();
      if (s === 'r&b' || s === 'rnb' || s === 'рнб') return 'r&b';
      if (s === 'pop' || s === 'поп') return 'pop';
      if (s === 'rap/hip-hop' || s === 'rap' || s === 'hip-hop' || s === 'рэп/хип-хоп' || s === 'рэп' || s === 'хип-хоп') return 'rap/hip-hop';
      if (s === 'electronic/dance' || s === 'electronic' || s === 'dance' || s === 'электроника') return 'electronic/dance';
      return s;
  };

  // Calculate total plays for an album across all its tracks
  const getAlbumPlays = (album: any): number => {
      return (album.trackIds || []).reduce((sum: number, tid: string) => {
          const tr = tracks.find(t => t.id === tid);
          return sum + (tr?.plays || 0);
      }, 0);
  };

  // Get album's primary/main genre
  const getAlbumMainGenre = (album: any): string => {
      // 1. Direct genre assigned to album
      if (album.genre) return album.genre;
      
      // 2. Look up matching release request (from which album was published)
      const req = releaseRequests?.find(r => 
          r.id === album.id || 
          `dist_alb_${r.id}` === album.id || 
          (r.title && album.title && r.title.trim().toLowerCase() === album.title.trim().toLowerCase() && 
           r.artistName && album.artist && r.artistName.trim().toLowerCase() === album.artist.trim().toLowerCase())
      );
      if (req?.genre) return req.genre;

      // 3. Fallback: Determine majority genre among tracks in the album, or first track
      const albumTracks = tracks.filter(t => album.trackIds?.includes(t.id));
      if (albumTracks.length > 0) {
          const genreCounts: Record<string, number> = {};
          for (const tr of albumTracks) {
              const g = tr.genre;
              if (g) {
                  genreCounts[g] = (genreCounts[g] || 0) + 1;
              }
          }
          let bestGenre = '';
          let maxCount = 0;
          for (const [g, count] of Object.entries(genreCounts)) {
              if (count > maxCount) {
                  maxCount = count;
                  bestGenre = g;
              }
          }
          if (bestGenre) return bestGenre;
          if (albumTracks[0]?.genre) return albumTracks[0].genre;
      }
      return '';
  };

  const getGenreImage = (genreName: string) => {
      const targetKey = normalizeGenre(genreName);

      // Find albums whose primary genre matches this genre, sorted by total plays descending
      const genreAlbums = albums
          .filter(a => {
              if (a.isUpcoming || a.isAnnouncement) return false;
              if (a.type === 'Single') return false;
              const mainGenre = getAlbumMainGenre(a);
              if (!mainGenre) return false;
              return normalizeGenre(mainGenre) === targetKey;
          })
          .sort((a, b) => getAlbumPlays(b) - getAlbumPlays(a));

      if (genreAlbums.length > 0) {
          const topAlbum = genreAlbums[0];
          const cover = getAlbumCover ? getAlbumCover(topAlbum.id) : (topAlbum.covers?.[0] || null);
          if (cover) return cover;
      }

      // If no full album, check any release in this genre
      const anyGenreReleases = albums
          .filter(a => {
              if (a.isUpcoming || a.isAnnouncement) return false;
              const mainGenre = getAlbumMainGenre(a);
              return mainGenre && normalizeGenre(mainGenre) === targetKey;
          })
          .sort((a, b) => getAlbumPlays(b) - getAlbumPlays(a));

      if (anyGenreReleases.length > 0) {
          const topRelease = anyGenreReleases[0];
          const cover = getAlbumCover ? getAlbumCover(topRelease.id) : (topRelease.covers?.[0] || null);
          if (cover) return cover;
      }

      // Fallback: If no albums exist at all for this genre, use top track in this genre
      const genreTracks = tracks.filter(t => !t.isUnreleased && (normalizeGenre(t.genre) === targetKey || t.genre === genreName || (t.genre && t.genre.includes(genreName))));
      if (genreTracks.length === 0) return null;
      const topTrack = [...genreTracks].sort((a, b) => (b.plays || 0) - (a.plays || 0))[0];
      return getTrackCover(topTrack);
  };

  // --- GENRE VIEW ---
  if (view.type === 'GENRE') {
      const genreId = view.id;
      // Get display name from ID
      const genreObj = genres.find(g => g.id === genreId);
      const genreDisplayName = genreObj ? t(genreObj.key) : genreId;

      const targetGenreKey = normalizeGenre(genreId);

      // Filter tracks by genre and explicit settings, sorted by popularity (plays descending)
      const genreTracks = tracks
          .filter(t => {
              if (t.isUnreleased) return false;
              const match = normalizeGenre(t.genre) === targetGenreKey || t.genre === genreId || (t.genre && t.genre.includes(genreId));
              if (!appSettings.allowExplicitContent && t.explicit) return false;
              return match;
          })
          .sort((a, b) => (b.plays || 0) - (a.plays || 0));

      // Filter albums: Must match the page's genre as its MAIN genre AND NOT be a Single,
      // sorted by total album plays descending (popularity)
      const genreAlbums = albums
          .filter(a => {
              if (a.isUpcoming || a.isAnnouncement) return false;
              if (a.type === 'Single') return false; 
              const mainGenre = getAlbumMainGenre(a);
              if (!mainGenre) return false;
              if (normalizeGenre(mainGenre) !== targetGenreKey) return false;

              const albumTracks = tracks.filter(t => a.trackIds?.includes(t.id));
              if (albumTracks.length === 0) return false;
              if (!appSettings.allowExplicitContent && albumTracks.every(t => t.explicit)) return false;
              return true;
          })
          .sort((a, b) => {
              const diff = getAlbumPlays(b) - getAlbumPlays(a);
              if (diff !== 0) return diff;
              return (b.year || 0) - (a.year || 0);
          });

      // Get track release year
      const getTrackYear = (track: any): number | null => {
          const alb = albums.find(a => a.trackIds && a.trackIds.includes(track.id));
          if (alb?.year) return alb.year;
          if (alb?.releaseDate) {
              const y = new Date(alb.releaseDate).getFullYear();
              if (!isNaN(y)) return y;
          }

          if (track.id && typeof track.id === 'string' && track.id.startsWith('dist_trk_')) {
              const parts = track.id.split('_');
              const reqId = parts.slice(2, -1).join('_');
              const matchedReq = releaseRequests?.find(r => r.id === reqId);
              if (matchedReq?.releaseDate) {
                  const y = new Date(matchedReq.releaseDate).getFullYear();
                  if (!isNaN(y)) return y;
              }
          }

          if (track.album) {
              const albByTitle = albums.find(a => a.title && a.title.trim().toLowerCase() === track.album.trim().toLowerCase());
              if (albByTitle?.year) return albByTitle.year;
              if (albByTitle?.releaseDate) {
                  const y = new Date(albByTitle.releaseDate).getFullYear();
                  if (!isNaN(y)) return y;
              }
          }

          const req = releaseRequests?.find(r => 
              r.tracks?.some(t => (t as any).id === track.id || (t.title && track.title && t.title.trim().toLowerCase() === track.title.trim().toLowerCase())) ||
              (r.title && track.album && r.title.trim().toLowerCase() === track.album.trim().toLowerCase())
          );
          if (req?.releaseDate) {
              const y = new Date(req.releaseDate).getFullYear();
              if (!isNaN(y)) return y;
          }

          if (track.year && typeof track.year === 'number') {
              return track.year;
          }

          return null;
      };

      // Group genre tracks by year
      const yearMap: Record<string, typeof genreTracks> = {};
      for (const track of genreTracks) {
          const yr = getTrackYear(track);
          const key = yr ? String(yr) : 'other';
          if (!yearMap[key]) yearMap[key] = [];
          yearMap[key].push(track);
      }

      // Sort each year's tracks by popularity (plays descending)
      for (const key of Object.keys(yearMap)) {
          yearMap[key].sort((a, b) => (b.plays || 0) - (a.plays || 0));
      }

      // Sort years descending (e.g. 2026, 2025, 2024, ..., 'other' at end)
      const sortedYearKeys = Object.keys(yearMap).sort((a, b) => {
          if (a === 'other') return 1;
          if (b === 'other') return -1;
          return Number(b) - Number(a);
      });

      const tracksByYear = sortedYearKeys.map(k => ({
          yearKey: k,
          yearLabel: k === 'other' ? (t('otherYears') || 'Другие') : k,
          tracks: yearMap[k]
      }));

      const activeYearKey = tracksByYear.some(g => g.yearKey === selectedGenreYear) ? selectedGenreYear : 'all';
      const displayYearGroups = activeYearKey === 'all'
          ? tracksByYear
          : tracksByYear.filter(g => g.yearKey === activeYearKey);
      
      const genreColor = genres.find(g => g.id === genreId)?.color || 'bg-gray-600';

      return (
          <div className="h-full overflow-y-auto pb-32 relative w-full page-enter">
              <div className={`p-8 ${genreColor} bg-gradient-to-b from-transparent to-background/90 animate-appear`}>
                   <div className="absolute top-4 left-4 z-20">
                      <button 
                        onClick={goBack} 
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition active:scale-90 ${
                          isLiquidGlass
                            ? 'max-md:bg-white/[0.16] max-md:backdrop-blur-xl max-md:border max-md:border-white/20 max-md:shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.35)] md:bg-black/30'
                            : 'bg-black/30'
                        }`}
                      >
                        <ArrowLeft size={20}/>
                      </button>
                   </div>
                   <h1 className="text-4xl md:text-6xl font-bold mt-8 mb-4">{genreDisplayName}</h1>
                   <p className="text-white/80 font-bold">{t('discoverBest')} {genreDisplayName} {t('genreSuffix')}</p>
              </div>

              <div className="px-4 md:px-8 py-4 animate-slide-up">
                  
                  {/* Genre Albums */}
                  {genreAlbums.length > 0 && (
                      <div className="mb-8">
                          <h2 className="text-2xl font-bold mb-4">{t('popularReleases')}</h2>
                          <div className="flex overflow-x-auto gap-4 pb-4 snap-x no-scrollbar">
                              {genreAlbums.map(album => (
                                  <div 
                                    key={album.id} 
                                    onClick={() => setView({ type: 'ALBUM', id: album.id })}
                                    className="w-[150px] md:w-[180px] p-3 md:p-4 bg-surface hover:bg-surface-highlight rounded-lg cursor-pointer group snap-start flex-shrink-0 hover-scale"
                                  >
                                      <div className="relative mb-3 md:mb-4 w-full aspect-square">
                                          <img src={getAlbumCover ? getAlbumCover(album.id) : (album.covers?.[0] || '')} className="w-full h-full object-cover rounded shadow-lg" alt="" />
                                          <div className="absolute bottom-2 right-2 w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-primary-glow opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                              <Play fill="black" size={24} className="text-black ml-1" />
                                          </div>
                                      </div>
                                      <div className="font-bold truncate text-sm md:text-base">{album.title}</div>
                                      <div className="text-xs md:text-sm text-secondary truncate">{album.artist}{album.year ? ` • ${album.year}` : ''}</div>
                                      <div className="text-[11px] text-secondary/70 truncate mt-0.5">{formatPlays(getAlbumPlays(album))} {t('plays')}</div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* Genre Tracks Divided by Year */}
                  <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold">{t('allTracks')}</h2>
                  </div>

                  {/* Year Filter Pills if multiple years */}
                  {tracksByYear.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
                          <button
                              onClick={() => setSelectedGenreYear('all')}
                              className={`px-3.5 py-1.5 rounded-full text-xs md:text-sm font-semibold transition whitespace-nowrap active:scale-95 ${
                                  activeYearKey === 'all'
                                      ? isLiquidGlass
                                          ? 'max-md:bg-white/90 max-md:text-black max-md:shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.8)] md:bg-white md:text-black md:shadow-md'
                                          : 'bg-white text-black shadow-md'
                                      : isLiquidGlass
                                          ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-xl max-md:border max-md:border-white/15 max-md:text-white max-md:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] md:bg-surface md:hover:bg-surface-highlight text-white'
                                          : 'bg-surface hover:bg-surface-highlight text-white'
                              }`}
                          >
                              {t('allReleases') || 'Все'}
                          </button>
                          {tracksByYear.map(g => (
                              <button
                                  key={g.yearKey}
                                  onClick={() => setSelectedGenreYear(g.yearKey)}
                                  className={`px-3.5 py-1.5 rounded-full text-xs md:text-sm font-semibold transition whitespace-nowrap active:scale-95 ${
                                      activeYearKey === g.yearKey
                                          ? isLiquidGlass
                                              ? 'max-md:bg-white/90 max-md:text-black max-md:shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.8)] md:bg-white md:text-black md:shadow-md'
                                              : 'bg-white text-black shadow-md'
                                          : isLiquidGlass
                                              ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-xl max-md:border max-md:border-white/15 max-md:text-white max-md:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] md:bg-surface md:hover:bg-surface-highlight text-white'
                                              : 'bg-surface hover:bg-surface-highlight text-white'
                                  }`}
                              >
                                  {g.yearLabel}
                              </button>
                          ))}
                      </div>
                  )}

                  {genreTracks.length === 0 ? (
                      <div className="text-secondary">No tracks found in this genre.</div>
                  ) : (
                      <div className="flex flex-col gap-8">
                          {displayYearGroups.map(group => (
                              <div key={group.yearKey} className="flex flex-col">
                                  <div className="flex items-baseline justify-between border-b border-surface-highlight/30 pb-2 mb-3">
                                      <div className="flex items-baseline gap-2.5">
                                          <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">{group.yearLabel}</h3>
                                          <span className="text-xs text-secondary font-medium">
                                              {group.tracks.length} {group.tracks.length === 1 ? t('trackOne') : t('tracksCount')}
                                          </span>
                                      </div>
                                  </div>

                                  <div className="flex flex-col gap-1">
                                      {group.tracks.map((track, idx) => (
                                          <TrackRow
                                              key={track.id}
                                              track={track}
                                              index={idx}
                                              queue={group.tracks}
                                          />
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // --- SEARCH VIEW ---
  return (
    <div className="p-8 pb-32 bg-background flex-1 overflow-y-auto h-full page-enter">
      <div className="mb-8 relative">
        <SearchIcon 
          className={`absolute left-4 top-3.5 transition-colors ${
            isLiquidGlass ? 'max-md:text-white/70 md:text-black' : 'text-black'
          }`} 
          size={24} 
        />
        <input 
          type="text" 
          placeholder={t('searchPlaceholder')} 
          className={`w-full md:w-96 py-3 pl-12 pr-4 rounded-full font-semibold focus:outline-none transition-all ${
            isLiquidGlass
              ? 'max-md:bg-white/[0.12] max-md:backdrop-blur-2xl max-md:border max-md:border-white/20 max-md:text-white max-md:placeholder-white/50 max-md:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] max-md:focus:border-white/40 md:bg-white md:text-black md:focus:ring-2 md:focus:ring-white'
              : 'bg-white text-black focus:ring-2 focus:ring-white'
          }`}
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
                   <h2 className="text-xl font-bold mb-4">{t('artists')}</h2>
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
                               <div className="text-xs text-secondary bg-surface-highlight px-2 py-1 rounded-full">{t('artist')}</div>
                           </div>
                       ))}
                   </div>
               </div>
           )}

           {/* Songs Section */}
           {filteredTracks.length > 0 && (
             <div>
                <h2 className="text-xl font-bold mb-4">{t('songs')}</h2>
                <div className="flex flex-col gap-1">
                 {filteredTracks.map((track, idx) => (
                   <TrackRow
                     key={track.id}
                     track={track}
                     index={idx}
                     queue={filteredTracks}
                   />
                 ))}
                </div>
             </div>
           )}

           {/* Albums Section */}
           {filteredAlbums.length > 0 && (
               <div>
                   <h2 className="text-xl font-bold mb-4">{t('albums')}</h2>
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                       {filteredAlbums.map(album => {
                           const cover = album.covers?.[0];
                           const allAlbumArtists = Array.from(new Set([album.artist, ...(album.mainArtists || [])]));
                           const albumTracks = tracks.filter(t => album.trackIds.includes(t.id));

                           return (
                               <div 
                                   key={album.id} 
                                   onClick={() => setView({ type: 'ALBUM', id: album.id })}
                                   className="p-4 bg-surface hover:bg-surface-highlight rounded-lg cursor-pointer transition group hover-scale"
                               >
                                   <div className="aspect-square mb-4 shadow-lg flex items-center justify-center rounded-md overflow-hidden bg-surface-highlight relative">
                                       {cover ? (
                                           <img src={cover} alt={album.title} className="w-full h-full object-cover" />
                                       ) : (
                                           <Music2 size={32} className="text-secondary" />
                                       )}
                                       {/* Overlay Play Button */}
                                       <div 
                                           onClick={(e) => {
                                               e.stopPropagation();
                                               if (albumTracks.length > 0) {
                                                   playTrack(albumTracks[0], albumTracks, album.id);
                                               }
                                           }}
                                           className="absolute bottom-2 right-2 w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
                                       >
                                           <Play fill="black" size={20} className="text-black ml-1" />
                                       </div>
                                   </div>
                                   <h3 className="font-bold truncate text-white">{album.title}</h3>
                                   <p className="text-sm text-secondary truncate">
                                       {album.year ? `${album.year} • ` : ''}{album.type || t('album')} • {allAlbumArtists.join(', ')}
                                   </p>
                               </div>
                           );
                       })}
                   </div>
               </div>
           )}

           {/* Public Playlists Section */}
           {filteredPlaylists.length > 0 && (
               <div>
                   <h2 className="text-xl font-bold mb-4">{t('publicPlaylists')}</h2>
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
                                    <p className="text-sm text-secondary truncate">{t('by')} {pl.creatorName}</p>
                                </div>
                            );
                       })}
                   </div>
               </div>
           )}

           {filteredTracks.length === 0 && filteredPlaylists.length === 0 && filteredArtists.length === 0 && filteredAlbums.length === 0 && (
                <div className="text-secondary text-lg text-center mt-10">{t('noResults')} "{query}"</div>
           )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 animate-appear">
           {/* Genres Tiles */}
           {genres.map(genre => {
             const cover = getGenreImage(genre.id);
             return (
             <div 
               key={genre.id} 
               onClick={() => setView({ type: 'GENRE', id: genre.id })}
               className={`aspect-[2/1] ${genre.color} p-6 font-bold text-3xl md:text-4xl relative overflow-hidden cursor-pointer hover:scale-[1.02] transition shadow-lg group ${
                 isLiquidGlass
                   ? 'max-md:rounded-2xl max-md:border max-md:border-white/20 max-md:shadow-[0_10px_28px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] md:rounded-lg'
                   : 'rounded-lg'
               }`}
             >
                <span className="relative z-10">{t(genre.key)}</span>
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