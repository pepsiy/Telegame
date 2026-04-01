import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
import { MONSTERS, MONSTER_ZONES, TILE_SIZE, SAFE_ZONE, COLLISION_TILES, MAP_DATA } from "./src/data/gameData.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;

// Battle rooms state
const rooms: Record<string, any> = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_room", (data) => {
    const { roomId, userId, displayName, pos, stats } = data;
    socket.join(roomId);
    
    if (!rooms[roomId]) {
      rooms[roomId] = { players: {}, monsters: {} };
      
      // Khởi tạo quái vật cho phòng mới
      let mIdx = 0;
      MONSTER_ZONES.forEach(zone => {
        const def = MONSTERS.find(m => m.id === zone.monsterId);
        if (!def) return;
        for (let i = 0; i < zone.count; i++) {
          const tx = Math.floor(Math.random() * (zone.area.x2 - zone.area.x1) + zone.area.x1);
          const ty = Math.floor(Math.random() * (zone.area.y2 - zone.area.y1) + zone.area.y1);
          const mId = `mob_${def.id}_${mIdx++}`;
          rooms[roomId].monsters[mId] = {
            id: mId,
            defId: def.id,
            hp: def.hp,
            maxHp: def.hp,
            pos: { x: tx * TILE_SIZE + 16, y: ty * TILE_SIZE + 16 },
            spawnArea: zone.area,
            isDead: false,
            respawnTime: 0
          };
        }
      });
    }
    
    rooms[roomId].players[socket.id] = {
      uid: userId,
      displayName,
      hp: 100,
      pos: pos || { x: 0, y: 0 },
      socketId: socket.id,
      stats: stats || { atk: 10, def: 5, maxHp: 100 }
    };

    io.to(roomId).emit("room_state", rooms[roomId]);
    console.log(`User ${userId} joined room ${roomId}`);
  });

  socket.on("move", (data) => {
    const { roomId, pos } = data;
    if (rooms[roomId] && rooms[roomId].players[socket.id]) {
      rooms[roomId].players[socket.id].pos = pos;
      // Broadcast to everyone in the room including sender for sync if needed, 
      // but usually socket.to is better for performance.
      socket.to(roomId).emit("player_moved", { socketId: socket.id, pos });
    }
  });

  socket.on("use_skill", (data) => {
    const { roomId, skillType, targetPos } = data;
    if (rooms[roomId] && rooms[roomId].players[socket.id]) {
      // Broadcast skill usage to show animations
      io.to(roomId).emit("skill_used", { 
        userId: socket.id, 
        skillType, 
        targetPos,
        pos: rooms[roomId].players[socket.id].pos,
        timestamp: Date.now()
      });
    }
  });

  socket.on("attack", (data) => {
    const { roomId, targetId, damage, isMonster } = data;
    const room = rooms[roomId];
    if (!room) return;

    if (isMonster && room.monsters[targetId] && !room.monsters[targetId].isDead) {
      // Đánh quái
      const mob = room.monsters[targetId];
      mob.hp -= damage;
      io.to(roomId).emit("monster_hit", { targetId, hp: mob.hp, damage });

      if (mob.hp <= 0) {
        mob.hp = 0;
        mob.isDead = true;
        const mobDef = MONSTERS.find(m => m.id === mob.defId);
        mob.respawnTime = Date.now() + (mobDef?.respawnTime || 10) * 1000;
        
        // Báo người chơi giết quái nhận EXP
        io.to(roomId).emit("monster_died", { 
          targetId, 
          killerId: socket.id, 
          expDrop: mobDef?.expDrop || 5 
        });
      }
    } else if (!isMonster && room.players[targetId]) {
      // Đánh người (PK)
      const targetInSafeZone = false; // TODO: Check safe zone coords
      if (targetInSafeZone) {
        socket.emit("system_msg", "Không thể PK trong vùng an toàn!");
        return;
      }
      
      room.players[targetId].hp -= damage;
      io.to(roomId).emit("player_hit", { 
        targetId, 
        hp: room.players[targetId].hp,
        damage,
        pos: room.players[targetId].pos
      });
      
      if (room.players[targetId].hp <= 0) {
        io.to(roomId).emit("battle_end", { winner: socket.id, loser: targetId });
        room.players[targetId].hp = room.players[targetId].stats.maxHp || 100; // Auto hồi sinh
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    // Cleanup rooms
    for (const roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        io.to(roomId).emit("player_left", socket.id);
        if (Object.keys(rooms[roomId].players).length === 0) {
          delete rooms[roomId]; // Hủy phòng khi không còn ai
        }
      }
    }
  });
});

