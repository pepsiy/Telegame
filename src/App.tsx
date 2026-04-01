/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { auth, db, signIn } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { BattleArena } from './components/BattleArena';
import { Profile } from './components/Profile';
import { Auth } from './components/Auth';
import { Sword, User as UserIcon, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [playerData, setPlayerData] = useState<any>(null);
  const [view, setView] = useState<'arena' | 'profile'>('arena');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auto login if opened inside Telegram
    const autoLogin = async () => {
      try {
        if ((window as any).Telegram?.WebApp?.initData) {
          if (!auth.currentUser) {
            await signIn();
          }
        }
      } catch(e) { console.error("Auto login error", e); }
    };
    autoLogin();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, 'users', u.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          const telegramUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
          const telegramName = telegramUser ? (telegramUser.username || telegramUser.first_name) : null;

          const newPlayerData = {
            uid: u.uid,
            displayName: telegramName || u.displayName || 'Player',
            level: 1,
            exp: 0,
            dailyExp: 0,
            currency: 0,
            stats: { hp: 100, atk: 10, def: 5 },
            lastMintDate: new Date().toISOString().split('T')[0]
          };
          await setDoc(userRef, newPlayerData);
          setPlayerData(newPlayerData);
        }

        onSnapshot(userRef, (doc) => {
          setPlayerData(doc.data());
        });
      } else {
        setPlayerData(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050505] text-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-[#F27D26] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    const handleSignIn = async () => {
      try {
        await signIn();
      } catch (e: any) {
        alert("Lỗi Firebase: " + e.message + "\n\nGợi ý: Hãy vào Firebase Console -> Authentication -> Sign-in methods -> Bật tuỳ chọn 'Anonymous' (Đăng nhập ẩn danh) lên nhé!");
      }
    };
    return <Auth onSignIn={handleSignIn} />;
  }

  if (!playerData) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050505] text-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-[#F27D26] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-[#1a0f0a] text-[#fce296] font-sans overflow-hidden relative">
      {/* Cảnh nền chính - Tràn viền 100% */}
      <BattleArena 
        playerData={playerData} 
        onOpenProfile={() => setView('profile')} 
      />
      
      {/* Profile Modal Gỗ Cổ Trang */}
      <AnimatePresence>
        {view === 'profile' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-10"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl h-full max-h-[85vh] vltk-panel flex flex-col shadow-[0_0_50px_black]"
            >
              <div className="flex justify-between items-center px-4 py-2 bg-gradient-to-r from-[#4a2712] via-[#5c4033] to-[#4a2712] border-b-2 border-[#b89947]">
                 <h2 className="vltk-text-title text-[16px] uppercase tracking-widest font-serif">Khí Giới - Tôn Tính</h2>
                 <button 
                   onClick={() => setView('arena')} 
                   className="vltk-btn w-8 h-8 text-xl font-black leading-none pb-1"
                 >
                   ×
                 </button>
              </div>
              <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">
                 <Profile playerData={playerData} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
