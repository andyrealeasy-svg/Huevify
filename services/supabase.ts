import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ReleaseRequest, ArtistAccount, User, Playlist, DailyChartTrack, ModeratorAccount, ReleaseDraft } from '../types';

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

  async fetchArtistByUsername(username: string): Promise<ArtistAccount | null> {
    if (!supabase) return null;
    try {
      const trimmed = username.trim();
      const { data, error } = await supabase
        .from('artist_accounts')
        .select('*')
        .ilike('username', trimmed)
        .limit(1)
        .maybeSingle();
      if (error || !data) return null;
      return {
        id: data.id,
        artistName: data.artist_name,
        username: data.username,
        password: data.password,
        avatar: data.avatar,
        bio: data.bio,
        status: data.status,
        artistPick: data.artist_pick
      };
    } catch (e) {
      console.warn('Supabase fetchArtistByUsername error:', e);
      return null;
    }
  },

  async saveArtistAccount(account: ArtistAccount): Promise<boolean> {
    if (!supabase) return false;
    try {
      const row = {
        id: account.id,
        artist_name: account.artistName,
        username: account.username.trim(),
        password: account.password,
        avatar: account.avatar || null,
        bio: account.bio || null,
        status: account.status,
        artist_pick: account.artistPick || null
      };
      const { error } = await supabase.from('artist_accounts').upsert(row, { onConflict: 'id' });
      if (error) {
        // Fallback update by username in case of ID discrepancy
        const { error: error2 } = await supabase.from('artist_accounts').update(row).ilike('username', account.username.trim());
        if (error2) {
          console.warn('Supabase saveArtistAccount error:', error2.message);
          return false;
        }
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

  async fetchUserByUsername(username: string): Promise<User | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('username', username.trim())
        .maybeSingle();
      if (error || !data) return null;
      return {
        id: data.id,
        username: data.username,
        password: data.password,
        displayName: data.display_name,
        avatar: data.avatar || undefined
      };
    } catch (e) {
      console.warn('Supabase fetchUserByUsername failed:', e);
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
      if (error) {
        console.warn('Supabase savePlaylist error:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Supabase savePlaylist failed:', e);
      return false;
    }
  },

  async deletePlaylist(playlistId: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
      if (error) {
        console.warn('Supabase deletePlaylist error:', error.message);
        return false;
      }
      return true;
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
        settings: data.settings || null,
        likedTracks: data.liked_tracks || data.settings?.liked_tracks || []
      };
    } catch (e) {
      console.warn('Supabase fetchUserPreferences failed:', e);
      return null;
    }
  },

  async saveUserPreferences(userId: string, prefs: {
    likedAlbumIds?: string[];
    followedArtists?: string[];
    recentlyPlayed?: any[];
    settings?: any;
    likedTracks?: string[];
  }): Promise<boolean> {
    if (!supabase) return false;
    try {
      const row: Record<string, any> = {
        user_id: userId,
        updated_at: new Date().toISOString()
      };
      if (prefs.likedAlbumIds !== undefined) row.liked_album_ids = prefs.likedAlbumIds;
      if (prefs.followedArtists !== undefined) row.followed_artists = prefs.followedArtists;
      if (prefs.recentlyPlayed !== undefined) row.recently_played = prefs.recentlyPlayed;
      if (prefs.settings !== undefined) row.settings = prefs.settings;

      if (prefs.likedTracks !== undefined) {
        row.liked_tracks = prefs.likedTracks;
      }

      let { error } = await supabase.from('user_preferences').upsert(row, { onConflict: 'user_id' });

      // If liked_tracks column does not exist in schema cache (PGRST204), fallback to storing in settings.liked_tracks
      if (error && error.code === 'PGRST204' && row.liked_tracks !== undefined) {
        delete row.liked_tracks;
        row.settings = { ...(row.settings || {}), liked_tracks: prefs.likedTracks };
        const retry = await supabase.from('user_preferences').upsert(row, { onConflict: 'user_id' });
        error = retry.error;
      }

      if (error) {
        console.warn('Supabase saveUserPreferences error:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Supabase saveUserPreferences failed:', e);
      return false;
    }
  },

  // --- DRAFTS ---
  async fetchDrafts(artistId?: string): Promise<ReleaseDraft[] | null> {
    if (!supabase) return null;
    try {
      let query = supabase.from('release_drafts').select('*').order('last_saved', { ascending: false });
      if (artistId && artistId !== 'mod' && artistId !== 'unknown') {
        query = query.eq('artist_id', artistId);
      }
      const { data, error } = await query;
      if (error) {
        console.warn('Supabase fetchDrafts error:', error.message);
        return null;
      }
      return (data || []).map((row: any) => ({
        id: row.id,
        artistId: row.artist_id,
        artistName: row.artist_name || '',
        title: row.title || '',
        type: row.type || 'Single',
        genre: row.genre || 'Pop',
        label: row.label || '',
        covers: row.covers || [],
        additionalMainArtists: row.additional_main_artists || [],
        tracks: row.tracks || [],
        releaseDate: row.release_date || '',
        releaseTime: row.release_time || '',
        releaseMessage: row.release_message || '',
        lastSaved: row.last_saved || row.created_at || new Date().toISOString(),
        step: row.step || 1,
        isEditingOriginalId: row.is_editing_original_id || null
      }));
    } catch (e) {
      console.warn('Supabase fetchDrafts failed:', e);
      return null;
    }
  },

  async saveDraft(draft: ReleaseDraft): Promise<boolean> {
    if (!supabase) return false;
    try {
      const row = {
        id: draft.id,
        artist_id: draft.artistId,
        artist_name: draft.artistName,
        title: draft.title,
        type: draft.type,
        genre: draft.genre,
        label: draft.label,
        covers: draft.covers || [],
        additional_main_artists: draft.additionalMainArtists || [],
        tracks: draft.tracks || [],
        release_date: draft.releaseDate || '',
        release_time: draft.releaseTime || '',
        release_message: draft.releaseMessage || '',
        last_saved: draft.lastSaved || new Date().toISOString(),
        step: draft.step || 1,
        is_editing_original_id: draft.isEditingOriginalId || null
      };
      const { error } = await supabase.from('release_drafts').upsert(row, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase saveDraft error:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Supabase saveDraft failed:', e);
      return false;
    }
  },

  async deleteDraft(draftId: string): Promise<boolean> {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('release_drafts').delete().eq('id', draftId);
      if (error) {
        console.warn('Supabase deleteDraft error:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Supabase deleteDraft failed:', e);
      return false;
    }
  },

  // --- TRACK PLAYS & ANALYTICS ---
  async fetchTrackPlays(): Promise<Record<string, number> | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.from('track_plays').select('track_id, plays');
      if (error) {
        console.warn('Supabase fetchTrackPlays error:', error.message);
        return null;
      }
      const map: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        if (row.track_id) {
          map[row.track_id] = Number(row.plays) || 0;
        }
      });
      return map;
    } catch (e) {
      console.warn('Supabase fetchTrackPlays failed:', e);
      return null;
    }
  },

  async saveTrackPlays(playsMap: Record<string, number>): Promise<boolean> {
    if (!supabase) return false;
    try {
      const entries = Object.entries(playsMap);
      if (entries.length === 0) return true;

      const rows = entries.map(([track_id, plays]) => ({
        track_id,
        plays: Number(plays) || 0,
        updated_at: new Date().toISOString()
      }));

      // Upsert in chunks of 50
      for (let i = 0; i < rows.length; i += 50) {
        const chunk = rows.slice(i, i + 50);
        const { error } = await supabase.from('track_plays').upsert(chunk, { onConflict: 'track_id' });
        if (error) {
          console.warn('Supabase saveTrackPlays chunk error:', error.message);
        }
      }
      return true;
    } catch (e) {
      console.warn('Supabase saveTrackPlays failed:', e);
      return false;
    }
  },

  async incrementTrackPlay(trackId: string, incrementBy: number = 1): Promise<number | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('track_plays')
        .select('plays')
        .eq('track_id', trackId)
        .maybeSingle();

      const current = (data && data.plays !== null && data.plays !== undefined) ? Number(data.plays) : 0;
      const nextPlays = current + incrementBy;

      const { error: upsertErr } = await supabase
        .from('track_plays')
        .upsert({
          track_id: trackId,
          plays: nextPlays,
          updated_at: new Date().toISOString()
        }, { onConflict: 'track_id' });

      if (upsertErr) {
        console.warn('Supabase incrementTrackPlay error:', upsertErr.message);
      }
      return nextPlays;
    } catch (e) {
      console.warn('Supabase incrementTrackPlay failed:', e);
      return null;
    }
  },

  async recordPlayLog(trackId: string, userId: string = 'anonymous', playsCount: number = 1): Promise<number | null> {
    if (!supabase) return null;
    try {
      const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      // 1. Insert timestamped log entry into track_play_logs
      const { error: logErr } = await supabase.from('track_play_logs').insert([{
        id: logId,
        track_id: trackId,
        user_id: userId || 'anonymous',
        plays: playsCount,
        created_at: new Date().toISOString()
      }]);

      if (logErr) {
        console.warn('Supabase recordPlayLog insert error:', logErr.message);
      }

      // 2. Increment total plays in track_plays table
      return await this.incrementTrackPlay(trackId, playsCount);
    } catch (e) {
      console.warn('Supabase recordPlayLog failed:', e);
      return null;
    }
  },

  async fetchDailyPlaysRange(fromISO: string, toISO: string): Promise<Record<string, number> | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('track_play_logs')
        .select('track_id, plays')
        .gte('created_at', fromISO)
        .lt('created_at', toISO);

      if (error) {
        console.warn('Supabase fetchDailyPlaysRange error:', error.message);
        return null;
      }

      const map: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        if (row.track_id) {
          map[row.track_id] = (map[row.track_id] || 0) + (Number(row.plays) || 0);
        }
      });
      return map;
    } catch (e) {
      console.warn('Supabase fetchDailyPlaysRange failed:', e);
      return null;
    }
  },

  async fetchDailyPlaysSince(sinceISO: string): Promise<Record<string, number> | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from('track_play_logs')
        .select('track_id, plays')
        .gte('created_at', sinceISO);

      if (error) {
        console.warn('Supabase fetchDailyPlaysSince error:', error.message);
        return null;
      }

      const map: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        if (row.track_id) {
          map[row.track_id] = (map[row.track_id] || 0) + (Number(row.plays) || 0);
        }
      });
      return map;
    } catch (e) {
      console.warn('Supabase fetchDailyPlaysSince failed:', e);
      return null;
    }
  },

  async fetchDailyPlays24h(): Promise<Record<string, number> | null> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return this.fetchDailyPlaysSince(twentyFourHoursAgo);
  },

  // --- DAILY CHART & SNAPSHOTS ---
  async fetchDailyChart(): Promise<{ chart: DailyChartTrack[]; snapshot: Record<string, number>; lastUpdate: string | null } | null> {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.from('daily_chart').select('*');
      if (error) {
        console.warn('Supabase fetchDailyChart error:', error.message);
        return null;
      }
      if (!data || data.length === 0) return null;

      const chart: DailyChartTrack[] = [];
      let snapshot: Record<string, number> = {};
      let lastUpdate: string | null = null;

      data.forEach((row: any) => {
        if (row.track_id === '__META__') {
          snapshot = row.track_data?.snapshot || {};
          lastUpdate = row.track_data?.lastUpdate || null;
        } else if (row.track_data) {
          chart.push({
            ...row.track_data,
            dailyPlays: Number(row.daily_plays) || Number(row.track_data?.dailyPlays) || 0
          });
        }
      });

      return { chart, snapshot, lastUpdate };
    } catch (e) {
      console.warn('Supabase fetchDailyChart failed:', e);
      return null;
    }
  },

  async saveDailyChart(chart: DailyChartTrack[], snapshot: Record<string, number>, lastUpdate: string | null): Promise<boolean> {
    if (!supabase) return false;
    try {
      // Clear out all previous chart rows first to avoid lingering old or phantom records
      await supabase.from('daily_chart').delete().neq('track_id', '___NEVER_MATCH___');

      const rows = chart.map(t => ({
        track_id: t.id,
        track_data: t,
        daily_plays: Number(t.dailyPlays) || 0,
        updated_at: new Date().toISOString()
      }));

      rows.push({
        track_id: '__META__',
        track_data: { snapshot, lastUpdate } as any,
        daily_plays: 0,
        updated_at: new Date().toISOString()
      });

      const { error } = await supabase.from('daily_chart').upsert(rows, { onConflict: 'track_id' });
      if (error) {
        console.warn('Supabase saveDailyChart error:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Supabase saveDailyChart failed:', e);
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'release_drafts' }, () => onUpdate('release_drafts'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'track_plays' }, () => onUpdate('track_plays'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_chart' }, () => onUpdate('daily_chart'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'track_play_logs' }, () => onUpdate('track_play_logs'))
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
    let { data, error } = await supabase.storage.from(bucketName).upload(filePath, blob, {
      contentType: mimeType || 'application/octet-stream',
      cacheControl: '31536000',
      upsert: true
    });

    if (error && (error.message?.toLowerCase().includes('bucket') || (error as any).status === 404)) {
      try {
        await supabase.storage.createBucket(bucketName, { public: true });
        const retry = await supabase.storage.from(bucketName).upload(filePath, blob, {
          contentType: mimeType || 'application/octet-stream',
          cacheControl: '31536000',
          upsert: true
        });
        error = retry.error;
      } catch (e) {
        console.warn('Auto create storage bucket failed:', e);
      }
    }

    if (error) {
      console.warn(`Supabase storage upload failed for ${filePath}:`, error.message);
      return null;
    }

    const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return publicData.publicUrl;
  }
};
