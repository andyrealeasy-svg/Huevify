import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const metaEnv = (import.meta as any).env || {};
const filebaseKey = (metaEnv.VITE_FILEBASE_KEY || 'B5C7C0D1F2CC8AD61258') as string;
const filebaseSecret = (metaEnv.VITE_FILEBASE_SECRET || 'QF2IFqJocZ9pDN2cDQ7wtsv36ClCJiTUE5TfeMYS') as string;
const filebaseBucket = (metaEnv.VITE_FILEBASE_BUCKET || 'huevify-media') as string;

let s3ClientInstance: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      endpoint: 'https://s3.filebase.io',
      region: 'us-east-1',
      credentials: {
        accessKeyId: filebaseKey,
        secretAccessKey: filebaseSecret,
      },
    });
  }
  return s3ClientInstance;
}

export const FilebaseService = {
  isConfigured(): boolean {
    return !!(filebaseKey && filebaseSecret && filebaseBucket);
  },

  async uploadBlob(
    blob: Blob | Uint8Array,
    folder: 'tracks' | 'covers' | 'avatars' | 'playlists',
    fileNameHint?: string,
    mimeType?: string
  ): Promise<string | null> {
    if (!this.isConfigured()) return null;

    try {
      const s3 = getS3Client();

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

      const rawName = fileNameHint ? fileNameHint.replace(/\.[^/.]+$/, '') : 'file';
      const cleanName = rawName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, '').substring(0, 24);
      const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const safeExt = ext || (folder === 'tracks' ? '.mp3' : '.jpg');
      const filePath = `${folder}/${cleanName || 'item'}_${uniqueId}${safeExt}`;

      let bodyData: Uint8Array;
      if (blob instanceof Uint8Array) {
        bodyData = blob;
      } else {
        const arrayBuffer = await blob.arrayBuffer();
        bodyData = new Uint8Array(arrayBuffer);
      }

      const detectedMime = mimeType || (blob instanceof Blob ? blob.type : undefined) || 'application/octet-stream';

      await s3.send(
        new PutObjectCommand({
          Bucket: filebaseBucket,
          Key: filePath,
          Body: bodyData,
          ContentType: detectedMime,
        })
      );

      // In Filebase IPFS buckets, the object is pinned and its CID is stored in HeadObject metadata
      let cid: string | null = null;
      for (let attempt = 0; attempt < 6; attempt++) {
        try {
          const headRes = await s3.send(
            new HeadObjectCommand({
              Bucket: filebaseBucket,
              Key: filePath,
            })
          );
          if (headRes.Metadata?.cid) {
            cid = headRes.Metadata.cid;
            break;
          }
        } catch (e) {
          // ignore transient delay
        }
        await new Promise((r) => setTimeout(r, 400));
      }

      if (!cid) {
        console.warn(`Filebase upload completed for ${filePath}, but CID was not found in metadata`);
        return null;
      }

      const ipfsUrl = `https://ipfs.filebase.io/ipfs/${cid}`;
      return ipfsUrl;
    } catch (err: any) {
      console.error('Filebase upload failed:', err);
      return null;
    }
  },

  async uploadMedia(
    source: File | Blob | string,
    folder: 'tracks' | 'covers' | 'avatars' | 'playlists',
    fileNameHint?: string
  ): Promise<string | null> {
    try {
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
      console.warn(`Filebase uploadMedia error:`, err);
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
};
