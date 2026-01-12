
export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: number;
  url: string;
  plays: number;
  genre: string;
  explicit?: boolean;
  feat?: string;
  hueq?: string;
  mainArtists?: string[];
}

export interface DailyChartTrack extends Track {
  dailyPlays: number;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  customCover?: string;
  tracks: string[];
  isSystem?: boolean;
  ownerId?: string;
  isPublic?: boolean;
  creatorName?: string;
  creatorAvatar?: string;
  savedBy?: string[];
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  covers: string[];
  trackIds: string[];
  year: number;
  releaseDate?: string;
  recordLabel?: string;
  type?: ReleaseType;
  mainArtists?: string[];
}

export interface User {
  id: string;
  username: string;
  password: string;
  displayName: string;
  avatar?: string;
}

export interface AppSettings {
  accentColor: string;
  language: 'English' | 'Russian';
  allowExplicitContent: boolean;
  autoPlay: boolean;
  crossfade: number;
  albumCoverIndexes: Record<string, number>;
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
  CONTEXT = 'CONTEXT',
  ONE = 'ONE',
}

export type ArtistVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ArtistAccount {
  id: string;
  artistName: string;
  username: string;
  password: string; 
  avatar?: string;
  bio?: string;
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
  feat?: string;
  mainArtists?: string[];
  genre?: string;
  fileUrl: string;
  duration: number;
  existingHueq?: string;
  generatedHueq?: string;
  artist?: string;
}

export type ReleaseType = 'Single' | 'Album' | 'EP' | 'Mixtape';

export interface ReleaseRequest {
  id: string;
  artistId: string;
  artistName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'LIVE';
  submissionTime?: string;
  deletionRequested?: boolean;
  title: string;
  type: ReleaseType;
  genre: string;
  label: string;
  covers: string[];
  additionalMainArtists?: string[];
  tracks: DistributionTrack[];
  releaseDate: string;
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