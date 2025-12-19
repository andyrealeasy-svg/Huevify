import React from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Home, Search, Library } from './Icons.tsx';
import { ViewState } from '../types.ts';

export const MobileNav = () => {
  const { setView, view } = useStore();

  const isActive = (type: ViewState['type']) => view.type === type;

  const btnClass = (active: boolean) => 
    `flex flex-col items-center justify-center gap-1 w-full h-full transition ${active ? 'text-white' : 'text-secondary hover:text-white'}`;

  return (
    <div className="fixed bottom-0 left-0 w-full h-16 bg-gradient-to-t from-black to-black/95 border-t border-surface-highlight flex justify-around items-center z-40 md:hidden pb-1">
      <button onClick={() => setView({ type: 'HOME' })} className={btnClass(isActive('HOME'))}>
        <Home size={24} />
        <span className="text-[10px]">Home</span>
      </button>
      <button onClick={() => setView({ type: 'SEARCH' })} className={btnClass(isActive('SEARCH'))}>
        <Search size={24} />
        <span className="text-[10px]">Search</span>
      </button>
      <button onClick={() => setView({ type: 'LIBRARY' })} className={btnClass(isActive('LIBRARY'))}>
        <Library size={24} />
        <span className="text-[10px]">Library</span>
      </button>
    </div>
  );
};