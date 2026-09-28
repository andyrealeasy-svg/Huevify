import React from 'react';
import ReactDOM from 'react-dom';
import { useStore } from '../context/StoreContext.tsx';
import { 
  X, Play, Pause, Shuffle, RotateCcw, Trash2, 
  ListMusic, Music, Music2 
} from './Icons.tsx';
import { ExplicitBadge } from './ExplicitBadge.tsx';
import { PlayingVisualizer } from './PlayingVisualizer.tsx';
import { Track } from '../types.ts';

const formatDuration = (seconds?: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const QueueModal: React.FC = () => {
  const { 
    isQueueOpen, setQueueOpen, currentTrack, isPlaying, togglePlay, 
    playTrack, isShuffle, toggleShuffle, reshuffleQueue, 
    getUpcomingTracks, removeFromQueue, clearQueue,
    getTrackCover, appSettings, t 
  } = useStore();

  if (!isQueueOpen) return null;

  const isLiquidGlass = appSettings?.liquidGlassNav !== false;
  const upcomingTracks = getUpcomingTracks();
  const currentCover = currentTrack ? getTrackCover(currentTrack) : '';

  const handleTrackClick = (track: Track) => {
    playTrack(track);
  };

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[999] flex flex-col justify-end animate-fade-in"
      onClick={() => setQueueOpen(false)}
    >
      <div 
        className={`w-full max-w-lg mx-auto p-5 pb-8 rounded-t-3xl animate-slide-up flex flex-col max-h-[88vh] ${
          isLiquidGlass 
            ? 'bg-[#181820]/95 backdrop-blur-3xl border-t border-x border-white/20 shadow-[0_-12px_40px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.3)]' 
            : 'bg-[#1f1f26] border-t border-white/10 shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grabber handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3 shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-primary">
              <ListMusic size={18} />
            </div>
            <div>
              <h2 className="font-bold text-white text-base leading-tight">
                {t('queue', 'Очередь воспроизведения')}
              </h2>
              <span className="text-[11px] text-white/60">
                {isShuffle ? 'Перемешка плейлиста' : `${upcomingTracks.length} треков далее`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Shuffle Toggle / Reshuffle Button */}
            <button
              onClick={isShuffle ? reshuffleQueue : toggleShuffle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition active:scale-95 ${
                isShuffle 
                  ? 'bg-primary text-black shadow-md shadow-primary/20' 
                  : 'bg-white/10 text-white/80 hover:text-white hover:bg-white/15'
              }`}
              title={isShuffle ? "Перемешать заново 25 треков" : "Включить перемешку (25 треков)"}
            >
              {isShuffle ? <RotateCcw size={13} className="animate-spin-slow" /> : <Shuffle size={13} />}
              <span>{isShuffle ? 'Перемешать' : 'Перемешка'}</span>
            </button>

            {/* Close Button */}
            <button 
              onClick={() => setQueueOpen(false)}
              className="text-white/60 hover:text-white p-1 rounded-full shrink-0 transition"
              aria-label="Закрыть очередь"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto pt-3 pb-2 space-y-4 custom-scrollbar">
          
          {/* 1. СЕЙЧАС ИГРАЕТ (Now Playing) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Сейчас играет
              </span>
              {currentTrack && (
                <span className="text-[11px] text-white/40">
                  {formatDuration(currentTrack.duration)}
                </span>
              )}
            </div>

            {currentTrack ? (
              <div 
                className={`flex items-center justify-between gap-3 p-3 rounded-2xl transition ${
                  isLiquidGlass
                    ? 'bg-white/[0.08] backdrop-blur-md border border-white/15 shadow-sm'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-md">
                    <img 
                      src={currentCover} 
                      alt={currentTrack.title} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <PlayingVisualizer isPlaying={isPlaying} size="sm" colorClass="bg-primary" />
                    </div>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-sm truncate">
                        {currentTrack.title}
                      </span>
                      {currentTrack.explicit && <ExplicitBadge />}
                    </div>
                    <span className="text-xs text-white/70 truncate mt-0.5">
                      {currentTrack.artist || 'Неизвестный исполнитель'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition shadow-md"
                  title={isPlaying ? "Пауза" : "Воспроизведение"}
                >
                  {isPlaying ? (
                    <Pause size={18} fill="currentColor" />
                  ) : (
                    <Play size={18} fill="currentColor" className="ml-0.5" />
                  )}
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center text-white/50 text-xs">
                Нет активного трека
              </div>
            )}
          </div>

          {/* ПОЛОСКА-РАЗДЕЛИТЕЛЬ С МЕТКОЙ ОЧЕРЕДИ */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex items-center justify-between px-1">
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isLiquidGlass
                  ? 'bg-[#181820] text-white/80 border border-white/15'
                  : 'bg-[#1f1f26] text-white/80'
              }`}>
                Далее в очереди ({upcomingTracks.length})
              </span>
              {upcomingTracks.length > 0 && (
                <button 
                  onClick={clearQueue}
                  className="text-[11px] text-white/50 hover:text-red-400 transition flex items-center gap-1 bg-[#181820] px-2 py-0.5 rounded-full"
                  title="Очистить список следующих треков"
                >
                  <Trash2 size={11} />
                  <span>Очистить</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. ТРЕКИ, КОТОРЫЕ БУДУТ ИГРАТЬ ДАЛЬШЕ (Upcoming Tracks) */}
          <div className="space-y-1.5">
            {upcomingTracks.length === 0 ? (
              <div className="py-8 px-4 text-center flex flex-col items-center justify-center gap-3 bg-white/[0.03] rounded-2xl border border-white/5">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                  <Music2 size={24} />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-white/80">
                    Очередь воспроизведения пуста
                  </p>
                  <p className="text-xs text-white/50 max-w-xs">
                    Включите перемешку, чтобы автоматически сгенерировать очередь из 25 треков
                  </p>
                </div>
                <button
                  onClick={reshuffleQueue}
                  className="mt-1 flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold text-xs rounded-full hover:scale-105 active:scale-95 transition shadow-lg shadow-primary/20"
                >
                  <Shuffle size={14} />
                  <span>Сформировать очередь (25 треков)</span>
                </button>
              </div>
            ) : (
              upcomingTracks.map((track, idx) => {
                const cover = getTrackCover(track);
                return (
                  <div
                    key={`${track.id}_queue_${idx}`}
                    onClick={() => handleTrackClick(track)}
                    className={`group flex items-center justify-between gap-3 p-2.5 rounded-xl cursor-pointer transition ${
                      isLiquidGlass
                        ? 'hover:bg-white/10 active:bg-white/15'
                        : 'hover:bg-white/10 active:bg-white/15'
                    }`}
                  >
                    {/* Left: Index / Play & Cover & Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Position number / Play hover */}
                      <div className="w-5 text-center text-xs font-semibold text-white/40 group-hover:text-primary shrink-0">
                        <span className="group-hover:hidden">#{idx + 1}</span>
                        <Play size={14} fill="currentColor" className="hidden group-hover:inline-block ml-0.5" />
                      </div>

                      {/* Cover Thumbnail */}
                      <img 
                        src={cover} 
                        alt={track.title} 
                        className="w-10 h-10 rounded-lg object-cover shrink-0 shadow-sm"
                      />

                      {/* Title & Artist */}
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-white text-sm truncate group-hover:text-primary transition-colors">
                            {track.title}
                          </span>
                          {track.explicit && <ExplicitBadge />}
                        </div>
                        <span className="text-xs text-white/60 truncate mt-0.5">
                          {track.artist || 'Неизвестный исполнитель'}
                        </span>
                      </div>
                    </div>

                    {/* Right: Duration & Remove action */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-white/40 group-hover:hidden font-medium">
                        {formatDuration(track.duration)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromQueue(track.id);
                        }}
                        className="hidden group-hover:flex p-1.5 text-white/40 hover:text-red-400 rounded-full hover:bg-white/10 transition"
                        title="Удалить из очереди"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>
    </div>,
    document.body
  );
};
