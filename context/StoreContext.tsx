import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Track, Playlist, Album, ViewState, PlayMode } from '../types.ts';
import { generateInitialData, StorageService } from '../services/data.ts';

interface ArtistStats {
  monthlyPlays: number;
  globalRank: number;
}

interface StoreContextType {
  tracks: Track[];
  albums: Album[];
  playlists: Playlist[];
  recommendations: Track[];
  recentlyPlayed: Track[];
  followedArtists: string[];
  currentTrack: Track | null;
  isPlaying: boolean;
  playMode: PlayMode;
  isShuffle: boolean;
  volume: number;
  progress: number;
  duration: number;
  view: ViewState;
  
  // Modal States
  isCreatePlaylistOpen: boolean;
  setCreatePlaylistOpen: (isOpen: boolean) => void;
  playlistIdToEdit: string | null; 
  setPlaylistIdToEdit: (id: string | null) => void;
  
  isMobilePlayerOpen: boolean;
  setMobilePlayerOpen: (isOpen: boolean) => void;
  
  isAddToPlaylistOpen: boolean;
  trackIdToAdd: string | null;
  openAddToPlaylist: (trackId: string) => void;
  closeAddToPlaylist: () => void;

  isDeleteModalOpen: boolean;
  playlistToDelete: string | null;
  openDeleteModal: (id: string) => void;
  closeDeleteModal: () => void;
  confirmDeletePlaylist: () => void;

  // Actions
  setView: (v: ViewState) => void;
  goToArtist: (artistName: string) => void;
  getArtistStats: (artistName: string) => ArtistStats;
  toggleFollowArtist: (artistName: string) => void;
  isArtistFollowed: (artistName: string) => boolean;
  goBack: () => void;
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  
  createPlaylist: (name: string, description?: string, cover?: string) => void;
  editPlaylist: (id: string, name: string, description?: string, cover?: string) => void;
  deletePlaylist: (id: string) => void; 
  addToPlaylist: (playlistId: string, trackId: string) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  
  toggleLike: (trackId: string) => void;
  isLiked: (trackId: string) => boolean;
  toggleAlbumLike: (albumId: string) => void;
  isAlbumLiked: (albumId: string) => boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- Data State ---
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
  const [likedAlbumIds, setLikedAlbumIds] = useState<string[]>([]);
  const [followedArtists, setFollowedArtists] = useState<string[]>([]);
  
