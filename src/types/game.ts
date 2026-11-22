export type ElementType =
  | 'anemo'
  | 'pyro'
  | 'hydro'
  | 'electro'
  | 'geo'
  | 'dendro'
  | 'cryo';

export type WeaponType = 'sword' | 'claymore' | 'catalyst' | 'polearm';

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  element: ElementType;
  elementLabel: string;
  weaponType: WeaponType;
  weaponLabel: string;
  passiveTitle: string;
  passiveDesc: string;
  lore: string;
  colors: {
    skin: string;
    hair: string;
    hairAccent: string;
    outfitPrimary: string;
    outfitSecondary: string;
    cape: string;
    elementHex: string;
    goldTrim: string;
  };
  hairStyle: 'braid' | 'twintails' | 'bob' | 'spiky';
}

export type QuestionType =
  | 'multiple-choice'
  | 'true-false'
  | 'matching'
  | 'fill-blank'
  | 'ordering';

export interface MatchingPair {
  left: string;
  right: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctIndex?: number;
  correctBool?: boolean;
  pairs?: MatchingPair[];
  blankOptions?: string[];
  correctText?: string;
  orderItems?: string[];
  explanation: string;
}

export type EnemyArchetype = 'slime' | 'hilichurl' | 'guardian';

export interface EnemyLevelDef {
  level: 1 | 2 | 3;
  enemyName: string;
  enemyTitle: string;
  archetype: EnemyArchetype;
  rewardPoints: number;
  questions: Question[];
}

export type BiomeType =
  | 'mondstadt-meadow'
  | 'liyue-harbor'
  | 'bali-temple'
  | 'inazuma-crystal'
  | 'sumeru-forest'
  | 'natlan-arena'
  | 'golden-citadel'
  | 'sakura-garden'
  | 'sacred-peak';

export interface RegionDef {
  id: string;
  subjectName: string;
  fantasyName: string;
  subtitle: string;
  element: ElementType;
  biome: BiomeType;
  mapPos: { x: number; y: number };
  colors: {
    skyTop: string;
    skyHorizon: string;
    fog: string;
    groundPrimary: string;
    groundSecondary: string;
    accent: string;
  };
  levels: [EnemyLevelDef, EnemyLevelDef, EnemyLevelDef];
}

export interface ShopItem {
  id: string;
  name: string;
  category: 'weapon' | 'wings' | 'food';
  price: number;
  description: string;
  colorHex: string;
  bonusLabel: string;
}

export interface PlayerProgress {
  playerName: string;
  selectedCharacterId: string;
  points: number;
  crystals: number;
  xp: number;
  equippedWeaponId: string;
  equippedWingsId: string;
  unlockedItems: string[];
  foodCount: number;
  regionUnlockedLevel: Record<string, number>;
  regionStars: Record<string, [number, number, number]>;
  regionBestCorrect: Record<string, [number, number, number]>;
}
