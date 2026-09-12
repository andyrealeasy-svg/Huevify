/**
 * Dynamic Cover Color Extractor for Huevify
 * Extracts the dominant / atmospheric color palette from track covers
 * to generate Spotify-style adaptive gradients for full-screen players.
 */

export interface ExtractedColors {
  primary: string;       // e.g. "rgb(185, 95, 140)"
  dark: string;          // e.g. "rgb(25, 15, 20)"
  gradient: string;      // CSS background gradient
  glow: string;          // Radial glow CSS
  rgb: [number, number, number];
}

// In-memory cache for instant lookups on subsequent plays
const colorCache = new Map<string, ExtractedColors>();

export function getCachedColor(imageUrl: string): ExtractedColors | null {
  return colorCache.get(imageUrl) || null;
}

// Refined default dark slate fallback
const DEFAULT_PALETTE: ExtractedColors = {
  primary: 'rgb(55, 65, 81)',
  dark: 'rgb(15, 18, 25)',
  gradient: 'linear-gradient(180deg, #2b3040 0%, #171b24 45%, #0f1117 75%, #08090c 100%)',
  glow: 'radial-gradient(circle at 50% 35%, rgba(65, 75, 95, 0.45) 0%, transparent 70%)',
  rgb: [43, 48, 64]
};

/**
 * Generate a deterministic pleasant fallback palette based on a text string
 */
export function getHashPalette(seed: string): ExtractedColors {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  // Deep vibrant tone
  const s = 55; // 55% saturation
  const l = 32; // 32% lightness for readability

  // Convert HSL to RGB
  const c = (1 - Math.abs(2 * (l / 100) - 1)) * (s / 100);
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l / 100 - c / 2;
  let r = 0, g = 0, b = 0;
  if (hue < 60) { r = c; g = x; b = 0; }
  else if (hue < 120) { r = x; g = c; b = 0; }
  else if (hue < 180) { r = 0; g = c; b = x; }
  else if (hue < 240) { r = 0; g = x; b = c; }
  else if (hue < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const targetR = Math.round((r + m) * 255);
  const targetG = Math.round((g + m) * 255);
  const targetB = Math.round((b + m) * 255);

  return buildPalette(targetR, targetG, targetB);
}

function buildPalette(r: number, g: number, b: number): ExtractedColors {
  // Balance brightness so white text above it is perfectly readable
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (lum > 145) {
    const factor = 145 / lum;
    r = Math.round(r * factor);
    g = Math.round(g * factor);
    b = Math.round(b * factor);
  } else if (lum < 35) {
    const boost = 35 / Math.max(lum, 10);
    r = Math.min(255, Math.round(r * boost));
    g = Math.min(255, Math.round(g * boost));
    b = Math.min(255, Math.round(b * boost));
  }

  const rMid = Math.round(r * 0.45);
  const gMid = Math.round(g * 0.45);
  const bMid = Math.round(b * 0.45);

  const rDark = Math.round(r * 0.18);
  const gDark = Math.round(g * 0.18);
  const bDark = Math.round(b * 0.18);

  const gradient = `linear-gradient(180deg, rgb(${r}, ${g}, ${b}) 0%, rgb(${rMid}, ${gMid}, ${bMid}) 42%, rgb(${rDark}, ${gDark}, ${bDark}) 75%, #09090b 100%)`;
  const glow = `radial-gradient(circle at 50% 32%, rgba(${r}, ${g}, ${b}, 0.5) 0%, transparent 68%)`;

  return {
    primary: `rgb(${r}, ${g}, ${b})`,
    dark: `rgb(${rDark}, ${gDark}, ${bDark})`,
    gradient,
    glow,
    rgb: [r, g, b]
  };
}

function processImageElement(img: HTMLImageElement): ExtractedColors {
  const canvas = document.createElement('canvas');
  const size = 48;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return DEFAULT_PALETTE;

  ctx.drawImage(img, 0, 0, size, size);
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  // Quantization bins: 16 bins per channel (4 bits per channel: 0..15)
  // Maps to 4096 total color cells
  const bins: Map<number, { count: number; totalWeight: number; sumR: number; sumG: number; sumB: number; maxSat: number }> = new Map();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Ignore transparent pixels
    if (a < 128) continue;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const sat = max === 0 ? 0 : delta / max;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Filter out extreme near-whites or pure pitch black when searching for the cover's vibe
    if (lum > 0.94 && sat < 0.15) continue;
    if (lum < 0.06) continue;

    // Weight vibrant pixels higher
    const weight = 1 + sat * 3.5 + (1 - Math.abs(lum - 0.5) * 1.8);

    const rBin = r >> 4;
    const gBin = g >> 4;
    const bBin = b >> 4;
    const key = (rBin << 8) | (gBin << 4) | bBin;

    const existing = bins.get(key);
    if (existing) {
      existing.count += 1;
      existing.totalWeight += weight;
      existing.sumR += r;
      existing.sumG += g;
      existing.sumB += b;
      if (sat > existing.maxSat) existing.maxSat = sat;
    } else {
      bins.set(key, {
        count: 1,
        totalWeight: weight,
        sumR: r,
        sumG: g,
        sumB: b,
        maxSat: sat
      });
    }
  }

  if (bins.size === 0) return DEFAULT_PALETTE;

  // Pick the winning bin with highest weighted score
  let bestBin: { count: number; sumR: number; sumG: number; sumB: number } | null = null;
  let highestScore = -1;

  for (const bin of bins.values()) {
    // Score heavily favors saturation while accounting for prevalence
    const score = bin.totalWeight * (1 + bin.maxSat * 2.2);
    if (score > highestScore) {
      highestScore = score;
      bestBin = bin;
    }
  }

  if (!bestBin || bestBin.count === 0) return DEFAULT_PALETTE;

  const targetR = Math.round(bestBin.sumR / bestBin.count);
  const targetG = Math.round(bestBin.sumG / bestBin.count);
  const targetB = Math.round(bestBin.sumB / bestBin.count);

  return buildPalette(targetR, targetG, targetB);
}

