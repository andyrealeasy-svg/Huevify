import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Track, Playlist, Album, ViewState, PlayMode, User, AppSettings, DailyChartTrack, ArtistAccount, ReleaseRequest, ProfileEditRequest, ModeratorAccount, AppNotification } from '../types';
import { generateInitialData, StorageService } from '../services/data';
import { isTestTrack, isTestAlbum, isTestArtist } from '../services/storage';
import { SupabaseService, isSupabaseConfigured } from '../services/supabase';

interface ArtistStats {
  monthlyPlays: number;
  globalRank: number;
}

const TRANSLATIONS: Record<string, Record<string, string>> = {
  English: {
    home: "Home",
    search: "Search",
    library: "Your Library",
    createPlaylist: "Create Playlist",
    likedSongs: "Liked Songs",
    viewProfile: "View Profile",
    greeting_morning: "Good morning",
    greeting_afternoon: "Good afternoon",
    greeting_evening: "Good evening",
    recForYou: "Recommended for you",
    dailyTop: "Huevify Daily Top 25",
    showAll: "Show All",
    latestReleases: "Latest Releases",
    popularAlbums: "Popular Albums",
    updating: "Chart data updating...",
    plays: "plays",
    dailyPlays: "daily plays",
    artist: "Artist",
    artists: "Artists",
    songs: "Songs",
    publicPlaylists: "Public Playlists",
    noResults: "No results found for",
    popularReleases: "Popular Releases",
    allTracks: "All Tracks",
    searchPlaceholder: "What do you want to listen to?",
    playlist: "Playlist",
    system: "System",
    by: "By",
    you: "You",
    released: "Released",
    min: "min",
    chooseCover: "Choose Album Cover",
    select: "SELECT",
    changeCover: "CHANGE COVER",
    editPlaylist: "Edit Playlist",
    deletePlaylist: "Delete Playlist",
    removeFromLibrary: "Remove from Library",
    addToLibrary: "Add to Library",
    emptyLiked: "Songs you like will appear here",
    saveSongsMsg: "Save songs by tapping the heart icon.",
    returnHome: "Return Home",
    notFound: "Playlist not found",
    artistPick: "Artist Pick",
    postedBy: "Posted By",
    latestRelease: "Latest Release",
    popular: "Popular",
    discography: "Discography",
    about: "About",
    inTheWorld: "in the world",
    verifiedArtist: "Verified Artist",
    following: "Following",
    follow: "Follow",
    monthlyPlays: "monthly plays",
    loginTo: "Log in to Huevify",
    signupFree: "Sign up for free",
    login: "Log In",
    signup: "Sign Up",
    username: "Username",
    password: "Password",
    confirmPassword: "Confirm Password",
    displayName: "Display Name",
    upload: "UPLOAD",
    cancel: "Cancel",
    invalidCreds: "Invalid username or password",
    fillAll: "Please fill in all fields",
    passMismatch: "Passwords do not match",
    userTaken: "Username already taken",
    editProfile: "Edit Profile",
    appSettings: "App Settings",
    forArtists: "Huevify For Artists",
    logout: "Log out",
    saveChanges: "Save Changes",
    accentColor: "Accent Color",
    language: "Language",
    playbackContent: "Playback & Content",
    allowExplicit: "Allow Explicit Content",
    hideExplicit: "Turn off to hide explicit tracks",
    autoPlay: "Auto-play",
    playlistName: "Playlist Name",
    description: "Description",
    choosePhoto: "Choose Photo",
    edit: "Edit",
    publicPlaylist: "Public Playlist",
    publicDesc: "Anyone can search for and add this playlist.",
    save: "Save",
    deleteLibTitle: "Delete from Library?",
    deleteLibMsg: "This will delete",
    delete: "Delete",
    addToPlaylist: "Add to Playlist",
    newPlaylist: "New Playlist",
    recentlyPlayed: "Recently Played",
    selectTrack: "Select a track to start listening",
    nowPlaying: "Now Playing",
    artistDash: "Artist Dashboard",
    modDash: "Moderator Dashboard",
    uploadNew: "Upload New Release",
    uploadRelease: "Upload Release",
    manageReleases: "Manage Releases",
    manageTracks: "Manage Test Tracks",
    artistCreds: "Artist Credentials",
    pendingArtists: "Pending Artists",
    pendingReleases: "Pending Releases",
    profileEdits: "Profile Edits",
    myReleases: "My Releases",
    releaseTitle: "Release Title",
    primaryArtist: "Primary Artist",
    recordLabel: "Record Label",
    releaseDate: "Release Date",
    releaseTime: "Release Time",
    msgToMods: "Message to Moderators",
    submitRelease: "Submit Release",
    updateRelease: "Update Release",
    step1: "Step 1: Release Info",
    step2: "Step 2: Tracks",
    step3: "Step 3: Schedule",
    addTrack: "Add Track (Upload Audio)",
    trackTitle: "Track Title",
    explicit: "Explicit",
    explicitShort: "E",
    back: "Back",
    next: "Next",
    approve: "Approve",
    reject: "Reject",
    deleteReq: "DELETE REQ",
    confirmDelete: "Confirm Delete",
    rejectDel: "Reject Del",
    status: "Status",
    type: "Type",
    date: "Date",
    actions: "Actions",
    noReleases: "No releases yet.",
    noTracks: "No tracks yet.",
    changePass: "Change Password",
    newPass: "New Password",
    updatePass: "Update Password",
    bio: "Artist Bio",
    submitChanges: "Submit Changes",
    searchTrackAlbum: "Search for a track or album...",
    noPending: "No pending requests",
    welcomeBack: "Welcome back!",
    regSent: "Registration sent for approval.",
    usernameTaken: "Username taken",
    modExists: "Moderator already exists",
    artistAccDeleted: "Artist account deleted (Access Revoked). Artist content remains live.",
    passChanged: "Password changed successfully.",
    releaseDeleted: "Release deleted from drafts.",
    releaseSubmitted: "Release submitted!",
    profileUpdateSent: "Profile update sent for moderation approval.",
    deletionRequested: "Deletion requested. Pending moderator approval.",
    trackLevelArtist: "Additional Main Artists",
    artistNameReq: "Artist Name is required for Moderator uploads.",
    completeFields: "Please complete all required fields (Title, Type, Genre, Covers)",
    addOneTrack: "Please add at least one track.",
    specifyDate: "Please specify Release Date and Time.",
    releaseUpdated: "Release updated successfully.",
    trackDeleted: "Test track deleted.",
    legacyHidden: "Legacy release hidden from platform.",
    deletionRejected: "Deletion rejected. Release remains live.",
    releaseRejected: "Release rejected.",
    trackNote: "Note:",
    tracksLower: "tracks",
    huevifyDesc: "Millions of songs. Free on Huevify.",
    searchToFind: "Search to find content.",
    chartDesc: "Most played tracks in the last 24h. Updates at 21:00 UTC+3.",
    genre_Pop: "Pop",
    genre_RapHipHop: "Rap/Hip-Hop",
    genre_RnB: "R&B",
    genre_ElectronicDance: "Electronic/Dance",
    discoverBest: "Discover the best",
    genreSuffix: "tracks and releases.",
    saveDraft: "Save to Draft",
    draftSaved: "Release draft saved successfully.",
    drafts: "Drafts",
    draftsDesc: "Unpublished release drafts",
    noDrafts: "No saved drafts.",
    continueDraft: "Continue",
    deleteDraft: "Delete Draft",
    draftDeleted: "Draft deleted.",
    resumeDraftPrompt: "You have an unsaved draft. Resume working on it?",
    resume: "Resume",
    discardDraft: "Discard Draft"
  },
  Russian: {
    home: "Главная",
    search: "Поиск",
    library: "Моя медиатека",
    createPlaylist: "Создать плейлист",
    likedSongs: "Любимые треки",
    viewProfile: "Профиль",
    greeting_morning: "Доброе утро",
    greeting_afternoon: "Добрый день",
    greeting_evening: "Добрый вечер",
    recForYou: "Рекомендовано для вас",
    dailyTop: "Huevify Daily Top 25",
    showAll: "Показать все",
    latestReleases: "Новые релизы",
    popularAlbums: "Популярные альбомы",
    updating: "Обновление чарта...",
    plays: "прослушиваний",
    dailyPlays: "прослушиваний за день",
    artist: "Артист",
    artists: "Артисты",
    songs: "Треки",
    publicPlaylists: "Плейлисты пользователей",
    noResults: "Ничего не найдено по запросу",
    popularReleases: "Популярные релизы",
    allTracks: "Все треки",
    searchPlaceholder: "Что хотите послушать?",
    playlist: "Плейлист",
    system: "Система",
    by: "От",
    you: "Вы",
    released: "Дата выхода",
    min: "мин",
    chooseCover: "Выберите обложку",
    select: "ВЫБРАТЬ",
    changeCover: "ИЗМЕНИТЬ",
    editPlaylist: "Изменить плейлист",
    deletePlaylist: "Удалить плейлист",
    removeFromLibrary: "Удалить из медиатеки",
    addToLibrary: "Добавить в медиатеку",
    emptyLiked: "Здесь будут ваши любимые треки",
    saveSongsMsg: "Сохраняйте треки, нажимая на сердечко.",
    returnHome: "На главную",
    notFound: "Плейлист не найден",
    artistPick: "Выбор артиста",
    postedBy: "Опубликовано",
    latestRelease: "Последний релиз",
    popular: "Популярное",
    discography: "Дискография",
    about: "Об исполнителе",
    inTheWorld: "в мире",
    verifiedArtist: "Подтвержденный артист",
    following: "Вы подписаны",
    follow: "Подписаться",
    monthlyPlays: "прослушиваний за месяц",
    loginTo: "Войти в Huevify",
    signupFree: "Регистрация",
    login: "Войти",
    signup: "Зарегистрироваться",
    username: "Имя пользователя",
    password: "Пароль",
    confirmPassword: "Повторите пароль",
    displayName: "Отображаемое имя",
    upload: "ЗАГРУЗИТЬ",
    cancel: "Отмена",
    invalidCreds: "Неверное имя пользователя или пароль",
    fillAll: "Заполните все поля",
    passMismatch: "Пароли не совпадают",
    userTaken: "Имя пользователя занято",
    editProfile: "Редактировать профиль",
    appSettings: "Настройки",
    forArtists: "Huevify For Artists",
    logout: "Выйти",
    saveChanges: "Сохранить",
    accentColor: "Цвет акцента",
    language: "Язык",
    playbackContent: "Воспроизведение и контент",
    allowExplicit: "Контент 18+",
    hideExplicit: "Выключите, чтобы скрыть Explicit треки",
    autoPlay: "Автовоспроизведение",
    playlistName: "Название плейлиста",
    description: "Описание",
    choosePhoto: "Выберите фото",
    edit: "Изменить",
    publicPlaylist: "Публичный плейлист",
    publicDesc: "Любой сможет найти и добавить этот плейлист.",
    save: "Сохранить",
    deleteLibTitle: "Удалить из медиатеки?",
    deleteLibMsg: "Это действие удалит",
    delete: "Удалить",
    addToPlaylist: "Добавить в плейлист",
    newPlaylist: "Новый плейлист",
    recentlyPlayed: "Недавно прослушано",
    selectTrack: "Выберите трек, чтобы начать прослушивание",
    nowPlaying: "Сейчас играет",
    artistDash: "Кабинет Артиста",
    modDash: "Кабинет Модератора",
    uploadNew: "Загрузить релиз",
    uploadRelease: "Загрузить",
    manageReleases: "Управление релизами",
    manageTracks: "Тестовые треки",
    artistCreds: "Доступы артистов",
    pendingArtists: "Заявки артистов",
    pendingReleases: "Ожидают релиза",
    profileEdits: "Изменения профиля",
    myReleases: "Мои релизы",
    releaseTitle: "Название релиза",
    primaryArtist: "Основной артист",
    recordLabel: "Лейбл",
    releaseDate: "Дата релиза",
    releaseTime: "Время релиза",
    msgToMods: "Сообщение модераторам",
    submitRelease: "Отправить релиз",
    updateRelease: "Обновить релиз",
    step1: "Шаг 1: Информация",
    step2: "Шаг 2: Треки",
    step3: "Шаг 3: Расписание",
    addTrack: "Добавить трек (Аудиофайл)",
    trackTitle: "Название трека",
    explicit: "Explicit (18+)",
    explicitShort: "E",
    back: "Назад",
    next: "Далее",
    approve: "Принять",
    reject: "Отклонить",
    deleteReq: "ЗАПРОС УДАЛЕНИЯ",
    confirmDelete: "Удалить",
    rejectDel: "Отмена уд.",
    status: "Статус",
    type: "Тип",
    date: "Дата",
    actions: "Действия",
    noReleases: "Релизов пока нет.",
    noTracks: "Треков пока нет.",
    changePass: "Сменить пароль",
    newPass: "Новый пароль",
    updatePass: "Обновить пароль",
    bio: "Биография",
    submitChanges: "Отправить изменения",
    searchTrackAlbum: "Поиск трека или альбома...",
    noPending: "Нет ожидающих заявок",
    welcomeBack: "С возвращением!",
    regSent: "Заявка отправлена на модерацию.",
    usernameTaken: "Имя пользователя занято",
    modExists: "Модератор уже существует",
    artistAccDeleted: "Аккаунт артиста удален. Контент остался на площадке.",
    passChanged: "Пароль успешно изменен.",
    releaseDeleted: "Релиз удален из черновиков.",
    releaseSubmitted: "Релиз отправлен!",
    profileUpdateSent: "Обновление профиля отправлено на модерацию.",
    deletionRequested: "Запрос на удаление отправлен модератору.",
    trackLevelArtist: "Доп. артисты",
    artistNameReq: "Имя артиста обязательно для модератора.",
    completeFields: "Заполните обязательные поля (Название, Тип, Жанр, Обложка)",
    addOneTrack: "Добавьте хотя бы один трек.",
    specifyDate: "Укажите дату и время релиза.",
    releaseUpdated: "Релиз успешно обновлен.",
    trackDeleted: "Тестовый трек удален.",
    legacyHidden: "Старый релиз скрыт с платформы.",
    deletionRejected: "Удаление отменено. Релиз остается.",
    releaseRejected: "Релиз отклонен.",
    trackNote: "Прим:",
    tracksLower: "треков",
    huevifyDesc: "Миллионы треков. Бесплатно на Huevify.",
    searchToFind: "Используйте поиск.",
    chartDesc: "Самые популярные треки за 24 часа. Обновляется в 21:00 UTC+3.",
    genre_Pop: "Поп",
    genre_RapHipHop: "Рэп/Хип-Хоп",
    genre_RnB: "РнБ",
    genre_ElectronicDance: "Электроника",
    discoverBest: "Лучшие треки и релизы в жанре",
    genreSuffix: "",
    saveDraft: "Сохранить в черновик",
    draftSaved: "Черновик релиза сохранён.",
    drafts: "Черновики",
    draftsDesc: "Неопубликованные черновики релизов",
    noDrafts: "Нет сохранённых черновиков.",
    continueDraft: "Продолжить",
    deleteDraft: "Удалить черновик",
    draftDeleted: "Черновик удалён.",
    resumeDraftPrompt: "У вас есть несохранённый черновик. Хотите продолжить работу над ним?",
    resume: "Продолжить",
    discardDraft: "Сбросить черновик"
  }
};

