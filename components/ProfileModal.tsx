import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { X, LogOut, User as UserIcon, Settings, ChevronRight, ArrowLeft, Camera, Palette, Globe, Zap, Music2, Moon, Play, Mic2, ShieldAlert, Database, CheckCircle, UploadCloud, Trash2 } from './Icons.tsx';
import { AppSettings } from '../types.ts';
import { compressImage } from '../utils/imageCompressor.ts';
import { SupabaseService, isSupabaseConfigured } from '../services/supabase.ts';

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
  const { isProfileModalOpen, setProfileModalOpen, currentUser, logout, updateUserProfile, appSettings, updateSettings, setArtistHubOpen, t, isSupabaseConnected, clearAppCache } = useStore();
  const [view, setView] = useState<ModalView>('MENU');
  const [isStorageReady, setIsStorageReady] = useState<boolean | null>(null);
  const [isClearing, setIsClearing] = useState(false);

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
          
          if (isSupabaseConfigured()) {
              SupabaseService.checkStorageBucket().then(ok => setIsStorageReady(ok));
          }
      }
  }, [isProfileModalOpen, currentUser]);

  if (!isProfileModalOpen || !currentUser) return null;

  const handleOpenArtistHub = () => {
      setProfileModalOpen(false);
      setArtistHubOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImage(file, 400, 400, 0.85);
      if (compressed) {
        let finalAvatar = compressed;
        if (isSupabaseConfigured()) {
          try {
            const url = await SupabaseService.uploadMedia(compressed, 'avatars', file.name);
            if (url) finalAvatar = url;
          } catch (err) {
            console.warn('Avatar storage upload fallback:', err);
          }
        }
        setEditAvatar(finalAvatar);
      }
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editName || !editUsername || !editPass) {
          setEditMessage({ type: 'error', text: t('fillAll') });
          return;
      }
      
      const result = updateUserProfile({
          displayName: editName,
          username: editUsername,
          password: editPass,
          avatar: editAvatar || undefined
      });

      if (result.success) {
          setEditMessage({ type: 'success', text: t('profileUpdateSent') }); // Reusing existing message or generic success
          setTimeout(() => setEditMessage(null), 2000);
      } else {
          setEditMessage({ type: 'error', text: result.message || 'Error' });
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
                    <span className="font-bold">{t('editProfile')}</span>
                </div>
                <ChevronRight size={16} className="text-secondary" />
            </button>

            <button 
                onClick={() => setView('APP_SETTINGS')}
                className="flex items-center justify-between w-full p-4 rounded bg-surface-highlight/50 hover:bg-surface-highlight transition text-left text-white group"
            >
                <div className="flex items-center gap-3">
                    <Settings size={20} className="text-secondary group-hover:text-primary transition-colors" />
                    <span className="font-bold">{t('appSettings')}</span>
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
                    <span className="font-bold">{t('forArtists')}</span>
                </div>
                <ChevronRight size={16} className="text-secondary" />
            </button>
            
            <div className="h-px bg-surface-highlight my-2" />

            <button 
                onClick={logout}
                className="flex items-center gap-3 w-full p-4 rounded hover:bg-red-500/10 transition text-left text-white group"
            >
                <LogOut size={20} className="text-secondary group-hover:text-red-500 transition-colors" />
                <span className="font-bold group-hover:text-red-500 transition-colors">{t('logout')}</span>
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
             <h2 className="text-xl font-bold">{t('editProfile')}</h2>
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
                        <span className="text-[10px] font-bold text-white">{t('changeCover')}</span>
                    </div>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-secondary uppercase">{t('displayName')}</label>
                <input 
                    type="text" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)}
                    className="bg-surface-highlight p-3 rounded text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-secondary uppercase">{t('username')}</label>
                <input 
                    type="text" 
                    value={editUsername} 
                    onChange={e => setEditUsername(e.target.value)}
                    className="bg-surface-highlight p-3 rounded text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-secondary uppercase">{t('password')}</label>
                <input 
                    type="password" 
                    value={editPass} 
                    onChange={e => setEditPass(e.target.value)}
                    className="bg-surface-highlight p-3 rounded text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
            </div>

            <button type="submit" className="mt-4 w-full py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition">
                {t('saveChanges')}
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
             <h2 className="text-xl font-bold">{t('appSettings')}</h2>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto max-h-[60vh] px-1 pr-2">
            
            {/* Accent Color */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Palette size={18} className="text-primary" />
                    <h3 className="font-bold">{t('accentColor')}</h3>
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
                    <h3 className="font-bold">{t('language')}</h3>
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
                    <h3 className="font-bold">{t('playbackContent')}</h3>
                </div>
                
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between p-3 bg-surface-highlight rounded">
                        <div className="flex items-center gap-3">
                            <ShieldAlert size={20} className="text-secondary" />
                            <div className="flex flex-col">
                                <span className="font-medium">{t('allowExplicit')}</span>
                                <span className="text-xs text-secondary">{t('hideExplicit')}</span>
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
                            <span className="font-medium">{t('autoPlay')}</span>
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

            {/* Cloud Database & Storage (Supabase) */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Database size={18} className="text-primary" />
                    <h3 className="font-bold">Cloud Database & Storage (Supabase)</h3>
                </div>
                <div className="p-3 bg-surface-highlight rounded border border-surface-highlight flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Database</span>
                        {isSupabaseConnected ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Connected
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                Ready (Local Fallback)
                            </span>
                        )}
                    </div>

                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Storage (Media)</span>
                        {isStorageReady ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Bucket Active
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                                Uploads Enabled
                            </span>
                        )}
                    </div>

                    <p className="text-xs text-secondary leading-relaxed">
                        Tracks, album covers, playlist art, and avatars are uploaded to Supabase Storage (bucket <code className="text-primary font-mono bg-black/30 px-1 py-0.5 rounded">media</code>). SQL setup script is included in <code className="text-white font-mono bg-black/30 px-1 py-0.5 rounded">supabase/schema.sql</code>.
                    </p>
                </div>
            </div>

            {/* Local Storage & Cache Maintenance */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Trash2 size={18} className="text-red-400" />
                    <h3 className="font-bold">Локальный кэш и хранилище</h3>
                </div>
                <div className="p-3 bg-surface-highlight rounded border border-surface-highlight flex flex-col gap-3">
                    <p className="text-xs text-secondary leading-relaxed">
                        Если в браузере остались устаревшие релизы, треки или тестовые данные из LocalStorage / IndexedDB, нажмите кнопку ниже для полной очистки и обновления из облака Supabase.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <button
                            type="button"
                            disabled={isClearing}
                            onClick={async () => {
                                setIsClearing(true);
                                await clearAppCache(true);
                                setIsClearing(false);
                            }}
                            className="flex-1 py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                            <Trash2 size={14} />
                            {isClearing ? "Очистка..." : "Очистить кэш (сохранить вход)"}
                        </button>
                        <button
                            type="button"
                            disabled={isClearing}
                            onClick={async () => {
                                if (window.confirm("Вы уверены? Это действие очистит весь локальный кэш и выполнит выход из аккаунта.")) {
                                    setIsClearing(true);
                                    await clearAppCache(false);
                                    setIsClearing(false);
                                    setProfileModalOpen(false);
                                }
                            }}
                            className="py-2 px-3 bg-white/5 hover:bg-white/10 text-secondary hover:text-white border border-white/10 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                            Полный сброс
                        </button>
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