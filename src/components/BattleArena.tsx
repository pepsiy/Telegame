import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { db } from '../firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, Settings, Users, Trophy, Heart, Droplets } from 'lucide-react';
import { PhaserGame } from './PhaserGame';
import { SPAWN_POINT } from '../data/gameData';

interface BattleArenaProps {
  playerData: any;
  onOpenProfile?: () => void;
}

export function BattleArena({ playerData, onOpenProfile }: BattleArenaProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomState, setRoomState] = useState<any>(null);
  const [roomId] = useState('main-arena');
  const [battleLog, setBattleLog] = useState<string[]>(["Hệ thống: Đang kết nối..."]);
  const [winner, setWinner] = useState<string | null>(null);
  const [skillCooldown, setSkillCooldown] = useState(0);
  const [joined, setJoined] = useState(false);

  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  useEffect(() => {
    audioRefs.current.skill = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
    audioRefs.current.impact = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    (Object.values(audioRefs.current) as HTMLAudioElement[]).forEach(audio => {
      audio.load();
      audio.volume = 0.3;
    });
  }, []);

  const playSound = (type: 'skill' | 'impact') => {
    const sound = audioRefs.current[type];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  };

  // Auto-join: kết nối socket và vào phòng ngay lập tức
  useEffect(() => {
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      // Auto join room ngay khi kết nối thành công
      const startPos = { x: SPAWN_POINT.x + (Math.random() - 0.5) * 64, y: SPAWN_POINT.y + (Math.random() - 0.5) * 64 };
      newSocket.emit('join_room', {
        roomId,
        userId: playerData.uid,
        displayName: playerData.displayName,
        pos: startPos,
        stats: playerData.stats
      });
      setJoined(true);
      setBattleLog(prev => [...prev, "Hệ thống: Bước vào Tân Thủ Thôn."]);
    });

    newSocket.on('room_state', (state) => {
      setRoomState(state);
    });

    newSocket.on('player_moved', (data) => {
      const { socketId, pos } = data;
      setRoomState((prev: any) => {
        if (!prev) return prev;
        const newPlayers = { ...prev.players };
        if (newPlayers[socketId]) newPlayers[socketId].pos = pos;
        return { ...prev, players: newPlayers };
      });
    });

    newSocket.on('player_hit', (data) => {
      const { targetId, hp } = data;
      setRoomState((prev: any) => {
        if (!prev) return prev;
        const newPlayers = { ...prev.players };
        if (newPlayers[targetId]) newPlayers[targetId].hp = hp;
        return { ...prev, players: newPlayers };
      });
      playSound('impact');
    });

    newSocket.on('skill_used', () => {
      playSound('skill');
    });

    newSocket.on('battle_end', async (data) => {
      const { winner: winId } = data;
      setWinner(winId === newSocket.id ? 'CHIẾN THẮNG!' : 'THẤT BẠI!');
      setTimeout(() => setWinner(null), 4000);
    });

    newSocket.on('monster_hit', (data) => {
      setRoomState((prev: any) => {
        if (!prev || !prev.monsters) return prev;
        const newMonsters = { ...prev.monsters };
        if (newMonsters[data.targetId]) newMonsters[data.targetId].hp = data.hp;
        return { ...prev, monsters: newMonsters };
      });
      playSound('impact');
    });

    newSocket.on('monster_died', async (data) => {
       const { killerId, expDrop, targetId } = data;
       setRoomState((prev: any) => {
         if (!prev || !prev.monsters) return prev;
         const newMonsters = { ...prev.monsters };
         if (newMonsters[targetId]) newMonsters[targetId].isDead = true;
         return { ...prev, monsters: newMonsters };
       });

       if (killerId === newSocket.id) {
         try {
           const userRef = doc(db, 'users', playerData.uid);
           await updateDoc(userRef, { exp: increment(expDrop), dailyExp: increment(expDrop) });
           setBattleLog(prev => [...prev, `Hệ thống: Tiêu diệt quái vật, nhận ${expDrop} điểm Chân Khí! ✅`]);
         } catch (error) { console.error(error); }
       }
    });

    newSocket.on('monsters_state', (monstersData) => {
      setRoomState((prev: any) => {
         if (!prev) return prev;
         return { ...prev, monsters: monstersData };
      });
    });

    newSocket.on('monster_respawn', (data) => {
      setRoomState((prev: any) => {
         if (!prev || !prev.monsters) return prev;
         const newMonsters = { ...prev.monsters };
         if (newMonsters[data.id]) {
            newMonsters[data.id].isDead = false;
            newMonsters[data.id].hp = data.hp;
            newMonsters[data.id].pos = data.pos;
         }
         return { ...prev, monsters: newMonsters };
      });
    });

    return () => { newSocket.disconnect(); };
  }, [playerData?.uid]);

  const useSkill = () => {
    if (!socket || skillCooldown > 0 || !joined) return;
    
    const players = roomState?.players || {};
    const monsters = roomState?.monsters || {};
    const myPos = players[socket.id]?.pos;
    if (!myPos) return;

    let nearestId: string | null = null;
    let nearestDist = Infinity;
    let isMonster = false;

    // Quét Quái vật trước (Ưu tiên PVE)
    Object.values(monsters).forEach((mob: any) => {
      if (!mob.isDead && mob.pos) {
        const dist = Math.hypot(mob.pos.x - myPos.x, mob.pos.y - myPos.y);
        if (dist < nearestDist && dist < 120) { // Tầm đánh 120px
           nearestDist = dist;
           nearestId = mob.id;
           isMonster = true;
        }
      }
    });

    // Nếu không có quái, quét Người chơi (PvP)
    if (!nearestId) {
       Object.values(players).forEach((p: any) => {
         if (p.socketId !== socket.id && p.hp > 0) {
           const dist = Math.hypot(p.pos.x - myPos.x, p.pos.y - myPos.y);
           if (dist < nearestDist && dist < 120) {
              nearestDist = dist;
              nearestId = p.socketId;
              isMonster = false;
           }
         }
       });
    }

    if (nearestId) {
      const targetPos = isMonster ? monsters[nearestId].pos : players[nearestId].pos;
      socket.emit('use_skill', { roomId, skillType: 'basic', targetPos });
      
      const dmg = (playerData.stats?.atk || 15) * 2;
      socket.emit('attack', { roomId, targetId: nearestId, damage: dmg, isMonster });
      
      setBattleLog(prev => [...prev, `Lưỡng Nghi Kiếm: ${dmg} sát thương!`]);
      
      setSkillCooldown(2);
      const timer = setInterval(() => {
        setSkillCooldown(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
      }, 1000);
    }
  };

  const players = roomState?.players || {};
  const myPlayer = players[socket?.id || ''];

  return (
    <div className="relative w-full h-full bg-[#0a0604] overflow-hidden font-serif select-none">
      
      {/* Layer 0: Phaser Engine (full screen) */}
      <div className="absolute inset-0 z-0">
        {socket && joined && (
          <PhaserGame
            socket={socket}
            roomState={roomState}
            myId={socket.id || ''}
            playerData={playerData}
            roomId={roomId}
          />
        )}
      </div>

      {/* Layer 1: HUD Overlay — pointer-events-none trừ các nút */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-2 landscape:p-3">
        
        {/* === TOP BAR === */}
        <div className="flex justify-between items-start w-full gap-2">
           
           {/* Avatar + HP/MP */}
           <div className="flex items-start gap-1.5 pointer-events-auto shrink-0">
              <button 
                onClick={onOpenProfile}
                className="w-10 h-10 landscape:w-14 landscape:h-14 rounded-full border-2 border-[#d4b86a] bg-[#2e1c14] shadow-[0_0_10px_black] overflow-hidden active:scale-95 transition-transform"
              >
                <img src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${playerData.uid}`} alt="Avatar" className="w-full h-full" />
              </button>
              
              <div className="flex flex-col gap-0.5 mt-0.5 landscape:mt-1.5 min-w-0">
                {/* Name + Level */}
                <div className="flex items-center gap-1 bg-black/70 pr-4 pl-1 rounded-sm">
                  <span className="text-[9px] landscape:text-[11px] font-bold text-[#fce296] truncate max-w-[60px] landscape:max-w-[100px]">{playerData.displayName}</span>
                  <span className="text-[7px] landscape:text-[9px] text-[#b89947] bg-[#2e1c14] border border-[#d4b86a]/50 px-0.5 rounded-sm shrink-0">Lv.{playerData.level}</span>
                </div>
                
                {/* HP Bar */}
                <div className="w-20 landscape:w-28 h-[6px] landscape:h-[8px] bg-black border border-[#7d4829] rounded-[1px] overflow-hidden relative">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#8b0000] to-[#ff4d4d] transition-all duration-300"
                    style={{ width: `${myPlayer ? (myPlayer.hp / 100) * 100 : 100}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-[5px] landscape:text-[7px] text-white/80 font-mono">
                    {myPlayer ? Math.ceil(myPlayer.hp) : 100}/100
                  </div>
                </div>
                
                {/* MP Bar */}
                <div className="w-16 landscape:w-24 h-[5px] landscape:h-[7px] bg-black border border-[#7d4829] rounded-[1px] overflow-hidden relative">
                  <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-[#004080] to-[#4da6ff]" />
                </div>
              </div>
           </div>

           {/* Mini Map */}
           <div className="pointer-events-auto shrink-0">
             <div className="w-14 h-14 landscape:w-20 landscape:h-20 rounded-full border-2 border-[#b89947]/70 bg-black/50 shadow-[0_0_10px_black] overflow-hidden relative backdrop-blur-sm">
               <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '8px 8px' }} />
               <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-[#fce296] rounded-full shadow-[0_0_4px_#fce296] -translate-x-1/2 -translate-y-1/2 z-10" />
               <div className="absolute bottom-0.5 w-full text-center z-20">
                 <span className="text-[6px] landscape:text-[8px] text-[#fce296] bg-black/80 px-1 rounded font-bold">Tân Thủ Thôn</span>
               </div>
             </div>
           </div>
        </div>

        {/* === BOTTOM BAR === */}
        <div className="w-full flex items-end gap-1.5 landscape:gap-2">
            
            {/* Chat Log */}
            <div className="flex-1 min-w-0 max-w-[140px] landscape:max-w-[220px] h-[50px] landscape:h-[70px] bg-black/60 border border-[#b89947]/30 backdrop-blur-sm pointer-events-auto p-1 overflow-hidden">
              <div className="h-full overflow-y-auto flex flex-col justify-end text-[6px] landscape:text-[8px] font-mono leading-tight space-y-0.5 scrollbar-hide">
                <div className="text-[#4da6ff]">[Thế giới] Bôn Ba: PT x2 anh em</div>
                {battleLog.slice(-3).map((log, i) => (
                  <div key={i} className="text-[#d4b86a]">{log}</div>
                ))}
              </div>
            </div>

            {/* Skill Hotbar */}
            <div className="pointer-events-auto flex gap-1 landscape:gap-1.5 items-end justify-center pb-0.5">
                {/* Bình Máu */}
                <button className="w-8 h-8 landscape:w-10 landscape:h-10 rounded-full border border-red-500/40 bg-[#8b0000]/50 flex items-center justify-center shadow-[inset_0_0_8px_black] active:scale-90 transition-transform">
                  <Heart size={14} className="text-red-400" />
                </button>
                {/* Bình Mana */}
                <button className="w-8 h-8 landscape:w-10 landscape:h-10 rounded-full border border-blue-500/40 bg-[#004080]/50 flex items-center justify-center shadow-[inset_0_0_8px_black] active:scale-90 transition-transform">
                  <Droplets size={14} className="text-blue-400" />
                </button>
                
                {/* Nút Đánh Chính */}
                <button 
                  onClick={useSkill}
                  disabled={skillCooldown > 0}
                  className={`w-12 h-12 landscape:w-16 landscape:h-16 rounded-full border-2 flex items-center justify-center transition-all active:scale-95 relative overflow-hidden ${
                    skillCooldown > 0 
                      ? 'border-gray-600 bg-gray-800/80' 
                      : 'border-[#d4b86a] bg-gradient-to-br from-[#7d4829] to-[#2e1c14] shadow-[0_0_12px_rgba(184,153,71,0.3)]'
                  }`}
                >
                  <Sword size={20} className={skillCooldown > 0 ? 'text-gray-500' : 'text-[#fce296]'} />
                  {skillCooldown > 0 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-[#fce296] font-mono text-lg font-bold">{skillCooldown}</span>
                    </div>
                  )}
                </button>
            </div>

            {/* Right Buttons */}
            <div className="flex gap-1 items-end shrink-0 pointer-events-auto">
              <button onClick={onOpenProfile} className="w-7 h-7 landscape:w-9 landscape:h-9 rounded-full border border-[#b89947]/40 bg-[#2e1c14]/80 flex items-center justify-center active:scale-90 transition-transform" title="Nhân vật">
                <Settings size={12} className="text-[#b89947]" />
              </button>
              <button className="w-7 h-7 landscape:w-9 landscape:h-9 rounded-full border border-[#b89947]/40 bg-[#2e1c14]/80 flex items-center justify-center active:scale-90 transition-transform" title="Bạn bè">
                <Users size={12} className="text-[#b89947]" />
              </button>
            </div>
        </div>
      </div>

      {/* Winner Overlay */}
      <AnimatePresence>
        {winner && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center pointer-events-none">
            <Trophy size={60} className="text-[#fce296] mb-3" />
            <h2 className="text-2xl landscape:text-4xl font-black uppercase vltk-text-title">{winner}</h2>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
