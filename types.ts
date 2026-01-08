
export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string; // Keep for track display consistency, usually points to active album cover
  duration: number; // in seconds
  url: string; // audio source
  plays: number;
  genre: string; // New field for recommendations
  explicit?: boolean;
  feat?: string;
  hueq?: string; // ISRC equivalent
  mainArtists?: string[]; // Array of additional main artists
}

export interface DailyChartTrack extends Track {
  dailyPlays: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  customCover?: string; // Base64 or URL
  tracks: string[]; // array of track IDs
  isSystem?: boolean; // e.g. "Liked Songs"
  ownerId?: string; // ID of the user who created this playlist
  
  // New fields for Public/Private feature
  isPublic?: boolean;
  creatorName?: string;
  creatorAvatar?: string;
  savedBy?: string[]; // Array of User IDs who added this playlist to their library
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  covers: string[]; // Changed from single cover to array
  trackIds: string[];
  year: number;
  releaseDate?: string; // ISO string for full date display
  recordLabel?: string;
  type?: ReleaseType;
  mainArtists?: string[]; // Added at album level for better display
}

export interface User {
  id: string;
  username: string;
  password: string; // Stored locally for this prototype
  displayName: string;
  avatar?: string; // Base64
}

export interface AppSettings {
  accentColor: string;
  language: 'English' | 'Russian';
  allowExplicitContent: boolean; // Replaced High Quality Audio
  autoPlay: boolean;
  crossfade: number; // seconds
  albumCoverIndexes: Record<string, number>; // Stores user preference for album covers
}

export type ViewState = 
  | { type: 'HOME' }
  | { type: 'SEARCH' }
  | { type: 'LIBRARY' }
  | { type: 'PLAYLIST'; id: string }
  | { type: 'ALBUM'; id: string }
  | { type: 'ARTIST'; id: string }
  | { type: 'CHARTS' }
  | { type: 'GENRE'; id: string };

export enum PlayMode {
  OFF = 'OFF',
  CONTEXT = 'CONTEXT', // Repeat Playlist/Album
  ONE = 'ONE', // Repeat One Track
}

// --- ARTIST HUB TYPES ---

export type ArtistVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ArtistAccount {
  id: string; // Unique ID for the account
  artistName: string; // Displays as the Artist Name in app
  username: string; // Login username
  password: string; 
  avatar?: string;
  bio?: string; // Artist Description
  status: ArtistVerificationStatus;
  artistPick?: {
    type: 'TRACK' | 'ALBUM' | 'PLAYLIST';
    id: string;
    image?: string;
    subtitle?: string;
  };
}

export interface ModeratorAccount {
  username: string;
  password: string;
}

export interface DistributionTrack {
  title: string;
  explicit: boolean;
  feat?: string; // Featured artists
  mainArtists?: string[]; // Additional main artists
  genre?: string; // Track specific genre
  fileUrl: string; // Mocked for prototype
  duration: number;
  existingHueq?: string; // If user inputs an existing code
  generatedHueq?: string; // Assigned by system on approval
}

export type ReleaseType = 'Single' | 'Album' | 'EP' | 'Mixtape';

export interface ReleaseRequest {
  id: string;
  artistId: string;
  artistName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'LIVE';
  submissionTime?: string; // ISO String
  deletionRequested?: boolean; // New: For moderation deletion flow
  
  // Info
  title: string;
  type: ReleaseType;
  genre: string;
  label: string;
  covers: string[]; // Array of covers
  additionalMainArtists?: string[];
  
  // Tracks
  tracks: DistributionTrack[];
  
  // Schedule
  releaseDate: string; // ISO String
  releaseMessage?: string;
}

export interface ProfileEditRequest {
  id: string;
  artistId: string;
  artistName: string;
  newAvatar?: string;
  newBio?: string;
  newArtistPick?: ArtistAccount['artistPick'];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface AppNotification {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}
