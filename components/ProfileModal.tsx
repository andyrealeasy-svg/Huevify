import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { X, LogOut, User as UserIcon, Settings, ChevronRight, ArrowLeft, Camera, Palette, Globe, Zap, Music2, Moon, Play, Mic2, ShieldAlert, Database, CheckCircle, UploadCloud, Trash2, SlidersHorizontal, Activity, Sparkles, Layers } from './Icons.tsx';
import { CustomSelect } from './CustomSelect.tsx';
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
  const isLiquidGlass = appSettings?.liquidGlassNav !== false;
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
                className={`flex items-center justify-between w-full p-4 transition text-left text-white group ${
                  isLiquidGlass
                    ? 'max-md:rounded-2xl max-md:bg-white/[0.06] max-md:hover:bg-white/[0.12] max-md:border max-md:border-white/10 md:rounded md:bg-surface-highlight/50 md:hover:bg-surface-highlight'
                    : 'rounded bg-surface-highlight/50 hover:bg-surface-highlight'
                }`}
            >
                <div className="flex items-center gap-3">
                    <UserIcon size={20} className="text-secondary group-hover:text-primary transition-colors" />
                    <span className="font-bold">{t('editProfile')}</span>
                </div>
                <ChevronRight size={16} className="text-secondary" />
            </button>

            <button
                onClick={() => setView('APP_SETTINGS')}
                className={`flex items-center justify-between w-full p-4 transition text-left text-white group ${
                  isLiquidGlass
                    ? 'max-md:rounded-2xl max-md:bg-white/[0.06] max-md:hover:bg-white/[0.12] max-md:border max-md:border-white/10 md:rounded md:bg-surface-highlight/50 md:hover:bg-surface-highlight'
                    : 'rounded bg-surface-highlight/50 hover:bg-surface-highlight'
                }`}
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
                className={`flex items-center justify-between w-full p-4 transition text-left text-white group ${
                  isLiquidGlass
                    ? 'max-md:rounded-2xl max-md:bg-white/[0.06] max-md:hover:bg-white/[0.12] max-md:border max-md:border-white/10 md:rounded md:bg-surface-highlight/50 md:hover:bg-surface-highlight'
                    : 'rounded bg-surface-highlight/50 hover:bg-surface-highlight'
                }`}
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
                <CustomSelect
                    value={appSettings.language}
                    onChange={(val) => updateSettings({ language: val as any })}
                    options={[
                        { value: 'English', label: 'English' },
                        { value: 'Russian', label: 'Russian (Русский)' }
                    ]}
                />
            </div>

            {/* Appearance & Style / Liquid Glass iOS */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={18} className="text-primary" />
                    <h3 className="font-bold">{t('appearanceStyle') || "Внешний вид и оформление"}</h3>
                </div>

                <div className="p-3.5 bg-surface-highlight rounded-lg border border-white/5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center shrink-0">
                                <Layers size={18} className="text-white" />
                            </div>
                            <div className="flex flex-col pr-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm text-white">{t('liquidGlassNav') || "Жидкое стекло"}</span>
                                    {appSettings.liquidGlassNav !== false && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                            Liquid Glass
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-secondary leading-snug">
                                    {t('liquidGlassNavDesc') || "Эффект жидкого стекла для нижних кнопок навигации"}
                                </span>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={appSettings.liquidGlassNav !== false}
                                onChange={e => updateSettings({ liquidGlassNav: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    {/* Status indicator row */}
                    <div className={`pt-2 border-t border-white/5 flex items-center justify-between text-xs text-secondary transition-opacity duration-200 ${appSettings.liquidGlassNav !== false ? 'opacity-100' : 'opacity-50'}`}>
                        <span>{t('status') || "Режим"}:</span>
                        <span className={`font-semibold ${appSettings.liquidGlassNav !== false ? 'text-primary' : 'text-secondary'}`}>
                            {appSettings.liquidGlassNav !== false ? (t('liquidGlassStyle') || "Liquid Glass") : (t('classicNav') || "Классический")}
                        </span>
                    </div>
                </div>
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

            {/* Crossfade Settings */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <SlidersHorizontal size={18} className="text-primary" />
                    <h3 className="font-bold">{t('crossfade')}</h3>
                </div>

                <div className="p-3.5 bg-surface-highlight rounded-lg flex flex-col gap-3.5 border border-white/5">
                    {/* Crossfade Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Activity size={20} className="text-secondary shrink-0" />
                            <div className="flex flex-col">
                                <span className="font-medium text-sm text-white">{t('crossfadeEnable')}</span>
                                <span className="text-xs text-secondary leading-snug">{t('crossfadeDesc')}</span>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={!!appSettings.crossfadeEnabled}
                                onChange={e => {
                                    const enabled = e.target.checked;
                                    updateSettings({
                                        crossfadeEnabled: enabled,
                                        crossfade: enabled && (!appSettings.crossfade || appSettings.crossfade === 0) ? 4 : appSettings.crossfade
                                    });
                                }}
                            />
                            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>

                    {/* Crossfade Duration Slider (0-12s) */}
                    <div className={`flex flex-col gap-2.5 pt-3 border-t border-white/5 transition-opacity duration-200 ${appSettings.crossfadeEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">{t('crossfadeDuration')}</span>
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                                {appSettings.crossfade || 0} {t('secondsShort')}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-[11px] text-secondary font-mono">0{t('secondsShort')}</span>
                            <div className="relative flex-1 flex items-center h-6 select-none touch-none group/slider cursor-pointer">
                                {/* Track Background */}
                                <div className="w-full h-2 bg-zinc-700/80 rounded-full overflow-hidden relative">
                                    {/* Active Filled Progress Bar */}
                                    <div
                                        className="h-full bg-primary rounded-full transition-all duration-75"
                                        style={{ width: `${((appSettings.crossfade || 0) / 12) * 100}%` }}
                                    />
                                </div>

                                {/* Always Visible Custom Thumb Handle */}
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-md border border-black/10 pointer-events-none transition-transform group-hover/slider:scale-125 flex items-center justify-center"
                                    style={{ left: `${((appSettings.crossfade || 0) / 12) * 100}%` }}
                                >
                                    <div className="w-1.5 h-1.5 bg-black/40 rounded-full"></div>
                                </div>

                                {/* Native Range Input overlay for full drag and touch support */}
                                <input
                                    type="range"
                                    min="0"
                                    max="12"
                                    step="1"
                                    value={appSettings.crossfade || 0}
                                    onChange={e => updateSettings({ crossfade: parseInt(e.target.value, 10) })}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    disabled={!appSettings.crossfadeEnabled}
                                />
                            </div>
                            <span className="text-[11px] text-secondary font-mono">12{t('secondsShort')}</span>
                        </div>

                        {/* Quick Duration Presets */}
                        <div className="grid grid-cols-5 gap-1.5 mt-1">
                            {[0, 3, 5, 8, 12].map(sec => (
                                <button
                                    key={sec}
                                    type="button"
                                    onClick={() => updateSettings({ crossfade: sec, crossfadeEnabled: sec > 0 ? true : appSettings.crossfadeEnabled })}
                                    className={`py-1 text-xs rounded transition font-mono ${
                                        (appSettings.crossfade || 0) === sec
                                            ? 'bg-primary text-black font-bold shadow-sm'
                                            : 'bg-black/30 text-secondary hover:text-white hover:bg-black/50'
                                    }`}
                                >
                                    {sec}{t('secondsShort')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Cloud Database & Storage */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Database size={18} className="text-primary" />
                    <h3 className="font-bold">Облачная база данных и хранилище</h3>
                </div>
                <div className="p-3 bg-surface-highlight rounded border border-surface-highlight flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">База данных</span>
                        {isSupabaseConnected ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Подключено
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                Автономный режим
                            </span>
                        )}
                    </div>

                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Медиа-хранилище</span>
                        {isStorageReady ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Активно
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                                Доступно
                            </span>
                        )}
                    </div>

                    <p className="text-xs text-secondary leading-relaxed">
                        Треки, обложки релизов, плейлистов и аватары безопасно синхронизируются в облачном хранилище.
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
                        Если в браузере остались устаревшие релизы, треки или тестовые данные из LocalStorage / IndexedDB, нажмите кнопку ниже для полной очистки и обновления из облачного хранилища.
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
      <div 
        className={`w-full max-w-sm p-6 relative transition-all duration-200 animate-in fade-in zoom-in ${
          isLiquidGlass
            ? 'max-md:bg-[#15151e]/85 max-md:backdrop-blur-3xl max-md:border max-md:border-white/20 max-md:rounded-3xl max-md:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.3)] md:bg-surface md:rounded-lg md:border md:border-surface-highlight md:shadow-2xl'
            : 'bg-surface rounded-lg border border-surface-highlight shadow-2xl'
        }`}
      >

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