import React, { useState, useRef, useEffect } from 'react';
import { useStore, generateHUEQ } from '../context/StoreContext.tsx';
import { compressImage } from '../utils/imageCompressor.ts';
import { 
  X, Mic2, Shield, User, UploadCloud, Calendar, FileAudio, 
  CheckCircle, XCircle, Clock, MoreVertical, Image, Plus,
  Edit, ArrowLeft, Camera, LogOut, ChevronDown, Trash2, ListMusic, Check, Search, Play, BarChart2, Globe, Database, Key, Settings, ChevronUp, Bookmark, FileText, Save
} from './Icons.tsx';
import { DistributionTrack, ReleaseType, ReleaseRequest, ReleaseDraft } from '../types.ts';
import { SupabaseService, isSupabaseConfigured } from '../services/supabase.ts';
import { StorageService } from '../services/storage.ts';

type HubView = 'AUTH' | 'ARTIST_DASH' | 'MOD_DASH' | 'DISTRIBUTION' | 'PROFILE_EDIT' | 'ARTIST_PICK' | 'MOD_CREDENTIALS' | 'MOD_ALL_RELEASES' | 'MOD_SETTINGS' | 'MOD_ALL_TRACKS';

const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
};

export const ArtistHub = () => {
  const { 
    isArtistHubOpen, setArtistHubOpen, currentArtist, currentModerator, 
    loginArtistOrMod, registerArtist, registerModerator, logoutArtistHub, artistAccounts,
    releaseRequests, profileEditRequests, approveArtist, rejectArtist,
    approveRelease, rejectRelease, approveProfileEdit, rejectProfileEdit,
    submitRelease, updateReleaseRequest, getArtistStats, submitProfileEdit, hasModerator, existingArtists,
    deleteRelease, getTrackByHueq, tracks, albums, playlists, showNotification, deleteArtistAccount, getTrackCover, getAlbumCover,
    changeArtistPassword, changeModeratorPassword, deleteLegacyTrack, t
  } = useStore();

  const [view, setView] = useState<HubView>('AUTH');
  
  // Auth State
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [role, setRole] = useState<'ARTIST' | 'MODERATOR'>('ARTIST');
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  // Artist Registration Logic
  const [artistNameSelection, setArtistNameSelection] = useState("");
  const [isCreatingNewArtist, setIsCreatingNewArtist] = useState(false);
  const [newArtistAlias, setNewArtistAlias] = useState("");
  
  const [message, setMessage] = useState("");

  // Distribution State
  const [distStep, setDistStep] = useState(1);
  const [distTitle, setDistTitle] = useState("");
  const [distArtistName, setDistArtistName] = useState(""); // For Mods to override
  const [distType, setDistType] = useState<ReleaseType>('Single');
  const [distGenre, setDistGenre] = useState("Pop");
  const [distLabel, setDistLabel] = useState("");
  const [distCovers, setDistCovers] = useState<string[]>([]);
  const [distMainArtists, setDistMainArtists] = useState<string[]>([]);
  const [distMainArtistInput, setDistMainArtistInput] = useState("");
  const [distTracks, setDistTracks] = useState<DistributionTrack[]>([]);

  // Drafts State
  const [drafts, setDrafts] = useState<ReleaseDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  
  // Editing Mode
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Track Tag Inputs (Step 2)
  const [trackArtistInputs, setTrackArtistInputs] = useState<Record<number, string>>({});

  const [distDate, setDistDate] = useState("");
  const [distTime, setDistTime] = useState("00:00");
  const [distMsg, setDistMsg] = useState("");

  // Edit Profile State
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editNewPassword, setEditNewPassword] = useState("");

  // Mod Settings State
  const [modNewPassword, setModNewPassword] = useState("");

  // Artist Pick State
  const [pickSearch, setPickSearch] = useState("");

  // Release Detail Modal State
  const [selectedRelease, setSelectedRelease] = useState<ReleaseRequest | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Initialize view based on login state
  useEffect(() => {
      if (isArtistHubOpen) {
          if (currentArtist) {
              setView('ARTIST_DASH');
              setEditBio(currentArtist.bio || "");
              setEditAvatar(currentArtist.avatar || "");
              setEditNewPassword("");
          }
          else if (currentModerator) {
              setView('MOD_DASH');
              setModNewPassword("");
          }
          else {
              setView('AUTH');
              setRole('ARTIST');
              setMessage("");
          }
      }
  }, [isArtistHubOpen, currentArtist, currentModerator]);

  // Drafts Management Logic
  const getDraftsKey = () => {
      if (currentArtist) return `huevify_drafts_${currentArtist.id}`;
      if (currentModerator) return `huevify_drafts_mod`;
      return 'huevify_drafts_general';
  };

  const loadDrafts = async () => {
      const key = getDraftsKey();
      const localLoaded = StorageService.load<ReleaseDraft[]>(key, []);
      const localArr = Array.isArray(localLoaded) ? localLoaded : [];
      setDrafts(localArr);

      // Also sync from cloud if configured
      if (isSupabaseConfigured()) {
          try {
              const artistId = currentArtist?.id || (currentModerator ? 'mod' : undefined);
              const remoteDrafts = await SupabaseService.fetchDrafts(artistId);
              if (remoteDrafts && remoteDrafts.length > 0) {
                  const mergedMap = new Map<string, ReleaseDraft>();
                  localArr.forEach(d => mergedMap.set(d.id, d));
                  remoteDrafts.forEach(rd => {
                      const existing = mergedMap.get(rd.id);
                      if (!existing || new Date(rd.lastSaved).getTime() >= new Date(existing.lastSaved).getTime()) {
                          mergedMap.set(rd.id, rd);
                      }
                  });
                  const merged = Array.from(mergedMap.values()).sort((a, b) => new Date(b.lastSaved).getTime() - new Date(a.lastSaved).getTime());
                  setDrafts(merged);
                  StorageService.save(key, merged);
              }
          } catch (e) {
              console.warn("Cloud drafts sync error:", e);
          }
      }
  };

  useEffect(() => {
      if (isArtistHubOpen) {
          loadDrafts();
      }
  }, [isArtistHubOpen, currentArtist, currentModerator]);

  const buildCurrentDraft = (idOverride?: string): ReleaseDraft => {
      const id = idOverride || activeDraftId || `draft_${Date.now()}`;
      return {
          id,
          artistId: currentArtist?.id || (currentModerator ? 'mod' : 'unknown'),
          artistName: distArtistName || currentArtist?.artistName || 'Various Artists',
          title: distTitle,
          type: distType,
          genre: distGenre,
          label: distLabel,
          covers: distCovers,
          additionalMainArtists: distMainArtists,
          tracks: distTracks,
          releaseDate: distDate,
          releaseTime: distTime,
          releaseMessage: distMsg,
          lastSaved: new Date().toISOString(),
          step: distStep,
          isEditingOriginalId: isEditing ? editingId : null,
      };
  };

  const saveCurrentDraft = (notify: boolean = true) => {
      // If form is completely blank, don't create an empty draft
      if (!distTitle.trim() && distTracks.length === 0 && distCovers.length === 0 && !distArtistName.trim()) {
          if (notify) showNotification("Заполните хотя бы одно поле для сохранения черновика.", "info");
          return;
      }

      const draft = buildCurrentDraft();
      setActiveDraftId(draft.id);

      const key = getDraftsKey();
      const existing = StorageService.load<ReleaseDraft[]>(key, []);
      const updated = [draft, ...existing.filter(d => d.id !== draft.id)];
      StorageService.save(key, updated);
      setDrafts(updated);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      // Save to cloud in background
      if (isSupabaseConfigured()) {
          SupabaseService.saveDraft(draft).catch(err => {
              console.warn("Cloud save draft error:", err);
          });
      }

      if (notify) {
          showNotification(t('draftSaved'), "success");
      }
  };

  const handleResumeDraft = (draft: ReleaseDraft) => {
      setDistTitle(draft.title || "");
      setDistArtistName(draft.artistName || "");
      setDistType(draft.type || 'Single');
      setDistGenre(draft.genre || 'Pop');
      setDistLabel(draft.label || "");
      setDistCovers(draft.covers || []);
      setDistMainArtists(draft.additionalMainArtists || []);
      setDistTracks(draft.tracks || []);
      setDistDate(draft.releaseDate || "");
      setDistTime(draft.releaseTime || "00:00");
      setDistMsg(draft.releaseMessage || "");
      setDistStep(draft.step || 1);
      setIsEditing(Boolean(draft.isEditingOriginalId));
      setEditingId(draft.isEditingOriginalId || null);
      setActiveDraftId(draft.id);
      setLastSavedTime(new Date(draft.lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setView('DISTRIBUTION');
      showNotification(t('resume'), "info");
  };

  const handleDeleteDraft = (draftId: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const key = getDraftsKey();
      const existing = StorageService.load<ReleaseDraft[]>(key, []);
      const updated = existing.filter(d => d.id !== draftId);
      StorageService.save(key, updated);
      setDrafts(updated);
      if (activeDraftId === draftId) {
          setActiveDraftId(null);
      }
      if (isSupabaseConfigured()) {
          SupabaseService.deleteDraft(draftId).catch(err => {
              console.warn("Cloud delete draft error:", err);
          });
      }
      showNotification(t('draftDeleted'), "info");
  };

  // Auto-Save Effect (Debounced 1.5s when in DISTRIBUTION view)
  useEffect(() => {
      if (view !== 'DISTRIBUTION') return;
      if (!distTitle.trim() && distTracks.length === 0 && distCovers.length === 0 && !distArtistName.trim()) {
          return;
      }

      const timer = setTimeout(() => {
          saveCurrentDraft(false);
      }, 1500);

      return () => clearTimeout(timer);
  }, [
      view, distStep, distTitle, distArtistName, distType, distGenre, distLabel,
      distCovers, distMainArtists, distTracks, distDate, distTime, distMsg, isEditing, editingId
  ]);

  // Handle beforeunload and page visibility changes to flush draft save immediately
  useEffect(() => {
      const handleBeforeUnload = () => {
          if (view === 'DISTRIBUTION' && (distTitle || distTracks.length > 0 || distCovers.length > 0)) {
              const draft = buildCurrentDraft();
              const key = getDraftsKey();
              const existing = StorageService.load<ReleaseDraft[]>(key, []);
              const updated = [draft, ...existing.filter(d => d.id !== draft.id)];
              StorageService.save(key, updated);
              if (isSupabaseConfigured()) {
                  SupabaseService.saveDraft(draft).catch(() => {});
              }
          }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [distTitle, distTracks, distCovers, distStep, distDate, distTime, distMsg, distGenre, distType, distLabel, distMainArtists, view, activeDraftId]);

  if (!isArtistHubOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setMessage("");
      const res = await loginArtistOrMod(username, password, role);
      if (res.success) {
          if (role === 'ARTIST') {
              setView('ARTIST_DASH');
          }
          else setView('MOD_DASH');
          showNotification(t('welcomeBack'), "success");
      } else {
          setMessage(res.message || t('invalidCreds'));
      }
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (role === 'MODERATOR') {
          if (hasModerator) {
              setMessage(t('modExists'));
              return;
          }
          const res = await registerModerator({ username, password });
          if (res.success) {
              setMessage("Moderator registered! Please login.");
              setAuthMode('LOGIN');
          } else {
              setMessage(res.message || "Error registering moderator");
          }
          return;
      }
      
      // Artist Registration
      const finalArtistName = isCreatingNewArtist ? newArtistAlias : artistNameSelection;

      if (!finalArtistName) {
          setMessage(t('fillAll'));
          return;
      }

      const res = await registerArtist({
          artistName: finalArtistName, 
          username, 
          password,
          artistPick: undefined
      });
      
      if (res.success) {
          setMessage(t('regSent'));
          setAuthMode('LOGIN');
      } else {
          setMessage(res.message || "Error registering");
      }
  };

  // --- Distribution Handlers ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          showNotification("Подготовка и загрузка аудиофайла...", "info");
          // Convert to Base64 for instant preview & fallback
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64Audio = reader.result as string;
              
              // Create temp audio element to get duration
              const audio = new Audio(base64Audio);
              audio.onloadedmetadata = async () => {
                  let finalUrl = base64Audio;
                  if (isSupabaseConfigured()) {
                      try {
                          const storageUrl = await SupabaseService.uploadMedia(file, 'tracks', file.name);
                          if (storageUrl) {
                              finalUrl = storageUrl;
                              showNotification("Аудиофайл загружен в облачное хранилище!", "success");
                          }
                      } catch (err) {
                          console.warn("Storage audio upload fallback:", err);
                      }
                  }

                  const newTrack: DistributionTrack = {
                      title: file.name.replace(/\.[^/.]+$/, ""),
                      explicit: false,
                      mainArtists: [],
                      genre: distGenre, // Default to release genre
                      duration: audio.duration,
                      fileUrl: finalUrl,
                      generatedHueq: generateHUEQ()
                  };
                  setDistTracks(prev => [...prev, newTrack]);
              };
          };
          reader.readAsDataURL(file);
      }
  };

  const updateTrack = (idx: number, field: keyof DistributionTrack, val: any) => {
      setDistTracks(prev => {
          const newTracks = [...prev];
          newTracks[idx] = { ...newTracks[idx], [field]: val };
          return newTracks;
      });
  };

  const moveTrack = (index: number, direction: 'up' | 'down') => {
      if (direction === 'up' && index > 0) {
          setDistTracks(prev => {
              const newTracks = [...prev];
              [newTracks[index], newTracks[index - 1]] = [newTracks[index - 1], newTracks[index]];
              return newTracks;
          });
      } else if (direction === 'down' && index < distTracks.length - 1) {
          setDistTracks(prev => {
              const newTracks = [...prev];
              [newTracks[index], newTracks[index + 1]] = [newTracks[index + 1], newTracks[index]];
              return newTracks;
          });
      }
  };

  // Track Artist Tag Handlers
  const addTrackArtist = (trackIdx: number) => {
      const name = trackArtistInputs[trackIdx];
      if (!name) return;
      
      setDistTracks(prev => {
          const newTracks = [...prev];
          const currentArtists = newTracks[trackIdx].mainArtists || [];
          newTracks[trackIdx] = { 
              ...newTracks[trackIdx], 
              mainArtists: [...currentArtists, name] 
          };
          return newTracks;
      });
      
      setTrackArtistInputs(prev => ({ ...prev, [trackIdx]: "" }));
  };

  const removeTrackArtist = (trackIdx: number, artistToRemove: string) => {
      setDistTracks(prev => {
          const newTracks = [...prev];
          const currentArtists = newTracks[trackIdx].mainArtists || [];
          newTracks[trackIdx] = { 
              ...newTracks[trackIdx], 
              mainArtists: currentArtists.filter(a => a !== artistToRemove) 
          };
          return newTracks;
      });
  };

  const handleHueqBlur = (idx: number, hueq: string) => {
      if (!hueq) return;
      const existing = getTrackByHueq(hueq);
      
      if (existing) {
          setDistTracks(prev => {
              const newTracks = [...prev];
              newTracks[idx] = {
                  ...newTracks[idx],
                  title: existing.title,
                  explicit: existing.explicit || false,
                  feat: existing.feat || "",
                  existingHueq: hueq,
                  fileUrl: existing.url,
                  duration: existing.duration,
                  genre: existing.genre, // Sync genre
                  mainArtists: existing.mainArtists || []
              };
              return newTracks;
          });
          showNotification(`HUEQ Found! Track details auto-filled: ${existing.title}`, "success");
      } else {
          updateTrack(idx, 'existingHueq', hueq);
      }
  };

  const handleNextStep = () => {
      if (distStep === 1) {
          if (!distTitle || !distType || !distGenre || distCovers.length === 0) {
              showNotification(t('completeFields'), "error");
              return;
          }
          if (currentModerator && !distArtistName) {
              showNotification(t('artistNameReq'), "error");
              return;
          }
      }
      if (distStep === 2) {
          if (distTracks.length === 0) {
              showNotification(t('addOneTrack'), "error");
              return;
          }
      }
      setDistStep(prev => prev + 1);
  };

  const handleSubmitRelease = async () => {
      if (!distDate || !distTime) {
          showNotification(t('specifyDate'), "error");
          return;
      }
      
      const dateTime = new Date(`${distDate}T${distTime}:00+03:00`);
      
      // Determine Artist Identity
      const overrideArtist = currentModerator ? { 
          artistId: isEditing && editingId && !editingId.startsWith('a') ? (releaseRequests.find(r => r.id === editingId)?.artistId || `va_${Date.now()}`) : `va_${Date.now()}`,
          artistName: distArtistName || "Various Artists" 
      } : undefined;

      // Ensure any tracks or covers still in data: format are uploaded to Supabase Storage if connected
      let finalTracks = distTracks;
      let finalCovers = distCovers;

      if (isSupabaseConfigured()) {
          finalTracks = await Promise.all(distTracks.map(async (t) => {
              if (t.fileUrl && t.fileUrl.startsWith('data:')) {
                  try {
                      const url = await SupabaseService.uploadMedia(t.fileUrl, 'tracks', `${t.title}.mp3`);
                      if (url) return { ...t, fileUrl: url };
                  } catch (e) {
                      console.warn('Track storage upload fallback:', e);
                  }
              }
              return t;
          }));

          finalCovers = await Promise.all(distCovers.map(async (c, idx) => {
              if (c && c.startsWith('data:')) {
                  try {
                      const url = await SupabaseService.uploadMedia(c, 'covers', `cover_${idx}.jpg`);
                      if (url) return url;
                  } catch (e) {
                      console.warn('Cover storage upload fallback:', e);
                  }
              }
              return c;
          }));
      }

      const payload = {
          title: distTitle,
          type: distType,
          genre: distGenre,
          label: distLabel || (currentArtist?.artistName || distArtistName || "Independent"),
          covers: finalCovers, 
          additionalMainArtists: distMainArtists,
          tracks: finalTracks,
          releaseDate: dateTime.toISOString(),
          releaseMessage: distMsg
      };

      if (isEditing && editingId) {
          updateReleaseRequest(editingId, {
              ...payload,
              // If mod is editing, allow updating artist name/id
              artistName: overrideArtist?.artistName || releaseRequests.find(r => r.id === editingId)?.artistName || ""
          });
          showNotification(t('releaseUpdated'), "success");
      } else {
          submitRelease(payload, overrideArtist);
          showNotification(t('releaseSubmitted'), "success");
      }
      
      // Clear active draft if this release was from a draft
      if (activeDraftId) {
          const key = getDraftsKey();
          const existing = StorageService.load<ReleaseDraft[]>(key, []);
          const updated = existing.filter(d => d.id !== activeDraftId);
          StorageService.save(key, updated);
          setDrafts(updated);
          if (isSupabaseConfigured()) {
              SupabaseService.deleteDraft(activeDraftId).catch(err => {
                  console.warn("Cloud delete draft on submit error:", err);
              });
          }
      }
      
      // Navigate back
      if (currentModerator) {
          setView('MOD_ALL_RELEASES');
      } else {
          setView('ARTIST_DASH');
      }
      
      resetDistForm();
  };

  const resetDistForm = () => {
      setDistStep(1); 
      setDistTitle(""); 
      setDistArtistName("");
      setDistTracks([]); 
      setDistCovers([]); 
      setDistMsg(""); 
      setDistMainArtists([]); 
      setTrackArtistInputs({});
      setIsEditing(false);
      setEditingId(null);
      setActiveDraftId(null);
      setLastSavedTime(null);
  };
  
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
          for (const file of Array.from(files)) {
              const compressed = await compressImage(file, 800, 800, 0.85);
              if (compressed) {
                  let finalCover = compressed;
                  if (isSupabaseConfigured()) {
                      try {
                          const storageUrl = await SupabaseService.uploadMedia(compressed, 'covers', file.name);
                          if (storageUrl) finalCover = storageUrl;
                      } catch (err) {
                          console.warn('Cover storage upload fallback:', err);
                      }
                  }
                  setDistCovers(prev => [...prev, finalCover]);
              }
          }
      }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImage(file, 400, 400, 0.85);
      if (compressed) {
        let finalAvatar = compressed;
        if (isSupabaseConfigured()) {
          try {
            const storageUrl = await SupabaseService.uploadMedia(compressed, 'avatars', file.name);
            if (storageUrl) finalAvatar = storageUrl;
          } catch (err) {
            console.warn('Avatar storage upload fallback:', err);
          }
        }
        setEditAvatar(finalAvatar);
      }
    }
  };

  const handleProfileUpdate = () => {
      if (!currentArtist) return;
      submitProfileEdit({ newBio: editBio, newAvatar: editAvatar });
      
      if (editNewPassword) {
          changeArtistPassword(editNewPassword);
      }
      
      showNotification(t('profileUpdateSent'), "success");
      setView('ARTIST_DASH');
  };

  const handleModPasswordChange = () => {
      if (!modNewPassword) {
          showNotification("Password cannot be empty", "error");
          return;
      }
      changeModeratorPassword(modNewPassword);
      setView('MOD_DASH');
  };

  const handleEditRelease = (release: any) => {
      setIsEditing(true);
      setEditingId(release.id);
      
      setDistTitle(release.title);
      setDistType(release.type);
      setDistGenre(release.genre);
      setDistLabel(release.label || release.recordLabel || "");
      setDistCovers(release.covers);
      setDistMainArtists(release.additionalMainArtists || release.mainArtists || []);
      setDistTracks(release.tracks || []);
      
      // If mod, allow editing artist name
      if (currentModerator) {
          setDistArtistName(release.artistName || release.artist);
      }

      // Date Time parsing
      const dateObj = release.releaseDate ? new Date(release.releaseDate) : new Date();
      // Simple ISO to yyyy-MM-dd
      setDistDate(dateObj.toISOString().split('T')[0]);
      // Simple time
      setDistTime(dateObj.toTimeString().slice(0, 5));

      setDistMsg(release.releaseMessage || "");
      
      setDistStep(1);
      setView('DISTRIBUTION');
  };

  // --- RENDERERS ---

  const renderAuth = () => (
      <div className="fixed inset-0 overflow-y-auto bg-black flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface p-8 rounded-xl shadow-2xl border border-surface-highlight animate-zoom-in my-8">
              <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center animate-bounce">
                      {role === 'ARTIST' ? <Mic2 size={32} className="text-primary" /> : <Shield size={32} className="text-primary" />}
                  </div>
              </div>
              <h2 className="text-2xl font-bold text-center mb-6">
                  {role === 'MODERATOR' 
                      ? (hasModerator ? "Вход для модератора" : `${authMode === 'LOGIN' ? t('login') : t('signup')} Huevify For Moderators`)
                      : `${authMode === 'LOGIN' ? t('login') : t('signup')} Huevify For ${t('artists')}`}
              </h2>
              
              {/* Only show role toggle if no moderator exists yet */}
              {!hasModerator && (
                  <div className="flex bg-surface-highlight p-1 rounded-full mb-6">
                      <button 
                          type="button"
                          onClick={() => { setRole('ARTIST'); setMessage(""); }} 
                          className={`flex-1 py-2 rounded-full text-sm font-bold transition-all duration-300 ${role === 'ARTIST' ? 'bg-primary text-black shadow-lg' : 'text-secondary hover:text-white'}`}
                      >
                          {t('artist')}
                      </button>
                      
                      <button 
                          type="button"
                          onClick={() => { setRole('MODERATOR'); setMessage(""); }}
                          className={`flex-1 py-2 rounded-full text-sm font-bold transition-all duration-300 ${role === 'MODERATOR' ? 'bg-primary text-black shadow-lg' : 'text-secondary hover:text-white'}`}
                      >
                          Moderator
                      </button>
                  </div>
              )}

              {message && <div className="bg-red-500/20 text-red-500 p-3 rounded mb-4 text-center text-sm animate-pulse">{message}</div>}

              <form onSubmit={authMode === 'LOGIN' ? handleLogin : handleRegister} className="flex flex-col gap-4">
                  
                  {authMode === 'REGISTER' && role === 'ARTIST' && (
                      <div className="flex flex-col gap-2 animate-slide-up">
                          {!isCreatingNewArtist ? (
                              <div className="relative">
                                  <select 
                                      value={artistNameSelection}
                                      onChange={(e) => setArtistNameSelection(e.target.value)}
                                      className="w-full bg-background p-3 rounded border border-surface-highlight focus:border-primary focus:outline-none appearance-none transition-colors"
                                  >
                                      <option value="">{t('select')} {t('artist')}...</option>
                                      {existingArtists.map(a => <option key={a} value={a}>{a}</option>)}
                                  </select>
                                  <ChevronDown className="absolute right-3 top-3 text-secondary pointer-events-none" size={20}/>
                              </div>
                          ) : (
                              <input 
                                  type="text" 
                                  placeholder="New Artist Alias" 
                                  value={newArtistAlias} 
                                  onChange={e => setNewArtistAlias(e.target.value)}
                                  className="bg-background p-3 rounded border border-surface-highlight focus:border-primary focus:outline-none transition-colors"
                              />
                          )}
                          
                          <label className="flex items-center gap-2 cursor-pointer mt-1">
                              <input 
                                  type="checkbox" 
                                  checked={isCreatingNewArtist}
                                  onChange={e => setIsCreatingNewArtist(e.target.checked)}
                              />
                              <span className="text-xs text-secondary">Create new artist</span>
                          </label>
                      </div>
                  )}

                  <input 
                      type="text" placeholder={t('username')} value={username} onChange={e => setUsername(e.target.value)}
                      className="bg-background p-3 rounded border border-surface-highlight focus:border-primary focus:outline-none transition-colors"
                  />
                  <input 
                      type="password" placeholder={t('password')} value={password} onChange={e => setPassword(e.target.value)}
                      className="bg-background p-3 rounded border border-surface-highlight focus:border-primary focus:outline-none transition-colors"
                  />
                  
                  <button type="submit" className="bg-primary text-black font-bold py-3 rounded-full hover:scale-105 transition-transform mt-2 shadow-lg hover:shadow-primary/20">
                      {authMode === 'LOGIN' ? (role === 'MODERATOR' ? "Войти как модератор" : t('login')) : (role === 'MODERATOR' ? "Зарегистрировать модератора" : 'Submit Application')}
                  </button>
              </form>

              {role === 'ARTIST' ? (
                  <p className="text-center text-secondary text-sm mt-4">
                      {authMode === 'LOGIN' ? "Don't have an account?" : "Already have an account?"} 
                      <button type="button" onClick={() => { setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN'); setMessage(""); }} className="text-white font-bold ml-1 hover:underline">
                          {authMode === 'LOGIN' ? t('signup') : t('login')}
                      </button>
                  </p>
              ) : (
                  !hasModerator && (
                      <p className="text-center text-secondary text-sm mt-4">
                          {authMode === 'LOGIN' ? "Нет аккаунта модератора?" : "Уже зарегистрирован?"} 
                          <button type="button" onClick={() => { setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN'); setMessage(""); }} className="text-white font-bold ml-1 hover:underline">
                              {authMode === 'LOGIN' ? t('signup') : t('login')}
                          </button>
                      </p>
                  )
              )}

              {/* Discreet toggle to moderator login if moderator exists, and return button if currently in moderator login */}
              {hasModerator && (
                  role === 'ARTIST' ? (
                      authMode === 'LOGIN' && (
                          <div className="mt-4 pt-3 border-t border-white/5 text-center">
                              <button 
                                  type="button" 
                                  onClick={() => { setRole('MODERATOR'); setAuthMode('LOGIN'); setMessage(""); }} 
                                  className="text-xs text-secondary/60 hover:text-white transition-colors inline-flex items-center gap-1.5"
                              >
                                  <Shield size={13} />
                                  Вход для модератора
                              </button>
                          </div>
                      )
                  ) : (
                      <div className="mt-4 pt-3 border-t border-white/5 text-center">
                          <button 
                              type="button" 
                              onClick={() => { setRole('ARTIST'); setMessage(""); }} 
                              className="text-xs text-secondary hover:text-white transition-colors inline-flex items-center gap-1.5"
                          >
                              <ArrowLeft size={13} />
                              Вернуться к входу для артистов
                          </button>
                      </div>
                  )
              )}
          </div>
      </div>
  );

  const renderModCredentials = () => (
      <div className="w-full h-full flex flex-col p-6 relative animate-fade-in">
          <div className="flex items-center gap-4 mb-8 shrink-0">
               <button onClick={() => setView('MOD_DASH')} className="text-secondary hover:text-white"><ArrowLeft size={24}/></button>
               <h1 className="text-3xl font-bold flex items-center gap-3"><Key className="text-primary"/> {t('artistCreds')}</h1>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-surface rounded-xl border border-surface-highlight">
              <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-highlight text-secondary text-xs uppercase font-bold sticky top-0 z-10">
                      <tr>
                          <th className="p-4 bg-surface-highlight">{t('artist')} Name</th>
                          <th className="p-4 bg-surface-highlight">{t('username')}</th>
                          <th className="p-4 bg-surface-highlight">{t('password')}</th>
                          <th className="p-4 bg-surface-highlight">{t('status')}</th>
                          <th className="p-4 bg-surface-highlight text-right">{t('delete')}</th>
                      </tr>
                  </thead>
                  <tbody>
                      {artistAccounts.map(a => (
                          <tr key={a.id} className="border-b border-surface-highlight hover:bg-white/5 transition">
                              <td className="p-4 font-bold">{a.artistName}</td>
                              <td className="p-4 text-sm font-mono">{a.username}</td>
                              <td className="p-4 text-sm font-mono text-red-400">{a.password}</td>
                              <td className="p-4"><span className="text-xs font-bold uppercase">{a.status}</span></td>
                              <td className="p-4 text-right">
                                  <button onClick={() => deleteArtistAccount(a.id)} className="text-secondary hover:text-red-500 transition">
                                      <Trash2 size={18}/>
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
  );

  const renderModAllReleases = () => {
      const legacyAlbumsAsReleases = albums
        .filter(a => !a.id.startsWith('dist_alb_') && !releaseRequests.find(r => r.id === a.id))
        .map(a => ({
          id: a.id,
          title: a.title,
          artistName: a.artist,
          type: a.type || 'Album',
          releaseDate: a.releaseDate || new Date(a.year, 0, 1).toISOString(),
          status: 'LIVE' as const,
          covers: a.covers,
          label: a.recordLabel,
          tracks: a.trackIds.map(tid => {
              const t = tracks.find(tr => tr.id === tid);
              return {
                  title: t?.title || "",
                  explicit: t?.explicit || false,
                  duration: t?.duration || 0,
                  mainArtists: t?.mainArtists || [],
                  fileUrl: "",
                  artist: t?.artist,
                  existingHueq: t?.hueq, // Mapped for display
                  generatedHueq: t?.hueq // Map both just in case
              };
          })
      }));

      const allDisplayReleases = [...releaseRequests, ...legacyAlbumsAsReleases].sort((a,b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());

      return (
      <div className="w-full h-full flex flex-col p-6 relative animate-fade-in">
          <div className="flex items-center gap-4 mb-8 shrink-0">
               <button onClick={() => setView('MOD_DASH')} className="text-secondary hover:text-white"><ArrowLeft size={24}/></button>
               <h1 className="text-3xl font-bold flex items-center gap-3"><Database className="text-primary"/> {t('manageReleases')}</h1>
          </div>

          <div className="flex-1 overflow-y-auto bg-surface rounded-xl border border-surface-highlight">
             <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-highlight text-secondary text-xs uppercase font-bold sticky top-0 z-10">
                        <tr>
                            <th className="p-4 bg-surface-highlight">{t('releaseTitle')}</th>
                            <th className="p-4 bg-surface-highlight">{t('artist')}</th>
                            <th className="p-4 bg-surface-highlight">{t('type')}</th>
                            <th className="p-4 bg-surface-highlight">{t('date')}</th>
                            <th className="p-4 bg-surface-highlight">{t('status')}</th>
                            <th className="p-4 bg-surface-highlight text-right">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allDisplayReleases.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-secondary">{t('noReleases')}</td></tr>
                        )}
                        {allDisplayReleases.map((r: any, idx) => (
                            <tr key={idx} className="border-b border-surface-highlight hover:bg-white/5 transition cursor-pointer" onClick={() => setSelectedRelease(r)}>
                                <td className="p-4 flex items-center gap-3">
                                    <img src={r.covers && r.covers.length > 0 ? r.covers[0] : "https://picsum.photos/300"} className="w-10 h-10 rounded object-cover shadow-sm flex-shrink-0" />
                                    <span className="font-bold">{r.title}</span>
                                </td>
                                <td className="p-4 font-bold text-sm">{r.artistName}</td>
                                <td className="p-4 text-sm text-secondary">{r.type}</td>
                                <td className="p-4 text-sm text-secondary">{new Date(r.releaseDate).toLocaleDateString()}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                        r.status === 'LIVE' ? 'bg-green-500/20 text-green-500' :
                                        r.status === 'APPROVED' ? 'bg-blue-500/20 text-blue-500' :
                                        r.status === 'REJECTED' ? 'bg-red-500/20 text-red-500' :
                                        'bg-yellow-500/20 text-yellow-500'
                                    }`}>
                                        {r.deletionRequested ? t('deleteReq') : r.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-3" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => handleEditRelease(r)} className="text-secondary hover:text-white transition">
                                            <Edit size={18}/>
                                        </button>
                                        <button onClick={() => deleteRelease(r.id)} className="text-secondary hover:text-red-500 transition">
                                            <Trash2 size={18}/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
          </div>
      </div>
      );
  };

  const renderModAllTracks = () => (
      <div className="w-full h-full flex flex-col p-6 relative animate-fade-in">
          <div className="flex items-center gap-4 mb-8 shrink-0">
               <button onClick={() => setView('MOD_DASH')} className="text-secondary hover:text-white"><ArrowLeft size={24}/></button>
               <h1 className="text-3xl font-bold flex items-center gap-3"><ListMusic className="text-primary"/> {t('manageTracks')}</h1>
          </div>
          
          <div className="bg-surface-highlight/20 p-4 rounded-lg mb-4 text-sm text-secondary">
              Only automatically generated test tracks (ID starts with 't') can be deleted individually here. User uploaded tracks must be managed via Releases.
          </div>

          <div className="flex-1 overflow-y-auto bg-surface rounded-xl border border-surface-highlight">
              <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-highlight text-secondary text-xs uppercase font-bold sticky top-0 z-10">
                      <tr>
                          <th className="p-4 bg-surface-highlight">{t('trackTitle')}</th>
                          <th className="p-4 bg-surface-highlight">{t('artist')}</th>
                          <th className="p-4 bg-surface-highlight">Album</th>
                          <th className="p-4 bg-surface-highlight">ID</th>
                          <th className="p-4 bg-surface-highlight text-right">{t('delete')}</th>
                      </tr>
                  </thead>
                  <tbody>
                      {tracks.length === 0 && (
                          <tr>
                              <td colSpan={5} className="p-8 text-center text-secondary">
                                  {t('noTracks')}
                              </td>
                          </tr>
                      )}
                      {tracks.map(t => {
                          const isTest = t.id.startsWith('t');
                          return (
                          <tr key={t.id} className="border-b border-surface-highlight hover:bg-white/5 transition">
                              <td className="p-4 flex items-center gap-3">
                                  <img src={getTrackCover(t)} className="w-8 h-8 rounded object-cover" />
                                  <span className="font-bold">{t.title}</span>
                              </td>
                              <td className="p-4 text-sm">{t.artist}</td>
                              <td className="p-4 text-sm text-secondary">{t.album}</td>
                              <td className="p-4 text-xs font-mono text-secondary">{t.id}</td>
                              <td className="p-4 text-right">
                                  {isTest ? (
                                      <button onClick={() => deleteLegacyTrack(t.id)} className="text-secondary hover:text-red-500 transition">
                                          <Trash2 size={18}/>
                                      </button>
                                  ) : (
                                      <span className="text-xs text-secondary opacity-50">Locked</span>
                                  )}
                              </td>
                          </tr>
                      )})}
                  </tbody>
              </table>
          </div>
      </div>
  );

  const renderModSettings = () => (
      <div className="w-full max-w-md bg-surface p-8 rounded-xl shadow-2xl border border-surface-highlight animate-zoom-in relative">
          <button onClick={() => setView('MOD_DASH')} className="absolute top-8 left-8 text-secondary hover:text-white"><ArrowLeft size={24}/></button>
          <h2 className="text-2xl font-bold mb-6 text-center">Moderator Settings</h2>
          
          <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-secondary uppercase">{t('changePass')}</label>
                  <input 
                      type="password" 
                      value={modNewPassword} 
                      onChange={e => setModNewPassword(e.target.value)}
                      className="bg-background p-3 rounded border border-surface-highlight focus:border-primary focus:outline-none"
                      placeholder={t('newPass')}
                  />
              </div>
              
              <button 
                  onClick={handleModPasswordChange}
                  className="bg-primary text-black font-bold py-3 rounded-full hover:scale-105 transition shadow-lg shadow-primary/20"
              >
                  {t('updatePass')}
              </button>
          </div>
      </div>
  );

  const renderModDash = () => (
      <div className="w-full h-full flex flex-col p-6 relative overflow-y-auto animate-fade-in pb-8">
          <div className="flex justify-between items-center mb-8 shrink-0">
              <h1 className="text-3xl font-bold flex items-center gap-3"><Shield className="text-primary"/> {t('modDash')}</h1>
              <button onClick={() => setView('MOD_SETTINGS')} className="text-secondary hover:text-white transition p-2 rounded-full hover:bg-surface-highlight">
                  <Settings size={24}/>
              </button>
          </div>

          {/* Quick Actions Grid for Mod */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 shrink-0">
               <button onClick={() => { resetDistForm(); setView('DISTRIBUTION'); }} className="bg-primary text-black p-6 rounded-xl flex flex-col items-center justify-center gap-2 hover:scale-105 transition font-bold h-32 shadow-lg hover:shadow-primary/20 w-full">
                    <UploadCloud size={32}/>
                    {t('uploadRelease')}
                </button>
                <button onClick={() => setView('MOD_ALL_RELEASES')} className="bg-surface border border-surface-highlight p-6 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-surface-highlight transition font-bold h-32 hover:scale-105 w-full">
                    <Database size={32} className="text-secondary"/>
                    {t('manageReleases')}
                </button>
                <button onClick={() => setView('MOD_ALL_TRACKS')} className="bg-surface border border-surface-highlight p-6 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-surface-highlight transition font-bold h-32 hover:scale-105 w-full">
                    <ListMusic size={32} className="text-secondary"/>
                    {t('manageTracks')}
                </button>
                <button onClick={() => setView('MOD_CREDENTIALS')} className="bg-surface border border-surface-highlight p-6 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-surface-highlight transition font-bold h-32 hover:scale-105 w-full">
                    <Key size={32} className="text-secondary"/>
                    {t('artistCreds')}
                </button>
          </div>

          {/* Saved Drafts Section for Mod */}
          {drafts.length > 0 && (
              <div className="mb-8 shrink-0">
                  <div className="flex justify-between items-center mb-3">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                          <Bookmark size={20} className="text-primary" />
                          {t('drafts')} <span className="text-sm font-normal text-secondary">({drafts.length})</span>
                      </h2>
                      <span className="text-xs text-secondary">{t('draftsDesc')}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {drafts.map(d => (
                          <div key={d.id} className="bg-surface border border-surface-highlight hover:border-primary/40 p-4 rounded-xl flex flex-col justify-between gap-3 group transition shadow-sm hover:shadow-md">
                              <div className="flex items-start gap-3">
                                  <div className="w-14 h-14 rounded-lg bg-surface-highlight overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/5">
                                      {d.covers && d.covers.length > 0 ? (
                                          <img src={d.covers[0]} className="w-full h-full object-cover" alt="" />
                                      ) : (
                                          <FileAudio size={24} className="text-secondary opacity-60" />
                                      )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <div className="font-bold text-sm truncate text-white">
                                          {d.title || <span className="italic text-secondary">Без названия</span>}
                                      </div>
                                      <div className="text-xs text-secondary truncate mt-0.5">
                                          {d.artistName || "Various"} • {d.type || 'Single'} • {d.tracks?.length || 0} {t('tracksLower')}
                                      </div>
                                      <div className="text-[10px] text-secondary/70 mt-1 flex items-center gap-1">
                                          <Clock size={10} />
                                          <span>{new Date(d.lastSaved).toLocaleDateString()} {new Date(d.lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="flex items-center justify-between pt-2 border-t border-surface-highlight mt-1">
                                  <button 
                                      onClick={(e) => handleDeleteDraft(d.id, e)}
                                      className="text-xs text-secondary hover:text-red-500 transition flex items-center gap-1 p-1 rounded"
                                      title={t('deleteDraft')}
                                  >
                                      <Trash2 size={14} />
                                      <span>{t('deleteDraft')}</span>
                                  </button>
                                  <button 
                                      onClick={() => handleResumeDraft(d)}
                                      className="text-xs font-bold bg-primary text-black px-3.5 py-1.5 rounded-full hover:scale-105 transition flex items-center gap-1.5 shadow-sm"
                                  >
                                      <Edit size={12} />
                                      <span>{t('continueDraft')}</span>
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Artist Requests */}
              <div className="bg-surface rounded-xl p-4 flex flex-col border border-surface-highlight max-h-[500px]">
                  <h3 className="font-bold mb-4 flex items-center gap-2 text-primary"><User size={18}/> {t('pendingArtists')}</h3>
                  <div className="overflow-y-auto flex-1 flex flex-col gap-3">
                      {artistAccounts.filter(a => a.status === 'PENDING').length === 0 && <span className="text-secondary text-sm">{t('noPending')}</span>}
                      {artistAccounts.filter(a => a.status === 'PENDING').map(a => (
                          <div key={a.id} className="p-3 bg-surface-highlight rounded flex justify-between items-center animate-slide-in-bottom">
                              <div>
                                  <div className="font-bold">{a.artistName}</div>
                                  <div className="text-xs text-secondary">@{a.username}</div>
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={() => approveArtist(a.id)} className="text-green-500 hover:scale-110"><CheckCircle size={20}/></button>
                                  <button onClick={() => rejectArtist(a.id)} className="text-red-500 hover:scale-110"><XCircle size={20}/></button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Release Requests */}
              <div className="bg-surface rounded-xl p-4 flex flex-col border border-surface-highlight max-h-[500px]">
                  <h3 className="font-bold mb-4 flex items-center gap-2 text-primary"><UploadCloud size={18}/> {t('pendingReleases')}</h3>
                  <div className="overflow-y-auto flex-1 flex flex-col gap-3">
                      {releaseRequests.filter(r => (r.status === 'PENDING' || r.deletionRequested)).length === 0 && <span className="text-secondary text-sm">{t('noPending')}</span>}
                      {releaseRequests.filter(r => (r.status === 'PENDING' || r.deletionRequested)).map(r => (
                          <div key={r.id} className="p-3 bg-surface-highlight rounded flex gap-3 cursor-pointer hover:bg-zinc-800 transition-colors animate-slide-in-bottom items-start" onClick={() => setSelectedRelease(r)}>
                              <img src={r.covers && r.covers.length > 0 ? r.covers[0] : "https://picsum.photos/300"} className="w-12 h-12 rounded object-cover flex-shrink-0" alt=""/>
                              <div className="flex-1 min-w-0 flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                      <div className="font-bold truncate">{r.title}</div>
                                      {r.deletionRequested && <span className="text-[10px] bg-red-500 text-white px-1 rounded font-bold">{t('deleteReq')}</span>}
                                  </div>
                                  <div className="text-xs text-secondary truncate">{r.artistName} • {r.type}</div>
                                  <div className="flex gap-2 justify-end mt-1" onClick={e => e.stopPropagation()}>
                                      {r.deletionRequested ? (
                                           <>
                                             <button onClick={() => approveRelease(r.id)} className="text-red-500 hover:text-white text-[10px] font-bold uppercase border border-red-500 px-2 py-0.5 rounded hover:bg-red-500 transition">{t('confirmDelete')}</button>
                                             <button onClick={() => rejectRelease(r.id)} className="text-blue-500 hover:text-white text-[10px] font-bold uppercase border border-blue-500 px-2 py-0.5 rounded hover:bg-blue-500 transition">{t('rejectDel')}</button>
                                           </>
                                      ) : (
                                          <>
                                            <button onClick={() => approveRelease(r.id)} className="text-green-500 hover:text-white text-[10px] font-bold uppercase border border-green-500 px-2 py-0.5 rounded hover:bg-green-500 transition">{t('approve')}</button>
                                            <button onClick={() => rejectRelease(r.id)} className="text-red-500 hover:text-white text-[10px] font-bold uppercase border border-red-500 px-2 py-0.5 rounded hover:bg-red-500 transition">{t('reject')}</button>
                                          </>
                                      )}
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
              
              {/* Profile Edits */}
              <div className="bg-surface rounded-xl p-4 flex flex-col border border-surface-highlight max-h-[500px]">
                  <h3 className="font-bold mb-4 flex items-center gap-2 text-primary"><Edit size={18}/> {t('profileEdits')}</h3>
                  <div className="overflow-y-auto flex-1 flex flex-col gap-3">
                      {profileEditRequests.filter(r => r.status === 'PENDING').length === 0 && <span className="text-secondary text-sm">{t('noPending')}</span>}
                      {profileEditRequests.filter(r => r.status === 'PENDING').map(r => (
                          <div key={r.id} className="p-3 bg-surface-highlight rounded flex flex-col gap-2 animate-slide-in-bottom">
                               <div className="font-bold text-sm">{r.artistName} updates</div>
                               {r.newAvatar && <div className="text-xs text-secondary">New Avatar</div>}
                               {r.newBio && <div className="text-xs text-secondary bg-black/20 p-1 rounded italic line-clamp-2">Bio: {r.newBio}</div>}
                               {r.newArtistPick && <div className="text-xs text-secondary bg-black/20 p-1 rounded italic">New Pick: {r.newArtistPick.subtitle}</div>}
                               <div className="flex gap-2 justify-end">
                                  <button onClick={() => approveProfileEdit(r.id)} className="text-green-500 hover:text-white text-xs font-bold uppercase border border-green-500 px-2 py-1 rounded hover:bg-green-500 transition">{t('approve')}</button>
                                  <button onClick={() => rejectProfileEdit(r.id)} className="text-red-500 hover:text-white text-xs font-bold uppercase border border-red-500 px-2 py-1 rounded hover:bg-red-500 transition">{t('reject')}</button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          <div className="mt-auto">
              <button 
                  onClick={() => { logoutArtistHub(); setView('AUTH'); }} 
                  className="flex items-center gap-2 px-4 py-2 bg-surface-highlight rounded-full text-secondary hover:text-white hover:bg-red-500 hover:text-white transition font-bold shadow-lg"
              >
                  <LogOut size={18} />
                  {t('logout')}
              </button>
          </div>
      </div>
  );

  const renderDistribution = () => (
      <div className="w-full max-w-4xl bg-surface p-8 rounded-xl shadow-2xl border border-surface-highlight animate-zoom-in relative max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
              <button onClick={() => currentModerator ? setView('MOD_DASH') : setView('ARTIST_DASH')} className="text-secondary hover:text-white flex items-center gap-2 text-sm font-medium transition">
                  <ArrowLeft size={20}/>
                  <span>{t('back')}</span>
              </button>

              <div className="flex items-center gap-3">
                  <button 
                      onClick={() => saveCurrentDraft(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-surface-highlight hover:bg-zinc-700 text-xs font-semibold rounded-full text-secondary hover:text-white transition border border-white/5"
                      title={t('saveDraft')}
                  >
                      <Bookmark size={14} className={activeDraftId ? "text-primary" : ""} />
                      <span>{t('saveDraft')}</span>
                      {lastSavedTime && <span className="text-[10px] text-primary/80 font-mono">({lastSavedTime})</span>}
                  </button>
              </div>
          </div>

          <h2 className="text-3xl font-bold text-center mb-8">{isEditing ? t('updateRelease') : t('uploadNew')}</h2>
          
          <div className="flex justify-center gap-4 mb-8">
              {[1, 2, 3].map(s => (
                  <div key={s} className={`w-3 h-3 rounded-full ${distStep >= s ? 'bg-primary' : 'bg-surface-highlight'}`} />
              ))}
          </div>

          {distStep === 1 && (
              <div className="flex flex-col gap-6 animate-slide-in-right">
                  <h3 className="text-xl font-bold">{t('step1')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-4">
                          <input type="text" placeholder={`${t('releaseTitle')} *`} value={distTitle} onChange={e => setDistTitle(e.target.value)} className="bg-background p-3 rounded border border-surface-highlight focus:border-primary focus:outline-none" />
                          
                          {currentModerator && (
                              <input 
                                  type="text" 
                                  placeholder={`${t('primaryArtist')} *`} 
                                  value={distArtistName} 
                                  onChange={e => setDistArtistName(e.target.value)} 
                                  className="bg-background p-3 rounded border border-surface-highlight focus:border-primary focus:outline-none border-l-4 border-l-primary" 
                              />
                          )}

                          <select value={distType} onChange={e => setDistType(e.target.value as any)} className="bg-background p-3 rounded border border-surface-highlight focus:border-primary focus:outline-none">
                              <option value="Single">Single</option>
                              <option value="EP">EP</option>
                              <option value="Album">Album</option>
                              <option value="Mixtape">Mixtape</option>
                          </select>
                          <select value={distGenre} onChange={e => setDistGenre(e.target.value)} className="bg-background p-3 rounded border border-surface-highlight focus:border-primary focus:outline-none">
                              <option value="Pop">Pop</option>
                              <option value="Rap/Hip-Hop">Rap/Hip-Hop</option>
                              <option value="R&B">R&B</option>
                              <option value="Electronic/Dance">Electronic/Dance</option>
                          </select>
                          <input type="text" placeholder={t('recordLabel')} value={distLabel} onChange={e => setDistLabel(e.target.value)} className="bg-background p-3 rounded border border-surface-highlight focus:border-primary focus:outline-none" />
                      </div>
                      <div className="flex flex-col gap-4">
                          <div className="border-2 border-dashed border-surface-highlight rounded-lg p-8 flex flex-col items-center justify-center text-center hover:border-primary transition cursor-pointer relative overflow-hidden" onClick={() => coverInputRef.current?.click()}>
                              {distCovers.length > 0 ? (
                                  <div className="grid grid-cols-2 gap-2 w-full">
                                      {distCovers.map((c, i) => (
                                          <div key={i} className="relative group" onClick={(e) => e.stopPropagation()}>
                                              <img src={c} className="w-full aspect-square object-cover rounded shadow"/>
                                              <button onClick={() => setDistCovers(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition"><X size={12} fill="white"/></button>
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                  <>
                                      <Image size={48} className="text-secondary mb-4"/>
                                      <span className="text-secondary text-sm font-bold">{t('chooseCover')} *</span>
                                  </>
                              )}
                              <input type="file" multiple ref={coverInputRef} className="hidden" accept="image/*" onChange={handleCoverUpload} />
                          </div>
                          
                          {/* Main Artists */}
                          <div>
                              <label className="text-xs text-secondary font-bold uppercase mb-2 block">{t('trackLevelArtist')}</label>
                              <div className="flex gap-2">
                                  <input type="text" value={distMainArtistInput} onChange={e => setDistMainArtistInput(e.target.value)} className="flex-1 bg-background p-2 rounded border border-surface-highlight text-sm" placeholder={t('artist')} />
                                  <button onClick={() => { if(distMainArtistInput) { setDistMainArtists([...distMainArtists, distMainArtistInput]); setDistMainArtistInput(""); } }} className="bg-surface-highlight p-2 rounded hover:bg-white hover:text-black"><Plus size={20}/></button>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                  {distMainArtists.map((a, i) => (
                                      <span key={i} className="bg-primary/20 text-primary px-2 py-1 rounded text-xs flex items-center gap-1">
                                          {a} <button onClick={() => setDistMainArtists(distMainArtists.filter((_, idx) => idx !== i))}><X size={12}/></button>
                                      </span>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {distStep === 2 && (
              <div className="flex flex-col gap-6 animate-slide-in-right">
                  <h3 className="text-xl font-bold">{t('step2')}</h3>
                  
                  <div className="flex justify-end">
                      <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-bold hover:scale-105 transition">
                          <Plus size={18}/> {t('addTrack')}
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={handleFileUpload} />
                  </div>

                  <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto">
                      {distTracks.map((track, i) => (
                          <div key={i} className="bg-surface-highlight p-4 rounded flex flex-col gap-3">
                              <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-3">
                                      <div className="flex flex-col gap-1 mr-2">
                                          {i > 0 && (
                                              <button onClick={() => moveTrack(i, 'up')} className="text-secondary hover:text-white p-1">
                                                  <ChevronUp size={16}/>
                                              </button>
                                          )}
                                          {i < distTracks.length - 1 && (
                                              <button onClick={() => moveTrack(i, 'down')} className="text-secondary hover:text-white p-1">
                                                  <ChevronDown size={16}/>
                                              </button>
                                          )}
                                      </div>
                                      <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center text-xs font-bold text-secondary">{i+1}</div>
                                      <div className="flex flex-col w-full">
                                          <input 
                                              type="text" 
                                              value={track.title} 
                                              onChange={e => updateTrack(i, 'title', e.target.value)}
                                              className="bg-transparent border-b border-secondary/50 focus:border-white focus:outline-none font-bold text-lg w-full"
                                              placeholder={t('trackTitle')}
                                          />
                                          {track.generatedHueq && !track.existingHueq && (
                                              <span className="text-[10px] text-secondary/70 font-mono mt-1">
                                                  HUEQ: {track.generatedHueq}
                                              </span>
                                          )}
                                      </div>
                                  </div>
                                  <button onClick={() => setDistTracks(distTracks.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-400"><Trash2 size={20}/></button>
                              </div>
                              
                              {currentModerator && (
                                  <input 
                                      type="text" 
                                      value={track.artist || ""}
                                      onChange={e => updateTrack(i, 'artist', e.target.value)}
                                      className="bg-black/40 p-2 rounded text-sm text-primary font-bold focus:outline-none border border-transparent focus:border-primary"
                                      placeholder="Primary Artist (Override)"
                                  />
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="flex flex-col gap-2">
                                      <input 
                                          type="text" 
                                          value={track.existingHueq || ""} 
                                          onChange={e => updateTrack(i, 'existingHueq', e.target.value)}
                                          onBlur={e => handleHueqBlur(i, e.target.value)}
                                          placeholder="HUEQ Code (Optional)"
                                          className="bg-black/20 p-2 rounded text-sm w-full font-mono text-secondary focus:text-white focus:outline-none border border-transparent focus:border-primary"
                                      />
                                      <div className="flex items-center gap-4">
                                          <label className="flex items-center gap-2 cursor-pointer">
                                              <input type="checkbox" checked={track.explicit} onChange={e => updateTrack(i, 'explicit', e.target.checked)} className="rounded text-primary focus:ring-0"/>
                                              <span className="text-xs font-bold uppercase text-secondary">{t('explicit')}</span>
                                          </label>
                                          <div className="text-xs text-secondary bg-black/20 px-2 py-1 rounded">{formatDuration(track.duration)}</div>
                                      </div>
                                  </div>
                                  
                                  <div className="flex flex-col gap-2">
                                      <select 
                                        value={track.genre} 
                                        onChange={e => updateTrack(i, 'genre', e.target.value)}
                                        className="bg-black p-2 rounded text-sm text-white focus:outline-none border border-transparent focus:border-primary"
                                      >
                                          <option value="Pop">Pop</option>
                                          <option value="Rap/Hip-Hop">Rap/Hip-Hop</option>
                                          <option value="R&B">R&B</option>
                                          <option value="Electronic/Dance">Electronic/Dance</option>
                                      </select>
                                      
                                      <div className="flex flex-col">
                                          <label className="text-[10px] uppercase font-bold text-secondary mb-1">{t('trackLevelArtist')}</label>
                                          <div className="flex gap-2 mb-1">
                                              <input 
                                                  type="text" 
                                                  value={trackArtistInputs[i] || ""} 
                                                  onChange={e => setTrackArtistInputs({...trackArtistInputs, [i]: e.target.value})}
                                                  placeholder={t('artist')}
                                                  className="flex-1 bg-black/20 p-2 rounded text-sm text-secondary focus:text-white focus:outline-none border border-transparent focus:border-primary"
                                              />
                                              <button onClick={() => addTrackArtist(i)} className="bg-surface p-2 rounded hover:bg-white hover:text-black"><Plus size={16}/></button>
                                          </div>
                                          <div className="flex flex-wrap gap-2">
                                              {(track.mainArtists || []).map((art, idx) => (
                                                  <span key={idx} className="bg-primary/20 text-primary px-2 py-1 rounded text-[10px] flex items-center gap-1">
                                                      {art} <button onClick={() => removeTrackArtist(i, art)}><X size={10}/></button>
                                                  </span>
                                              ))}
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      ))}
                      {distTracks.length === 0 && <div className="text-center text-secondary py-8 border-2 border-dashed border-surface-highlight rounded">{t('addTrack')}</div>}
                  </div>
              </div>
          )}

          {distStep === 3 && (
              <div className="flex flex-col gap-6 animate-slide-in-right">
                  <h3 className="text-xl font-bold">{t('step3')}</h3>
                  <div className="flex flex-col gap-4 max-w-md mx-auto w-full">
                      <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-secondary uppercase">{t('releaseDate')} *</label>
                          <input type="date" value={distDate} onChange={e => setDistDate(e.target.value)} className="bg-background p-3 rounded border border-surface-highlight focus:border-primary focus:outline-none calendar-dark" />
                      </div>
                      <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-secondary uppercase">{t('releaseTime')} *</label>
                          <input type="time" value={distTime} onChange={e => setDistTime(e.target.value)} className="bg-background p-3 rounded border border-surface-highlight focus:border-primary focus:outline-none" />
                      </div>
                      <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-secondary uppercase">{t('msgToMods')}</label>
                          <textarea value={distMsg} onChange={e => setDistMsg(e.target.value)} className="bg-background p-3 rounded border border-surface-highlight focus:border-primary focus:outline-none h-24 resize-none" placeholder={t('trackNote')}></textarea>
                      </div>

                      {/* Draft Status Banner on Step 3 */}
                      <div className="p-3 bg-surface-highlight/40 border border-surface-highlight rounded-lg flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-secondary">
                              <Bookmark size={15} className="text-primary"/>
                              <span>{lastSavedTime ? `${t('draftSaved')} (${lastSavedTime})` : t('draftAutoSaved')}</span>
                          </div>
                          <button 
                              onClick={() => saveCurrentDraft(true)}
                              className="text-primary hover:text-primary/80 font-bold px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 transition"
                          >
                              {t('saveDraft')}
                          </button>
                      </div>
                      
                      <div className="mt-2 border-t border-surface-highlight pt-4">
                          <h4 className="text-sm font-bold text-secondary uppercase mb-2">Release Preview</h4>
                          <div className="flex flex-col gap-2">
                              {distTracks.map((track, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-surface-highlight p-2 rounded">
                                      <span className="font-bold text-sm">{track.title}</span>
                                      <span className="font-mono text-[10px] text-secondary/70 border border-secondary/30 px-2 py-0.5 rounded select-all hover:text-white hover:border-white transition-colors cursor-text" title="HUEQ">
                                          {track.existingHueq || track.generatedHueq}
                                      </span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          )}

          <div className="flex flex-wrap justify-between items-center gap-4 mt-8 pt-8 border-t border-surface-highlight">
              {distStep > 1 ? (
                  <button onClick={() => setDistStep(distStep - 1)} className="px-6 py-2 rounded-full font-bold text-white hover:bg-white/10 transition">{t('back')}</button>
              ) : <div></div>}
              
              <div className="flex items-center gap-3">
                  {/* Save to Draft button available on Step 3 or anywhere */}
                  <button 
                      onClick={() => {
                          saveCurrentDraft(true);
                          if (currentModerator) setView('MOD_DASH');
                          else setView('ARTIST_DASH');
                      }}
                      className="px-5 py-2 rounded-full font-bold bg-surface-highlight text-white hover:bg-zinc-700 transition flex items-center gap-2 border border-white/10 shadow-sm"
                      title={t('saveDraft')}
                  >
                      <Bookmark size={16} className="text-primary" />
                      <span>{t('saveDraft')}</span>
                  </button>

                  {distStep < 3 ? (
                      <button onClick={handleNextStep} className="px-8 py-2 rounded-full font-bold bg-white text-black hover:scale-105 transition">{t('next')}</button>
                  ) : (
                      <button onClick={handleSubmitRelease} className="px-8 py-2 rounded-full font-bold bg-primary text-black hover:scale-105 transition shadow-lg shadow-primary/20">
                          {isEditing ? t('updateRelease') : t('submitRelease')}
                      </button>
                  )}
              </div>
          </div>
      </div>
  );

  const renderArtistDash = () => {
    if (!currentArtist) return null;
    
    // Filter pending releases (exclude those that are LIVE to avoid duplication with liveAlbums)
    const pendingReleases = releaseRequests.filter(r => r.artistId === currentArtist.id && r.status !== 'LIVE');
    
    // Convert static albums to "Live" release format for display
    const liveAlbums = albums
        .filter(a => a.artist === currentArtist.artistName)
        .map(a => ({
            id: a.id,
            artistId: currentArtist.id,
            artistName: a.artist,
            status: 'LIVE' as const,
            title: a.title,
            type: (a.type || 'Album') as ReleaseType,
            genre: 'Pop', // Default for legacy
            label: a.recordLabel || "",
            covers: a.covers,
            additionalMainArtists: a.mainArtists,
            tracks: a.trackIds.map(tid => {
                const t = tracks.find(tr => tr.id === tid);
                return {
                    title: t?.title || "",
                    explicit: t?.explicit || false,
                    duration: t?.duration || 0,
                    mainArtists: t?.mainArtists || [],
                    feat: t?.feat,
                    existingHueq: t?.hueq,
                    fileUrl: ""
                };
            }),
            releaseDate: a.releaseDate || new Date(a.year, 0, 1).toISOString(),
            submissionTime: new Date().toISOString(),
            deletionRequested: false
        }));

    const myReleases = [...pendingReleases, ...liveAlbums];
    const stats = getArtistStats(currentArtist.artistName);

    return (
        <div className="w-full h-full flex flex-col p-6 relative overflow-y-auto animate-fade-in pb-8">
            <div className="flex justify-between items-center mb-8 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-800 shadow-lg">
                        {currentArtist.avatar ? <img src={currentArtist.avatar} className="w-full h-full object-cover" /> : <User size={32} className="text-secondary m-auto h-full" />}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">{currentArtist.artistName} <CheckCircle size={20} className="text-blue-500" fill="white" /></h1>
                        <p className="text-secondary text-sm">{t('artistDash')}</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8 shrink-0">
                <div className="bg-surface border border-surface-highlight p-4 rounded-xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                        <BarChart2 size={24} className="text-primary"/>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{stats.monthlyPlays.toLocaleString()}</div>
                        <div className="text-xs text-secondary uppercase font-bold">{t('monthlyPlays')}</div>
                    </div>
                </div>
                <div className="bg-surface border border-surface-highlight p-4 rounded-xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                        <Globe size={24} className="text-primary"/>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">#{stats.globalRank}</div>
                        <div className="text-xs text-secondary uppercase font-bold">{t('inTheWorld')}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 w-full shrink-0">
                <button onClick={() => { resetDistForm(); setView('DISTRIBUTION'); }} className="bg-primary text-black p-6 rounded-xl flex flex-col items-center justify-center gap-2 hover:scale-105 transition font-bold h-32 shadow-lg hover:shadow-primary/20 w-full">
                    <UploadCloud size={32}/>
                    {t('uploadNew')}
                </button>
                <button onClick={() => setView('PROFILE_EDIT')} className="bg-surface border border-surface-highlight p-6 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-surface-highlight transition font-bold h-32 hover:scale-105 w-full">
                    <Edit size={32} className="text-secondary"/>
                    {t('editProfile')}
                </button>
                <button onClick={() => setView('ARTIST_PICK')} className="bg-surface border border-surface-highlight p-6 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-surface-highlight transition font-bold h-32 hover:scale-105 w-full">
                    <ListMusic size={32} className="text-secondary"/>
                    {t('artistPick')}
                </button>
            </div>

            {/* Saved Drafts Section */}
            {drafts.length > 0 && (
                <div className="mb-8 shrink-0">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Bookmark size={20} className="text-primary" />
                            {t('drafts')} <span className="text-sm font-normal text-secondary">({drafts.length})</span>
                        </h2>
                        <span className="text-xs text-secondary">{t('draftsDesc')}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {drafts.map(d => (
                            <div key={d.id} className="bg-surface border border-surface-highlight hover:border-primary/40 p-4 rounded-xl flex flex-col justify-between gap-3 group transition shadow-sm hover:shadow-md">
                                <div className="flex items-start gap-3">
                                    <div className="w-14 h-14 rounded-lg bg-surface-highlight overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/5">
                                        {d.covers && d.covers.length > 0 ? (
                                            <img src={d.covers[0]} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <FileAudio size={24} className="text-secondary opacity-60" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-sm truncate text-white">
                                            {d.title || <span className="italic text-secondary">Без названия</span>}
                                        </div>
                                        <div className="text-xs text-secondary truncate mt-0.5">
                                            {d.type || 'Single'} • {d.tracks?.length || 0} {t('tracksLower')}
                                        </div>
                                        <div className="text-[10px] text-secondary/70 mt-1 flex items-center gap-1">
                                            <Clock size={10} />
                                            <span>{new Date(d.lastSaved).toLocaleDateString()} {new Date(d.lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between pt-2 border-t border-surface-highlight mt-1">
                                    <button 
                                        onClick={(e) => handleDeleteDraft(d.id, e)}
                                        className="text-xs text-secondary hover:text-red-500 transition flex items-center gap-1 p-1 rounded"
                                        title={t('deleteDraft')}
                                    >
                                        <Trash2 size={14} />
                                        <span>{t('deleteDraft')}</span>
                                    </button>
                                    <button 
                                        onClick={() => handleResumeDraft(d)}
                                        className="text-xs font-bold bg-primary text-black px-3.5 py-1.5 rounded-full hover:scale-105 transition flex items-center gap-1.5 shadow-sm"
                                    >
                                        <Edit size={12} />
                                        <span>{t('continueDraft')}</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <h2 className="text-2xl font-bold mb-4 shrink-0">{t('myReleases')}</h2>
            
            {/* Desktop Table - removed max-h to allow full page scroll growth */}
            <div className="hidden md:block flex-1 bg-surface rounded-xl border border-surface-highlight">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-highlight text-secondary text-xs uppercase font-bold sticky top-0 z-10">
                        <tr>
                            <th className="p-4 bg-surface-highlight">{t('releaseTitle')}</th>
                            <th className="p-4 bg-surface-highlight">{t('type')}</th>
                            <th className="p-4 bg-surface-highlight">{t('date')}</th>
                            <th className="p-4 bg-surface-highlight">{t('status')}</th>
                            <th className="p-4 bg-surface-highlight text-right">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {myReleases.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-secondary">{t('noReleases')}</td>
                            </tr>
                        )}
                        {myReleases.map((r, idx) => (
                            <tr key={idx} className="border-b border-surface-highlight hover:bg-white/5 transition cursor-pointer" onClick={() => setSelectedRelease(r)}>
                                <td className="p-4 flex items-center gap-3">
                                    <img src={r.covers && r.covers.length > 0 ? r.covers[0] : "https://picsum.photos/300"} className="w-10 h-10 rounded object-cover shadow-sm flex-shrink-0" />
                                    <span className="font-bold">{r.title}</span>
                                </td>
                                <td className="p-4 text-sm text-secondary">{r.type}</td>
                                <td className="p-4 text-sm text-secondary">{new Date(r.releaseDate).toLocaleDateString()}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                        r.status === 'LIVE' ? 'bg-green-500/20 text-green-500' :
                                        r.status === 'APPROVED' ? 'bg-blue-500/20 text-blue-500' :
                                        r.status === 'REJECTED' ? 'bg-red-500/20 text-red-500' :
                                        'bg-yellow-500/20 text-yellow-500'
                                    }`}>
                                        {r.deletionRequested ? t('deleteReq') : r.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-3" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => handleEditRelease(r)} className="text-secondary hover:text-white transition hover:scale-110">
                                            <Edit size={18}/>
                                        </button>
                                        
                                        {/* Only allow deletion for non-legacy tracks for simplicity in prototype, or requests */}
                                        {r.id.startsWith('rel_') && (
                                            <button onClick={() => deleteRelease(r.id)} className="text-secondary hover:text-red-500 transition hover:scale-110">
                                                <Trash2 size={18}/>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile List */}
            <div className="md:hidden flex flex-col gap-3 pb-20">
                {myReleases.length === 0 && <div className="text-center text-secondary">{t('noReleases')}</div>}
                {myReleases.map((r, idx) => (
                    <div key={idx} className="bg-surface p-4 rounded-lg flex items-center gap-4 cursor-pointer active:scale-95 transition items-start" onClick={() => setSelectedRelease(r)}>
                        <div className="w-16 h-16 shrink-0">
                            <img src={r.covers && r.covers.length > 0 ? r.covers[0] : "https://picsum.photos/300"} className="w-full h-full rounded object-cover shadow-sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-lg truncate">{r.title}</div>
                            <div className="text-sm text-secondary truncate">{r.type} • {new Date(r.releaseDate).toLocaleDateString()}</div>
                            <div className={`text-xs font-bold mt-1 uppercase ${
                                r.status === 'LIVE' ? 'text-green-500' :
                                r.status === 'APPROVED' ? 'text-blue-500' :
                                r.status === 'REJECTED' ? 'text-red-500' :
                                'text-yellow-500'
                            }`}>{r.deletionRequested ? t('deleteReq') : r.status}</div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button onClick={(e) => { e.stopPropagation(); handleEditRelease(r); }} className="text-secondary hover:text-white">
                                <Edit size={20}/>
                            </button>
                            {r.id.startsWith('rel_') && (
                                <button onClick={(e) => { e.stopPropagation(); deleteRelease(r.id); }} className="text-secondary hover:text-red-500">
                                    <Trash2 size={20}/>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

             {/* Log Out Button */}
            <div className="mt-auto pt-8">
                <button 
                    onClick={() => { logoutArtistHub(); setView('AUTH'); }} 
                    className="flex items-center gap-2 px-4 py-2 bg-surface-highlight rounded-full text-secondary hover:text-white hover:bg-red-500 hover:text-white transition font-bold shadow-lg"
                >
                    <LogOut size={18} />
                    {t('logout')}
                </button>
            </div>
        </div>
    );
  };

  const renderProfileEditForm = () => (
      <div className="w-full max-w-md bg-surface p-8 rounded-xl shadow-2xl border border-surface-highlight animate-zoom-in relative max-h-[85vh] overflow-y-auto custom-scrollbar">
          <button onClick={() => setView('ARTIST_DASH')} className="absolute top-4 left-4 text-secondary hover:text-white"><ArrowLeft size={24}/></button>
          <h2 className="text-2xl font-bold text-center mb-6">{t('editProfile')}</h2>
          
          <div className="flex flex-col gap-6">
              <div className="flex justify-center">
                  <div 
                      onClick={() => avatarInputRef.current?.click()}
                      className="w-32 h-32 rounded-full bg-surface-highlight flex items-center justify-center cursor-pointer hover:opacity-80 transition relative overflow-hidden group border-2 border-transparent hover:border-primary"
                  >
                      {editAvatar ? (
                          <img src={editAvatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                          <Camera size={40} className="text-secondary" />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <span className="text-xs font-bold text-white uppercase">{t('changeCover')}</span>
                      </div>
                  </div>
                  <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
              </div>

              <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-secondary uppercase">{t('bio')}</label>
                  <textarea 
                      value={editBio} 
                      onChange={e => setEditBio(e.target.value)}
                      className="bg-background p-3 rounded border border-surface-highlight focus:border-primary focus:outline-none resize-none h-32 text-white"
                      placeholder="Tell fans about yourself..."
                  />
              </div>

              <div className="flex flex-col gap-2 border-t border-surface-highlight pt-4">
                  <label className="text-xs font-bold text-secondary uppercase">{t('changePass')}</label>
                  <input 
                      type="password" 
                      value={editNewPassword} 
                      onChange={e => setEditNewPassword(e.target.value)}
                      className="bg-background p-3 rounded border border-surface-highlight focus:border-primary focus:outline-none"
                      placeholder={t('newPass')}
                  />
              </div>

              <button 
                  onClick={handleProfileUpdate}
                  className="bg-primary text-black font-bold py-3 rounded-full hover:scale-105 transition shadow-lg shadow-primary/20"
              >
                  {t('submitChanges')}
              </button>
          </div>
      </div>
  );

  const renderArtistPickSelector = () => {
      // Logic for filtering tracks/albums
      // Reuse tracks/albums from context
      // search logic
      const filteredTracks = pickSearch ? tracks.filter(t => t.title.toLowerCase().includes(pickSearch.toLowerCase()) && t.artist === currentArtist?.artistName) : [];
      const filteredAlbums = pickSearch ? albums.filter(a => a.title.toLowerCase().includes(pickSearch.toLowerCase()) && a.artist === currentArtist?.artistName) : [];

      // Actually, artists usually pick their own stuff, or anything? "Artist Pick" usually implies anything.
      // Let's assume they can pick anything, but typically their own or what they like.
      // Let's search everything.
      const searchResults = [
          ...tracks.filter(t => t.title.toLowerCase().includes(pickSearch.toLowerCase())).map(t => ({...t, type: 'TRACK' as const})),
          ...albums.filter(a => a.title.toLowerCase().includes(pickSearch.toLowerCase())).map(a => ({...a, type: 'ALBUM' as const}))
      ].slice(0, 20);

      return (
        <div className="w-full max-w-2xl bg-surface p-8 rounded-xl shadow-2xl border border-surface-highlight animate-zoom-in relative h-[80vh] flex flex-col">
            <button onClick={() => setView('ARTIST_DASH')} className="absolute top-8 left-8 text-secondary hover:text-white"><ArrowLeft size={24}/></button>
            <h2 className="text-2xl font-bold text-center mb-6">{t('artistPick')}</h2>
            
            <div className="relative mb-6">
                <Search className="absolute left-4 top-3.5 text-secondary" size={20} />
                <input 
                    type="text" 
                    placeholder={t('searchTrackAlbum')}
                    className="w-full bg-background py-3 pl-12 pr-4 rounded-full text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    value={pickSearch}
                    onChange={e => setPickSearch(e.target.value)}
                    autoFocus
                />
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                {pickSearch && searchResults.length === 0 && <div className="text-center text-secondary">{t('noResults')}</div>}
                {!pickSearch && <div className="text-center text-secondary">{t('searchToFind')}</div>}
                
                {searchResults.map((item: any) => {
                   let image = "";
                   try {
                       image = item.type === 'TRACK' ? getTrackCover(item) : getAlbumCover(item.id);
                   } catch (e) {
                       console.error("Error getting cover", e);
                   }
                   const subtitle = item.type === 'TRACK' ? item.artist : (item.year ? `Album • ${item.year}` : 'Album');
                   
                   return (
                       <div 
                           key={`${item.type}_${item.id}`}
                           onClick={() => {
                               submitProfileEdit({
                                   newArtistPick: {
                                       type: item.type,
                                       id: item.id,
                                       image: image,
                                       subtitle: item.title
                                   }
                               });
                               showNotification("Artist Pick updated (Pending Approval)", "success");
                               setView('ARTIST_DASH');
                           }}
                           className="flex items-center gap-4 p-3 rounded hover:bg-surface-highlight cursor-pointer"
                       >
                           <img src={image} className="w-12 h-12 rounded object-cover" />
                           <div className="flex flex-col">
                               <span className="font-bold">{item.title}</span>
                               <span className="text-xs text-secondary">{subtitle}</span>
                           </div>
                       </div>
                   ) 
                })}
            </div>
        </div>
      );
  };

  const renderReleaseDetailModal = () => {
      if(!selectedRelease) return null;
      return (
          <div className="fixed inset-0 bg-black/80 z-[250] flex items-center justify-center p-4">
              <div className="bg-surface w-full max-w-2xl rounded-xl p-6 relative shadow-2xl border border-surface-highlight animate-zoom-in max-h-[90vh] overflow-hidden flex flex-col">
                  {/* Header */}
                  <div className="flex justify-between items-center mb-6 shrink-0">
                      <h2 className="text-2xl font-bold">{t('releaseTitle')}</h2>
                      <button onClick={() => setSelectedRelease(null)} className="text-secondary hover:text-white"><X size={24}/></button>
                  </div>
                  
                  <div className="overflow-y-auto flex-1 pr-2">
                      {/* Album Info */}
                      <div className="flex gap-6 mb-6">
                          <img src={selectedRelease.covers[0]} className="w-40 h-40 rounded shadow-lg object-cover bg-zinc-800 shrink-0" />
                          <div className="flex flex-col gap-2">
                              <h3 className="text-3xl font-bold">{selectedRelease.title}</h3>
                              <div className="text-secondary font-bold">{selectedRelease.artistName}</div>
                              <div className="text-sm text-secondary">{selectedRelease.type} • {selectedRelease.genre}</div>
                              <div className="text-sm text-secondary">Label: {selectedRelease.label}</div>
                              <div className="text-sm text-secondary">{t('released')}: {new Date(selectedRelease.releaseDate).toLocaleString()}</div>
                              <div className={`text-xs font-bold uppercase inline-block px-2 py-1 rounded w-fit ${
                                  selectedRelease.status === 'LIVE' ? 'bg-green-500/20 text-green-500' : 
                                  selectedRelease.status === 'APPROVED' ? 'bg-blue-500/20 text-blue-500' :
                                  selectedRelease.status === 'REJECTED' ? 'bg-red-500/20 text-red-500' :
                                  'bg-yellow-500/20 text-yellow-500'
                              }`}>
                                  {selectedRelease.status}
                              </div>
                              {selectedRelease.releaseMessage && (
                                  <div className="mt-2 p-2 bg-white/5 rounded text-sm italic text-secondary">
                                      {t('trackNote')} {selectedRelease.releaseMessage}
                                  </div>
                              )}
                          </div>
                      </div>

                      <h4 className="font-bold mb-3 border-b border-surface-highlight pb-2">{t('step2')}</h4>
                      <div className="flex flex-col gap-2">
                          {selectedRelease.tracks.map((track, idx) => (
                              <div key={idx} className="flex justify-between items-center p-2 hover:bg-surface-highlight rounded">
                                  <div className="flex items-center gap-3">
                                      <span className="text-secondary text-sm w-6">{idx + 1}</span>
                                      <div className="flex flex-col">
                                          <span className="font-bold text-sm">{track.title}</span>
                                          <span className="text-xs text-secondary flex flex-wrap items-center gap-1">
                                              <span>{track.artist || selectedRelease.artistName} {track.explicit ? `(${t('explicit')})` : ''}</span>
                                          </span>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                      {(track.generatedHueq || track.existingHueq || (track as any).hueq) && (
                                          <span className="font-mono text-[10px] text-secondary/70 border border-secondary/30 px-2 py-0.5 rounded select-all hover:text-white hover:border-white transition-colors cursor-text" title="HUEQ / ISRC">
                                              {track.generatedHueq || track.existingHueq || (track as any).hueq}
                                          </span>
                                      )}
                                      <span className="text-xs text-secondary w-10 text-right font-mono">{formatDuration(track.duration)}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 bg-black z-[200] animate-fade-in flex flex-col">
        <button 
            onClick={() => setArtistHubOpen(false)} 
            className="absolute top-4 right-4 text-secondary hover:text-white z-[60]"
        >
            <X size={24} />
        </button>

        {view === 'AUTH' && renderAuth()}
        {view === 'ARTIST_DASH' && renderArtistDash()}
        {view === 'MOD_DASH' && renderModDash()}
        {view === 'DISTRIBUTION' && (
            <div className="flex items-center justify-center flex-1 overflow-hidden p-4">
                {renderDistribution()}
            </div>
        )}
        {view === 'PROFILE_EDIT' && (
            <div className="flex items-center justify-center flex-1 overflow-hidden p-4">
                {renderProfileEditForm()}
            </div>
        )}
        {view === 'ARTIST_PICK' && (
            <div className="flex items-center justify-center flex-1 overflow-hidden p-4">
                {renderArtistPickSelector()}
            </div>
        )}
        {view === 'MOD_CREDENTIALS' && renderModCredentials()}
        {view === 'MOD_ALL_RELEASES' && renderModAllReleases()}
        {view === 'MOD_ALL_TRACKS' && renderModAllTracks()}
        {view === 'MOD_SETTINGS' && (
            <div className="flex items-center justify-center flex-1 overflow-hidden p-4">
                {renderModSettings()}
            </div>
        )}
        
        {/* Overlays */}
        {selectedRelease && renderReleaseDetailModal()}
    </div>
  );
};