async function tryFetchAsBlob(imageUrl: string): Promise<ExtractedColors> {
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const palette = processImageElement(img);
          URL.revokeObjectURL(blobUrl);
          resolve(palette);
        } catch (e) {
          URL.revokeObjectURL(blobUrl);
          reject(e);
        }
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(blobUrl);
        reject(e);
      };
      img.src = blobUrl;
    });
  } catch {
    return DEFAULT_PALETTE;
  }
}

/**
 * Extract dominant vibrant palette from an image URL.
 * Includes caching, CORS handling, fallback blobs, and title-based seed fallback.
 */
export async function extractColorFromImage(imageUrl: string, fallbackSeed = ''): Promise<ExtractedColors> {
  if (!imageUrl) {
    return fallbackSeed ? getHashPalette(fallbackSeed) : DEFAULT_PALETTE;
  }

  if (colorCache.has(imageUrl)) {
    return colorCache.get(imageUrl)!;
  }

  return new Promise((resolve) => {
    // Timeout safeguard: 1.5s max
    const timeout = setTimeout(() => {
      const fallback = fallbackSeed ? getHashPalette(fallbackSeed) : DEFAULT_PALETTE;
      colorCache.set(imageUrl, fallback);
      resolve(fallback);
    }, 1500);

    const finish = (palette: ExtractedColors) => {
      clearTimeout(timeout);
      colorCache.set(imageUrl, palette);
      resolve(palette);
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const palette = processImageElement(img);
        finish(palette);
      } catch (err) {
        tryFetchAsBlob(imageUrl)
          .then(finish)
          .catch(() => finish(fallbackSeed ? getHashPalette(fallbackSeed) : DEFAULT_PALETTE));
      }
    };

    img.onerror = () => {
      tryFetchAsBlob(imageUrl)
        .then(finish)
        .catch(() => finish(fallbackSeed ? getHashPalette(fallbackSeed) : DEFAULT_PALETTE));
    };

    img.src = imageUrl;
  });
}
