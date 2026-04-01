// ===== Hệ Thống Ngũ Hành & Môn Phái =====

export type Element = 'kim' | 'moc' | 'thuy' | 'hoa' | 'tho';

// Ma trận khắc chế Ngũ Hành
export const ELEMENT_MATRIX: Record<Element, { beats: Element; losesTo: Element }> = {
  kim:  { beats: 'moc', losesTo: 'hoa' },
  moc:  { beats: 'tho', losesTo: 'kim' },
  tho:  { beats: 'thuy', losesTo: 'moc' },
  thuy: { beats: 'hoa', losesTo: 'tho' },
  hoa:  { beats: 'kim', losesTo: 'thuy' },
};

export function getElementModifier(attacker: Element, defender: Element): number {
  if (ELEMENT_MATRIX[attacker].beats === defender) return 0.3;   // Khắc: +30%
  if (ELEMENT_MATRIX[attacker].losesTo === defender) return -0.2; // Bị khắc: -20%
  return 0; // Trung tính
}

// ===== Môn Phái =====
export interface Faction {
  id: string;
  name: string;
  element: Element;
  description: string;
  baseStats: { hp: number; atk: number; def: number; spd: number };
  color: string; // hex color for UI
}

export const FACTIONS: Faction[] = [
  {
    id: 'thieu_lam', name: 'Thiếu Lâm', element: 'kim',
    description: 'Ngoại Công phòng thủ, lấy cương khắc nhu.',
    baseStats: { hp: 150, atk: 12, def: 10, spd: 3 },
    color: '#FFD700',
  },
  {
    id: 'nga_mi', name: 'Nga Mi', element: 'moc',
    description: 'Nội Công hồi phục, lấy nhu khắc cương.',
    baseStats: { hp: 120, atk: 8, def: 6, spd: 5 },
    color: '#90EE90',
  },
  {
    id: 'cai_bang', name: 'Cái Bang', element: 'thuy',
    description: 'Tốc chiến tốc thắng, đò đánh như mưa.',
    baseStats: { hp: 100, atk: 14, def: 4, spd: 8 },
    color: '#87CEEB',
  },
  {
    id: 'con_lon', name: 'Côn Lôn', element: 'hoa',
    description: 'Hỏa công khu vực, thiêu đốt quần hùng.',
    baseStats: { hp: 110, atk: 16, def: 5, spd: 4 },
    color: '#FF6347',
  },
  {
    id: 'duong_mon', name: 'Đường Môn', element: 'tho',
    description: 'Ám khí độc dược, giết người vô hình.',
    baseStats: { hp: 90, atk: 13, def: 3, spd: 7 },
    color: '#DEB887',
  },
];

// ===== Chiêu Thức =====
export interface Skill {
  id: string;
  name: string;
  factionId: string;
  unlockLevel: number;
  cooldown: number;   // seconds
  multiplier: number; // damage multiplier
  range: number;      // pixels
  isAoe: boolean;
  aoeRadius?: number;
  description: string;
  effectType?: 'damage' | 'buff_def' | 'buff_atk' | 'heal' | 'dot';
  effectValue?: number;
  effectDuration?: number; // seconds
}

