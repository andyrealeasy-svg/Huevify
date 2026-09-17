import React, { useState } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Play, Heart, ListMusic, Trash2, ArrowLeft, PlusSquare, Plus, Edit, Mic2, User, Check, ChevronLeft, ChevronRight, X, CheckCircle, Clock, MoreHorizontal } from '../components/Icons.tsx';
import { ArtistDiscography } from '../components/ArtistDiscography.tsx';
import { ExplicitBadge } from '../components/ExplicitBadge.tsx';
import { PlayingVisualizer } from '../components/PlayingVisualizer.tsx';
import { ReleaseCountdown } from '../components/ReleaseCountdown.tsx';
import { TrackRow } from '../components/TrackRow.tsx';

const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
};

const formatPlays = (plays: number) => {
    return new Intl.NumberFormat('en-US').format(plays);
};

const formatReleaseDateDisplay = (dateString?: string) => {
    if (!dateString) return '';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } catch {
        return dateString;
    }
};

export const Library = () => {
  const { 
    view, playlists, tracks, albums, isLiked, toggleLike, playTrack, 
    removeFromPlaylist, goBack, setCreatePlaylistOpen, setPlaylistIdToEdit, setView, 
    toggleAlbumLike, isAlbumLiked, deletePlaylist, openAddToPlaylist, recentlyPlayed,
    goToArtist, getArtistStats, followedArtists, toggleFollowArtist, isArtistFollowed,
    currentUser, togglePlaylistSave, getAlbumCover, changeAlbumCover, dailyChart, artistAccounts, getTrackCover,
    currentTrack, isPlaying, t, appSettings, showNotification
  } = useStore();
  const isLiquidGlass = appSettings?.liquidGlassNav !== false;

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
      // Always ensure current user's Liked Songs playlist is present as the first item
      const currentLikedId = currentUser ? `liked_${currentUser.id}` : 'liked';
      let userLikedPl = playlists.find(p => p.id === currentLikedId || (currentUser && p.id.startsWith('liked') && p.ownerId === currentUser.id));
      if (!userLikedPl) {
          const guestLiked = playlists.find(p => p.id === 'liked');
          userLikedPl = {
              id: currentLikedId,
              name: t('likedSongs'),
              tracks: guestLiked?.tracks || [],
              isSystem: true,
              description: 'Your favorite tracks',
              ownerId: currentUser?.id
          };
      }

      const otherPlaylists = playlists.filter(pl => {
          if (pl.id.startsWith('liked') || pl.id === 'liked') return false;
          return pl.isSystem || 
          (currentUser && pl.ownerId === currentUser.id) ||
          (currentUser && pl.savedBy?.includes(currentUser.id));
      });
      
      const likedAlbums = albums.filter(a => isAlbumLiked(a.id));

      const likedTracksCount = userLikedPl.tracks.length;

      return (
          <div className="h-full overflow-y-auto pb-32 relative w-full page-enter px-4 md:px-8 py-8 space-y-9">
              <div>
                  <h1 className="text-3xl font-bold mb-6">{t('library')}</h1>

                  {/* 1. TOP BLOCK: Liked Songs (Плейлист Любимые треки) */}
                  <div 
                      onClick={() => setView({ type: 'PLAYLIST', id: userLikedPl.id })}
                      className={`group cursor-pointer p-4 md:p-5 flex items-center justify-between transition duration-200 hover-scale ${
                        isLiquidGlass
                          ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-2xl max-md:border max-md:border-white/15 max-md:rounded-2xl max-md:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] md:rounded-xl md:bg-gradient-to-r md:from-surface md:to-surface/60 md:hover:from-surface-highlight md:hover:to-surface'
                          : 'rounded-xl bg-gradient-to-r from-surface to-surface/60 hover:from-surface-highlight hover:to-surface'
                      }`}
                  >
                      <div className="flex items-center gap-4 md:gap-5 min-w-0">
                          <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg bg-gradient-to-br from-indigo-700 to-blue-400 flex items-center justify-center shadow-lg shrink-0 group-hover:shadow-indigo-500/20 transition-all">
                              <Heart size={32} fill="white" className="text-white md:w-9 md:h-9" />
                          </div>
                          <div className="flex flex-col min-w-0">
                              <span className="text-xs uppercase tracking-wider text-secondary font-semibold">{t('playlist')}</span>
                              <h2 className="text-lg md:text-2xl font-bold text-white truncate group-hover:text-primary transition-colors">
                                  {userLikedPl.name}
                              </h2>
                              <p className="text-xs md:text-sm text-secondary truncate mt-0.5">
                                  {likedTracksCount} {likedTracksCount === 1 ? t('trackOne') : t('tracksCount')}
                              </p>
                          </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-4">
                          <div className="w-11 h-11 md:w-12 md:h-12 bg-primary rounded-full flex items-center justify-center shadow-primary-glow opacity-90 md:opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-200">
                              <Play fill="black" size={20} className="text-black ml-0.5" />
                          </div>
                      </div>
                  </div>
              </div>

              {/* 2. BLOCK: Albums (Альбомы) */}
              {likedAlbums.length > 0 && (
                  <div>
                      <div className="flex items-center justify-between mb-3">
                          <div className="flex items-baseline gap-2">
                              <h2 className="text-lg md:text-xl font-bold text-white">{t('albums')}</h2>
                              <span className="text-xs text-secondary font-normal">{likedAlbums.length}</span>
                          </div>
                      </div>
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-5">
                          {likedAlbums.map(album => (
                              <div 
                                  key={album.id} 
                                  onClick={() => setView({ type: 'ALBUM', id: album.id })}
                                  className={`p-3 md:p-4 rounded-lg cursor-pointer transition group hover-scale ${
                                    isLiquidGlass
                                      ? 'max-md:bg-white/[0.06] max-md:backdrop-blur-xl max-md:border max-md:border-white/10 max-md:rounded-2xl max-md:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.18)] max-md:active:scale-95 md:bg-surface md:hover:bg-surface-highlight'
                                      : 'bg-surface hover:bg-surface-highlight'
                                  }`}
                              >
                                  <div className="aspect-square mb-3 md:mb-4 shadow-lg rounded-md overflow-hidden bg-surface-highlight relative">
                                      <img src={getAlbumCover(album.id)} className="w-full h-full object-cover" alt="" />
                                      <div className="absolute bottom-2 right-2 w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center shadow-primary-glow opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                          <Play fill="black" size={16} className="text-black ml-1 md:w-5 md:h-5" />
                                      </div>
                                  </div>
                                  <h3 className="font-bold truncate text-white text-sm md:text-base">{album.title}</h3>
                                  <p className="text-xs md:text-sm text-secondary truncate">{album.artist}</p>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {/* 3. BLOCK: Artists (Артисты) */}
              {followedArtists.length > 0 && (
                  <div>
                      <div className="flex items-center justify-between mb-3">
                          <div className="flex items-baseline gap-2">
                              <h2 className="text-lg md:text-xl font-bold text-white">{t('artists')}</h2>
                              <span className="text-xs text-secondary font-normal">{followedArtists.length}</span>
                          </div>
                      </div>
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-5">
                          {followedArtists.map(artistName => {
                              const acc = artistAccounts.find(a => a.artistName === artistName);
                              const artistTrack = tracks.find(t => t.artist === artistName);
                              const image = acc?.avatar || (artistTrack ? getTrackCover(artistTrack) : undefined);

                              return (
                                  <div 
                                      key={artistName} 
                                      onClick={() => goToArtist(artistName)}
                                      className={`p-3 md:p-4 rounded-lg cursor-pointer transition group hover-scale text-center ${
                                        isLiquidGlass
                                          ? 'max-md:bg-white/[0.06] max-md:backdrop-blur-xl max-md:border max-md:border-white/10 max-md:rounded-2xl max-md:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.18)] max-md:active:scale-95 md:bg-surface md:hover:bg-surface-highlight'
                                          : 'bg-surface hover:bg-surface-highlight'
                                      }`}
                                  >
                                      <div className="aspect-square mb-3 md:mb-4 shadow-lg flex items-center justify-center rounded-full overflow-hidden bg-surface-highlight relative mx-auto max-md:border max-md:border-white/15">
                                          {image ? (
                                              <img src={image} className="w-full h-full object-cover" alt="" />
                                          ) : (
                                              <User size={32} className="text-secondary md:w-10 md:h-10" />
                                          )}
                                      </div>
                                      <h3 className="font-bold truncate text-white text-sm md:text-base">{artistName}</h3>
                                      <p className="text-xs md:text-sm text-secondary truncate">{t('artist')}</p>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              )}

              {/* 4. BLOCK: Playlists (Плейлисты) */}
              <div>
                  <div className="flex items-center justify-between mb-3">
                      <div className="flex items-baseline gap-2">
                          <h2 className="text-lg md:text-xl font-bold text-white">{t('playlists')}</h2>
                          <span className="text-xs text-secondary font-normal">{otherPlaylists.length}</span>
                      </div>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-5">
                      {/* FIRST ITEM: Create Playlist Button Card */}
                      <div 
                          onClick={handleCreate}
                          className={`p-3 md:p-4 rounded-lg cursor-pointer transition group hover-scale border flex flex-col justify-between ${
                            isLiquidGlass
                              ? 'max-md:bg-white/[0.05] max-md:backdrop-blur-xl max-md:border-white/15 max-md:rounded-2xl max-md:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] max-md:active:scale-95 md:bg-surface/50 md:hover:bg-surface-highlight md:border-dashed md:border-white/10 md:hover:border-primary/50'
                              : 'bg-surface/50 hover:bg-surface-highlight border-dashed border-white/10 hover:border-primary/50'
                          }`}
                      >
                          <div className={`aspect-square mb-3 md:mb-4 shadow-lg flex items-center justify-center rounded-md overflow-hidden relative transition-colors ${
                            isLiquidGlass
                              ? 'max-md:bg-white/[0.06] max-md:rounded-xl md:bg-surface-highlight/70 md:group-hover:bg-primary/20'
                              : 'bg-surface-highlight/70 group-hover:bg-primary/20'
                          }`}>
                              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 group-hover:bg-primary group-hover:text-black flex items-center justify-center text-white transition-all duration-300">
                                  <Plus size={28} className="transition-transform group-hover:scale-110" />
                              </div>
                          </div>
                          <div>
                              <h3 className="font-bold truncate text-white text-sm md:text-base group-hover:text-primary transition-colors">
                                  {t('createPlaylist')}
                              </h3>
                              <p className="text-xs md:text-sm text-secondary truncate">
                                  {t('playlist')}
                              </p>
                          </div>
                      </div>

                      {otherPlaylists.map(pl => {
                          let cover = pl.customCover;
                          if (!cover && pl.tracks.length > 0) {
                              const t = tracks.find(t => t.id === pl.tracks[0]);
                              if (t) cover = getTrackCover(t);
                          }
                          const subText = pl.isSystem ? t('system') : `${t('by')} ${pl.creatorName || t('you')}`;

                          return (
                              <div 
                                  key={pl.id} 
                                  onClick={() => setView({ type: 'PLAYLIST', id: pl.id })}
                                  className={`p-3 md:p-4 rounded-lg cursor-pointer transition group hover-scale ${
                                    isLiquidGlass
                                      ? 'max-md:bg-white/[0.06] max-md:backdrop-blur-xl max-md:border max-md:border-white/10 max-md:rounded-2xl max-md:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.18)] max-md:active:scale-95 md:bg-surface md:hover:bg-surface-highlight'
                                      : 'bg-surface hover:bg-surface-highlight'
                                  }`}
                              >
                                  <div className="aspect-square mb-3 md:mb-4 shadow-lg flex items-center justify-center rounded-md overflow-hidden bg-surface-highlight relative max-md:rounded-xl">
                                      {cover ? (
                                          <img src={cover} className="w-full h-full object-cover" alt="" />
                                      ) : (
                                          <ListMusic size={32} className="text-secondary md:w-10 md:h-10" />
                                      )}
                                      <div className="absolute bottom-2 right-2 w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center shadow-primary-glow opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                          <Play fill="black" size={16} className="text-black ml-1 md:w-5 md:h-5" />
                                      </div>
                                  </div>
                                  <h3 className="font-bold truncate text-white text-sm md:text-base">{pl.name}</h3>
                                  <p className="text-xs md:text-sm text-secondary truncate">{subText}</p>
                              </div>
                          );
                      })}
                  </div>
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
                    <button 
                      onClick={goBack} 
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition active:scale-90 ${
                        isLiquidGlass
                          ? 'max-md:bg-white/[0.16] max-md:backdrop-blur-xl max-md:border max-md:border-white/20 max-md:shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.35)] md:w-8 md:h-8 md:bg-black/50'
                          : 'w-8 h-8 bg-black/50'
                      }`}
                    >
                      <ArrowLeft size={20}/>
                    </button>
                 </div>
                 <h1 className="text-3xl md:text-5xl font-bold mt-8 mb-4">Huevify Daily Top 25</h1>
                 <p className="text-white/70">{t('chartDesc')}</p>
            </div>
            <div className="px-4 md:px-8 py-4 animate-slide-up">
               {dailyChart.length === 0 ? (
                   <div className="text-center py-16 flex flex-col items-center justify-center gap-3">
                       <div className="w-12 h-12 rounded-full bg-surface-highlight flex items-center justify-center text-primary">
                           <Clock size={24} />
                       </div>
                       <h3 className="text-lg font-semibold text-white">{t('chartCyclePendingTitle') || 'Суточный учёт в процессе'}</h3>
                       <p className="text-sm text-secondary max-w-md">
                           {t('chartCyclePendingDesc') || 'Прослушивания за текущие сутки фиксируются. Обновление и публикация Top 25 происходят каждый день ровно в 21:00 UTC+3.'}
                       </p>
                   </div>
               ) : (
                   <div className="flex flex-col gap-1">
                       {dailyChart.map((track, idx) => (
                           <TrackRow 
                               key={track.id} 
                               track={track} 
                               index={idx} 
                               queue={dailyChart} 
                               showDailyPlays={true} 
                           />
                       ))}
                   </div>
               )}
            </div>
        </div>
      );
  }

  // --- ARTIST DISCOGRAPHY VIEW ---
  if (view.type === 'ARTIST_DISCOGRAPHY') {
      return <ArtistDiscography artistName={(view as any).id} />;
  }

  // --- ARTIST VIEW ---
  if (view.type === 'ARTIST') {
      const artistName = (view as any).id;
      const artistTracks = tracks.filter(t => t.artist === artistName || t.mainArtists?.includes(artistName));
      const topTracks = [...artistTracks].sort((a, b) => b.plays - a.plays).slice(0, 5);
      
      // Собственные релизы артиста
      const ownAlbums = albums.filter(a => a.artist === artistName || a.mainArtists?.includes(artistName));

      const getAlbumReleaseTime = (album: any): number => {
        if (album.releaseDate) {
          const time = new Date(album.releaseDate).getTime();
          if (!isNaN(time)) return time;
        }
        if (album.year) {
          return new Date(`${album.year}-01-01`).getTime();
        }
        return 0;
      };

      const getAlbumPlays = (album: any): number => {
        return (album.trackIds || []).reduce((sum: number, tid: string) => {
          const tr = tracks.find(t => t.id === tid);
          return sum + (tr?.plays || 0);
        }, 0);
      };

      // Find upcoming expected release for this artist
      const upcomingAlbums = ownAlbums.filter(a => a.isUpcoming);

      // Released albums sorted by date (newest first)
      const releasedAlbums = ownAlbums.filter(a => !a.isUpcoming);
      const sortedByDate = [...releasedAlbums].sort((a, b) => {
        const diff = getAlbumReleaseTime(b) - getAlbumReleaseTime(a);
        if (diff !== 0) return diff;
        return (b.year || 0) - (a.year || 0);
      });

      // 1-й релиз: последний
      const latestRelease = sortedByDate[0] || null;

      // Ещё 3 — самые прослушиваемые за месяц
      const otherReleasesByPlays = latestRelease
        ? sortedByDate.filter(a => a.id !== latestRelease.id).sort((a, b) => getAlbumPlays(b) - getAlbumPlays(a)).slice(0, 3)
        : [];

      // Итоговые релизы для отображения в карточке:
      // Ожидаемый релиз(ы) ставится самым верхним 5-м альбомом, затем остальные вышедшие релизы
      const releasedPreview = latestRelease ? [latestRelease, ...otherReleasesByPlays] : [];
      const discographyPreview = [...upcomingAlbums, ...releasedPreview].slice(0, 5);
      
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
                    <button 
                      onClick={goBack} 
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition active:scale-90 ${
                        isLiquidGlass
                          ? 'max-md:bg-white/[0.16] max-md:backdrop-blur-xl max-md:border max-md:border-white/20 max-md:shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.35)] md:w-8 md:h-8 md:bg-black/50'
                          : 'w-8 h-8 bg-black/50'
                      }`}
                    >
                      <ArrowLeft size={20}/>
                    </button>
                </div>
                <div className="relative z-10 w-full">
                    <div className="flex items-center gap-2 mb-2 text-white">
                        {isVerified && (
                            <div className="flex items-center gap-2 text-white/95 drop-shadow-md">
                                <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                                    <Check size={12} strokeWidth={3.5} />
                                </span>
                                <span className="text-xs md:text-sm font-semibold tracking-wide">
                                    {t('verifiedArtist')}
                                </span>
                            </div>
                        )}
                    </div>
                    <h1 className="text-5xl md:text-8xl font-bold tracking-tight mb-4 drop-shadow-lg">{artistName}</h1>
                    <p className="text-white font-medium text-lg drop-shadow-md">{formatPlays(monthlyPlays)} {t('monthlyPlays')}</p>
                </div>
            </div>

            <div className="px-4 md:px-8 py-6 animate-slide-up">
                <div className="flex items-center gap-4 mb-8">
                    <button 
                        onClick={() => topTracks.length && playTrack(topTracks[0], topTracks)} 
                        className={`w-14 h-14 bg-primary rounded-full flex items-center justify-center transition shadow-primary-glow ${
                          isLiquidGlass
                            ? 'max-md:bg-primary/95 max-md:active:scale-95 md:hover:scale-105'
                            : 'hover:scale-105'
                        }`}
                    >
                        <Play size={28} fill="black" className="ml-1 text-black" />
                    </button>
                    
                    {/* Follow Button */}
                    <button 
                        onClick={() => toggleFollowArtist(artistName)}
                        className={`px-6 py-2 font-bold text-sm rounded-full uppercase tracking-widest transition ${
                          isLiquidGlass
                            ? isFollowing 
                              ? 'max-md:bg-white/20 max-md:backdrop-blur-xl max-md:border max-md:border-white/30 max-md:text-white max-md:shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.35)] max-md:active:scale-95 md:border md:border-white md:text-white md:hover:bg-white/10'
                              : 'max-md:bg-white/[0.08] max-md:backdrop-blur-xl max-md:border max-md:border-white/20 max-md:text-white max-md:shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] max-md:active:scale-95 md:border md:border-secondary md:text-white md:hover:border-white'
                            : isFollowing 
                              ? 'border border-white text-white hover:bg-white/10' 
                              : 'border border-secondary text-white hover:border-white'
                        }`}
                    >
                        {isFollowing ? t('following') : t('follow')}
                    </button>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Main Content */}
                    <div className="flex-1">
                        
                        {/* Artist Pick */}
                        {pick && (
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold mb-4">{t('artistPick')}</h2>
                                <div 
                                    className={`flex items-start gap-4 cursor-pointer p-4 transition group ${
                                      isLiquidGlass
                                        ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-2xl max-md:border max-md:border-white/15 max-md:rounded-2xl max-md:shadow-[0_8px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] max-md:active:scale-[0.98] md:rounded md:bg-surface md:hover:bg-surface-highlight'
                                        : 'rounded bg-surface hover:bg-surface-highlight'
                                    }`}
                                    onClick={() => pick.id && setView({ type: pick.type as any, id: pick.id })}
                                >
                                    <img src={pick.image} className="w-20 h-20 rounded-xl object-cover shadow-lg shrink-0" />
                                    <div className="flex flex-col justify-center">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-5 h-5 rounded-full overflow-hidden bg-zinc-800">
                                                <img src={artistAccount?.avatar || pick.image} className="w-full h-full object-cover"/>
                                            </div>
                                            <span className="text-xs text-secondary font-bold">{t('postedBy')} {artistName}</span>
                                        </div>
                                        <div className="font-bold group-hover:underline text-lg">{pick.subtitle}</div>
                                        <div className="text-sm text-secondary">{t('latestRelease')}</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <h2 className="text-2xl font-bold mb-4">{t('popular')}</h2>
                        <div className="flex flex-col gap-1 mb-8">
                            {topTracks.map((track, idx) => (
                                <TrackRow 
                                    key={track.id} 
                                    track={track} 
                                    index={idx} 
                                    queue={topTracks} 
                                />
                            ))}
                        </div>

                        {/* Дискография: вертикальный блок сверху вниз */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-bold">{t('discography')}</h2>
                                <button 
                                    onClick={() => setView({ type: 'ARTIST_DISCOGRAPHY', id: artistName })}
                                    className="text-xs md:text-sm font-bold text-secondary hover:text-white transition hover:underline"
                                >
                                    {t('seeAllDiscography', 'Показать все')}
                                </button>
                            </div>

                            {discographyPreview.length === 0 ? (
                                <p className="text-secondary text-sm">{t('noReleases', 'Релизов пока нет')}</p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {discographyPreview.map((album, idx) => {
                                        const isUpcoming = !!album.isUpcoming;
                                        const isLatest = !isUpcoming && idx === 0 && latestRelease?.id === album.id;
                                        const playsCount = getAlbumPlays(album);
                                        const releaseType = album.type === 'EP' ? 'EP' : album.type === 'Single' ? t('single', 'Сингл') : album.type === 'Mixtape' ? 'Микстейп' : t('album', 'Альбом');
                                        return (
                                            <div 
                                                key={album.id} 
                                                onClick={() => setView({ type: 'ALBUM', id: album.id })} 
                                                className={`flex items-center justify-between p-2.5 transition group cursor-pointer ${
                                                  isLiquidGlass
                                                    ? 'max-md:bg-white/[0.06] max-md:backdrop-blur-xl max-md:border max-md:border-white/10 max-md:rounded-2xl max-md:shadow-[0_6px_20px_-4px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18)] max-md:active:scale-[0.98] md:rounded-lg md:hover:bg-surface-highlight md:bg-surface/40 md:border md:border-white/5'
                                                    : 'rounded-lg hover:bg-surface-highlight bg-surface/40 border border-white/5'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3.5 overflow-hidden min-w-0">
                                                    <div className="relative w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-xl overflow-hidden shadow-md">
                                                        <img 
                                                            src={getAlbumCover(album.id)} 
                                                            alt={album.title}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                                        />
                                                        {!isUpcoming && (
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                                                <Play size={20} fill="white" className="text-white ml-0.5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-white truncate text-base group-hover:underline">
                                                                {album.title}
                                                            </span>
                                                            {isUpcoming && (
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] md:text-[11px] font-normal text-secondary bg-white/5 border border-white/10 shrink-0">
                                                                    {t('expectedRelease', 'Ожидаемый релиз')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-secondary truncate mt-0.5">
                                                            {album.year || (album.releaseDate ? new Date(album.releaseDate).getFullYear() : '')} • {releaseType} • {album.trackIds.length} {album.trackIds.length === 1 ? t('trackOne', 'трек') : t('tracksCount', 'треков')}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 text-secondary group-hover:text-white shrink-0 pl-2">
                                                    <ChevronRight size={18} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* About Column */}
                    <div className="w-full md:w-1/3">
                        <h2 className="text-2xl font-bold mb-4">{t('about')}</h2>
                        <div className={`overflow-hidden relative group cursor-pointer min-h-[300px] transition ${
                          isLiquidGlass
                            ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-2xl max-md:border max-md:border-white/15 max-md:rounded-3xl max-md:shadow-[0_12px_36px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.25)] md:bg-surface md:rounded-lg md:hover:scale-[1.02]'
                            : 'bg-surface rounded-lg hover:scale-[1.02]'
                        }`}>
                            {/* Use avatar or fallback to first track cover */}
                            <img 
                                src={artistAccount?.avatar || (topTracks[0] ? getTrackCover(topTracks[0]) : '')} 
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition absolute inset-0 bg-zinc-800" 
                            />
                            
                            <div className="absolute inset-0 p-6 flex flex-col justify-end z-10">
                                <div className="mb-4">
                                    <div className="text-3xl font-bold text-white mb-2">#{globalRank}</div>
                                    <div className="text-sm font-bold uppercase tracking-widest text-white">{t('inTheWorld')}</div>
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
         title = t('recentlyPlayed');
         subtitle = `${recentlyPlayed.length} ${t('songs')}`;
         isSystem = true;
         items = recentlyPlayed;
         if (recentlyPlayed.length > 0) cover = getTrackCover(recentlyPlayed[0]);
         releaseType = t('playlist');
      } else {
          let pl: any = undefined;
          if (isLikedSongs) {
              const currentLikedId = currentUser ? `liked_${currentUser.id}` : 'liked';
              pl = playlists.find(p => p.id === currentLikedId || (currentUser && p.id.startsWith('liked') && p.ownerId === currentUser.id));
              if (!pl) {
                  pl = playlists.find(p => p.id === 'liked');
              }
              if (!pl) {
                  pl = {
                      id: currentLikedId,
                      name: t('likedSongs'),
                      tracks: [],
                      isSystem: true,
                      description: 'Your favorite tracks',
                      ownerId: currentUser?.id
                  };
              }
          } else {
              pl = playlists.find(p => p.id === id);
          }
          if (!pl) {
             return (
                 <div className="flex flex-col items-center justify-center h-full pb-32">
                     <h2 className="text-2xl font-bold mb-4">{t('notFound')}</h2>
                     <button onClick={() => setView({type:'HOME'})} className="px-6 py-2 bg-white text-black rounded-full font-bold">{t('returnHome')}</button>
                 </div>
             );
          }
          title = pl.name;
          subtitle = `${t('playlist')} • ${pl.tracks.length} ${t('songs')}`;
          description = pl.description || "";
          isSystem = !!pl.isSystem;
          label = "Huevify User Playlist";
          playlistOwnerId = pl.ownerId;
          creatorName = pl.creatorName;
          creatorAvatar = pl.creatorAvatar;
          releaseType = t('playlist');
          isPublic = !!pl.isPublic;
          isSavedPlaylist = pl.savedBy?.includes(currentUser?.id || "") || false;
          
          if (isLikedSongs) {
              title = t('likedSongs');
          } else if (pl.customCover) {
              cover = pl.customCover;
          } else {
              const firstTrack = tracks.find(t => t.id === pl.tracks[0]);
              cover = firstTrack ? getTrackCover(firstTrack) : "";
          }
          items = (pl.tracks || []).map((tid: string) => tracks.find(t => t.id === tid)).filter(Boolean);
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
                 <h2 className="text-2xl md:text-4xl font-bold mb-4">{t('emptyLiked')}</h2>
                 <p className="text-secondary mb-8">{t('saveSongsMsg')}</p>
                 <button 
                    onClick={() => setView({type:'HOME'})} 
                    className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition"
                 >
                    {t('returnHome')}
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
              className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition active:scale-90 ${
                isLiquidGlass
                  ? 'max-md:bg-white/[0.16] max-md:backdrop-blur-xl max-md:border max-md:border-white/20 max-md:shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.35)] md:w-8 md:h-8 md:bg-black/50 md:hover:bg-black/80'
                  : 'w-8 h-8 bg-black/50 hover:bg-black/80'
              }`}
            >
              <ArrowLeft size={20} />
            </button>
          </div>

          <div className="flex flex-col items-center text-center md:flex-row md:items-end md:text-left gap-6 mt-8 md:mt-8">
            {/* Cover Art */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div 
                  className={`w-48 h-48 md:w-56 md:h-56 shadow-2xl shrink-0 flex items-center justify-center bg-surface-highlight overflow-hidden animate-appear relative group ${
                    isLiquidGlass
                      ? 'max-md:rounded-2xl max-md:border max-md:border-white/20 max-md:shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.3)] md:rounded-md'
                      : 'rounded-md'
                  } ${
                    hasMultipleCovers || (isPlaylist && isOwner && !isSystem) ? 'cursor-pointer' : ''
                  }`}
                  onClick={(e) => { 
                    if (hasMultipleCovers) {
                      setCoverPickerOpen(true); 
                    } else if (isPlaylist && isOwner && !isSystem) {
                      handleEditPlaylist(id, e);
                    }
                  }}
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
                                   <span className="text-xs font-bold border border-white px-2 py-1 rounded">{t('changeCover')}</span>
                               </div>
                          )}
                          {/* Overlay for owner playlist photo change */}
                          {isPlaylist && isOwner && !isSystem && (
                               <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition gap-1.5">
                                   <Edit size={28} className="text-white" />
                                   <span className="text-xs font-bold text-white bg-black/60 px-2 py-1 rounded">{t('choosePhoto')}</span>
                               </div>
                          )}
                      </>
                  ) : (
                      <>
                        <ListMusic size={64} className="text-secondary" />
                        {isPlaylist && isOwner && !isSystem && (
                           <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition gap-1.5">
                               <Edit size={28} className="text-white" />
                               <span className="text-xs font-bold text-white bg-black/60 px-2 py-1 rounded">{t('choosePhoto')}</span>
                           </div>
                        )}
                      </>
                  )}
              </div>
            </div>

            {currentAlbumObj?.isUpcoming ? (
              <div className="flex flex-col gap-2 w-full md:w-auto animate-appear items-center md:items-start">
                <span className="text-xs md:text-sm font-bold text-white/80 uppercase tracking-wider">
                  {currentAlbumObj.type === 'EP' ? 'Мини-альбом' : currentAlbumObj.type === 'Mixtape' ? 'Микстейп' : t('album', 'Альбом')}
                </span>
                <h1 className="text-3xl md:text-6xl lg:text-7xl font-black tracking-tight leading-tight line-clamp-2 text-white">
                  {title}
                </h1>
                {description && <p className="text-secondary/80 text-sm md:text-base font-medium">{description}</p>}

                {(() => {
                  const primaryArtistAccount = artistAccounts.find(a => (a.artistName || '').toLowerCase() === (currentAlbumObj.artist || '').toLowerCase());
                  const artistAvatarImg = primaryArtistAccount?.avatar;
                  return (
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-sm font-semibold text-white mt-1">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                        {artistAvatarImg ? (
                          <img src={artistAvatarImg} alt={currentAlbumObj.artist} className="w-full h-full object-cover" />
                        ) : (
                          <User size={14} className="text-white m-1" />
                        )}
                      </div>
                      <span onClick={() => goToArtist(currentAlbumObj.artist)} className="font-bold hover:underline cursor-pointer">
                        {currentAlbumObj.artist}
                      </span>
                      <span className="text-secondary">•</span>
                      <span className="text-white/80">
                        Дата релиза: {formatReleaseDateDisplay(currentAlbumObj.releaseDate)}
                      </span>
                    </div>
                  );
                })()}

                <div className="mt-3">
                  <ReleaseCountdown 
                    targetDate={currentAlbumObj.releaseDate || ''} 
                    targetTime={currentAlbumObj.releaseTime}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 w-full md:w-auto animate-appear items-center md:items-start">
                <span className="text-xs md:text-sm font-bold text-white/80 uppercase tracking-wider">
                  {releaseType}
                </span>
                <h1 className="text-3xl md:text-6xl lg:text-7xl font-black tracking-tight leading-tight line-clamp-2 text-white">
                    {title}
                </h1>
                {description && <p className="text-secondary/80 text-sm md:text-base font-medium">{description}</p>}
                
                {!isPlaylist && (
                    (() => {
                      const primaryArtist = allAlbumArtists[0] || currentAlbumObj?.artist || '';
                      const primaryArtistAccount = artistAccounts.find(a => (a.artistName || '').toLowerCase() === primaryArtist.toLowerCase());
                      const artistAvatarImg = primaryArtistAccount?.avatar;
                      return (
                        <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 font-semibold text-sm text-white mt-1">
                          {primaryArtist && (
                            <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-800 shrink-0">
                              {artistAvatarImg ? (
                                <img src={artistAvatarImg} alt={primaryArtist} className="w-full h-full object-cover" />
                              ) : (
                                <User size={14} className="text-white m-1" />
                              )}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-1">
                            {allAlbumArtists.map((art, idx) => (
                                <span key={art}>
                                    {idx > 0 && ", "}
                                    <span onClick={() => goToArtist(art)} className="font-bold hover:underline cursor-pointer">{art}</span>
                                </span>
                            ))}
                          </div>
                          {year && (
                            <>
                              <span className="text-secondary">•</span>
                              <span className="text-white/80">{year}</span>
                            </>
                          )}
                          {items.length > 0 && (
                            <>
                              <span className="text-secondary">•</span>
                              <span className="text-white/80">{items.length} {t('songs')}</span>
                            </>
                          )}
                        </div>
                      );
                    })()
                )}
                
                {isPlaylist && (
                    <div className="flex items-center gap-2 justify-center md:justify-start mt-1 text-sm font-semibold text-white">
                        <div className="w-6 h-6 rounded-full bg-zinc-800 overflow-hidden shrink-0">
                            {creatorAvatar ? <img src={creatorAvatar} className="w-full h-full object-cover" /> : <User size={14} className="text-white m-1" />}
                        </div>
                        <span className="font-bold hover:underline cursor-pointer">{creatorName || t('playlist')}</span>
                        {items.length > 0 && (
                          <>
                            <span className="text-secondary">•</span>
                            <span className="text-white/80">{items.length} {t('songs')}</span>
                          </>
                        )}
                    </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        {currentAlbumObj?.isUpcoming ? (
          <div className="px-6 md:px-8 py-4 md:py-6 flex items-center gap-3 animate-appear bg-background">
            <button 
              onClick={() => {
                toggleAlbumLike(id);
                showNotification(isAlbumLiked(id) ? 'Удалено из медиатеки' : 'Релиз предварительно сохранен в медиатеку', 'success');
              }}
              className={`px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 transition select-none ${
                isAlbumLiked(id)
                  ? 'bg-transparent text-white border border-white/40 hover:border-white'
                  : 'bg-white text-black hover:scale-105 active:scale-95 shadow-md'
              }`}
            >
              {isAlbumLiked(id) ? (
                <>
                  <span>Предварительно сохранено</span>
                  <Check size={16} className="text-white stroke-[2.5]" />
                </>
              ) : (
                <span>Предварительно сохранить</span>
              )}
            </button>
          </div>
        ) : (
          <div className="px-6 md:px-8 py-4 md:py-6 flex items-center gap-4 md:gap-6 animate-appear bg-background">
            {(() => {
              const playableTracks = items.filter(t => !t.isUnreleased && Boolean(t.url));

              return (
                <button 
                   disabled={playableTracks.length === 0}
                   onClick={() => {
                     if (playableTracks.length > 0) {
                       playTrack(playableTracks[0], playableTracks, !isPlaylist ? (currentAlbumObj?.id || id) : undefined);
                     }
                   }}
                   className={`w-12 h-12 md:w-14 md:h-14 bg-primary rounded-full flex items-center justify-center transition shadow-primary-glow ${
                     playableTracks.length === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
                   } ${
                     isLiquidGlass
                       ? 'max-md:bg-primary/95 max-md:active:scale-90 md:hover:scale-105'
                       : 'hover:scale-105'
                   }`}
                   title={t('play')}
                >
                  <Play size={24} fill="black" className="ml-1 text-black md:w-7 md:h-7" />
                </button>
              );
            })()}
            
            {!isPlaylist && (
               <button 
                  onClick={() => toggleAlbumLike(id)} 
                  className={`transition ${
                    isLiquidGlass
                      ? 'max-md:w-11 max-md:h-11 max-md:rounded-full max-md:bg-white/[0.08] max-md:backdrop-blur-xl max-md:border max-md:border-white/15 max-md:flex max-md:items-center max-md:justify-center max-md:active:scale-90 md:hover:scale-105'
                      : 'hover:scale-105'
                  }`} 
               >
                  <Heart size={isLiquidGlass ? 24 : 32} fill={isAlbumLiked(id) ? 'currentColor' : 'none'} className={isAlbumLiked(id) ? 'text-primary' : 'text-secondary hover:text-white'} />
               </button>
            )}

            {isPlaylist && isOwner && !isSystem && (
                <>
                  <button 
                      onClick={(e) => handleEditPlaylist(id, e)} 
                      className={`transition ${
                        isLiquidGlass
                          ? 'max-md:w-11 max-md:h-11 max-md:rounded-full max-md:bg-white/[0.08] max-md:backdrop-blur-xl max-md:border max-md:border-white/15 max-md:flex max-md:items-center max-md:justify-center max-md:text-white max-md:active:scale-90 md:text-secondary md:hover:text-white md:hover:scale-105'
                          : 'text-secondary hover:text-white hover:scale-105'
                      }`} 
                      title={t('editPlaylist')}
                  >
                      <Edit size={isLiquidGlass ? 22 : 32} />
                  </button>
                  <button 
                      onClick={() => deletePlaylist(id)} 
                      className={`transition ${
                        isLiquidGlass
                          ? 'max-md:w-11 max-md:h-11 max-md:rounded-full max-md:bg-white/[0.08] max-md:backdrop-blur-xl max-md:border max-md:border-white/15 max-md:flex max-md:items-center max-md:justify-center max-md:text-secondary max-md:active:scale-90 md:text-secondary md:hover:text-red-500 md:hover:scale-105'
                          : 'text-secondary hover:text-red-500 hover:scale-105'
                      }`} 
                      title={t('deletePlaylist')}
                  >
                      <Trash2 size={isLiquidGlass ? 22 : 32} />
                  </button>
                </>
            )}

            {isPlaylist && !isOwner && !isSystem && isPublic && (
                <button 
                    onClick={() => togglePlaylistSave(id)} 
                    className={`transition ${
                      isLiquidGlass
                        ? 'max-md:w-11 max-md:h-11 max-md:rounded-full max-md:bg-white/[0.08] max-md:backdrop-blur-xl max-md:border max-md:border-white/15 max-md:flex max-md:items-center max-md:justify-center max-md:active:scale-90 md:hover:scale-105'
                        : 'hover:scale-105'
                    }`} 
                    title={isSavedPlaylist ? t('removeFromLibrary') : t('addToLibrary')}
                >
                    {isSavedPlaylist ? (
                        <CheckCircle size={isLiquidGlass ? 24 : 32} className="text-primary" />
                    ) : (
                        <PlusSquare size={isLiquidGlass ? 24 : 32} className="text-secondary hover:text-white" />
                    )}
                </button>
            )}
          </div>
        )}

        {/* List */}
        <div className="px-4 md:px-8 animate-slide-up">
           {currentAlbumObj?.isUpcoming && (
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-white">
                {t('tracklistPreview', 'Предпросмотр списка треков')}
              </h2>
           )}
           <div className="hidden md:grid grid-cols-[28px_minmax(0,4fr)_minmax(0,2fr)_minmax(0,1fr)_auto] gap-4 px-4 py-2 border-b border-surface-highlight text-secondary text-sm mb-3">
             <span className="text-center font-mono">#</span>
             <span>{t('trackTitle')}</span>
             <span>{t('plays')}</span>
             <span className="text-right">{t('duration', 'Длительность')}</span>
             <span className="w-16"></span>
           </div>
           
           <div className="flex flex-col gap-1">
             {items.map((track, idx) => {
               const isUpcomingAlbum = !!currentAlbumObj?.isUpcoming;
               const hideTrackMetadata = !!currentAlbumObj?.hideTrackMetadata;
               const isTrackReleased = !track.isUnreleased && Boolean(track.url);
               const isTrackDisabled = isUpcomingAlbum && !isTrackReleased;
               const albumCover = !isPlaylist ? cover : undefined;

               return (
                 <TrackRow
                   key={track.id}
                   track={track}
                   index={idx}
                   queue={items}
                   contextAlbumId={!isPlaylist ? (currentAlbumObj?.id || (view as any).id) : undefined}
                   customCover={albumCover}
                   disabled={isTrackDisabled}
                   hideMetadata={hideTrackMetadata}
                   onRemoveFromPlaylist={isPlaylist && !isLikedSongs && !isHistory && isOwner ? () => removeFromPlaylist((view as any).id, track.id) : undefined}
                 />
               );
             })}
           </div>

           {items.length > 0 && (
             <div className="mt-8 pt-8 border-t border-surface-highlight text-secondary text-sm font-medium pb-8 flex flex-col gap-1">
                 {currentAlbumObj?.isUpcoming ? (
                     <>
                         {currentAlbumObj.releaseDate && <p>{formatReleaseDateDisplay(currentAlbumObj.releaseDate)}</p>}
                         <p>{items.length} {t('songs')}</p>
                         {label && <p className="mt-4 text-[10px] uppercase tracking-widest font-bold">© {label}</p>}
                     </>
                 ) : (
                     <>
                         {fullReleaseDate && <p>{t('released')} {formatReleaseDateDisplay(fullReleaseDate)}</p>}
                         {!fullReleaseDate && year && <p>{t('released')} {year}</p>}
                         <p>{items.length} {t('songs')}{totalMinutes > 0 ? `, ${totalMinutes} ${t('min')}` : ''}</p>
                         <p>{formatPlays(totalReleasePlays)} {t('plays')}</p>
                         {label && <p className="mt-4 text-[10px] uppercase tracking-widest font-bold">© {label}</p>}
                     </>
                 )}
             </div>
           )}
        </div>

        {/* Cover Picker Modal */}
        {isCoverPickerOpen && currentAlbumObj && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                <div className={`w-full max-w-lg p-6 relative animate-zoom-in ${
                  isLiquidGlass
                    ? 'max-md:bg-[#15151e]/85 max-md:backdrop-blur-3xl max-md:border max-md:border-white/20 max-md:rounded-3xl max-md:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.3)] md:bg-surface md:rounded-xl'
                    : 'bg-surface rounded-xl'
                }`}>
                    <button onClick={() => setCoverPickerOpen(false)} className="absolute top-4 right-4 text-white"><X size={24}/></button>
                    <h2 className="text-xl font-bold mb-4">{t('chooseCover')}</h2>
                    <p className="text-sm text-secondary mb-4">Select your preferred artwork for this release.</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
                        {currentAlbumObj.covers.map((c: string, idx: number) => (
                            <div 
                                key={idx} 
                                onClick={() => { changeAlbumCover(currentAlbumObj.id, idx); setCoverPickerOpen(false); }}
                                className="cursor-pointer group relative"
                            >
                                <img src={c} className="w-full aspect-square object-cover rounded-xl shadow-lg group-hover:opacity-80 transition" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <span className="bg-primary text-black font-bold text-xs px-2 py-1 rounded-full">{t('select')}</span>
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