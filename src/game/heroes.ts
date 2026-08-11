import type { HeroDefinition } from './types';

const bigBroBase = '/assets/sprites/heroes/big_bro';
const lilBroBase = '/assets/sprites/heroes/lil_bro';
const profilesBase = '/assets/ui/profiles';

export const heroes: HeroDefinition[] = [
  {
    id: 'hero-one',
    name: 'Αντώνης',
    initials: 'A',
    tagline: 'Ισχυρότερος · Αργότερος',
    portraitSrc: `${profilesBase}/profile_antonis_big_bro_512.png`,
    portraitSrcSm: `${profilesBase}/profile_antonis_big_bro_256.png`,
    sprites: {
      idle: [`${bigBroBase}/hero_big_bro_idle_01.png`],
      run: [
        `${bigBroBase}/hero_big_bro_run_01.png`,
        `${bigBroBase}/hero_big_bro_run_02.png`,
        `${bigBroBase}/hero_big_bro_run_03.png`,
        `${bigBroBase}/hero_big_bro_run_04.png`,
      ],
      hurt: [`${bigBroBase}/hero_big_bro_hurt_01.png`],
      drawSize: 64,
      runFrameDuration: 0.1,
    },
    color: '#66d9a3',
    accent: '#f4c95d',
    weaponName: 'Αστροβολές',
    startingWeaponId: 'star-throw',
    maxHp: 140,
    speed: 230,
  },
  {
    id: 'hero-two',
    name: 'Παναγιώτης',
    initials: 'P',
    tagline: 'Ταχύτερος · Ασθενέστερος',
    portraitSrc: `${profilesBase}/profile_panagiotis_little_bro_512.png`,
    portraitSrcSm: `${profilesBase}/profile_panagiotis_little_bro_256.png`,
    sprites: {
      idle: [`${lilBroBase}/hero_little_bro_idle_01.png`],
      run: [
        `${lilBroBase}/hero_little_bro_run_01.png`,
        `${lilBroBase}/hero_little_bro_run_02.png`,
        `${lilBroBase}/hero_little_bro_run_03.png`,
        `${lilBroBase}/hero_little_bro_run_04.png`,
      ],
      hurt: [`${lilBroBase}/hero_little_bro_hurt_01.png`],
      drawSize: 64,
      runFrameDuration: 0.09,
    },
    color: '#7bb7ff',
    accent: '#ff8e72',
    weaponName: 'Ιστός',
    startingWeaponId: 'web-pool',
    maxHp: 115,
    speed: 270,
  },
];

export function getHeroById(id: string): HeroDefinition {
  return heroes.find((hero) => hero.id === id) ?? heroes[0];
}
