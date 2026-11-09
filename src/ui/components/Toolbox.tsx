import { h } from 'preact';
import { activeTool } from '../state/editor-state.ts';

export function Toolbox() {
  const current = activeTool.value;

  const tools: { id: typeof current; label: string; icon: string; key: string }[] = [
    { id: 'select', label: 'Select (V)', icon: '↖', key: 'V' },
    { id: 'hand', label: 'Hand / Pan (H)', icon: '✋', key: 'H' },
    { id: 'shape', label: 'Shape (U)', icon: '▢', key: 'U' },
    { id: 'text', label: 'Text (T)', icon: 'T', key: 'T' },
    { id: 'icon', label: 'Font Icon (G)', icon: '★', key: 'G' },
    { id: 'image', label: 'Image (I)', icon: '🖼', key: 'I' },
  ];

  return (
    <aside class="toolbox">
      {tools.map((t) => (
        <button
          key={t.id}
          class={`tool-btn ${current === t.id ? 'active' : ''}`}
          title={t.label}
          onClick={() => (activeTool.value = t.id)}
        >
          {t.icon}
        </button>
      ))}
    </aside>
  );
}