interface StoreContextType {
  // Translations
  t: (key: string, defaultText?: string) => string;

  // Auth
  currentUser: User | null;
  login: (username: string, pass: string) => Promise<boolean> | boolean;
  register: (user: Omit<User, 'id'>) => Promise<boolean> | boolean;
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
  registerArtist: (data: Omit<ArtistAccount, 'id' | 'status'>) => Promise<{ success: boolean, message?: string }> | { success: boolean, message?: string };
  registerModerator: (data: ModeratorAccount) => Promise<{ success: boolean, message?: string }> | { success: boolean, message?: string };
  loginArtistOrMod: (username: string, pass: string, type: 'ARTIST' | 'MODERATOR') => Promise<{ success: boolean, message?: string }> | { success: boolean, message?: string };
  logoutArtistHub: () => void;
  submitRelease: (
      release: Omit<ReleaseRequest, 'id' | 'status' | 'artistId' | 'artistName' | 'submissionTime'>,
      overrideArtist?: { artistId: string, artistName: string }
  ) => void;
  updateReleaseRequest: (id: string, data: Partial<ReleaseRequest>) => void;
  submitProfileEdit: (edit: Omit<ProfileEditRequest, 'id' | 'status' | 'artistId' | 'artistName'>) => void;
  deleteRelease: (releaseId: string) => void;
  deleteLegacyTrack: (trackId: string) => void; // New function for root structure
  deleteArtistAccount: (artistId: string) => void;
  changeArtistPassword: (newPass: string) => void;
  changeModeratorPassword: (newPass: string) => void;
  
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
  isSupabaseConnected: boolean;
  clearAppCache: (keepAuth?: boolean) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

export const generateHUEQ = (): string => {
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

  const t = (key: string, defaultText?: string): string => {
      const lang = appSettings.language;
      const dict = TRANSLATIONS[lang] || TRANSLATIONS.English;
      const val = dict[key];
      // Explicitly check for undefined because empty string is a valid translation
      if (val !== undefined) return val;
      return defaultText || key;
  };

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
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(isSupabaseConfigured());
  
  // --- Artist Hub State ---
  const [isArtistHubOpen, setArtistHubOpen] = useState(false);
  const [currentArtist, setCurrentArtist] = useState<ArtistAccount | null>(null);
  const [currentModerator, setCurrentModerator] = useState<ModeratorAccount | null>(null);
  const [artistAccounts, setArtistAccounts] = useState<ArtistAccount[]>([]);
  const [releaseRequests, setReleaseRequests] = useState<ReleaseRequest[]>([]);
  const [profileEditRequests, setProfileEditRequests] = useState<ProfileEditRequest[]>([]);
  const [hasModerator, setHasModerator] = useState(false);
  const [existingArtists, setExistingArtists] = useState<string[]>([]);
  // Legacy deletions
  const [deletedLegacyIds, setDeletedLegacyIds] = useState<string[]>([]);

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

  const ensureUserLikedPlaylist = (list: Playlist[]): Playlist[] => {
      if (!currentUser) return list;
      const likedId = `liked_${currentUser.id}`;
      if (list.some(p => p.id === likedId)) return list;

      const localPlaylists = StorageService.load<Playlist[]>('huevify_playlists', []);
      const existingLocal = localPlaylists.find(p => p.id === likedId || (p.id === 'liked' && p.ownerId === currentUser.id));

      const likedPl: Playlist = existingLocal ? { ...existingLocal, id: likedId, ownerId: currentUser.id } : {
          id: likedId,
          name: 'Liked Songs',
          tracks: [],
          isSystem: true,
          description: 'Your favorite tracks',
          ownerId: currentUser.id
      };

      return [likedPl, ...list];
  };

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
                          setDeletedLegacyIds(StorageService.load<string[]>('huevify_deleted_legacy', []));
                          
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

  // --- Global Play Count Synchronization ---
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    // Periodic background sync of track plays every 60s
    const interval = setInterval(async () => {
      try {
        const remotePlays = await SupabaseService.fetchTrackPlays();
        if (remotePlays) {
          const stored = StorageService.load<Record<string, number>>('huevify_plays', {});
          const merged = { ...stored, ...remotePlays };
          StorageService.save('huevify_plays', merged);
          setTracks(prev => prev.map(t => ({
            ...t,
            plays: merged[t.id] !== undefined ? merged[t.id] : t.plays
          })));
        }
      } catch (e) {
        console.warn("Background track plays sync error:", e);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []); 

  // --- Logic to Refresh Library (Merge Static + Dynamic Data) ---
  const refreshLibrary = (requests: ReleaseRequest[], storedPlays?: Record<string, number>) => {
      try {
          const { tracks: initialTracks, albums: initialAlbums } = generateInitialData();
          const plays = storedPlays || StorageService.load<Record<string, number>>('huevify_plays', {});
          const loadedDeletedLegacyAlbums = StorageService.load<string[]>('huevify_deleted_legacy', []);
          const deletedLegacyAlbums = Array.isArray(loadedDeletedLegacyAlbums) ? loadedDeletedLegacyAlbums : [];
          
          const loadedDeletedLegacyTracks = StorageService.load<string[]>('huevify_deleted_legacy_tracks', []);
          const deletedLegacyTracks = Array.isArray(loadedDeletedLegacyTracks) ? loadedDeletedLegacyTracks : [];
          
          // Identify tracks that belong to deleted legacy albums
          const deletedLegacyTrackIdsFromAlbums = new Set<string>();
          initialAlbums.forEach(alb => {
              if (deletedLegacyAlbums.includes(alb.id)) {
                  alb.trackIds.forEach(tid => deletedLegacyTrackIdsFromAlbums.add(tid));
              }
          });

          // Filter out deleted legacy albums, tracks, and any test artifacts
          let mergedTracks = initialTracks.filter(t => 
              !isTestTrack(t) &&
              !deletedLegacyTrackIdsFromAlbums.has(t.id) && 
              !deletedLegacyTracks.includes(t.id)
          ); 
          let mergedAlbums = initialAlbums.filter(a => 
              !isTestAlbum(a) &&
              !deletedLegacyAlbums.includes(a.id)
          );
          
          const artistSet = new Set(mergedAlbums.map(a => a.artist));

          const validRequests = (Array.isArray(requests) ? requests : []).filter(req => {
              if (!req || !req.tracks) return false;
              if (isTestAlbum(req)) return false;
              return true;
          });
          validRequests.forEach(req => {
              // Safety check for malformed requests
              if (!req || !req.tracks) return;

              const isLive = req.status === 'LIVE';
              const isApprovedAndDue = req.status === 'APPROVED' && new Date(req.releaseDate).getTime() <= Date.now();
              
              if (isLive || isApprovedAndDue) {
                  artistSet.add(req.artistName);
                  if (req.additionalMainArtists) {
                      req.additionalMainArtists.forEach(a => artistSet.add(a));
                  }
                  
                  // Use ID from request. If it starts with 'a', it overrides a legacy album.
                  const albumId = req.id.startsWith('a') ? req.id : `dist_alb_${req.id}`;
                  
                  // Check if overriding existing album
                  const existingAlbumIndex = mergedAlbums.findIndex(a => a.id === albumId);
                  
                  const newAlbum: Album = {
                      id: albumId,
                      title: req.title,
                      artist: req.artistName,
                      covers: req.covers && req.covers.length > 0 ? req.covers : ["https://picsum.photos/300"],
                      trackIds: [],
                      year: new Date(req.releaseDate).getFullYear(),
                      releaseDate: req.releaseDate, 
                      recordLabel: req.label,
                      type: req.type,
                      mainArtists: req.additionalMainArtists || [] 
                  };

                  const newTracksForThisAlbum: Track[] = [];

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
                                  title: t.title,
                                  artist: t.artist || req.artistName, // Use track override or release artist
                                  genre: t.genre || req.genre || mergedTracks[trackIndex].genre,
                                  explicit: t.explicit,
                              };
                          }
                      } else {
                          trackId = `dist_trk_${req.id}_${idx}`;
                          const releaseLevelArtists = req.additionalMainArtists || [];
                          const trackLevelArtists = t.mainArtists || [];
                          const combinedMainArtists = Array.from(new Set([...releaseLevelArtists, ...trackLevelArtists]));

                          newTracksForThisAlbum.push({
                              id: trackId,
                              title: t.title,
                              artist: t.artist || req.artistName, // Use track override or release artist
                              album: req.title,
                              cover: req.covers && req.covers.length > 0 ? req.covers[0] : "https://picsum.photos/300", 
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

                  if (existingAlbumIndex !== -1) {
                      mergedAlbums[existingAlbumIndex] = newAlbum;
                      mergedTracks.push(...newTracksForThisAlbum);
                  } else {
                      mergedAlbums.push(newAlbum);
                      mergedTracks.push(...newTracksForThisAlbum);
                  }
              }
          });

          // Unique Tracks (Prevent duplicates if refresh called multiple times awkwardly)
          const uniqueTracks = Array.from(new Map(mergedTracks.map(item => [item.id, item])).values());

          const tracksWithPlays = uniqueTracks.map(t => ({
              ...t,
              plays: plays[t.id] !== undefined ? plays[t.id] : t.plays
          }));

          setTracks(tracksWithPlays);
          setAlbums(mergedAlbums);
          setExistingArtists(Array.from(artistSet));
      } catch (e) {
          console.error("Failed to refresh library", e);
          const { tracks: fallbackTracks } = generateInitialData();
          setTracks(fallbackTracks);
      }
  };

  // --- Initialization & User Switching ---
  useEffect(() => {
    let isMounted = true;
    const initApp = async () => {
      try {
        await StorageService.init();
        if (!isMounted) return;

        // 1. Load User
        const sessionUser = StorageService.load<User | null>('huevify_current_user', null);
        if (sessionUser) setCurrentUser(sessionUser);
        
        // 2. Load Global Data
        const savedArtistAccounts = StorageService.load<ArtistAccount[]>('huevify_artist_accounts', []).filter(a => !isTestArtist(a));
        setArtistAccounts(savedArtistAccounts);
        
        const loadedReleaseRequests = StorageService.load<ReleaseRequest[]>('huevify_release_requests', []).filter(r => !isTestAlbum(r));
        const savedReleaseRequests = Array.isArray(loadedReleaseRequests) ? loadedReleaseRequests : [];
        setReleaseRequests(savedReleaseRequests);
        
        const savedProfileRequests = StorageService.load<ProfileEditRequest[]>('huevify_profile_requests', []).filter(pr => {
          const name = (pr.artistName || '').trim().toLowerCase();
          return !['the algorithms', 'binary beats', 'null pointer', 'stack overflow'].includes(name);
        });
        setProfileEditRequests(savedProfileRequests);

        const loadedDeletedLegacy = StorageService.load<string[]>('huevify_deleted_legacy', []);
        const savedDeletedLegacy = Array.isArray(loadedDeletedLegacy) ? loadedDeletedLegacy : [];
        setDeletedLegacyIds(savedDeletedLegacy);

        const mod = StorageService.load<ModeratorAccount | null>('huevify_moderator', null);
        setHasModerator(!!mod);

        // Load Artist/Mod Session
        const sessionArtist = StorageService.load<ArtistAccount | null>('huevify_current_artist', null);
        if (sessionArtist && !isTestArtist(sessionArtist)) {
          setCurrentArtist(sessionArtist);
        } else if (sessionArtist) {
          setCurrentArtist(null);
          StorageService.save('huevify_current_artist', null);
        }

        const sessionMod = StorageService.load<ModeratorAccount | null>('huevify_current_moderator', null);
        if (sessionMod) setCurrentModerator(sessionMod);

        // Initial Lib Refresh
        refreshLibrary(savedReleaseRequests);

        // Supabase Cloud Sync
        if (isSupabaseConfigured()) {
          try {
            const [remoteReleases, remoteArtists, remotePlaylists, remoteMod, remoteUsers, remoteTrackPlays, remoteDailyChart] = await Promise.all([
              SupabaseService.fetchReleases(),
              SupabaseService.fetchArtistAccounts(),
              SupabaseService.fetchPlaylists(),
              SupabaseService.fetchModeratorAccount(),
              SupabaseService.fetchUsers(),
              SupabaseService.fetchTrackPlays(),
              SupabaseService.fetchDailyChart()
            ]);

            // Sync track plays across all devices
            const localPlays = StorageService.load<Record<string, number>>('huevify_plays', {});
            const mergedPlays: Record<string, number> = { ...localPlays };
            if (remoteTrackPlays) {
              Object.entries(remoteTrackPlays).forEach(([tid, count]) => {
                mergedPlays[tid] = Math.max(mergedPlays[tid] || 0, count);
              });
              StorageService.save('huevify_plays', mergedPlays);
            }

            if (remoteDailyChart) {
              if (remoteDailyChart.snapshot) {
                StorageService.save('huevify_chart_snapshot', remoteDailyChart.snapshot);
              }
              if (remoteDailyChart.lastUpdate) {
                StorageService.save('huevify_last_chart_update', remoteDailyChart.lastUpdate);
              }
              if (remoteDailyChart.chart) {
                const activeTracks = remoteDailyChart.chart.filter(t => (t.dailyPlays || 0) > 0);
                setDailyChart(activeTracks);
                StorageService.save('huevify_daily_chart', activeTracks);
              }
            }

            if (remoteReleases !== null) {
              const filtered = remoteReleases.filter(r => !isTestAlbum(r));
              setReleaseRequests(filtered);
              StorageService.save('huevify_release_requests', filtered);
              refreshLibrary(filtered, mergedPlays);
            } else {
              refreshLibrary(savedReleaseRequests, mergedPlays);
            }

            if (remoteArtists !== null) {
              const filtered = remoteArtists.filter(a => !isTestArtist(a));
              setArtistAccounts(filtered);
              StorageService.save('huevify_artist_accounts', filtered);
            }
            if (remotePlaylists !== null) {
              const mergedPls = ensureUserLikedPlaylist(remotePlaylists);
              setPlaylists(mergedPls);
              StorageService.save('huevify_playlists', mergedPls);
            }
            if (remoteUsers !== null) {
              const localUsers = StorageService.load<User[]>('huevify_users', []);
              const mergedMap = new Map<string, User>();
              localUsers.forEach(u => mergedMap.set(u.id, u));
              remoteUsers.forEach(u => mergedMap.set(u.id, u));
              const merged = Array.from(mergedMap.values());
              StorageService.save('huevify_users', merged);
            }
            if (remoteMod) {
              setHasModerator(true);
              StorageService.save('huevify_moderator', remoteMod);
            } else {
              const localMod = StorageService.load<ModeratorAccount | null>('huevify_moderator', null);
              if (localMod) {
                // If local exists but not in DB, sync local to Supabase
                SupabaseService.saveModeratorAccount(localMod).catch(e => console.warn('Sync mod to Supabase error:', e));
              }
            }
            setIsSupabaseConnected(true);
          } catch (supaErr) {
            console.warn("Supabase initial sync error:", supaErr);
          }
        }

        audioRef.current.volume = 0.5;
      } catch (e) {
        console.error("Initialization failed", e);
      } finally {
        if (isMounted) {
          setIsInitialized(true);
        }
      }
    };

    initApp();

    return () => {
      isMounted = false;
    };
  }, []);

  // --- Realtime Supabase Subscription ---
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const unsubscribe = SupabaseService.subscribeToChanges(async (table) => {
      if (table === 'releases') {
        const freshReleases = await SupabaseService.fetchReleases();
        if (freshReleases) {
          const filtered = freshReleases.filter(r => !isTestAlbum(r));
          setReleaseRequests(filtered);
          refreshLibrary(filtered);
        }
      } else if (table === 'artist_accounts') {
        const freshArtists = await SupabaseService.fetchArtistAccounts();
        if (freshArtists) {
          const filtered = freshArtists.filter(a => !isTestArtist(a));
          setArtistAccounts(filtered);
          StorageService.save('huevify_artist_accounts', filtered);
          setCurrentArtist(prev => {
            if (!prev) return null;
            const updated = filtered.find(a => a.id === prev.id || a.username.trim().toLowerCase() === prev.username.trim().toLowerCase());
            if (updated) {
              StorageService.save('huevify_current_artist', updated);
              return updated;
            }
            return prev;
          });
        }
      } else if (table === 'track_plays') {
        const freshPlays = await SupabaseService.fetchTrackPlays();
        if (freshPlays) {
          const stored = StorageService.load<Record<string, number>>('huevify_plays', {});
          const merged = { ...stored, ...freshPlays };
          StorageService.save('huevify_plays', merged);
          setTracks(prev => prev.map(t => ({
            ...t,
            plays: merged[t.id] !== undefined ? merged[t.id] : t.plays
          })));
        }
      } else if (table === 'playlists') {
        const freshPlaylists = await SupabaseService.fetchPlaylists();
        if (freshPlaylists) {
          const mergedPls = ensureUserLikedPlaylist(freshPlaylists);
          setPlaylists(mergedPls);
          StorageService.save('huevify_playlists', mergedPls);
        }
      } else if (table === 'users') {
        const freshUsers = await SupabaseService.fetchUsers();
        if (freshUsers) {
          const localUsers = StorageService.load<User[]>('huevify_users', []);
          const mergedMap = new Map<string, User>();
          localUsers.forEach(u => mergedMap.set(u.id, u));
          freshUsers.forEach(u => mergedMap.set(u.id, u));
          const merged = Array.from(mergedMap.values());
          StorageService.save('huevify_users', merged);
        }
      } else if (table === 'moderator_accounts') {
        const freshMod = await SupabaseService.fetchModeratorAccount();
        if (freshMod) {
          setHasModerator(true);
          StorageService.save('huevify_moderator', freshMod);
        } else {
          setHasModerator(false);
          StorageService.save('huevify_moderator', null);
        }
      } else if (table === 'track_plays' || table === 'track_play_logs') {
        const freshPlays = await SupabaseService.fetchTrackPlays();
        if (freshPlays) {
          const localPlays = StorageService.load<Record<string, number>>('huevify_plays', {});
          const mergedPlays = { ...localPlays, ...freshPlays };
          StorageService.save('huevify_plays', mergedPlays);
          setTracks(prev => prev.map(t => ({ ...t, plays: mergedPlays[t.id] ?? t.plays ?? 0 })));
        }
      } else if (table === 'daily_chart') {
        const freshChartData = await SupabaseService.fetchDailyChart();
        if (freshChartData && freshChartData.chart && freshChartData.chart.length > 0) {
          setDailyChart(freshChartData.chart);
          StorageService.save('huevify_daily_chart', freshChartData.chart);
        }
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
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

              // Load Recent per user and rehydrate with live tracks
              const userRecent = StorageService.load<Track[]>(`huevify_recent_${currentUser.id}`, []).filter(t => !isTestTrack(t));
              const hydratedRecent = userRecent.map(r => tracks.find(t => t.id === r.id) || r).filter(t => !isTestTrack(t));
              setRecentlyPlayed(hydratedRecent);

              // Load Followed/Liked per user (Already separated by key)
              const storedLikedAlbums = StorageService.load<string[]>(`huevify_liked_albums_${currentUser.id}`, []).filter(aid => !isTestAlbum({ id: aid }));
              setLikedAlbumIds(storedLikedAlbums);
              
              const storedFollowedArtists = StorageService.load<string[]>(`huevify_followed_artists_${currentUser.id}`, []).filter(name => !isTestArtist({ artistName: name }));
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
  }, [currentUser, tracks]);

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

  const registerArtist = async (data: Omit<ArtistAccount, 'id' | 'status'>): Promise<{ success: boolean, message?: string }> => {
      const trimmedUser = data.username.trim();
      if (artistAccounts.some(a => a.username.toLowerCase() === trimmedUser.toLowerCase())) {
        return { success: false, message: "Username taken" };
      }
      if (isSupabaseConfigured()) {
        try {
          const remoteArtists = await SupabaseService.fetchArtistAccounts();
          if (remoteArtists && remoteArtists.some(a => a.username.toLowerCase() === trimmedUser.toLowerCase())) {
            return { success: false, message: "Username taken" };
          }
        } catch (e) {
          console.warn('Check remote artist username error:', e);
        }
      }
      
      const newArtist: ArtistAccount = {
          ...data,
          username: trimmedUser,
          id: `art_${Date.now()}`,
          status: 'PENDING'
      };
      const updated = [...artistAccounts, newArtist];
      setArtistAccounts(updated);
      StorageService.save('huevify_artist_accounts', updated);
      notifySync('ARTIST_DATA_UPDATE');
      if (isSupabaseConfigured()) {
          await SupabaseService.saveArtistAccount(newArtist).catch(e => console.warn('Supabase save artist error:', e));
      }
      return { success: true };
  };

  const registerModerator = async (data: ModeratorAccount): Promise<{ success: boolean, message?: string }> => {
      if (hasModerator) return { success: false, message: "Moderator already exists" };
      StorageService.save('huevify_moderator', data);
      setHasModerator(true);
      setCurrentModerator(data);
      // Persist Mod Session
      StorageService.save('huevify_current_moderator', data);
      if (isSupabaseConfigured()) {
          try {
              await SupabaseService.saveModeratorAccount(data);
          } catch (e) {
              console.warn('Supabase save moderator error:', e);
          }
      }
      return { success: true };
  };

  const loginArtistOrMod = async (username: string, pass: string, type: 'ARTIST' | 'MODERATOR'): Promise<{ success: boolean, message?: string }> => {
      if (type === 'MODERATOR') {
          let mod = StorageService.load<ModeratorAccount | null>('huevify_moderator', null);
          if ((!mod || mod.username !== username || mod.password !== pass) && isSupabaseConfigured()) {
              const remoteMod = await SupabaseService.fetchModeratorAccount();
              if (remoteMod) {
                  mod = remoteMod;
                  setHasModerator(true);
                  StorageService.save('huevify_moderator', remoteMod);
              }
          }
          if (mod && username === mod.username && pass === mod.password) {
              setCurrentModerator(mod);
              StorageService.save('huevify_current_moderator', mod);
              return { success: true };
          }
          return { success: false, message: "Invalid moderator credentials" };
      } else {
          const trimmedUsername = username.trim();
          const trimmedPass = pass.trim();
          
          let artist: ArtistAccount | undefined = undefined;

          // Always fetch latest from Supabase if configured to get latest APPROVED status
          if (isSupabaseConfigured()) {
              try {
                  const remoteArtists = await SupabaseService.fetchArtistAccounts();
                  if (remoteArtists) {
                      const filtered = remoteArtists.filter(a => !isTestArtist(a));
                      setArtistAccounts(filtered);
                      StorageService.save('huevify_artist_accounts', filtered);
                      artist = filtered.find(
                          a => a.username.trim().toLowerCase() === trimmedUsername.toLowerCase() && a.password.trim() === trimmedPass
                      );
                  }
              } catch (e) {
                  console.warn('Login artist fetch error:', e);
              }
          }

          // Fallback to local accounts if not found in remote or offline
          if (!artist) {
              artist = artistAccounts.find(
                  a => a.username.trim().toLowerCase() === trimmedUsername.toLowerCase() && a.password.trim() === trimmedPass
              );
          }

          if (!artist) {
              const currentList = StorageService.load<ArtistAccount[]>('huevify_artist_accounts', artistAccounts);
              const exists = currentList.some(a => a.username.trim().toLowerCase() === trimmedUsername.toLowerCase());
              if (exists) {
                  return { success: false, message: t('invalidCreds', "Неверный пароль") };
              }
              return { success: false, message: t('artistNotFound', "Аккаунт артиста не найден") };
          }

          if (artist.status === 'PENDING') {
              return { success: false, message: t('accountPending', "Заявка на регистрацию находится на рассмотрении модератором") };
          }
          if (artist.status === 'REJECTED') {
              return { success: false, message: t('accountRejected', "Заявка на регистрацию отклонена модератором") };
          }
          
          setCurrentArtist(artist);
          StorageService.save('huevify_current_artist', artist);
          return { success: true };
      }
  };

  const logoutArtistHub = () => {
      setCurrentArtist(null);
      setCurrentModerator(null);
      StorageService.save('huevify_current_artist', null);
      StorageService.save('huevify_current_moderator', null);
  };

  const deleteArtistAccount = (artistId: string) => {
      const updated = artistAccounts.filter(a => a.id !== artistId);
      setArtistAccounts(updated);
      StorageService.save('huevify_artist_accounts', updated);
      
      // If current artist is deleted, logout
      if (currentArtist && currentArtist.id === artistId) {
          logoutArtistHub();
      }
      
      notifySync('ARTIST_DATA_UPDATE');
      showNotification(t('artistAccDeleted'), "info");
      if (isSupabaseConfigured()) {
          SupabaseService.deleteArtistAccount(artistId).catch(e => console.warn('Supabase delete artist error:', e));
      }
  };

  const changeArtistPassword = (newPass: string) => {
      if (!currentArtist) return;
      const updated = artistAccounts.map(a => a.id === currentArtist.id ? { ...a, password: newPass } : a);
      setArtistAccounts(updated);
      StorageService.save('huevify_artist_accounts', updated);
      notifySync('ARTIST_DATA_UPDATE');
      // Update session
      const newSession = { ...currentArtist, password: newPass };
      setCurrentArtist(newSession);
      StorageService.save('huevify_current_artist', newSession);
      showNotification(t('passChanged'), "success");
      if (isSupabaseConfigured()) {
          SupabaseService.saveArtistAccount(newSession).catch(e => console.warn('Supabase update artist password error:', e));
      }
  };

  const changeModeratorPassword = (newPass: string) => {
      if (!currentModerator) return;
      const updatedMod = { ...currentModerator, password: newPass };
      StorageService.save('huevify_moderator', updatedMod);
      setCurrentModerator(updatedMod);
      StorageService.save('huevify_current_moderator', updatedMod);
      showNotification(t('passChanged'), "success");
      if (isSupabaseConfigured()) {
          SupabaseService.saveModeratorAccount(updatedMod).catch(e => console.warn('Supabase update mod pass error:', e));
      }
  };

  // Helper to remove tracks from playlists and history when a release is deleted
  const cleanupTracksFromLists = (trackIdsToRemove: string[]) => {
      if (trackIdsToRemove.length === 0) return;
      const trackSet = new Set(trackIdsToRemove);

      // 1. Clean Playlists (Global)
      const allPlaylists = StorageService.load<Playlist[]>('huevify_playlists', []);
      const updatedPlaylists = allPlaylists.map(pl => ({
          ...pl,
          tracks: pl.tracks.filter(tid => !trackSet.has(tid))
      }));
      setPlaylists(updatedPlaylists);
      StorageService.save('huevify_playlists', updatedPlaylists);
      notifySync('PLAYLISTS_UPDATE');

      // 2. Clean Recent History (Current User only)
      if (currentUser) {
          const userRecent = StorageService.load<Track[]>(`huevify_recent_${currentUser.id}`, []);
          const updatedRecent = userRecent.filter(t => !trackSet.has(t.id));
          
          setRecentlyPlayed(updatedRecent);
          const historyToSave = updatedRecent.map(t => ({
              ...t,
              url: t.url && t.url.startsWith('data:') ? '' : t.url
          }));
          StorageService.save(`huevify_recent_${currentUser.id}`, historyToSave);
      }
  };

  const deleteLegacyTrack = (trackId: string) => {
      if (!trackId.startsWith('t')) {
          showNotification("Can only delete test tracks.", "error");
          return;
      }
      
      const loadedDeletedTracks = StorageService.load<string[]>('huevify_deleted_legacy_tracks', []);
      const deletedTracks = Array.isArray(loadedDeletedTracks) ? loadedDeletedTracks : [];
      if (!deletedTracks.includes(trackId)) {
          const updated = [...deletedTracks, trackId];
          StorageService.save('huevify_deleted_legacy_tracks', updated);
          
          // Cleanup playlists
          cleanupTracksFromLists([trackId]);
          
          notifySync('ARTIST_DATA_UPDATE');
          refreshLibrary(releaseRequests);
          showNotification(t('trackDeleted'), "success");
      }
  };

  const deleteRelease = (releaseId: string) => {
      // Check if it's a legacy release
      if (releaseId.startsWith('a') && !releaseId.includes('dist_')) {
          const updatedDeleted = [...deletedLegacyIds, releaseId];
          setDeletedLegacyIds(updatedDeleted);
          StorageService.save('huevify_deleted_legacy', updatedDeleted);
          
          // Cleanup legacy tracks from lists
          // Find the tracks associated with this legacy album ID
          const { albums: initialAlbums } = generateInitialData();
          const targetAlbum = initialAlbums.find(a => a.id === releaseId);
          if (targetAlbum) {
              cleanupTracksFromLists(targetAlbum.trackIds);
          }

          notifySync('ARTIST_DATA_UPDATE');
          refreshLibrary(releaseRequests);
          showNotification(t('legacyHidden'), "success");
          return;
      }

      const release = releaseRequests.find(r => r.id === releaseId);
      if (!release) return;

      if (release.status === 'LIVE' || release.status === 'APPROVED') {
          const updated = releaseRequests.map(r => r.id === releaseId ? { ...r, deletionRequested: true } : r);
          setReleaseRequests(updated);
          StorageService.save('huevify_release_requests', updated);
          notifySync('ARTIST_DATA_UPDATE');
          showNotification(t('deletionRequested'), "info");
      } else {
          const updated = releaseRequests.filter(r => r.id !== releaseId);
          setReleaseRequests(updated);
          StorageService.save('huevify_release_requests', updated);
          
          // Cleanup modern tracks (IDs usually contain the release ID like dist_trk_RELID_0)
          // Since we might not know exact IDs easily without iterating, we rely on the pattern.
          // BUT cleanupTracksFromLists expects exact IDs. 
          // Better approach for custom releases: Filter playlists by substring match.
          
          const allPlaylists = StorageService.load<Playlist[]>('huevify_playlists', []);
          const updatedPlaylists = allPlaylists.map(pl => ({
              ...pl,
              tracks: pl.tracks.filter(tid => !tid.includes(releaseId))
          }));
          setPlaylists(updatedPlaylists);
          StorageService.save('huevify_playlists', updatedPlaylists);
          notifySync('PLAYLISTS_UPDATE');

          if (currentUser) {
              const userRecent = StorageService.load<Track[]>(`huevify_recent_${currentUser.id}`, []);
              const updatedRecent = userRecent.filter(t => !t.id.includes(releaseId));
              setRecentlyPlayed(updatedRecent);
              const historyToSave = updatedRecent.map(t => ({
                  ...t,
                  url: t.url && t.url.startsWith('data:') ? '' : t.url
              }));
              StorageService.save(`huevify_recent_${currentUser.id}`, historyToSave);
          }

          notifySync('ARTIST_DATA_UPDATE');
          refreshLibrary(updated);
          showNotification(t('releaseDeleted'), "success");
          if (isSupabaseConfigured()) {
              SupabaseService.deleteRelease(releaseId).catch(e => console.warn('Supabase delete release error:', e));
          }
      }
  };

  const submitRelease = (
      releaseData: Omit<ReleaseRequest, 'id' | 'status' | 'artistId' | 'artistName' | 'submissionTime'>,
      overrideArtist?: { artistId: string, artistName: string }
  ) => {
      const artistId = overrideArtist ? overrideArtist.artistId : currentArtist?.id;
      const artistName = overrideArtist ? overrideArtist.artistName : currentArtist?.artistName;

      if (!artistId || !artistName) return;

      const newRelease: ReleaseRequest = {
          ...releaseData,
          id: `rel_${Date.now()}`,
          artistId: artistId,
          artistName: artistName,
          status: 'PENDING',
          submissionTime: new Date().toISOString()
      };
      
      // Auto-approve if moderator is uploading
      if (overrideArtist) {
          newRelease.status = 'APPROVED';
          // Check if date is in past, if so make LIVE
          if (new Date(newRelease.releaseDate).getTime() <= Date.now()) {
              newRelease.status = 'LIVE';
          }
      }

      const updated = [...releaseRequests, newRelease];
      setReleaseRequests(updated);
      StorageService.save('huevify_release_requests', updated);
      notifySync('ARTIST_DATA_UPDATE');
      
      if (newRelease.status === 'LIVE' || newRelease.status === 'APPROVED') {
          refreshLibrary(updated);
      }
      if (isSupabaseConfigured()) {
          SupabaseService.saveRelease(newRelease).catch(e => console.warn('Supabase save release error:', e));
      }
  };

  const updateReleaseRequest = (id: string, data: Partial<ReleaseRequest>) => {
      // Check if updating a "legacy" ID that doesn't exist in requests yet (Migration scenario)
      if (id.startsWith('a') && !releaseRequests.find(r => r.id === id)) {
          // This is a legacy album being "edited". We need to create a new Request for it with the legacy ID
          // to overwrite the static data in refreshLibrary
          const newRequest: ReleaseRequest = {
              ...data as ReleaseRequest, // Data contains the full form state
              id: id, // Keep legacy ID to override
              status: 'LIVE', // Directly live if mod edits legacy
              submissionTime: new Date().toISOString()
          };
          const updated = [...releaseRequests, newRequest];
          setReleaseRequests(updated);
          StorageService.save('huevify_release_requests', updated);
          notifySync('ARTIST_DATA_UPDATE');
          refreshLibrary(updated);
          return;
      }

      const updated = releaseRequests.map(r => r.id === id ? { ...r, ...data } : r);
      setReleaseRequests(updated);
      StorageService.save('huevify_release_requests', updated);
      notifySync('ARTIST_DATA_UPDATE');
      
      // If it's live or approved, we need to refresh the library to reflect changes
      const req = updated.find(r => r.id === id);
      if (req && (req.status === 'LIVE' || req.status === 'APPROVED')) {
          refreshLibrary(updated);
      }
      if (isSupabaseConfigured() && req) {
          SupabaseService.saveRelease(req).catch(e => console.warn('Supabase update release error:', e));
      }
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
      if (isSupabaseConfigured()) {
          const a = updated.find(x => x.id === id);
          if (a) SupabaseService.saveArtistAccount(a).catch(e => console.warn('Supabase approve artist error:', e));
      }
  };
  const rejectArtist = (id: string) => {
      const updated = artistAccounts.map(a => a.id === id ? { ...a, status: 'REJECTED' as const } : a);
      setArtistAccounts(updated);
      StorageService.save('huevify_artist_accounts', updated);
      notifySync('ARTIST_DATA_UPDATE');
      if (isSupabaseConfigured()) {
          const a = updated.find(x => x.id === id);
          if (a) SupabaseService.saveArtistAccount(a).catch(e => console.warn('Supabase reject artist error:', e));
      }
  };

  const approveRelease = (id: string) => {
      const existingReq = releaseRequests.find(r => r.id === id);
      if (!existingReq) return;

      if (existingReq.deletionRequested) {
          const updated = releaseRequests.filter(r => r.id !== id);
          setReleaseRequests(updated);
          StorageService.save('huevify_release_requests', updated);
          
          // Cleanup: If it's a custom release, cleanup by substring match
          const allPlaylists = StorageService.load<Playlist[]>('huevify_playlists', []);
          const updatedPlaylists = allPlaylists.map(pl => ({
              ...pl,
              tracks: pl.tracks.filter(tid => !tid.includes(id))
          }));
          setPlaylists(updatedPlaylists);
          StorageService.save('huevify_playlists', updatedPlaylists);
          
          if (currentUser) {
              const userRecent = StorageService.load<Track[]>(`huevify_recent_${currentUser.id}`, []);
              const updatedRecent = userRecent.filter(t => !t.id.includes(id));
              setRecentlyPlayed(updatedRecent);
              const historyToSave = updatedRecent.map(t => ({
                  ...t,
                  url: t.url && t.url.startsWith('data:') ? '' : t.url
              }));
              StorageService.save(`huevify_recent_${currentUser.id}`, historyToSave);
          }

          refreshLibrary(updated);
          notifySync('ARTIST_DATA_UPDATE');
          if (isSupabaseConfigured()) {
              SupabaseService.deleteRelease(id).catch(e => console.warn('Supabase delete release error:', e));
          }
          return;
      }

      const tracksWithHueqs = existingReq.tracks.map(t => {
          if (t.existingHueq) return t; 
          if (t.generatedHueq) return t;
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
      if (isSupabaseConfigured() && req) {
          SupabaseService.saveRelease(req).catch(e => console.warn('Supabase approve release error:', e));
      }
  };
  const rejectRelease = (id: string) => {
      // If it's a deletion request rejection, we just cancel the deletion request
      const req = releaseRequests.find(r => r.id === id);
      if (req && req.deletionRequested) {
          const updated = releaseRequests.map(r => r.id === id ? { ...r, deletionRequested: false } : r);
          setReleaseRequests(updated);
          StorageService.save('huevify_release_requests', updated);
          showNotification(t('deletionRejected'), "info");
          if (isSupabaseConfigured()) {
              const r = updated.find(x => x.id === id);
              if (r) SupabaseService.saveRelease(r).catch(e => console.warn('Supabase cancel deletion error:', e));
          }
      } else {
          // Normal rejection of a new release
          const updated = releaseRequests.map(r => r.id === id ? { ...r, status: 'REJECTED' as const, deletionRequested: false } : r);
          setReleaseRequests(updated);
          StorageService.save('huevify_release_requests', updated);
          showNotification(t('releaseRejected'), "info");
          if (isSupabaseConfigured()) {
              const r = updated.find(x => x.id === id);
              if (r) SupabaseService.saveRelease(r).catch(e => console.warn('Supabase reject release error:', e));
          }
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

      if (isSupabaseConfigured()) {
        const updatedArtist = updatedAccounts.find(a => a.id === req.artistId);
        if (updatedArtist) {
          SupabaseService.saveArtistAccount(updatedArtist).catch(e => console.warn('Supabase save artist profile edit error:', e));
        }
      }
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

  // --- Daily Top 25 Chart Calculation ---
  useEffect(() => {
    if (tracks.length === 0) return;

    let isSubscribed = true;

    const processDailyChart = async () => {
        // Calculate the most recent 21:00 UTC+3 (18:00 UTC) publication point in the past
        const now = new Date();
        let latestPublicationPoint = new Date();
        latestPublicationPoint.setUTCHours(18, 0, 0, 0); // 18:00 UTC = 21:00 UTC+3
        if (now.getTime() < latestPublicationPoint.getTime()) {
            latestPublicationPoint.setDate(latestPublicationPoint.getDate() - 1);
        }

        // Interval for the completed 24-hour cycle that ended at latestPublicationPoint
        const cycleEnd = latestPublicationPoint;
        const cycleStart = new Date(latestPublicationPoint.getTime() - 24 * 60 * 60 * 1000);

        let remoteData = null;
        if (isSupabaseConfigured()) {
            remoteData = await SupabaseService.fetchDailyChart();
        }

        const lastUpdateStr = remoteData?.lastUpdate || StorageService.load<string | null>('huevify_last_chart_update', null);
        const hasUpToDateChart = lastUpdateStr && new Date(lastUpdateStr).getTime() >= latestPublicationPoint.getTime();

        if (hasUpToDateChart) {
            // Static published chart is already up-to-date for the current 24h window
            const published = (remoteData?.chart || StorageService.load<DailyChartTrack[]>('huevify_daily_chart', []))
                .filter(t => (t.dailyPlays || 0) > 0);
            if (!isSubscribed) return;
            setDailyChart(published);
            return;
        }

        // Time to publish a new static snapshot for completed [cycleStart, cycleEnd] period
        let dailyPlaysMap: Record<string, number> = {};
        let isFromSupabase = false;

        if (isSupabaseConfigured()) {
            const rangePlays = await SupabaseService.fetchDailyPlaysRange(cycleStart.toISOString(), cycleEnd.toISOString());
            if (rangePlays) {
                dailyPlaysMap = rangePlays;
                isFromSupabase = true;
            }
        }

        if (!isFromSupabase) {
            const localLogs = StorageService.load<Array<{ trackId: string; plays: number; timestamp: number }>>('huevify_play_logs', []);
            const periodLogs = localLogs.filter(l => l.timestamp >= cycleStart.getTime() && l.timestamp < cycleEnd.getTime());
            periodLogs.forEach(l => {
                dailyPlaysMap[l.trackId] = (dailyPlaysMap[l.trackId] || 0) + l.plays;
            });
        }

        if (!isSubscribed) return;

        const liveTracks = tracks.filter(t => !isTestTrack(t));

        // Spotify-style static daily chart: strictly tracks with dailyPlays > 0 during COMPLETED period
        const chartData: DailyChartTrack[] = liveTracks
            .map(t => ({
                ...t,
                dailyPlays: dailyPlaysMap[t.id] || 0
            }))
            .filter(t => t.dailyPlays > 0);

        const sorted = chartData.sort((a, b) => {
            if (b.dailyPlays !== a.dailyPlays) return b.dailyPlays - a.dailyPlays;
            if ((b.plays || 0) !== (a.plays || 0)) return (b.plays || 0) - (a.plays || 0);
            return a.title.localeCompare(b.title);
        }).slice(0, 25);

        setDailyChart(sorted);

        const chartToSave = sorted.map(t => ({
            ...t,
            url: t.url && t.url.startsWith('data:') ? '' : t.url
        }));

        StorageService.save('huevify_daily_chart', chartToSave);
        StorageService.save('huevify_last_chart_update', latestPublicationPoint.toISOString());

        if (isSupabaseConfigured()) {
            SupabaseService.saveDailyChart(
                chartToSave,
                dailyPlaysMap,
                latestPublicationPoint.toISOString()
            );
        }
    };

    processDailyChart();
    const interval = setInterval(processDailyChart, 30000);
    return () => {
        isSubscribed = false;
        clearInterval(interval);
    };

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
      if (!track) return "";
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
          if (isSupabaseConfigured()) {
            updatedPlaylists.filter(p => p.ownerId === currentUser.id).forEach(p => {
              SupabaseService.savePlaylist(p).catch(e => console.warn('Supabase sync playlist creator error:', e));
            });
          }
      }
      if (isSupabaseConfigured()) {
          SupabaseService.saveUser(updatedUser).catch(e => console.warn('Supabase save user error:', e));
      }
      return { success: true };
  };

  // --- Auth Methods ---
  const login = async (username: string, pass: string): Promise<boolean> => {
    const trimmedUser = username.trim();
    const users = StorageService.load<User[]>('huevify_users', []);
    let user = users.find(u => u.username.toLowerCase() === trimmedUser.toLowerCase() && u.password === pass);
    
    // If not found in local storage, check Supabase directly
    if (!user && isSupabaseConfigured()) {
      try {
        const remoteUser = await SupabaseService.fetchUserByUsername(trimmedUser);
        if (remoteUser && remoteUser.password === pass) {
          user = remoteUser;
          const updatedUsers = [...users.filter(u => u.id !== user!.id), user];
          StorageService.save('huevify_users', updatedUsers);
        }
      } catch (e) {
        console.warn('Supabase login check failed:', e);
      }
    }

    if (user) {
        setCurrentUser(user);
        StorageService.save('huevify_current_user', user);
        
        // Restore user preferences if in Supabase
        if (isSupabaseConfigured()) {
          SupabaseService.fetchUserPreferences(user.id).then(prefs => {
            if (prefs) {
              if (prefs.likedTracks) StorageService.save(`huevify_liked_${user.id}`, prefs.likedTracks);
              if (prefs.followedArtists) StorageService.save(`huevify_followed_${user.id}`, prefs.followedArtists);
            }
          }).catch(e => console.warn('Restore user prefs error:', e));
        }

        return true;
    }
    return false;
  };

  const register = async (newUser: Omit<User, 'id'>): Promise<boolean> => {
      const trimmedUser = newUser.username.trim();
      const users = StorageService.load<User[]>('huevify_users', []);
      if (users.some(u => u.username.toLowerCase() === trimmedUser.toLowerCase())) {
          return false; // User exists in local storage
      }
      if (isSupabaseConfigured()) {
          try {
              const remoteExists = await SupabaseService.fetchUserByUsername(trimmedUser);
              if (remoteExists) {
                  return false; // User already exists in Supabase
              }
          } catch (e) {
              console.warn('Check existing user error:', e);
          }
      }
      const user: User = { ...newUser, username: trimmedUser, id: `user_${Date.now()}` };
      const updatedUsers = [...users, user];
      StorageService.save('huevify_users', updatedUsers);
      setCurrentUser(user);
      StorageService.save('huevify_current_user', user);
      if (isSupabaseConfigured()) {
          SupabaseService.saveUser(user).catch(e => console.warn('Supabase register user error:', e));
      }
      return true;
  };

  const logout = () => {
      setCurrentUser(null);
      StorageService.save('huevify_current_user', null);
      logoutArtistHub(); // Clean up artist/mod sessions too
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
    setFollowedArtists(prev => {
      const updated = prev.includes(artistName) ? prev.filter(a => a !== artistName) : [...prev, artistName];
      if (currentUser) {
        StorageService.save(`huevify_followed_${currentUser.id}`, updated);
        if (isSupabaseConfigured()) {
          SupabaseService.saveUserPreferences(currentUser.id, { followedArtists: updated }).catch(e => console.warn('Supabase follow sync error:', e));
        }
      }
      return updated;
    });
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

      // Count play IF active listen >= 30s OR listen duration >= 50% of short track, AND hasn't counted yet
      const threshold = audio.duration && audio.duration < 30 ? Math.max(5, audio.duration * 0.5) : 30;
      if (cumulativeTimeRef.current >= threshold && !hasCountedListen && currentTrack) {
          handleListenCount(currentTrack);
      }
    };
    const handleEnded = () => {
      if (!hasCountedListen && currentTrack) {
          handleListenCount(currentTrack);
      }
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
    if (!track) return;
    setHasCountedListen(true);

    // Random plays multiplier: 1 listen = +100..10000 plays
    const addedPlays = Math.floor(Math.random() * (10000 - 100 + 1)) + 100;

    setTracks(prev => {
        const updated = prev.map(t => t.id === track.id ? { ...t, plays: (t.plays || 0) + addedPlays } : t);
        const playCounts = updated.reduce((acc, t) => ({ ...acc, [t.id]: t.plays }), {});
        StorageService.save('huevify_plays', playCounts);
        notifySync('TRACKS_UPDATE');
        return updated;
    });

    // Save local log for offline/fallback chart calculation
    const localLogs = StorageService.load<Array<{ trackId: string; plays: number; timestamp: number }>>('huevify_play_logs', []);
    localLogs.push({ trackId: track.id, plays: addedPlays, timestamp: Date.now() });
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    StorageService.save('huevify_play_logs', localLogs.filter(l => l.timestamp >= cutoff));

    if (isSupabaseConfigured()) {
        SupabaseService.recordPlayLog(track.id, currentUser?.id || 'anonymous', addedPlays).then(newCount => {
            if (newCount !== null) {
                setTracks(prev => prev.map(t => t.id === track.id ? { ...t, plays: newCount } : t));
                const currentPlays = StorageService.load<Record<string, number>>('huevify_plays', {});
                currentPlays[track.id] = newCount;
                StorageService.save('huevify_plays', currentPlays);
            }
        }).catch(e => console.warn('Record play log error:', e));
    }
  };

  const playTrack = (track: Track) => {
    if (!track) return;
    // 1. Check if track is Explicit and allowed
    if (track.explicit && !appSettings.allowExplicitContent) {
        showNotification(t('allowExplicit'), "error");
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
            const historyToSave = newHistory.map(t => ({
                ...t,
                url: t.url && t.url.startsWith('data:') ? '' : t.url
            }));
            StorageService.save(`huevify_recent_${currentUser.id}`, historyToSave);
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
      if (isSupabaseConfigured()) {
          newGlobalPlaylists.forEach(pl => SupabaseService.savePlaylist(pl).catch(e => console.warn('Supabase save playlist error:', e)));
      }
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
  const confirmDeletePlaylist = () => { 
    if (!playlistToDelete) return; 
    const id = playlistToDelete; 
    if (view.type === 'PLAYLIST' && (view as any).id === id) setViewInternal({ type: 'LIBRARY' }); 
    const all = [...playlists]; 
    const updated = all.filter(p => p.id !== id); 
    syncPlaylists(updated); 
    closeDeleteModal(); 
    if (isSupabaseConfigured()) {
        SupabaseService.deletePlaylist(id).catch(e => console.warn('Supabase delete playlist error:', e));
    }
  };
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
  
  const toggleAlbumLike = (albumId: string) => { 
    setLikedAlbumIds(prev => {
      const updated = prev.includes(albumId) ? prev.filter(id => id !== albumId) : [...prev, albumId];
      if (currentUser) {
        StorageService.save(`huevify_liked_albums_${currentUser.id}`, updated);
        if (isSupabaseConfigured()) {
          SupabaseService.saveUserPreferences(currentUser.id, { likedAlbumIds: updated }).catch(e => console.warn('Supabase liked albums sync error:', e));
        }
      }
      return updated;
    });
  };
  const isAlbumLiked = (albumId: string) => likedAlbumIds.includes(albumId);
  const openAddToPlaylist = (trackId: string) => { setTrackIdToAdd(trackId); setAddToPlaylistOpen(true); };
  const closeAddToPlaylist = () => { setAddToPlaylistOpen(false); setTrackIdToAdd(null); };

  const clearAppCache = async (keepAuth = false) => {
    try {
      showNotification("Очистка кэша приложения...", "info");
      await StorageService.clearAllCache(keepAuth);

      if (isSupabaseConfigured()) {
        const [remoteReleases, remoteArtists, remotePlaylists, remoteMod] = await Promise.all([
          SupabaseService.fetchReleases(),
          SupabaseService.fetchArtistAccounts(),
          SupabaseService.fetchPlaylists(),
          SupabaseService.fetchModeratorAccount()
        ]);
        const cleanReleases = Array.isArray(remoteReleases) ? remoteReleases.filter(r => !isTestAlbum(r)) : [];
        const cleanArtists = Array.isArray(remoteArtists) ? remoteArtists.filter(a => !isTestArtist(a)) : [];
        const cleanPlaylists = Array.isArray(remotePlaylists) ? remotePlaylists : [];

        setReleaseRequests(cleanReleases);
        setArtistAccounts(cleanArtists);
        setPlaylists(ensureUserLikedPlaylist(cleanPlaylists));
        refreshLibrary(cleanReleases);
        if (remoteMod) {
          setHasModerator(true);
          StorageService.save('huevify_moderator', remoteMod);
        } else {
          setHasModerator(false);
        }
      } else {
        setReleaseRequests([]);
        setArtistAccounts([]);
        setPlaylists([]);
        refreshLibrary([]);
      }

      if (!keepAuth) {
        setCurrentUser(null);
        setCurrentArtist(null);
        setCurrentModerator(null);
      }

      showNotification("Кэш успешно очищен!", "success");
    } catch (e) {
      console.warn("Failed clearing cache:", e);
      showNotification("Ошибка при очистке кэша", "error");
    }
  };

  if (!isInitialized && currentUser) {
      return (
          <div className="flex h-screen w-full bg-black items-center justify-center flex-col gap-4">
              <div className="w-20 h-20 rounded-full bg-surface-highlight flex items-center justify-center animate-pulse">
                  <span className="text-4xl font-bold text-primary">H</span>
              </div>
              <div className="text-secondary text-sm animate-pulse">Loading Library...</div>
          </div>
      );
  }

  return (
    <StoreContext.Provider value={{
      t,
      currentUser, login, register, logout, updateUserProfile,
      appSettings, updateSettings, dailyChart,
      getAlbumCover, changeAlbumCover, getTrackCover,
      isArtistHubOpen, setArtistHubOpen, currentArtist, currentModerator, artistAccounts,
      registerArtist, registerModerator, loginArtistOrMod, logoutArtistHub, submitRelease, submitProfileEdit, deleteRelease, deleteLegacyTrack, updateReleaseRequest, deleteArtistAccount, changeArtistPassword, changeModeratorPassword,
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
      toggleAlbumLike, isAlbumLiked, isSupabaseConnected, clearAppCache
    }}>
      {children}
    </StoreContext.Provider>
  );
};