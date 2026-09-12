import React from 'react';
import { useStore } from '../context/StoreContext';
import { Home, Search, Library } from './Icons';
import { ViewState } from '../types';

export const MobileNav = () => {
  const { setView, view, t } = useStore();

  const isActive = (type: ViewState['type']) => view.type === type;

  const btnClass = (active: boolean) => 
    `flex flex-col items-center justify-center gap-1 w-full h-full transition relative z-10 ${active ? 'text-white' : 'text-secondary hover:text-white'}`;

  return (
    <div className="fixed bottom-0 left-0 w-full z-40 md:hidden pointer-events-none">
      {/* Smooth gradient backdrop extending upwards behind player and buttons */}
      <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-black via-black/85 via-45% to-transparent pointer-events-none" />
      
      {/* Interactive Navigation Buttons */}
      <div className="relative w-full h-16 flex justify-around items-center pb-1 pointer-events-auto">
        <button onClick={() => setView({ type: 'HOME' })} className={btnClass(isActive('HOME'))}>
          <Home size={24} />
          <span className="text-[10px] font-medium">{t('home')}</span>
        </button>
        <button onClick={() => setView({ type: 'SEARCH' })} className={btnClass(isActive('SEARCH'))}>
          <Search size={24} />
          <span className="text-[10px] font-medium">{t('search')}</span>
        </button>
        <button onClick={() => setView({ type: 'LIBRARY' })} className={btnClass(isActive('LIBRARY'))}>
          <Library size={24} />
          <span className="text-[10px] font-medium">{t('library')}</span>
        </button>
      </div>
    </div>
  );
};