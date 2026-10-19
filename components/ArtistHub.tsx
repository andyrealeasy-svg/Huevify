import React, { useState, useRef, useEffect } from 'react';
import { useStore, generateHUEQ, getTrackIdFromHueq } from '../context/StoreContext.tsx';
import { compressImage } from '../utils/imageCompressor.ts';
import {
  X, Mic2, Shield, User, UploadCloud, Calendar, FileAudio,
  CheckCircle, XCircle, Clock, MoreVertical, Image, Plus,
  Edit, ArrowLeft, Camera, LogOut, ChevronDown, Trash2, ListMusic, Check, Search, Play, Pause, BarChart2, Headphones, Globe, Database, Key, Settings, ChevronUp, Bookmark, FileText, Save,
  Megaphone, EyeOff, Eye, Info, CalendarClock, GripVertical, Music, ChevronLeft, ChevronRight, Sliders, SlidersHorizontal, ArrowUpDown, MoreHorizontal, Maximize2, ExternalLink, Copy
} from './Icons.tsx';
import { DistributionTrack, ReleaseType, ReleaseRequest, ReleaseDraft, Track, ArtistVerificationRequest } from '../types.ts';
import { CustomSelect } from './CustomSelect.tsx';
import { SupabaseService, isSupabaseConfigured } from '../services/supabase.ts';
import { StorageService } from '../services/storage.ts';
import { ExplicitBadge } from './ExplicitBadge.tsx';
import { LyricsSyncModal } from './LyricsSyncModal.tsx';
import { ArtistVerificationModal } from './ArtistVerificationModal.tsx';
import { formatNumericReleaseDate, formatReleaseDateDisplay, extractReleaseDateParts, getReleaseTimestamp } from '../utils/dateUtils.ts';

type HubView = 'AUTH' | 'ARTIST_DASH' | 'MOD_DASH' | 'DISTRIBUTION' | 'PROFILE_EDIT' | 'ARTIST_PICK' | 'MOD_CREDENTIALS' | 'MOD_ALL_RELEASES' | 'MOD_SETTINGS' | 'MOD_ALL_TRACKS';

export const CLASSIC_GENRES = ['Поп', 'Рэп/Хип-Хоп', 'РнБ', 'Электроника'] as const;