// Server Game Loop cho AI Quái Vật
const TICK_RATE = 100; // 10 ticks per second
setInterval(() => {
  const now = Date.now();
  for (const roomId in rooms) {
    const room = rooms[roomId];
    if (Object.keys(room.players).length === 0) continue; // Bỏ qua nếu không có người chơi

    let monstersUpdated = false;

    for (const mId in room.monsters) {
      const mob = room.monsters[mId];
      const def = MONSTERS.find(m => m.id === mob.defId);
      if (!def) continue;

      if (mob.isDead) {
        if (now > mob.respawnTime) {
          mob.isDead = false;
          mob.hp = mob.maxHp;
          const spawnW = mob.spawnArea;
          if (spawnW) {
            mob.pos = {
               x: (Math.floor(Math.random() * (spawnW.x2 - spawnW.x1)) + spawnW.x1) * TILE_SIZE + 16,
               y: (Math.floor(Math.random() * (spawnW.y2 - spawnW.y1)) + spawnW.y1) * TILE_SIZE + 16
            };
          }
          io.to(roomId).emit("monster_respawn", { id: mId, pos: mob.pos, hp: mob.hp });
        }
        continue;
      }

      if (def.aggressive) {
        let nearestPlayer: any = null;
        let minDist = 180; // Tầm nhìn Aggro Range
        
        for (const pId in room.players) {
          const p = room.players[pId];
          const dist = Math.sqrt(Math.pow(p.pos.x - mob.pos.x, 2) + Math.pow(p.pos.y - mob.pos.y, 2));
          if (dist < minDist) {
            minDist = dist;
            nearestPlayer = p;
          }
        }

        if (nearestPlayer) {
          if (minDist <= def.attackRange) {
              // Cắn người chơi
              if (!mob.lastAttack || now - mob.lastAttack > 2000) { // Cooldown 2 giây
                 mob.lastAttack = now;
                 nearestPlayer.hp -= def.atk;
                 io.to(roomId).emit("player_hit", { targetId: nearestPlayer.socketId, hp: nearestPlayer.hp, damage: def.atk, pos: nearestPlayer.pos });
                 
                 if (nearestPlayer.hp <= 0) {
                     io.to(roomId).emit("battle_end", { winner: mId, loser: nearestPlayer.socketId });
                     nearestPlayer.hp = nearestPlayer.stats.maxHp || 100;
                     // Dịch chuyển về mốc an toàn
                     nearestPlayer.pos = { x: 20 * TILE_SIZE + 16, y: 17 * TILE_SIZE + 16 };
                     io.to(roomId).emit("player_moved", { socketId: nearestPlayer.socketId, pos: nearestPlayer.pos });
                 }
              }
          } else {
             // Đuổi theo
             const spd = def.moveSpeed * (TICK_RATE / 1000);
             const dx = nearestPlayer.pos.x - mob.pos.x;
             const dy = nearestPlayer.pos.y - mob.pos.y;
             mob.pos.x += (dx / minDist) * spd;
             mob.pos.y += (dy / minDist) * spd;
             monstersUpdated = true;
          }
        }
      }
    }

    if (monstersUpdated && Math.random() < 0.2) { 
      // Gửi tọa độ quái vật khoảng 2 lần/s để giảm băng thông
      io.to(roomId).emit("monsters_state", room.monsters);
    }
  }
}, TICK_RATE);

// Telegram Bot setup
if (process.env.TELEGRAM_BOT_TOKEN) {
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  const webAppUrl = process.env.APP_URL || "https://google.com";

  bot.start((ctx) => {
    ctx.reply(
      "Chào mừng đến với Đấu Trường Đúc EXP! Bấm nút bên dưới hoặc dùng Menu góc trái để chơi ngay.",
      Markup.keyboard([
        Markup.button.webApp("🎮 Vào Đấu Trường", webAppUrl)
      ]).resize()
    );
  });

  bot.help((ctx) => {
    ctx.reply("Sử dụng nút Play Game ở thanh Chat hoặc nút Vào Đấu Trường để mở Game.");
  });

  bot.command('stats', (ctx) => ctx.reply("Hãy vào trực tiếp đấu trường để kiểm tra cấp độ và lượng $EXP bạn có nhé."));

  bot.launch().then(() => console.log("Telegram Bot webhook/polling engine started"));

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
} else {
  console.log("No TELEGRAM_BOT_TOKEN found. Bot functionality is disabled.");
}

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
