import React from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { X, LogOut, User as UserIcon, Settings } from './Icons.tsx';

export const ProfileModal = () => {
  const { isProfileModalOpen, setProfileModalOpen, currentUser, logout } = useStore();

  if (!isProfileModalOpen || !currentUser) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-sm rounded-lg p-6 relative shadow-2xl border border-surface-highlight animate-in fade-in zoom-in duration-200">
        
        <button 
            onClick={() => setProfileModalOpen(false)}
            className="absolute top-4 right-4 text-secondary hover:text-white"
        >
            <X size={24} />
        </button>

        <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full bg-surface-highlight mb-4 overflow-hidden border-2 border-primary shadow-lg">
                {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                        <UserIcon size={40} className="text-secondary" />
                    </div>
                )}
            </div>
            <h2 className="text-2xl font-bold">{currentUser.displayName}</h2>
            <p className="text-secondary text-sm">@{currentUser.username}</p>
        </div>

        <div className="flex flex-col gap-3">
            <button className="flex items-center gap-3 w-full p-3 rounded hover:bg-surface-highlight transition text-left text-secondary hover:text-white group">
                <Settings size={20} />
                <span className="font-bold">Settings (Coming Soon)</span>
            </button>
            
            <div className="h-px bg-surface-highlight my-1" />

            <button 
                onClick={logout}
                className="flex items-center gap-3 w-full p-3 rounded hover:bg-red-500/20 transition text-left text-white group"
            >
                <LogOut size={20} className="text-white" />
                <span className="font-bold">Log out</span>
            </button>
        </div>

      </div>
    </div>
  );
};