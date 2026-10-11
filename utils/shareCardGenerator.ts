import { extractColorFromImage, ExtractedColors } from './colorExtractor.ts';

export const HUEVIFY_LOGO_URL = 'https://i.postimg.cc/Xv7wBHsW/IMG-20261011-153258-509.jpg';

export interface ShareCardOptions {
  title: string;
  artist: string;
  coverUrl?: string;
  type?: 'ALBUM' | 'ARTIST';
}

/**
 * Helper to draw a rounded rectangle on a 2D canvas context
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Truncate text with ellipsis if it exceeds maxWidth
 */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(truncated + '…').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated.trim() + '…';
}

/**
 * Loads an image safely with crossOrigin to prevent canvas tainting
 */
function loadImageSafe(url?: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Resolve null so canvas is not tainted
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Draws an image with object-fit: cover behavior (centered, aspect-ratio preserved, cropped to 1:1)
 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dWidth: number,
  dHeight: number
) {
  const imgWidth = img.naturalWidth || img.width;
  const imgHeight = img.naturalHeight || img.height;

  if (!imgWidth || !imgHeight) {
    ctx.drawImage(img, dx, dy, dWidth, dHeight);
    return;
  }

  // Calculate scaling factor to cover destination box
  const scale = Math.max(dWidth / imgWidth, dHeight / imgHeight);
  const sWidth = dWidth / scale;
  const sHeight = dHeight / scale;
  const sx = (imgWidth - sWidth) / 2;
  const sy = (imgHeight - sHeight) / 2;

  ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
}

function drawFallbackLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#1e3a8a';
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 30px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('H', cx, cy + 1);
}

/**
 * Generates Spotify-style vertical 9:16 Share Card (1080x1920)
 * Exactly styled as requested:
 * - Dynamic color gradient in the background matching cover
 * - Floating dark card in center
 * - Square cover art with rounded corners
 * - Release title and artist name
 * - Official Huevify logo branding at bottom
 */