export const SKILLS: Skill[] = [
  // Thiếu Lâm
  { id: 'tl_1', name: 'Kim Cương Quyền', factionId: 'thieu_lam', unlockLevel: 1, cooldown: 1, multiplier: 1, range: 50, isAoe: false, description: 'Đấm thẳng, sát thương cơ bản.' },
  { id: 'tl_2', name: 'La Hán Phục Hổ', factionId: 'thieu_lam', unlockLevel: 3, cooldown: 3, multiplier: 1.5, range: 60, isAoe: true, aoeRadius: 40, description: 'Quyền phong tỏa diện rộng.' },
  { id: 'tl_3', name: 'Kim Chung Tráo', factionId: 'thieu_lam', unlockLevel: 8, cooldown: 8, multiplier: 0, range: 0, isAoe: false, description: 'Tăng DEF +50% trong 5 giây.', effectType: 'buff_def', effectValue: 0.5, effectDuration: 5 },
  { id: 'tl_4', name: 'Nhất Dương Chỉ', factionId: 'thieu_lam', unlockLevel: 15, cooldown: 20, multiplier: 3, range: 80, isAoe: false, description: 'Xuyên giáp 50%, sát thương khủng.' },

  // Nga Mi
  { id: 'nm_1', name: 'Phong Hoa Kiếm', factionId: 'nga_mi', unlockLevel: 1, cooldown: 1, multiplier: 1, range: 50, isAoe: false, description: 'Kiếm pháp cơ bản.' },
  { id: 'nm_2', name: 'Thanh Phong Minh Nguyệt', factionId: 'nga_mi', unlockLevel: 3, cooldown: 3, multiplier: 1.3, range: 60, isAoe: false, description: 'Kiếm khí xa, 1.3x sát thương.' },
  { id: 'nm_3', name: 'Từ Bi Hồi Xuân', factionId: 'nga_mi', unlockLevel: 8, cooldown: 10, multiplier: 0, range: 0, isAoe: false, description: 'Hồi 30% HP.', effectType: 'heal', effectValue: 0.3 },
  { id: 'nm_4', name: 'Diệt Ma Kiếm Pháp', factionId: 'nga_mi', unlockLevel: 15, cooldown: 18, multiplier: 2.5, range: 70, isAoe: true, aoeRadius: 50, description: 'Kiếm trận vùng rộng.' },

  // Cái Bang
  { id: 'cb_1', name: 'Đả Cẩu Bổng', factionId: 'cai_bang', unlockLevel: 1, cooldown: 0.8, multiplier: 0.9, range: 45, isAoe: false, description: 'Đánh nhanh liên hoàn.' },
  { id: 'cb_2', name: 'Hàng Long Thập Bát Chưởng', factionId: 'cai_bang', unlockLevel: 3, cooldown: 3, multiplier: 1.8, range: 55, isAoe: false, description: 'Chưởng lực mãnh liệt.' },
  { id: 'cb_3', name: 'Túy Quyền', factionId: 'cai_bang', unlockLevel: 8, cooldown: 7, multiplier: 1.2, range: 40, isAoe: true, aoeRadius: 35, description: 'Say mà đánh loạn, AoE nhỏ.', effectType: 'buff_atk', effectValue: 0.3, effectDuration: 4 },
  { id: 'cb_4', name: 'Thiên Hạ Vô Cẩu', factionId: 'cai_bang', unlockLevel: 15, cooldown: 15, multiplier: 3.5, range: 60, isAoe: false, description: 'Toàn lực nhất kích.' },

  // Côn Lôn
  { id: 'kl_1', name: 'Hỏa Diệm Chưởng', factionId: 'con_lon', unlockLevel: 1, cooldown: 1.2, multiplier: 1.1, range: 55, isAoe: false, description: 'Chưởng lửa cơ bản.' },
  { id: 'kl_2', name: 'Liệt Hỏa Đao', factionId: 'con_lon', unlockLevel: 3, cooldown: 3, multiplier: 1.4, range: 50, isAoe: true, aoeRadius: 45, description: 'Lửa lan rộng.' },
  { id: 'kl_3', name: 'Phần Thiên Hỏa Vũ', factionId: 'con_lon', unlockLevel: 8, cooldown: 9, multiplier: 0.8, range: 80, isAoe: true, aoeRadius: 60, description: 'Mưa lửa thiêu đốt trong 3s.', effectType: 'dot', effectValue: 5, effectDuration: 3 },
  { id: 'kl_4', name: 'Cửu Dương Chân Kinh', factionId: 'con_lon', unlockLevel: 15, cooldown: 22, multiplier: 2.8, range: 90, isAoe: true, aoeRadius: 70, description: 'Thiêu hủy toàn vùng.' },

  // Đường Môn
  { id: 'dm_1', name: 'Phi Tiêu', factionId: 'duong_mon', unlockLevel: 1, cooldown: 0.7, multiplier: 0.8, range: 100, isAoe: false, description: 'Ám khí tầm xa.' },
  { id: 'dm_2', name: 'Vạn Tiễn Tề Phát', factionId: 'duong_mon', unlockLevel: 3, cooldown: 4, multiplier: 1.2, range: 90, isAoe: true, aoeRadius: 50, description: 'Mưa ám khí.' },
  { id: 'dm_3', name: 'Độc Phấn Mê Hồn', factionId: 'duong_mon', unlockLevel: 8, cooldown: 8, multiplier: 0.5, range: 70, isAoe: true, aoeRadius: 40, description: 'Giảm SPD mục tiêu 50% trong 4s.', effectType: 'dot', effectValue: 3, effectDuration: 4 },
  { id: 'dm_4', name: 'Bách Bộ Xuyên Dương', factionId: 'duong_mon', unlockLevel: 15, cooldown: 16, multiplier: 4, range: 120, isAoe: false, description: 'Một phát trí mạng, tầm siêu xa.' },
];

