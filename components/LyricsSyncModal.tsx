import React, { useState, useEffect, useRef } from 'react';
import { 
  X, ArrowLeft, Play, Pause, RotateCcw, Check, 
  Music2, FileText, FastForward, Sliders, FileAudio, UploadCloud,
  ChevronLeft, ChevronRight, SkipBack, SkipForward
} from './Icons.tsx';
import { DistributionTrack, LyricsLine } from '../types.ts';

interface LyricsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: DistributionTrack;
  trackIndex: number;
  artistName?: string;
  onSave: (lyrics: string, syncedLyrics?: LyricsLine[]) => void;
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const LyricsSyncModal: React.FC<LyricsSyncModalProps> = ({
  isOpen,
  onClose,
  track,
  trackIndex,
  artistName,
  onSave
}) => {
  const [mode, setMode] = useState<'input' | 'sync'>('input');
  const [rawText, setRawText] = useState<string>('');
  const [lines, setLines] = useState<{ text: string; time?: number }[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(0);
  
  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(track.duration || 180);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Auto-scroll ref
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  // Initialize state when opening
  useEffect(() => {
    if (isOpen) {
      const initialText = track.lyrics || (track.syncedLyrics ? track.syncedLyrics.map(l => l.text).join('\n') : '');
      setRawText(initialText);
      
      if (track.syncedLyrics && track.syncedLyrics.length > 0) {
        setLines(track.syncedLyrics.map(l => ({ text: l.text, time: l.time })));
      } else {
        setLines([]);
      }
      setMode('input');
      setCurrentLineIndex(0);
      setIsPlaying(false);
      setCurrentTime(0);
      setAudioError(null);
    }
  }, [isOpen, track]);

  // Handle Audio playback & time updates
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleError = () => {
      if (track.fileUrl) {
        setAudioError("Не удалось воспроизвести аудиофайл трека.");
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [mode, track.fileUrl]);

  // Clean raw text and prepare for sync
  const startSync = () => {
    if (!rawText.trim()) return;

    // Song structure keywords (Verse, Chorus, Outro, etc.)
    const structureKeywordRegex = /^(куплет|припев|интро|аутро|бридж|предприпев|хук|дроп|соло|скит|инструментал|вступление|концовка|переход|финал|verse|chorus|intro|outro|bridge|pre-?chorus|hook|drop|solo|skit|instrumental|interlude|refrain)(\s+\d+|\s*:|\s+-\s+.*|\s*:\s*.*)?$/i;

    // Remove tags like [Припев], [Куплет 1], but NEVER delete backing vocals or ad-libs in parentheses like "(а)"
    // Also remove empty lines
    const cleanedLines = rawText
      .split('\n')
      .map(line => {
        let text = line.trim();

        // 1. If entire line is in square brackets, e.g. [Припев], [Куплет 1], [Chorus: Drake]
        if (/^\[.*?\]$/.test(text)) {
          return '';
        }

        // 2. If entire line is a structure header inside round parentheses, like (Припев), (Интро)
        const roundBracketsMatch = text.match(/^\((.*?)\)$/);
        if (roundBracketsMatch) {
          const inner = roundBracketsMatch[1].trim();
          if (structureKeywordRegex.test(inner)) {
            return '';
          }
        }

        // 3. If line without brackets is purely a structure title like "Куплет 1:", "Припев:", "Chorus"
        if (structureKeywordRegex.test(text)) {
          return '';
        }

        // 4. Strip any leading inline tags in square brackets or timestamps, e.g. "[Припев] аовлла (а)" -> "аовлла (а)"
        text = text.replace(/\[\d{1,2}:\d{2}(?:\.\d+)?\]\s*/g, '');
        text = text.replace(/^\[.*?\]\s*/g, '');

        // Note: parentheses with backing vocals (e.g. "(а)", "(эй, эй)", "(да)") are fully preserved!
        return text.trim();
      })
      .filter(line => line.length > 0);

    if (cleanedLines.length === 0) {
      alert("Пожалуйста, введите текст песни.");
      return;
    }

    // If pre-existing synced lyrics match, preserve timings where possible
    const newLines = cleanedLines.map((text, idx) => {
      const existing = lines[idx];
      return {
        text,
        time: existing && existing.text === text ? existing.time : undefined
      };
    });

    setLines(newLines);
    
    // Find first unsynced line or start from 0
    const firstUnsynced = newLines.findIndex(l => l.time === undefined);
    setCurrentLineIndex(firstUnsynced !== -1 ? firstUnsynced : 0);
    setMode('sync');

    // Auto-start audio if available
    if (audioRef.current && track.fileUrl) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Toggle Audio Play / Pause
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Seek audio
  const handleSeek = (newTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Record timestamp for current line and advance to next line
  const handleNextLine = () => {
    if (lines.length === 0) return;

    const timeToRecord = Number(currentTime.toFixed(2));
    const updated = [...lines];
    
    if (currentLineIndex < updated.length) {
      updated[currentLineIndex] = {
        ...updated[currentLineIndex],
        time: timeToRecord
      };
      setLines(updated);

      if (currentLineIndex + 1 < updated.length) {
        setCurrentLineIndex(currentLineIndex + 1);
      }
    }
  };

  // Return to previous line
  const handlePrevLine = () => {
    if (currentLineIndex > 0) {
      const prevIdx = currentLineIndex - 1;
      setCurrentLineIndex(prevIdx);
      if (lines[prevIdx]?.time !== undefined && audioRef.current) {
        handleSeek(Math.max(0, lines[prevIdx].time! - 0.2));
      }
    }
  };

  // Jump to specific line for re-timing
  const handleSelectLine = (index: number) => {
    setCurrentLineIndex(index);
    if (lines[index].time !== undefined && audioRef.current) {
      handleSeek(lines[index].time!);
    }
  };

  // Auto-scroll to active line
  useEffect(() => {
    if (mode === 'sync' && activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [currentLineIndex, mode]);

  // Keyboard shortcut (Space / Enter / Arrow for navigation)
  useEffect(() => {
    if (!isOpen || mode !== 'sync') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is focused on an input, skip
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space' || e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleNextLine();
      } else if (e.key === 'Backspace' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrevLine();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mode, currentLineIndex, currentTime, lines]);

  // Toggle playback speed
  const toggleSpeed = () => {
    const nextSpeed = playbackSpeed === 1 ? 0.8 : playbackSpeed === 0.8 ? 1.2 : 1;
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  // Save Plain Text only
  const handleSavePlainText = () => {
    onSave(rawText, undefined);
    onClose();
  };

  // Save Synced Lyrics
  const handleSaveSynced = () => {
    const validSynced = lines
      .filter(l => l.time !== undefined)
      .map(l => ({ text: l.text, time: l.time! }));

    const plainText = lines.map(l => l.text).join('\n') || rawText;
    
    onSave(plainText, validSynced.length > 0 ? validSynced : undefined);
    onClose();
  };

  // Reset all timestamps
  const handleResetTimings = () => {
    if (window.confirm("Сбросить все расставленные тайминги?")) {
      setLines(prev => prev.map(l => ({ ...l, time: undefined })));
      setCurrentLineIndex(0);
      handleSeek(0);
    }
  };

  if (!isOpen) return null;

  const hasAudio = Boolean(track.fileUrl);

  return (
    <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex flex-col justify-between animate-fade-in text-white select-none">
      {/* Hidden HTML5 Audio Element */}
      {hasAudio && (
        <audio 
          ref={audioRef} 
          src={track.fileUrl} 
          preload="auto"
        />
      )}

      {/* TOP HEADER */}
      <header className="h-16 border-b border-white/10 px-4 sm:px-8 flex items-center justify-between shrink-0 bg-black/70 backdrop-blur-md z-20">
        <div className="flex items-center gap-3 min-w-0">
          {mode === 'sync' ? (
            <button
              type="button"
              onClick={() => {
                if (audioRef.current) audioRef.current.pause();
                setIsPlaying(false);
                setMode('input');
              }}
              className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition flex items-center gap-1.5 text-xs font-medium"
              title="Назад к тексту"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Редактировать текст</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition"
              title="Закрыть"
            >
              <X size={20} />
            </button>
          )}

          <div className="flex flex-col min-w-0">
            <h2 className="text-sm sm:text-base font-semibold text-white truncate">
              {track.title || `Трек ${trackIndex + 1}`}
            </h2>
            <span className="text-xs text-zinc-400 truncate">
              {track.artist || artistName || 'Основной артист'} • {mode === 'sync' ? 'Синхронизация' : 'Текст трека'}
            </span>
          </div>
        </div>

        {/* Right Top Actions */}
        <div className="flex items-center gap-2.5">
          {mode === 'input' ? (
            <>
              <button
                type="button"
                onClick={handleSavePlainText}
                disabled={!rawText.trim()}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40 text-xs sm:text-sm font-semibold transition text-white"
              >
                Сохранить текст
              </button>

              {rawText.trim().length > 0 && (
                <button
                  type="button"
                  onClick={startSync}
                  className="flex items-center gap-2 bg-white text-black px-4 sm:px-5 py-2 rounded-full font-bold hover:bg-zinc-200 active:scale-95 transition text-xs sm:text-sm shadow-md"
                >
                  <Music2 size={16} />
                  <span>Синхронизировать с музыкой</span>
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleResetTimings}
                className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition text-xs flex items-center gap-1.5"
                title="Сбросить тайминги"
              >
                <RotateCcw size={16} />
                <span className="hidden md:inline">Сбросить</span>
              </button>

              <button
                type="button"
                onClick={handleSaveSynced}
                className="flex items-center gap-2 bg-white text-black px-5 py-2 rounded-full font-bold hover:bg-zinc-200 active:scale-95 transition text-xs sm:text-sm shadow-md"
              >
                <Check size={16} />
                <span>Сохранить результат</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      {mode === 'input' ? (
        <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 flex flex-col min-h-0 overflow-y-auto animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-zinc-400 text-xs sm:text-sm">
              <FileText size={16} className="text-zinc-400" />
              <span>Вставьте или введите текст песни:</span>
            </div>
            <span className="text-xs text-zinc-400">
              {rawText.split('\n').filter(Boolean).length} строк
            </span>
          </div>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Вставьте или введите текст песни сюда...\n\n[Куплет 1]\nПервая строка трека\nВторая строка трека\n\n[Припев]\nТекст припева\n...`}
            rows={16}
            className="flex-1 w-full bg-zinc-900/60 border border-white/10 rounded-2xl p-4 sm:p-6 text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans text-sm sm:text-base leading-relaxed resize-none"
            autoFocus
          />

          <div className="mt-4 p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-start gap-3 text-xs text-zinc-400">
            <p className="leading-relaxed">
              При переходе к синхронизации пустые строки и пометки куплетов или припевов ([Куплет], [Припев]) удаляются автоматически, а бэк-вокал и эдлибы в скобках (например, «(а)») сохраняются.
            </p>
          </div>
        </div>
      ) : (
        /* SYNCHRONIZATION VIEW */
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-gradient-to-b from-zinc-950 via-black to-black">
          {/* Warning banner if track has no audio */}
          {!hasAudio && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs text-amber-300 flex items-center justify-center gap-2">
              <FileAudio size={16} />
              <span>У этого трека не прикреплен аудиофайл. Прикрепите аудио на Шаге 2 для точной синхронизации.</span>
            </div>
          )}

          {/* Lines List */}
          <div 
            ref={listContainerRef}
            className="flex-1 overflow-y-auto px-4 sm:px-12 py-16 flex flex-col gap-6 sm:gap-8 items-center text-center scroll-smooth"
          >
            {lines.map((line, idx) => {
              const isPast = idx < currentLineIndex;
              const isCurrent = idx === currentLineIndex;
              const hasTimestamp = line.time !== undefined;

              return (
                <div
                  key={idx}
                  ref={isCurrent ? activeLineRef : null}
                  onClick={() => handleSelectLine(idx)}
                  className={`group relative max-w-2xl w-full cursor-pointer transition-all duration-200 px-4 py-2.5 rounded-2xl flex flex-col items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-white/10 border border-white/20'
                      : isPast
                        ? 'opacity-70 hover:opacity-100 hover:bg-white/5'
                        : 'opacity-25 hover:opacity-50'
                  }`}
                >
                  {/* Timestamp badge */}
                  {hasTimestamp && (
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-white/10 text-zinc-300">
                      {formatTime(line.time!)}
                    </span>
                  )}

                  {/* Lyric Text */}
                  <p
                    className={`font-bold tracking-tight transition-all duration-200 leading-snug ${
                      isCurrent
                        ? 'text-2xl sm:text-3xl text-white font-extrabold'
                        : isPast
                          ? 'text-lg sm:text-xl text-zinc-300'
                          : 'text-lg sm:text-xl text-zinc-400'
                    }`}
                  >
                    {line.text}
                  </p>
                </div>
              );
            })}
          </div>

          {/* BOTTOM CONTROLS & NAVIGATION BUTTONS */}
          <div className="border-t border-white/10 bg-black/90 backdrop-blur-xl p-4 sm:p-5 shrink-0 flex flex-col items-center gap-4 z-20">
            {/* STEP NAVIGATION BUTTONS (Назад + Дальше) */}
            <div className="w-full max-w-md flex flex-col items-center gap-2">
              <div className="w-full flex items-center gap-3">
                {/* Back to previous line button */}
                <button
                  type="button"
                  onClick={handlePrevLine}
                  disabled={currentLineIndex === 0}
                  className="px-5 py-3.5 bg-white/10 hover:bg-white/15 disabled:opacity-30 disabled:pointer-events-none text-white font-semibold text-sm rounded-full transition-all flex items-center justify-center gap-2 shrink-0"
                  title="Вернуться к предыдущей строке"
                >
                  <ArrowLeft size={18} />
                  <span className="hidden xs:inline">Назад</span>
                </button>

                {/* Forward / Next line button */}
                <button
                  type="button"
                  onClick={handleNextLine}
                  className="flex-1 py-3.5 px-6 bg-white hover:bg-zinc-200 text-black font-bold text-sm sm:text-base rounded-full shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {currentLineIndex >= lines.length - 1 && lines[currentLineIndex]?.time !== undefined ? (
                    <>
                      <Check size={18} />
                      <span>Все строки синхронизированы</span>
                    </>
                  ) : (
                    <>
                      <span>Дальше ({currentLineIndex + 1} / {lines.length})</span>
                      <FastForward size={18} fill="currentColor" />
                    </>
                  )}
                </button>
              </div>

              <span className="text-[11px] text-zinc-400 text-center">
                Пробел — следующая строка, Backspace или Стрелка влево — предыдущая
              </span>
            </div>

            {/* AUDIO PLAYER BAR */}
            <div className="w-full max-w-2xl flex flex-col gap-2 pt-2 border-t border-white/10">
              <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
                <span className="w-10 text-right">{formatTime(currentTime)}</span>
                
                {/* Progress bar */}
                <div className="flex-1 h-1.5 bg-white/15 rounded-full relative group cursor-pointer overflow-hidden">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={(e) => handleSeek(Number(e.target.value))}
                    className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                    aria-label="Перемотка"
                  />
                  <div
                    className="h-full bg-white rounded-full transition-[width] duration-75"
                    style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                  />
                </div>

                <span className="w-10">{formatTime(duration)}</span>
              </div>

              {/* Player control buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSeek(0)}
                    className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition"
                    title="С начала"
                  >
                    <RotateCcw size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={toggleSpeed}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold font-mono text-zinc-300 transition"
                    title="Скорость воспроизведения"
                  >
                    {playbackSpeed}x
                  </button>
                </div>

                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition shadow"
                  title={isPlaying ? "Пауза" : "Воспроизведение"}
                >
                  {isPlaying ? (
                    <Pause size={18} fill="currentColor" />
                  ) : (
                    <Play size={18} fill="currentColor" className="ml-0.5" />
                  )}
                </button>

                <div className="text-xs text-zinc-400 font-medium">
                  {lines.filter(l => l.time !== undefined).length} из {lines.length} строк
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
