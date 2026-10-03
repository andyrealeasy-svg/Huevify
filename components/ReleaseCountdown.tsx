import React, { useState, useEffect } from 'react';
import { Clock, Play } from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface ReleaseCountdownProps {
  targetDate: string;
  targetTime?: string;
  className?: string;
  albumId?: string;
  linkedAlbumId?: string;
  onListenClick?: () => void;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

export const ReleaseCountdown: React.FC<ReleaseCountdownProps> = ({
  targetDate,
  targetTime = "00:00",
  className = "",
  albumId,
  linkedAlbumId,
  onListenClick
}) => {
  const { t, appSettings, completeAnnouncementTransition } = useStore();
  const isLiquidGlass = appSettings?.liquidGlassNav !== false;

  const calculateTimeRemaining = (): TimeRemaining => {
    if (!targetDate) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
    }

    try {
      let targetTimestamp: number;
      if (targetDate.includes('T')) {
        targetTimestamp = new Date(targetDate).getTime();
      } else {
        const timePart = targetTime && targetTime.length >= 4 ? targetTime : "00:00";
        targetTimestamp = new Date(`${targetDate}T${timePart}:00`).getTime();
      }

      if (isNaN(targetTimestamp)) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
      }

      const now = Date.now();
      const diff = targetTimestamp - now;

      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      return { days, hours, minutes, seconds, isPast: false };
    } catch {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
    }
  };

  const [time, setTime] = useState<TimeRemaining>(calculateTimeRemaining());

  useEffect(() => {
    setTime(calculateTimeRemaining());
    const interval = setInterval(() => {
      setTime(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, targetTime]);

  if (time.isPast) {
    const handleListen = () => {
      if (onListenClick) {
        onListenClick();
      } else if (albumId) {
        completeAnnouncementTransition(albumId, linkedAlbumId);
      }
    };

    return (
      <div className={`inline-flex items-center gap-3 select-none ${className}`}>
        <button
          onClick={handleListen}
          className="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-highlight text-black font-extrabold text-sm md:text-base flex items-center gap-2 shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition"
        >
          <Play size={18} fill="currentColor" />
          <span>{t('listen', 'Слушать')}</span>
        </button>
        <span className="text-xs text-white/70 font-medium">
          {t('releaseNowLive', 'Релиз уже доступен!')}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl px-5 py-3.5 select-none transition-all inline-flex items-center justify-center ${
        isLiquidGlass
          ? 'bg-black/50 backdrop-blur-xl border border-white/10 shadow-lg'
          : 'bg-black/60 border border-white/10'
      } ${className}`}
    >
      <div className="flex items-center gap-3 md:gap-4 text-center">
        {/* Days */}
        <div className="flex flex-col items-center min-w-[40px] md:min-w-[48px]">
          <span className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-none">
            {time.days}
          </span>
          <span className="text-[11px] md:text-xs text-secondary font-normal mt-1 lowercase">
            {t('daysShort', 'дней')}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-7 bg-white/15" />

        {/* Hours */}
        <div className="flex flex-col items-center min-w-[40px] md:min-w-[48px]">
          <span className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-none">
            {time.hours}
          </span>
          <span className="text-[11px] md:text-xs text-secondary font-normal mt-1 lowercase">
            {t('hoursShort', 'часов')}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-7 bg-white/15" />

        {/* Minutes */}
        <div className="flex flex-col items-center min-w-[40px] md:min-w-[48px]">
          <span className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-none">
            {time.minutes}
          </span>
          <span className="text-[11px] md:text-xs text-secondary font-normal mt-1 lowercase">
            {t('minsShort', 'минут')}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-7 bg-white/15" />

        {/* Seconds */}
        <div className="flex flex-col items-center min-w-[40px] md:min-w-[48px]">
          <span className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-none">
            {time.seconds}
          </span>
          <span className="text-[11px] md:text-xs text-secondary font-normal mt-1 lowercase">
            {t('secsShort', 'секунд')}
          </span>
        </div>
      </div>
    </div>
  );
};