export const normalizeClassicGenre = (g?: string): string => {
  if (!g) return 'Поп';
  const trimmed = g.trim();
  if (trimmed === 'Поп' || trimmed === 'Рэп/Хип-Хоп' || trimmed === 'РнБ' || trimmed === 'Электроника') {
    return trimmed;
  }
  const lower = trimmed.toLowerCase();
  if (lower.includes('pop') || lower.includes('поп')) return 'Поп';
  if (lower.includes('rap') || lower.includes('hip') || lower.includes('рэп')) return 'Рэп/Хип-Хоп';
  if (lower.includes('r&b') || lower.includes('rnb') || lower.includes('рнб')) return 'РнБ';
  if (lower.includes('electr') || lower.includes('dance') || lower.includes('электрон')) return 'Электроника';
  return 'Поп';
};

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
    verificationRequests, startReviewVerificationRequest, approveVerificationRequest, rejectVerificationRequest, getArtistVerificationCriteria,
    submitRelease, updateReleaseRequest, getArtistStats, submitProfileEdit, hasModerator, existingArtists,
    deleteRelease, getTrackByHueq, tracks, setTracks, albums, playlists, showNotification, deleteArtistAccount, getTrackCover, getAlbumCover,
    changeArtistPassword, changeModeratorPassword, deleteLegacyTrack, t,
    appSettings, dailyChart, goToArtist,
    currentTrack, setCurrentTrack, isPlaying, playTrack, togglePlay
  } = useStore();

  const isLiquidGlass = appSettings?.liquidGlassNav !== false;

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
  const [distGenre, setDistGenre] = useState<string>("Поп");
  const [distLabel, setDistLabel] = useState("");
  const [distCovers, setDistCovers] = useState<string[]>([]);
  const [distMainArtists, setDistMainArtists] = useState<string[]>([]);
  const [distMainArtistInput, setDistMainArtistInput] = useState("");
  const [distTracks, setDistTracks] = useState<DistributionTrack[]>([]);

  // Drafts State
  const [drafts, setDrafts] = useState<ReleaseDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Announcement State (Expected Releases)
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [hideTrackMetadata, setHideTrackMetadata] = useState(false);
  const [publishAnnouncementImmediately, setPublishAnnouncementImmediately] = useState(true);
  const [announcementDate, setAnnouncementDate] = useState("");
  const [announcementTime, setAnnouncementTime] = useState("00:00");
  const [distLinkedAnnouncementId, setDistLinkedAnnouncementId] = useState("");

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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Mod Settings State
  const [modNewPassword, setModNewPassword] = useState("");
  const [modTab, setModTab] = useState<'releases' | 'artists' | 'profiles' | 'verification'>('releases');
  const [modSearch, setModSearch] = useState("");
  const [modSortOrder, setModSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Verification State
  const [isVerificationModalOpen, setVerificationModalOpen] = useState(false);
  const [selectedVerificationRequest, setSelectedVerificationRequest] = useState<ArtistVerificationRequest | null>(null);
  const [rejectModalReqId, setRejectModalReqId] = useState<string | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  // Artist Pick State
  const [pickSearch, setPickSearch] = useState("");
  const [selectedPickItem, setSelectedPickItem] = useState<{
    type: 'TRACK' | 'ALBUM' | 'PLAYLIST';
    id: string;
    image: string;
    title: string;
    subtitle: string;
  } | null>(null);
  const [pickComment, setPickComment] = useState("");

  // Release Detail Modal State
  const [selectedRelease, setSelectedRelease] = useState<ReleaseRequest | null>(null);
  const [previewTracks, setPreviewTracks] = useState<DistributionTrack[]>([]);

  // Release Statistics Modal State
  const [selectedStatsRelease, setSelectedStatsRelease] = useState<ReleaseRequest | null>(null);
  const [statsPeriod, setStatsPeriod] = useState<7 | 30>(7);
  const [hoveredGraphIndex, setHoveredGraphIndex] = useState<number | null>(null);
  const [statsCycleTick, setStatsCycleTick] = useState<number>(Date.now());
  const [releasePlayLogs, setReleasePlayLogs] = useState<Array<{ trackId: string; plays: number; timestamp: number }>>([]);
  const [isLoadingStatsLogs, setIsLoadingStatsLogs] = useState(false);

  useEffect(() => {
      if (!selectedStatsRelease) return;
      const interval = setInterval(() => {
          setStatsCycleTick(Date.now());
      }, 15000);
      return () => clearInterval(interval);
  }, [selectedStatsRelease?.id]);

  useEffect(() => {
      if (!selectedStatsRelease) {
          setReleasePlayLogs([]);
          return;
      }

      let isMounted = true;
      setIsLoadingStatsLogs(true);

      const loadLogs = async () => {
          // 1. Load local logs first
          const local = StorageService.load<Array<{ trackId: string; plays: number; timestamp: number }>>('huevify_play_logs', []);
          
          // 2. Determine all track identifiers for this release
          const releaseTrackIds: string[] = [];
          (selectedStatsRelease.tracks || []).forEach(dt => {
              if (dt.id) releaseTrackIds.push(dt.id);
              if (dt.legacyIds) releaseTrackIds.push(...dt.legacyIds);
              if (dt.title) releaseTrackIds.push(dt.title.trim());
              const match = tracks.find(t =>
                  (dt.id && t.id === dt.id) ||
                  (t.title?.trim().toLowerCase() === dt.title?.trim().toLowerCase() &&
                   (t.artist?.trim().toLowerCase() === (dt.artist || selectedStatsRelease.artistName)?.trim().toLowerCase() ||
                    t.album?.trim().toLowerCase() === selectedStatsRelease.title?.trim().toLowerCase()))
              );
              if (match?.id) releaseTrackIds.push(match.id);
              if (match?.title) releaseTrackIds.push(match.title.trim());
              if (match?.hueq) releaseTrackIds.push(match.hueq);
              if (dt.existingHueq) releaseTrackIds.push(dt.existingHueq);
              if (dt.generatedHueq) releaseTrackIds.push(dt.generatedHueq);
          });
          const uniqueTrackIds = Array.from(new Set(releaseTrackIds.filter(Boolean)));

          // 3. Fetch from Supabase track_play_logs table (last 35 days)
          const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
          let combinedLogs: Array<{ trackId: string; plays: number; timestamp: number }> = [...local];

          if (isSupabaseConfigured()) {
              try {
                  const remoteLogs = await SupabaseService.fetchReleasePlayLogs(uniqueTrackIds.length > 0 ? uniqueTrackIds : undefined, thirtyFiveDaysAgo);
                  if (remoteLogs && remoteLogs.length > 0) {
                      const formattedRemote = remoteLogs.map(r => ({
                          trackId: r.track_id,
                          plays: Number(r.plays) || 1,
                          timestamp: new Date(r.created_at).getTime()
                      }));
                      
                      // Canonical remote logs from Supabase so all devices (phone, laptop) render identical stats
                      combinedLogs = formattedRemote;
                  }
              } catch (err) {
                  console.warn('Failed to fetch release play logs from Supabase:', err);
              }
          }

          if (isMounted) {
              setReleasePlayLogs(combinedLogs);
              setIsLoadingStatsLogs(false);
          }
      };

      loadLogs();

      return () => {
          isMounted = false;
      };
  }, [selectedStatsRelease?.id, tracks, statsCycleTick]);

  useEffect(() => {
      if (selectedRelease) {
          setPreviewTracks(selectedRelease.tracks || []);
      }
  }, [selectedRelease]);

  // HUEQ Track Loading State (Step 2)
  const [isHueqModalOpen, setIsHueqModalOpen] = useState(false);
  const [hueqInput, setHueqInput] = useState("");
  const [hueqLookupError, setHueqLookupError] = useState("");
  const [previewTrackFromHueq, setPreviewTrackFromHueq] = useState<Track | null>(null);

  // New Distribution Track UI states
  const [isAddTrackMenuOpen, setIsAddTrackMenuOpen] = useState(false);
  const [expandedTrackIdx, setExpandedTrackIdx] = useState<number | null>(null);
  const [lyricsModalTrackIdx, setLyricsModalTrackIdx] = useState<number | null>(null);
  const [draggedTrackIdx, setDraggedTrackIdx] = useState<number | null>(null);
  const [dragOverTrackIdx, setDragOverTrackIdx] = useState<number | null>(null);
  const [trackToAttachAudioIdx, setTrackToAttachAudioIdx] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const attachAudioInputRef = useRef<HTMLInputElement>(null);
  const touchDragRef = useRef<{ fromIdx: number; currentOverIdx: number | null }>({ fromIdx: -1, currentOverIdx: null });

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
          isAnnouncement,
          hideTrackMetadata,
          announcementDate: !publishAnnouncementImmediately && announcementDate ? announcementDate : undefined,
          announcementTime: !publishAnnouncementImmediately && announcementTime ? announcementTime : undefined,
          linkedAnnouncementId: distLinkedAnnouncementId || undefined
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
      setDistGenre(draft.genre ? normalizeClassicGenre(draft.genre) : 'Поп');
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
      setIsAnnouncement(Boolean(draft.isAnnouncement));
      setHideTrackMetadata(Boolean(draft.hideTrackMetadata));
      setPublishAnnouncementImmediately(!draft.announcementDate);
      setAnnouncementDate(draft.announcementDate || "");
      setAnnouncementTime(draft.announcementTime || "00:00");
      setDistLinkedAnnouncementId(draft.linkedAnnouncementId || "");
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
      distCovers, distMainArtists, distTracks, distDate, distTime, distMsg, isEditing, editingId,
      isAnnouncement, hideTrackMetadata, publishAnnouncementImmediately, announcementDate, announcementTime
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

  // --- Audio Duration Helper ---
  const getAudioDuration = (file: File): Promise<number> => {
      return new Promise((resolve) => {
          let objectUrl = '';
          try {
              objectUrl = URL.createObjectURL(file);
          } catch (e) {
              resolve(180);
              return;
          }

          const audio = new Audio();
          let cleaned = false;

          const cleanup = () => {
              if (cleaned) return;
              cleaned = true;
              audio.removeEventListener('loadedmetadata', onLoaded);
              audio.removeEventListener('error', onError);
              try { URL.revokeObjectURL(objectUrl); } catch (e) {}
          };

          const onLoaded = () => {
              const dur = audio.duration;
              cleanup();
              resolve(isNaN(dur) || !isFinite(dur) || dur <= 0 ? 180 : dur);
          };

          const onError = () => {
              cleanup();
              resolve(180);
          };

          const timer = setTimeout(() => {
              cleanup();
              resolve(180);
          }, 2500);

          audio.addEventListener('loadedmetadata', () => {
              clearTimeout(timer);
              onLoaded();
          });
          audio.addEventListener('error', () => {
              clearTimeout(timer);
              onError();
          });

          audio.src = objectUrl;
      });
  };

  // --- Distribution Handlers ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const fileList = Array.from(files);
      showNotification(`Подготовка и загрузка (${fileList.length} файлов)...`, "info");

      for (const file of fileList) {
          try {
              const duration = await getAudioDuration(file);
              let finalUrl: string | null = null;

              if (isSupabaseConfigured()) {
                  try {
                      finalUrl = await SupabaseService.uploadMedia(file, 'tracks', file.name);
                  } catch (err) {
                      console.warn("Storage audio upload error:", err);
                  }
              }

              // Fallback to Blob URL if cloud failed or not configured
              if (!finalUrl) {
                  try {
                      finalUrl = URL.createObjectURL(file);
                  } catch (e) {
                      finalUrl = "";
                  }
                  showNotification(`Трек "${file.name.replace(/\.[^/.]+$/, "")}" добавлен`, "info");
              } else {
                  showNotification(`Трек "${file.name.replace(/\.[^/.]+$/, "")}" успешно загружен!`, "success");
              }

              const generatedHueq = generateHUEQ();
              const newTrack: DistributionTrack = {
                  id: getTrackIdFromHueq(generatedHueq),
                  title: file.name.replace(/\.[^/.]+$/, ""),
                  explicit: false,
                  mainArtists: [],
                  genre: distGenre || "Pop",
                  duration: duration,
                  fileUrl: finalUrl,
                  generatedHueq
              };

              setDistTracks(prev => [...prev, newTrack]);
          } catch (err) {
              console.error("File upload error:", err);
              showNotification(`Ошибка загрузки ${file.name}`, "error");
          }
      }

      e.target.value = '';
  };

  const updateTrack = (idx: number, field: keyof DistributionTrack, val: any) => {
      setDistTracks(prev => {
          const newTracks = [...prev];
          newTracks[idx] = { ...newTracks[idx], [field]: val };
          return newTracks;
      });
  };

  // Drag and Drop reordering (mouse & touch)
  const reorderTracks = (fromIdx: number, toIdx: number) => {
      if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= distTracks.length || toIdx >= distTracks.length) return;
      setDistTracks(prev => {
          const next = [...prev];
          const [moved] = next.splice(fromIdx, 1);
          next.splice(toIdx, 0, moved);
          return next;
      });
      // Adjust expanded track index if needed
      if (expandedTrackIdx === fromIdx) {
          setExpandedTrackIdx(toIdx);
      } else if (expandedTrackIdx !== null) {
          if (fromIdx < expandedTrackIdx && toIdx >= expandedTrackIdx) {
              setExpandedTrackIdx(expandedTrackIdx - 1);
          } else if (fromIdx > expandedTrackIdx && toIdx <= expandedTrackIdx) {
              setExpandedTrackIdx(expandedTrackIdx + 1);
          }
      }
  };

  // HTML5 Drag Events (Desktop Mouse)
  const handleDragStart = (e: React.DragEvent, idx: number) => {
      e.dataTransfer.setData('text/plain', idx.toString());
      e.dataTransfer.effectAllowed = 'move';
      setDraggedTrackIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragOverTrackIdx !== idx) {
          setDragOverTrackIdx(idx);
      }
  };

  const handleDrop = (e: React.DragEvent, idx: number) => {
      e.preventDefault();
      if (draggedTrackIdx !== null && draggedTrackIdx !== idx) {
          reorderTracks(draggedTrackIdx, idx);
      }
      setDraggedTrackIdx(null);
      setDragOverTrackIdx(null);
  };

  const handleDragEnd = () => {
      setDraggedTrackIdx(null);
      setDragOverTrackIdx(null);
  };

  // Touch Events (Mobile Finger Drag)
  const handleTouchStart = (e: React.TouchEvent, idx: number) => {
      touchDragRef.current = { fromIdx: idx, currentOverIdx: idx };
      setDraggedTrackIdx(idx);
      setDragOverTrackIdx(idx);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate(20); } catch {}
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (touchDragRef.current.fromIdx === -1) return;
      const touch = e.touches[0];
      if (!touch) return;

      const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
      const cardEl = targetEl?.closest('[data-track-idx]');
      if (cardEl) {
          const targetStr = cardEl.getAttribute('data-track-idx');
          if (targetStr !== null) {
              const targetIdx = parseInt(targetStr, 10);
              if (!isNaN(targetIdx) && targetIdx !== touchDragRef.current.currentOverIdx) {
                  touchDragRef.current.currentOverIdx = targetIdx;
                  setDragOverTrackIdx(targetIdx);
              }
          }
      }
  };

  const handleTouchEnd = () => {
      const { fromIdx, currentOverIdx } = touchDragRef.current;
      if (fromIdx !== -1 && currentOverIdx !== null && fromIdx !== currentOverIdx) {
          reorderTracks(fromIdx, currentOverIdx);
      }
      touchDragRef.current = { fromIdx: -1, currentOverIdx: null };
      setDraggedTrackIdx(null);
      setDragOverTrackIdx(null);
  };

  // Add Empty Track ("НЕ ВЫШЕЛ")
  const addEmptyTrack = () => {
      const newTrack: DistributionTrack = {
          title: "",
          explicit: false,
          duration: 0,
          genre: distGenre || 'Pop',
          fileUrl: "",
          mainArtists: [],
          isEmpty: true,
          isUnreleased: true
      };
      setDistTracks(prev => {
          const next = [...prev, newTrack];
          setExpandedTrackIdx(next.length - 1);
          return next;
      });
      setIsAddTrackMenuOpen(false);
      showNotification("Пустой трек добавлен (будет отображаться как «НЕ ВЫШЕЛ»)", "info");
  };

  // Attach audio to a specific track
  const handleAttachAudioToTrack = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || trackToAttachAudioIdx === null) return;

      showNotification(`Загрузка аудио для трека...`, "info");
      try {
          const duration = await getAudioDuration(file);
          let finalUrl: string | null = null;
          if (isSupabaseConfigured()) {
              try {
                  finalUrl = await SupabaseService.uploadMedia(file, 'tracks', file.name);
              } catch (err) {
                  console.warn("Storage audio upload error:", err);
              }
          }
          if (!finalUrl) {
              try {
                  finalUrl = URL.createObjectURL(file);
              } catch {}
          }
          setDistTracks(prev => {
              const next = [...prev];
              if (next[trackToAttachAudioIdx]) {
                  const generatedHueq = next[trackToAttachAudioIdx].generatedHueq || generateHUEQ();
                  next[trackToAttachAudioIdx] = {
                      ...next[trackToAttachAudioIdx],
                      id: next[trackToAttachAudioIdx].id || getTrackIdFromHueq(generatedHueq),
                      generatedHueq,
                      fileUrl: finalUrl || "",
                      duration: duration,
                      isEmpty: false,
                      isUnreleased: false,
                      title: next[trackToAttachAudioIdx].title || file.name.replace(/\.[^/.]+$/, "")
                  };
              }
              return next;
          });
          showNotification("Аудиофайл успешно прикреплен к треку!", "success");
      } catch (err) {
          showNotification("Ошибка при загрузке аудиофайла", "error");
      }
      e.target.value = '';
      setTrackToAttachAudioIdx(null);
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

  const handleHueqInputChange = (val: string) => {
      setHueqInput(val);
      setHueqLookupError("");
      const clean = val.trim().toUpperCase();
      if (clean.length >= 3) {
          const found = getTrackByHueq(clean);
          if (found) {
              setPreviewTrackFromHueq(found);
              setHueqLookupError("");
          } else {
              setPreviewTrackFromHueq(null);
          }
      } else {
          setPreviewTrackFromHueq(null);
      }
  };

  const handleHueqSearchClick = () => {
      const clean = hueqInput.trim().toUpperCase();
      if (!clean) {
          setHueqLookupError(t('enterHueqCode') || "Введите HUEQ код");
          return;
      }
      const found = getTrackByHueq(clean);
      if (found) {
          setPreviewTrackFromHueq(found);
          setHueqLookupError("");
      } else {
          setPreviewTrackFromHueq(null);
          setHueqLookupError(`${t('trackNotFoundByHueq') || "Трек с таким HUEQ кодом не найден"}: "${clean}"`);
      }
  };

  const handleAddTrackByHueq = (trackOrCode?: Track | string) => {
      let targetTrack: Track | undefined;
      let code = "";

      if (trackOrCode && typeof trackOrCode === 'object') {
          targetTrack = trackOrCode;
          code = targetTrack.hueq || "";
      } else {
          code = (typeof trackOrCode === 'string' ? trackOrCode : hueqInput).trim().toUpperCase();
          targetTrack = previewTrackFromHueq || getTrackByHueq(code);
      }

      if (!targetTrack) {
          setHueqLookupError(`${t('trackNotFoundByHueq') || "Трек с таким HUEQ кодом не найден"}: "${code}"`);
          return;
      }

      const finalHueq = targetTrack.hueq || code;

      const alreadyExists = distTracks.some(dt =>
          (dt.existingHueq && dt.existingHueq.toUpperCase() === finalHueq.toUpperCase()) ||
          (dt.generatedHueq && dt.generatedHueq.toUpperCase() === finalHueq.toUpperCase()) ||
          (dt.fileUrl && dt.fileUrl === targetTrack?.url && dt.title.toLowerCase() === targetTrack?.title.toLowerCase())
      );

      if (alreadyExists) {
          showNotification(`Трек "${targetTrack.title}" уже в списке релиза`, "info");
          return;
      }

      const newTrack: DistributionTrack = {
          id: targetTrack.id,
          title: targetTrack.title,
          explicit: targetTrack.explicit || false,
          feat: targetTrack.feat || "",
          mainArtists: targetTrack.mainArtists || [],
          genre: targetTrack.genre || distGenre || "Pop",
          duration: targetTrack.duration || 180,
          fileUrl: targetTrack.url,
          existingHueq: finalHueq,
          generatedHueq: finalHueq,
          artist: targetTrack.artist,
          lyrics: targetTrack.lyrics,
          syncedLyrics: targetTrack.syncedLyrics,
          plays: targetTrack.plays || 0
      };

      setDistTracks(prev => [...prev, newTrack]);
      showNotification(`${t('trackAddedByHueq') || "Трек добавлен по HUEQ"}: ${targetTrack.title}`, "success");
      setHueqInput("");
      setHueqLookupError("");
      setPreviewTrackFromHueq(null);
      setIsHueqModalOpen(false);
  };

  const handleHueqBlur = (idx: number, hueq: string) => {
      if (!hueq) return;
      const clean = hueq.trim().toUpperCase();
      const existing = getTrackByHueq(clean);

      if (existing) {
          setDistTracks(prev => {
              const newTracks = [...prev];
              newTracks[idx] = {
                  ...newTracks[idx],
                  id: existing.id,
                  title: existing.title,
                  explicit: existing.explicit || false,
                  feat: existing.feat || "",
                  existingHueq: existing.hueq || clean,
                  generatedHueq: existing.hueq || clean,
                  fileUrl: existing.url,
                  duration: existing.duration,
                  genre: existing.genre || newTracks[idx].genre,
                  mainArtists: existing.mainArtists || [],
                  artist: existing.artist,
                  lyrics: existing.lyrics || newTracks[idx].lyrics,
                  syncedLyrics: existing.syncedLyrics || newTracks[idx].syncedLyrics,
                  plays: existing.plays || 0
              };
              return newTracks;
          });
          showNotification(`HUEQ найден: ${existing.title}`, "success");
      } else {
          updateTrack(idx, 'existingHueq', clean);
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
              showNotification(isAnnouncement ? "Добавьте хотя бы один трек в треклист анонса" : t('addOneTrack'), "error");
              return;
          }
          const untitledIdx = distTracks.findIndex(t => !t.title.trim());
          if (untitledIdx !== -1) {
              showNotification(`Укажите название для трека #${untitledIdx + 1}`, "error");
              return;
          }
      }
      setDistStep(prev => prev + 1);
  };

  const addNewTrack = () => {
      const generatedHueq = generateHUEQ();
      const newTrack: DistributionTrack = {
          id: getTrackIdFromHueq(generatedHueq),
          title: ``,
          explicit: false,
          duration: 180,
          genre: distGenre || 'Pop',
          fileUrl: "",
          mainArtists: [],
          generatedHueq
      };
      setDistTracks(prev => [...prev, newTrack]);
  };

  const handleSubmitRelease = async () => {
      if (!distDate || !distTime) {
          showNotification(t('specifyDate'), "error");
          return;
      }

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
          releaseDate: distDate,
          releaseTime: distTime,
          releaseMessage: distMsg,
          isAnnouncement: isAnnouncement,
          hideTrackMetadata: isAnnouncement ? hideTrackMetadata : false,
          announcementDate: isAnnouncement && !publishAnnouncementImmediately && announcementDate ? announcementDate : undefined,
          announcementTime: isAnnouncement && !publishAnnouncementImmediately && announcementTime ? announcementTime : undefined,
          linkedAnnouncementId: (!isAnnouncement && distType !== 'Single' && distLinkedAnnouncementId) ? distLinkedAnnouncementId : undefined
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
          showNotification(isAnnouncement ? "Анонс альбома успешно создан!" : t('releaseSubmitted'), "success");
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

  const resetDistForm = (forAnnouncement: boolean = false) => {
      setDistStep(1);
      setDistTitle("");
      setDistArtistName("");
      setDistType(forAnnouncement ? 'Album' : 'Single');
      setDistGenre("Поп");
      setDistLabel("");
      setDistTracks([]);
      setDistCovers([]);
      setDistMsg("");
      setDistDate("");
      setDistTime("00:00");
      setDistMainArtists([]);
      setDistMainArtistInput("");
      setTrackArtistInputs({});
      setIsEditing(false);
      setEditingId(null);
      setActiveDraftId(null);
      setLastSavedTime(null);
      setIsAnnouncement(forAnnouncement);
      setHideTrackMetadata(false);
      setPublishAnnouncementImmediately(true);
      setAnnouncementDate("");
      setAnnouncementTime("00:00");
      setDistLinkedAnnouncementId("");
      setIsAddTrackMenuOpen(false);
      setExpandedTrackIdx(null);
      setDraggedTrackIdx(null);
      setDragOverTrackIdx(null);
      setTrackToAttachAudioIdx(null);
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
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      // 1. Upload original uncompressed file directly to Filebase (or Supabase fallback)
      try {
        const storageUrl = await SupabaseService.uploadMedia(file, 'avatars', file.name);
        if (storageUrl) {
          setEditAvatar(storageUrl);
          setIsUploadingAvatar(false);
          if (e.target) e.target.value = '';
          return;
        }
      } catch (err) {
        console.warn('Avatar original file cloud upload fallback:', err);
      }

      // 2. High-quality uncompressed local preview / fallback
      if (file.size <= 4 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const result = ev.target?.result as string;
          if (result) {
            setEditAvatar(result);
          }
          setIsUploadingAvatar(false);
        };
        reader.onerror = () => setIsUploadingAvatar(false);
        reader.readAsDataURL(file);
      } else {
        // Ultra-high resolution fallback (2560x2560, quality 0.98) only for huge files (>4MB) without Supabase
        const highRes = await compressImage(file, 2560, 2560, 0.98);
        if (highRes) {
          setEditAvatar(highRes);
        }
        setIsUploadingAvatar(false);
      }
    } catch (err) {
      console.error('Failed to process avatar upload:', err);
      setIsUploadingAvatar(false);
    }
    if (e.target) e.target.value = '';
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
      setDistGenre(normalizeClassicGenre(release.genre));
      setDistLabel(release.label || release.recordLabel || "");
      setDistCovers(release.covers);
      setDistMainArtists(release.additionalMainArtists || release.mainArtists || []);
      setDistTracks((release.tracks || []).map((t: any, idx: number) => {
          const hueq = (t.existingHueq || t.generatedHueq || t.hueq || generateHUEQ()).trim().toUpperCase();
          const existingTrack = hueq ? getTrackByHueq(hueq) : undefined;
          return {
              ...t,
              id: existingTrack?.id || t.id || (hueq ? getTrackIdFromHueq(hueq) : `dist_trk_${release.id}_${idx}`),
              existingHueq: t.existingHueq || t.generatedHueq,
              generatedHueq: t.generatedHueq || t.existingHueq || hueq
          };
      }));

      // If mod, allow editing artist name
      if (currentModerator) {
          setDistArtistName(release.artistName || release.artist);
      }

      // Date Time parsing without timezone drift
      const dateParts = release.releaseDate ? extractReleaseDateParts(release.releaseDate) : null;
      if (dateParts) {
        const yStr = String(dateParts.year);
        const mStr = String(dateParts.month).padStart(2, '0');
        const dStr = String(dateParts.day).padStart(2, '0');
        setDistDate(`${yStr}-${mStr}-${dStr}`);
      } else {
        const dateObj = release.releaseDate ? new Date(release.releaseDate) : new Date();
        setDistDate(`${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`);
      }

      if (release.releaseTime) {
        setDistTime(release.releaseTime);
      } else if (release.releaseDate && release.releaseDate.includes('T')) {
        const timePart = release.releaseDate.split('T')[1];
        setDistTime(timePart ? timePart.slice(0, 5) : '00:00');
      } else {
        setDistTime('00:00');
      }

      setDistMsg(release.releaseMessage || "");

      setIsAnnouncement(Boolean(release.isAnnouncement));
      setHideTrackMetadata(Boolean(release.hideTrackMetadata));
      setPublishAnnouncementImmediately(!release.announcementDate);
      setAnnouncementDate(release.announcementDate || "");
      setAnnouncementTime(release.announcementTime || "00:00");
      setDistLinkedAnnouncementId(release.linkedAnnouncementId || "");

      setDistStep(1);
      setView('DISTRIBUTION');
  };

  // --- RENDERERS ---

  const renderAuth = () => (
      <div className={`fixed inset-0 overflow-y-auto flex items-center justify-center p-4 ${
        isLiquidGlass ? 'max-md:bg-black/80 max-md:backdrop-blur-3xl md:bg-black' : 'bg-black'
      }`}>
          <div className={`w-full max-w-md p-8 rounded-xl shadow-2xl animate-zoom-in my-8 ${
            isLiquidGlass
              ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-3xl max-md:border max-md:border-white/15 max-md:shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.25)] max-md:rounded-2xl md:bg-surface md:border md:border-surface-highlight'
              : 'bg-surface border border-surface-highlight'
          }`}>
              <div className="flex justify-center mb-6">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center animate-bounce ${
                    isLiquidGlass
                      ? 'max-md:bg-primary/25 max-md:backdrop-blur-md max-md:border max-md:border-primary/30 max-md:shadow-[0_0_20px_rgba(29,185,84,0.3)] md:bg-primary/20'
                      : 'bg-primary/20'
                  }`}>
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
                  <div className={`flex p-1 rounded-full mb-6 ${
                    isLiquidGlass
                      ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-xl max-md:border max-md:border-white/15 md:bg-surface-highlight'
                      : 'bg-surface-highlight'
                  }`}>
                      <button
                          type="button"
                          onClick={() => { setRole('ARTIST'); setMessage(""); }}
                          className={`flex-1 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                            role === 'ARTIST'
                              ? isLiquidGlass
                                ? 'max-md:bg-primary max-md:text-black max-md:shadow-[0_4px_16px_rgba(29,185,84,0.4)] md:bg-primary md:text-black md:shadow-lg'
                                : 'bg-primary text-black shadow-lg'
                              : 'text-secondary hover:text-white'
                          }`}
                      >
                          {t('artist')}
                      </button>

                      <button
                          type="button"
                          onClick={() => { setRole('MODERATOR'); setMessage(""); }}
                          className={`flex-1 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                            role === 'MODERATOR'
                              ? isLiquidGlass
                                ? 'max-md:bg-primary max-md:text-black max-md:shadow-[0_4px_16px_rgba(29,185,84,0.4)] md:bg-primary md:text-black md:shadow-lg'
                                : 'bg-primary text-black shadow-lg'
                              : 'text-secondary hover:text-white'
                          }`}
                      >
                          Moderator
                      </button>
                  </div>
              )}

              {message && <div className="bg-red-500/20 text-red-500 p-3 rounded-xl mb-4 text-center text-sm animate-pulse border border-red-500/30">{message}</div>}

              <form onSubmit={authMode === 'LOGIN' ? handleLogin : handleRegister} className="flex flex-col gap-4">

                  {authMode === 'REGISTER' && role === 'ARTIST' && (
                      <div className="flex flex-col gap-2 animate-slide-up">
                          {!isCreatingNewArtist ? (
                              <CustomSelect
                                  value={artistNameSelection}
                                  onChange={(val) => setArtistNameSelection(val)}
                                  placeholder={`${t('select')} ${t('artist')}...`}
                                  options={existingArtists.map(a => ({ value: a, label: a }))}
                              />
                          ) : (
                              <input
                                  type="text"
                                  placeholder="New Artist Alias"
                                  value={newArtistAlias}
                                  onChange={e => setNewArtistAlias(e.target.value)}
                                  className={`p-3 rounded border focus:border-primary focus:outline-none transition-colors ${
                                    isLiquidGlass
                                      ? 'max-md:bg-white/[0.07] max-md:border-white/15 max-md:rounded-xl md:bg-background md:border-surface-highlight'
                                      : 'bg-background border-surface-highlight'
                                  }`}
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
                      className={`p-3 rounded border focus:border-primary focus:outline-none transition-colors ${
                        isLiquidGlass
                          ? 'max-md:bg-white/[0.07] max-md:border-white/15 max-md:rounded-xl md:bg-background md:border-surface-highlight'
                          : 'bg-background border-surface-highlight'
                      }`}
                  />
                  <input
                      type="password" placeholder={t('password')} value={password} onChange={e => setPassword(e.target.value)}
                      className={`p-3 rounded border focus:border-primary focus:outline-none transition-colors ${
                        isLiquidGlass
                          ? 'max-md:bg-white/[0.07] max-md:border-white/15 max-md:rounded-xl md:bg-background md:border-surface-highlight'
                          : 'bg-background border-surface-highlight'
                      }`}
                  />

                  <button type="submit" className={`bg-primary text-black font-bold py-3 rounded-full hover:scale-105 transition mt-2 ${
                    isLiquidGlass
                      ? 'max-md:shadow-[0_4px_20px_rgba(29,185,84,0.4),inset_0_1px_0_rgba(255,255,255,0.4)] md:shadow-lg md:hover:shadow-primary/20'
                      : 'shadow-lg hover:shadow-primary/20'
                  }`}>
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
               <button 
                 onClick={() => setView('MOD_DASH')} 
                 className={`text-secondary hover:text-white transition ${
                   isLiquidGlass ? 'max-md:w-9 max-md:h-9 max-md:rounded-full max-md:bg-white/[0.12] max-md:backdrop-blur-xl max-md:border max-md:border-white/15 max-md:flex max-md:items-center max-md:justify-center' : ''
                 }`}
               >
                 <ArrowLeft size={24}/>
               </button>
               <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3"><Key className="text-primary"/> {t('artistCreds')}</h1>
          </div>

          <div className={`flex-1 overflow-y-auto rounded-xl border ${
            isLiquidGlass
              ? 'max-md:bg-white/[0.06] max-md:backdrop-blur-2xl max-md:border-white/15 max-md:shadow-[0_8px_32px_rgba(0,0,0,0.4)] md:bg-surface md:border-surface-highlight'
              : 'bg-surface border-surface-highlight'
          }`}>
              <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-highlight/70 text-secondary text-xs uppercase font-bold sticky top-0 z-10 backdrop-blur-md">
                      <tr>
                          <th className="p-4">{t('artist')} Name</th>
                          <th className="p-4">{t('username')}</th>
                          <th className="p-4">{t('password')}</th>
                          <th className="p-4">{t('status')}</th>
                          <th className="p-4 text-right">{t('delete')}</th>
                      </tr>
                  </thead>
                  <tbody>
                      {artistAccounts.map(a => (
                          <tr key={a.id} className="border-b border-white/5 hover:bg-white/5 transition">
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
          tracks: a.trackIds.map((tid, idx) => {
              const t = tracks.find(tr => tr.id === tid) || 
                        tracks.find(tr => tr.album?.toLowerCase() === a.title.toLowerCase() && tr.artist?.toLowerCase() === a.artist?.toLowerCase());
              return {
                  title: t?.title || `Трек ${idx + 1}`,
                  explicit: t?.explicit || false,
                  duration: t?.duration || 180,
                  mainArtists: t?.mainArtists || [],
                  fileUrl: t?.url || "",
                  artist: t?.artist || a.artist,
                  existingHueq: t?.hueq,
                  generatedHueq: t?.hueq,
                  isEmpty: false,
                  isUnreleased: false
              };
          })
      }));

      const allDisplayReleases = [...releaseRequests, ...legacyAlbumsAsReleases].sort((a,b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());

      return (
      <div className="w-full h-full flex flex-col p-6 relative animate-fade-in">
          <div className="flex items-center gap-4 mb-8 shrink-0">
               <button 
                 onClick={() => setView('MOD_DASH')} 
                 className={`text-secondary hover:text-white transition ${
                   isLiquidGlass ? 'max-md:w-9 max-md:h-9 max-md:rounded-full max-md:bg-white/[0.12] max-md:backdrop-blur-xl max-md:border max-md:border-white/15 max-md:flex max-md:items-center max-md:justify-center' : ''
                 }`}
               >
                 <ArrowLeft size={24}/>
               </button>
               <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3"><Database className="text-primary"/> {t('manageReleases')}</h1>
          </div>

          <div className={`flex-1 overflow-y-auto rounded-xl border ${
            isLiquidGlass
              ? 'max-md:bg-white/[0.06] max-md:backdrop-blur-2xl max-md:border-white/15 max-md:shadow-[0_8px_32px_rgba(0,0,0,0.4)] md:bg-surface md:border-surface-highlight'
              : 'bg-surface border-surface-highlight'
          }`}>
             <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-highlight/70 text-secondary text-xs uppercase font-bold sticky top-0 z-10 backdrop-blur-md">
                        <tr>
                            <th className="p-4">{t('releaseTitle')}</th>
                            <th className="p-4">{t('artist')}</th>
                            <th className="p-4">{t('type')}</th>
                            <th className="p-4">{t('date')}</th>
                            <th className="p-4">{t('status')}</th>
                            <th className="p-4 text-right">{t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allDisplayReleases.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-secondary">{t('noReleases')}</td></tr>
                        )}
                        {allDisplayReleases.map((r: any, idx) => (
                            <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition cursor-pointer" onClick={() => setSelectedRelease(r)}>
                                <td className="p-4 flex items-center gap-3">
                                    <img src={r.covers && r.covers.length > 0 ? r.covers[0] : "https://picsum.photos/300"} className="w-10 h-10 rounded object-cover shadow-sm flex-shrink-0" />
                                    <span className="font-bold">{r.title}</span>
                                </td>
                                <td className="p-4 font-bold text-sm">{r.artistName}</td>
                                <td className="p-4 text-sm text-secondary">{r.type}</td>
                                <td className="p-4 text-sm text-secondary">{formatNumericReleaseDate(r.releaseDate)}</td>
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
               <button 
                 onClick={() => setView('MOD_DASH')} 
                 className={`text-secondary hover:text-white transition ${
                   isLiquidGlass ? 'max-md:w-9 max-md:h-9 max-md:rounded-full max-md:bg-white/[0.12] max-md:backdrop-blur-xl max-md:border max-md:border-white/15 max-md:flex max-md:items-center max-md:justify-center' : ''
                 }`}
               >
                 <ArrowLeft size={24}/>
               </button>
               <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3"><ListMusic className="text-primary"/> {t('manageTracks')}</h1>
          </div>

          <div className={`p-4 rounded-xl mb-4 text-sm text-secondary border ${
            isLiquidGlass
              ? 'max-md:bg-white/[0.06] max-md:backdrop-blur-xl max-md:border-white/10 md:bg-surface-highlight/20 md:border-transparent'
              : 'bg-surface-highlight/20 border-transparent'
          }`}>
              Only automatically generated test tracks (ID starts with 't') can be deleted individually here. User uploaded tracks must be managed via Releases.
          </div>

          <div className={`flex-1 overflow-y-auto rounded-xl border ${
            isLiquidGlass
              ? 'max-md:bg-white/[0.06] max-md:backdrop-blur-2xl max-md:border-white/15 max-md:shadow-[0_8px_32px_rgba(0,0,0,0.4)] md:bg-surface md:border-surface-highlight'
              : 'bg-surface border-surface-highlight'
          }`}>
              <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-highlight/70 text-secondary text-xs uppercase font-bold sticky top-0 z-10 backdrop-blur-md">
                      <tr>
                          <th className="p-4">{t('trackTitle')}</th>
                          <th className="p-4">{t('artist')}</th>
                          <th className="p-4">Album</th>
                          <th className="p-4">ID</th>
                          <th className="p-4 text-right">{t('delete')}</th>
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
                          <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition">
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
      <div className={`w-full max-w-md p-8 rounded-xl shadow-2xl animate-zoom-in relative ${
        isLiquidGlass
          ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-3xl max-md:border max-md:border-white/15 max-md:shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.25)] max-md:rounded-2xl md:bg-surface md:border md:border-surface-highlight'
          : 'bg-surface border border-surface-highlight'
      }`}>
          <button 
            onClick={() => setView('MOD_DASH')} 
            className={`absolute top-6 left-6 text-secondary hover:text-white ${
              isLiquidGlass ? 'max-md:w-8 max-md:h-8 max-md:rounded-full max-md:bg-white/[0.12] max-md:backdrop-blur-xl max-md:border max-md:border-white/15 max-md:flex max-md:items-center max-md:justify-center' : ''
            }`}
          >
            <ArrowLeft size={20}/>
          </button>
          <h2 className="text-2xl font-bold mb-6 text-center">Moderator Settings</h2>

          <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-secondary uppercase">{t('changePass')}</label>
                  <input
                      type="password"
                      value={modNewPassword}
                      onChange={e => setModNewPassword(e.target.value)}
                      className={`p-3 rounded border focus:border-primary focus:outline-none ${
                        isLiquidGlass
                          ? 'max-md:bg-white/[0.07] max-md:border-white/15 max-md:rounded-xl md:bg-background md:border-surface-highlight'
                          : 'bg-background border-surface-highlight'
                      }`}
                      placeholder={t('newPass')}
                  />
              </div>

              <button
                  onClick={handleModPasswordChange}
                  className={`bg-primary text-black font-bold py-3 rounded-full hover:scale-105 transition ${
                    isLiquidGlass
                      ? 'max-md:shadow-[0_4px_20px_rgba(29,185,84,0.4),inset_0_1px_0_rgba(255,255,255,0.4)] md:shadow-lg md:shadow-primary/20'
                      : 'shadow-lg shadow-primary/20'
                  }`}
              >
                  {t('updatePass')}
              </button>
          </div>
      </div>
  );

  const formatRussianDateTime = (dateString?: string): string => {
      if (!dateString) return '';
      try {
          const d = new Date(dateString);
          if (isNaN(d.getTime())) return dateString;
          return d.toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
          }) + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {
          return dateString;
      }
  };

  const formatRelativeTimeRussian = (dateString?: string): string => {
      if (!dateString) return 'только что';
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return 'недавно';
      const now = Date.now();
      const diffMs = Math.max(0, now - d.getTime());
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMin < 1) return 'только что';
      if (diffMin < 60) {
          if (diffMin === 1 || (diffMin > 20 && diffMin % 10 === 1)) return `${diffMin} минуту назад`;
          if ((diffMin >= 2 && diffMin <= 4) || (diffMin > 20 && diffMin % 10 >= 2 && diffMin % 10 <= 4)) return `${diffMin} минуты назад`;
          return `${diffMin} минут назад`;
      }
      if (diffHours < 24) {
          if (diffHours === 1 || diffHours === 21) return `${diffHours} час назад`;
          if ((diffHours >= 2 && diffHours <= 4) || (diffHours >= 22 && diffHours <= 24)) return `${diffHours} часа назад`;
          return `${diffHours} часов назад`;
      }
      if (diffDays === 1) return '1 день назад';
      if (diffDays >= 2 && diffDays <= 4) return `${diffDays} дня назад`;
      return `${diffDays} дней назад`;
  };

  const formatTrackWordRussian = (count: number): string => {
      if (count % 10 === 1 && count % 100 !== 11) return '1 трек';
      if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return `${count} трека`;
      return `${count} треков`;
  };

  const formatDraftDate = (dateString?: string): string => {
      if (!dateString) return '';
      try {
          const d = new Date(dateString);
          if (isNaN(d.getTime())) return dateString;
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return `${day}.${month}.${year} ${time}`;
      } catch {
          return dateString;
      }
  };

  const renderModDash = () => {
      const pendingReleases = releaseRequests.filter(r => (r.status === 'PENDING' || r.deletionRequested));
      const pendingArtists = artistAccounts.filter(a => a.status === 'PENDING');
      const pendingProfileEdits = profileEditRequests.filter(r => r.status === 'PENDING');
      const pendingVerificationRequests = verificationRequests.filter(r => r.status === 'PENDING' || r.status === 'IN_REVIEW');

      // Releases filtering & sorting
      let displayReleases = pendingReleases.filter(r => {
          if (!modSearch.trim()) return true;
          const q = modSearch.toLowerCase();
          return (r.title || '').toLowerCase().includes(q) || 
                 (r.artistName || '').toLowerCase().includes(q) || 
                 (r.type || '').toLowerCase().includes(q);
      });
      displayReleases.sort((a, b) => {
          const timeA = new Date(a.submissionTime || a.releaseDate || 0).getTime();
          const timeB = new Date(b.submissionTime || b.releaseDate || 0).getTime();
          return modSortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      });

      // Artists filtering & sorting
      let displayArtists = pendingArtists.filter(a => {
          if (!modSearch.trim()) return true;
          const q = modSearch.toLowerCase();
          return (a.artistName || '').toLowerCase().includes(q) || 
                 (a.username || '').toLowerCase().includes(q);
      });

      // Profile edits filtering & sorting
      let displayProfiles = pendingProfileEdits.filter(r => {
          if (!modSearch.trim()) return true;
          const q = modSearch.toLowerCase();
          return (r.artistName || '').toLowerCase().includes(q);
      });
      displayProfiles.sort((a, b) => {
          const timeA = a.id.startsWith('pe_') ? parseInt(a.id.replace('pe_', '')) : 0;
          const timeB = b.id.startsWith('pe_') ? parseInt(b.id.replace('pe_', '')) : 0;
          return modSortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      });

      // Verification requests filtering & sorting
      let displayVerifications = verificationRequests.filter(r => {
          if (!modSearch.trim()) return true;
          const q = modSearch.toLowerCase();
          return (r.artistName || '').toLowerCase().includes(q) ||
                 (r.telegramUsername || '').toLowerCase().includes(q) ||
                 (r.verificationCode || '').toLowerCase().includes(q) ||
                 (r.status || '').toLowerCase().includes(q);
      });
      displayVerifications.sort((a, b) => {
          const timeA = new Date(a.submittedAt || 0).getTime();
          const timeB = new Date(b.submittedAt || 0).getTime();
          return modSortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      });

      const totalModerationCount = pendingReleases.length + pendingArtists.length + pendingProfileEdits.length + pendingVerificationRequests.length;

      return (
      <div className="w-full h-full flex flex-col p-3.5 sm:p-6 relative overflow-y-auto animate-fade-in pb-12">
          <div className="flex justify-between items-center mb-6 sm:mb-8 shrink-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2.5"><Shield className="text-primary"/> {t('modDash')}</h1>
              <button 
                onClick={() => setView('MOD_SETTINGS')} 
                className={`text-secondary hover:text-white transition p-2 rounded-full hover:bg-surface-highlight ${
                  isLiquidGlass ? 'max-md:bg-white/[0.12] max-md:backdrop-blur-xl max-md:border max-md:border-white/15' : ''
                }`}
              >
                  <Settings size={22}/>
              </button>
          </div>

          {/* Quick Actions Grid for Mod */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 mb-8 shrink-0">
                <button 
                  onClick={() => { resetDistForm(false); setView('DISTRIBUTION'); }} 
                  className={`p-4 sm:p-6 rounded-2xl flex flex-col items-center justify-center gap-2 hover:scale-105 transition font-bold h-24 sm:h-28 md:h-32 w-full ${
                    isLiquidGlass
                      ? 'max-md:bg-primary max-md:text-black max-md:shadow-[0_6px_24px_rgba(29,185,84,0.4),inset_0_1px_0_rgba(255,255,255,0.4)] max-md:rounded-2xl md:bg-primary md:text-black md:shadow-lg md:hover:shadow-primary/20'
                      : 'bg-primary text-black shadow-lg hover:shadow-primary/20'
                  }`}
                >
                    <UploadCloud size={24}/>
                    <span className="text-xs sm:text-sm">{t('uploadRelease')}</span>
                </button>
                <button 
                  onClick={() => { resetDistForm(true); setView('DISTRIBUTION'); }} 
                  className={`p-4 sm:p-6 rounded-2xl flex flex-col items-center justify-center gap-2 hover:scale-105 transition font-bold h-24 sm:h-28 md:h-32 w-full border border-purple-500/30 ${
                    isLiquidGlass
                      ? 'max-md:bg-purple-600/30 max-md:backdrop-blur-2xl max-md:text-white max-md:shadow-[0_6px_24px_rgba(168,85,247,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] max-md:rounded-2xl md:bg-purple-950/40 md:text-purple-300 md:hover:bg-purple-900/60 md:hover:text-white'
                      : 'bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 hover:text-white'
                  }`}
                >
                    <Megaphone size={24} className="text-purple-400"/>
                    <span className="text-xs sm:text-sm">Анонс альбома</span>
                </button>
                <button 
                  onClick={() => setView('MOD_ALL_RELEASES')} 
                  className={`p-4 sm:p-6 rounded-2xl flex flex-col items-center justify-center gap-2 transition font-bold h-24 sm:h-28 md:h-32 hover:scale-105 w-full ${
                    isLiquidGlass
                      ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-2xl max-md:border max-md:border-white/15 max-md:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] max-md:rounded-2xl md:bg-surface md:border md:border-surface-highlight md:hover:bg-surface-highlight'
                      : 'bg-surface border border-surface-highlight hover:bg-surface-highlight'
                  }`}
                >
                    <Database size={24} className="text-secondary"/>
                    <span className="text-xs sm:text-sm">{t('manageReleases')}</span>
                </button>
                <button 
                  onClick={() => setView('MOD_ALL_TRACKS')} 
                  className={`p-4 sm:p-6 rounded-2xl flex flex-col items-center justify-center gap-2 transition font-bold h-24 sm:h-28 md:h-32 hover:scale-105 w-full ${
                    isLiquidGlass
                      ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-2xl max-md:border max-md:border-white/15 max-md:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] max-md:rounded-2xl md:bg-surface md:border md:border-surface-highlight md:hover:bg-surface-highlight'
                      : 'bg-surface border border-surface-highlight hover:bg-surface-highlight'
                  }`}
                >
                    <ListMusic size={24} className="text-secondary"/>
                    <span className="text-xs sm:text-sm">{t('manageTracks')}</span>
                </button>
                <button 
                  onClick={() => setView('MOD_CREDENTIALS')} 
                  className={`p-4 sm:p-6 rounded-2xl flex flex-col items-center justify-center gap-2 transition font-bold h-24 sm:h-28 md:h-32 hover:scale-105 col-span-2 sm:col-span-1 w-full ${
                    isLiquidGlass
                      ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-2xl max-md:border max-md:border-white/15 max-md:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] max-md:rounded-2xl md:bg-surface md:border md:border-surface-highlight md:hover:bg-surface-highlight'
                      : 'bg-surface border border-surface-highlight hover:bg-surface-highlight'
                  }`}
                >
                    <Key size={24} className="text-secondary"/>
                    <span className="text-xs sm:text-sm">{t('artistCreds')}</span>
                </button>
          </div>

          {/* Saved Drafts Section for Mod */}
          {drafts.length > 0 && (
              <div className="mb-8 shrink-0">
                  <div className="flex justify-between items-center mb-3">
                      <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-white">
                          <Bookmark size={18} className="text-primary" />
                          <span>Черновики</span>
                          <span className="text-xs sm:text-sm font-normal text-secondary">({drafts.length})</span>
                      </h2>
                      <span className="text-xs text-secondary hidden sm:inline">Неопубликованные черновики релизов</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {drafts.map(d => (
                          <div 
                            key={d.id} 
                            className={`p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between gap-3 group transition ${
                              isLiquidGlass
                                ? 'bg-zinc-900/60 backdrop-blur-2xl border border-white/10 shadow-[0_6px_24px_-4px_rgba(0,0,0,0.4)]'
                                : 'bg-[#101013] border border-white/10'
                            }`}
                          >
                              <div className="flex items-start gap-3">
                                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-surface-highlight overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/5 shadow-md">
                                      {d.covers && d.covers.length > 0 ? (
                                          <img src={d.covers[0]} className="w-full h-full object-cover" alt="" />
                                      ) : (
                                          <FileAudio size={22} className="text-secondary opacity-60" />
                                      )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <div className="font-bold text-sm sm:text-base truncate text-white">
                                          {d.title || <span className="italic text-secondary">Без названия</span>}
                                      </div>
                                      <div className="text-xs text-secondary truncate mt-0.5 font-medium">
                                          {d.artistName || "Various"} • {d.type || 'Single'} • {formatTrackWordRussian(d.tracks?.length || 0)}
                                      </div>
                                      <div className="text-xs text-secondary/70 mt-1 flex items-center gap-1">
                                          <Clock size={11} className="text-secondary/70 shrink-0" />
                                          <span className="truncate">{formatDraftDate(d.lastSaved)}</span>
                                      </div>
                                  </div>
                              </div>

                              <div className="flex items-center justify-between pt-2.5 border-t border-white/5 mt-1 gap-2">
                                  <button
                                      onClick={(e) => handleDeleteDraft(d.id, e)}
                                      className="text-xs text-zinc-400 hover:text-red-400 transition flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-white/5 shrink-0"
                                      title={t('deleteDraft')}
                                  >
                                      <Trash2 size={13} />
                                      <span>Удалить черновик</span>
                                  </button>
                                  <button
                                      onClick={() => handleResumeDraft(d)}
                                      className="text-xs font-bold bg-[#1ed760] hover:bg-[#1db954] text-black px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full hover:scale-105 active:scale-95 transition flex items-center gap-1.5 shadow-md shrink-0"
                                  >
                                      <Edit size={12} />
                                      <span>Продолжить</span>
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* "На модерации" Section */}
          <div className="mb-8 flex flex-col gap-4 shrink-0">
              {/* Header with count badge */}
              <div className="flex items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">На модерации</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#1ed760]/20 text-[#1ed760] border border-[#1ed760]/30">
                      {totalModerationCount}
                  </span>
              </div>

              {/* Controls Bar: Tabs on Left, Search & Sort on Right */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 min-w-0 w-full">
                  {/* Tabs - with scrollbar hidden and min-w-0 w-full */}
                  <div className="flex items-center gap-2 overflow-x-auto min-w-0 w-full pb-1.5 sm:pb-0 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] touch-pan-x">
                      <button
                          type="button"
                          onClick={() => setModTab('releases')}
                          className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition shrink-0 ${
                              modTab === 'releases'
                                  ? 'bg-[#1ed760] text-black shadow-md'
                                  : 'bg-[#18181b] text-zinc-400 hover:text-white border border-white/5'
                          }`}
                      >
                          <span>Релизы</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${modTab === 'releases' ? 'bg-black/20 text-black' : 'text-zinc-400 bg-white/5'}`}>
                              {pendingReleases.length}
                          </span>
                      </button>

                      <button
                          type="button"
                          onClick={() => setModTab('artists')}
                          className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition shrink-0 ${
                              modTab === 'artists'
                                  ? 'bg-[#1ed760] text-black shadow-md'
                                  : 'bg-[#18181b] text-zinc-400 hover:text-white border border-white/5'
                          }`}
                      >
                          <span>Заявки артистов</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${modTab === 'artists' ? 'bg-black/20 text-black' : 'text-zinc-400 bg-white/5'}`}>
                              {pendingArtists.length}
                          </span>
                      </button>

                      <button
                          type="button"
                          onClick={() => setModTab('profiles')}
                          className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition shrink-0 ${
                              modTab === 'profiles'
                                  ? 'bg-[#1ed760] text-black shadow-md'
                                  : 'bg-[#18181b] text-zinc-400 hover:text-white border border-white/5'
                          }`}
                      >
                          <span>Изменения профиля</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${modTab === 'profiles' ? 'bg-black/20 text-black' : 'text-zinc-400 bg-white/5'}`}>
                              {pendingProfileEdits.length}
                          </span>
                      </button>

                      <button
                          type="button"
                          onClick={() => setModTab('verification')}
                          className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition shrink-0 ${
                              modTab === 'verification'
                                  ? 'bg-[#1ed760] text-black shadow-md'
                                  : 'bg-[#18181b] text-zinc-400 hover:text-white border border-white/5'
                          }`}
                      >
                          <span>Проверка верификации</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${modTab === 'verification' ? 'bg-black/20 text-black' : 'text-zinc-400 bg-white/5'}`}>
                              {pendingVerificationRequests.length}
                          </span>
                      </button>
                  </div>

                  {/* Search and Sort */}
                  <div className="flex items-center gap-2 flex-col sm:flex-row w-full sm:w-auto">
                      <div className="relative w-full sm:w-48">
                          <Search className="absolute left-3 top-2.5 text-zinc-500" size={14} />
                          <input
                              type="text"
                              placeholder="Поиск заявок..."
                              value={modSearch}
                              onChange={e => setModSearch(e.target.value)}
                              className="w-full bg-[#121215] text-white text-xs pl-8 pr-3 py-2 rounded-xl border border-white/10 placeholder-zinc-500 focus:outline-none focus:border-white/30 transition"
                          />
                          {modSearch && (
                              <button onClick={() => setModSearch('')} className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-white">
                                  <X size={13} />
                              </button>
                          )}
                      </div>

                      <button
                          type="button"
                          onClick={() => setModSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                          className="w-full sm:w-auto justify-between px-3 py-2 rounded-xl bg-[#121215] border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-2 transition shrink-0"
                          title="Изменить порядок сортировки"
                      >
                          <span className="flex items-center gap-1.5">
                            <SlidersHorizontal size={13} className="text-zinc-400" />
                            <span>{modSortOrder === 'newest' ? 'Сначала новые' : 'Сначала старые'}</span>
                          </span>
                          <ChevronDown size={13} className="text-zinc-500" />
                      </button>
                  </div>
              </div>

              {/* Items List */}
              <div className="flex flex-col gap-3">
                  {/* 1. Tab: Releases */}
                  {modTab === 'releases' && (
                      <>
                          {displayReleases.length === 0 && (
                              <div className="p-8 text-center text-zinc-500 text-sm rounded-2xl bg-[#101013] border border-white/5">
                                  {modSearch ? 'Ничего не найдено по вашему запросу' : 'Нет заявок на модерацию релизов'}
                              </div>
                          )}
                          {displayReleases.map(r => (
                              <div 
                                  key={r.id} 
                                  className="bg-[#101013] border border-white/5 hover:border-white/10 rounded-2xl p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition group"
                              >
                                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                                      <img 
                                          src={r.covers && r.covers.length > 0 ? r.covers[0] : "https://picsum.photos/300"} 
                                          className="w-14 h-14 rounded-xl object-cover shrink-0 bg-zinc-800 shadow-md" 
                                          alt={r.title}
                                      />
                                      <div className="flex flex-col min-w-0 flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-bold text-white text-sm sm:text-base truncate">{r.title}</span>
                                              {r.isAnnouncement && <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">Анонс</span>}
                                              {r.deletionRequested && <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">{t('deleteReq', 'Запрос на удаление')}</span>}
                                          </div>
                                          <div className="text-xs text-zinc-400 font-medium truncate mt-0.5">
                                              {r.artistName}
                                          </div>
                                          <div className="text-xs text-zinc-400 font-normal truncate">
                                              {r.type} • {formatTrackWordRussian(r.tracks?.length || 0)}
                                          </div>
                                          <div className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1 flex-wrap">
                                              <span className="flex items-center gap-1 truncate">
                                                  <Clock size={11} className="text-zinc-400 shrink-0" />
                                                  <span>{formatRussianDateTime(r.submissionTime || r.releaseDate)}</span>
                                              </span>
                                              <span className="text-zinc-600">•</span>
                                              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shrink-0" />
                                                  <span>{formatRelativeTimeRussian(r.submissionTime || r.releaseDate)}</span>
                                              </span>
                                          </div>
                                      </div>
                                  </div>

                                  <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap pt-2 border-t border-white/5 md:border-0 md:pt-0 shrink-0">
                                      <button 
                                          type="button"
                                          onClick={() => setSelectedRelease(r)}
                                          className="flex-1 sm:flex-initial border border-white/20 hover:border-white/40 text-white hover:bg-white/10 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                                          title="Открыть превью релиза"
                                      >
                                          <span>Открыть</span>
                                          <Maximize2 size={12} className="shrink-0 opacity-80" />
                                      </button>

                                      {r.deletionRequested ? (
                                          <>
                                              <button 
                                                  type="button"
                                                  onClick={() => approveRelease(r.id)} 
                                                  className="flex-1 sm:flex-initial border border-red-500/40 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                                              >
                                                  <Trash2 size={12} className="shrink-0" />
                                                  <span>Подтвердить</span>
                                              </button>
                                              <button 
                                                  type="button"
                                                  onClick={() => rejectRelease(r.id)} 
                                                  className="flex-1 sm:flex-initial border border-zinc-600 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                                              >
                                                  <X size={12} className="shrink-0" />
                                                  <span>Отклонить</span>
                                              </button>
                                          </>
                                      ) : (
                                          <>
                                              <button 
                                                  type="button"
                                                  onClick={() => approveRelease(r.id)} 
                                                  className="flex-1 sm:flex-initial border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500 hover:text-black text-emerald-400 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                                              >
                                                  <Check size={13} strokeWidth={3} className="shrink-0" />
                                                  <span>Принять</span>
                                              </button>
                                              <button 
                                                  type="button"
                                                  onClick={() => rejectRelease(r.id)} 
                                                  className="flex-1 sm:flex-initial border border-red-500/40 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                                              >
                                                  <X size={13} strokeWidth={2.5} className="shrink-0" />
                                                  <span>Отклонить</span>
                                              </button>
                                          </>
                                      )}
                                  </div>
                              </div>
                          ))}
                      </>
                  )}

                  {/* 2. Tab: Artist Registrations */}
                  {modTab === 'artists' && (
                      <>
                          {displayArtists.length === 0 && (
                              <div className="p-8 text-center text-zinc-500 text-sm rounded-2xl bg-[#101013] border border-white/5">
                                  {modSearch ? 'Ничего не найдено по вашему запросу' : 'Нет новых заявок на верификацию артистов'}
                              </div>
                          )}
                          {displayArtists.map(a => (
                              <div 
                                  key={a.id} 
                                  className="bg-[#101013] border border-white/5 hover:border-white/10 rounded-2xl p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition group"
                              >
                                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-zinc-800 shadow-md flex items-center justify-center shrink-0">
                                          {a.avatar ? (
                                              <img src={a.avatar} className="w-full h-full object-cover" alt={a.artistName} />
                                          ) : (
                                              <User size={24} className="text-zinc-500" />
                                          )}
                                      </div>
                                      <div className="flex flex-col min-w-0 flex-1">
                                          <span className="font-bold text-white text-sm sm:text-base truncate">{a.artistName}</span>
                                          <span className="text-xs text-zinc-400 font-medium">@{a.username}</span>
                                          <div className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1">
                                              <Clock size={11} className="text-zinc-400 shrink-0" />
                                              <span>Заявка на регистрацию артиста</span>
                                          </div>
                                      </div>
                                  </div>

                                  <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap pt-2 border-t border-white/5 md:border-0 md:pt-0 shrink-0">
                                      <button 
                                          type="button"
                                          onClick={() => approveArtist(a.id)} 
                                          className="flex-1 sm:flex-initial border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500 hover:text-black text-emerald-400 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                                      >
                                          <Check size={13} strokeWidth={3} className="shrink-0" />
                                          <span>Принять</span>
                                      </button>
                                      <button 
                                          type="button"
                                          onClick={() => rejectArtist(a.id)} 
                                          className="flex-1 sm:flex-initial border border-red-500/40 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                                      >
                                          <X size={13} strokeWidth={2.5} className="shrink-0" />
                                          <span>Отклонить</span>
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </>
                  )}

                  {/* 3. Tab: Profile Changes */}
                  {modTab === 'profiles' && (
                      <>
                          {displayProfiles.length === 0 && (
                              <div className="p-8 text-center text-zinc-500 text-sm rounded-2xl bg-[#101013] border border-white/5">
                                  {modSearch ? 'Ничего не найдено по вашему запросу' : 'Нет заявок на изменение профиля'}
                              </div>
                          )}
                          {displayProfiles.map(r => {
                              const existingArtist = artistAccounts.find(a => a.id === r.artistId);
                              const avatarImg = r.newAvatar || existingArtist?.avatar || "https://picsum.photos/300";
                              const requestDateStr = r.id.startsWith('pe_') ? new Date(parseInt(r.id.replace('pe_', ''))).toISOString() : new Date().toISOString();

                              return (
                                  <div 
                                      key={r.id} 
                                      className="bg-[#101013] border border-white/5 hover:border-white/10 rounded-2xl p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition group"
                                  >
                                      <div className="flex items-center gap-3.5 min-w-0 md:w-1/3">
                                          <img 
                                              src={avatarImg} 
                                              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover shrink-0 bg-zinc-800 shadow-md" 
                                              alt={r.artistName}
                                          />
                                          <div className="flex flex-col min-w-0 flex-1">
                                              <span className="font-bold text-white text-sm sm:text-base truncate">{r.artistName}</span>
                                              <span className="text-xs text-zinc-400 font-medium">Изменение профиля</span>
                                              <div className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1">
                                                  <Clock size={11} className="text-zinc-400 shrink-0" />
                                                  <span>{formatRussianDateTime(requestDateStr)}</span>
                                              </div>
                                          </div>
                                      </div>

                                      {/* Middle: Details of what changed */}
                                      <div className="flex flex-col gap-1 text-xs md:w-1/3 min-w-0">
                                          {r.newBio && (
                                              <div className="flex items-start gap-3">
                                                  <span className="text-zinc-400 font-medium w-14 shrink-0">Bio</span>
                                                  <span className="text-zinc-200 truncate">изменено</span>
                                              </div>
                                          )}
                                          {r.newAvatar && (
                                              <div className="flex items-start gap-3">
                                                  <span className="text-zinc-400 font-medium w-14 shrink-0">Аватар</span>
                                                  <span className="text-zinc-200 truncate">новый</span>
                                              </div>
                                          )}
                                          {r.newArtistPick && (
                                              <div className="flex items-start gap-3">
                                                  <span className="text-zinc-400 font-medium w-14 shrink-0">Выбор</span>
                                                  <span className="text-zinc-200 truncate">{r.newArtistPick.subtitle || 'изменен'}</span>
                                              </div>
                                          )}
                                      </div>

                                      {/* Right: Actions */}
                                      <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap pt-2 border-t border-white/5 md:border-0 md:pt-0 shrink-0">
                                          <button 
                                              type="button"
                                              onClick={() => {
                                                  goToArtist(r.artistName);
                                                  setArtistHubOpen(false);
                                              }}
                                              className="flex-1 sm:flex-initial border border-white/20 hover:border-white/40 text-white hover:bg-white/10 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                                              title="Открыть профиль артиста"
                                          >
                                              <span>Открыть профиль</span>
                                              <Maximize2 size={12} className="shrink-0 opacity-80" />
                                          </button>
                                          <button 
                                              type="button"
                                              onClick={() => approveProfileEdit(r.id)} 
                                              className="flex-1 sm:flex-initial border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500 hover:text-black text-emerald-400 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                                          >
                                              <Check size={13} strokeWidth={3} className="shrink-0" />
                                              <span>Принять</span>
                                          </button>
                                          <button 
                                              type="button"
                                              onClick={() => rejectProfileEdit(r.id)} 
                                              className="flex-1 sm:flex-initial border border-red-500/40 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                                          >
                                              <X size={13} strokeWidth={2.5} className="shrink-0" />
                                              <span>Отклонить</span>
                                          </button>
                                      </div>
                                  </div>
                              );
                          })}
                      </>
                  )}

                  {/* 4. Tab: Verification Applications */}
                  {modTab === 'verification' && (
                      <>
                          {displayVerifications.length === 0 && (
                              <div className="p-8 text-center text-zinc-500 text-sm rounded-2xl bg-[#101013] border border-white/5">
                                  {modSearch ? 'Ничего не найдено по вашему запросу' : 'Нет заявок на верификацию'}
                              </div>
                          )}
                          {displayVerifications.map(r => {
                              const existingArtist = artistAccounts.find(a => a.id === r.artistId || (a.artistName || '').toLowerCase() === (r.artistName || '').toLowerCase());
                              const avatarImg = existingArtist?.avatar || "https://picsum.photos/300";

                              const statusBadge = 
                                r.status === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                                r.status === 'IN_REVIEW' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                                r.status === 'REJECTED' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                                'bg-amber-500/15 text-amber-400 border border-amber-500/30';

                              const statusLabel = 
                                r.status === 'APPROVED' ? 'Одобрено' :
                                r.status === 'IN_REVIEW' ? 'На рассмотрении' :
                                r.status === 'REJECTED' ? 'Отклонено' :
                                'Ожидает рассмотрения';

                              const roleLabel = 
                                r.applicantRole === 'ARTIST' ? 'Сам артист' :
                                r.applicantRole === 'REPRESENTATIVE' ? 'Представитель' :
                                'Каталог';

                              const methodLabel = 
                                r.proofMethod === 'SOCIAL' ? 'Соц. сети' :
                                r.proofMethod === 'TELEGRAM' ? 'Telegram' :
                                'Другой способ';

                              return (
                                  <div 
                                      key={r.id} 
                                      className="bg-[#101013] border border-white/5 hover:border-white/10 rounded-2xl p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition group"
                                  >
                                      {/* Left: Avatar + Name + Submission date */}
                                      <div className="flex items-center gap-3.5 min-w-0 md:w-1/3">
                                          <img 
                                              src={avatarImg} 
                                              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover shrink-0 bg-zinc-800 shadow-md" 
                                              alt={r.artistName}
                                          />
                                          <div className="flex flex-col min-w-0 flex-1">
                                              <div className="flex items-center gap-2">
                                                  <span className="font-bold text-white text-sm sm:text-base truncate">{r.artistName}</span>
                                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusBadge}`}>
                                                      {statusLabel}
                                                  </span>
                                              </div>
                                              <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
                                                  <span>{roleLabel}</span>
                                                  <span>•</span>
                                                  <span>{methodLabel}</span>
                                              </div>
                                              <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-1">
                                                  <Clock size={11} className="text-zinc-400 shrink-0" />
                                                  <span>{formatRussianDateTime(r.submittedAt)}</span>
                                              </div>
                                          </div>
                                      </div>

                                      {/* Middle: Proof snippet */}
                                      <div className="flex flex-col gap-1 text-xs md:w-1/3 min-w-0">
                                          {r.proofMethod === 'SOCIAL' && (
                                              <div className="flex flex-col gap-1">
                                                  <div className="text-zinc-400 truncate">
                                                      Канал: <span className="text-zinc-200">{r.socialLink}</span>
                                                  </div>
                                                  {r.verificationCode && (
                                                      <div className="flex items-center gap-2">
                                                          <span className="text-zinc-400">Код:</span>
                                                          <span className="font-mono font-bold text-primary bg-black/40 px-2 py-0.5 rounded border border-white/10">
                                                              {r.verificationCode}
                                                          </span>
                                                      </div>
                                                  )}
                                              </div>
                                          )}
                                          {r.proofMethod === 'TELEGRAM' && (
                                              <div className="text-zinc-400">
                                                  Telegram: <span className="text-white font-semibold">{r.telegramUsername}</span>
                                              </div>
                                          )}
                                          {r.proofMethod === 'OTHER' && (
                                              <div className="text-zinc-400 truncate">
                                                  Способ: <span className="text-zinc-200">{r.otherProofText}</span>
                                              </div>
                                          )}
                                      </div>

                                      {/* Right: Actions */}
                                      <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap pt-2 border-t border-white/5 md:border-0 md:pt-0 shrink-0">
                                          {r.status === 'PENDING' && (
                                              <button 
                                                  type="button"
                                                  onClick={() => startReviewVerificationRequest(r.id)} 
                                                  className="flex-1 sm:flex-initial border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-400 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                                                  title="Взять на рассмотрение"
                                              >
                                                  <Clock size={13} className="shrink-0" />
                                                  <span>Взять на рассмотрение</span>
                                              </button>
                                          )}
                                          <button 
                                              type="button"
                                              onClick={() => setSelectedVerificationRequest(r)}
                                              className="flex-1 sm:flex-initial border border-white/20 hover:border-white/40 text-white hover:bg-white/10 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                                              title="Открыть заявку"
                                          >
                                              <span>Открыть заявку</span>
                                              <Maximize2 size={12} className="shrink-0 opacity-80" />
                                          </button>
                                          {r.status !== 'APPROVED' && (
                                              <button 
                                                  type="button"
                                                  onClick={() => approveVerificationRequest(r.id)} 
                                                  className="flex-1 sm:flex-initial border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500 hover:text-black text-emerald-400 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                                              >
                                                  <Check size={13} strokeWidth={3} className="shrink-0" />
                                                  <span>Принять</span>
                                              </button>
                                          )}
                                          {r.status !== 'REJECTED' && (
                                              <button 
                                                  type="button"
                                                  onClick={() => {
                                                      setRejectModalReqId(r.id);
                                                      setRejectReasonInput('');
                                                  }} 
                                                  className="flex-1 sm:flex-initial border border-red-500/40 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                                              >
                                                  <X size={13} strokeWidth={2.5} className="shrink-0" />
                                                  <span>Отклонить</span>
                                              </button>
                                          )}
                                      </div>
                                  </div>
                              );
                          })}
                      </>
                  )}
              </div>
          </div>

          <div className="mt-auto pt-4">
              <button
                  onClick={() => { logoutArtistHub(); setView('AUTH'); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-secondary hover:text-white hover:bg-red-500 transition font-bold text-xs sm:text-sm shadow-lg ${
                    isLiquidGlass
                      ? 'max-md:bg-white/[0.12] max-md:backdrop-blur-xl max-md:border max-md:border-white/15 max-md:shadow-[0_4px_16px_rgba(0,0,0,0.3)] md:bg-surface-highlight'
                      : 'bg-surface-highlight'
                  }`}
              >
                  <LogOut size={16} />
                  <span>{t('logout')}</span>
              </button>
          </div>
      </div>
  );
  };

  const renderDistribution = () => (
      <div className={`w-full max-w-4xl p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl animate-zoom-in relative mb-12 ${
        isLiquidGlass
          ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-3xl max-md:border max-md:border-white/15 max-md:shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.25)] max-md:rounded-2xl md:bg-surface md:border md:border-surface-highlight'
          : 'bg-surface border border-surface-highlight'
      }`}>
          <div className="flex justify-between items-center mb-6">
              <button 
                onClick={() => currentModerator ? setView('MOD_DASH') : setView('ARTIST_DASH')} 
                className={`text-secondary hover:text-white flex items-center gap-2 text-sm font-medium transition ${
                  isLiquidGlass ? 'max-md:px-3 max-md:py-1.5 max-md:rounded-full max-md:bg-white/[0.08] max-md:border max-md:border-white/10' : ''
                }`}
              >
                  <ArrowLeft size={20}/>
                  <span>{t('back')}</span>
              </button>

              <div className="flex items-center gap-3">
                  <button
                      onClick={() => saveCurrentDraft(true)}
                      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full text-secondary hover:text-white transition border ${
                        isLiquidGlass
                          ? 'max-md:bg-white/[0.1] max-md:backdrop-blur-xl max-md:border-white/15 max-md:shadow-[0_2px_10px_rgba(0,0,0,0.2)] md:bg-surface-highlight md:hover:bg-zinc-700 md:border-white/5'
                          : 'bg-surface-highlight hover:bg-zinc-700 border-white/5'
                      }`}
                      title={t('saveDraft')}
                  >
                      <Bookmark size={14} className={activeDraftId ? "text-primary" : ""} />
                      <span>{t('saveDraft')}</span>
                      {lastSavedTime && <span className="text-[10px] text-primary/80 font-mono">({lastSavedTime})</span>}
                  </button>
              </div>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">{isEditing ? t('updateRelease') : t('uploadNew')}</h2>

          <div className="flex justify-center gap-4 mb-8">
              {[1, 2, 3].map(s => (
                  <div key={s} className={`w-3 h-3 rounded-full ${distStep >= s ? 'bg-primary' : 'bg-surface-highlight'}`} />
              ))}
          </div>

          {distStep === 1 && (
              <div className="flex flex-col gap-6 animate-slide-in-right">
                  <h3 className="text-xl font-bold">{t('step1')}</h3>

                  {/* Announcement Settings Card */}
                  <div className={`p-4 rounded-xl border flex flex-col gap-3 transition ${
                    isAnnouncement 
                      ? 'bg-surface/60 border-white/20 shadow-lg' 
                      : 'bg-surface/30 border-surface-highlight/60'
                  }`}>
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isAnnouncement ? 'bg-white text-black' : 'bg-surface-highlight text-secondary'}`}>
                                  <Megaphone size={18} />
                              </div>
                              <div>
                                  <div className="text-sm font-bold text-white flex items-center gap-2">
                                      <span>Анонс релиза (Expected Release)</span>
                                  </div>
                                  <div className="text-xs text-secondary">Позволяет опубликовать страницу релиза до даты выхода, как в Spotify</div>
                              </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                              <input 
                                type="checkbox" 
                                checked={isAnnouncement} 
                                onChange={e => {
                                    const nextChecked = e.target.checked;
                                    setIsAnnouncement(nextChecked);
                                    if (nextChecked && distType === 'Single') {
                                        setDistType('Album');
                                    }
                                }} 
                                className="sr-only peer" 
                              />
                              <div className="w-11 h-6 bg-surface-highlight peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white peer-checked:after:bg-black"></div>
                          </label>
                      </div>

                      {isAnnouncement && (
                          <div className="pt-3 border-t border-white/10 flex flex-col gap-3 animate-fade-in text-xs">
                              {/* Custom UI Checkbox for Hiding Track Metadata */}
                              <div 
                                onClick={() => setHideTrackMetadata(!hideTrackMetadata)}
                                className="flex items-start justify-between gap-3 p-3 rounded-lg bg-black/30 hover:bg-black/40 border border-white/10 transition cursor-pointer select-none"
                              >
                                  <div className="flex items-start gap-3">
                                      <div className="mt-0.5 text-secondary">
                                          {hideTrackMetadata ? <EyeOff size={16} /> : <Eye size={16} />}
                                      </div>
                                      <div>
                                          <div className="font-semibold text-white text-sm">Скрыть названия треков в анонсе</div>
                                          <div className="text-secondary text-xs leading-relaxed mt-0.5">
                                              {hideTrackMetadata 
                                                ? "Названия треков и авторы будут замаскированы (••••••••) до официального релиза" 
                                                : "Названия треков и приглашенные артисты будут открыто видны в треклисте"}
                                          </div>
                                      </div>
                                  </div>
                                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition ${
                                    hideTrackMetadata 
                                      ? 'bg-white border-white text-black' 
                                      : 'border-white/30 bg-white/5'
                                  }`}>
                                      {hideTrackMetadata && <Check size={14} className="stroke-[3]" />}
                                  </div>
                              </div>

                              {/* Custom UI Radios for Publishing Timing */}
                              <div className="flex flex-col gap-2 p-3 rounded-lg bg-black/30 border border-white/10">
                                  <div className="flex items-center gap-2 text-white font-semibold text-sm">
                                      <CalendarClock size={16} className="text-secondary" />
                                      <span>Публикация страницы анонса</span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                      <div 
                                        onClick={() => setPublishAnnouncementImmediately(true)}
                                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition cursor-pointer select-none ${
                                          publishAnnouncementImmediately
                                            ? 'bg-white/10 border-white/40 text-white'
                                            : 'bg-black/20 border-white/5 text-secondary hover:border-white/20'
                                        }`}
                                      >
                                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition ${
                                            publishAnnouncementImmediately ? 'border-white bg-white' : 'border-white/30'
                                          }`}>
                                              {publishAnnouncementImmediately && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                                          </div>
                                          <span className="text-xs font-medium">Сразу после одобрения</span>
                                      </div>

                                      <div 
                                        onClick={() => setPublishAnnouncementImmediately(false)}
                                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition cursor-pointer select-none ${
                                          !publishAnnouncementImmediately
                                            ? 'bg-white/10 border-white/40 text-white'
                                            : 'bg-black/20 border-white/5 text-secondary hover:border-white/20'
                                        }`}
                                      >
                                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition ${
                                            !publishAnnouncementImmediately ? 'border-white bg-white' : 'border-white/30'
                                          }`}>
                                              {!publishAnnouncementImmediately && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                                          </div>
                                          <span className="text-xs font-medium">По расписанию</span>
                                      </div>
                                  </div>

                                  {!publishAnnouncementImmediately && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/10">
                                          <div>
                                              <label className="text-[10px] uppercase font-bold text-secondary">Дата показа анонса</label>
                                              <input 
                                                type="date" 
                                                value={announcementDate} 
                                                onChange={e => setAnnouncementDate(e.target.value)} 
                                                className="w-full p-2 rounded bg-black/40 border border-white/15 text-white text-xs mt-1 focus:border-white/40 focus:outline-none" 
                                              />
                                          </div>
                                          <div>
                                              <label className="text-[10px] uppercase font-bold text-secondary">Время показа анонса</label>
                                              <input 
                                                type="time" 
                                                value={announcementTime} 
                                                onChange={e => setAnnouncementTime(e.target.value)} 
                                                className="w-full p-2 rounded bg-black/40 border border-white/15 text-white text-xs mt-1 focus:border-white/40 focus:outline-none" 
                                              />
                                          </div>
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-4">
                          <input 
                            type="text" 
                            placeholder={`${t('releaseTitle')} *`} 
                            value={distTitle} 
                            onChange={e => setDistTitle(e.target.value)} 
                            className={`p-3 rounded border focus:border-primary focus:outline-none ${
                              isLiquidGlass
                                ? 'max-md:bg-white/[0.07] max-md:border-white/15 max-md:rounded-xl md:bg-background md:border-surface-highlight'
                                : 'bg-background border-surface-highlight'
                            }`} 
                          />

                          {currentModerator && (
                              <input
                                  type="text"
                                  placeholder={`${t('primaryArtist')} *`}
                                  value={distArtistName}
                                  onChange={e => setDistArtistName(e.target.value)}
                                  className={`p-3 rounded border focus:border-primary focus:outline-none border-l-4 border-l-primary ${
                                    isLiquidGlass
                                      ? 'max-md:bg-white/[0.07] max-md:border-white/15 max-md:rounded-xl md:bg-background md:border-surface-highlight'
                                      : 'bg-background border-surface-highlight'
                                  }`}
                              />
                          )}

                          <CustomSelect
                              value={distType}
                              onChange={val => setDistType(val as any)}
                              options={isAnnouncement ? ['EP', 'Album', 'Mixtape'] : ['Single', 'EP', 'Album', 'Mixtape']}
                          />
                          <CustomSelect
                              value={normalizeClassicGenre(distGenre)}
                              onChange={val => setDistGenre(val)}
                              options={CLASSIC_GENRES as any}
                          />
                          <input 
                            type="text" 
                            placeholder={t('recordLabel')} 
                            value={distLabel} 
                            onChange={e => setDistLabel(e.target.value)} 
                            className={`p-3 rounded border focus:border-primary focus:outline-none ${
                              isLiquidGlass
                                ? 'max-md:bg-white/[0.07] max-md:border-white/15 max-md:rounded-xl md:bg-background md:border-surface-highlight'
                                : 'bg-background border-surface-highlight'
                            }`} 
                          />
                      </div>
                      <div className="flex flex-col gap-4">
                          <div 
                            className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center hover:border-primary transition cursor-pointer relative overflow-hidden ${
                              isLiquidGlass
                                ? 'max-md:bg-white/[0.04] max-md:border-white/20 max-md:rounded-2xl md:border-surface-highlight'
                                : 'border-surface-highlight'
                            }`} 
                            onClick={() => coverInputRef.current?.click()}
                          >
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
                                  <input 
                                    type="text" 
                                    value={distMainArtistInput} 
                                    onChange={e => setDistMainArtistInput(e.target.value)} 
                                    className={`flex-1 p-2 rounded border text-sm ${
                                      isLiquidGlass
                                        ? 'max-md:bg-white/[0.07] max-md:border-white/15 max-md:rounded-xl md:bg-background md:border-surface-highlight'
                                        : 'bg-background border-surface-highlight'
                                    }`} 
                                    placeholder={t('artist')} 
                                  />
                                  <button 
                                    onClick={() => { if(distMainArtistInput) { setDistMainArtists([...distMainArtists, distMainArtistInput]); setDistMainArtistInput(""); } }} 
                                    className={`p-2 rounded hover:bg-white hover:text-black ${
                                      isLiquidGlass
                                        ? 'max-md:bg-white/[0.12] max-md:border max-md:border-white/15 max-md:rounded-xl md:bg-surface-highlight'
                                        : 'bg-surface-highlight'
                                    }`} 
                                  >
                                    <Plus size={20}/>
                                  </button>
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
              <div className="flex flex-col gap-5 animate-slide-in-right">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                          <h3 className="text-xl font-bold flex items-center gap-2">
                              <span>{t('step2')}</span>
                              <span className="text-xs font-normal text-secondary bg-white/10 px-2 py-0.5 rounded-full">
                                  {distTracks.length} {distTracks.length === 1 ? 'трек' : distTracks.length < 5 ? 'трека' : 'треков'}
                              </span>
                          </h3>
                          <p className="text-xs text-secondary mt-0.5">
                              Перетаскивайте треки мышью или пальцем для изменения порядка
                          </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                          <button
                              type="button"
                              onClick={() => setIsAddTrackMenuOpen(true)}
                              className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-bold hover:scale-105 active:scale-95 transition text-sm shadow-sm"
                          >
                              <Plus size={16}/> Добавить трек
                          </button>
                          <button
                              type="button"
                              onClick={() => {
                                  setHueqInput("");
                                  setHueqLookupError("");
                                  setPreviewTrackFromHueq(null);
                                  setIsHueqModalOpen(true);
                              }}
                              className={`flex items-center gap-2 text-white border px-3.5 py-2 rounded-full font-bold hover:scale-105 active:scale-95 transition text-xs sm:text-sm shadow-sm ${
                                isLiquidGlass
                                  ? 'max-md:bg-white/[0.1] max-md:backdrop-blur-xl max-md:border-white/15 md:bg-surface md:hover:bg-surface-highlight md:border-surface-highlight md:hover:border-white/20'
                                  : 'bg-surface hover:bg-surface-highlight border-surface-highlight hover:border-white/20'
                              }`}
                          >
                              <Search size={15}/> По HUEQ
                          </button>
                      </div>
                  </div>

                  {/* Hidden inputs */}
                  <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" multiple onChange={handleFileUpload} />
                  <input type="file" ref={attachAudioInputRef} className="hidden" accept="audio/*" onChange={handleAttachAudioToTrack} />

                  {/* Track Cards List (no internal scroll, stacks vertically) */}
                  <div className="flex flex-col gap-3">
                      {distTracks.map((track, i) => {
                          const isEmptyTrack = Boolean(track.isEmpty || track.isUnreleased || !track.fileUrl);
                          const isExpanded = expandedTrackIdx === i;
                          const isBeingDragged = draggedTrackIdx === i;
                          const isDragOver = dragOverTrackIdx === i && draggedTrackIdx !== i;

                          return (
                              <div 
                                key={i}
                                data-track-idx={i}
                                onDragOver={(e) => handleDragOver(e, i)}
                                onDrop={(e) => handleDrop(e, i)}
                                className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col gap-3 ${
                                  isBeingDragged 
                                    ? 'opacity-40 scale-[0.98] border-dashed border-white/40' 
                                    : isDragOver
                                      ? 'border-primary ring-2 ring-primary/40 bg-primary/10'
                                      : isLiquidGlass
                                        ? 'bg-white/[0.06] backdrop-blur-xl border-white/10 hover:border-white/20'
                                        : 'bg-surface-highlight border-white/5 hover:border-white/15'
                                }`}
                              >
                                  {/* Card Top Row */}
                                  <div className="flex items-center justify-between gap-2.5">
                                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                          {/* Touch / Mouse Drag Handle */}
                                          <div
                                              draggable
                                              onDragStart={(e) => handleDragStart(e, i)}
                                              onDragEnd={handleDragEnd}
                                              onTouchStart={(e) => handleTouchStart(e, i)}
                                              onTouchMove={handleTouchMove}
                                              onTouchEnd={handleTouchEnd}
                                              onTouchCancel={handleTouchEnd}
                                              className="cursor-grab active:cursor-grabbing touch-none p-1 text-zinc-500 hover:text-white active:text-primary transition shrink-0 select-none flex items-center justify-center rounded hover:bg-white/5"
                                              title="Перетащите курсором или пальцем для изменения порядка"
                                          >
                                              <GripVertical size={20} />
                                          </div>

                                          {/* Track Number */}
                                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
                                              {i + 1}
                                          </div>

                                          {/* Title & Status preview */}
                                          <div className="flex items-center gap-2 min-w-0 flex-1">
                                              {!isExpanded ? (
                                                  <div 
                                                      onClick={() => setExpandedTrackIdx(i)}
                                                      className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                                                  >
                                                      <span className="font-bold text-sm sm:text-base text-white truncate">
                                                          {track.title || <span className="text-secondary/60 italic font-normal">Без названия</span>}
                                                      </span>
                                                      {isEmptyTrack ? (
                                                          <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800/90 border border-zinc-700/80 px-2 py-0.5 rounded tracking-wide shrink-0">
                                                              НЕ ВЫШЕЛ
                                                          </span>
                                                      ) : (
                                                          <span className="text-[10px] font-semibold text-secondary bg-black/40 px-2 py-0.5 rounded border border-white/5 shrink-0 flex items-center gap-1">
                                                              <FileAudio size={12} className="text-primary"/>
                                                              <span>{formatDuration(track.duration || 180)}</span>
                                                          </span>
                                                      )}
                                                      {track.explicit && (
                                                          <span className="text-[9px] font-black text-black bg-zinc-300 px-1 rounded shrink-0">
                                                              E
                                                          </span>
                                                      )}
                                                  </div>
                                              ) : (
                                                  <input
                                                      type="text"
                                                      value={track.title}
                                                      onChange={e => updateTrack(i, 'title', e.target.value)}
                                                      className="bg-transparent border-b border-white/30 focus:border-white focus:outline-none font-bold text-base sm:text-lg w-full text-white placeholder-secondary/50 py-0.5"
                                                      placeholder={isEmptyTrack ? `Название трека (НЕ ВЫШЕЛ)` : t('trackTitle')}
                                                      autoFocus={isExpanded && !track.title}
                                                  />
                                              )}
                                          </div>
                                      </div>

                                      {/* Right Action buttons */}
                                      <div className="flex items-center gap-1 shrink-0">
                                          {/* Lyrics Button */}
                                          <button
                                              type="button"
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  setLyricsModalTrackIdx(i);
                                              }}
                                              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition border ${
                                                  track.syncedLyrics && track.syncedLyrics.length > 0
                                                      ? 'bg-white/10 border-white/20 text-white'
                                                      : track.lyrics
                                                          ? 'bg-white/10 border-white/15 text-zinc-300 hover:text-white'
                                                          : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                                              }`}
                                              title="Текст песни"
                                          >
                                              <Mic2 size={13} className={track.syncedLyrics && track.syncedLyrics.length > 0 ? "text-white" : "text-zinc-400"} />
                                              <span className="hidden sm:inline">
                                                  {track.syncedLyrics && track.syncedLyrics.length > 0
                                                      ? "Текст (синхр.)"
                                                      : track.lyrics
                                                          ? "Изменить текст"
                                                          : "Добавить текст"}
                                              </span>
                                              <span className="sm:hidden">
                                                  {track.syncedLyrics && track.syncedLyrics.length > 0 ? "Текст (синхр.)" : "Текст"}
                                              </span>
                                          </button>

                                          <button
                                              type="button"
                                              onClick={() => setExpandedTrackIdx(isExpanded ? null : i)}
                                              className={`p-1.5 rounded-lg text-secondary hover:text-white transition flex items-center gap-1 text-xs font-medium ${isExpanded ? 'bg-white/10 text-white' : 'hover:bg-white/5'}`}
                                              title={isExpanded ? "Свернуть" : "Настроить трек"}
                                          >
                                              {isExpanded ? <ChevronUp size={18} /> : <Sliders size={17} />}
                                          </button>
                                          <button
                                              type="button"
                                              onClick={() => {
                                                  setDistTracks(distTracks.filter((_, idx) => idx !== i));
                                                  if (expandedTrackIdx === i) setExpandedTrackIdx(null);
                                              }}
                                              className="p-1.5 rounded-lg text-red-500/80 hover:text-red-400 hover:bg-red-500/10 transition"
                                              title="Удалить трек"
                                          >
                                              <Trash2 size={18} />
                                          </button>
                                      </div>
                                  </div>

                                  {/* Collapsed summary line */}
                                  {!isExpanded && (
                                      <div 
                                          onClick={() => setExpandedTrackIdx(i)}
                                          className="flex items-center justify-between text-xs text-secondary pl-9 sm:pl-10 cursor-pointer pt-0.5"
                                      >
                                          <div className="flex items-center gap-2 truncate">
                                              <span className="text-zinc-400 truncate">
                                                  {track.artist || (track.mainArtists && track.mainArtists.length > 0 ? track.mainArtists.join(', ') : (currentArtist?.artistName || 'Основной артист'))}
                                              </span>
                                              {track.genre && <span className="text-zinc-600">•</span>}
                                              {track.genre && <span className="text-zinc-500">{track.genre}</span>}
                                              {track.existingHueq && (
                                                  <span className="text-[10px] text-green-400/90 font-mono">
                                                      HUEQ: {track.existingHueq}
                                                  </span>
                                              )}
                                          </div>
                                          <span className="text-[11px] text-secondary hover:text-white underline ml-2 shrink-0">
                                              Настроить
                                          </span>
                                      </div>
                                  )}

                                  {/* Expanded Full Edit Mode */}
                                  {isExpanded && (
                                      <div className="flex flex-col gap-3 pt-2 border-t border-white/10 pl-1 sm:pl-2 animate-fade-in text-xs">
                                          {/* Empty Track Banner / Audio status */}
                                          {isEmptyTrack ? (
                                              <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                  <div className="flex items-center gap-2 text-zinc-300">
                                                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                                                      <span>Пустой трек — в треклисте отобразится как <strong>НЕ ВЫШЕЛ</strong></span>
                                                  </div>
                                                  <button
                                                      type="button"
                                                      onClick={() => {
                                                          setTrackToAttachAudioIdx(i);
                                                          attachAudioInputRef.current?.click();
                                                      }}
                                                      className="text-primary hover:text-primary/80 font-bold flex items-center gap-1.5 shrink-0 hover:underline text-xs"
                                                  >
                                                      <FileAudio size={14} /> Прикрепить аудио
                                                  </button>
                                              </div>
                                          ) : (
                                              <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 flex items-center justify-between text-zinc-300">
                                                  <div className="flex items-center gap-2">
                                                      <FileAudio size={16} className="text-primary" />
                                                      <span className="font-semibold text-white">Аудиофайл прикреплен</span>
                                                  </div>
                                                  <div className="font-mono text-zinc-400">{formatDuration(track.duration || 180)}</div>
                                              </div>
                                          )}

                                           {/* Lyrics Section in Expanded Card */}
                                           <div className="p-2.5 sm:p-3 rounded-xl bg-black/30 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                               <div className="flex items-center gap-2.5 min-w-0">
                                                   <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${track.syncedLyrics && track.syncedLyrics.length > 0 ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white/70'}`}>
                                                       <Mic2 size={14} />
                                                   </div>
                                                   <div className="flex flex-col min-w-0">
                                                       <span className="font-bold text-white text-xs truncate">
                                                           {track.syncedLyrics && track.syncedLyrics.length > 0
                                                               ? `Текст синхронизирован (${track.syncedLyrics.length} строк)`
                                                               : track.lyrics
                                                                   ? "Текст песни добавлен (без синхронизации)"
                                                                   : "Текст песни не добавлен"}
                                                       </span>
                                                       <span className="text-[10px] sm:text-[11px] text-secondary truncate">
                                                           {track.syncedLyrics && track.syncedLyrics.length > 0
                                                               ? "Синхронизирован со звучанием аудио трека"
                                                               : "Добавьте текст трека и синхронизируйте со звучанием в стиле Spotify"}
                                                       </span>
                                                   </div>
                                               </div>
                                               <button
                                                   type="button"
                                                   onClick={() => setLyricsModalTrackIdx(i)}
                                                   className="px-3 py-1.5 rounded-full bg-white text-black font-bold hover:bg-zinc-200 active:scale-95 transition text-xs shrink-0 flex items-center justify-center gap-1.5 shadow"
                                               >
                                                   <FileText size={13} />
                                                   <span>{track.lyrics || track.syncedLyrics ? "Редактировать текст" : "Добавить текст"}</span>
                                               </button>
                                           </div>

                                          {currentModerator && (
                                              <input
                                                  type="text"
                                                  value={track.artist || ""}
                                                  onChange={e => updateTrack(i, 'artist', e.target.value)}
                                                  className="bg-black/40 p-2.5 rounded-lg text-sm text-primary font-bold focus:outline-none border border-white/10 focus:border-primary"
                                                  placeholder="Primary Artist (Override)"
                                              />
                                          )}

                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                              <div className="flex flex-col gap-2.5">
                                                  <input
                                                      type="text"
                                                      value={track.existingHueq || ""}
                                                      onChange={e => updateTrack(i, 'existingHueq', e.target.value)}
                                                      onBlur={e => handleHueqBlur(i, e.target.value)}
                                                      placeholder="HUEQ Code (Опционально)"
                                                      className="bg-black/30 p-2.5 rounded-lg text-xs w-full font-mono text-secondary focus:text-white focus:outline-none border border-white/10 focus:border-primary"
                                                  />

                                                  <div className="flex items-center gap-4 py-1">
                                                      <label className="flex items-center gap-2 cursor-pointer select-none">
                                                          <input 
                                                              type="checkbox" 
                                                              checked={track.explicit} 
                                                              onChange={e => updateTrack(i, 'explicit', e.target.checked)} 
                                                              className="rounded text-primary focus:ring-0"
                                                          />
                                                          <span className="text-xs font-bold uppercase text-secondary">{t('explicit')}</span>
                                                      </label>
                                                      {!isEmptyTrack && (
                                                          <div className="text-xs text-secondary bg-black/30 px-2 py-1 rounded">
                                                              {formatDuration(track.duration || 180)}
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>

                                              <div className="flex flex-col gap-2.5">
                                                  <CustomSelect
                                                      value={normalizeClassicGenre(track.genre)}
                                                      onChange={val => updateTrack(i, 'genre', val)}
                                                      options={CLASSIC_GENRES as any}
                                                      buttonClassName="bg-black/40 text-xs p-2.5 rounded-lg border border-white/10"
                                                  />

                                                  <div className="flex flex-col">
                                                      <label className="text-[10px] uppercase font-bold text-secondary mb-1">Приглашенные артисты</label>
                                                      <div className="flex gap-2 mb-1.5">
                                                          <input
                                                              type="text"
                                                              value={trackArtistInputs[i] || ""}
                                                              onChange={e => setTrackArtistInputs({...trackArtistInputs, [i]: e.target.value})}
                                                              placeholder={t('artist')}
                                                              className="flex-1 bg-black/30 p-2 rounded-lg text-xs text-secondary focus:text-white focus:outline-none border border-white/10 focus:border-primary"
                                                          />
                                                          <button 
                                                              type="button" 
                                                              onClick={() => addTrackArtist(i)} 
                                                              className="bg-surface-highlight p-2 rounded-lg hover:bg-white hover:text-black transition"
                                                          >
                                                              <Plus size={16}/>
                                                          </button>
                                                      </div>
                                                      <div className="flex flex-wrap gap-1.5">
                                                          {(track.mainArtists || []).map((art, idx) => (
                                                              <span key={idx} className="bg-primary/20 text-primary px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                                                                  {art} <button type="button" onClick={() => removeTrackArtist(i, art)}><X size={10}/></button>
                                                              </span>
                                                          ))}
                                                      </div>
                                                  </div>
                                              </div>
                                          </div>

                                          {/* "Готово" button */}
                                          <div className="flex justify-end pt-2 border-t border-white/10">
                                              <button
                                                  type="button"
                                                  onClick={() => setExpandedTrackIdx(null)}
                                                  className="px-6 py-2 bg-white text-black font-bold text-xs sm:text-sm rounded-full hover:bg-zinc-200 active:scale-95 transition shadow"
                                              >
                                                  Готово
                                              </button>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          );
                      })}

                      {/* Empty state when no tracks added yet */}
                      {distTracks.length === 0 && (
                          <div className={`text-center py-10 px-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3.5 ${
                            isLiquidGlass
                              ? 'max-md:bg-white/[0.04] max-md:border-white/15 max-md:rounded-2xl md:border-surface-highlight/70 md:bg-surface/20'
                              : 'border-surface-highlight/70 bg-surface/20'
                          }`}>
                              <div className="w-12 h-12 rounded-full bg-surface-highlight/60 flex items-center justify-center text-secondary">
                                  {isAnnouncement ? <Megaphone size={24} className="text-secondary" /> : <FileAudio size={24} />}
                              </div>
                              <div className="font-semibold text-white text-sm sm:text-base">
                                  {isAnnouncement ? "Треклист анонса пуст" : (t('noTracks') || "Треков пока нет")}
                              </div>
                              <p className="text-xs text-secondary max-w-md">
                                  {isAnnouncement 
                                    ? "Добавьте треки в треклист. Вы можете добавить аудиофайлы или пустые треки (НЕ ВЫШЕЛ)." 
                                    : "Добавьте аудиофайл с устройства, создайте пустой трек (НЕ ВЫШЕЛ) или используйте HUEQ-код существующего трека."}
                              </p>
                              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-2">
                                  <button
                                      type="button"
                                      onClick={() => fileInputRef.current?.click()}
                                      className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-bold hover:scale-105 active:scale-95 transition text-sm shadow"
                                  >
                                      <FileAudio size={16}/> Аудио
                                  </button>
                                  <button
                                      type="button"
                                      onClick={addEmptyTrack}
                                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/15 text-white px-4 py-2 rounded-full font-bold hover:scale-105 active:scale-95 transition text-sm shadow"
                                  >
                                      <Clock size={16} className="text-zinc-400" /> Пустой трек
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => {
                                          setHueqInput("");
                                          setHueqLookupError("");
                                          setPreviewTrackFromHueq(null);
                                          setIsHueqModalOpen(true);
                                      }}
                                      className={`flex items-center gap-2 text-white border px-4 py-2 rounded-full font-bold hover:scale-105 active:scale-95 transition text-sm shadow ${
                                        isLiquidGlass
                                          ? 'max-md:bg-white/[0.1] max-md:border-white/15 md:bg-surface md:hover:bg-surface-highlight md:border-surface-highlight'
                                          : 'bg-surface hover:bg-surface-highlight border-surface-highlight'
                                      }`}
                                  >
                                      <Search size={16}/> По HUEQ
                                  </button>
                              </div>
                          </div>
                      )}

                      {/* Quick Add Card at bottom of list */}
                      {distTracks.length > 0 && (
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 p-4 border-2 border-dashed border-white/15 rounded-xl hover:border-white/30 transition bg-white/[0.02] mt-1">
                              <span className="text-xs text-secondary font-medium">Добавить трек:</span>
                              <div className="flex flex-wrap items-center gap-2">
                                  <button
                                      type="button"
                                      onClick={() => fileInputRef.current?.click()}
                                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-black font-bold text-xs hover:scale-105 active:scale-95 transition shadow-sm"
                                  >
                                      <FileAudio size={14} /> Аудио
                                  </button>
                                  <button
                                      type="button"
                                      onClick={addEmptyTrack}
                                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold text-xs hover:scale-105 active:scale-95 transition"
                                  >
                                      <Clock size={14} className="text-zinc-400" /> Пустой трек
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => {
                                          setHueqInput("");
                                          setHueqLookupError("");
                                          setPreviewTrackFromHueq(null);
                                          setIsHueqModalOpen(true);
                                      }}
                                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-secondary hover:text-white font-semibold text-xs hover:scale-105 active:scale-95 transition"
                                  >
                                      <Search size={14} /> По HUEQ
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {distStep === 3 && (
              <div className="flex flex-col gap-6 animate-slide-in-right">
                  <h3 className="text-xl font-bold">{t('step3')}</h3>
                  <div className="flex flex-col gap-4 max-w-md mx-auto w-full">
                      {/* Announcement Linking Card (Only for EP, Album, Mixtape - NOT for Singles or Announcements) */}
                      {!isAnnouncement && distType !== 'Single' && (() => {
                          const artistNameLower = (distArtistName || currentArtist?.artistName || '').toLowerCase();
                          const availableAnnouncements = releaseRequests.filter(r => {
                              const isMatch = (currentArtist && (r.artistId === currentArtist.id || (r.artistName || '').toLowerCase() === currentArtist.artistName?.toLowerCase())) ||
                                  (artistNameLower && (r.artistName || '').toLowerCase() === artistNameLower);
                              return Boolean(r.isAnnouncement && isMatch && r.id !== editingId);
                          });

                          if (availableAnnouncements.length === 0) {
                              return (
                                  <div className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs text-secondary ${
                                      isLiquidGlass ? 'bg-white/[0.04] border-white/10' : 'bg-surface/40 border-surface-highlight'
                                  }`}>
                                      <Megaphone size={18} className="text-secondary/70 shrink-0" />
                                      <div>
                                          <span className="font-semibold text-white/80 block">Привязка к релизу-анонсу</span>
                                          <span>У вас нет активных релизов-анонсов. Релиз будет опубликован как самостоятельный.</span>
                                      </div>
                                  </div>
                              );
                          }

                          return (
                              <div className={`p-4 rounded-xl border flex flex-col gap-3 transition ${
                                  distLinkedAnnouncementId
                                      ? 'bg-primary/5 border-primary/40 shadow-md'
                                      : isLiquidGlass ? 'bg-white/[0.05] border-white/10' : 'bg-surface/50 border-surface-highlight'
                              }`}>
                                  <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2.5">
                                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${distLinkedAnnouncementId ? 'bg-primary text-black' : 'bg-surface-highlight text-secondary'}`}>
                                              <Megaphone size={16} />
                                          </div>
                                          <div>
                                              <div className="text-sm font-bold text-white flex items-center gap-2">
                                                  <span>Связать с релизом-анонсом</span>
                                                  {distLinkedAnnouncementId && (
                                                      <span className="text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded">
                                                          Связано
                                                      </span>
                                                  )}
                                              </div>
                                              <div className="text-xs text-secondary">
                                                  Объединяет этот релиз с анонсом. По истечении таймера анонса в нём появится кнопка «Слушать» для перехода к альбому, а сам анонс удалится.
                                              </div>
                                          </div>
                                      </div>
                                  </div>

                                  <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                                      {/* Option 1: None */}
                                      <div 
                                          onClick={() => setDistLinkedAnnouncementId("")}
                                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition select-none ${
                                              !distLinkedAnnouncementId 
                                                  ? 'bg-white/10 border-white/30 text-white' 
                                                  : 'bg-black/20 hover:bg-black/30 border-white/5 text-secondary'
                                          }`}
                                      >
                                          <div className="flex items-center gap-3">
                                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${!distLinkedAnnouncementId ? 'border-primary bg-primary' : 'border-white/30'}`}>
                                                  {!distLinkedAnnouncementId && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                                              </div>
                                              <span className="text-sm font-medium">Без привязки (самостоятельный релиз)</span>
                                          </div>
                                      </div>

                                      {/* List of Available Announcements */}
                                      {availableAnnouncements.map(ann => {
                                          const isSelected = distLinkedAnnouncementId === ann.id;
                                          const cover = ann.covers && ann.covers[0] ? ann.covers[0] : "";
                                          const annDate = ann.releaseDate ? formatReleaseDateDisplay(ann.releaseDate) : "";
                                          return (
                                              <div 
                                                  key={ann.id}
                                                  onClick={() => {
                                                      setDistLinkedAnnouncementId(ann.id);
                                                      if (ann.releaseDate) {
                                                          const parts = extractReleaseDateParts(ann.releaseDate);
                                                          if (parts) {
                                                              setDistDate(`${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`);
                                                          }
                                                      }
                                                      if (ann.releaseTime) {
                                                          setDistTime(ann.releaseTime);
                                                      }
                                                  }}
                                                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition select-none ${
                                                      isSelected 
                                                          ? 'bg-primary/10 border-primary text-white shadow-sm' 
                                                          : 'bg-black/20 hover:bg-black/30 border-white/10 text-white/90'
                                                  }`}
                                              >
                                                  <div className="flex items-center gap-3 min-w-0">
                                                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-primary bg-primary' : 'border-white/30'}`}>
                                                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                                                      </div>
                                                      {cover ? (
                                                          <img src={cover} alt={ann.title} className="w-10 h-10 rounded-lg object-cover shrink-0 shadow-sm" />
                                                      ) : (
                                                          <div className="w-10 h-10 rounded-lg bg-surface-highlight flex items-center justify-center shrink-0">
                                                              <Megaphone size={16} className="text-secondary" />
                                                          </div>
                                                      )}
                                                      <div className="flex flex-col min-w-0">
                                                          <div className="flex items-center gap-2">
                                                              <span className="font-bold text-sm text-white truncate">{ann.title}</span>
                                                              <span className="text-[10px] uppercase font-bold text-purple-300 bg-purple-500/20 border border-purple-500/30 px-1 rounded shrink-0">
                                                                  {ann.type}
                                                              </span>
                                                          </div>
                                                          <span className="text-xs text-secondary truncate mt-0.5">
                                                              Дата выхода: {annDate} {ann.releaseTime ? `в ${ann.releaseTime}` : ''}
                                                          </span>
                                                      </div>
                                                  </div>
                                                  {isSelected && (
                                                      <span className="text-xs font-bold text-primary flex items-center gap-1 shrink-0 ml-2">
                                                          <Check size={14} className="stroke-[3]" />
                                                          Выбрано
                                                      </span>
                                                  )}
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          );
                      })()}

                      <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-secondary uppercase">{t('releaseDate')} *</label>
                          <input 
                            type="date" 
                            value={distDate} 
                            onChange={e => setDistDate(e.target.value)} 
                            className={`p-3 rounded border focus:border-primary focus:outline-none calendar-dark ${
                              isLiquidGlass
                                ? 'max-md:bg-white/[0.07] max-md:border-white/15 max-md:rounded-xl md:bg-background md:border-surface-highlight'
                                : 'bg-background border-surface-highlight'
                            }`} 
                          />
                      </div>
                      <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-secondary uppercase">{t('releaseTime')} *</label>
                          <input 
                            type="time" 
                            value={distTime} 
                            onChange={e => setDistTime(e.target.value)} 
                            className={`p-3 rounded border focus:border-primary focus:outline-none ${
                              isLiquidGlass
                                ? 'max-md:bg-white/[0.07] max-md:border-white/15 max-md:rounded-xl md:bg-background md:border-surface-highlight'
                                : 'bg-background border-surface-highlight'
                            }`} 
                          />
                      </div>
                      <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-secondary uppercase">{t('msgToMods')}</label>
                          <textarea 
                            value={distMsg} 
                            onChange={e => setDistMsg(e.target.value)} 
                            className={`p-3 rounded border focus:border-primary focus:outline-none h-24 resize-none ${
                              isLiquidGlass
                                ? 'max-md:bg-white/[0.07] max-md:border-white/15 max-md:rounded-xl md:bg-background md:border-surface-highlight'
                                : 'bg-background border-surface-highlight'
                            }`} 
                            placeholder={t('trackNote')}
                          ></textarea>
                      </div>

                      {/* Draft Status Banner on Step 3 */}
                      <div className={`p-3 border rounded-lg flex items-center justify-between text-xs ${
                        isLiquidGlass
                          ? 'max-md:bg-white/[0.06] max-md:backdrop-blur-xl max-md:border-white/10 max-md:rounded-xl md:bg-surface-highlight/40 md:border-surface-highlight'
                          : 'bg-surface-highlight/40 border-surface-highlight'
                      }`}>
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
                          <h4 className="text-sm font-bold text-secondary uppercase mb-2">Предпросмотр релиза</h4>
                          <div className="flex flex-col gap-2">
                              {distTracks.map((track, idx) => {
                                  const isEmptyTrack = Boolean((track.isEmpty || track.isUnreleased) && !track.fileUrl);
                                  const hueq = track.existingHueq || track.generatedHueq;
                                  return (
                                      <div 
                                        key={idx} 
                                        className={`flex justify-between items-center p-2.5 rounded-xl border ${
                                          isLiquidGlass ? 'max-md:bg-white/[0.05] max-md:border-white/10 md:bg-surface-highlight md:border-surface-highlight' : 'bg-surface-highlight border-white/5'
                                        }`}
                                      >
                                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                              <span className="text-xs text-secondary font-mono w-5 text-center shrink-0">{idx + 1}</span>
                                              <span className="font-bold text-sm text-white truncate">{track.title || "Без названия"}</span>
                                              {track.explicit && <ExplicitBadge />}
                                              {isEmptyTrack && (
                                                  <span className="text-[9px] font-bold text-zinc-400 bg-zinc-800 border border-zinc-700/80 px-1.5 py-0.2 rounded uppercase shrink-0">
                                                      НЕ ВЫШЕЛ
                                                  </span>
                                              )}
                                          </div>
                                          <div className="flex items-center gap-2.5 shrink-0 ml-2">
                                              {hueq && (
                                                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded select-all" title="HUEQ">
                                                      HUEQ: {hueq}
                                                  </span>
                                              )}
                                              <span className="text-xs text-secondary font-mono">
                                                  {isEmptyTrack ? '—' : formatDuration(track.duration || 180)}
                                              </span>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  </div>
              </div>
          )}

          <div className="flex flex-wrap justify-between items-center gap-2 sm:gap-3 mt-8 pt-6 border-t border-surface-highlight w-full min-w-0">
              {distStep > 1 ? (
                  <button 
                      type="button"
                      onClick={() => setDistStep(distStep - 1)} 
                      className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold text-white hover:bg-white/10 transition text-xs sm:text-sm flex items-center gap-1 shrink-0"
                  >
                      <ChevronLeft size={16} />
                      <span>{t('back')}</span>
                  </button>
              ) : <div className="shrink-0"></div>}

              <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end shrink-0 min-w-0 max-w-full">
                  {/* Save to Draft button available on Step 3 or anywhere */}
                  <button
                      type="button"
                      onClick={() => {
                          saveCurrentDraft(true);
                          if (currentModerator) setView('MOD_DASH');
                          else setView('ARTIST_DASH');
                      }}
                      className={`px-3 sm:px-4 py-2 rounded-full font-semibold text-xs sm:text-sm text-secondary hover:text-white transition flex items-center gap-1.5 border shadow-sm shrink-0 ${
                        isLiquidGlass
                          ? 'max-md:bg-white/[0.1] max-md:backdrop-blur-xl max-md:border-white/15 md:bg-surface-highlight md:hover:bg-zinc-700 md:border-white/10'
                          : 'bg-surface-highlight hover:bg-zinc-700 border-white/10'
                      }`}
                      title={t('saveDraft')}
                  >
                      <Bookmark size={14} className="text-primary shrink-0" />
                      <span className="hidden sm:inline">{t('saveDraft')}</span>
                      <span className="inline sm:hidden">В черновик</span>
                  </button>

                  {distStep < 3 ? (
                      <button 
                        type="button"
                        onClick={handleNextStep} 
                        className={`px-4 sm:px-7 py-2 sm:py-2.5 rounded-full font-bold bg-white text-black hover:scale-105 active:scale-95 transition text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 shrink-0 ${
                          isLiquidGlass ? 'max-md:shadow-[0_4px_16px_rgba(255,255,255,0.25)]' : ''
                        }`}
                      >
                        <span>{t('next')}</span>
                        <ChevronRight size={16} />
                      </button>
                  ) : (
                      <button 
                        type="button"
                        onClick={handleSubmitRelease} 
                        className={`px-4 sm:px-7 py-2 sm:py-2.5 rounded-full font-bold bg-primary text-black hover:scale-105 active:scale-95 transition text-xs sm:text-sm shrink-0 ${
                          isLiquidGlass
                            ? 'max-md:shadow-[0_6px_24px_rgba(29,185,84,0.4),inset_0_1px_0_rgba(255,255,255,0.4)] md:shadow-lg md:shadow-primary/20'
                            : 'shadow-lg shadow-primary/20'
                        }`}
                      >
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
            tracks: a.trackIds.map((tid, idx) => {
                const t = tracks.find(tr => tr.id === tid) || 
                          tracks.find(tr => tr.album?.toLowerCase() === a.title.toLowerCase() && (tr.artist?.toLowerCase() === a.artist?.toLowerCase() || tr.artist?.toLowerCase() === currentArtist.artistName?.toLowerCase()));
                return {
                    title: t?.title || `Трек ${idx + 1}`,
                    explicit: t?.explicit || false,
                    duration: t?.duration || 180,
                    mainArtists: t?.mainArtists || [],
                    feat: t?.feat,
                    existingHueq: t?.hueq,
                    fileUrl: t?.url || "",
                    isEmpty: false,
                    isUnreleased: false
                };
            }),
            releaseDate: a.releaseDate || new Date(a.year, 0, 1).toISOString(),
            submissionTime: new Date().toISOString(),
            deletionRequested: false
        }));

    const getReleaseDateTime = (r: { releaseDate?: string; releaseTime?: string; submissionTime?: string }): number => {
        if (r.releaseDate) {
            let dateStr = r.releaseDate;
            if (r.releaseTime && !dateStr.includes('T')) {
                dateStr = `${dateStr}T${r.releaseTime}`;
            }
            const time = new Date(dateStr).getTime();
            if (!isNaN(time)) return time;
            const fallbackTime = new Date(r.releaseDate).getTime();
            if (!isNaN(fallbackTime)) return fallbackTime;
        }
        if (r.submissionTime) {
            const time = new Date(r.submissionTime).getTime();
            if (!isNaN(time)) return time;
        }
        return 0;
    };

    const myReleases = [...pendingReleases, ...liveAlbums].sort((a, b) => {
        const diff = getReleaseDateTime(b) - getReleaseDateTime(a);
        if (diff !== 0) return diff;
        return (new Date(b.submissionTime || 0).getTime()) - (new Date(a.submissionTime || 0).getTime());
    });
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
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8 shrink-0">
                <div className={`p-3 sm:p-4 rounded-xl flex items-center gap-2.5 sm:gap-4 min-w-0 overflow-hidden ${
                  isLiquidGlass
                    ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-2xl max-md:border max-md:border-white/15 max-md:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] max-md:rounded-2xl md:bg-surface md:border md:border-surface-highlight'
                    : 'bg-surface border border-surface-highlight'
                }`}>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/20 rounded-full flex items-center justify-center shrink-0 aspect-square">
                        <BarChart2 size={20} className="text-primary sm:w-6 sm:h-6"/>
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="text-lg sm:text-2xl font-bold truncate leading-tight tracking-tight">{stats.monthlyPlays.toLocaleString()}</div>
                        <div className="text-[10px] sm:text-xs text-secondary uppercase font-bold leading-tight line-clamp-2 break-words mt-0.5">{t('monthlyPlays')}</div>
                    </div>
                </div>
                <div className={`p-3 sm:p-4 rounded-xl flex items-center gap-2.5 sm:gap-4 min-w-0 overflow-hidden ${
                  isLiquidGlass
                    ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-2xl max-md:border max-md:border-white/15 max-md:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] max-md:rounded-2xl md:bg-surface md:border md:border-surface-highlight'
                    : 'bg-surface border border-surface-highlight'
                }`}>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/20 rounded-full flex items-center justify-center shrink-0 aspect-square">
                        <Globe size={20} className="text-primary sm:w-6 sm:h-6"/>
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="text-lg sm:text-2xl font-bold truncate leading-tight tracking-tight">#{stats.globalRank}</div>
                        <div className="text-[10px] sm:text-xs text-secondary uppercase font-bold leading-tight line-clamp-2 break-words mt-0.5">{t('inTheWorld')}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 w-full shrink-0">
                <button 
                  onClick={() => { resetDistForm(false); setView('DISTRIBUTION'); }} 
                  className={`p-6 rounded-xl flex flex-col items-center justify-center gap-2 hover:scale-105 transition font-bold h-28 md:h-32 w-full ${
                    isLiquidGlass
                      ? 'max-md:bg-primary max-md:text-black max-md:shadow-[0_6px_24px_rgba(29,185,84,0.4),inset_0_1px_0_rgba(255,255,255,0.4)] max-md:rounded-2xl md:bg-primary md:text-black md:shadow-lg md:hover:shadow-primary/20'
                      : 'bg-primary text-black shadow-lg hover:shadow-primary/20'
                  }`}
                >
                    <UploadCloud size={30}/>
                    <span>{t('uploadNew')}</span>
                </button>
                <button 
                  onClick={() => { resetDistForm(true); setView('DISTRIBUTION'); }} 
                  className={`p-6 rounded-xl flex flex-col items-center justify-center gap-2 hover:scale-105 transition font-bold h-28 md:h-32 w-full border border-purple-500/30 ${
                    isLiquidGlass
                      ? 'max-md:bg-purple-600/30 max-md:backdrop-blur-2xl max-md:text-white max-md:shadow-[0_6px_24px_rgba(168,85,247,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] max-md:rounded-2xl md:bg-purple-950/40 md:text-purple-300 md:hover:bg-purple-900/60 md:hover:text-white'
                      : 'bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 hover:text-white'
                  }`}
                >
                    <Megaphone size={30} className="text-purple-400"/>
                    <span>Анонс альбома</span>
                </button>
                <button 
                  onClick={() => setView('PROFILE_EDIT')} 
                  className={`p-6 rounded-xl flex flex-col items-center justify-center gap-2 transition font-bold h-28 md:h-32 hover:scale-105 w-full ${
                    isLiquidGlass
                      ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-2xl max-md:border max-md:border-white/15 max-md:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] max-md:rounded-2xl md:bg-surface md:border md:border-surface-highlight md:hover:bg-surface-highlight'
                      : 'bg-surface border border-surface-highlight hover:bg-surface-highlight'
                  }`}
                >
                    <Edit size={30} className="text-secondary"/>
                    <span>{t('editProfile')}</span>
                </button>
                <button 
                  onClick={() => setView('ARTIST_PICK')} 
                  className={`p-6 rounded-xl flex flex-col items-center justify-center gap-2 transition font-bold h-28 md:h-32 hover:scale-105 w-full ${
                    isLiquidGlass
                      ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-2xl max-md:border max-md:border-white/15 max-md:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] max-md:rounded-2xl md:bg-surface md:border md:border-surface-highlight md:hover:bg-surface-highlight'
                      : 'bg-surface border border-surface-highlight hover:bg-surface-highlight'
                  }`}
                >
                    <ListMusic size={30} className="text-secondary"/>
                    <span>{t('artistPick')}</span>
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
                            <div 
                              key={d.id} 
                              className={`p-4 rounded-xl flex flex-col justify-between gap-3 group transition ${
                                isLiquidGlass
                                  ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-2xl max-md:border max-md:border-white/15 max-md:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] max-md:rounded-2xl md:bg-surface md:border md:border-surface-highlight md:hover:border-primary/40 md:shadow-sm md:hover:shadow-md'
                                  : 'bg-surface border border-surface-highlight hover:border-primary/40 shadow-sm hover:shadow-md'
                              }`}
                            >
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

                                <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-1">
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

            {/* Verification Block positioned right before My Releases */}
            {(() => {
              const myVerificationRequest = verificationRequests.find(r =>
                currentArtist && (r.artistId === currentArtist.id || r.artistName.toLowerCase() === currentArtist.artistName.toLowerCase())
              );
              const isCooldownActive = myVerificationRequest?.status === 'REJECTED' &&
                (Date.now() - new Date(myVerificationRequest.rejectedAt || 0).getTime() < 30 * 24 * 60 * 60 * 1000);
              const remainingDays = myVerificationRequest?.rejectedAt
                ? Math.max(1, Math.ceil((30 * 24 * 60 * 60 * 1000 - (Date.now() - new Date(myVerificationRequest.rejectedAt).getTime())) / (24 * 60 * 60 * 1000)))
                : 30;

              return (
                <div className="mb-8 w-full shrink-0">
                  {currentArtist?.isVerified ? (
                    /* Verified: Compact block in the style of other cards */
                    <div
                      onClick={() => setVerificationModalOpen(true)}
                      className={`p-4 sm:p-5 rounded-xl flex items-center justify-between cursor-pointer transition hover:scale-[1.01] active:scale-[0.99] group border ${
                        isLiquidGlass
                          ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-2xl max-md:border-white/20 max-md:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] max-md:rounded-2xl md:bg-surface md:border-surface-highlight md:hover:border-blue-500/40 md:shadow-sm'
                          : 'bg-surface border-surface-highlight hover:border-blue-500/40 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 shadow-sm">
                          <Check size={20} strokeWidth={3} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm sm:text-base text-white group-hover:text-blue-400 transition truncate">
                              Артист подтвержден
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              Verified
                            </span>
                          </div>
                          <span className="text-xs text-secondary truncate mt-0.5">
                            Профиль верифицирован
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-secondary group-hover:text-white text-xs font-semibold shrink-0 pl-3">
                        <span className="hidden sm:inline">Подробнее</span>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  ) : (myVerificationRequest?.status === 'PENDING' || myVerificationRequest?.status === 'IN_REVIEW') ? (
                    /* In Progress */
                    <div
                      onClick={() => setVerificationModalOpen(true)}
                      className={`p-4 sm:p-5 rounded-xl flex items-center justify-between cursor-pointer transition hover:scale-[1.01] active:scale-[0.99] group border ${
                        isLiquidGlass
                          ? 'max-md:bg-amber-500/10 max-md:backdrop-blur-2xl max-md:border-amber-500/25 max-md:rounded-2xl md:bg-surface md:border-amber-500/30 md:hover:border-amber-500/50'
                          : 'bg-surface border-amber-500/30 hover:border-amber-500/50'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                          <Clock size={20} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm sm:text-base text-white group-hover:text-amber-300 transition truncate">
                              Заявка на верификацию
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              {myVerificationRequest.status === 'IN_REVIEW' ? 'На рассмотрении' : 'Ожидает'}
                            </span>
                          </div>
                          <span className="text-xs text-amber-400/90 truncate mt-0.5 font-medium">
                            {myVerificationRequest.status === 'IN_REVIEW'
                              ? 'Модератор рассматривает вашу заявку'
                              : 'Заявка отправлена и ожидает очереди'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-secondary group-hover:text-white text-xs font-semibold shrink-0 pl-3">
                        <span className="hidden sm:inline">Статус</span>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  ) : isCooldownActive ? (
                    /* Rejected (Cooldown) */
                    <div
                      onClick={() => setVerificationModalOpen(true)}
                      className={`p-4 sm:p-5 rounded-xl flex items-center justify-between cursor-pointer transition hover:scale-[1.01] active:scale-[0.99] group border ${
                        isLiquidGlass
                          ? 'max-md:bg-rose-500/10 max-md:backdrop-blur-2xl max-md:border-rose-500/25 max-md:rounded-2xl md:bg-surface md:border-rose-500/30 md:hover:border-rose-500/50'
                          : 'bg-surface border-rose-500/30 hover:border-rose-500/50'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                          <XCircle size={20} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-sm sm:text-base text-white group-hover:text-rose-300 transition truncate">
                            Заявка отклонена
                          </span>
                          <span className="text-xs text-rose-400 font-medium truncate mt-0.5">
                            Повторная подача станет доступна через {remainingDays} дн.
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-secondary group-hover:text-white text-xs font-semibold shrink-0 pl-3">
                        <span className="hidden sm:inline">Подробнее</span>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  ) : (
                    /* Initial / Reapply available: Designed in the style of other cards, subtly highlighted */
                    <div
                      onClick={() => setVerificationModalOpen(true)}
                      className={`p-4 sm:p-5 rounded-xl flex items-center justify-between cursor-pointer transition hover:scale-[1.01] active:scale-[0.99] group border ${
                        isLiquidGlass
                          ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-2xl max-md:border-white/15 max-md:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] max-md:rounded-2xl md:bg-surface md:border md:border-surface-highlight md:hover:border-white/30 md:hover:bg-surface-highlight/70 shadow-sm'
                          : 'bg-surface border border-surface-highlight hover:border-white/30 hover:bg-surface-highlight/70 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/5 border border-white/10 group-hover:border-white/25 text-white flex items-center justify-center shrink-0 shadow-sm transition">
                          <Shield size={20} className="text-white" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-sm sm:text-base text-white group-hover:text-primary transition truncate">
                            Верификация артиста
                          </span>
                          <span className="text-xs text-secondary truncate mt-0.5">
                            Подтвердите профиль и получите галочку верифицированного артиста
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-secondary group-hover:text-white text-xs font-semibold shrink-0 pl-3">
                        <span className="hidden sm:inline">Подать заявку</span>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

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
                                <td className="p-4 text-sm text-secondary">{formatNumericReleaseDate(r.releaseDate)}</td>
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
                    <div 
                      key={idx} 
                      className={`p-4 rounded-lg flex items-center gap-4 cursor-pointer active:scale-95 transition items-start ${
                        isLiquidGlass
                          ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-2xl max-md:border max-md:border-white/15 max-md:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] max-md:rounded-2xl md:bg-surface'
                          : 'bg-surface'
                      }`} 
                      onClick={() => setSelectedRelease(r)}
                    >
                        <div className="w-16 h-16 shrink-0">
                            <img src={r.covers && r.covers.length > 0 ? r.covers[0] : "https://picsum.photos/300"} className="w-full h-full rounded object-cover shadow-sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-lg truncate">{r.title}</div>
                            <div className="text-sm text-secondary truncate">{r.type} • {formatNumericReleaseDate(r.releaseDate)}</div>
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
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-secondary hover:text-white hover:bg-red-500 hover:text-white transition font-bold shadow-lg ${
                      isLiquidGlass
                        ? 'max-md:bg-white/[0.12] max-md:backdrop-blur-xl max-md:border max-md:border-white/15 max-md:shadow-[0_4px_16px_rgba(0,0,0,0.3)] md:bg-surface-highlight'
                        : 'bg-surface-highlight'
                    }`}
                >
                    <LogOut size={18} />
                    {t('logout')}
                </button>
            </div>
        </div>
    );
  };

  const renderProfileEditForm = () => (
      <div className={`w-full max-w-md p-6 md:p-8 rounded-xl shadow-2xl animate-zoom-in relative max-h-[85vh] overflow-y-auto custom-scrollbar ${
        isLiquidGlass
          ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-3xl max-md:border max-md:border-white/15 max-md:shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.25)] max-md:rounded-2xl md:bg-surface md:border md:border-surface-highlight'
          : 'bg-surface border border-surface-highlight'
      }`}>
          <button 
            onClick={() => setView('ARTIST_DASH')} 
            className={`absolute top-4 left-4 text-secondary hover:text-white ${
              isLiquidGlass ? 'max-md:p-1.5 max-md:rounded-full max-md:bg-white/[0.08] max-md:border max-md:border-white/10' : ''
            }`}
          >
            <ArrowLeft size={24}/>
          </button>
          <h2 className="text-2xl font-bold text-center mb-6">{t('editProfile')}</h2>

          <div className="flex flex-col gap-6">
              <div className="flex justify-center">
                  <div
                      onClick={() => !isUploadingAvatar && avatarInputRef.current?.click()}
                      className={`w-32 h-32 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition relative overflow-hidden group border-2 border-transparent hover:border-primary ${
                        isLiquidGlass ? 'max-md:bg-white/[0.08] max-md:border-white/15 md:bg-surface-highlight' : 'bg-surface-highlight'
                      }`}
                  >
                      {editAvatar ? (
                          <img src={editAvatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                          <Camera size={40} className="text-secondary" />
                      )}
                      {isUploadingAvatar ? (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <div className="w-8 h-8 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
                          </div>
                      ) : (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                              <span className="text-xs font-bold text-white uppercase">{t('changeCover')}</span>
                          </div>
                      )}
                  </div>
                  <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploadingAvatar} />
              </div>

              <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-secondary uppercase">{t('bio')}</label>
                  <textarea
                      value={editBio}
                      onChange={e => setEditBio(e.target.value)}
                      className={`p-3 rounded border focus:border-primary focus:outline-none resize-none h-32 text-white ${
                        isLiquidGlass
                          ? 'max-md:bg-white/[0.07] max-md:border-white/15 max-md:rounded-xl md:bg-background md:border-surface-highlight'
                          : 'bg-background border-surface-highlight'
                      }`}
                      placeholder="Tell fans about yourself..."
                  />
              </div>

              <div className="flex flex-col gap-2 border-t border-surface-highlight pt-4">
                  <label className="text-xs font-bold text-secondary uppercase">{t('changePass')}</label>
                  <input
                      type="password"
                      value={editNewPassword}
                      onChange={e => setEditNewPassword(e.target.value)}
                      className={`p-3 rounded border focus:border-primary focus:outline-none ${
                        isLiquidGlass
                          ? 'max-md:bg-white/[0.07] max-md:border-white/15 max-md:rounded-xl md:bg-background md:border-surface-highlight'
                          : 'bg-background border-surface-highlight'
                      }`}
                      placeholder={t('newPass')}
                  />
              </div>

              <button
                  onClick={handleProfileUpdate}
                  className={`text-black font-bold py-3 rounded-full hover:scale-105 transition ${
                    isLiquidGlass
                      ? 'max-md:bg-primary max-md:shadow-[0_6px_24px_rgba(29,185,84,0.4),inset_0_1px_0_rgba(255,255,255,0.4)] md:bg-primary md:shadow-lg md:shadow-primary/20'
                      : 'bg-primary shadow-lg shadow-primary/20'
                  }`}
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

      const searchResults = [
          ...tracks.filter(t => t.title.toLowerCase().includes(pickSearch.toLowerCase())).map(t => ({...t, type: 'TRACK' as const})),
          ...albums.filter(a => a.title.toLowerCase().includes(pickSearch.toLowerCase())).map(a => ({...a, type: 'ALBUM' as const}))
      ].slice(0, 20);

      const artistAvatar = currentArtist?.avatar || "";

      return (
        <div className={`w-full max-w-2xl p-6 md:p-8 rounded-xl shadow-2xl animate-zoom-in relative h-[80vh] flex flex-col ${
          isLiquidGlass
            ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-3xl max-md:border max-md:border-white/15 max-md:shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.25)] max-md:rounded-2xl md:bg-surface md:border md:border-surface-highlight'
            : 'bg-surface border border-surface-highlight'
        }`}>
            {/* Top Navigation */}
            <button 
              onClick={() => {
                if (selectedPickItem) {
                  setSelectedPickItem(null);
                } else {
                  setView('ARTIST_DASH');
                }
              }} 
              className={`absolute top-6 md:top-8 left-6 md:left-8 text-secondary hover:text-white transition ${
                isLiquidGlass ? 'max-md:p-1.5 max-md:rounded-full max-md:bg-white/[0.08] max-md:border max-md:border-white/10' : ''
              }`}
              title={selectedPickItem ? "Назад к поиску" : "Назад"}
            >
              <ArrowLeft size={24}/>
            </button>
            <h2 className="text-2xl font-bold text-center mb-6">{t('artistPick')}</h2>

            {selectedPickItem ? (
              /* Step 2: Confirmation with optional comment */
              <div className="flex-1 overflow-y-auto flex flex-col justify-between gap-6 pb-2">
                <div className="flex flex-col gap-5">
                  <div className="text-sm font-semibold text-secondary">
                    Выбранный релиз или трек:
                  </div>

                  {/* Selected Item Preview Card */}
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-highlight/70 border border-white/10">
                    <img 
                      src={selectedPickItem.image} 
                      alt={selectedPickItem.title} 
                      className="w-16 h-16 rounded-xl object-cover shadow-md shrink-0 bg-zinc-800" 
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base truncate">{selectedPickItem.title}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/10 text-secondary shrink-0">
                          {selectedPickItem.type === 'TRACK' ? 'Трек' : 'Альбом'}
                        </span>
                      </div>
                      <span className="text-xs text-secondary truncate mt-0.5">{selectedPickItem.subtitle}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPickItem(null)}
                      className="text-xs font-semibold text-primary hover:underline shrink-0 ml-2"
                    >
                      Изменить
                    </button>
                  </div>

                  {/* Comment Section */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>Комментарий к выбору</span>
                        <span className="text-xs font-normal text-secondary">(необязательно)</span>
                      </label>
                      <span className="text-xs text-secondary/70">{pickComment.length} / 120</span>
                    </div>

                    <textarea
                      rows={3}
                      maxLength={120}
                      value={pickComment}
                      onChange={e => setPickComment(e.target.value)}
                      placeholder="Напишите комментарий к своему выбору (необязательно)..."
                      className="w-full p-3.5 rounded-2xl bg-surface-highlight border border-white/10 text-white placeholder-secondary/50 focus:outline-none focus:border-primary text-sm resize-none transition"
                    />

                    {/* Live Preview of Speech Bubble */}
                    {pickComment.trim() && (
                      <div className="mt-2 p-3.5 rounded-2xl bg-black/40 border border-white/5">
                        <div className="text-[11px] font-medium text-secondary/70 mb-2">Предпросмотр плашки в профиле:</div>
                        <div className="relative self-start">
                          <div className="bg-white text-black px-3.5 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 max-w-md">
                            {artistAvatar ? (
                              <img src={artistAvatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 border border-black/10 shadow-sm" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-zinc-800 shrink-0" />
                            )}
                            <div className="text-xs font-semibold text-zinc-900 leading-snug break-words">
                              {pickComment.trim()}
                            </div>
                          </div>
                          <div className="w-2.5 h-2.5 bg-white rotate-45 ml-5 -mt-1 shadow-sm" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Save and Cancel buttons */}
                <div className="flex items-center gap-3 pt-4 border-t border-surface-highlight">
                  <button
                    type="button"
                    onClick={() => setSelectedPickItem(null)}
                    className="flex-1 py-3 rounded-xl bg-surface-highlight hover:bg-surface-highlight/80 text-white font-bold text-sm transition"
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      submitProfileEdit({
                        newArtistPick: {
                          type: selectedPickItem.type,
                          id: selectedPickItem.id,
                          image: selectedPickItem.image,
                          subtitle: selectedPickItem.title,
                          comment: pickComment.trim() || undefined
                        }
                      });
                      showNotification("Выбор артиста обновлен (на рассмотрении)", "success");
                      setSelectedPickItem(null);
                      setPickComment("");
                      setPickSearch("");
                      setView('ARTIST_DASH');
                    }}
                    className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-black font-bold text-sm shadow-md transition"
                  >
                    Сохранить выбор
                  </button>
                </div>
              </div>
            ) : (
              /* Step 1: Search and list */
              <>
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-3.5 text-secondary" size={20} />
                    <input
                        type="text"
                        placeholder={t('searchTrackAlbum')}
                        className={`w-full py-3 pl-12 pr-4 rounded-full text-white focus:outline-none focus:ring-1 focus:ring-primary ${
                          isLiquidGlass
                            ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-xl max-md:border max-md:border-white/15 md:bg-background'
                            : 'bg-background'
                        }`}
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
                                   setSelectedPickItem({
                                       type: item.type,
                                       id: item.id,
                                       image: image,
                                       title: item.title,
                                       subtitle: subtitle
                                   });
                                   setPickComment(currentArtist?.artistPick?.id === item.id ? (currentArtist?.artistPick?.comment || "") : "");
                               }}
                               className={`flex items-center gap-4 p-3 rounded cursor-pointer transition ${
                                 isLiquidGlass
                                   ? 'max-md:bg-white/[0.05] max-md:border max-md:border-white/10 max-md:rounded-xl md:hover:bg-surface-highlight'
                                   : 'hover:bg-surface-highlight'
                               }`}
                           >
                               <img src={image} className="w-12 h-12 rounded object-cover shrink-0" />
                               <div className="flex flex-col min-w-0">
                                   <span className="font-bold truncate">{item.title}</span>
                                   <span className="text-xs text-secondary truncate">{subtitle}</span>
                               </div>
                           </div>
                       )
                    })}
                </div>
              </>
            )}
        </div>
      );
  };

  const renderReleaseDetailModal = () => {
      if(!selectedRelease) return null;

      const artistAccount = artistAccounts.find(a => a.artistName?.toLowerCase() === selectedRelease.artistName?.toLowerCase());
      const artistAvatar = artistAccount?.avatar || selectedRelease.covers?.[0] || "";
      const releaseYear = extractReleaseDateParts(selectedRelease.releaseDate)?.year || 2026;
      const count = previewTracks.length;
      const trackCountText = `${count} ${count === 1 ? 'трек' : (count >= 2 && count <= 4) ? 'трека' : 'треков'}`;
      const totalSeconds = previewTracks.reduce((acc, t) => acc + (t.duration || 180), 0);
      const totalMinutes = Math.floor(totalSeconds / 60);
      const totalDurationText = totalMinutes > 0 ? `${totalMinutes} мин.` : `${totalSeconds} сек.`;

      const statusBadgeClass =
        selectedRelease.status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
        selectedRelease.status === 'APPROVED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
        selectedRelease.status === 'REJECTED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
        'bg-amber-500/20 text-amber-300 border border-amber-500/30';

      const statusText =
        selectedRelease.status === 'LIVE' ? 'В сети' :
        selectedRelease.status === 'APPROVED' ? 'Одобрен' :
        selectedRelease.status === 'REJECTED' ? 'Отклонен' :
        'На модерации';

      // Find if any track in this release is playing right now
      const isReleasePlaying = isPlaying && currentTrack && previewTracks.some(t => {
          const matchingTrack = tracks.find(tr => tr.id === currentTrack.id);
          return currentTrack.title === t.title || (matchingTrack && matchingTrack.title === t.title);
      });

      const handleTogglePlayRelease = () => {
          if (isReleasePlaying) {
              togglePlay();
              return;
          }
          // Find first playable track
          const firstPlayable = previewTracks.find(t => !t.isEmpty && !t.isUnreleased && (t.fileUrl || tracks.some(tr => tr.title.toLowerCase() === t.title.toLowerCase())));
          if (!firstPlayable) {
              showNotification('В этом релизе пока нет доступных аудиофайлов', 'info');
              return;
          }
          const matchingTrack = tracks.find(t => 
              t.title.trim().toLowerCase() === firstPlayable.title.trim().toLowerCase() && 
              (t.artist.trim().toLowerCase() === (firstPlayable.artist || selectedRelease.artistName).trim().toLowerCase() ||
               t.album?.trim().toLowerCase() === selectedRelease.title.trim().toLowerCase())
          );
          const trackToPlay: Track = matchingTrack || {
              id: `preview_${selectedRelease.id}_0`,
              title: firstPlayable.title,
              artist: firstPlayable.artist || selectedRelease.artistName,
              album: selectedRelease.title,
              cover: selectedRelease.covers[0],
              duration: firstPlayable.duration || 180,
              url: firstPlayable.fileUrl,
              plays: 0,
              explicit: firstPlayable.explicit,
              genre: normalizeClassicGenre(firstPlayable.genre || selectedRelease.genre)
          };
          playTrack(trackToPlay);
      };

      const canEdit = !selectedRelease.id.startsWith('alb_');
      const canDelete = selectedRelease.id.startsWith('rel_') || currentModerator;

      const isApprovedOrLive = selectedRelease.status === 'LIVE' || selectedRelease.status === 'APPROVED';
      const isReleaseOut = selectedRelease.status === 'LIVE' || 
          Boolean(selectedRelease.releaseDate && getReleaseTimestamp(selectedRelease.releaseDate, selectedRelease.releaseTime) <= Date.now());

      return (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 animate-fade-in" onClick={() => setSelectedRelease(null)}>
              <div 
                  className={`w-full max-w-lg md:max-w-2xl rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 md:p-8 relative shadow-[0_24px_64px_rgba(0,0,0,0.85)] border border-white/10 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto flex flex-col animate-zoom-in scrollbar-thin ${
                    isLiquidGlass
                      ? 'bg-zinc-950/95 backdrop-blur-3xl'
                      : 'bg-zinc-950'
                  }`}
                  onClick={e => e.stopPropagation()}
              >
                  {/* Mobile drag handle bar */}
                  <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-3 sm:hidden shrink-0"></div>

                  {/* Close Button */}
                  <button 
                      type="button"
                      onClick={() => setSelectedRelease(null)} 
                      className="absolute top-3 right-3 sm:top-4 sm:right-4 text-zinc-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition z-20"
                      title="Закрыть"
                  >
                      <X size={20}/>
                  </button>

                  {/* Album Header & Cover Hero */}
                  <div className="flex flex-col items-center text-center mt-1">
                      <div className="relative group">
                          <img 
                              src={selectedRelease.covers[0]} 
                              alt={selectedRelease.title} 
                              className="w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.7)] object-cover bg-zinc-900 border border-white/10 transition-transform duration-300" 
                          />
                          {selectedRelease.covers.length > 1 && (
                              <span className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-md text-[11px] font-bold text-white px-2.5 py-0.5 rounded-full border border-white/15 shadow">
                                  +{selectedRelease.covers.length - 1}
                              </span>
                          )}
                      </div>

                      {/* Release Type (uppercase tracking-widest) */}
                      <div className="text-[11px] sm:text-xs uppercase font-extrabold tracking-[0.2em] text-zinc-400 mt-4 sm:mt-5">
                          {selectedRelease.type || 'ALBUM'}
                      </div>

                      {/* Release Title */}
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white mt-1.5 tracking-tight px-2 leading-tight break-words text-center">
                          {selectedRelease.title}
                      </h2>

                      {/* Artist, Year, Tracks line */}
                      <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-1 text-xs sm:text-sm text-zinc-300 mt-2 text-center">
                          <div className="flex items-center gap-1.5 font-bold text-white">
                              {artistAvatar ? (
                                  <img 
                                      src={artistAvatar} 
                                      alt={selectedRelease.artistName} 
                                      className="w-5 h-5 rounded-full object-cover shrink-0 border border-white/10" 
                                  />
                              ) : (
                                  <div className="w-5 h-5 rounded-full bg-surface-highlight flex items-center justify-center text-[10px] text-zinc-400 shrink-0">
                                      <User size={12} />
                                  </div>
                              )}
                              <span>{selectedRelease.artistName}</span>
                          </div>
                          <span className="text-zinc-500">•</span>
                          <span>{releaseYear}</span>
                          <span className="text-zinc-500">•</span>
                          <span>{trackCountText}</span>
                          <span className="text-zinc-500 hidden sm:inline">•</span>
                          <span className="text-zinc-400 hidden sm:inline">{totalDurationText}</span>
                      </div>

                      {/* Badges: Status, Genre, Label */}
                      <div className="flex items-center justify-center flex-wrap gap-1.5 sm:gap-2 mt-3">
                          <span className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider ${statusBadgeClass}`}>
                              {selectedRelease.status === 'LIVE' ? 'LIVE' : statusText}
                          </span>
                          {selectedRelease.genre && (
                              <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-white/[0.08] text-zinc-200 border border-white/10">
                                  {normalizeClassicGenre(selectedRelease.genre)}
                              </span>
                          )}
                          {selectedRelease.label && (
                              <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-white/[0.08] text-zinc-200 border border-white/10 max-w-[200px] truncate" title={`Лейбл: ${selectedRelease.label}`}>
                                  {selectedRelease.label}
                              </span>
                          )}
                          {selectedRelease.isAnnouncement && (
                              <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                                  <Megaphone size={12} />
                                  <span>Анонс</span>
                              </span>
                          )}
                      </div>

                      {/* Header Controls: Play, Stats, Edit, Delete */}
                      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 mt-4 sm:mt-5">
                          <button
                              type="button"
                              onClick={handleTogglePlayRelease}
                              className="flex items-center gap-2 bg-primary text-black font-bold px-5 sm:px-6 py-2 sm:py-2.5 rounded-full hover:scale-105 active:scale-95 transition text-xs sm:text-sm shadow-md"
                          >
                              {isReleasePlaying ? <Pause size={16} fill="black" /> : <Play size={16} fill="black" className="ml-0.5" />}
                              <span>{isReleasePlaying ? 'Пауза' : 'Слушать'}</span>
                          </button>

                          <button
                              type="button"
                              onClick={() => {
                                  setSelectedStatsRelease(selectedRelease);
                              }}
                              className="p-2 sm:p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition active:scale-95 group relative"
                              title="Статистика"
                              aria-label="Статистика"
                          >
                              <BarChart2 size={16} className="text-zinc-300 group-hover:text-primary transition-colors" />
                          </button>

                          {canEdit && (
                              <button
                                  type="button"
                                  onClick={() => {
                                      handleEditRelease(selectedRelease);
                                      setSelectedRelease(null);
                                  }}
                                  className="p-2 sm:p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition active:scale-95"
                                  title="Редактировать релиз"
                              >
                                  <Edit size={16} />
                              </button>
                          )}

                          {canDelete && (
                              <button
                                  type="button"
                                  onClick={() => {
                                      if (confirm(`Удалить релиз "${selectedRelease.title}"?`)) {
                                          deleteRelease(selectedRelease.id);
                                          setSelectedRelease(null);
                                      }
                                  }}
                                  className="p-2 sm:p-2.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition active:scale-95"
                                  title="Удалить релиз"
                              >
                                  <Trash2 size={16} />
                              </button>
                          )}
                      </div>

                      {selectedRelease.releaseMessage && (
                          <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 rounded-xl bg-white/5 border border-white/5 text-xs italic text-zinc-400 max-w-md mx-auto text-center">
                              "{selectedRelease.releaseMessage}"
                          </div>
                      )}
                  </div>

                  {/* Tracks Section */}
                  <div className="mt-6 sm:mt-8 flex flex-col gap-2.5 sm:gap-3">
                      <div className="flex items-center justify-between px-1">
                          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                              <span>Треки</span>
                              <span className="text-xs text-zinc-400 font-normal">({previewTracks.length})</span>
                          </h3>
                      </div>

                      <div className="flex flex-col gap-1.5 sm:gap-2">
                          {previewTracks.map((track, idx) => {
                              const isAnnounce = Boolean(selectedRelease.isAnnouncement);
                              const isHiddenMeta = Boolean(selectedRelease.hideTrackMetadata && isAnnounce);
                              const displayTitle = isHiddenMeta ? `Track ${idx + 1}` : (track.title?.trim() || `Трек ${idx + 1}`);
                              const displayArtist = isHiddenMeta ? selectedRelease.artistName : (track.artist || selectedRelease.artistName || "Артист");

                              // Comprehensive HUEQ lookup: existing, generated, or matched in library
                              const targetHueq = (track.generatedHueq || track.existingHueq || (track as any).hueq || '').trim().toUpperCase();
                              const matchingTracks = tracks.filter(t => 
                                  (track.id && t.id === track.id) ||
                                  (targetHueq && t.hueq && t.hueq.trim().toUpperCase() === targetHueq) ||
                                  (t.title?.trim().toLowerCase() === track.title?.trim().toLowerCase() && 
                                  (t.artist?.trim().toLowerCase() === (track.artist || selectedRelease.artistName)?.trim().toLowerCase() ||
                                   t.album?.trim().toLowerCase() === selectedRelease.title?.trim().toLowerCase()))
                              );
                              const matchingStoreTrack = matchingTracks.sort((a, b) => (b.plays || 0) - (a.plays || 0))[0];
                              const trackHueq = targetHueq || matchingStoreTrack?.hueq;

                              const hasAudio = Boolean(track.fileUrl || matchingStoreTrack?.url);
                              const isStoreTrackReleased = Boolean(matchingStoreTrack && !matchingStoreTrack.isUnreleased);

                              // Track is ONLY unreleased if:
                              // 1) The release has NOT yet come out (not LIVE and release date not passed),
                              // 2) Track has NO playable audio,
                              // 3) Track is NOT already released in the store catalog,
                              // 4) AND was explicitly created as an unreleased/empty placeholder!
                              const isUnreleasedTrack = !isReleaseOut && !hasAudio && !isStoreTrackReleased && Boolean(
                                  track.isEmpty || track.isUnreleased || (isAnnounce && !hasAudio)
                              );

                              const isThisTrackPlaying = isPlaying && currentTrack && (
                                  currentTrack.title === track.title && 
                                  (currentTrack.artist === (track.artist || selectedRelease.artistName) || (matchingStoreTrack && currentTrack.id === matchingStoreTrack.id))
                              );

                              const playableUrl = track.fileUrl || matchingStoreTrack?.url;
                              const trackDuration = track.duration || matchingStoreTrack?.duration || 180;
                              const resolvedPlays = Math.max(matchingStoreTrack?.plays || 0, track.plays || 0);

                              const handlePlayTrackRow = (e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  if (isUnreleasedTrack || !playableUrl) {
                                      showNotification('Аудиофайл не прикреплен к этому треку', 'info');
                                      return;
                                  }
                                  if (isThisTrackPlaying) {
                                      togglePlay();
                                      return;
                                  }
                                  const trackToPlay: Track = matchingStoreTrack || {
                                      id: track.id || `prev_${selectedRelease.id}_${idx}`,
                                      title: track.title || displayTitle,
                                      artist: track.artist || selectedRelease.artistName,
                                      album: selectedRelease.title,
                                      cover: selectedRelease.covers[0],
                                      duration: trackDuration,
                                      url: playableUrl,
                                      plays: resolvedPlays,
                                      explicit: track.explicit,
                                      hueq: trackHueq,
                                      genre: normalizeClassicGenre(track.genre || selectedRelease.genre)
                                  };
                                  playTrack(trackToPlay);
                              };
                              return (
                                  <div
                                      key={idx}
                                      onClick={handlePlayTrackRow}
                                      className={`flex items-center justify-between p-2 sm:p-2.5 md:p-3 rounded-xl sm:rounded-2xl transition group relative cursor-pointer gap-2 ${
                                          isThisTrackPlaying
                                            ? 'bg-white/[0.09] border border-primary/40 ring-1 ring-primary/30'
                                            : isLiquidGlass
                                              ? 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 hover:border-white/10'
                                              : 'bg-zinc-900/60 hover:bg-zinc-900 border border-white/5 hover:border-white/15'
                                      }`}
                                  >
                                      {/* Left: Index / Play, Cover, Title & Artist */}
                                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                          {/* Track Number / Play toggle button */}
                                          <div className="w-5 text-center shrink-0 flex items-center justify-center">
                                              {isThisTrackPlaying ? (
                                                  <Pause size={13} fill="currentColor" className="text-primary" />
                                              ) : (
                                                  <span className="text-xs text-zinc-500 font-mono group-hover:text-white transition">
                                                      {idx + 1}
                                                  </span>
                                              )}
                                          </div>

                                          {/* Small Thumbnail */}
                                          <img 
                                              src={selectedRelease.covers[0]} 
                                              alt={displayTitle} 
                                              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover bg-zinc-800 shrink-0 border border-white/5 shadow-sm" 
                                          />

                                          {/* Title and Artist */}
                                          <div className="flex flex-col min-w-0 flex-1 justify-center overflow-hidden">
                                              <div className="flex items-center gap-1.5 min-w-0">
                                                  <span className={`font-bold text-xs sm:text-sm truncate ${isThisTrackPlaying ? 'text-primary' : 'text-white'}`}>
                                                      {displayTitle}
                                                  </span>
                                                  {!isHiddenMeta && track.explicit && <ExplicitBadge />}
                                                  {isUnreleasedTrack && (
                                                      <span className="text-[9px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded uppercase shrink-0">
                                                          НЕ ВЫШЕЛ
                                                      </span>
                                                  )}
                                              </div>
                                              <span className="text-[11px] sm:text-xs text-zinc-400 truncate mt-0.5">
                                                  {displayArtist}
                                                  {track.feat && <span className="text-zinc-500"> (feat. {track.feat})</span>}
                                              </span>
                                          </div>
                                      </div>

                                      {/* Right: HUEQ CODE (напротив трека, visible on mobile and desktop), Duration, Actions */}
                                      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                                          {/* HUEQ Code Pill (Opposite the track, always visible on mobile & desktop) */}
                                          {trackHueq && !isHiddenMeta && (
                                              <div 
                                                  onClick={(e) => {
                                                      e.stopPropagation();
                                                      navigator.clipboard?.writeText(trackHueq);
                                                      showNotification(`HUEQ код скопирован: ${trackHueq}`, 'success');
                                                  }}
                                                  className="flex items-center gap-1 font-mono text-[10px] sm:text-xs text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 border border-emerald-500/30 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md transition cursor-pointer select-all shrink-0 shadow-sm"
                                                  title="Нажмите, чтобы скопировать HUEQ код"
                                              >
                                                  <span className="text-[8px] sm:text-[9px] text-emerald-500 font-sans font-bold">HUEQ</span>
                                                  <span className="tracking-wide font-semibold">{trackHueq}</span>
                                              </div>
                                          )}

                                          {/* Duration */}
                                          <span className="text-[11px] sm:text-xs text-zinc-400 font-mono w-8 sm:w-10 text-right shrink-0">
                                              {isUnreleasedTrack ? '—' : formatDuration(trackDuration)}
                                          </span>

                                          {/* Options / Copy button */}
                                          <button 
                                              type="button" 
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (trackHueq) {
                                                      navigator.clipboard?.writeText(trackHueq);
                                                      showNotification(`HUEQ код скопирован: ${trackHueq}`, 'success');
                                                  } else {
                                                      showNotification(`${displayTitle} • ${displayArtist}`, 'info');
                                                  }
                                              }}
                                              className="text-zinc-500 hover:text-white p-1 rounded-full hover:bg-white/5 transition shrink-0"
                                              title={trackHueq ? "Скопировать HUEQ" : "Опции трека"}
                                          >
                                              <MoreHorizontal size={16} />
                                          </button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderReleaseStatsModal = () => {
    if (!selectedStatsRelease) return null;

    const release = selectedStatsRelease;
    const releaseTracks = release.tracks || [];
    const count = releaseTracks.length;
    const trackCountText = `${count} ${count === 1 ? 'трек' : (count >= 2 && count <= 4) ? 'трека' : 'треков'}`;
    const releaseYear = extractReleaseDateParts(release.releaseDate)?.year || 2026;
    const coverUrl = release.covers && release.covers.length > 0 ? release.covers[0] : '';

    const statusBadgeClass =
      release.status === 'LIVE' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' :
      release.status === 'APPROVED' ? 'bg-white/[0.06] text-zinc-300 border border-white/10' :
      release.status === 'REJECTED' ? 'bg-red-500/15 text-red-400 border border-red-500/25' :
      'bg-white/[0.04] text-zinc-400 border border-white/[0.08]';

    const statusText =
      release.status === 'LIVE' ? 'LIVE' :
      release.status === 'APPROVED' ? 'Одобрен' :
      release.status === 'REJECTED' ? 'Отклонен' :
      'На модерации';

    const formatWithSpaces = (num: number): string => {
      return new Intl.NumberFormat('ru-RU').format(Math.round(num || 0)).replace(/\u00A0/g, ' ');
    };

    const getPluralPlays = (cnt: number): string => {
      const n = Math.abs(Math.round(cnt || 0)) % 100;
      const n1 = n % 10;
      if (n > 10 && n < 20) return 'прослушиваний';
      if (n1 > 1 && n1 < 5) return 'прослушивания';
      if (n1 === 1) return 'прослушивание';
      return 'прослушиваний';
    };

    // Determine release date and whether the release is not out yet
    let releaseDateObj: Date | null = null;
    if (release.releaseDate) {
      const parsed = new Date(release.releaseDate);
      if (!isNaN(parsed.getTime())) {
        releaseDateObj = parsed;
      }
    }

    const formatDisplayDate = (dObj: Date | null, rawDateStr?: string): string => {
      if (rawDateStr) {
        return formatNumericReleaseDate(rawDateStr);
      }
      if (dObj) {
        const day = String(dObj.getDate()).padStart(2, '0');
        const month = String(dObj.getMonth() + 1).padStart(2, '0');
        const year = dObj.getFullYear();
        return `${day}/${month}/${year}`;
      }
      return 'скоро';
    };

    const formattedReleaseDate = formatDisplayDate(releaseDateObj, release.releaseDate);
    const isFutureDate = Boolean(releaseDateObj && releaseDateObj.getTime() > Date.now());
    const isUnreleased = release.status !== 'LIVE' || isFutureDate;

    // 1. Release release time determination (every 24h updates at this exact time)
    let releaseHour = 0;
    let releaseMinute = 0;

    if (release.releaseTime && release.releaseTime.includes(':')) {
      const parts = release.releaseTime.split(':').map(Number);
      if (!isNaN(parts[0])) {
        releaseHour = parts[0];
        releaseMinute = parts[1] || 0;
      }
    } else if (release.releaseDate && release.releaseDate.includes('T')) {
      const parsed = new Date(release.releaseDate);
      if (!isNaN(parsed.getTime())) {
        releaseHour = parsed.getHours();
        releaseMinute = parsed.getMinutes();
      }
    } else if (release.submissionTime) {
      const parsed = new Date(release.submissionTime);
      if (!isNaN(parsed.getTime())) {
        releaseHour = parsed.getHours();
        releaseMinute = parsed.getMinutes();
      }
    }

    const timeFormatted = `${String(releaseHour).padStart(2, '0')}:${String(releaseMinute).padStart(2, '0')}`;

    // Current 24h cycle: starts at releaseHour:releaseMinute
    const now = new Date();
    let currentCycleStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), releaseHour, releaseMinute, 0, 0);
    if (now.getTime() < currentCycleStart.getTime()) {
      currentCycleStart = new Date(currentCycleStart.getTime() - 24 * 60 * 60 * 1000);
    }
    const nextCycleEnd = new Date(currentCycleStart.getTime() + 24 * 60 * 60 * 1000);
    const prevCycleStart = new Date(currentCycleStart.getTime() - 24 * 60 * 60 * 1000);
    const msUntilNextCycle = Math.max(1000, nextCycleEnd.getTime() - now.getTime());
    const hoursLeft = Math.floor(msUntilNextCycle / (60 * 60 * 1000));
    const minutesLeft = Math.floor((msUntilNextCycle % (60 * 60 * 1000)) / (60 * 1000));

    // 2. Compute Static Snapshot for Summary Cards & Tracks List (frozen for 24h until next update at release time)
    const prevCycleStartMs = prevCycleStart.getTime();
    const currentCycleStartMs = currentCycleStart.getTime();

    // Map each track and resolve all its aliases / IDs
    interface ProcessedTrackStat {
      index: number;
      title: string;
      artist: string;
      duration: number;
      cover: string;
      explicit?: boolean;
      totalPlays: number;
      todayPlays: number;
      yesterdayPlays: number;
      changePercent: number;
      changeLabel: string;
      changeType: 'positive' | 'negative' | 'neutral';
      isMatch: (logTrackId?: string) => boolean;
      allIds: string[];
    }

    const getLogPlaysCount = (l: { plays?: number }): number => {
      const p = Number(l.plays);
      return (!isNaN(p) && p > 0) ? p : 1;
    };

    const processedTracks: ProcessedTrackStat[] = releaseTracks.map((dt, idx) => {
      const displayTitle = dt.title?.trim() || `Трек ${idx + 1}`;
      const displayArtist = dt.artist || release.artistName || 'Артист';

      const dtHueq = (dt.existingHueq || dt.generatedHueq || (dt as any).hueq || '').trim().toUpperCase();

      const matchingTracks = tracks.filter(t =>
        (dt.id && t.id === dt.id) ||
        (dtHueq && t.hueq && t.hueq.trim().toUpperCase() === dtHueq) ||
        (t.title?.trim().toLowerCase() === displayTitle.toLowerCase() &&
         (t.artist?.trim().toLowerCase() === displayArtist.toLowerCase() ||
          t.album?.trim().toLowerCase() === release.title?.trim().toLowerCase()))
      );
      const matchingStoreTrack = matchingTracks.sort((a, b) => (b.plays || 0) - (a.plays || 0))[0];

      const allIds = Array.from(new Set([
        dt.id,
        ...(dt.legacyIds || []),
        ...matchingTracks.map(t => t.id),
        dt.existingHueq,
        dt.generatedHueq,
        dtHueq,
        ...matchingTracks.map(t => t.hueq).filter(Boolean),
        displayTitle,
        matchingStoreTrack?.title?.trim()
      ].filter(Boolean) as string[]));

      const isMatch = (logTrackId?: string): boolean => {
        if (!logTrackId) return false;
        const clean = logTrackId.trim().toLowerCase();
        return allIds.some(id => id.trim().toLowerCase() === clean);
      };

      // 24-hour window stats
      const last24hStart = Date.now() - 24 * 60 * 60 * 1000;
      const prev24hStart = Date.now() - 48 * 60 * 60 * 1000;

      const completedCycleLogs = releasePlayLogs.filter(l =>
        isMatch(l.trackId) && l.timestamp >= last24hStart
      );
      const staticTodayPlays = completedCycleLogs.reduce((acc, l) => acc + getLogPlaysCount(l), 0);

      const prevPrevLogs = releasePlayLogs.filter(l =>
        isMatch(l.trackId) && l.timestamp >= prev24hStart && l.timestamp < last24hStart
      );
      const staticYesterdayPlays = prevPrevLogs.reduce((acc, l) => acc + getLogPlaysCount(l), 0);

      // Exact total plays matching store track catalog or track metadata or storedPlays
      const storedPlays = StorageService.load<Record<string, number>>('huevify_plays', {});
      let maxStoredPlays = 0;
      allIds.forEach(id => {
        if (storedPlays[id]) maxStoredPlays = Math.max(maxStoredPlays, storedPlays[id]);
      });
      const staticTotalPlays = Math.max(
        matchingStoreTrack?.plays || 0,
        (dt as any).plays || 0,
        maxStoredPlays
      );

      // Real mathematical percentage change between the two static cycles
      let changePercent = 0;
      let changeLabel = '0%';
      let changeType: 'positive' | 'negative' | 'neutral' = 'neutral';

      if (staticYesterdayPlays === 0) {
        if (staticTodayPlays > 0) {
          changePercent = 100;
          changeLabel = '+100%';
          changeType = 'positive';
        } else {
          changePercent = 0;
          changeLabel = '0%';
          changeType = 'neutral';
        }
      } else {
        const diff = staticTodayPlays - staticYesterdayPlays;
        changePercent = Math.round((diff / staticYesterdayPlays) * 100);
        if (changePercent > 0) {
          changeLabel = `+${changePercent}%`;
          changeType = 'positive';
        } else if (changePercent < 0) {
          changeLabel = `${changePercent}%`;
          changeType = 'negative';
        } else {
          changeLabel = '0%';
          changeType = 'neutral';
        }
      }

      return {
        index: idx + 1,
        title: displayTitle,
        artist: displayArtist,
        duration: dt.duration || matchingStoreTrack?.duration || 180,
        cover: coverUrl,
        explicit: dt.explicit || matchingStoreTrack?.explicit,
        totalPlays: staticTotalPlays,
        todayPlays: staticTodayPlays,
        yesterdayPlays: staticYesterdayPlays,
        changePercent,
        changeLabel,
        changeType,
        isMatch,
        allIds
      };
    });

    const releaseTotalPlays = processedTracks.reduce((acc, t) => acc + t.totalPlays, 0);
    const releaseTodayPlays = processedTracks.reduce((acc, t) => acc + t.todayPlays, 0);
    const releaseYesterdayPlays = processedTracks.reduce((acc, t) => acc + t.yesterdayPlays, 0);

    let releaseChangeLabel = '0%';
    let releaseChangeType: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (releaseYesterdayPlays === 0) {
      if (releaseTodayPlays > 0) {
        releaseChangeLabel = '+100%';
        releaseChangeType = 'positive';
      } else {
        releaseChangeLabel = '0%';
        releaseChangeType = 'neutral';
      }
    } else {
      const diff = releaseTodayPlays - releaseYesterdayPlays;
      const pct = Math.round((diff / releaseYesterdayPlays) * 100);
      if (pct > 0) {
        releaseChangeLabel = `+${pct}%`;
        releaseChangeType = 'positive';
      } else if (pct < 0) {
        releaseChangeLabel = `${pct}%`;
        releaseChangeType = 'negative';
      } else {
        releaseChangeLabel = '0%';
        releaseChangeType = 'neutral';
      }
    }

    // 3. Generate REAL-TIME Daily Time Series for Chart (dynamically updates with live streams)
    const daysCount = statsPeriod;
    interface ChartPoint {
      dayIndex: number;
      date: Date;
      shortDate: string;
      fullDate: string;
      value: number;
    }

    const chartPoints: ChartPoint[] = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      // 24-hour cycle anchored to release time
      const cycleStart = new Date(currentCycleStart.getTime() - i * 24 * 60 * 60 * 1000);
      const cycleEnd = new Date(cycleStart.getTime() + 24 * 60 * 60 * 1000);

      // Filter exact logs in this 24h cycle (including live streams for today: i === 0)
      const cycleLogs = releasePlayLogs.filter(l => {
        if (l.timestamp < cycleStart.getTime() || l.timestamp >= cycleEnd.getTime()) return false;
        return processedTracks.some(pt => pt.isMatch(l.trackId));
      });

      const exactCyclePlays = cycleLogs.reduce((acc, l) => acc + getLogPlaysCount(l), 0);

      const rawShort = cycleStart.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
      const rawFull = cycleStart.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

      chartPoints.push({
        dayIndex: daysCount - 1 - i,
        date: cycleStart,
        shortDate: rawShort,
        fullDate: rawFull,
        value: exactCyclePlays
      });
    }

    // Chart dimensions & scaling: robust against any scale
    const maxVal = Math.max(...chartPoints.map(p => p.value), 0);
    let yMax = 100;
    if (maxVal > 1000000) {
      yMax = Math.ceil(maxVal / 250000) * 250000;
    } else if (maxVal > 100000) {
      yMax = Math.ceil(maxVal / 25000) * 25000;
    } else if (maxVal > 10000) {
      yMax = Math.ceil(maxVal / 2500) * 2500;
    } else if (maxVal > 1000) {
      yMax = Math.ceil(maxVal / 250) * 250;
    } else if (maxVal > 100) {
      yMax = Math.ceil(maxVal / 25) * 25;
    } else if (maxVal > 0) {
      yMax = Math.ceil(maxVal / 10) * 10;
    } else {
      yMax = 100;
    }

    const formatTick = (v: number) => {
      if (v >= 1000000) return `${(v / 1000000).toFixed(1).replace('.0', '')}M`;
      if (v >= 1000) return `${Math.round(v / 1000)}K`;
      return String(Math.round(v));
    };

    const yTicks = [
      { val: yMax, label: formatTick(yMax) },
      { val: Math.round(yMax * 0.75), label: formatTick(yMax * 0.75) },
      { val: Math.round(yMax * 0.5), label: formatTick(yMax * 0.5) },
      { val: Math.round(yMax * 0.25), label: formatTick(yMax * 0.25) },
      { val: 0, label: '0' }
    ];

    const svgWidth = 800;
    const svgHeight = 280;
    const padLeft = 60;
    const padRight = 30;
    const padTop = 30;
    const padBottom = 45;
    const plotW = svgWidth - padLeft - padRight;
    const plotH = svgHeight - padTop - padBottom;

    const coords = chartPoints.map((pt, idx) => {
      const x = padLeft + (idx / Math.max(chartPoints.length - 1, 1)) * plotW;
      const y = padTop + (1 - (pt.value / Math.max(yMax, 1))) * plotH;
      return { x, y, pt, idx };
    });

    // Create SVG smooth cubic spline curve
    let linePathD = '';
    if (coords.length > 0) {
      linePathD = `M ${coords[0].x},${coords[0].y}`;
      for (let i = 0; i < coords.length - 1; i++) {
        const p0 = coords[i === 0 ? 0 : i - 1];
        const p1 = coords[i];
        const p2 = coords[i + 1];
        const p3 = coords[i + 2] || p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        linePathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
      }
    }

    const firstX = coords[0]?.x || padLeft;
    const lastX = coords[coords.length - 1]?.x || (padLeft + plotW);
    const bottomY = padTop + plotH;
    const areaPathD = `${linePathD} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;

    const activePointIndex = hoveredGraphIndex !== null && hoveredGraphIndex >= 0 && hoveredGraphIndex < coords.length
      ? hoveredGraphIndex
      : coords.length - 1;
    const activePoint = coords[activePointIndex] || coords[coords.length - 1];

    const accentColor = appSettings?.accentColor || '#1ed760';

    return (
      <div 
        className="fixed inset-0 bg-black z-[260] flex flex-col w-full h-full overflow-y-auto animate-fade-in text-white scrollbar-thin"
      >
        {/* Top Sticky Navigation Bar */}
        <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-xl border-b border-surface-highlight px-4 sm:px-8 py-3.5 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              type="button"
              onClick={() => setSelectedStatsRelease(null)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-surface-highlight hover:bg-white/10 text-secondary hover:text-white border border-surface-highlight transition active:scale-95 text-xs sm:text-sm font-semibold shrink-0"
            >
              <ArrowLeft size={16} />
              <span>Назад</span>
            </button>
            <div className="h-5 w-[1px] bg-surface-highlight hidden sm:block shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-base sm:text-xl font-bold text-white tracking-tight truncate">
                Статистика релиза
              </h2>
              <span className="text-secondary/60 hidden sm:inline">•</span>
              <span className="text-primary font-bold text-sm sm:text-base truncate hidden sm:inline">
                {release.title}
              </span>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => setSelectedStatsRelease(null)} 
            className="text-secondary hover:text-white p-2 rounded-full hover:bg-surface-highlight transition shrink-0"
            title="Закрыть"
            aria-label="Закрыть"
          >
            <X size={22} />
          </button>
        </header>

        {/* Full-screen Content Container */}
        <main className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 flex flex-col gap-6 flex-1">
          {/* Release Profile & Period Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-surface border border-surface-highlight">
            {/* Release Left Details */}
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative shrink-0">
                <img 
                  src={coverUrl} 
                  alt={release.title} 
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-surface-highlight border border-white/10 shadow-md"
                />
                {release.covers && release.covers.length > 1 && (
                  <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] font-bold text-secondary px-2 py-0.5 rounded-full border border-white/10">
                    +{release.covers.length - 1}
                  </span>
                )}
              </div>

              <div className="flex flex-col min-w-0">
                <h3 className="text-lg sm:text-2xl font-bold text-white truncate tracking-tight">
                  {release.title}
                </h3>
                <div className="text-xs sm:text-sm text-secondary font-medium truncate mt-0.5">
                  {release.artistName}
                </div>
                <div className="text-[11px] sm:text-xs text-secondary/70 mt-1 truncate">
                  {release.type || 'Single'} • {releaseYear} • {trackCountText}
                </div>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${statusBadgeClass}`}>
                    {statusText}
                  </span>
                  {release.genre && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-surface-highlight text-secondary border border-surface-highlight">
                      {normalizeClassicGenre(release.genre)}
                    </span>
                  )}
                  {release.label && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-surface-highlight text-secondary border border-surface-highlight max-w-[180px] truncate" title={release.label}>
                      {release.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Period Switcher: 7 дней | 30 дней (only shown when release is released) */}
            {!isUnreleased && (
              <div className="inline-flex p-1 rounded-xl bg-surface-highlight border border-white/5 shrink-0 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => {
                    setStatsPeriod(7);
                    setHoveredGraphIndex(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
                    statsPeriod === 7
                      ? 'bg-primary text-black shadow-md'
                      : 'text-secondary hover:text-white'
                  }`}
                >
                  7 дней
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatsPeriod(30);
                    setHoveredGraphIndex(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
                    statsPeriod === 30
                      ? 'bg-primary text-black shadow-md'
                      : 'text-secondary hover:text-white'
                  }`}
                >
                  30 дней
                </button>
              </div>
            )}
          </div>

          {isUnreleased ? (
            /* Unreleased State: No statistics shown, clear friendly reminder with release date */
            <div className="p-8 sm:p-14 rounded-2xl bg-surface border border-surface-highlight flex flex-col items-center justify-center text-center my-auto min-h-[380px]">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-surface-highlight border border-surface-highlight flex items-center justify-center mb-5 text-secondary shadow-lg">
                <CalendarClock size={36} className="text-primary" />
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
                Релиз ещё не вышел
              </h3>

              <p className="text-secondary text-sm sm:text-base max-w-md mb-6 leading-relaxed">
                Статистика прослушиваний станет доступна после официального выхода релиза на платформе.
              </p>

              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-highlight border border-surface-highlight text-white text-xs sm:text-sm font-medium">
                <Clock size={15} className="text-primary shrink-0" />
                <span>
                  Возвращайтесь <strong className="text-white font-bold">{formattedReleaseDate}</strong>
                  {release.releaseTime ? ` в ${release.releaseTime}` : ''}
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Primary Metrics Row: 2 Key Cards with perfectly aligned numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Total Plays Card */}
                <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-surface-highlight flex flex-col justify-between">
                  <div className="flex items-center justify-between min-h-[28px]">
                    <div className="flex items-center gap-2 text-secondary text-xs font-semibold uppercase tracking-wider">
                      <Headphones size={18} className="text-primary shrink-0" />
                      <span>Прослушивания (всего)</span>
                    </div>
                  </div>

                  <div className="text-3xl sm:text-4xl font-black text-white my-3 sm:my-4 tracking-tight">
                    {formatWithSpaces(releaseTotalPlays)}
                  </div>

                  <div className="text-[11px] text-secondary/80 flex items-center gap-1.5 pt-2 border-t border-surface-highlight">
                    <Music size={12} className="text-secondary shrink-0" />
                    <span className="truncate">
                      Суммарно по всем трекам релиза
                    </span>
                  </div>
                </div>

                {/* Today Plays Card with 24h release-time update anchor */}
                <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-surface-highlight flex flex-col justify-between">
                  <div className="flex items-center justify-between min-h-[28px]">
                    <div className="flex items-center gap-2 text-secondary text-xs font-semibold uppercase tracking-wider">
                      <BarChart2 size={18} className="text-primary shrink-0" />
                      <span>Прослушивания за сутки</span>
                    </div>
                    <span className={`text-xs font-bold flex items-center gap-1 px-2.5 py-0.5 rounded-full border shrink-0 ${
                      releaseChangeType === 'positive'
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        : releaseChangeType === 'negative'
                        ? 'text-red-400 bg-red-500/10 border-red-500/20'
                        : 'text-secondary bg-surface-highlight border-surface-highlight'
                    }`}>
                      {releaseChangeType === 'positive' && 'тЖС '}
                      {releaseChangeType === 'negative' && 'тЖУ '}
                      {releaseChangeLabel} чем вчера
                    </span>
                  </div>

                  <div className="text-3xl sm:text-4xl font-black text-white my-3 sm:my-4 tracking-tight">
                    {formatWithSpaces(releaseTodayPlays)}
                  </div>

                  {/* 24-hour cycle update notice */}
                  <div className="text-[11px] text-secondary/80 flex items-center gap-1.5 pt-2 border-t border-surface-highlight">
                    <Clock size={12} className="text-secondary shrink-0" />
                    <span className="truncate">
                      Статичный отчёт • обновление каждые сутки в <strong className="text-zinc-200 font-medium">{timeFormatted}</strong> (след. через {hoursLeft} ч {minutesLeft} мин)
                    </span>
                  </div>
                </div>
              </div>

          {/* Large Interactive Chart: Прослушивания по дням */}
          <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-surface-highlight relative flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2.5">
                  <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Прослушивания по дням
                  </h4>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-highlight border border-white/10 text-secondary text-[11px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span>В реальном времени</span>
                  </div>
                </div>
                <p className="text-xs text-secondary/70 mt-0.5">
                  Суточная динамика релиза с живым обновлением текущих суток
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isLoadingStatsLogs && (
                  <span className="text-[11px] text-secondary animate-pulse flex items-center gap-1">
                    Синхронизация...
                  </span>
                )}
                <span className="text-xs text-secondary/80 bg-surface-highlight px-2.5 py-1 rounded-full border border-surface-highlight font-medium">
                  {statsPeriod === 7 ? 'Последние 7 дней' : 'Последние 30 дней'}
                </span>
              </div>
            </div>

            {/* SVG Chart Container with EXPLICIT CSS HEIGHT to prevent collapsing */}
            <div className="relative w-full h-[280px] sm:h-[320px] md:h-[360px] select-none rounded-2xl bg-black border border-surface-highlight p-2 sm:p-4">
              {/* Active Tooltip Popover */}
              {activePoint && (
                <div 
                  className="absolute pointer-events-none z-20 bg-surface border border-surface-highlight shadow-2xl rounded-xl p-3 transition-all duration-150 -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${(activePoint.x / svgWidth) * 100}%`,
                    top: `${Math.max(10, (activePoint.y / svgHeight) * 100 - 10)}%`
                  }}
                >
                  <div className="text-[11px] text-secondary font-medium">
                    {activePoint.pt.fullDate}
                  </div>
                  <div className="text-base sm:text-lg font-black text-white leading-tight mt-0.5">
                    {formatWithSpaces(activePoint.pt.value)}
                  </div>
                  <div className="text-[10px] text-secondary/70">
                    {getPluralPlays(activePoint.pt.value)}
                  </div>
                </div>
              )}

              <svg 
                viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                className="w-full h-full"
                style={{ display: 'block' }}
              >
                <defs>
                  <linearGradient id="chartAccentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accentColor} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={accentColor} stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines & Y-ticks */}
                {yTicks.map((t, idx) => {
                  const y = padTop + (1 - (t.val / Math.max(yMax, 1))) * plotH;
                  return (
                    <g key={idx}>
                      <line 
                        x1={padLeft} 
                        y1={y} 
                        x2={padLeft + plotW} 
                        y2={y} 
                        stroke="rgba(255,255,255,0.06)" 
                        strokeDasharray={t.val === 0 ? "0" : "3 3"}
                        strokeWidth="1"
                      />
                      <text 
                        x={padLeft - 10} 
                        y={y + 4} 
                        textAnchor="end" 
                        fill="rgba(255,255,255,0.35)" 
                        fontSize="11" 
                        fontWeight="500"
                        fontFamily="monospace"
                      >
                        {t.label}
                      </text>
                    </g>
                  );
                })}

                {/* Area Gradient Fill */}
                <path d={areaPathD} fill="url(#chartAccentGrad)" />

                {/* Main Stroke Curve */}
                <path 
                  d={linePathD} 
                  fill="none" 
                  stroke={accentColor} 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />

                {/* Vertical Cursor Line at active point */}
                {activePoint && (
                  <line 
                    x1={activePoint.x} 
                    y1={padTop} 
                    x2={activePoint.x} 
                    y2={bottomY} 
                    stroke={accentColor} 
                    strokeOpacity="0.35"
                    strokeDasharray="3 3" 
                    strokeWidth="1"
                  />
                )}

                {/* Interactive Points */}
                {coords.map((c) => {
                  const isActive = activePoint && activePoint.idx === c.idx;
                  return (
                    <g 
                      key={c.idx}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredGraphIndex(c.idx)}
                      onClick={() => setHoveredGraphIndex(c.idx)}
                    >
                      {/* Transparent hit target for mouse & touch */}
                      <circle cx={c.x} cy={c.y} r="18" fill="transparent" />

                      {isActive && (
                        <circle 
                          cx={c.x} 
                          cy={c.y} 
                          r="9" 
                          fill={`${accentColor}25`}
                          stroke={accentColor} 
                          strokeWidth="1.5" 
                        />
                      )}

                      <circle 
                        cx={c.x} 
                        cy={c.y} 
                        r={isActive ? "5" : "3.5"} 
                        fill={accentColor} 
                        stroke="#ffffff" 
                        strokeWidth="1.5"
                      />
                    </g>
                  );
                })}

                {/* X-axis date labels */}
                {coords.map((c, i) => {
                  const shouldShowLabel = statsPeriod === 7 
                    ? true 
                    : (i % 5 === 0 || i === coords.length - 1);

                  if (!shouldShowLabel) return null;

                  return (
                    <text
                      key={i}
                      x={c.x}
                      y={bottomY + 22}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.4)" 
                      fontSize={statsPeriod === 7 ? "11" : "10"}
                      fontWeight="500"
                    >
                      {c.pt.shortDate}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Tracks Section: Треки в релизе */}
          <div className="flex flex-col gap-3 pb-8">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Треки в релизе</span>
                <span className="text-xs text-secondary/70 font-normal">({processedTracks.length})</span>
              </h4>
            </div>

            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-surface-highlight bg-surface shadow-md">
              <div className="grid grid-cols-12 gap-3 px-5 py-3.5 border-b border-surface-highlight text-xs font-semibold text-secondary uppercase tracking-wider bg-surface-highlight/70">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-5">Название</div>
                <div className="col-span-2 text-right">Прослушивания (всего)</div>
                <div className="col-span-2 text-right">За сутки</div>
                <div className="col-span-2 text-right">Изменение</div>
              </div>

              <div className="divide-y divide-white/5">
                {processedTracks.map((trk) => (
                  <div 
                    key={trk.index} 
                    className="grid grid-cols-12 gap-3 px-5 py-3.5 items-center hover:bg-white/5 transition group"
                  >
                    <div className="col-span-1 text-center text-xs font-mono text-secondary/60 group-hover:text-white transition">
                      {trk.index}
                    </div>

                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      <img 
                        src={trk.cover} 
                        alt={trk.title} 
                        className="w-11 h-11 rounded-lg object-cover bg-surface-highlight border border-white/5 shrink-0 shadow-sm"
                      />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-semibold text-sm text-white truncate">
                            {trk.title}
                          </span>
                          {trk.explicit && <ExplicitBadge size="sm" />}
                        </div>
                        <div className="text-xs text-secondary truncate">
                          {trk.artist} • {formatDuration(trk.duration)}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-2 text-right font-bold text-sm text-white">
                      {formatWithSpaces(trk.totalPlays)}
                    </div>

                    <div className="col-span-2 text-right font-medium text-sm text-secondary">
                      {formatWithSpaces(trk.todayPlays)}
                    </div>

                    <div className="col-span-2 text-right">
                      <span className={`text-xs font-semibold ${
                        trk.changeType === 'positive'
                          ? 'text-emerald-400'
                          : trk.changeType === 'negative'
                          ? 'text-red-400'
                          : 'text-secondary/60'
                      }`}>
                        {trk.changeType === 'positive' && 'тЖС '}
                        {trk.changeType === 'negative' && 'тЖУ '}
                        {trk.changeLabel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Cards View (Hidden on desktop) */}
            <div className="md:hidden flex flex-col gap-2.5">
              {processedTracks.map((trk) => (
                <div 
                  key={trk.index}
                  className="p-3.5 rounded-2xl bg-surface border border-surface-highlight shadow-sm flex flex-col gap-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-secondary/60 w-4 text-center shrink-0">
                      {trk.index}
                    </span>
                    <img 
                      src={trk.cover} 
                      alt={trk.title} 
                      className="w-10 h-10 rounded-lg object-cover bg-surface-highlight border border-white/5 shrink-0 shadow-sm"
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold text-sm text-white truncate">
                          {trk.title}
                        </span>
                        {trk.explicit && <ExplicitBadge size="sm" />}
                      </div>
                      <div className="text-xs text-secondary truncate">
                        {trk.artist} • {formatDuration(trk.duration)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-surface-highlight text-center">
                    <div>
                      <div className="text-[10px] text-secondary/70 font-medium">Всего</div>
                      <div className="text-xs font-bold text-white truncate">
                        {formatWithSpaces(trk.totalPlays)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-secondary/70 font-medium">За сутки</div>
                      <div className="text-xs font-semibold text-secondary truncate">
                        {formatWithSpaces(trk.todayPlays)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-secondary/70 font-medium">Динамика</div>
                      <div className={`text-xs font-semibold truncate ${
                        trk.changeType === 'positive'
                          ? 'text-emerald-400'
                          : trk.changeType === 'negative'
                          ? 'text-red-400'
                          : 'text-secondary/60'
                      }`}>
                        {trk.changeType === 'positive' && 'тЖС '}
                        {trk.changeType === 'negative' && 'тЖУ '}
                        {trk.changeLabel}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
            </>
          )}
        </main>
      </div>
    );
  };

  const renderHueqImportModal = () => {
      // Find artist's own existing tracks with HUEQ codes for quick selection
      const artistOwnTracks = tracks.filter(t => {
          if (!t.hueq) return false;
          if (currentModerator) return true;
          const currentName = (currentArtist?.artistName || distArtistName || "").toLowerCase();
          if (!currentName) return false;
          return (
              t.artist?.toLowerCase() === currentName ||
              t.mainArtists?.some(ma => ma.toLowerCase() === currentName)
          );
      });

      return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsHueqModalOpen(false)}>
              <div
                  className={`rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-scale-up ${
                    isLiquidGlass
                      ? 'max-md:bg-white/[0.08] max-md:backdrop-blur-3xl max-md:border max-md:border-white/15 max-md:shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.25)] md:bg-surface md:border md:border-surface-highlight'
                      : 'bg-surface border border-surface-highlight'
                  }`}
                  onClick={e => e.stopPropagation()}
              >
                  {/* Header */}
                  <div className={`flex items-center justify-between p-5 border-b ${
                    isLiquidGlass
                      ? 'max-md:border-white/10 max-md:bg-white/[0.04] md:border-surface-highlight md:bg-surface-highlight/30'
                      : 'border-surface-highlight bg-surface-highlight/30'
                  }`}>
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                              <Search size={20} />
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-white leading-snug">{t('addByHueq') || "Загрузка трека по HUEQ"}</h3>
                              <p className="text-xs text-secondary">
                                  {t('searchByHueqDesc') || "Импорт существующего трека без повторной загрузки аудиофайла"}
                              </p>
                          </div>
                      </div>
                      <button
                          type="button"
                          onClick={() => setIsHueqModalOpen(false)}
                          className="text-secondary hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition"
                      >
                          <X size={20} />
                      </button>
                  </div>

                  {/* Body */}
                  <div className="p-5 overflow-y-auto flex flex-col gap-5">
                      {/* Input Section */}
                      <div className="flex flex-col gap-2">
                          <label className="text-xs font-bold uppercase text-secondary tracking-wider">
                              {t('enterHueqCode') || "HUEQ-код трека"}
                          </label>
                          <div className="flex gap-2">
                              <div className="relative flex-1">
                                  <input
                                      type="text"
                                      value={hueqInput}
                                      onChange={e => handleHueqInputChange(e.target.value)}
                                      onKeyDown={e => {
                                          if (e.key === 'Enter') {
                                              e.preventDefault();
                                              if (previewTrackFromHueq) {
                                                  handleAddTrackByHueq();
                                              } else {
                                                  handleHueqSearchClick();
                                              }
                                          }
                                      }}
                                      autoFocus
                                      placeholder={t('hueqPlaceholder') || "Введите HUEQ код (например, 123AB4)..."}
                                      className={`w-full focus:border-primary rounded-xl px-4 py-3 font-mono text-sm uppercase text-white placeholder:normal-case placeholder:text-secondary/60 focus:outline-none transition ${
                                        isLiquidGlass
                                          ? 'max-md:bg-white/[0.07] max-md:border-white/15 md:bg-background md:border-surface-highlight'
                                          : 'bg-background border-surface-highlight'
                                      }`}
                                  />
                                  {hueqInput && (
                                      <button
                                          type="button"
                                          onClick={() => { setHueqInput(""); setPreviewTrackFromHueq(null); setHueqLookupError(""); }}
                                          className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-white"
                                      >
                                          <X size={16} />
                                      </button>
                                  )}
                              </div>
                              <button
                                  type="button"
                                  onClick={handleHueqSearchClick}
                                  className={`font-bold px-4 py-3 rounded-xl hover:scale-105 transition text-sm shrink-0 ${
                                    isLiquidGlass
                                      ? 'max-md:bg-primary max-md:text-black max-md:shadow-[0_4px_16px_rgba(29,185,84,0.3)] md:bg-primary md:text-black'
                                      : 'bg-primary text-black'
                                  }`}
                              >
                                  {t('findAndAddTrack') || "Найти"}
                              </button>
                          </div>
                          {hueqLookupError && (
                              <div className="text-xs text-red-400 flex items-center gap-1.5 mt-1">
                                  <XCircle size={14} className="shrink-0" />
                                  <span>{hueqLookupError}</span>
                              </div>
                          )}
                      </div>

                      {/* Live Preview Card */}
                      {previewTrackFromHueq && (
                          <div className={`border rounded-xl p-4 flex flex-col gap-3 animate-fade-in ${
                            isLiquidGlass
                              ? 'max-md:bg-white/[0.06] max-md:border-primary/50 md:border-primary/40 md:bg-primary/5'
                              : 'border-primary/40 bg-primary/5'
                          }`}>
                              <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                                      <CheckCircle size={14} /> Трек найден
                                  </span>
                                  <span className="text-xs font-mono text-secondary bg-black/40 px-2 py-0.5 rounded">
                                      HUEQ: {previewTrackFromHueq.hueq}
                                  </span>
                              </div>
                              <div className="flex items-center gap-3">
                                  {previewTrackFromHueq.cover ? (
                                      <img
                                          src={previewTrackFromHueq.cover}
                                          alt={previewTrackFromHueq.title}
                                          className="w-14 h-14 rounded-lg object-cover bg-surface-highlight shrink-0 shadow"
                                      />
                                  ) : (
                                      <div className="w-14 h-14 rounded-lg bg-surface-highlight flex items-center justify-center text-secondary shrink-0">
                                          <FileAudio size={24} />
                                      </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                      <div className="font-bold text-white text-base truncate flex items-center gap-1.5">
                                          <span className="truncate">{previewTrackFromHueq.title}</span>
                                          {previewTrackFromHueq.explicit && <ExplicitBadge />}
                                      </div>
                                      <div className="text-secondary text-xs truncate">
                                          {previewTrackFromHueq.artist} {previewTrackFromHueq.feat ? `feat. ${previewTrackFromHueq.feat}` : ''}
                                      </div>
                                      <div className="text-[11px] text-secondary/70 mt-1 flex items-center gap-2">
                                          <span>{previewTrackFromHueq.genre || distGenre}</span>
                                          <span>•</span>
                                          <span>{formatDuration(previewTrackFromHueq.duration)}</span>
                                      </div>
                                  </div>
                              </div>
                              <button
                                  type="button"
                                  onClick={() => handleAddTrackByHueq()}
                                  className="w-full bg-white text-black font-bold py-2.5 rounded-xl hover:scale-[1.02] transition text-sm flex items-center justify-center gap-2 shadow"
                              >
                                  <Plus size={16} /> Добавить этот трек в релиз
                              </button>
                          </div>
                      )}

                      {/* Quick select from artist's existing catalog */}
                      {artistOwnTracks.length > 0 && (
                          <div className={`flex flex-col gap-2.5 border-t pt-4 ${
                            isLiquidGlass ? 'max-md:border-white/10 md:border-surface-highlight/50' : 'border-surface-highlight/50'
                          }`}>
                              <div className="text-xs font-bold text-secondary uppercase tracking-wider">
                                  {currentModerator ? "Все доступные треки с HUEQ:" : "Ваши треки с кодами HUEQ:"}
                              </div>
                              <div className="flex flex-col gap-2 max-h-[190px] overflow-y-auto pr-1">
                                  {artistOwnTracks.map(trk => {
                                      const isAdded = distTracks.some(dt =>
                                          (dt.existingHueq && dt.existingHueq.toUpperCase() === trk.hueq?.toUpperCase()) ||
                                          (dt.fileUrl && dt.fileUrl === trk.url && dt.title.toLowerCase() === trk.title.toLowerCase())
                                      );
                                      return (
                                          <div
                                              key={trk.id}
                                              className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                                                  isAdded
                                                      ? 'bg-surface-highlight/20 border-transparent opacity-60'
                                                      : isLiquidGlass
                                                        ? 'max-md:bg-white/[0.05] max-md:border-white/10 md:bg-background md:hover:bg-surface-highlight/40 md:border-surface-highlight/60'
                                                        : 'bg-background hover:bg-surface-highlight/40 border-surface-highlight/60'
                                              }`}
                                          >
                                              <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                                                  {trk.cover ? (
                                                      <img src={trk.cover} alt={trk.title} className="w-9 h-9 rounded object-cover shrink-0" />
                                                  ) : (
                                                      <div className="w-9 h-9 rounded bg-surface-highlight flex items-center justify-center text-secondary shrink-0">
                                                          <FileAudio size={16} />
                                                      </div>
                                                  )}
                                                  <div className="min-w-0 flex-1">
                                                      <div className="text-sm font-semibold text-white truncate flex items-center gap-1">
                                                          <span className="truncate">{trk.title}</span>
                                                          {trk.explicit && <ExplicitBadge />}
                                                      </div>
                                                      <div className="text-[11px] text-secondary/70 font-mono truncate">
                                                          HUEQ: {trk.hueq} • {formatDuration(trk.duration)}
                                                      </div>
                                                  </div>
                                              </div>
                                              <button
                                                  type="button"
                                                  disabled={isAdded}
                                                  onClick={() => handleAddTrackByHueq(trk)}
                                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                                                      isAdded
                                                          ? 'bg-transparent text-secondary cursor-not-allowed'
                                                          : isLiquidGlass
                                                            ? 'max-md:bg-white/[0.12] max-md:border max-md:border-white/15 max-md:hover:bg-white max-md:hover:text-black md:bg-surface-highlight md:hover:bg-white md:hover:text-black text-white'
                                                            : 'bg-surface-highlight hover:bg-white hover:text-black text-white'
                                                  }`}
                                              >
                                                  {isAdded ? "Добавлен" : "+ Добавить"}
                                              </button>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      )}
                  </div>

                  {/* Footer */}
                  <div className={`p-4 border-t flex justify-end ${
                    isLiquidGlass
                      ? 'max-md:border-white/10 max-md:bg-white/[0.02] md:border-surface-highlight md:bg-surface-highlight/20'
                      : 'border-surface-highlight bg-surface-highlight/20'
                  }`}>
                      <button
                          type="button"
                          onClick={() => setIsHueqModalOpen(false)}
                          className="px-4 py-2 text-sm text-secondary hover:text-white transition font-medium"
                      >
                          Закрыть
                      </button>
                  </div>
              </div>
          </div>
      );
  };

  const renderAddTrackMenu = () => (
      <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-md z-[260] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsAddTrackMenuOpen(false)}
      >
          <div 
              className={`w-full max-w-sm rounded-2xl p-5 sm:p-6 shadow-2xl border flex flex-col gap-4 animate-zoom-in ${
                  isLiquidGlass 
                    ? 'bg-zinc-900/95 backdrop-blur-2xl border-white/20 text-white shadow-[0_12px_40px_rgba(0,0,0,0.7)]' 
                    : 'bg-surface border-surface-highlight text-white'
              }`}
              onClick={e => e.stopPropagation()}
          >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h4 className="font-bold text-base sm:text-lg">Добавить трек</h4>
                  <button 
                      type="button" 
                      onClick={() => setIsAddTrackMenuOpen(false)} 
                      className="text-secondary hover:text-white p-1 rounded-full hover:bg-white/10 transition"
                  >
                      <X size={18} />
                  </button>
              </div>

              <p className="text-xs text-secondary leading-relaxed">
                  Выберите, какой трек вы хотите добавить: с аудиофайлом или пустой (для анонса):
              </p>

              <div className="flex flex-col gap-2.5">
                  <button
                      type="button"
                      onClick={() => {
                          setIsAddTrackMenuOpen(false);
                          fileInputRef.current?.click();
                      }}
                      className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/25 transition text-left group"
                  >
                      <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                          <FileAudio size={22} />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-bold text-sm text-white group-hover:text-primary transition">Аудио</span>
                          <span className="text-xs text-secondary truncate">Загрузить аудиофайл с устройства (.mp3, .wav)</span>
                      </div>
                  </button>

                  <button
                      type="button"
                      onClick={addEmptyTrack}
                      className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/25 transition text-left group"
                  >
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition border border-zinc-700/60">
                          <Clock size={20} />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white group-hover:text-zinc-200 transition">Пустой трек</span>
                              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800 border border-zinc-700 px-1.5 py-0.2 rounded uppercase">НЕ ВЫШЕЛ</span>
                          </div>
                          <span className="text-xs text-secondary truncate">Вместо трека показывается НЕ ВЫШЕЛ в треклисте</span>
                      </div>
                  </button>

                  <button
                      type="button"
                      onClick={() => {
                          setIsAddTrackMenuOpen(false);
                          setHueqInput("");
                          setHueqLookupError("");
                          setPreviewTrackFromHueq(null);
                          setIsHueqModalOpen(true);
                      }}
                      className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 transition text-left group"
                  >
                      <div className="w-10 h-10 rounded-xl bg-surface-highlight text-secondary flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                          <Search size={18} />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-bold text-sm text-white">По коду HUEQ</span>
                          <span className="text-xs text-secondary truncate">Использовать уже выпущенный трек</span>
                      </div>
                  </button>
              </div>

              <button
                  type="button"
                  onClick={() => setIsAddTrackMenuOpen(false)}
                  className="w-full py-2.5 text-xs text-secondary hover:text-white font-medium rounded-xl hover:bg-white/5 transition mt-1"
              >
                  Отмена
              </button>
          </div>
      </div>
  );

  const renderVerificationDetailModal = () => {
    if (!selectedVerificationRequest) return null;
    const req = selectedVerificationRequest;
    const existingArtist = artistAccounts.find(a => 
      a.id === req.artistId || (a.artistName || '').toLowerCase() === (req.artistName || '').toLowerCase()
    );
    const avatarImg = existingArtist?.avatar || "https://picsum.photos/300";

    const statusBadge = 
      req.status === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
      req.status === 'IN_REVIEW' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
      req.status === 'REJECTED' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
      'bg-amber-500/15 text-amber-400 border border-amber-500/30';

    const statusLabel = 
      req.status === 'APPROVED' ? 'Одобрено' :
      req.status === 'IN_REVIEW' ? 'На рассмотрении' :
      req.status === 'REJECTED' ? 'Отклонено' :
      'Ожидает рассмотрения';

    const formatNum = (num: number) => new Intl.NumberFormat('ru-RU').format(num);

    return (
      <div className="fixed inset-0 z-[250] bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 animate-fade-in">
        <div className="bg-[#121215] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-[#121215]/95 backdrop-blur-md border-b border-white/10 p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <img 
                src={avatarImg} 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover shrink-0 bg-zinc-800 border border-white/10 shadow-sm"
                alt=""
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base sm:text-lg text-white truncate">{req.artistName}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusBadge}`}>
                    {statusLabel}
                  </span>
                </div>
                <span className="text-xs text-zinc-400">Заявка на верификацию артиста</span>
              </div>
            </div>

            <button 
              onClick={() => setSelectedVerificationRequest(null)}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 flex flex-col gap-5 text-xs sm:text-sm">
            {/* Applicant Role */}
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex flex-col gap-1.5">
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Кого представляет</span>
              <span className="font-bold text-white text-sm sm:text-base">
                {req.applicantRole === 'ARTIST' && 'Я сам артист (подтверждение собственного профиля)'}
                {req.applicantRole === 'REPRESENTATIVE' && 'Я представитель артиста (менеджер)'}
                {req.applicantRole === 'CATALOG_MANAGER' && 'Я управляю каталогом артиста'}
              </span>
              <span className="text-xs text-zinc-400">
                Имя в Huevify: <strong className="text-zinc-200">{req.artistNameCheck}</strong>
              </span>
            </div>

            {/* Proof Method & Specifics */}
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex flex-col gap-3">
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Способ подтверждения личности</span>
              
              {req.proofMethod === 'SOCIAL' && (
                <div className="flex flex-col gap-3">
                  <div>
                    <span className="text-zinc-400 block mb-1">Ссылка на канал артиста:</span>
                    <a 
                      href={req.socialLink?.startsWith('http') ? req.socialLink : `https://${req.socialLink}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1.5 font-semibold break-all"
                    >
                      <span>{req.socialLink}</span>
                      <ExternalLink size={13} className="shrink-0" />
                    </a>
                  </div>

                  {req.verificationCode && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3.5 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-300">Уникальный проверочный код:</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(req.verificationCode || '');
                            showNotification('Код скопирован!', 'info');
                          }}
                          className="text-xs font-bold bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                        >
                          <Copy size={12} />
                          <span>Скопировать</span>
                        </button>
                      </div>
                      <div className="text-xl sm:text-2xl font-mono font-black text-white tracking-widest bg-black/40 p-2.5 rounded-lg text-center border border-white/10 select-all">
                        {req.verificationCode}
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        Убедитесь, что артист опубликовал данный код в посте или в описании указанного канала.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {req.proofMethod === 'TELEGRAM' && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-zinc-400">Telegram username:</span>
                  <a 
                    href={`https://t.me/${(req.telegramUsername || '').replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline font-bold text-base flex items-center gap-1.5"
                  >
                    <span>{req.telegramUsername}</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}

              {req.proofMethod === 'OTHER' && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-zinc-400">Описание способа:</span>
                  <div className="text-zinc-200 bg-black/30 p-3 rounded-lg border border-white/5 whitespace-pre-wrap">
                    {req.otherProofText}
                  </div>
                </div>
              )}
            </div>

            {/* Additional Info if provided */}
            {req.additionalInfo && (
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex flex-col gap-1.5">
                <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Дополнительная информация</span>
                <p className="text-zinc-300 whitespace-pre-wrap">{req.additionalInfo}</p>
              </div>
            )}

            {/* Criteria Snapshot */}
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex flex-col gap-2.5">
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Выполнение критериев на момент подачи</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-black/20 border border-white/5">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                    req.criteriaSnapshot.monthlyPlays >= 300000 ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'
                  }`}>
                    <Check size={10} strokeWidth={3} />
                  </span>
                  <span className="text-xs text-zinc-300">
                    Прослушивания: <strong className="text-white">{formatNum(req.criteriaSnapshot.monthlyPlays)}</strong> / 300k
                  </span>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-black/20 border border-white/5">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                    req.criteriaSnapshot.approvedReleasesCount >= 3 ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'
                  }`}>
                    <Check size={10} strokeWidth={3} />
                  </span>
                  <span className="text-xs text-zinc-300">
                    Одобрено релизов: <strong className="text-white">{req.criteriaSnapshot.approvedReleasesCount}</strong> / 3
                  </span>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-black/20 border border-white/5">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                    req.criteriaSnapshot.uniqueListeners >= 2 ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'
                  }`}>
                    <Check size={10} strokeWidth={3} />
                  </span>
                  <span className="text-xs text-zinc-300">
                    Уникальные слушатели: <strong className="text-white">{req.criteriaSnapshot.uniqueListeners}</strong> / 2
                  </span>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-black/20 border border-white/5">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                    req.criteriaSnapshot.hasProfileFilled ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'
                  }`}>
                    <Check size={10} strokeWidth={3} />
                  </span>
                  <span className="text-xs text-zinc-300">
                    Профиль заполнен: <strong className="text-white">{req.criteriaSnapshot.hasProfileFilled ? 'Да' : 'Нет'}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Date info */}
            <div className="text-xs text-zinc-500 flex items-center justify-between pt-1">
              <span>Подана: {formatRussianDateTime(req.submittedAt)}</span>
              {req.rejectionReason && (
                <span className="text-rose-400">Причина отклонения: {req.rejectionReason}</span>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-[#121215]/95 backdrop-blur-md border-t border-white/10 p-4 sm:p-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setSelectedVerificationRequest(null)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white transition"
            >
              Закрыть
            </button>

            <div className="flex items-center gap-2">
              {req.status === 'PENDING' && (
                <button
                  type="button"
                  onClick={() => {
                    startReviewVerificationRequest(req.id);
                    setSelectedVerificationRequest(prev => prev ? { ...prev, status: 'IN_REVIEW' } : null);
                  }}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-white border border-blue-500/30 transition flex items-center gap-1.5"
                >
                  <Clock size={13} />
                  <span>Взять на рассмотрение</span>
                </button>
              )}

              {req.status !== 'APPROVED' && (
                <button
                  type="button"
                  onClick={() => {
                    approveVerificationRequest(req.id);
                    setSelectedVerificationRequest(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-md transition flex items-center gap-1.5"
                >
                  <Check size={14} strokeWidth={3} />
                  <span>Принять</span>
                </button>
              )}

              {req.status !== 'REJECTED' && (
                <button
                  type="button"
                  onClick={() => {
                    setRejectModalReqId(req.id);
                    setRejectReasonInput('');
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 transition flex items-center gap-1.5"
                >
                  <X size={14} strokeWidth={2.5} />
                  <span>Отклонить</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRejectModal = () => {
    if (!rejectModalReqId) return null;
    return (
      <div className="fixed inset-0 z-[260] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-base text-white">Отклонить заявку на верификацию</h3>
            <button 
              onClick={() => setRejectModalReqId(null)}
              className="text-zinc-400 hover:text-white p-1 rounded-full"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Укажите причину отклонения. Артист увидит её в личном кабинете. Повторная подача заявки будет заблокирована на 30 дней.
          </p>

          <textarea
            rows={3}
            value={rejectReasonInput}
            onChange={e => setRejectReasonInput(e.target.value)}
            placeholder="Например: Проверочный код не найден в описании канала..."
            className="w-full bg-black/40 border border-white/10 focus:border-white/30 rounded-xl p-3 text-xs text-white focus:outline-none transition resize-none"
          />

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5">
            {[
              'Код не найден в описании канала',
              'Недействительная ссылка на соц. сети',
              'Недостаточно подтверждающих данных',
              'Нарушение правил сообщества'
            ].map(preset => (
              <button
                key={preset}
                type="button"
                onClick={() => setRejectReasonInput(preset)}
                className="text-[10px] px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition"
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => setRejectModalReqId(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-300 transition"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => {
                rejectVerificationRequest(rejectModalReqId, rejectReasonInput);
                setRejectModalReqId(null);
                if (selectedVerificationRequest && selectedVerificationRequest.id === rejectModalReqId) {
                  setSelectedVerificationRequest(null);
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-md transition"
            >
              Отклонить заявку
            </button>
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
            <div className="flex-1 overflow-y-auto w-full min-h-0 py-4 sm:py-6 px-3 sm:px-6 flex justify-center items-start">
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
        {isVerificationModalOpen && (
            <ArtistVerificationModal
                isOpen={isVerificationModalOpen}
                onClose={() => setVerificationModalOpen(false)}
            />
        )}
        {selectedVerificationRequest && renderVerificationDetailModal()}
        {rejectModalReqId && renderRejectModal()}
        {selectedRelease && renderReleaseDetailModal()}
        {selectedStatsRelease && renderReleaseStatsModal()}
        {isHueqModalOpen && renderHueqImportModal()}
        {isAddTrackMenuOpen && renderAddTrackMenu()}
        {lyricsModalTrackIdx !== null && distTracks[lyricsModalTrackIdx] && (
            <LyricsSyncModal
                isOpen={lyricsModalTrackIdx !== null}
                track={distTracks[lyricsModalTrackIdx]}
                trackIndex={lyricsModalTrackIdx}
                artistName={distArtistName || currentArtist?.artistName}
                onClose={() => setLyricsModalTrackIdx(null)}
                onSave={async (lyrics, syncedLyrics) => {
                    const trk = distTracks[lyricsModalTrackIdx];
                    if (!trk) return;
                    const trackHueq = (trk.existingHueq || trk.generatedHueq || generateHUEQ()).trim().toUpperCase();
                    
                    updateTrack(lyricsModalTrackIdx, 'lyrics', lyrics);
                    updateTrack(lyricsModalTrackIdx, 'syncedLyrics', syncedLyrics);
                    updateTrack(lyricsModalTrackIdx, 'generatedHueq', trackHueq);

                    // Update live in store if track exists in player/library
                    setTracks(prev => prev.map(t => {
                        if ((t.hueq && t.hueq.toUpperCase() === trackHueq) || (trk.id && t.id === trk.id)) {
                            return { ...t, lyrics, syncedLyrics };
                        }
                        return t;
                    }));
                    if (currentTrack && ((currentTrack.hueq && currentTrack.hueq.toUpperCase() === trackHueq) || (trk.id && currentTrack.id === trk.id))) {
                        setCurrentTrack(prev => prev ? { ...prev, lyrics, syncedLyrics } : null);
                    }
                    
                    if (isSupabaseConfigured()) {
                        try {
                            const res = await SupabaseService.saveTrackLyrics({
                                hueq: trackHueq,
                                trackId: trk.id || (editingId ? `dist_trk_${editingId}_${lyricsModalTrackIdx}` : undefined),
                                artistId: currentArtist?.id || (currentModerator ? 'mod' : 'unknown'),
                                lyrics: lyrics || undefined,
                                syncedLyrics: syncedLyrics
                            });
                            if (!res.success) {
                                console.warn("Supabase track_lyrics save error:", res.error);
                                if (res.error?.toLowerCase().includes('row-level security') || res.error?.includes('42501')) {
                                    showNotification("RLS блокирует запись в track_lyrics в Supabase. Отключите RLS или добавьте политику доступа.", "error");
                                    return;
                                } else if (res.error) {
                                    showNotification(`Ошибка сохранения в базу: ${res.error}`, "error");
                                    return;
                                }
                            }
                        } catch (e: any) {
                            console.warn("Save lyrics to Supabase error:", e);
                        }
                    }
                    showNotification(syncedLyrics ? "Текст трека синхронизирован и сохранен в базу!" : "Текст трека сохранен в базу!", "success");
                }}
            />
        )}
    </div>
  );
};
