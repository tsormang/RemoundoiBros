import './styles/tailwind.css';
import './styles/theme.css';
import './style.css';
import { createGameApp } from './ui/app';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('Missing #app root element.');
}

createGameApp(root);
