import { h, render } from 'preact';
import { App } from './ui/App.tsx';
import './ui/styles/editor.css';

const rootEl = document.getElementById('app');
if (rootEl) {
  render(<App />, rootEl);
}
