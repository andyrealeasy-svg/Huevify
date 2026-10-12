/**
 * Dynamic Cover Color Extractor for Huevify
 * Extracts the dominant / atmospheric color palette from track covers
 * to generate Spotify-style adaptive gradients for full-screen players.
 */

export interface ExtractedColors {
  primary: string;       // Dominant vibrant tone, e.g. "rgb(185, 95, 140)"
  dark: string;          // e.g. "rgb(25, 15, 20)"
  gradient: string;      // CSS background gradient
  glow: string;          // Radial glow CSS
  rgb: [number, number, number];
  backgroundColor?: string; // Specific background color of cover artwork, e.g. "rgb(35, 40, 52)"
  backgroundRgb?: [number, number, number];
  backgroundGradient?: string; // Adaptive gradient matching the cover background
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
  rgb: [43, 48, 64],
  backgroundColor: 'rgb(35, 40, 52)',
  backgroundRgb: [35, 40, 52],
  backgroundGradient: 'linear-gradient(180deg, #232834 0%, rgba(25, 30, 42, 0.6) 40%, rgba(18, 18, 18, 0.95) 75%, #121212 100%)'
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

function buildPalette(
  r: number, 
  g: number, 
  b: number, 
  bgR?: number, 
  bgG?: number, 
  bgB?: number
): ExtractedColors {
  // Balance brightness so white text above it is perfectly readable
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  let balancedR = r;
  let balancedG = g;
  let balancedB = b;

  if (lum > 145) {
    const factor = 145 / lum;
    balancedR = Math.round(r * factor);
    balancedG = Math.round(g * factor);
    balancedB = Math.round(b * factor);
  } else if (lum < 35) {
    const boost = 35 / Math.max(lum, 10);
    balancedR = Math.min(255, Math.round(r * boost));
    balancedG = Math.min(255, Math.round(g * boost));
    balancedB = Math.min(255, Math.round(b * boost));
  }

  const rMid = Math.round(balancedR * 0.45);
  const gMid = Math.round(balancedG * 0.45);
  const bMid = Math.round(balancedB * 0.45);

  const rDark = Math.round(balancedR * 0.18);
  const gDark = Math.round(balancedG * 0.18);
  const bDark = Math.round(balancedB * 0.18);

  const gradient = `linear-gradient(180deg, rgb(${balancedR}, ${balancedG}, ${balancedB}) 0%, rgb(${rMid}, ${gMid}, ${bMid}) 42%, rgb(${rDark}, ${gDark}, ${bDark}) 75%, #09090b 100%)`;
  const glow = `radial-gradient(circle at 50% 32%, rgba(${balancedR}, ${balancedG}, ${balancedB}, 0.55) 0%, transparent 68%)`;

  // Cover background tone calculation
  let finalBgR = bgR !== undefined ? bgR : balancedR;
  let finalBgG = bgG !== undefined ? bgG : balancedG;
  let finalBgB = bgB !== undefined ? bgB : balancedB;

  // Harmonize background luminance for interface readability
  const bgLum = 0.299 * finalBgR + 0.587 * finalBgG + 0.114 * finalBgB;
  if (bgLum > 135) {
    const factor = 135 / bgLum;
    finalBgR = Math.round(finalBgR * factor);
    finalBgG = Math.round(finalBgG * factor);
    finalBgB = Math.round(finalBgB * factor);
  } else if (bgLum < 24) {
    const boost = 24 / Math.max(bgLum, 8);
    finalBgR = Math.min(255, Math.round(finalBgR * boost));
    finalBgG = Math.min(255, Math.round(finalBgG * boost));
    finalBgB = Math.min(255, Math.round(finalBgB * boost));
  }

  const bgMidR = Math.round(finalBgR * 0.48);
  const bgMidG = Math.round(finalBgG * 0.48);
  const bgMidB = Math.round(finalBgB * 0.48);

  const backgroundGradient = `linear-gradient(180deg, rgb(${finalBgR}, ${finalBgG}, ${finalBgB}) 0%, rgba(${bgMidR}, ${bgMidG}, ${bgMidB}, 0.7) 28%, rgba(${bgMidR}, ${bgMidG}, ${bgMidB}, 0.35) 50%, rgba(18, 18, 18, 0.8) 72%, #121212 95%, #121212 100%)`;

  return {
    primary: `rgb(${balancedR}, ${balancedG}, ${balancedB})`,
    dark: `rgb(${rDark}, ${gDark}, ${bDark})`,
    gradient,
    glow,
    rgb: [balancedR, balancedG, balancedB],
    backgroundColor: `rgb(${finalBgR}, ${finalBgG}, ${finalBgB})`,
    backgroundRgb: [finalBgR, finalBgG, finalBgB],
    backgroundGradient
  };
}

function processImageElement(img: HTMLImageElement): ExtractedColors {
  const canvas = document.createElement('canvas');
  const size = 56;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return DEFAULT_PALETTE;

  ctx.drawImage(img, 0, 0, size, size);
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  // 1. Specifically sample perimeter (edges and corners) to identify the cover's background color ("фон обложки")
  const edgeMargin = Math.max(2, Math.floor(size * 0.14)); // outer 14% frame of the cover
  const bgBins: Map<number, { count: number; sumR: number; sumG: number; sumB: number }> = new Map();

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const isPerimeter = x < edgeMargin || x >= size - edgeMargin || y < edgeMargin || y >= size - edgeMargin;
      if (!isPerimeter) continue;

      const idx = (y * size + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a < 128) continue;

      // Group into 16 bins per channel
      const rBin = r >> 4;
      const gBin = g >> 4;
      const bBin = b >> 4;
      const key = (rBin << 8) | (gBin << 4) | bBin;

      const existing = bgBins.get(key);
      if (existing) {
        existing.count += 1;
        existing.sumR += r;
        existing.sumG += g;
        existing.sumB += b;
      } else {
        bgBins.set(key, { count: 1, sumR: r, sumG: g, sumB: b });
      }
    }
  }

  // Find dominant background color from perimeter
  let bestBgBin: { count: number; sumR: number; sumG: number; sumB: number } | null = null;
  let maxBgCount = -1;
  for (const bin of bgBins.values()) {
    if (bin.count > maxBgCount) {
      maxBgCount = bin.count;
      bestBgBin = bin;
    }
  }

  let bgTargetR: number | undefined;
  let bgTargetG: number | undefined;
  let bgTargetB: number | undefined;

  if (bestBgBin && bestBgBin.count > 0) {
    bgTargetR = Math.round(bestBgBin.sumR / bestBgBin.count);
    bgTargetG = Math.round(bestBgBin.sumG / bestBgBin.count);
    bgTargetB = Math.round(bestBgBin.sumB / bestBgBin.count);
  }

  // 2. Sample all pixels for dominant vibrant/atmospheric color
  const bins: Map<number, { count: number; totalWeight: number; sumR: number; sumG: number; sumB: number; maxSat: number }> = new Map();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a < 128) continue;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const sat = max === 0 ? 0 : delta / max;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Filter out extreme near-whites or pure pitch black when searching for vibrant tones
    if (lum > 0.94 && sat < 0.15) continue;
    if (lum < 0.06) continue;

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

  if (bins.size === 0) {
    return bgTargetR !== undefined 
      ? buildPalette(bgTargetR, bgTargetG!, bgTargetB!, bgTargetR, bgTargetG!, bgTargetB!) 
      : DEFAULT_PALETTE;
  }

  // Pick the winning bin with highest weighted score
  let bestBin: { count: number; sumR: number; sumG: number; sumB: number } | null = null;
  let highestScore = -1;

  for (const bin of bins.values()) {
    const score = bin.totalWeight * (1 + bin.maxSat * 2.2);
    if (score > highestScore) {
      highestScore = score;
      bestBin = bin;
    }
  }

  if (!bestBin || bestBin.count === 0) {
    return bgTargetR !== undefined 
      ? buildPalette(bgTargetR, bgTargetG!, bgTargetB!, bgTargetR, bgTargetG!, bgTargetB!) 
      : DEFAULT_PALETTE;
  }

  const targetR = Math.round(bestBin.sumR / bestBin.count);
  const targetG = Math.round(bestBin.sumG / bestBin.count);
  const targetB = Math.round(bestBin.sumB / bestBin.count);

  return buildPalette(targetR, targetG, targetB, bgTargetR, bgTargetG, bgTargetB);
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
