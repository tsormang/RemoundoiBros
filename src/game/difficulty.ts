export type DifficultyId =
  | 'super-easy'
  | 'easy'
  | 'normal'
  | 'hard'
  | 'extra-hard';

export type DifficultyModifiers = {
  enemyHp: number;
  enemyDamage: number;
  enemySpeed: number;
  /** Higher = enemies spawn more often. */
  spawnRate: number;
};

export type DifficultyOption = {
  id: DifficultyId;
  label: string;
};

const DIFFICULTY_STORAGE_KEY = 'remoundoi-difficulty';

export const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  { id: 'super-easy', label: 'Super easy' },
  { id: 'easy', label: 'Easy' },
  { id: 'normal', label: 'Normal' },
  { id: 'hard', label: 'Hard' },
  { id: 'extra-hard', label: 'Extra Hard' },
];

const DIFFICULTY_MODIFIERS: Record<DifficultyId, DifficultyModifiers> = {
  'super-easy': {
    enemyHp: 0.55,
    enemyDamage: 0.45,
    enemySpeed: 0.75,
    spawnRate: 0.55,
  },
  easy: {
    enemyHp: 0.75,
    enemyDamage: 0.7,
    enemySpeed: 0.88,
    spawnRate: 0.75,
  },
  normal: {
    enemyHp: 1,
    enemyDamage: 1,
    enemySpeed: 1,
    spawnRate: 1,
  },
  hard: {
    enemyHp: 1.35,
    enemyDamage: 1.3,
    enemySpeed: 1.12,
    spawnRate: 1.25,
  },
  'extra-hard': {
    enemyHp: 1.75,
    enemyDamage: 1.65,
    enemySpeed: 1.22,
    spawnRate: 1.55,
  },
};

export function getDifficultyModifiers(
  difficulty: DifficultyId,
): DifficultyModifiers {
  return DIFFICULTY_MODIFIERS[difficulty];
}

export function parseDifficulty(value: string | undefined): DifficultyId | null {
  if (
    value === 'super-easy' ||
    value === 'easy' ||
    value === 'normal' ||
    value === 'hard' ||
    value === 'extra-hard'
  ) {
    return value;
  }

  return null;
}

export function loadPreferredDifficulty(): DifficultyId {
  try {
    return (
      parseDifficulty(localStorage.getItem(DIFFICULTY_STORAGE_KEY) ?? undefined) ??
      'normal'
    );
  } catch {
    return 'normal';
  }
}

export function savePreferredDifficulty(difficulty: DifficultyId): void {
  try {
    localStorage.setItem(DIFFICULTY_STORAGE_KEY, difficulty);
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}
