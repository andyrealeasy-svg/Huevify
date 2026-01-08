import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { 
  X, Mic2, Shield, User, UploadCloud, Calendar, FileAudio, 
  CheckCircle, XCircle, Clock, MoreVertical, Image, Plus,
  Edit, ArrowLeft, Camera, LogOut, ChevronDown, Trash2, ListMusic, Check, Search, Play, BarChart2, Globe
} from './Icons.tsx';
import { DistributionTrack, ReleaseType, ReleaseRequest } from '../types.ts';

type HubView = 'AUTH' | 'ARTIST_DASH' | 'MOD_DASH' | 'DISTRIBUTION' | 'PROFILE_EDIT' | 'ARTIST_PICK';

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
    submitRelease, getArtistStats, submitProfileEdit, hasModerator, existingArtists,
    deleteRelease, getTrackByHueq, tracks, albums, playlists, showNotification
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
  const [distType, setDistType] = useState<ReleaseType>('Single');
  const [distGenre, setDistGenre] = useState("Pop");
  const [distLabel, setDistLabel] = useState("");
  const [distCovers, setDistCovers] = useState<string[]>([]);
  const [distMainArtists, setDistMainArtists] = useState<string[]>([]);
  const [distMainArtistInput, setDistMainArtistInput] = useState("");
  const [distTracks, setDistTracks] = useState<DistributionTrack[]>([]);
  
  // Track Tag Inputs (Step 2)
  const [trackArtistInputs, setTrackArtistInputs] = useState<Record<number, string>>({});

  const [distDate, setDistDate] = useState("");
  const [distTime, setDistTime] = useState("00:00");
  const [distMsg, setDistMsg] = useState("");

  // Edit Profile State
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");

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
          }
          else if (currentModerator) setView('MOD_DASH');
          else setView('AUTH');
      }
  }, [isArtistHubOpen, currentArtist, currentModerator]);

  if (!isArtistHubOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      setMessage("");
      const res = loginArtistOrMod(username, password, role);
      if (res.success) {
          if (role === 'ARTIST') {
              setView('ARTIST_DASH');
          }
          else setView('MOD_DASH');
          showNotification("Welcome back!", "success");
      } else {
          setMessage(res.message || "Login failed");
      }
  };

  const handleRegister = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (role === 'MODERATOR') {
          if (hasModerator) {
              setMessage("Moderator registration is closed.");
              return;
          }
          const res = registerModerator({ username, password });
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
          setMessage("Please select or enter an artist name.");
          return;
      }

      const res = registerArtist({
          artistName: finalArtistName, 
          username, 
          password,
          artistPick: undefined
      });
      
      if (res.success) {
          setMessage("Registration sent for approval.");
          setAuthMode('LOGIN');
      } else {
          setMessage(res.message || "Error registering");
      }
  };

  // --- Distribution Handlers ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          // Convert to Base64 for persistence
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64Audio = reader.result as string;
              
              // Create temp audio element to get duration
              const audio = new Audio(base64Audio);
              audio.onloadedmetadata = () => {
                  const newTrack: DistributionTrack = {
                      title: file.name.replace(/\.[^/.]+$/, ""),
                      explicit: false,
                      mainArtists: [],
                      genre: distGenre, // Default to release genre
                      duration: audio.duration,
                      fileUrl: base64Audio
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
              showNotification("Please complete all required fields (Title, Type, Genre, Covers)", "error");
              return;
          }
      }
      if (distStep === 2) {
          if (distTracks.length === 0) {
              showNotification("Please add at least one track.", "error");
              return;
          }
      }
      setDistStep(prev => prev + 1);
  };

  const handleSubmitRelease = () => {
      if (!distDate || !distTime) {
          showNotification("Please specify Release Date and Time.", "error");
          return;
      }
      
      const dateTime = new Date(`${distDate}T${distTime}:00+03:00`);
      
      submitRelease({
          title: distTitle,
          type: distType,
          genre: distGenre,
          label: distLabel || (currentArtist?.artistName || ""),
          covers: distCovers, // Changed to array
          additionalMainArtists: distMainArtists,
          tracks: distTracks,
          releaseDate: dateTime.toISOString(),
          releaseMessage: distMsg
      });
      
      showNotification("Release submitted for approval!", "success");
      setView('ARTIST_DASH');
      // Reset
      setDistStep(1); setDistTitle(""); setDistTracks([]); setDistCovers([]); setDistMsg(""); setDistMainArtists([]); setTrackArtistInputs({});
  };
  
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
          Array.from(files).forEach((file: File) => {
              const reader = new FileReader();
              reader.onloadend = () => setDistCovers(prev => [...prev, reader.result as string]);
              reader.readAsDataURL(file);
          });
      }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileUpdate = () => {
      if (!currentArtist) return;
      submitProfileEdit({ newBio: editBio, newAvatar: editAvatar });
      showNotification("Profile update sent for moderation approval.", "success");
      setView('ARTIST_DASH');
  };

  // --- RENDERERS ---

  const renderAuth = () => (
      <div className="w-full max-w-md bg-surface p-8 rounded-xl shadow-2xl border border-surface-highlight animate-zoom-in">
          <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center animate-bounce">
                  {role === 'ARTIST' ? <Mic2 size={32} className="text-primary" /> : <Shield size={32} className="text-primary" />}
              </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-6">{authMode === 'LOGIN' ? 'Log in to' : 'Join'} Huevify For {role === 'ARTIST' ? 'Artists' : 'Moderators'}</h2>
          
          <div className="flex bg-surface-highlight p-1 rounded-full mb-6">
              <button 
                  onClick={() => setRole('ARTIST')} 
                  className={`flex-1 py-2 rounded-full text-sm font-bold transition-all duration-300 ${role === 'ARTIST' ? 'bg-primary text-black shadow-lg' : 'text-secondary hover:text-white'}`}
              >
                  Artist
              </button>
              
              {(!hasModerator || authMode === 'LOGIN') && (
                  <button 
                      onClick={() => setRole('MODERATOR')}
                      className={`flex-1 py-2 rounded-full text-sm font-bold transition-all duration-300 ${role === 'MODERATOR' ? 'bg-primary text-black shadow-lg' : 'text-secondary hover:text-white'}`}
                  >
                      Moderator
                  </button>
              )}
          </div>

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
                                  <option value="">Select Artist...</option>
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
                  type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}
                  className="bg-background p-3 rounded border border-surface-highlight focus:border-primary focus:outline-none transition-colors"
              />
              <input 
                  type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                  className="bg-background p-3 rounded border border-surface-highlight focus:border-primary focus:outline-none transition-colors"
              />
              
              <button type="submit" className="bg-primary text-black font-bold py-3 rounded-full hover:scale-105 transition-transform mt-2 shadow-lg hover:shadow-primary/20">
                  {authMode === 'LOGIN' ? 'Log In' : 'Submit Application'}
              </button>
          </form>

          <p className="text-center text-secondary text-sm mt-4">
              {authMode === 'LOGIN' ? "Don't have an account?" : "Already have an account?"} 
              <button onClick={() => { setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN'); setMessage(""); }} className="text-white font-bold ml-1 hover:underline">
                  {authMode === 'LOGIN' ? 'Sign up' : 'Log in'}
              </button>
          </p>
      </div>
  );

  const renderModDash = () => (
      <div className="w-full h-full flex flex-col p-6 relative overflow-y-auto animate-fade-in pb-24">
          <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold flex items-center gap-3"><Shield className="text-primary"/> Moderator Dashboard</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Artist Requests */}
              <div className="bg-surface rounded-xl p-4 flex flex-col border border-surface-highlight max-h-[500px]">
                  <h3 className="font-bold mb-4 flex items-center gap-2 text-primary"><User size={18}/> Pending Artists</h3>
                  <div className="overflow-y-auto flex-1 flex flex-col gap-3">
                      {artistAccounts.filter(a => a.status === 'PENDING').length === 0 && <span className="text-secondary text-sm">No pending requests</span>}
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
                  <h3 className="font-bold mb-4 flex items-center gap-2 text-primary"><UploadCloud size={18}/> Pending Releases</h3>
                  <div className="overflow-y-auto flex-1 flex flex-col gap-3">
                      {releaseRequests.filter(r => (r.status === 'PENDING' || r.deletionRequested)).length === 0 && <span className="text-secondary text-sm">No pending releases</span>}
                      {releaseRequests.filter(r => (r.status === 'PENDING' || r.deletionRequested)).map(r => (
                          <div key={r.id} className="p-3 bg-surface-highlight rounded flex gap-3 cursor-pointer hover:bg-zinc-800 transition-colors animate-slide-in-bottom items-start" onClick={() => setSelectedRelease(r)}>
                              <img src={r.covers[0]} className="w-12 h-12 rounded object-cover flex-shrink-0" alt=""/>
                              <div className="flex-1 min-w-0 flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                      <div className="font-bold truncate">{r.title}</div>
                                      {r.deletionRequested && <span className="text-[10px] bg-red-500 text-white px-1 rounded font-bold">DELETE REQ</span>}
                                  </div>
                                  <div className="text-xs text-secondary truncate">{r.artistName} • {r.type}</div>
                                  <div className="flex gap-2 justify-end mt-1" onClick={e => e.stopPropagation()}>
                                      {r.deletionRequested ? (
                                           <>
                                             <button onClick={() => approveRelease(r.id)} className="text-red-500 hover:text-white text-[10px] font-bold uppercase border border-red-500 px-2 py-0.5 rounded hover:bg-red-500 transition">Confirm Delete</button>
                                             {/* Reject Deletion Button */}
                                             <button onClick={() => rejectRelease(r.id)} className="text-blue-500 hover:text-white text-[10px] font-bold uppercase border border-blue-500 px-2 py-0.5 rounded hover:bg-blue-500 transition">Reject Del</button>
                                           </>
                                      ) : (
                                          <>
                                            <button onClick={() => approveRelease(r.id)} className="text-green-500 hover:text-white text-[10px] font-bold uppercase border border-green-500 px-2 py-0.5 rounded hover:bg-green-500 transition">Approve</button>
                                            <button onClick={() => rejectRelease(r.id)} className="text-red-500 hover:text-white text-[10px] font-bold uppercase border border-red-500 px-2 py-0.5 rounded hover:bg-red-500 transition">Reject</button>
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
                  <h3 className="font-bold mb-4 flex items-center gap-2 text-primary"><Edit size={18}/> Profile Edits</h3>
                  <div className="overflow-y-auto flex-1 flex flex-col gap-3">
                      {profileEditRequests.filter(r => r.status === 'PENDING').length === 0 && <span className="text-secondary text-sm">No pending edits</span>}
                      {profileEditRequests.filter(r => r.status === 'PENDING').map(r => (
                          <div key={r.id} className="p-3 bg-surface-highlight rounded flex flex-col gap-2 animate-slide-in-bottom">
                               <div className="font-bold text-sm">{r.artistName} updates</div>
                               {r.newAvatar && <div className="text-xs text-secondary">New Avatar</div>}
                               {r.newBio && <div className="text-xs text-secondary bg-black/20 p-1 rounded italic line-clamp-2">Bio: {r.newBio}</div>}
                               {r.newArtistPick && <div className="text-xs text-secondary bg-black/20 p-1 rounded italic">New Pick: {r.newArtistPick.subtitle}</div>}
                               <div className="flex gap-2 justify-end">
                                  <button onClick={() => approveProfileEdit(r.id)} className="text-green-500 hover:text-white text-xs font-bold uppercase border border-green-500 px-2 py-1 rounded hover:bg-green-500 transition">Approve</button>
                                  <button onClick={() => rejectProfileEdit(r.id)} className="text-red-500 hover:text-white text-xs font-bold uppercase border border-red-500 px-2 py-1 rounded hover:bg-red-500 transition">Reject</button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          <div className="absolute bottom-6 left-6">
              <button 
                  onClick={() => { logoutArtistHub(); setView('AUTH'); }} 
                  className="flex items-center gap-2 px-4 py-2 bg-surface-highlight rounded-full text-secondary hover:text-white hover:bg-red-500 hover:text-white transition font-bold shadow-lg"
              >
                  <LogOut size={18} />
                  Log Out
              </button>
          </div>
      </div>
  );

  const renderDistribution = () => (
      <div className="w-full max-w-4xl bg-surface p-8 rounded-xl shadow-2xl border border-surface-highlight animate-zoom-in relative max-h-[90vh] overflow-y-auto">
          <button onClick={() => setView('ARTIST_DASH')} className="absolute top-8 left-8 text-secondary hover:text-white"><ArrowLeft size={24}/></button>
          <h2 className="text-3xl font-bold text-center mb-8">New Release</h2>
          
          {/* Progress Steps */}
          <div className="flex justify-center gap-4 mb-8">
              {[1, 2, 3].map(s => (
                  <div key={s} className={`w-3 h-3 rounded-full ${distStep >= s ? 'bg-primary' : 'bg-surface-highlight'}`} />
              ))}
          </div>

          {distStep === 1 && (
              <div className="flex flex-col gap-6 animate-slide-in-right">
                  <h3 className="text-xl font-bold">Step 1: Release Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-4">
                          <input type="text" placeholder="Release Title *" value={distTitle} onChange={e => setDistTitle(e.target.value)} className="bg-background p-3 rounded border border-surface-highlight focus:border-primary focus:outline-none" />
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
                          <input type="text" placeholder="Record Label" value={distLabel} onChange={e => setDistLabel(e.target.value)} className="bg-background p-3 rounded border border-surface-highlight focus:border-primary focus:outline-none" />
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
                                      <span className="text-secondary text-sm font-bold">Upload Covers *</span>
                                  </>
                              )}
                              <input type="file" multiple ref={coverInputRef} className="hidden" accept="image/*" onChange={handleCoverUpload} />
                          </div>
                          
                          {/* Main Artists */}
                          <div>
                              <label className="text-xs text-secondary font-bold uppercase mb-2 block">Additional Main Artists</label>
                              <div className="flex gap-2">
                                  <input type="text" value={distMainArtistInput} onChange={e => setDistMainArtistInput(e.target.value)} className="flex-1 bg-background p-2 rounded border border-surface-highlight text-sm" placeholder="Artist Name" />
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
                  <h3 className="text-xl font-bold">Step 2: Tracks</h3>
                  
                  <div className="flex justify-end">
                      <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-bold hover:scale-105 transition">
                          <Plus size={18}/> Add Track (Upload Audio)
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="audio/*" onChange={handleFileUpload} />
                  </div>

                  <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto">
                      {distTracks.map((track, i) => (
                          <div key={i} className="bg-surface-highlight p-4 rounded flex flex-col gap-3">
                              <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-zinc-800 rounded flex items-center justify-center text-xs font-bold text-secondary">{i+1}</div>
                                      <input 
                                          type="text" 
                                          value={track.title} 
                                          onChange={e => updateTrack(i, 'title', e.target.value)}
                                          className="bg-transparent border-b border-secondary/50 focus:border-white focus:outline-none font-bold text-lg w-full"
                                          placeholder="Track Title"
                                      />
                                  </div>
                                  <button onClick={() => setDistTracks(distTracks.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-400"><Trash2 size={20}/></button>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Left Col: HUEQ & Explicit */}
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
                                              <span className="text-xs font-bold uppercase text-secondary">Explicit</span>
                                          </label>
                                          <div className="text-xs text-secondary bg-black/20 px-2 py-1 rounded">{formatDuration(track.duration)}</div>
                                      </div>
                                  </div>
                                  
                                  {/* Right Col: Genre & Artists */}
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
                                      
                                      {/* Track Artists as Tags */}
                                      <div className="flex flex-col">
                                          <label className="text-[10px] uppercase font-bold text-secondary mb-1">Additional Main Artists</label>
                                          <div className="flex gap-2 mb-1">
                                              <input 
                                                  type="text" 
                                                  value={trackArtistInputs[i] || ""} 
                                                  onChange={e => setTrackArtistInputs({...trackArtistInputs, [i]: e.target.value})}
                                                  placeholder="Artist Name"
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
                      {distTracks.length === 0 && <div className="text-center text-secondary py-8 border-2 border-dashed border-surface-highlight rounded">No tracks added yet.</div>}
                  </div>
              </div>
          )}

          {distStep === 3 && (
              <div className="flex flex-col gap-6 animate-slide-in-right">
                  <h3 className="text-xl font-bold">Step 3: Schedule</h3>
                  <div className="flex flex-col gap-4 max-w-md mx-auto w-full">
                      <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-secondary uppercase">Release Date *</label>
                          <input type="date" value={distDate} onChange={e => setDistDate(e.target.value)} className="bg-background p-3 rounded border border-surface-highlight focus:border-primary focus:outline-none calendar-dark" />
                      </div>
                      <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-secondary uppercase">Release Time *</label>
                          <input type="time" value={distTime} onChange={e => setDistTime(e.target.value)} className="bg-background p-3 rounded border border-surface-highlight focus:border-primary focus:outline-none" />
                      </div>
                      <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-secondary uppercase">Message to Moderators</label>
                          <textarea value={distMsg} onChange={e => setDistMsg(e.target.value)} className="bg-background p-3 rounded border border-surface-highlight focus:border-primary focus:outline-none h-24 resize-none" placeholder="Optional notes..."></textarea>
                      </div>
                  </div>
              </div>
          )}

          <div className="flex justify-between mt-8 pt-8 border-t border-surface-highlight">
              {distStep > 1 ? (
                  <button onClick={() => setDistStep(distStep - 1)} className="px-6 py-2 rounded-full font-bold text-white hover:bg-white/10 transition">Back</button>
              ) : <div></div>}
              
              {distStep < 3 ? (
                  <button onClick={handleNextStep} className="px-8 py-2 rounded-full font-bold bg-white text-black hover:scale-105 transition">Next</button>
              ) : (
                  <button onClick={handleSubmitRelease} className="px-8 py-2 rounded-full font-bold bg-primary text-black hover:scale-105 transition shadow-lg shadow-primary/20">Submit Release</button>
              )}
          </div>
      </div>
  );

  const renderReleaseDetailModal = () => {
      if (!selectedRelease) return null;
      
      const allMainArtists = [selectedRelease.artistName, ...(selectedRelease.additionalMainArtists || [])];
      
      return (
          <div className="fixed inset-0 bg-black/90 z-[250] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-background w-full max-w-4xl max-h-[90vh] md:rounded-xl relative flex flex-col shadow-2xl border border-surface-highlight animate-zoom-in overflow-hidden">
                  <button onClick={() => setSelectedRelease(null)} className="absolute top-4 right-4 z-50 text-secondary hover:text-white bg-black/50 rounded-full p-2 hover:scale-110 transition">
                      <X size={24} />
                  </button>

                  <div className="flex-1 overflow-y-auto">
                    <div className="p-6 md:p-8 bg-gradient-to-b from-surface-highlight to-background">
                        <div className="flex flex-col md:flex-row gap-6 items-center md:items-end text-center md:text-left">
                            <img src={selectedRelease.covers[0]} className="w-48 h-48 md:w-56 md:h-56 shadow-2xl rounded-md object-cover shadow-black/50 flex-shrink-0" />
                            <div className="flex flex-col gap-1 w-full min-w-0">
                                <span className="text-xs font-bold uppercase tracking-wider">{selectedRelease.type}</span>
                                <h1 className="text-2xl md:text-5xl font-bold leading-tight break-words">{selectedRelease.title}</h1>
                                <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 mt-2 text-sm font-semibold">
                                    {allMainArtists.map((artist, i) => (
                                        <span key={i} className="flex items-center gap-1">
                                            {i > 0 && "•"} {artist}
                                        </span>
                                    ))}
                                </div>
                                <div className="text-secondary text-xs mt-1">
                                    {selectedRelease.genre} • {new Date(selectedRelease.releaseDate).getFullYear()} • {formatDuration(selectedRelease.tracks.reduce((a,b) => a + b.duration, 0))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 md:p-8">
                        <div className="grid grid-cols-[16px_1fr_1fr] md:grid-cols-[16px_4fr_2fr_1fr] gap-4 text-secondary text-xs uppercase font-bold border-b border-surface-highlight pb-2 mb-4 px-2">
                            <span>#</span>
                            <span>Title</span>
                            <span className="md:block">HUEQ</span>
                            <span className="text-right"><Clock size={14} className="ml-auto"/></span>
                        </div>
                        
                        <div className="flex flex-col">
                            {selectedRelease.tracks.map((track, i) => (
                                <div key={i} className="grid grid-cols-[16px_1fr_1fr] md:grid-cols-[16px_4fr_2fr_1fr] gap-4 px-2 py-3 rounded hover:bg-surface-highlight items-center group text-sm transition-colors">
                                    <span className="text-secondary">{i + 1}</span>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-medium text-white flex items-center gap-2 truncate">
                                            {track.title}
                                            {track.explicit && <span className="text-[9px] border border-secondary text-secondary px-1 rounded flex-shrink-0">E</span>}
                                        </span>
                                        <span className="text-xs text-secondary truncate">
                                            {[...(track.mainArtists || [])].filter(Boolean).join(", ")}
                                        </span>
                                    </div>
                                    <span className="md:block font-mono text-xs text-secondary select-all truncate">
                                        {track.generatedHueq || track.existingHueq || "---"}
                                    </span>
                                    <span className="text-right text-secondary">
                                        {formatDuration(track.duration)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 pt-8 border-t border-surface-highlight text-xs text-secondary flex flex-col gap-1">
                            <p>Released: {new Date(selectedRelease.releaseDate).toLocaleString()}</p>
                            <p>© {selectedRelease.label}</p>
                            <p>Reference ID: {selectedRelease.id}</p>
                        </div>
                    </div>
                  </div>
              </div>
          </div>
      );
  };

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
        <div className="w-full h-full flex flex-col p-6 relative overflow-y-auto animate-fade-in pb-24">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-800 shadow-lg">
                        {currentArtist.avatar ? <img src={currentArtist.avatar} className="w-full h-full object-cover" /> : <User size={32} className="text-secondary m-auto h-full" />}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">{currentArtist.artistName} <CheckCircle size={20} className="text-blue-500" fill="white" /></h1>
                        <p className="text-secondary text-sm">Artist Dashboard</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-surface border border-surface-highlight p-4 rounded-xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                        <BarChart2 size={24} className="text-primary"/>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{stats.monthlyPlays.toLocaleString()}</div>
                        <div className="text-xs text-secondary uppercase font-bold">Monthly Plays</div>
                    </div>
                </div>
                <div className="bg-surface border border-surface-highlight p-4 rounded-xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                        <Globe size={24} className="text-primary"/>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">#{stats.globalRank}</div>
                        <div className="text-xs text-secondary uppercase font-bold">Global Rank</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 w-full">
                <button onClick={() => setView('DISTRIBUTION')} className="bg-primary text-black p-6 rounded-xl flex flex-col items-center justify-center gap-2 hover:scale-105 transition font-bold h-32 shadow-lg hover:shadow-primary/20 w-full">
                    <UploadCloud size={32}/>
                    Upload New Release
                </button>
                <button onClick={() => setView('PROFILE_EDIT')} className="bg-surface border border-surface-highlight p-6 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-surface-highlight transition font-bold h-32 hover:scale-105 w-full">
                    <Edit size={32} className="text-secondary"/>
                    Edit Profile
                </button>
                <button onClick={() => setView('ARTIST_PICK')} className="bg-surface border border-surface-highlight p-6 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-surface-highlight transition font-bold h-32 hover:scale-105 w-full">
                    <ListMusic size={32} className="text-secondary"/>
                    Select Artist Pick
                </button>
            </div>

            <h2 className="text-2xl font-bold mb-4">My Releases</h2>
            
            {/* Desktop Table */}
            <div className="hidden md:block flex-1 overflow-y-auto bg-surface rounded-xl border border-surface-highlight max-h-[400px]">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-highlight text-secondary text-xs uppercase font-bold sticky top-0">
                        <tr>
                            <th className="p-4">Release</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {myReleases.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-secondary">You haven't uploaded any releases yet.</td>
                            </tr>
                        )}
                        {myReleases.map((r, idx) => (
                            <tr key={idx} className="border-b border-surface-highlight hover:bg-white/5 transition cursor-pointer" onClick={() => setSelectedRelease(r)}>
                                <td className="p-4 flex items-center gap-3">
                                    <img src={r.covers[0]} className="w-10 h-10 rounded object-cover shadow-sm flex-shrink-0" />
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
                                        {r.deletionRequested ? "DELETION PENDING" : r.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    {/* Only allow deletion for non-legacy tracks for simplicity in prototype, or requests */}
                                    {r.id.startsWith('rel_') && (
                                        <button onClick={(e) => { e.stopPropagation(); deleteRelease(r.id); }} className="text-secondary hover:text-red-500 transition hover:scale-110">
                                            <Trash2 size={18}/>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile List */}
            <div className="md:hidden flex flex-col gap-3 pb-20">
                {myReleases.length === 0 && <div className="text-center text-secondary">No releases yet.</div>}
                {myReleases.map((r, idx) => (
                    <div key={idx} className="bg-surface p-4 rounded-lg flex items-center gap-4 cursor-pointer active:scale-95 transition items-start" onClick={() => setSelectedRelease(r)}>
                        <div className="w-16 h-16 shrink-0">
                            <img src={r.covers[0]} className="w-full h-full rounded object-cover shadow-sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-lg truncate">{r.title}</div>
                            <div className="text-sm text-secondary truncate">{r.type} • {new Date(r.releaseDate).toLocaleDateString()}</div>
                            <div className={`text-xs font-bold mt-1 uppercase ${
                                r.status === 'LIVE' ? 'text-green-500' :
                                r.status === 'APPROVED' ? 'text-blue-500' :
                                r.status === 'REJECTED' ? 'text-red-500' :
                                'text-yellow-500'
                            }`}>{r.deletionRequested ? "DELETION PENDING" : r.status}</div>
                        </div>
                        {r.id.startsWith('rel_') && (
                            <button onClick={(e) => { e.stopPropagation(); deleteRelease(r.id); }} className="text-secondary hover:text-red-500">
                                <Trash2 size={20}/>
                            </button>
                        )}
                    </div>
                ))}
            </div>

             {/* Log Out Button */}
            <div className="fixed bottom-6 left-6 md:absolute md:bottom-6 md:left-6 z-50">
                <button 
                    onClick={() => { logoutArtistHub(); setView('AUTH'); }} 
                    className="flex items-center gap-2 px-4 py-2 bg-surface-highlight rounded-full text-secondary hover:text-white hover:bg-red-500 hover:text-white transition font-bold shadow-lg"
                >
                    <LogOut size={18} />
                    Log Out
                </button>
            </div>
        </div>
    );
  };

  const renderProfileEdit = () => (
      <div className="w-full max-w-md bg-surface p-8 rounded-xl shadow-2xl border border-surface-highlight animate-zoom-in relative">
           <button onClick={() => setView('ARTIST_DASH')} className="absolute top-8 left-8 text-secondary hover:text-white"><ArrowLeft size={24}/></button>
           <h2 className="text-3xl font-bold text-center mb-8">Edit Artist Profile</h2>
           
           <div className="flex flex-col gap-6">
               <div className="flex justify-center">
                    <div 
                        onClick={() => avatarInputRef.current?.click()}
                        className="w-32 h-32 rounded-full bg-surface-highlight flex items-center justify-center cursor-pointer hover:opacity-80 transition relative overflow-hidden group border-2 border-transparent hover:border-primary"
                    >
                        {editAvatar ? (
                            <img src={editAvatar} className="w-full h-full object-cover" />
                        ) : (
                            <Camera size={48} className="text-secondary" />
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <span className="text-xs font-bold text-white uppercase">Change</span>
                        </div>
                    </div>
                    <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
               </div>

               <div className="flex flex-col gap-2">
                   <label className="text-xs font-bold text-secondary uppercase">Artist Bio</label>
                   <textarea 
                       value={editBio} 
                       onChange={e => setEditBio(e.target.value)}
                       className="bg-background p-3 rounded border border-surface-highlight focus:border-primary focus:outline-none h-32 resize-none text-white"
                       placeholder="Tell your fans about yourself..."
                   />
               </div>
               
               <button onClick={handleProfileUpdate} className="w-full py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition">Submit Changes</button>
           </div>
      </div>
  );

  const renderArtistPick = () => {
    // Search logic
    const searchResults = (() => {
        if (!pickSearch) return { tracks: [], albums: [] };
        const lower = pickSearch.toLowerCase();
        // Search tracks
        const t = tracks.filter(t => t.title.toLowerCase().includes(lower) || t.artist.toLowerCase().includes(lower)).slice(0, 5);
        // Search albums
        const a = albums.filter(al => al.title.toLowerCase().includes(lower) || al.artist.toLowerCase().includes(lower)).slice(0, 5);
        
        return { tracks: t, albums: a };
    })();

    const handleSelectPick = (type: 'TRACK' | 'ALBUM', item: any) => {
        if (!currentArtist) return;
        
        const image = type === 'TRACK' ? item.cover : item.covers[0];
        const subtitle = type === 'TRACK' ? item.title : item.title;
        
        submitProfileEdit({
            newArtistPick: {
                type,
                id: item.id,
                image,
                subtitle
            }
        });
        showNotification("Artist Pick update sent for approval", "success");
        setView('ARTIST_DASH');
    };

    return (
      <div className="w-full max-w-2xl bg-surface p-8 rounded-xl shadow-2xl border border-surface-highlight animate-zoom-in relative max-h-[80vh] overflow-y-auto">
          <button onClick={() => setView('ARTIST_DASH')} className="absolute top-8 left-8 text-secondary hover:text-white"><ArrowLeft size={24}/></button>
          <h2 className="text-3xl font-bold text-center mb-8">Select Artist Pick</h2>
          
          <div className="relative mb-6">
              <Search className="absolute left-4 top-3.5 text-secondary" size={20} />
              <input 
                  type="text" 
                  placeholder="Search for tracks or albums..." 
                  value={pickSearch}
                  onChange={e => setPickSearch(e.target.value)}
                  className="w-full bg-background py-3 pl-12 pr-4 rounded-full text-white border border-surface-highlight focus:border-primary focus:outline-none"
                  autoFocus
              />
          </div>

          <div className="flex flex-col gap-6">
              {searchResults.tracks && searchResults.tracks.length > 0 && (
                  <div>
                      <h3 className="font-bold mb-2 text-secondary uppercase text-xs">Tracks</h3>
                      <div className="flex flex-col gap-2">
                          {searchResults.tracks.map(t => (
                              <div key={t.id} onClick={() => handleSelectPick('TRACK', t)} className="flex items-center gap-3 p-2 hover:bg-surface-highlight rounded cursor-pointer group">
                                  <img src={t.cover} className="w-10 h-10 rounded object-cover" />
                                  <div className="flex-1">
                                      <div className="font-bold">{t.title}</div>
                                      <div className="text-xs text-secondary">{t.artist}</div>
                                  </div>
                                  <button className="text-xs bg-white text-black px-3 py-1 rounded-full font-bold opacity-0 group-hover:opacity-100 transition">PICK</button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
              
              {searchResults.albums && searchResults.albums.length > 0 && (
                  <div>
                      <h3 className="font-bold mb-2 text-secondary uppercase text-xs">Albums</h3>
                      <div className="flex flex-col gap-2">
                          {searchResults.albums.map(a => (
                              <div key={a.id} onClick={() => handleSelectPick('ALBUM', a)} className="flex items-center gap-3 p-2 hover:bg-surface-highlight rounded cursor-pointer group">
                                  <img src={a.covers[0]} className="w-10 h-10 rounded object-cover" />
                                  <div className="flex-1">
                                      <div className="font-bold">{a.title}</div>
                                      <div className="text-xs text-secondary">{a.artist}</div>
                                  </div>
                                  <button className="text-xs bg-white text-black px-3 py-1 rounded-full font-bold opacity-0 group-hover:opacity-100 transition">PICK</button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {pickSearch && searchResults.tracks.length === 0 && searchResults.albums.length === 0 && (
                  <div className="text-center text-secondary py-4">No results found.</div>
              )}
          </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-background z-[200] overflow-y-auto animate-in fade-in">
       {/* Close Button */}
       <button 
          onClick={() => setArtistHubOpen(false)} 
          className="absolute top-6 right-6 z-50 text-secondary hover:text-white bg-black/50 rounded-full p-2"
       >
          <X size={32} />
       </button>
       
       <div className="min-h-full flex flex-col items-center justify-center p-4">
           {view === 'AUTH' && renderAuth()}
           {view === 'ARTIST_DASH' && renderArtistDash()}
           {view === 'MOD_DASH' && renderModDash()}
           {view === 'DISTRIBUTION' && renderDistribution()}
           {view === 'PROFILE_EDIT' && renderProfileEdit()}
           {view === 'ARTIST_PICK' && renderArtistPick()}
       </div>
       
       {renderReleaseDetailModal()}
    </div>
  );
};