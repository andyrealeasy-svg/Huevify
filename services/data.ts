import { Track, Album } from '../types';

export const generateInitialData = (): { tracks: Track[]; albums: Album[] } => {
  return { tracks: [], albums: [] };
};

export { StorageService } from './storage';

