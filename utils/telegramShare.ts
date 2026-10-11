/**
 * Telegram Mini App Deep Linking & Sharing Utility for Huevify
 * Bot: https://t.me/HuevifyBot
 */

export const TELEGRAM_BOT_USERNAME = 'HuevifyBot';
export const TELEGRAM_BOT_URL = 'https://t.me/HuevifyBot';

/**
 * Safely encode start parameter for Telegram bot deep links.
 * Telegram startapp parameter only allows [a-zA-Z0-9_-].
 */
export const encodeTelegramStartParam = (type: 'rel' | 'art', rawId: string): string => {
  if (!rawId) return type;
  const trimmed = rawId.trim();

  // If rawId only contains [a-zA-Z0-9_-] and is not excessively long
  if (/^[a-zA-Z0-9_-]{1,48}$/.test(trimmed)) {
    return `${type}_${trimmed}`;
  }

  // Otherwise, use URL-safe Base64 encoding
  try {
    const utf8Bytes = new TextEncoder().encode(trimmed);
    let binary = '';
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    const b64 = btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return `${type}b_${b64}`;
  } catch (err) {
    // Fallback safe sanitized string
    const sanitized = trimmed.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48);
    return `${type}_${sanitized}`;
  }
};

/**
 * Safely decode Telegram startapp parameter back into view type and target ID.
 */
export const decodeTelegramStartParam = (param: string): { type: 'ALBUM' | 'ARTIST'; id: string } | null => {
  if (!param) return null;
  const clean = param.trim();

  // Release / Album
  if (clean.startsWith('rel_') || clean.startsWith('album_')) {
    const id = clean.replace(/^(rel_|album_)/, '');
    return { type: 'ALBUM', id };
  }

  if (clean.startsWith('relb_') || clean.startsWith('albumb_')) {
    const encoded = clean.replace(/^(relb_|albumb_)/, '').replace(/-/g, '+').replace(/_/g, '/');
    try {
      const binary = atob(encoded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const decoded = new TextDecoder().decode(bytes);
      return { type: 'ALBUM', id: decoded };
    } catch {
      return { type: 'ALBUM', id: encoded };
    }
  }

  // Artist
  if (clean.startsWith('art_') || clean.startsWith('artist_')) {
    const raw = clean.replace(/^(art_|artist_)/, '');
    return { type: 'ARTIST', id: raw };
  }

  if (clean.startsWith('artb_') || clean.startsWith('artistb_')) {
    const encoded = clean.replace(/^(artb_|artistb_)/, '').replace(/-/g, '+').replace(/_/g, '/');
    try {
      const binary = atob(encoded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const decoded = new TextDecoder().decode(bytes);
      return { type: 'ARTIST', id: decoded };
    } catch {
      return { type: 'ARTIST', id: encoded };
    }
  }

  return null;
};

/**
 * Extract Telegram start_param from window.Telegram.WebApp or query/hash params
 */
export const getTelegramStartParam = (): string | null => {
  if (typeof window === 'undefined') return null;

  // 1. Telegram WebApp object
  const tgWebApp = (window as any).Telegram?.WebApp;
  const tgStartParam = tgWebApp?.initDataUnsafe?.start_param;
  if (tgStartParam && typeof tgStartParam === 'string') {
    return tgStartParam;
  }

  // 2. Standard Search Params
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const searchVal = urlParams.get('tgWebAppStartParam') || 
                      urlParams.get('startapp') || 
                      urlParams.get('start_param');
    if (searchVal) return searchVal;

    // Check direct album/release param in search
    const directAlbum = urlParams.get('release') || urlParams.get('album');
    if (directAlbum) return `rel_${directAlbum}`;
    const directArtist = urlParams.get('artist');
    if (directArtist) return `art_${directArtist}`;
  } catch (e) {
    console.warn('Error reading search params:', e);
  }

  // 3. Hash fragment (Telegram WebApp often passes parameters in location.hash)
  try {
    if (window.location.hash) {
      const hashStr = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
      const hashParams = new URLSearchParams(hashStr);
      const hashVal = hashParams.get('tgWebAppStartParam') || 
                      hashParams.get('startapp') || 
                      hashParams.get('start_param');
      if (hashVal) return hashVal;

      // Sometimes tgWebAppData is inside hash and contains start_param
      const tgWebAppData = hashParams.get('tgWebAppData');
      if (tgWebAppData) {
        const dataParams = new URLSearchParams(decodeURIComponent(tgWebAppData));
        const dataVal = dataParams.get('start_param') || dataParams.get('tgWebAppStartParam');
        if (dataVal) return dataVal;
      }
    }
  } catch (e) {
    console.warn('Error reading hash params:', e);
  }

  return null;
};

/**
 * Build share data for an album/release
 */
export const buildReleaseShareData = (album: { id: string; title: string; artist: string }) => {
  const param = encodeTelegramStartParam('rel', album.id);
  const botLink = `${TELEGRAM_BOT_URL}?startapp=${param}`;
  // Exact user specified text:
  // Послушай релиз «<название релиза>» от <артист> в Huevify: <ссылка>
  const fullText = `Послушай релиз «${album.title}» от ${album.artist} в Huevify: ${botLink}`;
  const caption = `Послушай релиз «${album.title}» от ${album.artist} в Huevify:`;

  return {
    link: botLink,
    fullText,
    caption,
    title: album.title,
    artist: album.artist
  };
};

/**
 * Build share data for an artist
 */
export const buildArtistShareData = (artistName: string) => {
  const param = encodeTelegramStartParam('art', artistName);
  const botLink = `${TELEGRAM_BOT_URL}?startapp=${param}`;
  const fullText = `Послушай треки и релизы ${artistName} в Huevify: ${botLink}`;
  const caption = `Послушай треки и релизы ${artistName} в Huevify:`;

  return {
    link: botLink,
    fullText,
    caption,
    title: artistName,
    artist: 'Артист'
  };
};

/**
 * Open Telegram share dialog
 */
export const openTelegramShareDialog = (shareUrl: string, captionText: string) => {
  const tgWebApp = (window as any).Telegram?.WebApp;
  const shareTgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(captionText)}`;

  if (tgWebApp?.openTelegramLink) {
    try {
      tgWebApp.openTelegramLink(shareTgUrl);
      return true;
    } catch (err) {
      console.warn('Failed to open via openTelegramLink, opening window:', err);
    }
  }

  // Fallback: open in new tab
  try {
    window.open(shareTgUrl, '_blank', 'noopener,noreferrer');
    return true;
  } catch (e) {
    window.location.href = shareTgUrl;
    return true;
  }
};
