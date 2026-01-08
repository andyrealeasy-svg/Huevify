import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Track, Playlist, Album, ViewState, PlayMode, User, AppSettings, DailyChartTrack, ArtistAccount, ReleaseRequest, ProfileEditRequest, ModeratorAccount, AppNotification } from '../types.ts';
import { generateInitialData, StorageService } from '../services/data.ts';

interface ArtistStats {
  monthlyPlays: number;
  globalRank: number;
}

interface StoreContextType {
  // Auth
  currentUser: User | null;
  login: (username: string, pass: string) => boolean;
  register: (user: Omit<User, 'id'>) => boolean;
  logout: () => void;
  updateUserProfile: (data: Partial<User>) => { success: boolean; message?: string };
  
  // Settings
  appSettings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;

  tracks: Track[];
  albums: Album[];
  playlists: Playlist[]; 
  likedPlaylistId: string; // Helper for dynamic ID
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
  
  // Notification
  notifications: AppNotification[];
  showNotification: (message: string, type?: 'error' | 'success' | 'info') => void;
  dismissNotification: (id: string) => void;

  // Daily Chart
  dailyChart: DailyChartTrack[];
  
  // Cover Management
  getAlbumCover: (albumId: string) => string;
  getTrackCover: (track: Track) => string;
  changeAlbumCover: (albumId: string, index: number) => void;

  // Artist Hub / Moderation
  isArtistHubOpen: boolean;
  setArtistHubOpen: (isOpen: boolean) => void;
  currentArtist: ArtistAccount | null;
  currentModerator: ModeratorAccount | null;
  
  artistAccounts: ArtistAccount[];
  releaseRequests: ReleaseRequest[];
  profileEditRequests: ProfileEditRequest[];
  
  hasModerator: boolean;
  existingArtists: string[];
  
  // Artist Actions
  registerArtist: (data: Omit<ArtistAccount, 'id' | 'status'>) => { success: boolean, message?: string };
  registerModerator: (data: ModeratorAccount) => { success: boolean, message?: string };
  loginArtistOrMod: (username: string, pass: string, type: 'ARTIST' | 'MODERATOR') => { success: boolean, message?: string };
  logoutArtistHub: () => void;
  submitRelease: (release: Omit<ReleaseRequest, 'id' | 'status' | 'artistId' | 'artistName' | 'submissionTime'>) => void;
  submitProfileEdit: (edit: Omit<ProfileEditRequest, 'id' | 'status' | 'artistId' | 'artistName'>) => void;
  deleteRelease: (releaseId: string) => void;
  
  // Mod Actions
  approveArtist: (id: string) => void;
  rejectArtist: (id: string) => void;
  approveRelease: (id: string) => void;
  rejectRelease: (id: string) => void;
  approveProfileEdit: (id: string) => void;
  rejectProfileEdit: (id: string) => void;

  // HUEQ Helper
  getTrackByHueq: (hueq: string) => Track | undefined;

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

  isProfileModalOpen: boolean;
  setProfileModalOpen: (isOpen: boolean) => void;

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
  
  createPlaylist: (name: string, description?: string, cover?: string, isPublic?: boolean) => void;
  editPlaylist: (id: string, name: string, description?: string, cover?: string, isPublic?: boolean) => void;
  deletePlaylist: (id: string) => void; 
  addToPlaylist: (playlistId: string, trackId: string) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  togglePlaylistSave: (playlistId: string) => void; 
  
