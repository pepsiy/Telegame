import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { Socket } from 'socket.io-client';
import nipplejs from 'nipplejs';
import { MAP_DATA, MAP_WIDTH, MAP_HEIGHT, TILE_SIZE, COLLISION_TILES, SPAWN_POINT, NPCS, MONSTERS, MONSTER_ZONES, SAFE_ZONE, NpcDef, MonsterDef } from '../data/gameData';

interface PhaserGameProps {
  socket: Socket | null;
  roomState: any;
  myId: string;
  playerData: any;
  roomId: string;
}

// Tile colors mapping (procedural - no spritesheet dependency)
const TILE_COLORS: Record<number, number> = {
  0: 0x3a6b35, // cỏ
  1: 0x8B7355, // đường mòn
  2: 0x4682B4, // nước
  3: 0x2d5a27, // tre (collision)
  4: 0x8B4513, // nhà tranh
  5: 0x696969, // tường gạch
  6: 0xB8860B, // cổng
  7: 0xFF69B4, // hoa
};

interface MonsterInstance {
  id: string;
  def: MonsterDef;
  hp: number;
  x: number;
  y: number;
  container: Phaser.GameObjects.Container;
  hpBar: Phaser.GameObjects.Rectangle;
  targetX: number;
  targetY: number;
  moveTimer: number;
  isDead: boolean;
  respawnTimer: number;
}

class VLTKScene extends Phaser.Scene {
  players: Record<string, Phaser.GameObjects.Container> = {};
  npcContainers: Phaser.GameObjects.Container[] = [];
  monsterContainers: Record<string, Phaser.GameObjects.Container> = {};
  joystickData = { dx: 0, dy: 0 };
  socket: Socket | null = null;
  myId = '';
  roomId = '';
  
  constructor() {
    super({ key: 'VLTKScene' });
  }

