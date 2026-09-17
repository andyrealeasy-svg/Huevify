import React, { useState } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Track } from '../types.ts';
import { Play, Pause, Heart, MoreHorizontal } from './Icons.tsx';
import { PlayingVisualizer } from './PlayingVisualizer.tsx';
import { ExplicitBadge } from './ExplicitBadge.tsx';
import { TrackMenuModal } from './TrackMenuModal.tsx';

const formatDuration = (seconds: number) => {
  const totalSeconds = Math.floor(seconds);
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

const formatPlays = (plays?: number) => {
  return new Intl.NumberFormat('en-US').format(plays || 0);
};

interface TrackRowProps {
  track: Track;
  index?: number;
  queue?: Track[];
  contextAlbumId?: string;
  customCover?: string;
  showDailyPlays?: boolean;
  disabled?: boolean;
  hideMetadata?: boolean;
  onRemoveFromPlaylist?: () => void;
  className?: string;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  queue,
  contextAlbumId,
  customCover,
  showDailyPlays = false,
  disabled = false,
  hideMetadata = false,
  onRemoveFromPlaylist,
  className = ''
}) => {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    playNext,
    toggleLike,
    isLiked,
    goToArtist,
    setView,
    albums,
    openAddToPlaylist,
    getTrackCover,
    showNotification,
    t,
    appSettings
  } = useStore();

  const isLiquidGlass = appSettings?.liquidGlassNav !== false;

  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const isCurrent = currentTrack?.id === track.id;
  const isTrackLiked = isLiked(track.id);
  const isTrackUnreleased = track.isUnreleased || !track.url;
  const isRowDisabled = disabled || (isTrackUnreleased && !track.url);

  // Cover image
  const coverUrl = customCover || getTrackCover(track, contextAlbumId);

  // All artists (main + track-level)
  const allArtists = Array.from(new Set([track.artist, ...(track.mainArtists || [])])).filter(Boolean);

  // Find associated album if any
  const matchedAlbum = albums.find(a => 
    (a.trackIds && a.trackIds.includes(track.id)) ||
    (track.album && a.title && a.title.trim().toLowerCase() === track.album.trim().toLowerCase())
  );

  const displayTitle = isRowDisabled && hideMetadata
    ? `${t('trackWord', 'Трек')} ${index !== undefined ? index + 1 : ''}`
    : track.title;

  const handleRowClick = () => {
    if (isRowDisabled) {
      showNotification(t('trackAvailableOnRelease', 'Этот трек станет доступен после релиза'), 'info');
      return;
    }
    if (isCurrent) {
      togglePlay();
    } else {
      const activeQueue = queue && queue.length > 0 ? queue : [track];
      const playableQueue = activeQueue.filter(t => !t.isUnreleased && Boolean(t.url));
      playTrack(track, playableQueue, contextAlbumId);
    }
  };

  const handlePlayButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleRowClick();
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRowDisabled) return;
    toggleLike(track.id);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    try {
      const trackUrl = `${window.location.origin}/#track=${track.id}`;
      navigator.clipboard.writeText(trackUrl);
      setCopied(true);
      showNotification(t('linkCopied', 'Ссылка скопирована в буфер обмена'), 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showNotification('Не удалось скопировать ссылку', 'error');
    }
  };

  const handlePlayNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    playNext(track);
    showNotification(t('addedToQueue', 'Трек добавлен в очередь'), 'success');
  };

  const handleAddToPlaylist = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    openAddToPlaylist(track.id);
  };

  const handleGoToArtist = (e: React.MouseEvent, artistName: string) => {
    e.stopPropagation();
    setMenuOpen(false);
    goToArtist(artistName);
  };

  const handleGoToAlbum = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (matchedAlbum) {
      setView({ type: 'ALBUM', id: matchedAlbum.id });
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (onRemoveFromPlaylist) {
      onRemoveFromPlaylist();
    }
  };

  // Play count string
  const playsCountDisplay = showDailyPlays
    ? (track.dailyPlays !== undefined ? `+${track.dailyPlays.toLocaleString()} ${t('perDay', 'за день')}` : formatPlays(track.plays))
    : formatPlays(track.plays);

  return (
    <div
      onClick={handleRowClick}
      className={`relative grid grid-cols-[24px_minmax(0,1fr)_auto_auto] md:grid-cols-[28px_minmax(0,4fr)_minmax(0,2fr)_minmax(0,1fr)_auto] items-center gap-3 md:gap-4 px-2.5 md:px-4 py-2.5 rounded-lg transition-colors group select-none ${
        isRowDisabled
          ? 'opacity-60 cursor-not-allowed select-none'
          : isLiquidGlass
            ? 'cursor-pointer max-md:rounded-xl max-md:hover:bg-white/[0.06] max-md:active:bg-white/[0.1] md:rounded-lg md:hover:bg-surface-highlight'
            : 'cursor-pointer rounded-lg hover:bg-surface-highlight'
      } ${isCurrent ? (isLiquidGlass ? 'bg-white/[0.04]' : 'bg-surface-highlight/40') : ''} ${className}`}
    >
      {/* 1. Track Number / Play Icon / Visualizer */}
      <div className="flex items-center justify-center w-6 md:w-7 shrink-0">
        {isRowDisabled ? (
          <span className="text-zinc-600 text-sm font-mono">
            {index !== undefined ? index + 1 : '—'}
          </span>
        ) : isCurrent ? (
          <div className="relative flex items-center justify-center" onClick={handlePlayButtonClick}>
            <div className="group-hover:hidden">
              <PlayingVisualizer size="xs" isPlaying={isPlaying} />
            </div>
            <button
              className="hidden group-hover:flex items-center justify-center text-white transition hover:scale-110"
              title={isPlaying ? t('pause', 'Пауза') : t('play', 'Воспроизвести')}
            >
              {isPlaying ? (
                <Pause size={15} fill="white" className="text-white" />
              ) : (
                <Play size={15} fill="white" className="text-white ml-0.5" />
              )}
            </button>
          </div>
        ) : (
          <div className="relative flex items-center justify-center">
            <span className="text-secondary group-hover:hidden text-sm font-mono">
              {index !== undefined ? index + 1 : ''}
            </span>
            <button
              onClick={handlePlayButtonClick}
              className="hidden group-hover:flex items-center justify-center text-white transition hover:scale-110"
              title={t('play', 'Воспроизвести')}
            >
              <Play size={15} fill="white" className="text-white ml-0.5" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Cover + Title & Artist (Underneath, Artist clickable) */}
      <div className="flex items-center gap-3 md:gap-3.5 overflow-hidden min-w-0 flex-1">
        <div className="w-10 h-10 md:w-10 md:h-10 rounded-md overflow-hidden bg-surface-highlight shrink-0 shadow-sm relative">
          <img
            src={coverUrl}
            alt={track.title}
            className={`w-full h-full object-cover transition-transform group-hover:scale-105 duration-200 ${
              isRowDisabled ? 'grayscale opacity-60' : ''
            }`}
          />
        </div>

        <div className="flex flex-col overflow-hidden min-w-0 flex-1 justify-center">
          {/* Title Row */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`truncate text-sm md:text-base font-semibold leading-tight ${
                isRowDisabled
                  ? 'text-zinc-500'
                  : isCurrent
                    ? 'text-primary font-bold'
                    : 'text-white group-hover:text-white'
              }`}
            >
              {displayTitle}
            </span>

            {!isRowDisabled && track.explicit && <ExplicitBadge />}

            {isRowDisabled && (
              <span className="text-[10px] uppercase font-bold text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/50 shrink-0">
                {t('unreleased', 'Не вышел')}
              </span>
            )}
          </div>

          {/* Artist Row (Clickable) */}
          <div className="text-xs text-secondary truncate mt-0.5 flex items-center gap-1">
            {isRowDisabled && hideMetadata ? (
              <span className="text-zinc-600 italic">{t('hiddenTrack', 'Информация скрыта')}</span>
            ) : (
              <>
                <div className="truncate flex items-center">
                  {allArtists.map((artistName, i) => (
                    <React.Fragment key={artistName}>
                      {i > 0 && <span className="text-secondary/70 mr-1">,</span>}
                      <span
                        onClick={(e) => {
                          if (!isRowDisabled) {
                            e.stopPropagation();
                            goToArtist(artistName);
                          }
                        }}
                        className={`transition-colors truncate ${
                          isRowDisabled
                            ? 'text-zinc-600'
                            : 'hover:underline hover:text-white cursor-pointer'
                        }`}
                      >
                        {artistName}
                      </span>
                    </React.Fragment>
                  ))}
                  {!isRowDisabled && track.feat && (
                    <span className="text-secondary/70 font-normal ml-1">
                      {`(feat. ${track.feat})`}
                    </span>
                  )}
                </div>

                {/* Mobile Plays counter */}
                <span className="md:hidden text-secondary/60 shrink-0">
                  • {showDailyPlays ? `+${track.dailyPlays?.toLocaleString() || 0}` : formatPlays(track.plays)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3. Plays Column (Desktop) */}
      <div className="hidden md:block text-sm text-secondary truncate font-normal">
        {isRowDisabled ? '—' : playsCountDisplay}
      </div>

      {/* 4. Duration Column */}
      <div className="text-sm text-secondary tabular-nums text-right font-normal shrink-0 mr-1 md:mr-2">
        {isRowDisabled
          ? '--:--'
          : track.duration > 0
            ? formatDuration(track.duration)
            : '--:--'}
      </div>

      {/* 5. Actions: Like (hover only unless liked) + Three Dots */}
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0 justify-end relative">
        {/* Like Button */}
        {!isRowDisabled && (
          <button
            onClick={handleLikeClick}
            className={`p-1.5 rounded-full transition-all active:scale-90 ${
              isTrackLiked
                ? 'text-primary opacity-100'
                : 'text-secondary hover:text-white opacity-0 group-hover:opacity-100 max-md:opacity-70'
            }`}
            title={isTrackLiked ? t('removeFromLiked', 'Удалить из избранного') : t('saveToLiked', 'Нравится')}
          >
            <Heart
              size={18}
              fill={isTrackLiked ? 'currentColor' : 'none'}
              className={isTrackLiked ? 'text-primary' : 'text-secondary hover:text-white'}
            />
          </button>
        )}

        {/* Three Dots Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(true);
          }}
          className={`p-1.5 rounded-full transition-all active:scale-90 ${
            menuOpen
              ? 'text-white bg-white/10 opacity-100'
              : 'text-secondary hover:text-white opacity-0 group-hover:opacity-100 max-md:opacity-70'
          }`}
          title={t('more', 'Ещё')}
        >
          <MoreHorizontal size={18} />
        </button>

        {/* Modal Bottom Sheet Menu */}
        <TrackMenuModal
          track={track}
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
          contextAlbumId={contextAlbumId}
          onRemoveFromPlaylist={onRemoveFromPlaylist}
        />
      </div>
    </div>
  );
};