// ===== Quái vật =====
export interface MonsterDef {
  id: string;
  name: string;
  level: number;
  hp: number;
  atk: number;
  def: number;
  expDrop: number;
  element?: Element;
  aggressive: boolean;
  moveSpeed: number;
  attackRange: number;
  spriteIndex: number; // 0-3 trong spritesheet
  respawnTime: number; // seconds
}

export const MONSTERS: MonsterDef[] = [
  { id: 'ga_rung', name: 'Gà Rừng', level: 1, hp: 30, atk: 3, def: 1, expDrop: 5, aggressive: false, moveSpeed: 40, attackRange: 30, spriteIndex: 0, respawnTime: 10 },
  { id: 'ran_xanh', name: 'Rắn Xanh', level: 2, hp: 50, atk: 6, def: 2, expDrop: 10, element: 'moc', aggressive: true, moveSpeed: 60, attackRange: 35, spriteIndex: 1, respawnTime: 15 },
  { id: 'soi_hoang', name: 'Sói Hoang', level: 3, hp: 80, atk: 10, def: 4, expDrop: 18, aggressive: true, moveSpeed: 80, attackRange: 40, spriteIndex: 2, respawnTime: 20 },
  { id: 'son_tac', name: 'Sơn Tặc', level: 5, hp: 120, atk: 15, def: 8, expDrop: 30, element: 'kim', aggressive: true, moveSpeed: 50, attackRange: 45, spriteIndex: 3, respawnTime: 30 },
];

// ===== NPC =====
export interface NpcDef {
  id: string;
  name: string;
  title: string;
  x: number; // tile x
  y: number; // tile y
  spriteIndex: number; // 0-3 trong spritesheet
  dialogue: string[];
  shopItems?: string[];
  questId?: string;
}

export const NPCS: NpcDef[] = [
  {
    id: 'truong_thon', name: 'Lý Trưởng', title: 'Trưởng Thôn',
    x: 30, y: 28, spriteIndex: 0,
    dialogue: [
      'Chào hiệp sĩ trẻ! Ta là Lý Trưởng, trưởng thôn Ba Lăng.',
      'Vùng đất này đang bị Gà Rừng và Sói Hoang quấy phá.',
      'Hãy giúp ta diệt 5 con Gà Rừng ở phía Bắc, ta sẽ thưởng 50 EXP!',
    ],
    questId: 'quest_ga_rung',
  },
  {
    id: 'thay_thuoc', name: 'Trần Dược Sư', title: 'Thầy Thuốc',
    x: 38, y: 26, spriteIndex: 1,
    dialogue: [
      'Hồi sinh huyệt, tẩy uế thân. Ta có thể chữa lành vết thương cho ngươi.',
      'Mỗi 3 phút, ta sẽ hồi phục HP một lần miễn phí.',
    ],
    shopItems: ['binh_mau_nho', 'binh_mana_nho'],
  },
  {
    id: 'lo_duc', name: 'Vương Đúc Sư', title: 'Lò Đúc KNB',
    x: 40, y: 32, spriteIndex: 2,
    dialogue: [
      'Muốn đổi Chân Khí thành vàng ư? Đưa EXP đây, ta sẽ luyện cho!',
      'Cứ 100 điểm Chân Khí = 1 KNB. Đúc xong thì mất EXP đấy nhé.',
    ],
  },
  {
    id: 'su_phu', name: 'Phong Sư Phụ', title: 'Chưởng Môn',
    x: 26, y: 22, spriteIndex: 3,
    dialogue: [
      'Ta là Phong, người canh giữ bí kíp Ngũ Hành tại Ba Lăng.',
      'Khi ngươi đạt cấp 3, hãy quay lại đây. Ta sẽ truyền thụ chiêu thức cho ngươi.',
      'Hãy chọn Môn Phái phù hợp với tâm tính của mình!',
    ],
  },
];

