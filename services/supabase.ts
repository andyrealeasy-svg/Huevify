import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ReleaseRequest, ArtistAccount, User, Playlist, DailyChartTrack, ModeratorAccount } from '../types';

const metaEnv = (import.meta as any).env || {};
const supabaseUrl = (metaEnv.VITE_SUPABASE_URL || 'https://kzcxbokjnbafaozcmjjg.supabase.co') as string | undefined;
const supabaseAnonKey = (metaEnv.VITE_SUPABASE_ANON_KEY || 'sb_publishable_IQtoE_Ap1JPeJ-vZJF6NXA_4hJTg0wT') as string | undefined;

export const isSupabaseConfigured = (): boolean => {
  return !!(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.trim() !== '' &&
    supabaseAnonKey.trim() !== '' &&
    supabaseUrl.startsWith('http')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export const SupabaseService = {
  isConfigured: isSupabaseConfigured,

  // --- RELEASES ---
  async fetchReleases(): Promise<ReleaseRequest[] | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.from('releases').select('*');
      if (error) {
        console.warn('Supabase fetchReleases error:', error.message);
        return null;
      }
      return (data || []).map((row: any) => ({
        id: row.id,
        artistId: row.artist_id,
        artistName: row.artist_name,
        status: row.status,
        submissionTime: row.submission_time,
        deletionRequested: row.deletion_requested,
        title: row.title,
        type: row.type,
        genre: row.genre,
        label: row.label,
        covers: row.covers || [],
        additionalMainArtists: row.additional_main_artists || [],
        tracks: row.tracks || [],
        releaseDate: row.release_date,
        releaseMessage: row.release_message
      }));
    } catch (e) {
      console.warn('Supabase fetchReleases failed:', e);
      return null;
    }
  },

  async saveRelease(release: ReleaseRequest): Promise<boolean> {
    if (!supabase) return false;
    try {
      const row = {
        id: release.id,
        artist_id: release.artistId,
        artist_name: release.artistName,
        status: release.status,
        submission_time: release.submissionTime,
        deletion_requested: release.deletionRequested || false,
        title: release.title,
        type: release.type,
        genre: release.genre,
        label: release.label,
        covers: release.covers,
        additional_main_artists: release.additionalMainArtists || [],
        tracks: release.tracks,
        release_date: release.releaseDate,
        release_message: release.releaseMessage || ''
      };
      const { error } = await supabase.from('releases').upsert(row, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase saveRelease error:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Supabase saveRelease failed:', e);
      return false;
    }
  },

  async deleteRelease(releaseId: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('releases').delete().eq('id', releaseId);
      if (error) {
        console.warn('Supabase deleteRelease error:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Supabase deleteRelease failed:', e);
      return false;
    }
  },

  // --- ARTISTS ---
  async fetchArtistAccounts(): Promise<ArtistAccount[] | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.from('artist_accounts').select('*');
      if (error) {
        console.warn('Supabase fetchArtistAccounts error:', error.message);
        return null;
      }
      return (data || []).map((row: any) => ({
        id: row.id,
        artistName: row.artist_name,
        username: row.username,
        password: row.password,
        avatar: row.avatar,
        bio: row.bio,
        status: row.status,
        artistPick: row.artist_pick
      }));
    } catch (e) {
      console.warn('Supabase fetchArtistAccounts failed:', e);
      return null;
    }
  },

  async saveArtistAccount(account: ArtistAccount): Promise<boolean> {
    if (!supabase) return false;
    try {
      const row = {
        id: account.id,
        artist_name: account.artistName,
        username: account.username,
        password: account.password,
        avatar: account.avatar || null,
        bio: account.bio || null,
        status: account.status,
        artist_pick: account.artistPick || null
      };
      const { error } = await supabase.from('artist_accounts').upsert(row, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase saveArtistAccount error:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Supabase saveArtistAccount failed:', e);
      return false;
    }
  },

  async deleteArtistAccount(id: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('artist_accounts').delete().eq('id', id);
      return !error;
    } catch (e) {
      console.warn('Supabase deleteArtistAccount failed:', e);
      return false;
    }
  },

  // --- USERS ---
  async fetchUsers(): Promise<User[] | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (error) {
        console.warn('Supabase fetchUsers error:', error.message);
        return null;
      }
      return (data || []).map((row: any) => ({
        id: row.id,
        username: row.username,
        password: row.password,
        displayName: row.display_name,
        avatar: row.avatar
      }));
    } catch (e) {
      console.warn('Supabase fetchUsers failed:', e);
      return null;
    }
  },

  async saveUser(user: User): Promise<boolean> {
    if (!supabase) return false;
    try {
      const row = {
        id: user.id,
        username: user.username,
        password: user.password,
        display_name: user.displayName,
        avatar: user.avatar || null
      };
      const { error } = await supabase.from('users').upsert(row, { onConflict: 'id' });
      return !error;
    } catch (e) {
      console.warn('Supabase saveUser failed:', e);
      return false;
    }
  },

  // --- MODERATOR ACCOUNTS ---
  async fetchModeratorAccount(): Promise<ModeratorAccount | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.from('moderator_accounts').select('*').limit(1);
      if (error) {
        console.warn('Supabase fetchModeratorAccount error:', error.message);
        return null;
      }
      if (data && data.length > 0) {
        return {
          username: data[0].username,
          password: data[0].password
        };
      }
      return null;
    } catch (e) {
      console.warn('Supabase fetchModeratorAccount failed:', e);
      return null;
    }
  },

  async saveModeratorAccount(account: ModeratorAccount): Promise<boolean> {
    if (!supabase) return false;
    try {
      const row = {
        username: account.username,
        password: account.password,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('moderator_accounts').upsert(row, { onConflict: 'username' });
      if (error) {
        console.warn('Supabase saveModeratorAccount error:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Supabase saveModeratorAccount failed:', e);
      return false;
    }
  },

  async deleteModeratorAccount(username: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('moderator_accounts').delete().eq('username', username);
      return !error;
    } catch (e) {
      return false;
    }
  },

  // --- PLAYLISTS ---
  async fetchPlaylists(): Promise<Playlist[] | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.from('playlists').select('*');
      if (error) {
        console.warn('Supabase fetchPlaylists error:', error.message);
        return null;
      }
      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        customCover: row.custom_cover,
        tracks: row.tracks || [],
        isSystem: row.is_system,
        ownerId: row.owner_id,
        isPublic: row.is_public,
        creatorName: row.creator_name,
        creatorAvatar: row.creator_avatar,
        savedBy: row.saved_by || []
      }));
    } catch (e) {
      console.warn('Supabase fetchPlaylists failed:', e);
      return null;
    }
  },

  async savePlaylist(playlist: Playlist): Promise<boolean> {
    if (!supabase) return false;
    try {
      const row = {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description || null,
        custom_cover: playlist.customCover || null,
        tracks: playlist.tracks || [],
        is_system: playlist.isSystem || false,
        owner_id: playlist.ownerId || null,
        is_public: playlist.isPublic || false,
        creator_name: playlist.creatorName || null,
        creator_avatar: playlist.creatorAvatar || null,
        saved_by: playlist.savedBy || []
      };
      const { error } = await supabase.from('playlists').upsert(row, { onConflict: 'id' });
      return !error;
    } catch (e) {
      console.warn('Supabase savePlaylist failed:', e);
      return false;
    }
  },

  async deletePlaylist(playlistId: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
      return !error;
    } catch (e) {
      console.warn('Supabase deletePlaylist failed:', e);
      return false;
    }
  },

  // --- USER PREFERENCES ---
  async fetchUserPreferences(userId: string): Promise<any | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (error || !data) return null;
      return {
        likedAlbumIds: data.liked_album_ids || [],
        followedArtists: data.followed_artists || [],
        recentlyPlayed: data.recently_played || [],
        settings: data.settings || null
      };
    } catch (e) {
      return null;
    }
  },

  async saveUserPreferences(userId: string, prefs: {
    likedAlbumIds?: string[];
    followedArtists?: string[];
    recentlyPlayed?: any[];
    settings?: any;
  }): Promise<boolean> {
    if (!supabase) return false;
    try {
      const row = {
        user_id: userId,
        liked_album_ids: prefs.likedAlbumIds,
        followed_artists: prefs.followedArtists,
        recently_played: prefs.recentlyPlayed,
        settings: prefs.settings,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('user_preferences').upsert(row, { onConflict: 'user_id' });
      return !error;
    } catch (e) {
      return false;
    }
  },

  // --- REALTIME SUBSCRIPTION ---
  subscribeToChanges(onUpdate: (table: string) => void): (() => void) | null {
    if (!supabase) return null;
    try {
      const channel = supabase
        .channel('huevify_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'releases' }, () => onUpdate('releases'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'playlists' }, () => onUpdate('playlists'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'artist_accounts' }, () => onUpdate('artist_accounts'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'moderator_accounts' }, () => onUpdate('moderator_accounts'))
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (e) {
      console.warn('Failed to subscribe to Supabase realtime changes:', e);
      return null;
    }
  },

  // --- STORAGE (AUDIO, COVERS, AVATARS, PLAYLISTS) ---
  async checkStorageBucket(): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { data, error } = await supabase.storage.getBucket('media');
      if (error || !data) return false;
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Uploads an audio track, image cover, avatar, or playlist cover to Supabase Storage ('media' bucket).
   * Accepts a File, Blob, or base64 data URL string.
   * If already a remote URL (http/https), returns it as-is.
   * Returns the public CDN URL of the uploaded asset, or null if upload fails.
   */
  async uploadMedia(
    source: File | Blob | string,
    folder: 'tracks' | 'covers' | 'avatars' | 'playlists',
    fileNameHint?: string
  ): Promise<string | null> {
    if (!supabase) return null;

    try {
      // If already a remote cloud URL, keep it
      if (typeof source === 'string') {
        if (source.startsWith('http://') || source.startsWith('https://')) {
          return source;
        }
        if (source.startsWith('data:')) {
          const converted = this.dataUrlToBlob(source);
          if (!converted) return null;
          return await this.uploadBlob(converted.blob, folder, fileNameHint, converted.mimeType);
        }
        return null;
      }

      if (source instanceof Blob) {
        const mimeType = source.type || ((source as any).name?.endsWith('.mp3') ? 'audio/mpeg' : 'application/octet-stream');
        return await this.uploadBlob(source, folder, fileNameHint || (source as any).name, mimeType);
      }

      return null;
    } catch (err) {
      console.warn(`Supabase Storage upload to ${folder} error:`, err);
      return null;
    }
  },

  dataUrlToBlob(dataUrl: string): { blob: Blob; mimeType: string } | null {
    try {
      const parts = dataUrl.split(',');
      if (parts.length !== 2) return null;
      const match = parts[0].match(/:(.*?);/);
      const mimeType = match ? match[1] : 'application/octet-stream';
      const binary = atob(parts[1]);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      return { blob: new Blob([array], { type: mimeType }), mimeType };
    } catch (e) {
      console.warn('dataUrlToBlob conversion failed:', e);
      return null;
    }
  },

  async uploadBlob(
    blob: Blob,
    folder: 'tracks' | 'covers' | 'avatars' | 'playlists',
    fileNameHint?: string,
    mimeType?: string
  ): Promise<string | null> {
    if (!supabase) return null;

    // Deduce file extension
    let ext = '';
    if (fileNameHint && fileNameHint.includes('.')) {
      ext = '.' + fileNameHint.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
    } else if (mimeType) {
      if (mimeType.includes('mpeg') || mimeType.includes('mp3')) ext = '.mp3';
      else if (mimeType.includes('wav')) ext = '.wav';
      else if (mimeType.includes('ogg')) ext = '.ogg';
      else if (mimeType.includes('flac')) ext = '.flac';
      else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
      else if (mimeType.includes('png')) ext = '.png';
      else if (mimeType.includes('webp')) ext = '.webp';
      else if (mimeType.includes('gif')) ext = '.gif';
    }

    // Clean base name
    const rawName = fileNameHint ? fileNameHint.replace(/\.[^/.]+$/, "") : 'file';
    const cleanName = rawName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 32);
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const filePath = `${folder}/${cleanName || 'item'}_${uniqueId}${ext}`;

    const bucketName = 'media';
    const { data, error } = await supabase.storage.from(bucketName).upload(filePath, blob, {
      contentType: mimeType || 'application/octet-stream',
      cacheControl: '31536000',
      upsert: true
    });

    if (error) {
      console.warn(`Supabase storage upload failed for ${filePath}:`, error.message);
      return null;
    }

    const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return publicData.publicUrl;
  }
};
