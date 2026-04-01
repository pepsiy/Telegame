import { useState } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Flame, Shield, Crosshair, ArrowRight, Zap } from 'lucide-react';

interface ProfileProps {
  playerData: any;
}

export function Profile({ playerData }: ProfileProps) {
  const [minting, setMinting] = useState(false);

  const handleMint = async () => {
    if (!playerData || playerData.dailyExp <= 0) return;
    
    const today = new Date().toISOString().split('T')[0];
    if (playerData.lastMintDate === today) {
      alert("Hôm nay bạn đã đúc kinh nghiệm rồi. Hãy quay lại vào ngày mai!");
      return;
    }

    setMinting(true);
    try {
      const userRef = doc(db, 'users', playerData.uid);
      const mintedAmount = playerData.dailyExp / 100; // 100 EXP = 1 $EXP
      
      // Feature: Trừ level EXP khi đúc
      await updateDoc(userRef, {
        currency: increment(mintedAmount),
        dailyExp: 0,
        exp: Math.max(0, playerData.exp - playerData.dailyExp),
        lastMintDate: today
      });
      
      alert(`Đúc thành công ${mintedAmount.toFixed(2)} KNB (Kỳ Trân Thạch)!`);
    } catch (error) {
      console.error("Minting error:", error);
    } finally {
      setMinting(false);
    }
  };

  const getStatIcon = (label: string) => {
     switch(label) {
        case 'HP': return <Flame size={14} className="text-[#ff4d4d]" />;
        case 'ATK': return <Crosshair size={14} className="text-[#fce296]" />;
        case 'DEF': return <Shield size={14} className="text-[#4da6ff]" />;
        default: return null;
     }
  }

  const stats = [
    { label: 'HP', value: playerData?.stats?.hp, color: 'text-[#ff4d4d]' },
    { label: 'ATK', value: playerData?.stats?.atk, color: 'text-[#fce296]' },
    { label: 'DEF', value: playerData?.stats?.def, color: 'text-[#4da6ff]' },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-4 h-full p-2">
      
      {/* Cột Trái: Thông số Nhân Vật */}
      <div className="w-full md:w-1/3 flex flex-col gap-4">
          
          <div className="flex items-center gap-4 bg-[#2e1c14]/80 border border-[#b89947] p-3 shadow-inner">
            <div className="w-16 h-16 bg-[#1a0f0a] border-2 border-[#d4b86a] overflow-hidden shadow-md shrink-0">
              <img src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${playerData?.uid}`} alt="Avatar" className="w-[120%] h-[120%]" referrerPolicy="no-referrer" />
            </div>
            <div className="flex flex-col justify-center">
              <h2 className="vltk-text-title text-sm sm:text-base leading-tight mb-1">{playerData?.displayName}</h2>
              <div className="text-[10px] text-[#fce296] bg-[#4a2712] border border-[#d4b86a]/50 px-1 inline-block w-max">
                Cấp Độ: {playerData?.level}
              </div>
            </div>
          </div>
          
          <div className="bg-[#2e1c14]/80 border border-[#b89947] p-3 shadow-inner space-y-2">
             <div className="text-[10px] text-[#b89947] uppercase font-bold text-center border-b border-[#b89947]/30 pb-1 mb-2">Bảng Thuộc Tính</div>
             {stats.map((stat) => (
              <div key={stat.label} className="flex justify-between items-center bg-[#1a0f0a] border border-[#d4b86a]/20 px-2 py-1">
                <div className="flex items-center gap-1">
                   {getStatIcon(stat.label)}
                   <span className="text-[10px] text-[#d4b86a] drop-shadow-md">{stat.label}</span>
                </div>
                <span className={`text-[12px] font-mono font-bold ${stat.color} drop-shadow-[0_1px_1px_black]`}>{stat.value}</span>
              </div>
            ))}
            <div className="pt-2">
                <div className="flex justify-between items-center bg-[#1a0f0a] border border-[#d4b86a]/20 px-2 py-1 mt-1">
                   <span className="text-[10px] text-[#d4b86a]">Tích luỹ EXP</span>
                   <span className="text-[12px] font-mono text-white">{playerData?.exp}</span>
                </div>
            </div>
          </div>

      </div>

      {/* Cột Phải: Lò Đúc EXP */}
      <div className="w-full md:w-2/3 flex flex-col gap-4">
         
         <div className="bg-[#2e1c14]/80 border border-[#b89947] p-4 shadow-inner flex-1 flex flex-col relative overflow-hidden">
             
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
               <Zap size={150} className="text-[#fce296]" />
            </div>

            <div className="text-[12px] text-[#fce296] uppercase font-bold border-b border-[#b89947]/30 pb-2 mb-4 drop-shadow-md text-center">
                Lò Đúc KNB (Kỳ Trân Thạch)
            </div>

            <div className="flex flex-col items-center justify-center py-4 relative z-10">
               <div className="text-[10px] text-[#d4b86a] mb-1">Chân Khí Thu Thập Trong Ngày</div>
               <div className="text-3xl font-mono text-white drop-shadow-[0_0_10px_#fce296] mb-4">
                  {playerData?.dailyExp} <span className="text-sm">điểm</span>
               </div>
               
               <div className="w-full bg-[#1a0f0a] border border-[#b89947]/50 p-2 sm:p-4 flex items-center justify-between shadow-[inset_0_0_10px_black] mb-6">
                  <div className="flex flex-col text-center w-1/3">
                     <span className="text-[8px] text-[#d4b86a]">KNB Nhận Được</span>
                     <span className="text-sm sm:text-base font-bold text-[#fce296]">{(playerData?.dailyExp / 100).toFixed(2)}</span>
                  </div>
                  <ArrowRight size={16} className="text-[#b89947] w-1/3" />
                  <div className="flex flex-col text-center w-1/3">
                     <span className="text-[8px] text-[#d4b86a]">Ngân Lượng (Đang Có)</span>
                     <span className="text-sm sm:text-base font-bold text-white">{playerData?.currency?.toFixed(2)}</span>
                  </div>
               </div>

               <button
                  onClick={handleMint}
                  disabled={minting || playerData?.dailyExp <= 0}
                  className={`w-full max-w-xs py-2 sm:py-3 px-4 font-black tracking-widest text-[10px] sm:text-[12px] rounded-sm transition-all border ${
                    minting || playerData?.dailyExp <= 0 
                      ? 'bg-[#1a0f0a] border-[#4a2712] text-[#4a2712] cursor-not-allowed' 
                      : 'bg-gradient-to-b from-[#8b0000] to-[#4a0000] border-[#fce296] text-[#fce296] shadow-[0_0_15px_rgba(139,0,0,0.8)] hover:brightness-125 active:scale-95'
                  }`}
                >
                  {minting ? 'ĐANG LUYỆN ĐAN...' : 'VẬN CÔNG ĐÚC EXP'}
               </button>
            </div>

         </div>

         <div className="bg-[#1a0f0a] border border-[#4a2712] p-3 shadow-inner">
            <h3 className="text-[9px] font-bold text-[#d4b86a] uppercase mb-1 drop-shadow-md">Tàng Kinh Các (Hướng Dẫn)</h3>
            <p className="text-[8px] text-white/60 leading-relaxed font-mono">
              Chân Khí (EXP) thu được khi rèn luyện tại vùng đất này có thể kết tinh lại thành KNB. 
              Mỗi 100 điểm chân khí tương đương 1 KNB. Đúc KNB sẽ tiêu hao Chân khí tương ứng của cấp hiện tại. Cẩn thận tẩu hỏa nhập ma!
            </p>
         </div>

      </div>

    </div>
  );
}
