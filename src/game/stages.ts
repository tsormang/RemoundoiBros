import { kidsRoomFloor } from './backgrounds';
import type { BlockerId, EnemyId, StageId } from './types';

export type StageDefinition = {
  id: StageId;
  title: string;
  description: string;
  thumbnailSrc: string;
  thumbnailFallbackColor: string;
  floorTileSrc: string;
  floorFallbackColor: string;
  blockerIds: BlockerId[];
  smallEnemyId: EnemyId;
  heavyEnemyId: EnemyId;
  specialEnemyId?: EnemyId;
};

export const stages: StageDefinition[] = [
  {
    id: 'koroni-kids-room',
    title: "Δωμάτιο Κωρωνης κωδ",
    description: 'Το παιδικό δωμάτιο με παιχνίδια και εμπόδια.',
    thumbnailSrc: '/assets/ui/stages/stage_koroni_kids_room_thumb.png',
    thumbnailFallbackColor: '#c4a882',
    floorTileSrc: kidsRoomFloor.tileSrc,
    floorFallbackColor: kidsRoomFloor.fallbackColor,
    blockerIds: [
      'toy-blocks-pile',
      'toy-chest-open',
      'cushion-stack',
      'toy-truck',
      'stacking-rings-pile',
      'block-fort-wall',
    ],
    smallEnemyId: 'small-insect',
    heavyEnemyId: 'large-cockroach',
    specialEnemyId: 'mother-slipper',
  },
  {
    id: 'zagka-beach',
    title: 'Παραλία Ζαγκά',
    description: 'Άμμος, φύκια και καλοκαιρινά εμπόδια.',
    thumbnailSrc: '/assets/ui/stages/stage_zagka_beach_thumb.png',
    thumbnailFallbackColor: '#e8d5a3',
    floorTileSrc: '/assets/backgrounds/background_zagka_beach_floor_tile.png',
    floorFallbackColor: '#e8d5a3',
    blockerIds: [
      'beach-seaweed-green',
      'beach-seaweed-teal',
      'beach-seaweed-purple',
      'beach-tire',
      'beach-rocks',
    ],
    smallEnemyId: 'small-lago',
    heavyEnemyId: 'large-lago',
    specialEnemyId: 'giant-squid',
  },
];

export const DEFAULT_STAGE_ID: StageId = 'koroni-kids-room';

export const RUN_DURATION_OPTIONS: Array<{
  minutes: 3 | 6 | 9 | 12;
  label: string;
}> = [
  { minutes: 3, label: '3 λεπτά' },
  { minutes: 6, label: '6 λεπτά' },
  { minutes: 9, label: '9 λεπτά' },
  { minutes: 12, label: '12 λεπτά' },
];

export function getStageById(id: StageId): StageDefinition {
  return stages.find((stage) => stage.id === id) ?? stages[0];
}

export function allStageSpriteSources(): string[] {
  return stages.flatMap((stage) => [
    stage.thumbnailSrc,
    stage.floorTileSrc,
  ]);
}
