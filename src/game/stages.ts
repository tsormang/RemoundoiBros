import { kidsRoomBackground, zagkaBeachBackground } from './backgrounds';
import type { BlockerId, EnemyId, StageId } from './types';

export type StageDefinition = {
  id: StageId;
  title: string;
  description: string;
  thumbnailSrc: string;
  thumbnailFallbackColor: string;
  backgroundImageSrc: string;
  backgroundFallbackColor: string;
  /** When set, room keeps this width/height ratio (e.g. 16/9). */
  backgroundAspectRatio?: number;
  /** Fraction of the shorter room side reserved as edge padding (fences, etc.). */
  edgeInsetRatio?: number;
  blockerIds: BlockerId[];
  smallEnemyId: EnemyId;
  heavyEnemyId: EnemyId;
  specialEnemyId?: EnemyId;
};

export const stages: StageDefinition[] = [
  {
    id: 'koroni-kids-room',
    title: 'Δωμάτιο στη Κορώνη',
    description: 'Το παιδικό δωμάτιο με παιχνίδια και εμπόδια.',
    thumbnailSrc: '/assets/ui/stages/stage_koroni_kids_room_thumb.png',
    thumbnailFallbackColor: '#c4a882',
    backgroundImageSrc: kidsRoomBackground.imageSrc,
    backgroundFallbackColor: kidsRoomBackground.fallbackColor,
    backgroundAspectRatio: kidsRoomBackground.aspectRatio,
    edgeInsetRatio: kidsRoomBackground.edgeInsetRatio,
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
    title: 'Παραλία Ζάγκα',
    description: 'Άμμος, φύκια και καλοκαιρινά εμπόδια.',
    thumbnailSrc: '/assets/ui/stages/stage_zagka_beach_thumb.png',
    thumbnailFallbackColor: '#e8d5a3',
    backgroundImageSrc: zagkaBeachBackground.imageSrc,
    backgroundFallbackColor: zagkaBeachBackground.fallbackColor,
    backgroundAspectRatio: zagkaBeachBackground.aspectRatio,
    edgeInsetRatio: zagkaBeachBackground.edgeInsetRatio,
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
  minutes: 2 | 4 | 6 | 8;
  label: string;
}> = [
  { minutes: 2, label: '2 λεπτά' },
  { minutes: 4, label: '4 λεπτά' },
  { minutes: 6, label: '6 λεπτά' },
  { minutes: 8, label: '8 λεπτά' },
];

export function getStageById(id: StageId): StageDefinition {
  return stages.find((stage) => stage.id === id) ?? stages[0];
}

export function allStageSpriteSources(): string[] {
  return stages.flatMap((stage) => [
    stage.thumbnailSrc,
    stage.backgroundImageSrc,
  ]);
}
