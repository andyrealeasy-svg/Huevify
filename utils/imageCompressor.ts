/**
 * Image compressor utility using HTML5 Canvas.
 * Resizes images to reasonable dimensions and compresses them to JPEG/WebP
 * so they don't consume tens of megabytes of base64 storage.
 */
export async function compressImage(
  input: File | string,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      try {
        let { width, height } = img;

        // If image is already smaller than max bounds, don't upscale
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(typeof input === 'string' ? input : '');
          return;
        }

        // Fill with black background in case of transparent PNG being converted to JPEG
        ctx.fillStyle = '#121212';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      } catch (err) {
        console.warn('Image compression canvas error, using fallback', err);
        resolve(typeof input === 'string' ? input : '');
      }
    };

    img.onerror = () => {
      resolve(typeof input === 'string' ? input : '');
    };

    if (typeof input === 'string') {
      img.src = input;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(input);
    }
  });
}
