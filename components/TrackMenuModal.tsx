import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '../context/StoreContext.tsx';
import { Track } from '../types.ts';
import { 
  Heart, Plus, Trash2, ListMusic, Disc, User, ChevronRight, 
  ArrowLeft, X 
} from './Icons.tsx';
import { ExplicitBadge } from './ExplicitBadge.tsx';

interface TrackMenuModalProps {
  track: Track | null;
  isOpen: boolean;
  onClose: () => void;
  contextAlbumId?: string;
  onRemoveFromPlaylist?: () => void;
}

export const TrackMenuModal: React.FC<TrackMenuModalProps> = ({
  track,
  isOpen,
  onClose,
  contextAlbumId,
  onRemoveFromPlaylist
}) => {
  const { 
    isLiked, toggleLike, openAddToPlaylist, removeFromPlaylist, 
    playlists, currentUser, showNotification, goToArtist, 
    albums, setView, getTrackCover, tracks, t, appSettings, playNext 
  } = useStore();

  const [menuView, setMenuView] = useState<'main' | 'artists' | 'remove_playlist'>('main');

  useEffect(() => {
    if (isOpen) {
      setMenuView('main');
    }
  }, [isOpen, track?.id]);

  if (!isOpen || !track) return null;

  const isLiquidGlass = appSettings?.liquidGlassNav !== false;
  const coverUrl = getTrackCover(track, contextAlbumId);
  const isTrackLiked = isLiked(track.id);

  // Helper to extract all main artists
  const getTrackArtists = (tObj: Track): string[] => {
    const list: string[] = [];
    if (tObj.artist) list.push(tObj.artist);
    if (tObj.mainArtists && Array.isArray(tObj.mainArtists)) {
      tObj.mainArtists.forEach(a => {
        if (a && !list.includes(a)) list.push(a);
      });
    }
    return list.length > 0 ? list : [t('unknownArtist', 'Неизвестный исполнитель')];
  };

  const allArtists = getTrackArtists(track);

  // Find matched album if any
  const matchedAlbum = albums.find(a => 
    (a.trackIds && a.trackIds.includes(track.id)) ||
    (track.album && a.title.toLowerCase() === track.album.toLowerCase())
  );

  const handleToggleLike = () => {
    toggleLike(track.id);
    if (isTrackLiked) {
      showNotification(t('removedFromLiked', 'Удалено из любимых треков'), 'info');
    } else {
      showNotification(t('addedToLiked', 'Добавлено в любимые треки'), 'success');
    }
    onClose();
  };

  const handleAddToPlaylist = () => {
    openAddToPlaylist(track.id);
    onClose();
  };

  const handleRemoveFromPlaylistClick = () => {
    if (onRemoveFromPlaylist) {
      onRemoveFromPlaylist();
      onClose();
    } else {
      setMenuView('remove_playlist');
    }
  };

  const handlePlayNext = () => {
    playNext(track);
    showNotification(t('playNextSuccess', 'Трек будет сыгран следующим'), 'info');
    onClose();
  };

  const handleOpenAlbum = () => {
    if (matchedAlbum) {
      setView({ type: 'ALBUM', id: matchedAlbum.id });
      onClose();
    } else {
      showNotification(t('albumNotFound', 'Релиз не найден'), 'info');
    }
  };

  const handleGoToArtistClick = () => {
    if (allArtists.length > 1) {
      setMenuView('artists');
    } else if (allArtists.length === 1) {
      goToArtist(allArtists[0]);
      onClose();
    }
  };

  const handleSelectArtist = (artistName: string) => {
    goToArtist(artistName);
    onClose();
  };

  const userPlaylistsContainingTrack = playlists.filter(p => {
    if (p.isSystem || p.id.startsWith('liked') || p.id === 'liked') return false;
    const isOwner = currentUser ? p.ownerId === currentUser.id : (!p.ownerId || p.ownerId === 'guest');
    return isOwner && p.tracks && p.tracks.includes(track.id);
  });

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[999] flex flex-col justify-end animate-fade-in"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-lg mx-auto p-5 pb-8 rounded-t-3xl animate-slide-up ${
          isLiquidGlass 
            ? 'bg-[#181820]/90 backdrop-blur-3xl border-t border-x border-white/20 shadow-[0_-12px_40px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.3)]' 
            : 'bg-[#1f1f26] border-t border-white/10 shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grabber handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

        {menuView === 'main' && (
          <>
            {/* Track Info Header */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10 mb-2">
              <div className="flex items-center gap-3 overflow-hidden min-w-0">
                <img 
                  src={coverUrl} 
                  alt={track.title} 
                  className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-md"
                />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-white text-base truncate leading-snug">
                      {track.title}
                    </span>
                    {track.explicit && <ExplicitBadge />}
                  </div>
                  <span className="text-xs text-white/60 truncate mt-0.5">
                    {allArtists.join(', ')}
                  </span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="text-white/60 hover:text-white p-1 rounded-full shrink-0"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Menu List */}
            <div className="flex flex-col gap-1 overflow-y-auto max-h-[60vh]">
              {/* 1. Добавить / Удалить из любимых */}
              <button 
                onClick={handleToggleLike}
                className="flex items-center gap-3.5 w-full py-3 px-2 rounded-xl text-left hover:bg-white/10 active:bg-white/15 transition group"
              >
                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition">
                  <Heart 
                    size={18} 
                    fill={isTrackLiked ? "currentColor" : "none"} 
                    className={isTrackLiked ? "text-primary" : "text-white/80 group-hover:text-white"} 
                  />
                </div>
                <span className="text-sm font-medium text-white/90 group-hover:text-white">
                  {isTrackLiked ? t('removeFromLiked', 'Удалить из любимых треков') : t('saveToLiked', 'Добавить в любимые треки')}
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
                  {t('addToPlaylist', 'Добавить в плейлист')}
                </span>
              </button>

              {/* 3. Удалить из плейлиста */}
              {(onRemoveFromPlaylist || userPlaylistsContainingTrack.length > 0) && (
                <button 
                  onClick={handleRemoveFromPlaylistClick}
                  className="flex items-center gap-3.5 w-full py-3 px-2 rounded-xl text-left hover:bg-white/10 active:bg-white/15 transition group"
                >
                  <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition text-red-400">
                    <Trash2 size={18} />
                  </div>
                  <span className="text-sm font-medium text-white/90 group-hover:text-white">
                    {t('removeFromPlaylist', 'Удалить из плейлиста')}
                  </span>
                </button>
              )}

              {/* 4. Включить следующим */}
              <button 
                onClick={handlePlayNext}
                className="flex items-center gap-3.5 w-full py-3 px-2 rounded-xl text-left hover:bg-white/10 active:bg-white/15 transition group"
              >
                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition text-white/80 group-hover:text-white">
                  <ListMusic size={18} />
                </div>
                <span className="text-sm font-medium text-white/90 group-hover:text-white">
                  {t('playNext', 'Включить следующим')}
                </span>
              </button>

              {/* 5. Открыть альбом */}
              {matchedAlbum && (
                <button 
                  onClick={handleOpenAlbum}
                  className="flex items-center gap-3.5 w-full py-3 px-2 rounded-xl text-left hover:bg-white/10 active:bg-white/15 transition group"
                >
                  <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition text-white/80 group-hover:text-white">
                    <Disc size={18} />
                  </div>
                  <span className="text-sm font-medium text-white/90 group-hover:text-white">
                    {t('goToAlbum', 'Открыть альбом')}
                  </span>
                </button>
              )}

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
                    {t('goToArtist', 'Перейти на страницу артиста')}
                  </span>
                </div>
                {allArtists.length > 1 && (
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
              <h3 className="font-bold text-base text-white">{t('selectArtist', 'Выберите артиста')}</h3>
            </div>

            <div className="flex flex-col gap-1 overflow-y-auto max-h-[50vh]">
              {allArtists.map((artistName) => {
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
              <h3 className="font-bold text-base text-white">{t('removeFromPlaylist', 'Удалить из плейлиста')}</h3>
            </div>

            <div className="flex flex-col gap-1 overflow-y-auto max-h-[50vh]">
              {userPlaylistsContainingTrack.map((pl) => (
                <button 
                  key={pl.id}
                  onClick={() => {
                    removeFromPlaylist(pl.id, track.id);
                    showNotification(`Трек удален из плейлиста "${pl.name}"`, "success");
                    onClose();
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
    </div>,
    document.body
  );
};
