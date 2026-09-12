import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { X, Image, Loader2, Trash2 } from './Icons.tsx';
import { compressImage } from '../utils/imageCompressor.ts';
import { SupabaseService, isSupabaseConfigured } from '../services/supabase.ts';

export const CreatePlaylistModal = () => {
  const { 
    isCreatePlaylistOpen, setCreatePlaylistOpen, createPlaylist, editPlaylist,
    playlistIdToEdit, playlists, t 
  } = useStore();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track modal open transitions to avoid wiping user edits on background playlist updates
  const prevOpenRef = useRef(false);
  const prevEditIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isCreatePlaylistOpen) {
      const isJustOpened = !prevOpenRef.current;
      const isDifferentPlaylist = prevEditIdRef.current !== playlistIdToEdit;

      if (isJustOpened || isDifferentPlaylist) {
        if (playlistIdToEdit) {
          const pl = playlists.find(p => p.id === playlistIdToEdit);
          if (pl) {
            setName(pl.name || "");
            setDescription(pl.description || "");
            setCover(pl.customCover || null);
            setIsPublic(!!pl.isPublic);
          }
        } else {
          setName("");
          setDescription("");
          setCover(null);
          setIsPublic(false);
        }
      }
    }
    prevOpenRef.current = isCreatePlaylistOpen;
    prevEditIdRef.current = playlistIdToEdit;
  }, [isCreatePlaylistOpen, playlistIdToEdit]);

  if (!isCreatePlaylistOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    // Instant client-side preview so user immediately sees their photo
    try {
      const tempUrl = URL.createObjectURL(file);
      setCover(tempUrl);
    } catch {
      // fallback if createObjectURL fails
    }

    try {
      // Compress image for optimal performance and size
      let processedImage = await compressImage(file, 600, 600, 0.85);

      // Fallback to FileReader base64 if compression canvas failed
      if (!processedImage) {
        processedImage = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string) || "");
          reader.onerror = () => resolve("");
          reader.readAsDataURL(file);
        });
      }

      if (processedImage) {
        let finalCover = processedImage;

        // Upload to Supabase Storage if configured
        if (isSupabaseConfigured()) {
          try {
            const url = await SupabaseService.uploadMedia(processedImage, 'playlists', file.name);
            if (url) {
              finalCover = url;
            }
          } catch (err) {
            console.warn('Playlist cover storage upload error, using local base64 fallback:', err);
          }
        }

        setCover(finalCover);
      }
    } catch (err) {
      console.error('Error handling playlist cover file:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveCover = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCover(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    if (!name.trim()) return alert("Name is required");
    if (isUploading) return;
    
    const finalCover = cover ? cover : "";
    if (playlistIdToEdit) {
      editPlaylist(playlistIdToEdit, name.trim(), description.trim(), finalCover, isPublic);
    } else {
      createPlaylist(name.trim(), description.trim(), finalCover || undefined, isPublic);
    }
    
    setCreatePlaylistOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-md rounded-lg p-6 relative shadow-2xl border border-surface-highlight animate-in fade-in zoom-in duration-200">
        <button 
          onClick={() => setCreatePlaylistOpen(false)} 
          className="absolute top-4 right-4 text-secondary hover:text-white"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold mb-6 text-center">{playlistIdToEdit ? t('editPlaylist') : t('createPlaylist')}</h2>

        <div className="flex flex-col gap-6">
          {/* Cover Upload Area */}
          <div className="flex flex-col items-center gap-2">
            <div 
              onClick={() => {
                if (!isUploading) fileInputRef.current?.click();
              }}
              className="w-44 h-44 bg-surface-highlight rounded shadow-inner flex flex-col items-center justify-center cursor-pointer hover:bg-[#333] transition relative overflow-hidden group"
              title={t('choosePhoto')}
            >
              {cover ? (
                <img src={cover} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Image size={48} className="text-secondary mb-2" />
                  <span className="text-xs text-secondary font-bold text-center px-2">{t('choosePhoto')}</span>
                </>
              )}
              
              {/* Uploading Spinner Overlay */}
              {isUploading ? (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2">
                  <Loader2 size={32} className="text-primary animate-spin" />
                  <span className="text-xs text-white font-medium">{t('uploading') || 'Загрузка...'}</span>
                </div>
              ) : (
                /* Hover overlay */
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <span className="text-white font-bold text-sm bg-black/60 px-3 py-1.5 rounded">{t('edit')}</span>
                </div>
              )}
            </div>

            {cover && !isUploading && (
              <button 
                type="button"
                onClick={handleRemoveCover}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-medium transition py-1 px-2 rounded hover:bg-white/5"
              >
                <Trash2 size={13} />
                <span>{t('deletePhoto') || 'Удалить фото'}</span>
              </button>
            )}

            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange}
            />
          </div>

          <div className="flex flex-col gap-4">
            <input 
              type="text" 
              placeholder={t('playlistName')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-surface-highlight text-white p-3 rounded focus:outline-none focus:ring-1 focus:ring-white font-bold"
            />
            <textarea 
              placeholder={t('description')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-surface-highlight text-white p-3 rounded focus:outline-none focus:ring-1 focus:ring-white resize-none h-24 text-sm"
            />
          </div>

          <div className="flex items-center gap-3 bg-surface-highlight p-3 rounded">
              <input 
                type="checkbox" 
                id="public-check"
                checked={isPublic}
                onChange={e => setIsPublic(e.target.checked)}
                className="w-5 h-5 accent-primary cursor-pointer"
              />
              <div className="flex flex-col">
                  <label htmlFor="public-check" className="font-bold text-sm cursor-pointer select-none">{t('publicPlaylist')}</label>
                  <span className="text-xs text-secondary">{t('publicDesc')}</span>
              </div>
          </div>

          <div className="flex justify-end">
            <button 
              onClick={handleSave}
              disabled={isUploading}
              className={`font-bold py-3 px-8 rounded-full transition flex items-center gap-2 ${
                isUploading 
                  ? 'bg-neutral-600 text-neutral-400 cursor-not-allowed' 
                  : 'bg-white text-black hover:scale-105'
              }`}
            >
              {isUploading && <Loader2 size={16} className="animate-spin" />}
              <span>{isUploading ? (t('uploading') || 'Загрузка...') : t('save')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};