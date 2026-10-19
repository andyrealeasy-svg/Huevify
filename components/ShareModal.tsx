import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { X, Copy, Check, Download, TelegramIcon, Loader2, Share2, Image } from './Icons.tsx';
import { 
  buildReleaseShareData, 
  buildArtistShareData, 
  openTelegramShareDialog 
} from '../utils/telegramShare.ts';
import { generateShareCardBlob } from '../utils/shareCardGenerator.ts';

export const ShareModal: React.FC = () => {
  const { 
    shareModalData, 
    closeShareModal, 
    showNotification, 
    appSettings 
  } = useStore();

  const isLiquidGlass = appSettings?.liquidGlassNav !== false;

  const [copied, setCopied] = useState(false);
  const [photoCopied, setPhotoCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cardDataUrl, setCardDataUrl] = useState<string>('');
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);

  const isRelease = shareModalData?.type === 'ALBUM';

  const shareData = isRelease && shareModalData?.album
    ? buildReleaseShareData({
        id: shareModalData.album.id || '',
        title: shareModalData.title || '',
        artist: shareModalData.subtitle || ''
      })
    : buildArtistShareData(shareModalData?.title || 'Артист');

  // Generate the Spotify-style 9:16 Share Card image when modal opens
  useEffect(() => {
    if (!shareModalData?.isOpen) {
      setCardDataUrl('');
      setCardBlob(null);
      setCopied(false);
      setPhotoCopied(false);
      return;
    }

    let isCancelled = false;
    setIsGenerating(true);

    generateShareCardBlob({
      title: shareModalData.title,
      artist: shareModalData.subtitle,
      coverUrl: shareModalData.cover,
      type: shareModalData.type
    }).then(({ blob, dataUrl }) => {
      if (!isCancelled) {
        setCardBlob(blob);
        setCardDataUrl(dataUrl);
        setIsGenerating(false);
      }
    }).catch(err => {
      console.warn('Share card generation error:', err);
      if (!isCancelled) setIsGenerating(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [
    shareModalData?.isOpen, 
    shareModalData?.title, 
    shareModalData?.subtitle, 
    shareModalData?.cover, 
    shareModalData?.type
  ]);

  if (!shareModalData?.isOpen) return null;

  // Handle Telegram Share (direct or with native share sheet)
  const handleTelegramShare = async () => {
    // 1. If Web Share API with image file is supported, try sharing with image directly
    if (cardBlob && navigator.share && navigator.canShare) {
      try {
        const file = new File(
          [cardBlob], 
          `Huevify_${(shareModalData?.title || 'share').replace(/[^\p{L}\p{N}_-]/gu, '_')}.png`,
          { type: 'image/png' }
        );
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: shareData.title,
            text: `${shareData.caption}\n${shareData.link}`
          });
          showNotification('Отправлено через Telegram', 'success');
          return;
        }
      } catch (err: any) {
        // User cancelled or share aborted - fallback to direct link
        if (err?.name === 'AbortError') return;
      }
    }

    // 2. Try copying the photo-card to clipboard so user can immediately paste it into the Telegram chat
    if (cardBlob && navigator.clipboard && (window as any).ClipboardItem) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': cardBlob })
        ]);
        showNotification('Фото скопировано! Открываем Telegram — вставьте его в чат', 'info');
      } catch {
        // Clipboard access might require user gesture or permissions
      }
    }

    // 3. Open Telegram share dialogue (link is placed strictly at the end of the text)
    openTelegramShareDialog(shareData.link, shareData.caption);
    showNotification('Открываем Telegram для отправки сообщения...', 'info');
  };

  // Handle Copy Photo Card to Clipboard
  const handleCopyPhoto = async () => {
    if (!cardBlob) {
      showNotification('Карточка генерируется, подождите...', 'info');
      return;
    }

    try {
      if (navigator.clipboard && (window as any).ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': cardBlob })
        ]);
        setPhotoCopied(true);
        showNotification('Фото-карточка скопирована в буфер! Вставьте её в чат Telegram', 'success');
        setTimeout(() => setPhotoCopied(false), 2500);
      } else {
        handleDownloadPhoto();
      }
    } catch (e) {
      console.warn('Copy photo error:', e);
      handleDownloadPhoto();
    }
  };

  // Handle Download Photo
  const handleDownloadPhoto = () => {
    if (!cardBlob && !cardDataUrl) return;

    try {
      const link = document.createElement('a');
      link.download = `Huevify_${(shareModalData?.title || 'share').replace(/[^\p{L}\p{N}_-]/gu, '_')}.png`;
      link.href = cardDataUrl || URL.createObjectURL(cardBlob!);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification('Карточка сохранена на устройство', 'success');
    } catch (e) {
      console.warn('Download error:', e);
      showNotification('Не удалось скачать изображение', 'error');
    }
  };

  // Handle Copy Link & Text
  const handleCopyLink = async () => {
    const formattedText = `${shareData.caption}\n${shareData.link}`;
    try {
      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      showNotification('Текст и ссылка скопированы в буфер обмена', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const input = document.createElement('textarea');
      input.value = formattedText;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      showNotification('Ссылка скопирована', 'success');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className={`relative w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] ${
          isLiquidGlass
            ? 'bg-zinc-900/90 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.3)] text-white'
            : 'bg-surface border border-zinc-700 rounded-2xl shadow-2xl text-white'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 md:px-6 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#24A1DE]/20 flex items-center justify-center text-[#24A1DE]">
              <TelegramIcon size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg leading-tight">
                {isRelease ? 'Поделиться релизом' : 'Поделиться артистом'}
              </h3>
              <p className="text-xs text-secondary leading-tight">
                Ссылка в Telegram Mini App
              </p>
            </div>
          </div>
          <button 
            onClick={closeShareModal}
            className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-white hover:bg-white/10 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 md:p-6 overflow-y-auto flex flex-col items-center gap-4">
          {/* Card Preview Container (Spotify 9:16 Style) */}
          <div className="relative group w-[200px] sm:w-[220px] aspect-[9/16] rounded-2xl overflow-hidden shadow-[0_16px_36px_rgba(0,0,0,0.65)] border border-white/15 bg-black/60 flex items-center justify-center shrink-0">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-2 text-secondary">
                <Loader2 size={32} className="animate-spin text-primary" />
                <span className="text-xs font-semibold">Создаём карточку...</span>
              </div>
            ) : cardDataUrl ? (
              <>
                <img 
                  src={cardDataUrl} 
                  alt="Share card preview" 
                  className="w-full h-full object-cover select-none"
                />
                {/* Subtle hover overlay to download directly */}
                <div 
                  onClick={handleDownloadPhoto}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer gap-2 backdrop-blur-[2px]"
                >
                  <Download size={22} className="text-white drop-shadow" />
                  <span className="text-xs font-bold text-white drop-shadow">Скачать фото</span>
                </div>
              </>
            ) : (
              <div className="text-xs text-secondary text-center p-4">
                Не удалось загрузить превью
              </div>
            )}
          </div>

          {/* Text Message Preview Box */}
          <div className="w-full bg-white/[0.05] border border-white/10 rounded-xl p-3.5 flex flex-col gap-1.5 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
                Текст сообщения:
              </span>
              <span className="text-[10px] text-[#24A1DE] font-semibold">
                Telegram Preview
              </span>
            </div>
            <p className="text-xs md:text-sm text-white/90 font-medium leading-relaxed break-words">
              {shareData.caption}
              <br />
              <span className="text-[#24A1DE] underline underline-offset-2 break-all">{shareData.link}</span>
            </p>
          </div>

          {/* Notice tip */}
          <p className="text-[11px] text-secondary text-center px-1 leading-relaxed -mt-1">
            Ссылка отправляется в конце сообщения. Фото-карточку можно вставить из буфера обмена.
          </p>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-2.5">
            {/* Main Action: Share to Telegram */}
            <button
              onClick={handleTelegramShare}
              className={`w-full py-3.5 px-5 rounded-full font-bold text-sm md:text-base flex items-center justify-center gap-2.5 transition shadow-lg ${
                isLiquidGlass
                  ? 'bg-[#24A1DE] hover:bg-[#2090C8] text-white shadow-[#24A1DE]/25 hover:scale-[1.01] active:scale-[0.98]'
                  : 'bg-[#24A1DE] hover:bg-[#2090C8] text-white hover:scale-[1.01] active:scale-[0.98]'
              }`}
            >
              <TelegramIcon size={20} />
              <span>Поделиться в Telegram</span>
            </button>

            {/* Secondary Actions: Copy Photo + Copy Link */}
            <div className="grid grid-cols-2 gap-2.5 w-full">
              {/* Copy Photo */}
              <button
                onClick={handleCopyPhoto}
                disabled={!cardBlob}
                className={`py-2.5 px-3 rounded-full font-semibold text-xs md:text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 ${
                  photoCopied
                    ? 'bg-primary text-black font-bold'
                    : isLiquidGlass
                    ? 'bg-white/10 hover:bg-white/15 border border-white/15 text-white active:scale-95'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600'
                }`}
                title="Скопировать фото-карточку в буфер обмена"
              >
                {photoCopied ? <Check size={16} /> : <Image size={16} />}
                <span>{photoCopied ? 'Скопировано' : 'Копия фото'}</span>
              </button>

              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                className={`py-2.5 px-3 rounded-full font-semibold text-xs md:text-sm flex items-center justify-center gap-2 transition ${
                  copied
                    ? 'bg-primary text-black font-bold'
                    : isLiquidGlass
                    ? 'bg-white/10 hover:bg-white/15 border border-white/15 text-white active:scale-95'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600'
                }`}
                title="Скопировать текст и ссылку"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Скопировано!' : 'Копия текста'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};