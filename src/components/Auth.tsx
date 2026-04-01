import { motion } from 'framer-motion';
import { Sword } from 'lucide-react';

interface AuthProps {
  onSignIn: () => void;
}

export function Auth({ onSignIn }: AuthProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#1a0f0a] text-[#fce296] p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="vltk-panel px-6 py-8 landscape:px-10 landscape:py-6 w-full max-w-sm landscape:max-w-md flex flex-col items-center"
      >
        <div className="w-14 h-14 landscape:w-16 landscape:h-16 bg-[#4a2712] border-2 border-[#d4b86a] flex items-center justify-center mb-4 shadow-[inset_0_0_12px_black]">
          <Sword size={28} className="text-[#fce296]" />
        </div>

        <h1 className="text-xl landscape:text-2xl vltk-text-title mb-2 font-serif uppercase tracking-widest">
          Võ Lâm Pixel
        </h1>

        <p className="text-[#d4b86a] text-[10px] landscape:text-xs mb-6 text-center max-w-[220px] font-mono italic leading-relaxed">
          Bước vào giang hồ. Rèn luyện võ công. Đúc kinh nghiệm thành bảo vật.
        </p>

        <button
          onClick={onSignIn}
          className="vltk-btn w-full py-2.5 landscape:py-3 px-6 uppercase tracking-widest text-xs rounded-sm"
        >
          Bước Vào
        </button>
      </motion.div>
    </div>
  );
}
