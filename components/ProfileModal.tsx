import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { X, LogOut, User as UserIcon, Settings, ChevronRight, ArrowLeft, Camera, Palette, Globe, Zap, Music2, Moon, Play, Mic2, ShieldAlert } from './Icons.tsx';
import { AppSettings } from '../types.ts';

type ModalView = 'MENU' | 'PROFILE_EDIT' | 'APP_SETTINGS';

const COLORS = [
  '#1ed760', // Green (Default)
  '#ec4899', // Pink (Required 2nd)
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#eab308', // Yellow
  '#84cc16', // Lime
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#0ea5e9', // Sky
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#d946ef', // Fuchsia
];

export const ProfileModal = () => {
  const { isProfileModalOpen, setProfileModalOpen, currentUser, logout, updateUserProfile, appSettings, updateSettings, setArtistHubOpen } = useStore();
  const [view, setView] = useState<ModalView>('MENU');

  // Edit Profile State
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPass, setEditPass] = useState("");
  const [editAvatar, setEditAvatar] = useState<string>("");
  const [editMessage, setEditMessage] = useState<{type: 'error' | 'success', text: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state on open
  useEffect(() => {
      if (isProfileModalOpen && currentUser) {
          setView('MENU');
          setEditName(currentUser.displayName);
          setEditUsername(currentUser.username);
          setEditPass(currentUser.password);
          setEditAvatar(currentUser.avatar || "");
          setEditMessage(null);
      }
  }, [isProfileModalOpen, currentUser]);

  if (!isProfileModalOpen || !currentUser) return null;

  const handleOpenArtistHub = () => {
      setProfileModalOpen(false);
      setArtistHubOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editName || !editUsername || !editPass) {
          setEditMessage({ type: 'error', text: 'All fields are required' });
          return;
      }
      
      const result = updateUserProfile({
          displayName: editName,
          username: editUsername,
          password: editPass,
          avatar: editAvatar || undefined
      });

      if (result.success) {
          setEditMessage({ type: 'success', text: 'Profile updated successfully!' });
          setTimeout(() => setEditMessage(null), 2000);
      } else {
          setEditMessage({ type: 'error', text: result.message || 'Error updating profile' });
      }
  };

  const renderMenu = () => (
    <>
        <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full bg-surface-highlight mb-4 overflow-hidden border-2 border-primary shadow-lg">
                {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                        <UserIcon size={40} className="text-secondary" />
                    </div>
                )}
            </div>
            <h2 className="text-2xl font-bold">{currentUser.displayName}</h2>
            <p className="text-secondary text-sm">@{currentUser.username}</p>
        </div>

        <div className="flex flex-col gap-3">
            <button 
                onClick={() => setView('PROFILE_EDIT')}
                className="flex items-center justify-between w-full p-4 rounded bg-surface-highlight/50 hover:bg-surface-highlight transition text-left text-white group"
            >
                <div className="flex items-center gap-3">
                    <UserIcon size={20} className="text-secondary group-hover:text-primary transition-colors" />
                    <span className="font-bold">Edit Profile</span>
                </div>
                <ChevronRight size={16} className="text-secondary" />
            </button>

            <button 
                onClick={() => setView('APP_SETTINGS')}
                className="flex items-center justify-between w-full p-4 rounded bg-surface-highlight/50 hover:bg-surface-highlight transition text-left text-white group"
            >
                <div className="flex items-center gap-3">
                    <Settings size={20} className="text-secondary group-hover:text-primary transition-colors" />
                    <span className="font-bold">App Settings</span>
                </div>
                <ChevronRight size={16} className="text-secondary" />
            </button>

            {/* Huevify For Artists Button */}
            <button 
                onClick={handleOpenArtistHub}
                className="flex items-center justify-between w-full p-4 rounded bg-surface-highlight/50 hover:bg-surface-highlight transition text-left text-white group"
            >
                <div className="flex items-center gap-3">
                    <Mic2 size={20} className="text-secondary group-hover:text-primary transition-colors" />
                    <span className="font-bold">Huevify For Artists</span>
                </div>
                <ChevronRight size={16} className="text-secondary" />
            </button>
            
            <div className="h-px bg-surface-highlight my-2" />

            <button 
                onClick={logout}
                className="flex items-center gap-3 w-full p-4 rounded hover:bg-red-500/10 transition text-left text-white group"
            >
                <LogOut size={20} className="text-secondary group-hover:text-red-500 transition-colors" />
                <span className="font-bold group-hover:text-red-500 transition-colors">Log out</span>
            </button>
        </div>
    </>
  );

  const renderProfileEdit = () => (
      <>
        <div className="flex items-center gap-4 mb-6">
             <button onClick={() => setView('MENU')} className="text-secondary hover:text-white">
                 <ArrowLeft size={24} />
             </button>
             <h2 className="text-xl font-bold">Edit Profile</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4 overflow-y-auto max-h-[60vh] px-1">
             {editMessage && (
                 <div className={`p-3 rounded text-sm text-center ${editMessage.type === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                     {editMessage.text}
                 </div>
             )}

             <div className="flex justify-center mb-2">
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-full bg-surface-highlight flex items-center justify-center cursor-pointer hover:opacity-80 transition relative overflow-hidden group border-2 border-transparent hover:border-primary"
                >
                    {editAvatar ? (
                        <img src={editAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <Camera size={32} className="text-secondary" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <span className="text-[10px] font-bold text-white">CHANGE</span>
                    </div>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-secondary uppercase">Display Name</label>
                <input 
                    type="text" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)}
                    className="bg-surface-highlight p-3 rounded text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-secondary uppercase">Username</label>
                <input 
                    type="text" 
                    value={editUsername} 
                    onChange={e => setEditUsername(e.target.value)}
                    className="bg-surface-highlight p-3 rounded text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-secondary uppercase">Password</label>
                <input 
                    type="password" 
                    value={editPass} 
                    onChange={e => setEditPass(e.target.value)}
                    className="bg-surface-highlight p-3 rounded text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
            </div>

            <button type="submit" className="mt-4 w-full py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition">
                Save Changes
            </button>
        </form>
      </>
  );

  const renderAppSettings = () => (
      <>
        <div className="flex items-center gap-4 mb-6">
             <button onClick={() => setView('MENU')} className="text-secondary hover:text-white">
                 <ArrowLeft size={24} />
             </button>
             <h2 className="text-xl font-bold">App Settings</h2>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto max-h-[60vh] px-1 pr-2">
            
            {/* Accent Color */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Palette size={18} className="text-primary" />
                    <h3 className="font-bold">Accent Color</h3>
                </div>
                <div className="grid grid-cols-8 gap-2">
                    {COLORS.map(color => (
                        <button
                            key={color}
                            onClick={() => updateSettings({ accentColor: color })}
                            className={`w-8 h-8 rounded-full border-2 transition hover:scale-110 ${appSettings.accentColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: color }}
                        />
                    ))}
                </div>
            </div>

            {/* Language */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Globe size={18} className="text-primary" />
                    <h3 className="font-bold">Language</h3>
                </div>
                <select 
                    value={appSettings.language}
                    onChange={(e) => updateSettings({ language: e.target.value as any })}
                    className="w-full bg-surface-highlight text-white p-3 rounded focus:outline-none"
                >
                    <option value="English">English</option>
                    <option value="Russian">Russian (Русский)</option>
                </select>
            </div>

            {/* Features */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Zap size={18} className="text-primary" />
                    <h3 className="font-bold">Playback & Content</h3>
                </div>
                
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between p-3 bg-surface-highlight rounded">
                        <div className="flex items-center gap-3">
                            <ShieldAlert size={20} className="text-secondary" />
                            <div className="flex flex-col">
                                <span className="font-medium">Allow Explicit Content</span>
                                <span className="text-xs text-secondary">Turn off to hide explicit tracks</span>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={appSettings.allowExplicitContent}
                                onChange={e => updateSettings({ allowExplicitContent: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-surface-highlight rounded">
                        <div className="flex items-center gap-3">
                            <Play size={20} className="text-secondary" />
                            <span className="font-medium">Auto-play</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={appSettings.autoPlay}
                                onChange={e => updateSettings({ autoPlay: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>
                </div>
            </div>

        </div>
      </>
  );

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-sm rounded-lg p-6 relative shadow-2xl border border-surface-highlight animate-in fade-in zoom-in duration-200">
        
        <button 
            onClick={() => setProfileModalOpen(false)}
            className="absolute top-4 right-4 text-secondary hover:text-white z-10"
        >
            <X size={24} />
        </button>

        {view === 'MENU' && renderMenu()}
        {view === 'PROFILE_EDIT' && renderProfileEdit()}
        {view === 'APP_SETTINGS' && renderAppSettings()}

      </div>
    </div>
  );
};