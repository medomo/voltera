/**
 * Resizes and compresses a Base64 image string to fit within specified maximum dimensions and quality.
 * Prevents large payload errors and accelerates app loading.
 */
export async function compressBase64Image(
  base64Str: string,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.70
): Promise<string> {
  if (!base64Str || !base64Str.startsWith('data:image')) {
    return base64Str;
  }

  // If already under 60KB (60,000 chars) and small, skip heavy canvas redraw
  if (base64Str.length < 60000) {
    return base64Str;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str.substring(0, 100000)); // fallback safety
        return;
      }

      // Draw with smooth scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Export as WebP or JPEG/PNG with specified quality
      const isPng = base64Str.startsWith('data:image/png');
      const mimeType = isPng ? 'image/png' : 'image/jpeg';
      const compressedDataUrl = canvas.toDataURL(mimeType, quality);

      // If compressed version is smaller, return it
      if (compressedDataUrl.length < base64Str.length) {
        resolve(compressedDataUrl);
      } else {
        resolve(base64Str);
      }
    };

    img.onerror = () => {
      resolve(base64Str.length > 500000 ? '' : base64Str);
    };

    img.src = base64Str;
  });
}

/**
 * Reads a File object and compresses it into a lightweight Base64 string.
 */
export async function compressImageFile(
  file: File,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.70
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawBase64 = event.target?.result as string;
      if (!rawBase64) {
        resolve('');
        return;
      }
      try {
        const compressed = await compressBase64Image(rawBase64, maxWidth, maxHeight, quality);
        resolve(compressed);
      } catch (err) {
        resolve(rawBase64);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

