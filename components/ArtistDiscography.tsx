import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { ArrowLeft, Play, ChevronRight, Music2 } from './Icons.tsx';
import { Album, Track } from '../types.ts';

interface ArtistDiscographyProps {
  artistName: string;
}

type TabType = 'all' | 'albums' | 'singles' | 'appears_on';

export const ArtistDiscography: React.FC<ArtistDiscographyProps> = ({ artistName }) => {
  const { 
    albums, 
    tracks, 
    getAlbumCover, 
    setView, 
    goBack, 
    playTrack, 
    t, 
    artistAccounts
  } = useStore();

  const [activeTab, setActiveTab] = useState<TabType>('all');

  const getAlbumReleaseTime = (album: Album): number => {
    if (album.releaseDate) {
      const t = new Date(album.releaseDate).getTime();
      if (!isNaN(t)) return t;
    }
    if (album.year) {
      return new Date(`${album.year}-01-01`).getTime();
    }
    return 0;
  };

  // Собственные релизы артиста
  const ownAlbums = useMemo(() => {
    return albums.filter(a => a.artist === artistName || a.mainArtists?.includes(artistName));
  }, [albums, artistName]);

  // Сортировка собственных релизов по дате (новые -> старые)
  const sortedOwnAlbums = useMemo(() => {
    return [...ownAlbums].sort((a, b) => {
      const diff = getAlbumReleaseTime(b) - getAlbumReleaseTime(a);
      if (diff !== 0) return diff;
      return (b.year || 0) - (a.year || 0);
    });
  }, [ownAlbums]);

  // 1. Последний релиз
  const latestRelease = sortedOwnAlbums[0] || null;

  // 2. Альбомы (не синглы)
  const albumReleases = useMemo(() => {
    return sortedOwnAlbums.filter(a => a.type === 'Album' || (!a.type && a.trackIds.length > 1));
  }, [sortedOwnAlbums]);

  // 3. Синглы и EP
  const singleReleases = useMemo(() => {
    return sortedOwnAlbums.filter(a => a.type === 'Single' || a.type === 'EP' || (!a.type && a.trackIds.length === 1));
  }, [sortedOwnAlbums]);

  // 4. Участие в релизах (где артист есть на фите)
  const appearsOnData = useMemo(() => {
    const artistLower = artistName.toLowerCase();

    return albums
      .filter(album => {
        // Релиз не должен принадлежать этому артисту как основной
        if (album.artist === artistName || album.mainArtists?.includes(artistName)) {
          return false;
        }

        const albumTracks = (album.trackIds || [])
          .map(tid => tracks.find(t => t.id === tid))
          .filter((t): t is Track => !!t);

        return albumTracks.some(track => {
          if (track.feat) {
            const featLower = track.feat.toLowerCase();
            const parts = featLower.split(/[,&/]/).map(p => p.trim());
            if (parts.includes(artistLower) || featLower.includes(artistLower)) return true;
          }
          if (track.mainArtists && track.mainArtists.some(ma => ma.toLowerCase() === artistLower)) {
            return true;
          }
          if (track.artist?.toLowerCase() === artistLower) {
            return true;
          }
          return false;
        });
      })
      .map(album => {
        const albumTracks = (album.trackIds || [])
          .map(tid => tracks.find(t => t.id === tid))
          .filter((t): t is Track => !!t);

        const featTrackTitles = albumTracks
          .filter(track => {
            if (track.feat) {
              const featLower = track.feat.toLowerCase();
              const parts = featLower.split(/[,&/]/).map(p => p.trim());
              if (parts.includes(artistLower) || featLower.includes(artistLower)) return true;
            }
            if (track.mainArtists && track.mainArtists.some(ma => ma.toLowerCase() === artistLower)) {
              return true;
            }
            if (track.artist?.toLowerCase() === artistLower) {
              return true;
            }
            return false;
          })
          .map(t => t.title);

        return {
          album,
          releaseTime: getAlbumReleaseTime(album)
        };
      })
      .sort((a, b) => b.releaseTime - a.releaseTime);
  }, [albums, tracks, artistName]);

  const artistAccount = artistAccounts.find(a => a.artistName === artistName && a.status === 'APPROVED');

  const handlePlayAlbum = (e: React.MouseEvent, album: Album) => {
    e.stopPropagation();
    const albumTracks = (album.trackIds || []).map(tid => tracks.find(t => t.id === tid)).filter((t): t is Track => !!t);
    if (albumTracks.length > 0) {
      playTrack(albumTracks[0], albumTracks);
    }
  };

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: 'all', label: t('allReleases', 'Все'), count: ownAlbums.length + appearsOnData.length },
    { id: 'albums', label: t('albums', 'Альбомы'), count: albumReleases.length },
    { id: 'singles', label: t('singlesAndEPs', 'Синглы и EP'), count: singleReleases.length },
    { id: 'appears_on', label: t('appearsOn', 'Участие в релизах'), count: appearsOnData.length },
  ];

  const showAlbumsBlock = (activeTab === 'all' || activeTab === 'albums') && albumReleases.length > 0;
  const showSinglesBlock = (activeTab === 'all' || activeTab === 'singles') && singleReleases.length > 0;
  const showAppearsOnBlock = (activeTab === 'all' || activeTab === 'appears_on') && appearsOnData.length > 0;

  const hasAnyContent = ownAlbums.length > 0 || appearsOnData.length > 0;

  return (
    <div className="h-full overflow-y-auto pb-32 relative w-full page-enter">
      {/* Top Bar / Header */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md px-4 md:px-8 py-4 border-b border-white/5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={goBack} 
            className="w-9 h-9 bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition hover:scale-105"
            title={t('returnHome', 'Назад')}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">
              {artistName}
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              {t('discography', 'Дискография')}
            </h1>
          </div>
        </div>

        {artistAccount?.avatar && (
          <img 
            src={artistAccount.avatar} 
            alt={artistName}
            className="w-10 h-10 rounded-full object-cover border border-white/10 hidden sm:block" 
          />
        )}
      </div>

      <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-white text-black shadow-md'
                  : 'bg-surface hover:bg-surface-highlight text-white/90'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-xs px-1.5 py-0.2 rounded-full ${
                activeTab === tab.id ? 'bg-black/15 text-black' : 'bg-white/10 text-secondary'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {!hasAnyContent && (
          <div className="py-20 text-center text-secondary">
            <Music2 size={48} className="mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium text-white">{t('noReleases', 'Релизов пока нет')}</p>
          </div>
        )}

        {/* 1. БЛОК: ПОСЛЕДНИЙ РЕЛИЗ */}
        {activeTab === 'all' && latestRelease && (
          <div className="mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">
              {t('latestRelease', 'Последний релиз')}
            </h2>
            <div 
              onClick={() => setView({ type: 'ALBUM', id: latestRelease.id })}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 group cursor-pointer transition"
            >
              <div className="flex items-center gap-3.5 overflow-hidden min-w-0">
                <div className="relative w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-md overflow-hidden shadow-md">
                  <img 
                    src={getAlbumCover(latestRelease.id)} 
                    alt={latestRelease.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                  <div 
                    onClick={(e) => handlePlayAlbum(e, latestRelease)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                    title="Play"
                  >
                    <Play size={20} fill="white" className="text-white ml-0.5" />
                  </div>
                </div>
                <div className="flex flex-col overflow-hidden min-w-0">
                  <span className="font-semibold text-white truncate text-base group-hover:underline">
                    {latestRelease.title}
                  </span>
                  <span className="text-xs text-secondary truncate mt-0.5">
                    {latestRelease.year} • {latestRelease.type === 'EP' ? 'EP' : latestRelease.type === 'Single' ? t('single', 'Сингл') : t('album', 'Альбом')} • {latestRelease.trackIds.length} {latestRelease.trackIds.length === 1 ? t('trackOne', 'трек') : t('tracksCount', 'треков')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-secondary group-hover:text-white shrink-0 pl-2">
                <ChevronRight size={18} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
              </div>
            </div>
          </div>
        )}

        {/* 2. БЛОК: АЛЬБОМЫ */}
        {showAlbumsBlock && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span>{t('albums', 'Альбомы')}</span>
                <span className="text-sm font-normal text-secondary">({albumReleases.length})</span>
              </h2>
            </div>

            <div className="flex flex-col gap-1">
              {albumReleases.map(album => {
                return (
                  <div 
                    key={album.id}
                    onClick={() => setView({ type: 'ALBUM', id: album.id })}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 group cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3.5 overflow-hidden min-w-0">
                      <div className="relative w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-md overflow-hidden shadow-md">
                        <img 
                          src={getAlbumCover(album.id)} 
                          alt={album.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                        <div 
                          onClick={(e) => handlePlayAlbum(e, album)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                          title="Play"
                        >
                          <Play size={20} fill="white" className="text-white ml-0.5" />
                        </div>
                      </div>
                      <div className="flex flex-col overflow-hidden min-w-0">
                        <span className="font-semibold text-white truncate text-base group-hover:underline">
                          {album.title}
                        </span>
                        <span className="text-xs text-secondary truncate mt-0.5">
                          {album.year} • {album.type === 'EP' ? 'EP' : album.type === 'Single' ? t('single', 'Сингл') : t('album', 'Альбом')} • {album.trackIds.length} {album.trackIds.length === 1 ? t('trackOne', 'трек') : t('tracksCount', 'треков')}
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
          </div>
        )}

        {/* 3. БЛОК: СИНГЛЫ И EP */}
        {showSinglesBlock && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span>{t('singlesAndEPs', 'Синглы и мини-альбомы')}</span>
                <span className="text-sm font-normal text-secondary">({singleReleases.length})</span>
              </h2>
            </div>

            <div className="flex flex-col gap-1">
              {singleReleases.map(single => {
                const releaseType = single.type === 'EP' ? 'EP' : t('single', 'Сингл');
                return (
                  <div 
                    key={single.id}
                    onClick={() => setView({ type: 'ALBUM', id: single.id })}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 group cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3.5 overflow-hidden min-w-0">
                      <div className="relative w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-md overflow-hidden shadow-md">
                        <img 
                          src={getAlbumCover(single.id)} 
                          alt={single.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                        <div 
                          onClick={(e) => handlePlayAlbum(e, single)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                          title="Play"
                        >
                          <Play size={20} fill="white" className="text-white ml-0.5" />
                        </div>
                      </div>
                      <div className="flex flex-col overflow-hidden min-w-0">
                        <span className="font-semibold text-white truncate text-base group-hover:underline">
                          {single.title}
                        </span>
                        <span className="text-xs text-secondary truncate mt-0.5">
                          {single.year} • {releaseType} • {single.trackIds.length} {single.trackIds.length === 1 ? t('trackOne', 'трек') : t('tracksCount', 'треков')}
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
          </div>
        )}

        {/* 4. БЛОК: УЧАСТИЕ В РЕЛИЗАХ (где артист есть на фите) */}
        {showAppearsOnBlock && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span>{t('appearsOn', 'Участие в релизах')}</span>
                <span className="text-sm font-normal text-secondary">({appearsOnData.length})</span>
              </h2>
            </div>

            <div className="flex flex-col gap-1">
              {appearsOnData.map(({ album }) => {
                const releaseType = album.type === 'EP' ? 'EP' : album.type === 'Single' ? t('single', 'Сингл') : t('album', 'Альбом');
                return (
                  <div 
                    key={album.id}
                    onClick={() => setView({ type: 'ALBUM', id: album.id })}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 group cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3.5 overflow-hidden min-w-0">
                      <div className="relative w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-md overflow-hidden shadow-md">
                        <img 
                          src={getAlbumCover(album.id)} 
                          alt={album.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                        <div 
                          onClick={(e) => handlePlayAlbum(e, album)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                          title="Play"
                        >
                          <Play size={20} fill="white" className="text-white ml-0.5" />
                        </div>
                      </div>
                      <div className="flex flex-col overflow-hidden min-w-0">
                        <span className="font-semibold text-white truncate text-base group-hover:underline">
                          {album.title}
                        </span>
                        <span className="text-xs text-secondary truncate mt-0.5">
                          {album.artist} • {album.year} • {releaseType}
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
          </div>
        )}

        {/* Если выбран конкретный пустой таб */}
        {activeTab === 'albums' && albumReleases.length === 0 && (
          <div className="py-16 text-center text-secondary">
            <p className="text-base text-white">{t('noReleases', 'Альбомов пока нет')}</p>
          </div>
        )}
        {activeTab === 'singles' && singleReleases.length === 0 && (
          <div className="py-16 text-center text-secondary">
            <p className="text-base text-white">{t('noReleases', 'Синглов пока нет')}</p>
          </div>
        )}
        {activeTab === 'appears_on' && appearsOnData.length === 0 && (
          <div className="py-16 text-center text-secondary">
            <p className="text-base text-white">{t('noAppearsOn', 'Участий в релизах пока нет')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