  // --- Player State ---
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>(PlayMode.OFF);
  const [isShuffle, setIsShuffle] = useState(false);
  const [volume, setVolumeState] = useState(0.5);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasCountedListen, setHasCountedListen] = useState(false);

  // --- UI State ---
  const [view, setViewInternal] = useState<ViewState>({ type: 'HOME' });
  const [history, setHistory] = useState<ViewState[]>([]);
  
  // Modals
  const [isCreatePlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [playlistIdToEdit, setPlaylistIdToEdit] = useState<string | null>(null);
  const [isMobilePlayerOpen, setMobilePlayerOpen] = useState(false);
  const [isAddToPlaylistOpen, setAddToPlaylistOpen] = useState(false);
  const [trackIdToAdd, setTrackIdToAdd] = useState<string | null>(null);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<string | null>(null);

  // --- Refs ---
  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const cumulativeTimeRef = useRef(0);
  const lastTimeRef = useRef(0);

  // --- Initialization ---
  useEffect(() => {
    const { tracks: initialTracks, albums: initialAlbums } = generateInitialData();
    
    // Load persisted play counts
    const storedPlays = StorageService.load<Record<string, number>>('huevify_plays', {});
    const mergedTracks = initialTracks.map(t => ({
      ...t,
      plays: storedPlays[t.id] ?? t.plays
    }));

    setTracks(mergedTracks);
    setAlbums(initialAlbums);

    const storedPlaylists = StorageService.load<Playlist[]>('huevify_playlists', [
      { id: 'liked', name: 'Liked Songs', tracks: [], isSystem: true, description: 'Your favorite tracks' }
    ]);
    setPlaylists(storedPlaylists);

    const storedLikedAlbums = StorageService.load<string[]>('huevify_liked_albums', []);
    setLikedAlbumIds(storedLikedAlbums);
    
    const storedFollowedArtists = StorageService.load<string[]>('huevify_followed_artists', []);
    setFollowedArtists(storedFollowedArtists);
    
    const storedRecent = StorageService.load<Track[]>('huevify_recent', []);
    setRecentlyPlayed(storedRecent);

    // Setup Audio
    audioRef.current.volume = 0.5;
  }, []);

  // --- Recommendation Engine ---
  useEffect(() => {
    if (tracks.length === 0) return;

    // 1. Analyze User Profile
    const genreScores: Record<string, number> = {};
    const likedPlaylist = playlists.find(p => p.id === 'liked');
    const likedIds = likedPlaylist ? likedPlaylist.tracks : [];

    tracks.forEach(t => {
      let score = 0;
      if (likedIds.includes(t.id)) score += 50;
      if (t.plays > 0) score += Math.log(t.plays) * 2;
      if (score > 0) {
        genreScores[t.genre] = (genreScores[t.genre] || 0) + score;
      }
    });

    const topGenres = Object.entries(genreScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([g]) => g);

    const targetGenres = topGenres.length > 0 ? topGenres : tracks.map(t => t.genre);

    const candidates = tracks.filter(t => 
      targetGenres.includes(t.genre) && 
      !likedIds.includes(t.id)
    );

    const shuffled = [...candidates].sort(() => 0.5 - Math.random()).slice(0, 6);
    setRecommendations(shuffled);

  }, [tracks, playlists]);

  // --- Persistence Effects ---
  useEffect(() => {
    if (playlists.length > 0) {
      StorageService.save('huevify_playlists', playlists);
    }
  }, [playlists]);

  useEffect(() => {
    if (tracks.length > 0) {
      const playCounts = tracks.reduce((acc, t) => ({ ...acc, [t.id]: t.plays }), {});
      StorageService.save('huevify_plays', playCounts);
    }
  }, [tracks]);

  useEffect(() => {
    StorageService.save('huevify_liked_albums', likedAlbumIds);
  }, [likedAlbumIds]);
  
  useEffect(() => {
    StorageService.save('huevify_followed_artists', followedArtists);
  }, [followedArtists]);

  // --- Navigation Actions ---
  const setView = (newView: ViewState) => {
    if (JSON.stringify(view) !== JSON.stringify(newView)) {
      setHistory(prev => [...prev, view]);
      setViewInternal(newView);
    }
    setMobilePlayerOpen(false);
  };

  const goToArtist = (artistName: string) => {
    setView({ type: 'ARTIST', id: artistName });
    setMobilePlayerOpen(false);
  }

  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(h => h.slice(0, -1));
      setViewInternal(prev);
    } else {
      setViewInternal({ type: 'HOME' });
    }
  };

  // --- Artist Stats Calculation (Deterministic) ---
  const getArtistStats = (artistName: string): ArtistStats => {
    const artistPlayMap: Record<string, number> = {};
    tracks.forEach(t => {
        artistPlayMap[t.artist] = (artistPlayMap[t.artist] || 0) + t.plays;
    });

    const sortedArtists = Object.entries(artistPlayMap).sort(([, a], [, b]) => b - a);
    const rankIndex = sortedArtists.findIndex(([name]) => name === artistName);
    
    const totalPlays = artistPlayMap[artistName] || 0;
    const monthlyPlays = Math.floor(totalPlays * 0.45); 

    return {
        monthlyPlays,
        globalRank: rankIndex === -1 ? 999 : rankIndex + 1
    };
  };

  const toggleFollowArtist = (artistName: string) => {
    setFollowedArtists(prev => {
        if (prev.includes(artistName)) {
            return prev.filter(a => a !== artistName);
        } else {
            return [...prev, artistName];
        }
    });
  };

  const isArtistFollowed = (artistName: string) => followedArtists.includes(artistName);

  // --- Playback State Reset ---
  useEffect(() => {
    cumulativeTimeRef.current = 0;
    lastTimeRef.current = 0;
    setHasCountedListen(false);
  }, [currentTrack]);

  // --- Audio Logic ---
  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      const now = audio.currentTime;
      setProgress(now);
      const diff = now - lastTimeRef.current;
      if (diff > 0 && diff < 1.5) {
        cumulativeTimeRef.current += diff;
      }
      lastTimeRef.current = now;
      
      if (cumulativeTimeRef.current > 30 && !hasCountedListen && currentTrack) {
        handleListenCount(currentTrack);
      }
    };

    const handleEnded = () => {
      if (playMode === PlayMode.ONE) {
        audio.currentTime = 0;
        audio.play();
      } else {
        nextTrack();
      }
    };

    const handleLoadedMetadata = () => {
        setDuration(audio.duration);
    }

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [currentTrack, hasCountedListen, playMode, tracks, isShuffle]);

  const handleListenCount = (track: Track) => {
    const lastListenKey = `last_listen_${track.id}`;
    const lastListenTime = StorageService.load<number>(lastListenKey, 0);
    const now = Date.now();

    if (now - lastListenTime > track.duration * 1000) {
      const addedPlays = Math.floor(100 + Math.random() * 9900);
      setTracks(prev => prev.map(t => 
        t.id === track.id ? { ...t, plays: t.plays + addedPlays } : t
      ));
      StorageService.save(lastListenKey, now);
    }
    setHasCountedListen(true);
  };

  const playTrack = (track: Track) => {
    setRecentlyPlayed(prev => {
        const filtered = prev.filter(t => t.id !== track.id);
        const newHistory = [track, ...filtered].slice(0, 10);
        StorageService.save('huevify_recent', newHistory);
        return newHistory;
    });

    if (currentTrack?.id === track.id) {
      togglePlay();
      return;
    }
    setCurrentTrack(track);
    audioRef.current.src = track.url;
    audioRef.current.play()
      .then(() => setIsPlaying(true))
      .catch(e => console.error("Audio play failed", e));
  };

  const togglePlay = () => {
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const setVolume = (vol: number) => {
    setVolumeState(vol);
    audioRef.current.volume = vol;
  };

  const seek = (time: number) => {
    audioRef.current.currentTime = time;
    lastTimeRef.current = time;
    setProgress(time);
  };

  const getQueue = (): Track[] => {
    if (view.type === 'PLAYLIST' && (view as any).id === 'history') {
        return recentlyPlayed;
    }
    return tracks; 
  };

  const nextTrack = () => {
    const queue = getQueue();
    if (isShuffle) {
        const randomIdx = Math.floor(Math.random() * queue.length);
        playTrack(queue[randomIdx]);
        return;
    }
    const idx = queue.findIndex(t => t.id === currentTrack?.id);
    if (idx !== -1 && idx < queue.length - 1) {
      playTrack(queue[idx + 1]);
    } else if (playMode === PlayMode.CONTEXT) {
      playTrack(queue[0]);
    } else {
      setIsPlaying(false);
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const prevTrack = () => {
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      lastTimeRef.current = 0;
      return;
    }
    const queue = getQueue();
    const idx = queue.findIndex(t => t.id === currentTrack?.id);
    if (idx > 0) {
      playTrack(queue[idx - 1]);
    } else {
      playTrack(queue[queue.length - 1]);
    }
  };

  const toggleRepeat = () => {
    if (playMode === PlayMode.OFF) setPlayMode(PlayMode.CONTEXT);
    else if (playMode === PlayMode.CONTEXT) setPlayMode(PlayMode.ONE);
    else setPlayMode(PlayMode.OFF);
  };

  const toggleShuffle = () => {
    setIsShuffle(!isShuffle);
  };

  // --- Library Actions ---

  const createPlaylist = (name: string, description?: string, cover?: string) => {
    const newPl: Playlist = {
      id: `pl_${Date.now()}`,
      name,
      description: description || "",
      customCover: cover,
      tracks: []
    };
    setPlaylists(prev => [...prev, newPl]);
  };

  const editPlaylist = (id: string, name: string, description?: string, cover?: string) => {
    setPlaylists(prev => prev.map(p => {
        if (p.id === id) {
            return { ...p, name, description, customCover: cover };
        }
        return p;
    }));
  };

  const openDeleteModal = (id: string) => {
      setPlaylistToDelete(id);
      setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
      setIsDeleteModalOpen(false);
      setPlaylistToDelete(null);
  };

  const confirmDeletePlaylist = () => {
    if (!playlistToDelete) return;
    const id = playlistToDelete;

    if (view.type === 'PLAYLIST' && (view as any).id === id) {
        setViewInternal({ type: 'LIBRARY' });
    }

    setPlaylists(currentPlaylists => {
        const updated = currentPlaylists.filter(p => p.id !== id);
        StorageService.save('huevify_playlists', updated);
        return updated;
    });

    closeDeleteModal();
  };

  const deletePlaylist = (id: string) => {
      openDeleteModal(id);
  };

  const addToPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId && !p.tracks.includes(trackId)) {
        return { ...p, tracks: [...p.tracks, trackId] };
      }
      return p;
    }));
  };

  const removeFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        return { ...p, tracks: p.tracks.filter(id => id !== trackId) };
      }
      return p;
    }));
  };

  const toggleLike = (trackId: string) => {
    const likedPl = playlists.find(p => p.id === 'liked');
    if (!likedPl) return;

    if (likedPl.tracks.includes(trackId)) {
      removeFromPlaylist('liked', trackId);
    } else {
      addToPlaylist('liked', trackId);
    }
  };

  const isLiked = (trackId: string) => {
    const likedPl = playlists.find(p => p.id === 'liked');
    return likedPl ? likedPl.tracks.includes(trackId) : false;
  };

  const toggleAlbumLike = (albumId: string) => {
    if (likedAlbumIds.includes(albumId)) {
        setLikedAlbumIds(prev => prev.filter(id => id !== albumId));
    } else {
        setLikedAlbumIds(prev => [...prev, albumId]);
    }
  };

  const isAlbumLiked = (albumId: string) => likedAlbumIds.includes(albumId);

  const openAddToPlaylist = (trackId: string) => {
    setTrackIdToAdd(trackId);
    setAddToPlaylistOpen(true);
  };

  const closeAddToPlaylist = () => {
    setAddToPlaylistOpen(false);
    setTrackIdToAdd(null);
  };

  return (
    <StoreContext.Provider value={{
      tracks, albums, playlists, recommendations, recentlyPlayed, followedArtists, currentTrack, isPlaying, playMode, isShuffle, volume, progress, duration, view,
      isCreatePlaylistOpen, setCreatePlaylistOpen, playlistIdToEdit, setPlaylistIdToEdit,
      isMobilePlayerOpen, setMobilePlayerOpen,
      isAddToPlaylistOpen, trackIdToAdd, openAddToPlaylist, closeAddToPlaylist,
      isDeleteModalOpen, playlistToDelete, openDeleteModal, closeDeleteModal, confirmDeletePlaylist,
      setView, goToArtist, getArtistStats, toggleFollowArtist, isArtistFollowed, goBack, playTrack, togglePlay, nextTrack, prevTrack, seek, setVolume, toggleRepeat, toggleShuffle,
      createPlaylist, editPlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist, toggleLike, isLiked,
      toggleAlbumLike, isAlbumLiked
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};