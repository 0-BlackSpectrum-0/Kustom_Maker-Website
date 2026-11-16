import { h } from 'preact';
import { CloseIcon } from '../icons/icons.tsx';

interface ShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'Delete / Backspace', desc: 'Delete selected module' },
  { key: 'Ctrl + Z / ⌘ + Z', desc: 'Undo last change' },
  { key: 'Ctrl + Y / ⌘ + Shift + Z', desc: 'Redo last change' },
  { key: 'Ctrl + C / ⌘ + C', desc: 'Copy module (##KUSTOMCLIP##)' },
  { key: 'Ctrl + V / ⌘ + V', desc: 'Paste module' },
  { key: 'Ctrl + D / ⌘ + D', desc: 'Duplicate selected module' },
  { key: 'Ctrl + S / ⌘ + S', desc: 'Save / Export preset' },
  { key: 'Arrow Keys', desc: 'Nudge offset by 1 unit' },
  { key: 'Shift + Arrow Keys', desc: 'Nudge offset by 10 units' },
  { key: 'F', desc: 'Fit preview to stage' },
  { key: 'Esc', desc: 'Select parent group' },
];

export function ShortcutsDialog({ isOpen, onClose }: ShortcutsDialogProps) {
  if (!isOpen) return null;

  return (
    <div class="modal-backdrop" onClick={onClose}>
      <div class="modal-card" style={{ width: '480px', maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h3 style={{ margin: 0, fontSize: '16px' }}>Keyboard Shortcuts</h3>
          <button class="icon-btn" onClick={onClose} title="Close">
            <CloseIcon size={18} />
          </button>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {SHORTCUTS.map((s) => (
            <div
              key={s.key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                backgroundColor: 'var(--bg-surface, #121214)',
                borderRadius: '4px',
                border: '1px solid var(--border-color, #24242A)',
              }}
            >
              <kbd style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                padding: '2px 6px',
                backgroundColor: '#1E1E24',
                border: '1px solid #32323A',
                borderRadius: '3px',
                color: '#E0E0E6',
              }}>
                {s.key}
              </kbd>
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #A1A1AA)' }}>
                {s.desc}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button class="btn btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
