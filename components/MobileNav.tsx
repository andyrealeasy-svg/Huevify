import React, { useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Home, Search, Library } from './Icons';

export const MobileNav = () => {
  const { setView, view, t, appSettings } = useStore();

  const isLiquidGlass = appSettings?.liquidGlassNav !== false;

  const activeIndex = useMemo(() => {
    if (view.type === 'HOME') return 0;
    if (view.type === 'SEARCH') return 1;
    // LIBRARY and all music collection / details views
    return 2;
  }, [view.type]);

  const isHome = activeIndex === 0;
  const isSearch = activeIndex === 1;
  const isLibrary = activeIndex === 2;

  if (!isLiquidGlass) {
    // --- CLASSIC FLAT BOTTOM NAVIGATION ---
    const classicBtnClass = (active: boolean) => 
      `flex flex-col items-center justify-center gap-1 w-full h-full transition relative z-10 ${active ? 'text-white' : 'text-secondary hover:text-white'}`;

    return (
      <div className="fixed bottom-0 left-0 w-full z-40 md:hidden pointer-events-none pb-[env(safe-area-inset-bottom)]">
        {/* Dark gradient backdrop */}
        <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-black via-black/85 via-45% to-transparent pointer-events-none" />
        
        {/* Navigation Buttons */}
        <div className="relative w-full h-16 flex justify-around items-center pb-1 pointer-events-auto">
          <button 
            id="mobile-nav-classic-home"
            onClick={() => setView({ type: 'HOME' })} 
            className={classicBtnClass(isHome)}
            aria-label={t('home')}
          >
            <Home size={24} />
            <span className="text-[10px] font-medium">{t('home')}</span>
          </button>
          <button 
            id="mobile-nav-classic-search"
            onClick={() => setView({ type: 'SEARCH' })} 
            className={classicBtnClass(isSearch)}
            aria-label={t('search')}
          >
            <Search size={24} />
            <span className="text-[10px] font-medium">{t('search')}</span>
          </button>
          <button 
            id="mobile-nav-classic-library"
            onClick={() => setView({ type: 'LIBRARY' })} 
            className={classicBtnClass(isLibrary)}
            aria-label={t('library')}
          >
            <Library size={24} />
            <span className="text-[10px] font-medium">{t('library')}</span>
          </button>
        </div>
      </div>
    );
  }

  // --- PURE MODERN LIQUID GLASS (Clean, Frosted Fluid Optical Glass) ---
  return (
    <div className="fixed bottom-0 left-0 w-full z-40 md:hidden pointer-events-none pb-[calc(env(safe-area-inset-bottom)+8px)]">
      
      {/* Floating Liquid Glass Dock Container */}
      <div className="relative px-4 w-full max-w-[380px] mx-auto pointer-events-auto">
        
        {/* Pure Optical Glass Capsule */}
        <div 
          className="relative w-full h-[60px] p-1 rounded-full flex items-center select-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%), rgba(18, 18, 24, 0.55)',
            backdropFilter: 'blur(30px) saturate(190%) contrast(105%)',
            WebkitBackdropFilter: 'blur(30px) saturate(190%) contrast(105%)',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            boxShadow: `
              0 20px 40px -10px rgba(0, 0, 0, 0.6),
              0 4px 12px rgba(0, 0, 0, 0.25),
              inset 0 1px 0 rgba(255, 255, 255, 0.35),
              inset 0 -1px 0 rgba(0, 0, 0, 0.25)
            `
          }}
        >
          {/* Fluid Liquid Indicator Pill (Sliding with spring inertia) */}
          <div 
            className="absolute top-1 bottom-1 rounded-full pointer-events-none will-change-transform"
            style={{
              width: 'calc((100% - 8px) / 3)',
              left: '4px',
              transform: `translateX(calc(${activeIndex} * 100%))`,
              transition: 'transform 0.38s cubic-bezier(0.2, 0.85, 0.25, 1)',
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.08) 100%)',
              backdropFilter: 'blur(16px) saturate(160%)',
              WebkitBackdropFilter: 'blur(16px) saturate(160%)',
              border: '1px solid rgba(255, 255, 255, 0.24)',
              boxShadow: `
                0 4px 14px rgba(0, 0, 0, 0.2),
                inset 0 1px 0 rgba(255, 255, 255, 0.4),
                inset 0 -1px 0 rgba(0, 0, 0, 0.15)
              `
            }}
          />

          {/* Interactive Navigation Tab Buttons */}
          <div className="relative z-10 w-full h-full flex items-center justify-between">
            
            {/* 1. Home Tab */}
            <button
              id="mobile-nav-liquid-home"
              onClick={() => setView({ type: 'HOME' })}
              className="relative flex-1 h-full rounded-full flex flex-col items-center justify-center gap-0.5 transition-transform duration-150 active:scale-95 cursor-pointer group"
              aria-label={t('home')}
            >
              <span 
                className={`transition-colors duration-200 ${
                  isHome ? 'text-white' : 'text-white/60 group-hover:text-white/90'
                }`}
              >
                <Home size={20} strokeWidth={isHome ? 2.1 : 1.75} />
              </span>
              <span 
                className={`text-[11px] tracking-tight leading-none transition-colors duration-200 ${
                  isHome ? 'font-medium text-white' : 'font-normal text-white/60 group-hover:text-white/90'
                }`}
              >
                {t('home')}
              </span>
            </button>

            {/* 2. Search Tab */}
            <button
              id="mobile-nav-liquid-search"
              onClick={() => setView({ type: 'SEARCH' })}
              className="relative flex-1 h-full rounded-full flex flex-col items-center justify-center gap-0.5 transition-transform duration-150 active:scale-95 cursor-pointer group"
              aria-label={t('search')}
            >
              <span 
                className={`transition-colors duration-200 ${
                  isSearch ? 'text-white' : 'text-white/60 group-hover:text-white/90'
                }`}
              >
                <Search size={20} strokeWidth={isSearch ? 2.1 : 1.75} />
              </span>
              <span 
                className={`text-[11px] tracking-tight leading-none transition-colors duration-200 ${
                  isSearch ? 'font-medium text-white' : 'font-normal text-white/60 group-hover:text-white/90'
                }`}
              >
                {t('search')}
              </span>
            </button>

            {/* 3. Library Tab */}
            <button
              id="mobile-nav-liquid-library"
              onClick={() => setView({ type: 'LIBRARY' })}
              className="relative flex-1 h-full rounded-full flex flex-col items-center justify-center gap-0.5 transition-transform duration-150 active:scale-95 cursor-pointer group"
              aria-label={t('library')}
            >
              <span 
                className={`transition-colors duration-200 ${
                  isLibrary ? 'text-white' : 'text-white/60 group-hover:text-white/90'
                }`}
              >
                <Library size={20} strokeWidth={isLibrary ? 2.1 : 1.75} />
              </span>
              <span 
                className={`text-[11px] tracking-tight leading-none transition-colors duration-200 ${
                  isLibrary ? 'font-medium text-white' : 'font-normal text-white/60 group-hover:text-white/90'
                }`}
              >
                {t('library')}
              </span>
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};
