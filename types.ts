export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: number; // in seconds
  url: string; // audio source
  plays: number;
  genre: string; // New field for recommendations
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  customCover?: string; // Base64 or URL
  tracks: string[]; // array of track IDs
  isSystem?: boolean; // e.g. "Liked Songs"
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  cover: string;
  trackIds: string[];
  year: number;
  recordLabel?: string;
}

export interface User {
  id: string;
  username: string;
  password: string; // Stored locally for this prototype
  displayName: string;
  avatar?: string; // Base64
}

export type ViewState = 
  | { type: 'HOME' }
  | { type: 'SEARCH' }
  | { type: 'LIBRARY' }
  | { type: 'PLAYLIST'; id: string }
  | { type: 'ALBUM'; id: string }
  | { type: 'ARTIST'; id: string }
  | { type: 'CHARTS' };

export enum PlayMode {
  OFF = 'OFF',
  CONTEXT = 'CONTEXT', // Repeat Playlist/Album
  ONE = 'ONE', // Repeat One Track
}