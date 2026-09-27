export type CreatureAbility = 'shield' | 'oracle' | 'aggression';

export interface CreatureDefinition {
  id: string;
  name: string;
  ability: CreatureAbility;
  description: string;
  spriteName: string;
  emoji: string;
  rarity: 'common' | 'uncommon' | 'rare';
  minSector: number;
  bondDifficulty: number; // 1-5, affects how nervous the creature gets
  stats: {
    damageReduction?: number;
    reviveHP?: number;
    reviveOncePerBattle?: boolean;
    revealsEnemyChoice?: boolean;
    tacticsWinDamageBoost?: number;
    flatDamageBonus?: number;
    followUpChance?: number;
    followUpDamage?: number;
    negotiationPenalty?: number;
  };
}

export const CREATURE_DEFINITIONS: CreatureDefinition[] = [
  {
    id: 'lumen_warden',
    name: 'Lumen Warden',
    ability: 'shield',
    description: 'Reduces incoming damage by 30%. Once per battle, revives you at 20 HP when defeated.',
    spriteName: 'lumen_warden_sprite',
    emoji: '🛡️',
    rarity: 'uncommon',
    minSector: 1,
    bondDifficulty: 2,
    stats: {
      damageReduction: 0.3,
      reviveHP: 20,
      reviveOncePerBattle: true
    }
  },
  {
    id: 'cipher_sprite',
    name: 'Cipher Sprite',
    ability: 'oracle',
    description: 'Reveals the enemy\'s next choice in tactics. Boosts tactics win damage to 50.',
    spriteName: 'cipher_sprite_sprite',
    emoji: '👁️',
    rarity: 'rare',
    minSector: 2,
    bondDifficulty: 4,
    stats: {
      revealsEnemyChoice: true,
      tacticsWinDamageBoost: 50
    }
  },
  {
    id: 'pulse_stalker',
    name: 'Pulse Stalker',
    ability: 'aggression',
    description: '+10 flat damage on attacks. 25% chance for follow-up 15 damage, but -20% negotiation success.',
    spriteName: 'pulse_stalker_sprite',
    emoji: '⚡',
    rarity: 'uncommon',
    minSector: 1,
    bondDifficulty: 3,
    stats: {
      flatDamageBonus: 10,
      followUpChance: 0.25,
      followUpDamage: 15,
      negotiationPenalty: 0.2
    }
  },
  {
    id: 'glimmer_fox',
    name: 'Glimmer Fox',
    ability: 'shield',
    description: 'A playful creature that reduces damage by 20% and boosts flee success by 15%.',
    spriteName: 'glimmer_fox_sprite',
    emoji: '🦊',
    rarity: 'common',
    minSector: 1,
    bondDifficulty: 1,
    stats: {
      damageReduction: 0.2
    }
  },
  {
    id: 'void_whisper',
    name: 'Void Whisper',
    ability: 'oracle',
    description: 'A mysterious entity that hints at enemy moves and reduces tactics failure damage by 50%.',
    spriteName: 'void_whisper_sprite',
    emoji: '👻',
    rarity: 'uncommon',
    minSector: 2,
    bondDifficulty: 3,
    stats: {
      revealsEnemyChoice: true
    }
  },
  {
    id: 'ember_hound',
    name: 'Ember Hound',
    ability: 'aggression',
    description: 'A fiery companion that adds +5 damage and has a 40% chance for +10 follow-up.',
    spriteName: 'ember_hound_sprite',
    emoji: '🔥',
    rarity: 'common',
    minSector: 1,
    bondDifficulty: 2,
    stats: {
      flatDamageBonus: 5,
      followUpChance: 0.4,
      followUpDamage: 10
    }
  },
  {
    id: 'crystal_guardian',
    name: 'Crystal Guardian',
    ability: 'shield',
    description: 'A resilient protector that reduces damage by 40% and revives at 30 HP once per battle.',
    spriteName: 'crystal_guardian_sprite',
    emoji: '💎',
    rarity: 'rare',
    minSector: 2,
    bondDifficulty: 5,
    stats: {
      damageReduction: 0.4,
      reviveHP: 30,
      reviveOncePerBattle: true
    }
  },
  {
    id: 'star_wisp',
    name: 'Star Wisp',
    ability: 'oracle',
    description: 'A cosmic creature that reveals enemy choices and boosts tactics win damage to 60.',
    spriteName: 'star_wisp_sprite',
    emoji: '✨',
    rarity: 'rare',
    minSector: 3,
    bondDifficulty: 4,
    stats: {
      revealsEnemyChoice: true,
      tacticsWinDamageBoost: 60
    }
  }
];

export function getCreatureById(id: string): CreatureDefinition | undefined {
  return CREATURE_DEFINITIONS.find(creature => creature.id === id);
}

export function getRandomCreatureForSector(sector: number): CreatureDefinition {
  const available = CREATURE_DEFINITIONS.filter(c => c.minSector <= sector);
  const weights = available.map(c => {
    if (c.rarity === 'common') return 50;
    if (c.rarity === 'uncommon') return 30;
    return 20; // rare
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < available.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return available[i];
  }
  return available[0];
}
