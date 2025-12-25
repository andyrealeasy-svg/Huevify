import React, { useState, useRef } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Camera, X } from './Icons.tsx';

type AuthMode = 'LANDING' | 'LOGIN' | 'REGISTER';

export const Auth = () => {
  const { login, register } = useStore();
  const [mode, setMode] = useState<AuthMode>('LANDING');

  // Login State
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");

  // Register State
  const [regDisplayName, setRegDisplayName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regConfirmPass, setRegConfirmPass] = useState("");
  const [regAvatar, setRegAvatar] = useState<string>("");
  const [regError, setRegError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const success = login(loginUsername, loginPass);
    if (!success) {
        setLoginError("Invalid username or password");
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");

    if (!regDisplayName || !regUsername || !regPass) {
        setRegError("Please fill in all fields");
        return;
    }

    if (regPass !== regConfirmPass) {
        setRegError("Passwords do not match");
        return;
    }

    const success = register({
        username: regUsername,
        password: regPass,
        displayName: regDisplayName,
        avatar: regAvatar || undefined
    });

    if (!success) {
        setRegError("Username already taken");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRegAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-background text-white z-[100] flex flex-col items-center justify-center p-4">
       <div className="absolute inset-0 bg-gradient-to-b from-huevify/40 to-black z-0" />
       
       <div className="z-10 w-full max-w-md bg-surface p-8 rounded-xl shadow-2xl border border-surface-highlight animate-in fade-in zoom-in duration-300">
           
           <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-huevify rounded-full flex items-center justify-center text-4xl font-bold mb-4 shadow-lg">H</div>
                <h1 className="text-3xl font-bold tracking-tighter">Huevify</h1>
                <p className="text-secondary mt-2 text-center">Millions of songs. Free on Huevify.</p>
           </div>

           {mode === 'LANDING' && (
               <div className="flex flex-col gap-4">
                   <button 
                        onClick={() => setMode('LOGIN')}
                        className="w-full py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition"
                   >
                       Log in
                   </button>
                   <button 
                        onClick={() => setMode('REGISTER')}
                        className="w-full py-3 bg-transparent border border-secondary text-secondary font-bold rounded-full hover:border-white hover:text-white transition"
                   >
                       Sign up free
                   </button>
               </div>
           )}

           {mode === 'LOGIN' && (
               <form onSubmit={handleLogin} className="flex flex-col gap-4">
                   <h2 className="text-xl font-bold text-center mb-2">Log in to Huevify</h2>
                   {loginError && <div className="bg-red-500/20 text-red-500 text-sm p-3 rounded text-center">{loginError}</div>}
                   
                   <div className="flex flex-col gap-1">
                       <label className="text-sm font-bold">Username</label>
                       <input 
                            type="text" 
                            className="bg-background border border-secondary/30 rounded p-3 focus:border-white focus:outline-none"
                            placeholder="Username"
                            value={loginUsername}
                            onChange={e => setLoginUsername(e.target.value)}
                       />
                   </div>

                   <div className="flex flex-col gap-1">
                       <label className="text-sm font-bold">Password</label>
                       <input 
                            type="password" 
                            className="bg-background border border-secondary/30 rounded p-3 focus:border-white focus:outline-none"
                            placeholder="Password"
                            value={loginPass}
                            onChange={e => setLoginPass(e.target.value)}
                       />
                   </div>

                   <button type="submit" className="w-full py-3 bg-primary text-black font-bold rounded-full hover:scale-105 transition mt-4">Log In</button>
                   
                   <button 
                        type="button" 
                        onClick={() => setMode('LANDING')} 
                        className="text-secondary text-sm hover:text-white mt-2"
                    >
                        Cancel
                   </button>
               </form>
           )}

           {mode === 'REGISTER' && (
               <form onSubmit={handleRegister} className="flex flex-col gap-4">
                   <h2 className="text-xl font-bold text-center mb-2">Sign up for free</h2>
                   {regError && <div className="bg-red-500/20 text-red-500 text-sm p-3 rounded text-center">{regError}</div>}
                   
                   {/* Avatar Upload */}
                   <div className="flex justify-center mb-2">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-24 h-24 rounded-full bg-surface-highlight flex items-center justify-center cursor-pointer hover:opacity-80 transition relative overflow-hidden group"
                        >
                            {regAvatar ? (
                                <img src={regAvatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <Camera size={32} className="text-secondary" />
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                <span className="text-[10px] font-bold">UPLOAD</span>
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                   </div>

                   <div className="flex flex-col gap-1">
                       <label className="text-sm font-bold">Display Name</label>
                       <input 
                            type="text" 
                            className="bg-background border border-secondary/30 rounded p-3 focus:border-white focus:outline-none"
                            placeholder="What should we call you?"
                            value={regDisplayName}
                            onChange={e => setRegDisplayName(e.target.value)}
                       />
                   </div>

                   <div className="flex flex-col gap-1">
                       <label className="text-sm font-bold">Username</label>
                       <input 
                            type="text" 
                            className="bg-background border border-secondary/30 rounded p-3 focus:border-white focus:outline-none"
                            placeholder="Unique username"
                            value={regUsername}
                            onChange={e => setRegUsername(e.target.value)}
                       />
                   </div>

                   <div className="flex flex-col gap-1">
                       <label className="text-sm font-bold">Password</label>
                       <input 
                            type="password" 
                            className="bg-background border border-secondary/30 rounded p-3 focus:border-white focus:outline-none"
                            placeholder="Create a password"
                            value={regPass}
                            onChange={e => setRegPass(e.target.value)}
                       />
                   </div>

                   <div className="flex flex-col gap-1">
                       <label className="text-sm font-bold">Confirm Password</label>
                       <input 
                            type="password" 
                            className="bg-background border border-secondary/30 rounded p-3 focus:border-white focus:outline-none"
                            placeholder="Enter password again"
                            value={regConfirmPass}
                            onChange={e => setRegConfirmPass(e.target.value)}
                       />
                   </div>

                   <button type="submit" className="w-full py-3 bg-primary text-black font-bold rounded-full hover:scale-105 transition mt-4">Sign Up</button>
                   
                   <button 
                        type="button" 
                        onClick={() => setMode('LANDING')} 
                        className="text-secondary text-sm hover:text-white mt-2"
                    >
                        Cancel
                   </button>
               </form>
           )}

       </div>
    </div>
  );
};