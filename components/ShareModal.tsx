import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { X, Copy, Check, Download, TelegramIcon, Loader2, Share2 } from './Icons.tsx';
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [cardDataUrl, setCardDataUrl] = useState<string>('');
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);

  const isRelease = shareModalData?.type === 'ALBUM';

  const shareData = isRelease && shareModalData?.album
    ? buildReleaseShareData({
        id: shareModalData.album.id,
        title: shareModalData.title,
        artist: shareModalData.subtitle
      })
    : buildArtistShareData(shareModalData?.title || 'Артист');

  // Generate the Spotify-style 9:16 Share Card image when modal opens
  useEffect(() => {
    if (!shareModalData?.isOpen) {
      setCardDataUrl('');
      setCardBlob(null);
      setCopied(false);
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
          `Huevify_${shareModalData.title.replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g, '_')}.png`, 
          { type: 'image/png' }
        );
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: shareData.title,
            text: shareData.fullText
          });
          showNotification('Отправлено через Telegram', 'success');
          return;
        }
      } catch (err: any) {
        // User cancelled or share aborted - fallback to direct link
        if (err?.name === 'AbortError') return;
      }
    }

    // 2. Open Telegram share dialogue
    openTelegramShareDialog(shareData.link, shareData.caption);
    showNotification('Открываем Telegram для отправки...', 'info');
  };

  // Handle Download Photo
  const handleDownloadPhoto = () => {
    if (!cardBlob && !cardDataUrl) return;

    try {
      const link = document.createElement('a');
      link.download = `Huevify_${shareModalData.title.replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g, '_')}.png`;
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

  // Handle Copy Link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareData.fullText);
      setCopied(true);
      showNotification('Ссылка и текст скопированы в буфер обмена', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = shareData.fullText;
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
        <div className="p-4 md:p-6 overflow-y-auto flex flex-col items-center gap-5">
          {/* Card Preview Container (Spotify 9:16 Style) */}
          <div className="relative group w-[210px] sm:w-[230px] aspect-[9/16] rounded-2xl overflow-hidden shadow-[0_16px_36px_rgba(0,0,0,0.65)] border border-white/15 bg-black/60 flex items-center justify-center shrink-0">
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
              {shareData.caption}{' '}
              <span className="text-[#24A1DE] underline underline-offset-2 break-all">{shareData.link}</span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-2.5">
            {/* Main Action: Share to Telegram */}
            <button
              onClick={handleTelegramShare}
              className={`w-full py-3.5 px-5 rounded-full font-bold text-sm md:text-base flex items-center justify-center gap-2.5 transition shadow-lg ${
                isLiquidGlass
                  ? 'bg-[#24A1DE] hover:bg-[#2090C8] text-white shadow-[#24A1DE]/25 hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-[#24A1DE] hover:bg-[#2090C8] text-white hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              <TelegramIcon size={20} />
              <span>Поделиться в Telegram</span>
            </button>

            {/* Secondary Actions: Download Photo + Copy Link */}
            <div className="grid grid-cols-2 gap-2.5 w-full">
              <button
                onClick={handleDownloadPhoto}
                disabled={!cardDataUrl && !cardBlob}
                className={`py-2.5 px-3 rounded-full font-semibold text-xs md:text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 ${
                  isLiquidGlass
                    ? 'bg-white/10 hover:bg-white/15 border border-white/15 text-white active:scale-95'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600'
                }`}
                title="Скачать карточку в разрешении 1080x1920"
              >
                <Download size={16} />
                <span>Скачать фото</span>
              </button>

              <button
                onClick={handleCopyLink}
                className={`py-2.5 px-3 rounded-full font-semibold text-xs md:text-sm flex items-center justify-center gap-2 transition ${
                  copied
                    ? 'bg-primary text-black font-bold'
                    : isLiquidGlass
                    ? 'bg-white/10 hover:bg-white/15 border border-white/15 text-white active:scale-95'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600'
                }`}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