// ===== Bản đồ Tân Thủ Thôn — Ba Lăng Huyện =====
// Tile Legend: 0=cỏ, 1=đường, 2=nước, 3=tre(collision), 4=nhà, 5=tường, 6=cổng, 7=hoa
// Map 40x30 tiles (1280x960 px)
export const MAP_WIDTH = 40;
export const MAP_HEIGHT = 30;
export const TILE_SIZE = 32;

export const MAP_DATA: number[][] = [
  // Row 0-4: Rừng tre phía Bắc + vùng quái Gà Rừng
  [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
  [3,0,0,0,0,0,0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,0,7,0,0,3],
  [3,0,0,0,0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,0,7,0,0,0,0,3],
  // Row 5-9: Suối + Cỏ
  [3,0,0,0,0,0,0,0,0,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  // Row 10-14: Khu vực làng trung tâm (safe zone)
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,5,5,5,1,0,0,0,1,5,5,5,5,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,4,4,0,1,0,0,0,1,0,4,4,5,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,4,0,0,0,0,0,0,0,0,0,4,5,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,0,7,0,0,0,0,0,0,3],
  // Row 15-19: Làng trung tâm (spawn point ở đây)
  [3,0,0,0,0,0,0,0,0,0,0,0,0,1,1,6,1,1,0,0,0,0,0,0,1,1,6,1,1,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,1,1,1,1,1,1,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  // Row 20-24: Vùng quái phía Nam (Sói, Sơn Tặc)
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  // Row 25-29: Biên giới phía Nam
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,0,7,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
];

// Collision tiles (không được đi qua)
export const COLLISION_TILES = [2, 3, 4, 5];

// Spawn point mặc định cho người chơi mới
export const SPAWN_POINT = { x: 20 * TILE_SIZE + 16, y: 17 * TILE_SIZE + 16 };

// Vùng quái spawn
export interface MonsterZone {
  monsterId: string;
  count: number;
  area: { x1: number; y1: number; x2: number; y2: number }; // tile coords
}

export const MONSTER_ZONES: MonsterZone[] = [
  // Vùng Bắc: Gà Rừng + Rắn
  { monsterId: 'ga_rung', count: 6, area: { x1: 1, y1: 1, x2: 38, y2: 7 } },
  { monsterId: 'ran_xanh', count: 4, area: { x1: 1, y1: 4, x2: 38, y2: 9 } },
  // Vùng Nam: Sói + Sơn Tặc
  { monsterId: 'soi_hoang', count: 5, area: { x1: 1, y1: 20, x2: 38, y2: 27 } },
  { monsterId: 'son_tac', count: 3, area: { x1: 1, y1: 23, x2: 38, y2: 28 } },
];

// Safe zone (không spawn quái, không PK)
export const SAFE_ZONE = { x1: 13, y1: 11, x2: 28, y2: 19 }; // tile coords

// Damage formula
export function calculateDamage(
  atkStat: number,
  defStat: number,
  skillMultiplier: number,
  attackerElement?: Element,
  defenderElement?: Element
): number {
  const baseDmg = atkStat * skillMultiplier - defStat * 0.5;
  let elementBonus = 0;
  if (attackerElement && defenderElement) {
    elementBonus = baseDmg * getElementModifier(attackerElement, defenderElement);
  }
  const finalDmg = Math.max(1, baseDmg + elementBonus) * (0.9 + Math.random() * 0.2);
  return Math.round(finalDmg);
}
