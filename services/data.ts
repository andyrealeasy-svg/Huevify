import { Track, Album, Playlist } from '../types.ts';

// Helper to generate consistent pseudo-random numbers
const seededRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

const COVERS = [
  "https://picsum.photos/300/300?random=1",
  "https://picsum.photos/300/300?random=2",
  "https://picsum.photos/300/300?random=3",
  "https://picsum.photos/300/300?random=4",
  "https://picsum.photos/300/300?random=5",
];

const GENRES = ["Pop", "Indie Rock", "Hip-Hop", "Electronic", "Jazz"];
const LABELS = ["Huevify Records", "Algorithm Audio", "Binary Bass Inc.", "NullSet Music"];

const SAMPLE_MP3 = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

export const generateInitialData = () => {
  const tracks: Track[] = [];
  const albums: Album[] = [];

  const artists = ["The Algorithms", "Binary Beats", "Null Pointer", "Stack Overflow"];
  
  // Create 20 mock tracks
  for (let i = 1; i <= 20; i++) {
    const artist = artists[i % artists.length];
    const genre = GENRES[i % GENRES.length];
    
    tracks.push({
      id: `t${i}`,
      title: `Track Number ${i}`,
      artist: artist,
      album: `Album ${(i % 4) + 1}`,
      cover: COVERS[i % 5],
      duration: 180 + Math.floor(seededRandom(i) * 120), // 3 to 5 mins
      url: SAMPLE_MP3,
      plays: Math.floor(seededRandom(i * 100) * 500000),
      genre: genre
    });
  }

  // Create albums grouping tracks
  for (let i = 1; i <= 4; i++) {
    const albumTracks = tracks.filter(t => t.album === `Album ${i}`).map(t => t.id);
    albums.push({
      id: `a${i}`,
      title: `Album ${i}`,
      artist: artists[i % artists.length],
      cover: COVERS[i],
      trackIds: albumTracks,
      year: 2020 + i,
      recordLabel: LABELS[i % LABELS.length]
    });
  }

  return { tracks, albums };
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