  toggleLike: (trackId: string) => void;
  isLiked: (trackId: string) => boolean;
  toggleAlbumLike: (albumId: string) => void;
  isAlbumLiked: (albumId: string) => boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

// Helper to generate HUEQ: 000XX0
const generateHUEQ = (): string => {
    const randomDigit = () => Math.floor(Math.random() * 10);
    const randomChar = () => String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
    return `${randomDigit()}${randomDigit()}${randomDigit()}${randomChar()}${randomChar()}${randomDigit()}`;
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // --- Settings State ---
  const [appSettings, setAppSettingsState] = useState<AppSettings>({
    accentColor: '#1ed760',
    language: 'English',
    allowExplicitContent: true, // Default to true
    autoPlay: true,
    crossfade: 0,
    albumCoverIndexes: {}
  });

  // --- Data State ---
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
  const [likedAlbumIds, setLikedAlbumIds] = useState<string[]>([]);
  const [followedArtists, setFollowedArtists] = useState<string[]>([]);
  
  const [dailyChart, setDailyChart] = useState<DailyChartTrack[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  // --- Artist Hub State ---
  const [isArtistHubOpen, setArtistHubOpen] = useState(false);
  const [currentArtist, setCurrentArtist] = useState<ArtistAccount | null>(null);
  const [currentModerator, setCurrentModerator] = useState<ModeratorAccount | null>(null);
  const [artistAccounts, setArtistAccounts] = useState<ArtistAccount[]>([]);
  const [releaseRequests, setReleaseRequests] = useState<ReleaseRequest[]>([]);
  const [profileEditRequests, setProfileEditRequests] = useState<ProfileEditRequest[]>([]);
  const [hasModerator, setHasModerator] = useState(false);
  const [existingArtists, setExistingArtists] = useState<string[]>([]);

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
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<string | null>(null);

  // --- Refs ---
  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const cumulativeTimeRef = useRef(0);
  const lastTimeRef = useRef(0);
  // Real-time Sync Channel
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Helper ID
  const likedPlaylistId = currentUser ? `liked_${currentUser.id}` : 'liked';

  const showNotification = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
      const id = Date.now().toString();
      setNotifications(prev => [...prev, { id, message, type }]);
      setTimeout(() => dismissNotification(id), 5000);
  };

  const dismissNotification = (id: string) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // --- Broadcast Channel for Cross-Tab Syncing ---
  useEffect(() => {
      try {
          if (typeof BroadcastChannel !== 'undefined') {
              broadcastChannelRef.current = new BroadcastChannel('huevify_sync');
              
              broadcastChannelRef.current.onmessage = (event) => {
                  try {
                      const { type } = event.data;
                      // When another tab updates data, reload from local storage
                      if (type === 'PLAYLISTS_UPDATE') {
                          setPlaylists(StorageService.load<Playlist[]>('huevify_playlists', []));
                      }
                      if (type === 'TRACKS_UPDATE') {
                          const requests = StorageService.load<ReleaseRequest[]>('huevify_release_requests', []);
                          const storedPlays = StorageService.load<Record<string, number>>('huevify_plays', {});
                          refreshLibrary(requests, storedPlays);
                      }
                      if (type === 'ARTIST_DATA_UPDATE') {
                          setArtistAccounts(StorageService.load<ArtistAccount[]>('huevify_artist_accounts', []));
                          setReleaseRequests(StorageService.load<ReleaseRequest[]>('huevify_release_requests', []));
                          setProfileEditRequests(StorageService.load<ProfileEditRequest[]>('huevify_profile_requests', []));
                          
                          const requests = StorageService.load<ReleaseRequest[]>('huevify_release_requests', []);
                          const storedPlays = StorageService.load<Record<string, number>>('huevify_plays', {});
                          refreshLibrary(requests, storedPlays);
                      }
                      if (type === 'SETTINGS_UPDATE' && currentUser) {
                          const userSettings = StorageService.load<AppSettings | null>(`huevify_settings_${currentUser.id}`, null);
                          if (userSettings) setAppSettingsState(prev => ({ ...prev, ...userSettings }));
                      }
                  } catch (err) {
                      console.error("Sync error:", err);
                  }
              };
          }
      } catch (e) {
          console.warn("BroadcastChannel not supported in this browser.", e);
      }

      return () => {
          broadcastChannelRef.current?.close();
      };
  }, [currentUser]);

  const notifySync = (type: 'PLAYLISTS_UPDATE' | 'TRACKS_UPDATE' | 'ARTIST_DATA_UPDATE' | 'SETTINGS_UPDATE') => {
      try {
          broadcastChannelRef.current?.postMessage({ type });
      } catch (e) {
          console.error("Failed to notify sync", e);
      }
  };

  // --- Automated Play Count System ---
  useEffect(() => {
    const interval = setInterval(() => {
        const now = new Date();
        if (now.getMinutes() === 30) {
             const currentHour = now.getHours();
             const lastUpdateHour = StorageService.load('huevify_last_play_update_hour', -1);
             
             if (lastUpdateHour !== currentHour) {
                 setTracks(prevTracks => {
                     const updated = prevTracks.map(t => {
                         let add = 0;
                         if (t.plays <= 10000) {
                             add = Math.floor(Math.random() * 1000) + 1;
                         } else if (t.plays <= 50000) {
                             add = Math.floor(Math.random() * 9900) + 100;
                         } else {
                             add = Math.floor(Math.random() * 24000) + 1000;
                         }
                         return { ...t, plays: t.plays + add };
                     });
                     const playCounts = updated.reduce((acc, t) => ({ ...acc, [t.id]: t.plays }), {});
                     StorageService.save('huevify_plays', playCounts);
                     notifySync('TRACKS_UPDATE');
                     return updated;
                 });
                 StorageService.save('huevify_last_play_update_hour', currentHour);
             }
        }
    }, 10000); 
    return () => clearInterval(interval);
  }, []); 

  // --- Logic to Refresh Library (Merge Static + Dynamic Data) ---
  const refreshLibrary = (requests: ReleaseRequest[], storedPlays?: Record<string, number>) => {
      try {
          const { tracks: initialTracks, albums: initialAlbums } = generateInitialData();
          const plays = storedPlays || StorageService.load<Record<string, number>>('huevify_plays', {});
          
          let mergedTracks = [...initialTracks];
          let mergedAlbums = [...initialAlbums];
          const artistSet = new Set(initialAlbums.map(a => a.artist));

          requests.forEach(req => {
              // Safety check for malformed requests
              if (!req || !req.tracks) return;

              const isLive = req.status === 'LIVE';
              const isApprovedAndDue = req.status === 'APPROVED' && new Date(req.releaseDate).getTime() <= Date.now();
              
              if (isLive || isApprovedAndDue) {
                  artistSet.add(req.artistName);
                  if (req.additionalMainArtists) {
                      req.additionalMainArtists.forEach(a => artistSet.add(a));
                  }
                  
                  const albumId = `dist_alb_${req.id}`;
                  // Prevent duplicates if function called multiple times
                  if (!mergedAlbums.find(a => a.id === albumId)) {
                      const newAlbum: Album = {
                          id: albumId,
                          title: req.title,
                          artist: req.artistName,
                          covers: req.covers.length > 0 ? req.covers : ["https://picsum.photos/300"],
                          trackIds: [],
                          year: new Date(req.releaseDate).getFullYear(),
                          releaseDate: req.releaseDate, 
                          recordLabel: req.label,
                          type: req.type,
                          mainArtists: req.additionalMainArtists || [] 
                      };

                      req.tracks.forEach((t, idx) => {
                          let trackId: string;
                          let existingTrack: Track | undefined;

                          if (t.existingHueq) {
                               existingTrack = mergedTracks.find(mt => mt.hueq === t.existingHueq);
                          }

                          if (existingTrack) {
                              trackId = existingTrack.id;
                              const trackIndex = mergedTracks.findIndex(tr => tr.id === trackId);
                              if (trackIndex !== -1) {
                                  mergedTracks[trackIndex] = {
                                      ...mergedTracks[trackIndex],
                                      genre: t.genre || req.genre || mergedTracks[trackIndex].genre,
                                      explicit: t.explicit,
                                  };
                              }
                          } else {
                              trackId = `dist_trk_${req.id}_${idx}`;
                              const releaseLevelArtists = req.additionalMainArtists || [];
                              const trackLevelArtists = t.mainArtists || [];
                              const combinedMainArtists = Array.from(new Set([...releaseLevelArtists, ...trackLevelArtists]));

                              mergedTracks.push({
                                  id: trackId,
                                  title: t.title,
                                  artist: req.artistName,
                                  album: req.title,
                                  cover: req.covers[0], 
                                  duration: t.duration, 
                                  url: t.fileUrl, 
                                  plays: 0,
                                  genre: t.genre || req.genre,
                                  explicit: t.explicit,
                                  feat: t.feat,
                                  hueq: t.generatedHueq || t.existingHueq,
                                  mainArtists: combinedMainArtists
                              });
                          }

                          newAlbum.trackIds.push(trackId);
                      });
                      mergedAlbums.push(newAlbum);
                  }
              }
          });

          const tracksWithPlays = mergedTracks.map(t => ({
              ...t,
              plays: plays[t.id] !== undefined ? plays[t.id] : t.plays
          }));

          setTracks(tracksWithPlays);
          setAlbums(mergedAlbums);
          setExistingArtists(Array.from(artistSet));
      } catch (e) {
          console.error("Failed to refresh library", e);
          // Fallback to initial data if everything fails
          const { tracks: fallbackTracks } = generateInitialData();
          setTracks(fallbackTracks);
      }
  };

  // --- Initialization & User Switching ---
  useEffect(() => {
    try {
        // 1. Load User
        const sessionUser = StorageService.load<User | null>('huevify_current_user', null);
        if (sessionUser) setCurrentUser(sessionUser);
        
        // 2. Load Global Data
        const savedArtistAccounts = StorageService.load<ArtistAccount[]>('huevify_artist_accounts', []);
        setArtistAccounts(savedArtistAccounts);
        
        const savedReleaseRequests = StorageService.load<ReleaseRequest[]>('huevify_release_requests', []);
        setReleaseRequests(savedReleaseRequests);
        
        const savedProfileRequests = StorageService.load<ProfileEditRequest[]>('huevify_profile_requests', []);
        setProfileEditRequests(savedProfileRequests);

        const mod = StorageService.load<ModeratorAccount | null>('huevify_moderator', null);
        setHasModerator(!!mod);

        // Initial Lib Refresh
        refreshLibrary(savedReleaseRequests);

        audioRef.current.volume = 0.5;
    } catch (e) {
        console.error("Initialization failed", e);
    }
    
    // Artificial delay to prevent "Logged out" flash, ensured to run
    setTimeout(() => {
        setIsInitialized(true);
    }, 500);
  }, []);

  // --- Load User-Specific Data when currentUser changes ---
  useEffect(() => {
      if (currentUser) {
          try {
              // Load Settings per user
              const userSettings = StorageService.load<AppSettings | null>(`huevify_settings_${currentUser.id}`, null);
              if (userSettings) {
                  setAppSettingsState({
                      ...userSettings,
                      albumCoverIndexes: userSettings.albumCoverIndexes || {}
                  });
              } else {
                  // Default settings
                  setAppSettingsState({
                    accentColor: '#1ed760',
                    language: 'English',
                    allowExplicitContent: true,
                    autoPlay: true,
                    crossfade: 0,
                    albumCoverIndexes: {}
                  });
              }

              // Load Recent per user
              const userRecent = StorageService.load<Track[]>(`huevify_recent_${currentUser.id}`, []);
              setRecentlyPlayed(userRecent);

              // Load Followed/Liked per user (Already separated by key)
              const storedLikedAlbums = StorageService.load<string[]>(`huevify_liked_albums_${currentUser.id}`, []);
              setLikedAlbumIds(storedLikedAlbums);
              
              const storedFollowedArtists = StorageService.load<string[]>(`huevify_followed_artists_${currentUser.id}`, []);
              setFollowedArtists(storedFollowedArtists);
          } catch(e) {
              console.error("Failed to load user specific data", e);
          }

      } else {
          // Reset if no user
          setRecentlyPlayed([]);
          setLikedAlbumIds([]);
          setFollowedArtists([]);
      }
  }, [currentUser]);

  // --- Release Scheduler Check ---
  useEffect(() => {
      const checkReleases = () => {
          try {
              const now = new Date();
              let changed = false;
              const updatedRequests = releaseRequests.map(req => {
                  if (req.status === 'APPROVED' && new Date(req.releaseDate).getTime() <= now.getTime()) {
                      changed = true;
                      return { ...req, status: 'LIVE' as const };
                  }
                  return req;
              });

              if (changed) {
                  setReleaseRequests(updatedRequests);
                  StorageService.save('huevify_release_requests', updatedRequests);
                  notifySync('ARTIST_DATA_UPDATE');
                  refreshLibrary(updatedRequests);
              }
          } catch (e) {
              console.error("Scheduler check failed", e);
          }
      };

      const interval = setInterval(checkReleases, 60000); 
      return () => clearInterval(interval);
  }, [releaseRequests]);


  // --- Artist Hub Methods ---

  const registerArtist = (data: Omit<ArtistAccount, 'id' | 'status'>): { success: boolean, message?: string } => {
      if (artistAccounts.some(a => a.username === data.username)) return { success: false, message: "Username taken" };
      
      const newArtist: ArtistAccount = {
          ...data,
          id: `art_${Date.now()}`,
          status: 'PENDING'
      };
      const updated = [...artistAccounts, newArtist];
      setArtistAccounts(updated);
      StorageService.save('huevify_artist_accounts', updated);
      notifySync('ARTIST_DATA_UPDATE');
      return { success: true };
  };

  const registerModerator = (data: ModeratorAccount): { success: boolean, message?: string } => {
      if (hasModerator) return { success: false, message: "Moderator already exists" };
      StorageService.save('huevify_moderator', data);
      setHasModerator(true);
      setCurrentModerator(data);
      // No sync needed for mod creation really
      return { success: true };
  };

  const loginArtistOrMod = (username: string, pass: string, type: 'ARTIST' | 'MODERATOR'): { success: boolean, message?: string } => {
      if (type === 'MODERATOR') {
          const mod = StorageService.load<ModeratorAccount | null>('huevify_moderator', null);
          if (mod && username === mod.username && pass === mod.password) {
              setCurrentModerator(mod);
              return { success: true };
          }
          return { success: false, message: "Invalid moderator credentials" };
      } else {
          const artist = artistAccounts.find(a => a.username === username && a.password === pass);
          if (!artist) return { success: false, message: "Invalid credentials" };
          if (artist.status === 'PENDING') return { success: false, message: "Account pending approval" };
          if (artist.status === 'REJECTED') return { success: false, message: "Account rejected" };
          
          setCurrentArtist(artist);
          return { success: true };
      }
  };

  const logoutArtistHub = () => {
      setCurrentArtist(null);
      setCurrentModerator(null);
  };

  const deleteRelease = (releaseId: string) => {
      const release = releaseRequests.find(r => r.id === releaseId);
      if (!release) return;

      if (release.status === 'LIVE' || release.status === 'APPROVED') {
          const updated = releaseRequests.map(r => r.id === releaseId ? { ...r, deletionRequested: true } : r);
          setReleaseRequests(updated);
          StorageService.save('huevify_release_requests', updated);
          notifySync('ARTIST_DATA_UPDATE');
          showNotification("Deletion requested. Pending moderator approval.", "info");
      } else {
          const updated = releaseRequests.filter(r => r.id !== releaseId);
          setReleaseRequests(updated);
          StorageService.save('huevify_release_requests', updated);
          notifySync('ARTIST_DATA_UPDATE');
          refreshLibrary(updated);
          
          // Cleanup Recently Played (Simple check)
          if (currentUser) {
              const newRecent = recentlyPlayed.filter(t => !t.id.includes(releaseId)); 
              setRecentlyPlayed(newRecent);
              StorageService.save(`huevify_recent_${currentUser.id}`, newRecent);
          }
          showNotification("Release deleted from drafts.", "success");
      }
  };

  const submitRelease = (releaseData: Omit<ReleaseRequest, 'id' | 'status' | 'artistId' | 'artistName' | 'submissionTime'>) => {
      if (!currentArtist) return;
      const newRelease: ReleaseRequest = {
          ...releaseData,
          id: `rel_${Date.now()}`,
          artistId: currentArtist.id,
          artistName: currentArtist.artistName,
          status: 'PENDING',
          submissionTime: new Date().toISOString()
      };
      const updated = [...releaseRequests, newRelease];
      setReleaseRequests(updated);
      StorageService.save('huevify_release_requests', updated);
      notifySync('ARTIST_DATA_UPDATE');
  };

  const submitProfileEdit = (editData: Omit<ProfileEditRequest, 'id' | 'status' | 'artistId' | 'artistName'>) => {
      if (!currentArtist) return;
      const newReq: ProfileEditRequest = {
          ...editData,
          id: `pe_${Date.now()}`,
          artistId: currentArtist.id,
          artistName: currentArtist.artistName,
          status: 'PENDING'
      };
      const updated = [...profileEditRequests, newReq];
      setProfileEditRequests(updated);
      StorageService.save('huevify_profile_requests', updated);
      notifySync('ARTIST_DATA_UPDATE');
  };

  const approveArtist = (id: string) => {
      const updated = artistAccounts.map(a => a.id === id ? { ...a, status: 'APPROVED' as const } : a);
      setArtistAccounts(updated);
      StorageService.save('huevify_artist_accounts', updated);
      notifySync('ARTIST_DATA_UPDATE');
  };
  const rejectArtist = (id: string) => {
      const updated = artistAccounts.map(a => a.id === id ? { ...a, status: 'REJECTED' as const } : a);
      setArtistAccounts(updated);
      StorageService.save('huevify_artist_accounts', updated);
      notifySync('ARTIST_DATA_UPDATE');
  };

  const approveRelease = (id: string) => {
      const existingReq = releaseRequests.find(r => r.id === id);
      if (!existingReq) return;

      if (existingReq.deletionRequested) {
          const updated = releaseRequests.filter(r => r.id !== id);
          setReleaseRequests(updated);
          StorageService.save('huevify_release_requests', updated);
          refreshLibrary(updated);
          notifySync('ARTIST_DATA_UPDATE');
          return;
      }

      const tracksWithHueqs = existingReq.tracks.map(t => {
          if (t.existingHueq) return t; 
          return { ...t, generatedHueq: generateHUEQ() }; 
      });

      const updatedRequests = releaseRequests.map(r => 
          r.id === id 
            ? { ...r, status: 'APPROVED' as const, tracks: tracksWithHueqs } 
            : r
      );
      
      setReleaseRequests(updatedRequests);
      StorageService.save('huevify_release_requests', updatedRequests);
      notifySync('ARTIST_DATA_UPDATE');
      
      const req = updatedRequests.find(r => r.id === id);
      if (req && new Date(req.releaseDate).getTime() <= Date.now()) {
          refreshLibrary(updatedRequests);
      }
  };
  const rejectRelease = (id: string) => {
      // If it's a deletion request rejection, we just cancel the deletion request
      const req = releaseRequests.find(r => r.id === id);
      if (req && req.deletionRequested) {
          const updated = releaseRequests.map(r => r.id === id ? { ...r, deletionRequested: false } : r);
          setReleaseRequests(updated);
          StorageService.save('huevify_release_requests', updated);
          showNotification("Deletion rejected. Release remains live.", "info");
      } else {
          // Normal rejection of a new release
          const updated = releaseRequests.map(r => r.id === id ? { ...r, status: 'REJECTED' as const, deletionRequested: false } : r);
          setReleaseRequests(updated);
          StorageService.save('huevify_release_requests', updated);
          showNotification("Release rejected.", "info");
      }
      notifySync('ARTIST_DATA_UPDATE');
  };

  const approveProfileEdit = (id: string) => {
      const req = profileEditRequests.find(r => r.id === id);
      if (!req) return;
      
      const updatedAccounts = artistAccounts.map(a => {
          if (a.id === req.artistId) {
              return {
                  ...a,
                  avatar: req.newAvatar || a.avatar,
                  bio: req.newBio || a.bio,
                  artistPick: req.newArtistPick || a.artistPick
              };
          }
          return a;
      });
      setArtistAccounts(updatedAccounts);
      StorageService.save('huevify_artist_accounts', updatedAccounts);

      const updatedReqs = profileEditRequests.map(r => r.id === id ? { ...r, status: 'APPROVED' as const } : r);
      setProfileEditRequests(updatedReqs);
      StorageService.save('huevify_profile_requests', updatedReqs);
      notifySync('ARTIST_DATA_UPDATE');
  };
  const rejectProfileEdit = (id: string) => {
      const updatedReqs = profileEditRequests.map(r => r.id === id ? { ...r, status: 'REJECTED' as const } : r);
      setProfileEditRequests(updatedReqs);
      StorageService.save('huevify_profile_requests', updatedReqs);
      notifySync('ARTIST_DATA_UPDATE');
  };
  
  const getTrackByHueq = (hueq: string): Track | undefined => {
      return tracks.find(t => t.hueq === hueq);
  };

  // --- Existing Logic (Daily Chart, etc.) ---
  useEffect(() => {
    if (tracks.length === 0) return;

    const processDailyChart = () => {
        const now = new Date();
        const lastUpdateStr = StorageService.load<string | null>('huevify_last_chart_update', null);
        const playSnapshot = StorageService.load<Record<string, number>>('huevify_chart_snapshot', {});

        let threshold = new Date();
        threshold.setUTCHours(18, 0, 0, 0); 
        
        if (now.getTime() < threshold.getTime()) {
            threshold.setDate(threshold.getDate() - 1);
        }

        const lastUpdateDate = lastUpdateStr ? new Date(lastUpdateStr) : new Date(0);

        if (lastUpdateDate.getTime() < threshold.getTime()) {
            const currentPlaysMap = tracks.reduce((acc, t) => ({...acc, [t.id]: t.plays}), {} as Record<string, number>);
            
            const chartData: DailyChartTrack[] = tracks.map(t => {
                const prevPlays = playSnapshot[t.id] || 0;
                const dailyDelta = Math.max(0, t.plays - prevPlays);
                return { ...t, dailyPlays: dailyDelta };
            });

            const sorted = chartData.sort((a, b) => b.dailyPlays - a.dailyPlays).slice(0, 25);
            setDailyChart(sorted);
            StorageService.save('huevify_daily_chart', sorted);

            StorageService.save('huevify_chart_snapshot', currentPlaysMap);
            StorageService.save('huevify_last_chart_update', now.toISOString());
        } else {
            const savedChart = StorageService.load<DailyChartTrack[]>('huevify_daily_chart', []);
            setDailyChart(savedChart);
        }
    };

    processDailyChart();
    const interval = setInterval(processDailyChart, 60000);
    return () => clearInterval(interval);

  }, [tracks]);

  // --- Album Cover Logic ---
  const getAlbumCover = (albumId: string): string => {
      const album = albums.find(a => a.id === albumId);
      if (!album || !album.covers || album.covers.length === 0) return "";
      // albumCoverIndexes is loaded from user-specific settings
      const index = appSettings.albumCoverIndexes[albumId] || 0;
      return album.covers[index] || album.covers[0];
  };

  const getTrackCover = (track: Track): string => {
      // Find the album associated with this track to check for a preferred cover
      const album = albums.find(a => a.title === track.album);
      if (album) {
          return getAlbumCover(album.id);
      }
      return track.cover;
  };

  const changeAlbumCover = (albumId: string, index: number) => {
      updateSettings({
          albumCoverIndexes: {
              ...appSettings.albumCoverIndexes,
              [albumId]: index
          }
      });
  };

  // --- Settings Injection Effect ---
  useEffect(() => {
    const color = appSettings.accentColor;
    const styleId = 'huevify-theme-override';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
        .text-primary { color: ${color} !important; }
        .bg-primary { background-color: ${color} !important; }
        .border-primary { border-color: ${color} !important; }
        .accent-primary { accent-color: ${color} !important; }
        .group:hover .group-hover\\:text-primary { color: ${color} !important; }
        .group:hover .group-hover\\:bg-primary { background-color: ${color} !important; }
        .selection\\:bg-primary::selection { background-color: ${color} !important; }
        .range-slider::-webkit-slider-thumb:hover { background-color: ${color} !important; }
    `;
  }, [appSettings.accentColor]);

  // --- Playlist Loading & Account Isolation ---
  useEffect(() => {
    let allPlaylists = StorageService.load<Playlist[]>('huevify_playlists', []);
    
    // Create unique Liked playlist per user
    if (currentUser) {
        const likedId = `liked_${currentUser.id}`;
        // Only create if it doesn't exist AND we are filtering by exact ID later
        if (!allPlaylists.find(p => p.id === likedId)) {
            const likedPl: Playlist = { 
                id: likedId, 
                name: 'Liked Songs', 
                tracks: [], 
                isSystem: true, 
                description: 'Your favorite tracks',
                ownerId: currentUser.id
            };
            allPlaylists = [likedPl, ...allPlaylists];
            StorageService.save('huevify_playlists', allPlaylists);
        }
    }
    setPlaylists(allPlaylists);
  }, [currentUser]); 

  // --- Settings Methods ---
  const updateSettings = (newSettings: Partial<AppSettings>) => {
      if (!currentUser) return;
      setAppSettingsState(prev => {
          const updated = { ...prev, ...newSettings };
          // Save to user-specific key
          StorageService.save(`huevify_settings_${currentUser.id}`, updated);
          notifySync('SETTINGS_UPDATE');
          return updated;
      });
  };

  const updateUserProfile = (data: Partial<User>): { success: boolean; message?: string } => {
      if (!currentUser) return { success: false, message: "Not logged in" };
      const users = StorageService.load<User[]>('huevify_users', []);
      if (data.username && data.username !== currentUser.username) {
          if (users.some(u => u.username === data.username)) {
              return { success: false, message: "Username already taken" };
          }
      }
      const updatedUser = { ...currentUser, ...data };
      const updatedUsersList = users.map(u => u.id === currentUser.id ? updatedUser : u);
      StorageService.save('huevify_users', updatedUsersList);
      StorageService.save('huevify_current_user', updatedUser);
      setCurrentUser(updatedUser);
      if (data.displayName || data.avatar) {
          const allPlaylists = StorageService.load<Playlist[]>('huevify_playlists', []);
          const updatedPlaylists = allPlaylists.map(p => {
              if (p.ownerId === currentUser.id) {
                  return { 
                      ...p, 
                      creatorName: data.displayName || p.creatorName,
                      creatorAvatar: data.avatar || p.creatorAvatar
                  };
              }
              return p;
          });
          StorageService.save('huevify_playlists', updatedPlaylists);
          setPlaylists(updatedPlaylists);
          notifySync('PLAYLISTS_UPDATE');
      }
      return { success: true };
  };

  // --- Auth Methods ---
  const login = (username: string, pass: string): boolean => {
    const users = StorageService.load<User[]>('huevify_users', []);
    const user = users.find(u => u.username === username && u.password === pass);
    if (user) {
        setCurrentUser(user);
        StorageService.save('huevify_current_user', user);
        return true;
    }
    return false;
  };

  const register = (newUser: Omit<User, 'id'>): boolean => {
      const users = StorageService.load<User[]>('huevify_users', []);
      if (users.some(u => u.username === newUser.username)) {
          return false; // User exists
      }
      const user: User = { ...newUser, id: `user_${Date.now()}` };
      const updatedUsers = [...users, user];
      StorageService.save('huevify_users', updatedUsers);
      setCurrentUser(user);
      StorageService.save('huevify_current_user', user);
      return true;
  };

  const logout = () => {
      setCurrentUser(null);
      StorageService.save('huevify_current_user', null);
      setProfileModalOpen(false);
      setIsPlaying(false);
      audioRef.current.pause();
      setCurrentTrack(null);
      setViewInternal({ type: 'HOME' });
  };

  // --- Logic for Recs ---
  useEffect(() => {
    if (tracks.length === 0 || !currentUser) return;
    const genreScores: Record<string, number> = {};
    // Use dynamic liked ID
    const likedId = `liked_${currentUser.id}`;
    const likedPlaylist = playlists.find(p => p.id === likedId);
    const likedIds = likedPlaylist ? likedPlaylist.tracks : [];
    
    tracks.forEach(t => {
      let score = 0;
      if (likedIds.includes(t.id)) score += 50;
      if (t.plays > 0) score += Math.log(t.plays) * 2;
      if (score > 0) {
        genreScores[t.genre] = (genreScores[t.genre] || 0) + score;
      }
    });
    const topGenres = Object.entries(genreScores).sort(([, a], [, b]) => b - a).slice(0, 3).map(([g]) => g);
    const targetGenres = topGenres.length > 0 ? topGenres : tracks.map(t => t.genre);
    const candidates = tracks.filter(t => targetGenres.includes(t.genre) && !likedIds.includes(t.id));
    // Filter explicit if needed
    const filteredCandidates = appSettings.allowExplicitContent ? candidates : candidates.filter(t => !t.explicit);
    const shuffled = [...filteredCandidates].sort(() => 0.5 - Math.random()).slice(0, 6);
    setRecommendations(shuffled);
  }, [tracks, playlists, currentUser, appSettings.allowExplicitContent]);

  useEffect(() => {
    if (tracks.length > 0) {
      const playCounts = tracks.reduce((acc, t) => ({ ...acc, [t.id]: t.plays }), {});
      StorageService.save('huevify_plays', playCounts);
    }
  }, [tracks]);

  useEffect(() => {
    if(currentUser) {
        StorageService.save(`huevify_liked_albums_${currentUser.id}`, likedAlbumIds);
    }
  }, [likedAlbumIds, currentUser]);
  
  useEffect(() => {
    if(currentUser) {
        StorageService.save(`huevify_followed_artists_${currentUser.id}`, followedArtists);
    }
  }, [followedArtists, currentUser]);

  // --- Navigation ---
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

  const getArtistStats = (artistName: string): ArtistStats => {
    const artistPlayMap: Record<string, number> = {};
    tracks.forEach(t => { 
        const primary = t.artist;
        if (primary) artistPlayMap[primary] = (artistPlayMap[primary] || 0) + t.plays;
        
        if (t.mainArtists) {
            t.mainArtists.forEach(ma => {
                artistPlayMap[ma] = (artistPlayMap[ma] || 0) + t.plays;
            });
        }
    });
    
    const sortedArtists = Object.entries(artistPlayMap).sort(([, a], [, b]) => b - a);
    const rankIndex = sortedArtists.findIndex(([name]) => name === artistName);
    const totalPlays = artistPlayMap[artistName] || 0;
    
    return { monthlyPlays: totalPlays, globalRank: rankIndex === -1 ? 999 : rankIndex + 1 };
  };

  const toggleFollowArtist = (artistName: string) => {
    setFollowedArtists(prev => prev.includes(artistName) ? prev.filter(a => a !== artistName) : [...prev, artistName]);
  };
  const isArtistFollowed = (artistName: string) => followedArtists.includes(artistName);

  // --- Player Logic ---
  useEffect(() => {
    cumulativeTimeRef.current = 0;
    lastTimeRef.current = 0;
    setHasCountedListen(false);
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    const handleTimeUpdate = () => {
      const now = audio.currentTime;
      setProgress(now);
      const diff = now - lastTimeRef.current;
      
      // Accumulate listen time if playing normally (not scrubbing fast)
      if (diff > 0 && diff < 1.5) {
          cumulativeTimeRef.current += diff;
      }
      lastTimeRef.current = now;

      // Count play ONLY if active listen > 30s AND hasn't counted for this specific track instance yet
      if (cumulativeTimeRef.current > 30 && !hasCountedListen && currentTrack) {
          handleListenCount(currentTrack);
      }
    };
    const handleEnded = () => {
      if (playMode === PlayMode.ONE) { 
          audio.currentTime = 0; 
          // Logic: If user repeats ONE, it counts as a new listen for the next loop
          cumulativeTimeRef.current = 0; 
          setHasCountedListen(false);
          audio.play(); 
      }
      else if (appSettings.autoPlay) { nextTrack(); } 
      else { setIsPlaying(false); audioRef.current.pause(); }
    };
    const handleLoadedMetadata = () => setDuration(audio.duration);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [currentTrack, hasCountedListen, playMode, tracks, isShuffle, appSettings.autoPlay]);

  const handleListenCount = (track: Track) => {
    const addedPlays = Math.floor(100 + Math.random() * 9900); 
    setTracks(prev => {
        const updated = prev.map(t => t.id === track.id ? { ...t, plays: t.plays + addedPlays } : t);
        const playCounts = updated.reduce((acc, t) => ({ ...acc, [t.id]: t.plays }), {});
        StorageService.save('huevify_plays', playCounts);
        notifySync('TRACKS_UPDATE');
        return updated;
    });
    setHasCountedListen(true);
  };

  const playTrack = (track: Track) => {
    // 1. Check if track is Explicit and allowed
    if (track.explicit && !appSettings.allowExplicitContent) {
        showNotification("Content not available. Turn on 'Allow Explicit Content' in settings.", "error");
        return;
    }

    // 2. Check if track is actually live (Deleted tracks check)
    const isLive = tracks.find(t => t.id === track.id);
    if (!isLive) {
        showNotification("This track is no longer available.", "error");
        return;
    }

    // Save to User Specific Recent
    if (currentUser) {
        setRecentlyPlayed(prev => {
            const filtered = prev.filter(t => t.id !== track.id);
            const newHistory = [track, ...filtered].slice(0, 10);
            StorageService.save(`huevify_recent_${currentUser.id}`, newHistory);
            return newHistory;
        });
    }
    
    if (currentTrack?.id === track.id) { togglePlay(); return; }
    
    // New Track Logic
    setCurrentTrack(track);
    setHasCountedListen(false); // Reset listen count for new track
    cumulativeTimeRef.current = 0; // Reset time accumulator
    
    audioRef.current.src = track.url;
    audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error("Audio play failed", e));
  };

  const togglePlay = () => {
    if (audioRef.current.paused) { audioRef.current.play(); setIsPlaying(true); }
    else { audioRef.current.pause(); setIsPlaying(false); }
  };
  const setVolume = (vol: number) => { setVolumeState(vol); audioRef.current.volume = vol; };
  const seek = (time: number) => { audioRef.current.currentTime = time; lastTimeRef.current = time; setProgress(time); };
  
  const getQueue = (): Track[] => {
    if (view.type === 'PLAYLIST' && (view as any).id === 'history') {
        if (!appSettings.allowExplicitContent) {
            return recentlyPlayed.filter(t => !t.explicit);
        }
        return recentlyPlayed;
    }
    if (!appSettings.allowExplicitContent) {
        return tracks.filter(t => !t.explicit);
    }
    return tracks; 
  };
  const nextTrack = () => {
    const queue = getQueue();
    if (isShuffle) { playTrack(queue[Math.floor(Math.random() * queue.length)]); return; }
    const idx = queue.findIndex(t => t.id === currentTrack?.id);
    if (idx !== -1 && idx < queue.length - 1) playTrack(queue[idx + 1]);
    else if (playMode === PlayMode.CONTEXT) playTrack(queue[0]);
    else { setIsPlaying(false); audioRef.current.pause(); audioRef.current.currentTime = 0; }
  };
  const prevTrack = () => {
    if (audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; lastTimeRef.current = 0; return; }
    const queue = getQueue();
    const idx = queue.findIndex(t => t.id === currentTrack?.id);
    if (idx > 0) playTrack(queue[idx - 1]); else playTrack(queue[queue.length - 1]);
  };
  const toggleRepeat = () => {
    if (playMode === PlayMode.OFF) setPlayMode(PlayMode.CONTEXT);
    else if (playMode === PlayMode.CONTEXT) setPlayMode(PlayMode.ONE);
    else setPlayMode(PlayMode.OFF);
  };
  const toggleShuffle = () => setIsShuffle(!isShuffle);

  const syncPlaylists = (newGlobalPlaylists: Playlist[]) => {
      StorageService.save('huevify_playlists', newGlobalPlaylists);
      setPlaylists(newGlobalPlaylists);
      notifySync('PLAYLISTS_UPDATE');
  };
  const createPlaylist = (name: string, description?: string, cover?: string, isPublic: boolean = false) => {
    if (!currentUser) return;
    const newPl: Playlist = { id: `pl_${Date.now()}`, name, description: description || "", customCover: cover, tracks: [], ownerId: currentUser.id, creatorName: currentUser.displayName, creatorAvatar: currentUser.avatar, isPublic: isPublic, savedBy: [] };
    const all = [...playlists]; 
    syncPlaylists([...all, newPl]);
  };
  const editPlaylist = (id: string, name: string, description?: string, cover?: string, isPublic?: boolean) => {
    const all = [...playlists];
    const updated = all.map(p => { if (p.id === id) { return { ...p, name, description, customCover: cover, isPublic: isPublic !== undefined ? isPublic : p.isPublic }; } return p; });
    syncPlaylists(updated);
  };
  const openDeleteModal = (id: string) => { setPlaylistToDelete(id); setIsDeleteModalOpen(true); };
  const closeDeleteModal = () => { setIsDeleteModalOpen(false); setPlaylistToDelete(null); };
  const confirmDeletePlaylist = () => { if (!playlistToDelete) return; const id = playlistToDelete; if (view.type === 'PLAYLIST' && (view as any).id === id) setViewInternal({ type: 'LIBRARY' }); const all = [...playlists]; const updated = all.filter(p => p.id !== id); syncPlaylists(updated); closeDeleteModal(); };
  const deletePlaylist = (id: string) => openDeleteModal(id);
  const addToPlaylist = (playlistId: string, trackId: string) => { 
      const updated = playlists.map(p => { 
          if (p.id === playlistId && !p.tracks.includes(trackId)) {
              return { ...p, tracks: [...p.tracks, trackId] }; 
          }
          return p; 
      }); 
      syncPlaylists(updated); 
  };
  const removeFromPlaylist = (playlistId: string, trackId: string) => { 
      const updated = playlists.map(p => { 
          if (p.id === playlistId) {
              return { ...p, tracks: p.tracks.filter(id => id !== trackId) }; 
          }
          return p; 
      }); 
      syncPlaylists(updated); 
  };
  const togglePlaylistSave = (playlistId: string) => { if (!currentUser) return; const updated = playlists.map(p => { if (p.id === playlistId) { const saved = p.savedBy || []; const isSaved = saved.includes(currentUser.id); return { ...p, savedBy: isSaved ? saved.filter(id => id !== currentUser.id) : [...saved, currentUser.id] }; } return p; }); syncPlaylists(updated); };
  
  // Account Isolated Likes
  const toggleLike = (trackId: string) => { 
      if (!currentUser) return;
      const likedId = `liked_${currentUser.id}`;
      const likedPl = playlists.find(p => p.id === likedId); 
      if (!likedPl) return; 
      if (likedPl.tracks.includes(trackId)) removeFromPlaylist(likedId, trackId); 
      else addToPlaylist(likedId, trackId); 
  };
  const isLiked = (trackId: string) => { 
      if (!currentUser) return false;
      const likedId = `liked_${currentUser.id}`;
      const likedPl = playlists.find(p => p.id === likedId); 
      return likedPl ? likedPl.tracks.includes(trackId) : false; 
  };
  
  const toggleAlbumLike = (albumId: string) => { setLikedAlbumIds(prev => prev.includes(albumId) ? prev.filter(id => id !== albumId) : [...prev, albumId]); };
  const isAlbumLiked = (albumId: string) => likedAlbumIds.includes(albumId);
  const openAddToPlaylist = (trackId: string) => { setTrackIdToAdd(trackId); setAddToPlaylistOpen(true); };
  const closeAddToPlaylist = () => { setAddToPlaylistOpen(false); setTrackIdToAdd(null); };

  if (!isInitialized && currentUser) {
      return (
          <div className="flex h-screen w-full bg-black items-center justify-center flex-col gap-4">
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center animate-pulse">
                  <div className="text-4xl font-bold text-primary">H</div>
              </div>
              <div className="text-secondary text-sm animate-pulse">Loading Library...</div>
          </div>
      );
  }

  return (
    <StoreContext.Provider value={{
      currentUser, login, register, logout, updateUserProfile,
      appSettings, updateSettings, dailyChart,
      getAlbumCover, changeAlbumCover, getTrackCover,
      isArtistHubOpen, setArtistHubOpen, currentArtist, currentModerator, artistAccounts,
      registerArtist, registerModerator, loginArtistOrMod, logoutArtistHub, submitRelease, submitProfileEdit, deleteRelease,
      approveArtist, rejectArtist, approveRelease, rejectRelease, approveProfileEdit, rejectProfileEdit,
      releaseRequests, profileEditRequests, hasModerator, existingArtists, getTrackByHueq,
      tracks, albums, playlists, recommendations, recentlyPlayed, followedArtists, currentTrack, isPlaying, playMode, isShuffle, volume, progress, duration, view,
      isCreatePlaylistOpen, setCreatePlaylistOpen, playlistIdToEdit, setPlaylistIdToEdit,
      isMobilePlayerOpen, setMobilePlayerOpen,
      isAddToPlaylistOpen, trackIdToAdd, openAddToPlaylist, closeAddToPlaylist,
      isDeleteModalOpen, playlistToDelete, openDeleteModal, closeDeleteModal, confirmDeletePlaylist,
      isProfileModalOpen, setProfileModalOpen, likedPlaylistId, notifications, showNotification, dismissNotification,
      setView, goToArtist, getArtistStats, toggleFollowArtist, isArtistFollowed, goBack, playTrack, togglePlay, nextTrack, prevTrack, seek, setVolume, toggleRepeat, toggleShuffle,
      createPlaylist, editPlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist, togglePlaylistSave, toggleLike, isLiked,
      toggleAlbumLike, isAlbumLiked
    }}>
      {children}
    </StoreContext.Provider>
  );
};