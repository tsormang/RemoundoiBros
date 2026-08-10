import type { Upgrade } from './types';

export const upgrades: Upgrade[] = [
  {
    id: 'speed',
    title: 'Γρήγορα Παπούτσια',
    description: 'Κινείσαι 12% πιο γρήγορα.',
  },
  {
    id: 'damage',
    title: 'Πιο Φωτεινά Αστέρια',
    description: 'Οι βολές χτυπούν 20% πιο δυνατά.',
  },
  {
    id: 'cooldown',
    title: 'Γρήγορα Χέρια',
    description: 'Πυροβολείς 14% πιο συχνά.',
  },
  {
    id: 'maxHp',
    title: 'Σνακ Ήρωα',
    description: 'Κερδίζεις 18 μέγιστη ζωή και θεραπεύεσαι.',
  },
];

export function drawUpgradeChoices(): Upgrade[] {
  return [...upgrades].sort(() => Math.random() - 0.5).slice(0, 3);
}