  preload() {
    this.load.spritesheet('monsters', '/assets/sprites/monsters.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('npcs', '/assets/sprites/npcs.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('player', '/assets/sprites/player.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('tileset', '/assets/sprites/tileset.png', { frameWidth: 32, frameHeight: 32 });
  }

  create() {
    const mapPixelW = MAP_WIDTH * TILE_SIZE;
    const mapPixelH = MAP_HEIGHT * TILE_SIZE;

    // Draw tilemap procedurally
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileId = MAP_DATA[y][x];
        
        let frameIndex = 0; // Mặc định Cỏ (Ô 0)
        if (tileId === 1) frameIndex = 1; // Đường Đất (Ô 1)
        else if (tileId === 2) frameIndex = 3; // Nước (Ô 3)
        // Đá, Tre, Tường gạch dùng Tường Đá (Ô 2)
        else if (tileId === 3 || tileId === 4 || tileId === 5 || tileId === 6) frameIndex = 2; 
        else if (tileId === 7) frameIndex = 4; // Hoa (Ô 4)
        
        const tileSprite = this.add.sprite(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          'tileset',
          frameIndex
        );

        // Water shimmer (Hiệu ứng mặt nước phản chiếu)
        if (tileId === 2) {
          this.tweens.add({
            targets: tileSprite, alpha: 0.8, yoyo: true, repeat: -1,
            duration: 1500 + Math.random() * 500, ease: 'Sine.easeInOut'
          });
        }
      }
    }

    // Draw safe zone border (faint)
    const sz = SAFE_ZONE;
    this.add.rectangle(
      (sz.x1 + (sz.x2 - sz.x1) / 2) * TILE_SIZE,
      (sz.y1 + (sz.y2 - sz.y1) / 2) * TILE_SIZE,
      (sz.x2 - sz.x1) * TILE_SIZE,
      (sz.y2 - sz.y1) * TILE_SIZE,
      0xFFD700, 0.04
    ).setStrokeStyle(1, 0xFFD700, 0.15);

    // Draw NPCs
    NPCS.forEach(npc => this.createNpc(npc));

    // Setup camera
    this.cameras.main.setBounds(0, 0, mapPixelW, mapPixelH);
    this.cameras.main.setZoom(2.5); // Phóng to Camera để nhìn rõ Pixel Art
    this.physics.world.setBounds(0, 0, mapPixelW, mapPixelH);

    // Create Animations for Player
    if (!this.anims.exists('walk_down')) {
      this.anims.create({ key: 'walk_down', frames: this.anims.generateFrameNumbers('player', { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
      this.anims.create({ key: 'walk_right', frames: this.anims.generateFrameNumbers('player', { start: 6, end: 11 }), frameRate: 10, repeat: -1 });
      this.anims.create({ key: 'walk_left', frames: this.anims.generateFrameNumbers('player', { start: 12, end: 17 }), frameRate: 10, repeat: -1 });
      this.anims.create({ key: 'walk_up', frames: this.anims.generateFrameNumbers('player', { start: 18, end: 22 }), frameRate: 10, repeat: -1 });
    }

    // Keyboard
    this.input.keyboard!.createCursorKeys();
  }

  createNpc(npc: NpcDef) {
    const px = npc.x * TILE_SIZE + 16;
    const py = npc.y * TILE_SIZE + 16;
    const c = this.add.container(px, py);

    // Body using real pixel art
    const body = this.add.sprite(0, 0, 'npcs', npc.spriteIndex);
    
    // Head indicator (yellow diamond for NPC)
    const indicator = this.add.polygon(0, -28, [[0, -6], [6, 0], [0, 6], [-6, 0]], 0xFFD700);
    this.tweens.add({ targets: indicator, y: -32, yoyo: true, repeat: -1, duration: 800, ease: 'Sine.easeInOut' });

    // Name
    const nameTag = this.add.text(0, -42, npc.name, {
      fontSize: '10px', color: '#FFD700', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5);

    const titleTag = this.add.text(0, 24, `[${npc.title}]`, {
      fontSize: '8px', color: '#90EE90',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5);

    c.add([body, indicator, nameTag, titleTag]);
    c.setDepth(5);
    this.npcContainers.push(c);
  }

  update(_time: number, delta: number) {
    if (!this.socket || !this.myId) return;
    const dt = delta / 1000;
    const speed = 150;
    let dx = 0, dy = 0;

    // Keyboard
    const cursors = this.input.keyboard!.createCursorKeys();
    if (cursors.left.isDown) dx = -1;
    else if (cursors.right.isDown) dx = 1;
    if (cursors.up.isDown) dy = -1;
    else if (cursors.down.isDown) dy = 1;

    // Joystick
    if (this.joystickData.dx !== 0 || this.joystickData.dy !== 0) {
      dx = this.joystickData.dx;
      dy = this.joystickData.dy;
    }

    // Move player
    if ((dx !== 0 || dy !== 0) && this.players[this.myId]) {
      const me = this.players[this.myId];
      const body = me.getByName('playerSprite') as Phaser.GameObjects.Sprite;
      
      if (body) {
        if (dx < 0) body.play('walk_left', true);
        else if (dx > 0) body.play('walk_right', true);
        else if (dy < 0) body.play('walk_up', true);
        else if (dy > 0) body.play('walk_down', true);
      }

      let newX = me.x + dx * speed * dt;
      let newY = me.y + dy * speed * dt;

      // Tile collision check
      const tileX = Math.floor(newX / TILE_SIZE);
      const tileY = Math.floor(newY / TILE_SIZE);
      if (tileX >= 0 && tileX < MAP_WIDTH && tileY >= 0 && tileY < MAP_HEIGHT) {
        if (!COLLISION_TILES.includes(MAP_DATA[tileY][tileX])) {
          me.setPosition(newX, newY);
          this.socket.emit('move', { roomId: this.roomId, pos: { x: newX, y: newY } });
        }
      }
    } else if (this.players[this.myId]) {
      // Dừng lại khi không bấm nút
      const body = this.players[this.myId].getByName('playerSprite') as Phaser.GameObjects.Sprite;
      if (body) {
         body.stop();
         // Optionally reset to frame 0 or leave at current
      }
    }
  }

  syncPlayers(serverPlayers: any, currentUserId: string) {
    if (!this.sys?.isActive() || !this.cameras?.main) return;
    const serverIds = Object.keys(serverPlayers);

    // Remove disconnected
    for (const id in this.players) {
      if (!serverIds.includes(id)) {
        this.players[id].destroy();
        delete this.players[id];
      }
    }

    // Add/update
    for (const id in serverPlayers) {
      const p = serverPlayers[id];
      if (!this.players[id]) {
        const isMe = id === currentUserId;
        const container = this.add.container(p.pos.x, p.pos.y);
        // Character body (Sử dụng frame của player.png)
        const body = this.add.sprite(0, 0, 'player', 0);
        body.name = 'playerSprite';
        // Không dùng Tint để giữ nguyên màu gốc của Pixel Art
        
        // Name
        const name = this.add.text(0, -28, p.displayName || 'Hiệp Sĩ', {
          fontSize: '9px', color: isMe ? '#FFD700' : '#FFFFFF',
          fontStyle: 'bold', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5);

        container.add([body, name]);
        container.setDepth(10);
        this.players[id] = container;

        if (isMe) {
          this.cameras.main.startFollow(container, true, 0.08, 0.08);
        }
      } else if (id !== currentUserId) {
        this.tweens.add({
          targets: this.players[id],
          x: p.pos.x, y: p.pos.y,
          duration: 100
        });
      }
    }
  }

  syncMonsters(serverMonsters: any) {
    if (!this.sys?.isActive() || !this.cameras?.main || !serverMonsters) return;
    const serverIds = Object.keys(serverMonsters);

    // Gỡ quái không tồn tại
    for (const id in this.monsterContainers) {
      if (!serverIds.includes(id)) {
        this.monsterContainers[id].destroy();
        delete this.monsterContainers[id];
      }
    }

    // Cập nhật/Thêm quái mới
    for (const id in serverMonsters) {
      const mob = serverMonsters[id];
      const def = MONSTERS.find(m => m.id === mob.defId);
      if (!def) continue;

      if (!this.monsterContainers[id] && !mob.isDead) { // Tạo mới
        const c = this.add.container(mob.pos.x, mob.pos.y);
        const body = this.add.sprite(0, 0, 'monsters', def.spriteIndex);
        const nameTag = this.add.text(0, -20, `${def.name} Lv.${def.level}`, {
          fontSize: '8px', color: '#FF6666', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5);
        const hpBg = this.add.rectangle(0, -14, 28, 4, 0x000000);
        const hpBar = this.add.rectangle(-14, -14, 28 * (mob.hp/mob.maxHp), 4, 0xFF0000).setOrigin(0, 0.5);
        hpBar.name = "hpBar"; // Đánh dấu để query

        c.add([body, nameTag, hpBg, hpBar]);
        c.setDepth(3);
        this.monsterContainers[id] = c;
      } else if (this.monsterContainers[id] && mob.isDead) { // Chết
        this.monsterContainers[id].destroy();
        delete this.monsterContainers[id];
      } else if (this.monsterContainers[id] && !mob.isDead) { // Cập nhật (di chuyển, HP)
        const c = this.monsterContainers[id];
        const hpBar = c.getByName("hpBar") as Phaser.GameObjects.Rectangle;
        if (hpBar) {
           hpBar.width = Math.max(0, 28 * (mob.hp/mob.maxHp));
        }
        this.tweens.add({ targets: c, x: mob.pos.x, y: mob.pos.y, duration: 100 });
      }
    }
  }
}

export function PhaserGame({ socket, roomState, myId, playerData, roomId }: PhaserGameProps) {
  const gameRef = useRef<HTMLDivElement>(null);
  const joystickRef = useRef<HTMLDivElement>(null);
  const phaserGame = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<VLTKScene | null>(null);

  useEffect(() => {
    if (!gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: '100%',
      height: '100%',
      parent: gameRef.current,
      backgroundColor: '#1a0f0a',
      physics: { default: 'arcade' },
      scene: VLTKScene,
      pixelArt: true, // Crispy pixel rendering
    };

    phaserGame.current = new Phaser.Game(config);

    phaserGame.current.events.on('ready', () => {
      const scene = phaserGame.current?.scene.getScene('VLTKScene') as VLTKScene;
      scene.socket = socket;
      scene.myId = myId;
      scene.roomId = roomId;
      sceneRef.current = scene;
      if (roomState?.players) {
         scene.syncPlayers(roomState.players, myId);
      }
      if (roomState?.monsters) {
         scene.syncMonsters(roomState.monsters);
      }
    });

    // NippleJS joystick
    if (joystickRef.current) {
      const manager = nipplejs.create({
        zone: joystickRef.current,
        mode: 'dynamic',
        color: 'rgba(184,153,71,0.4)',
        size: 90
      });
      (manager as any).on('move', (_evt: any, data: any) => {
        if (sceneRef.current && data.vector) {
          sceneRef.current.joystickData = { dx: data.vector.x, dy: -data.vector.y };
        }
      });
      (manager as any).on('end', () => {
        if (sceneRef.current) sceneRef.current.joystickData = { dx: 0, dy: 0 };
      });
    }

    return () => { phaserGame.current?.destroy(true); };
  }, []);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.socket = socket;
      sceneRef.current.myId = myId;
      sceneRef.current.roomId = roomId;
      if (roomState) {
         sceneRef.current.syncPlayers(roomState.players || {}, myId);
         sceneRef.current.syncMonsters(roomState.monsters || {});
      }
    }
  }, [roomState, socket, myId, roomId]);

  return (
    <div className="w-full h-full relative">
      <div ref={gameRef} className="w-full h-full" />
      <div ref={joystickRef} className="absolute inset-0 z-[5]" />
    </div>
  );
}