export async function generateShareCardBlob(options: ShareCardOptions): Promise<{ blob: Blob | null; dataUrl: string }> {
  const { title, artist, coverUrl } = options;

  const width = 1080;
  const height = 1920;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Pre-load images concurrently
  const [coverImg, logoImg] = await Promise.all([
    loadImageSafe(coverUrl),
    loadImageSafe(HUEVIFY_LOGO_URL)
  ]);

  // 1. Extract atmospheric color from the cover image
  let palette: ExtractedColors | null = null;
  try {
    palette = await extractColorFromImage(coverUrl || '', title);
  } catch (err) {
    console.warn('Failed to extract color, using fallback:', err);
  }

  const [r, g, b] = palette?.rgb || [55, 65, 81];

  // 2. Draw 9:16 Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  // Dominant tint at top
  bgGrad.addColorStop(0, `rgb(${Math.min(255, Math.round(r * 1.15))}, ${Math.min(255, Math.round(g * 1.15))}, ${Math.min(255, Math.round(b * 1.15))})`);
  // Mid tone
  bgGrad.addColorStop(0.35, `rgb(${Math.round(r * 0.85)}, ${Math.round(g * 0.85)}, ${Math.round(b * 0.85)})`);
  // Deep dark tone at bottom
  bgGrad.addColorStop(0.75, `rgb(${Math.round(r * 0.25 + 15)}, ${Math.round(g * 0.25 + 15)}, ${Math.round(b * 0.25 + 18)})`);
  bgGrad.addColorStop(1, '#0c0a0d');

  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Soft atmospheric radial glow in center
  const radialGlow = ctx.createRadialGradient(width / 2, height * 0.45, 100, width / 2, height * 0.45, 750);
  radialGlow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.25)`);
  radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radialGlow;
  ctx.fillRect(0, 0, width, height);

  // 3. Central Card Dimensions
  const cardW = 840;
  const cardH = 1200;
  const cardX = (width - cardW) / 2; // 120px
  const cardY = 360; // Perfectly centered vertically in 1920 viewport

  // Card shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 80;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 36;

  // Tinted dark background for central card (like Spotify mockup)
  const cardR = Math.max(16, Math.min(32, Math.round(r * 0.16 + 12)));
  const cardG = Math.max(14, Math.min(30, Math.round(g * 0.16 + 10)));
  const cardB = Math.max(16, Math.min(34, Math.round(b * 0.16 + 12)));
  ctx.fillStyle = `rgb(${cardR}, ${cardG}, ${cardB})`;

  roundRect(ctx, cardX, cardY, cardW, cardH, 44);
  ctx.fill();
  ctx.restore();

  // Subtle border for card
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardW, cardH, 44);
  ctx.stroke();
  ctx.restore();

  // 4. Album Cover Art inside Card
  const coverPad = 48;
  const coverSize = cardW - coverPad * 2; // 744x744 px
  const coverX = cardX + coverPad;
  const coverY = cardY + coverPad;
  const coverRadius = 32;

  ctx.save();
  roundRect(ctx, coverX, coverY, coverSize, coverSize, coverRadius);
  ctx.clip();

  if (coverImg) {
    try {
      drawImageCover(ctx, coverImg, coverX, coverY, coverSize, coverSize);
    } catch {
      drawFallbackCover(ctx, coverX, coverY, coverSize, title, r, g, b);
    }
  } else {
    drawFallbackCover(ctx, coverX, coverY, coverSize, title, r, g, b);
  }
  ctx.restore();

  // Subtle cover inner border
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  roundRect(ctx, coverX, coverY, coverSize, coverSize, coverRadius);
  ctx.stroke();
  ctx.restore();

  // 5. Typography inside Card
  const textX = coverX;
  const titleY = coverY + coverSize + 76;

  // Release Title
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 54px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  ctx.textBaseline = 'middle';
  const fittedTitle = fitText(ctx, title || 'Без названия', coverSize);
  ctx.fillText(fittedTitle, textX, titleY);

  // Artist Name
  const artistY = titleY + 58;
  ctx.fillStyle = '#a1a1aa';
  ctx.font = '600 38px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  const fittedArtist = fitText(ctx, artist || 'Артист', coverSize);
  ctx.fillText(fittedArtist, textX, artistY);
  ctx.restore();

  // 6. Brand Footer inside Card ("Huevify") with official logo
  const brandY = cardY + cardH - 84;
  const logoRadius = 26;
  const logoCenterX = textX + logoRadius;
  const logoCenterY = brandY;

  ctx.save();
  if (logoImg) {
    // Draw real Huevify logo clipped in a circle
    ctx.beginPath();
    ctx.arc(logoCenterX, logoCenterY, logoRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    try {
      drawImageCover(
        ctx,
        logoImg, 
        logoCenterX - logoRadius, 
        logoCenterY - logoRadius, 
        logoRadius * 2, 
        logoRadius * 2
      );
    } catch {
      drawFallbackLogo(ctx, logoCenterX, logoCenterY, logoRadius);
    }
  } else {
    drawFallbackLogo(ctx, logoCenterX, logoCenterY, logoRadius);
  }
  ctx.restore();

  // Subtle border around logo
  ctx.save();
  ctx.beginPath();
  ctx.arc(logoCenterX, logoCenterY, logoRadius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // "Huevify" text
  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('Huevify', logoCenterX + logoRadius + 18, logoCenterY);
  ctx.restore();

  // Export to Blob and DataURL
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => {
        let dataUrl = '';
        try {
          dataUrl = canvas.toDataURL('image/png');
        } catch {
          dataUrl = '';
        }
        resolve({ blob, dataUrl });
      }, 'image/png');
    } catch (e) {
      console.warn('Canvas toBlob tainted/failed:', e);
      resolve({ blob: null, dataUrl: '' });
    }
  });
}

function drawFallbackCover(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  title: string,
  r: number,
  g: number,
  b: number
) {
  const grad = ctx.createLinearGradient(x, y, x + size, y + size);
  grad.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
  grad.addColorStop(1, '#18181b');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, size, size);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 120px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const initial = (title || 'H').charAt(0).toUpperCase();
  ctx.fillText(initial, x + size / 2, y + size / 2);
}
