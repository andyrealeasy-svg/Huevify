import { Track, Album } from '../types';

// Helper to generate consistent pseudo-random numbers
const seededRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

const GENRES = ["Pop", "Indie Rock", "Hip-Hop", "Electronic", "Jazz"];
const LABELS = ["Huevify Records", "Algorithm Audio", "Binary Bass Inc.", "NullSet Music"];

const SAMPLE_MP3 = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

export const generateInitialData = () => {
  const tracks: Track[] = [];
  const albums: Album[] = [];

  const artists = ["The Algorithms", "Binary Beats", "Null Pointer", "Stack Overflow"];
  
  // Create albums first so we can assign covers
  for (let i = 1; i <= 4; i++) {
    // Generate 3-4 covers per album
    const albumCovers = [
        `https://picsum.photos/300/300?random=${i * 10 + 1}`,
        `https://picsum.photos/300/300?random=${i * 10 + 2}`,
        `https://picsum.photos/300/300?random=${i * 10 + 3}`,
    ];

    albums.push({
      id: `a${i}`,
      title: `Album ${i}`,
      artist: artists[i % artists.length],
      covers: albumCovers,
      trackIds: [], // Will fill later
      year: 2020 + i,
      recordLabel: LABELS[i % LABELS.length]
    });
  }

  // Create 20 mock tracks
  for (let i = 1; i <= 20; i++) {
    const artist = artists[i % artists.length];
    const albumIndex = (i % 4);
    const genre = GENRES[i % GENRES.length];
    
    // Track cover defaults to the first cover of the album
    const defaultCover = albums[albumIndex].covers[0];

    const trackId = `t${i}`;
    
    tracks.push({
      id: trackId,
      title: `Track Number ${i}`,
      artist: artist,
      album: albums[albumIndex].title,
      cover: defaultCover, 
      duration: 180 + Math.floor(seededRandom(i) * 120), // 3 to 5 mins
      url: SAMPLE_MP3,
      plays: Math.floor(seededRandom(i * 100) * 500000),
      genre: genre
    });

    albums[albumIndex].trackIds.push(trackId);
  }

  return { tracks, albums };
};

// Placeholder for future API calls
export const ApiService = {
  getTracks: async (): Promise<Track[]> => {
    return [];
  },
  getAlbums: async (): Promise<Album[]> => {
    return [];
  }
};

export const StorageService = {
  load: <T>(key: string, defaultVal: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultVal;
    } catch {
      return defaultVal;
    }
  },
  save: (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("Storage failed", e);
    }
  }
};