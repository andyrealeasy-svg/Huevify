import React, { useState } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Home, Search, Library, PlusSquare, Heart, Trash2, ListMusic, Plus, User as UserIcon, Disc } from './Icons.tsx';
import { ViewState } from '../types.ts';

export const Sidebar = () => {
  const { 
    setView, playlists, deletePlaylist, view, setCreatePlaylistOpen, setPlaylistIdToEdit, 
    tracks, currentUser, setProfileModalOpen, likedPlaylistId, t, appSettings, currentTrack,
    albums, isAlbumLiked, getAlbumCover, followedArtists, artistAccounts, goToArtist, getTrackCover
  } = useStore();

  const [filter, setFilter] = useState<'ALL' | 'PLAYLISTS' | 'ALBUMS' | 'ARTISTS'>('ALL');

  const isLiquidGlass = appSettings?.liquidGlassNav !== false;
  const hasPlayer = Boolean(currentTrack);

  const isTabActive = (tab: 'HOME' | 'SEARCH' | 'LIBRARY') => {
    if (tab === 'HOME') return view.type === 'HOME';
    if (tab === 'SEARCH') return view.type === 'SEARCH';
    if (tab === 'LIBRARY') {
      return view.type === 'LIBRARY' || 
             view.type === 'PLAYLIST' || 
             view.type === 'ALBUM' || 
             view.type === 'ARTIST' || 
             view.type === 'ARTIST_DISCOGRAPHY' || 
             view.type === 'CHARTS' ||
             view.type === 'GENRE';
    }
    return false;
  };

  const isActive = (type: ViewState['type'], id?: string) => {
    if (view.type !== type) return false;
    if (id && view.type === 'PLAYLIST' && (view as any).id !== id) return false;
    return true;
  };

  const isAlbumActive = (albumId: string) => {
    return view.type === 'ALBUM' && (view as any).id === albumId;
  };

  const isArtistActive = (artistName: string) => {
    return (view.type === 'ARTIST' || view.type === 'ARTIST_DISCOGRAPHY') && (view as any).artist === artistName;
  };

  const navClass = (active: boolean) => 
    isLiquidGlass
      ? `relative flex items-center gap-3 px-3 py-2 mx-1.5 rounded-xl cursor-pointer transition-all duration-200 font-medium text-xs select-none ${
          active 
            ? 'text-white bg-white/[0.13] backdrop-blur-xl border border-white/20 shadow-[0_4px_14px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.35)]' 
            : 'text-secondary hover:text-white hover:bg-white/[0.06]'
        }`
      : `flex items-center gap-3 px-3 py-1.5 mx-1.5 rounded-lg cursor-pointer transition font-semibold text-xs ${active ? 'text-white bg-white/10' : 'text-secondary hover:text-white hover:bg-white/5'}`;

  const handleCreate = () => {
    setPlaylistIdToEdit(null); 
    setCreatePlaylistOpen(true);
  };

  const currentLikedId = currentUser ? `liked_${currentUser.id}` : 'liked';
  const visiblePlaylists = playlists.filter(pl => {
    if (pl.id.startsWith('liked') || pl.id === 'liked') return false;
    return pl.isSystem || 
           (currentUser && pl.ownerId === currentUser.id) ||
           (currentUser && pl.savedBy?.includes(currentUser.id));
  });

  const likedAlbums = albums.filter(a => isAlbumLiked(a.id));

  const followedArtistList = followedArtists.map(artistName => {
    const acc = artistAccounts.find(a => a.artistName === artistName);
    const artistTrack = tracks.find(t => t.artist === artistName);
    const image = acc?.avatar || (artistTrack ? getTrackCover(artistTrack) : undefined);
    return {
      name: artistName,
      image
    };
  });

  const showPlaylists = filter === 'ALL' || filter === 'PLAYLISTS';
  const showAlbums = filter === 'ALL' || filter === 'ALBUMS';
  const showArtists = filter === 'ALL' || filter === 'ARTISTS';

  const hasAnyItems = (showPlaylists && visiblePlaylists.length > 0) || 
                      (showAlbums && likedAlbums.length > 0) || 
                      (showArtists && followedArtistList.length > 0);

  return (
    <div className="w-72 lg:w-80 bg-black h-full flex flex-col pt-2.5 hidden md:flex shrink-0 border-r border-white/5 select-none">
      {/* Brand Header */}
      <div className="px-3.5 mb-1.5 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-huevify flex items-center justify-center shrink-0 shadow-sm">
             <span className="text-xs font-black">H</span>
          </div>
          Huevify
        </h1>
      </div>

      {/* User Profile Desktop */}
      {currentUser && (
        <div 
            onClick={() => setProfileModalOpen(true)}
            className="mx-1.5 mb-1 p-1 rounded-md hover:bg-white/5 cursor-pointer flex items-center gap-2 transition group"
        >
            <div className="w-6 h-6 rounded-full bg-zinc-700 overflow-hidden flex items-center justify-center shrink-0 border border-transparent group-hover:border-white transition-colors">
                {currentUser.avatar ? (
                    <img src={currentUser.avatar} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                    <UserIcon size={12} className="text-secondary" />
                )}
            </div>
            <div className="flex flex-col overflow-hidden min-w-0">
                <span className="text-xs font-bold truncate text-white leading-tight">{currentUser.displayName}</span>
                <span className="text-[9px] font-bold text-secondary uppercase leading-tight mt-0.5">{t('viewProfile')}</span>
            </div>
        </div>
      )}

      {/* Primary Navigation */}
      <div className="flex flex-col gap-0.5">
        <div onClick={() => setView({ type: 'HOME' })} className={navClass(isTabActive('HOME'))}>
          <Home size={16} />
          {t('home')}
        </div>
        <div onClick={() => setView({ type: 'SEARCH' })} className={navClass(isTabActive('SEARCH'))}>
          <Search size={16} />
          {t('search')}
        </div>
        <div onClick={() => setView({ type: 'LIBRARY' })} className={navClass(isTabActive('LIBRARY'))}>
          <Library size={16} />
          {t('library')}
        </div>
      </div>

      <div className="my-1.5 border-t border-white/10 mx-2.5" />

      {/* Action shortcuts */}
      <div className="flex flex-col gap-0.5 px-1.5">
        <div 
            onClick={handleCreate} 
            className="flex items-center gap-2 p-1 rounded-md cursor-pointer group text-secondary hover:text-white hover:bg-white/5 transition"
        >
            <div className="w-7 h-7 bg-surface-highlight group-hover:bg-white transition-colors flex items-center justify-center rounded shrink-0">
               <Plus size={14} className="text-secondary group-hover:text-black" />
            </div>
            <span className="font-semibold text-xs">{t('createPlaylist')}</span>
        </div>

        <div 
            onClick={() => setView({ type: 'PLAYLIST', id: likedPlaylistId })} 
            className={`flex items-center gap-2 p-1 rounded-md cursor-pointer group transition hover:bg-white/5 ${isActive('PLAYLIST', likedPlaylistId) ? 'text-white bg-white/10' : 'text-secondary hover:text-white'}`}
        >
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-700 to-blue-300 flex items-center justify-center rounded shrink-0 shadow-sm">
            <Heart size={14} fill="white" className="text-white" />
          </div>
          <span className="font-semibold text-xs">{t('likedSongs')}</span>
        </div>
      </div>

      <div className="my-1.5 border-t border-white/10 mx-2.5" />

      {/* Filter Category Chips */}
      <div className="flex items-center gap-1 px-2 mb-1.5 overflow-x-auto no-scrollbar shrink-0">
        <button 
          onClick={() => setFilter('ALL')} 
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors shrink-0 ${filter === 'ALL' ? 'bg-white text-black font-bold' : 'bg-white/10 text-secondary hover:text-white hover:bg-white/15'}`}
        >
          {t('all') || 'Все'}
        </button>
        <button 
          onClick={() => setFilter('PLAYLISTS')} 
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors shrink-0 ${filter === 'PLAYLISTS' ? 'bg-white text-black font-bold' : 'bg-white/10 text-secondary hover:text-white hover:bg-white/15'}`}
        >
          {t('playlists')} {visiblePlaylists.length > 0 ? `(${visiblePlaylists.length})` : ''}
        </button>
        <button 
          onClick={() => setFilter('ALBUMS')} 
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors shrink-0 ${filter === 'ALBUMS' ? 'bg-white text-black font-bold' : 'bg-white/10 text-secondary hover:text-white hover:bg-white/15'}`}
        >
          {t('albums')} {likedAlbums.length > 0 ? `(${likedAlbums.length})` : ''}
        </button>
        <button 
          onClick={() => setFilter('ARTISTS')} 
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors shrink-0 ${filter === 'ARTISTS' ? 'bg-white text-black font-bold' : 'bg-white/10 text-secondary hover:text-white hover:bg-white/15'}`}
        >
          {t('artists')} {followedArtistList.length > 0 ? `(${followedArtistList.length})` : ''}
        </button>
      </div>

      {/* Media Items List (Playlists, Albums, Artists) */}
      <div className="px-1.5 flex-1 overflow-y-auto min-h-0 custom-scrollbar pb-3">
        <ul className="flex flex-col gap-0.5">
          {/* Playlists */}
          {showPlaylists && visiblePlaylists.map(pl => {
              let cover = pl.customCover;
              if (!cover && pl.tracks.length > 0) {
                  const firstTrack = tracks.find(t => t.id === pl.tracks[0]);
                  if (firstTrack) cover = getTrackCover(firstTrack);
              }

              return (
                <li 
                    key={`pl-${pl.id}`} 
                    onClick={() => setView({ type: 'PLAYLIST', id: pl.id })}
                    className={`flex items-center gap-2.5 p-1.5 rounded-md cursor-pointer group transition hover:bg-white/5 ${isActive('PLAYLIST', pl.id) ? 'bg-white/10' : ''}`}
                >
                    <div className="w-8 h-8 bg-surface-highlight rounded overflow-hidden shrink-0 flex items-center justify-center relative">
                        {cover ? (
                            <img src={cover} alt={pl.name} className="w-full h-full object-cover" />
                        ) : (
                            <ListMusic size={14} className="text-secondary" />
                        )}
                        {pl.ownerId !== currentUser?.id && (
                            <div className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full border border-black"></div>
                        )}
                    </div>
                    <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                        <span className={`truncate text-xs font-medium leading-tight ${isActive('PLAYLIST', pl.id) ? 'text-primary font-semibold' : 'text-secondary group-hover:text-white'}`}>
                            {pl.name}
                        </span>
                        <span className="text-[10px] text-secondary/80 truncate leading-tight mt-0.5">
                          {t('playlist')} • {pl.ownerId === currentUser?.id ? (t('you') || 'Вы') : (pl.creatorName || t('systemPlaylist', 'Подборка'))}
                        </span>
                    </div>
                </li>
              );
          })}

          {/* Albums */}
          {showAlbums && likedAlbums.map(album => {
              const albumCover = getAlbumCover(album.id) || album.covers?.[0];
              const active = isAlbumActive(album.id);

              return (
                <li 
                    key={`album-${album.id}`} 
                    onClick={() => setView({ type: 'ALBUM', id: album.id })}
                    className={`flex items-center gap-2.5 p-1.5 rounded-md cursor-pointer group transition hover:bg-white/5 ${active ? 'bg-white/10' : ''}`}
                >
                    <div className="w-8 h-8 bg-surface-highlight rounded overflow-hidden shrink-0 flex items-center justify-center relative">
                        {albumCover ? (
                            <img src={albumCover} alt={album.title} className="w-full h-full object-cover" />
                        ) : (
                            <Disc size={14} className="text-secondary" />
                        )}
                    </div>
                    <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                        <span className={`truncate text-xs font-medium leading-tight ${active ? 'text-primary font-semibold' : 'text-secondary group-hover:text-white'}`}>
                            {album.title}
                        </span>
                        <span className="text-[10px] text-secondary/80 truncate leading-tight mt-0.5">
                          {t('album')} • {album.artist}
                        </span>
                    </div>
                </li>
              );
          })}

          {/* Artists */}
          {showArtists && followedArtistList.map(artist => {
              const active = isArtistActive(artist.name);

              return (
                <li 
                    key={`artist-${artist.name}`} 
                    onClick={() => goToArtist(artist.name)}
                    className={`flex items-center gap-2.5 p-1.5 rounded-md cursor-pointer group transition hover:bg-white/5 ${active ? 'bg-white/10' : ''}`}
                >
                    <div className="w-8 h-8 bg-surface-highlight rounded-full overflow-hidden shrink-0 flex items-center justify-center relative">
                        {artist.image ? (
                            <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
                        ) : (
                            <UserIcon size={14} className="text-secondary" />
                        )}
                    </div>
                    <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                        <span className={`truncate text-xs font-medium leading-tight ${active ? 'text-primary font-semibold' : 'text-secondary group-hover:text-white'}`}>
                            {artist.name}
                        </span>
                        <span className="text-[10px] text-secondary/80 truncate leading-tight mt-0.5">
                          {t('artist')}
                        </span>
                    </div>
                </li>
              );
          })}

          {!hasAnyItems && (
            <div className="p-3 text-center text-xs text-secondary/60 font-medium">
              {t('noReleases') || 'Медиатека пуста'}
            </div>
          )}
        </ul>
      </div>
    </div>
  );
};