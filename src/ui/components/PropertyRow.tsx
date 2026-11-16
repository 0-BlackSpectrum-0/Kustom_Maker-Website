import { h } from 'preact';
import { useRef } from 'preact/hooks';
import type { Prop } from '../../core/model/types.ts';
import { ALL_ENUMS } from '../../core/spec/generated.ts';
import { CalculatorIcon, GlobalIcon } from '../icons/icons.tsx';
import { formulaDialogState } from '../state/editor-state.ts';

interface PropertyRowProps {
  nodeId: string;
  propKey: string;
  label: string;
  type: string;
  enumName?: string;
  prop?: Prop;
  globals?: Record<string, any>;
  onUpdate: (patch: Partial<Prop>) => void;
}

// Map property keys to matching icons
function getPropIcon(key: string) {
  if (key.startsWith('shape_') || key.includes('shape')) {
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </svg>
    );
  }
  if (key.includes('color')) {
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
      </svg>
    );
  }
  if (key.includes('width') || key.includes('offset_x')) {
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="7 17 2 12 7 7" />
        <polyline points="17 7 22 12 17 17" />
        <line x1="2" y1="12" x2="22" y2="12" />
      </svg>
    );
  }
  if (key.includes('height') || key.includes('offset_y')) {
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="17 7 12 2 7 7" />
        <polyline points="7 17 12 22 17 17" />
        <line x1="12" y1="2" x2="12" y2="22" />
      </svg>
    );
  }
  if (key.startsWith('text_') || key.includes('font')) {
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
        <text x="5" y="18" font-family="sans-serif" font-size="16" font-weight="bold">T</text>
      </svg>
    );
  }
  if (key.startsWith('position_') || key.includes('anchor')) {
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="3" x2="12" y2="21" />
        <line x1="3" y1="12" x2="21" y2="12" />
      </svg>
    );
  }
  if (key.startsWith('bitmap_') || key.includes('image')) {
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    );
  }
  if (key.startsWith('fx_') || key.includes('shadow') || key.includes('gradient')) {
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
      </svg>
    );
  }
  if (key.includes('visible')) {
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  if (key.includes('rotate') || key.includes('angle')) {
    return (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
      </svg>
    );
  }
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 1 0 0 8.49" />
    </svg>
  );
}

export function PropertyRow({
  nodeId,
  propKey,
  label,
  type,
  enumName,
  prop,
  globals = {},
  onUpdate,
}: PropertyRowProps) {
  const currentProp = prop || {};
  const toggle = currentProp.toggle ?? 0;
  const isFormula = (toggle & 10) === 10 || Boolean(currentProp.formula && toggle !== 0 && toggle !== 100);
  const isGlobal = (toggle & 100) === 100 || Boolean(currentProp.global && toggle !== 0 && toggle !== 10);

  const value = currentProp.value ?? '';
  const formula = currentProp.formula ?? '';
  const globalVar = currentProp.global ?? '';

  const labelDragRef = useRef<{ startX: number; startVal: number } | null>(null);

  const handleStep = (delta: number) => {
    const num = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
    onUpdate({ value: num + delta, toggle: 0 });
  };

  const handleLabelMouseDown = (e: MouseEvent) => {
    if (type !== 'number' && type !== 'percent' && type !== 'angle') return;
    const num = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
    labelDragRef.current = { startX: e.clientX, startVal: num };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!labelDragRef.current) return;
      const dx = ev.clientX - labelDragRef.current.startX;
      const delta = Math.round(dx / 3);
      onUpdate({ value: labelDragRef.current.startVal + delta, toggle: 0 });
    };

    const handleMouseUp = () => {
      labelDragRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleOpenFormula = () => {
    formulaDialogState.value = {
      open: true,
      nodeId,
      propKey,
      label,
      formula: String(formula || value || ''),
    };
    onUpdate({ toggle: 10 });
  };

  const handleToggleGlobal = () => {
    if (isGlobal) {
      onUpdate({ toggle: 0 });
    } else {
      onUpdate({ toggle: 100 });
    }
  };

  const renderValueControl = () => {
    // 1. Global Mode
    if (isGlobal) {
      const globalKeys = Object.keys(globals);
      return (
        <select
          class="prop-select global-select"
          value={globalVar}
          onChange={(e) =>
            onUpdate({
              global: (e.target as HTMLSelectElement).value,
              toggle: 100,
            })
          }
        >
          <option value="">-- Select Global --</option>
          {globalKeys.map((gk) => (
            <option key={gk} value={gk}>
              gv({gk})
            </option>
          ))}
        </select>
      );
    }

    // 2. Formula Mode
    if (isFormula) {
      return (
        <div
          class="formula-field-wrap"
          onClick={handleOpenFormula}
          title="Click to edit formula"
          style={{ cursor: 'pointer' }}
        >
          <span class="formula-prefix">$</span>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '12px',
              color: 'var(--fx-color, #7aa2ff)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: '4px 0',
              flex: 1,
            }}
          >
            {formula || '$df(hh:mm)$'}
          </span>
        </div>
      );
    }

    // 3. Static Value Mode
    if (type === 'number' || type === 'percent' || type === 'angle') {
      return (
        <div class="stepper-wrap">
          <button
            class="stepper-btn stepper-fast"
            title="-10"
            type="button"
            onClick={() => handleStep(-10)}
          >
            «
          </button>
          <button
            class="stepper-btn"
            title="-1"
            type="button"
            onClick={() => handleStep(-1)}
          >
            -
          </button>
          <input
            type="number"
            class="stepper-input"
            value={value !== undefined ? String(value) : '0'}
            onInput={(e) => {
              const parsed = parseFloat((e.target as HTMLInputElement).value);
              onUpdate({
                value: isNaN(parsed) ? 0 : parsed,
                toggle: 0,
              });
            }}
          />
          <button
            class="stepper-btn"
            title="+1"
            type="button"
            onClick={() => handleStep(1)}
          >
            +
          </button>
          <button
            class="stepper-btn stepper-fast"
            title="+10"
            type="button"
            onClick={() => handleStep(10)}
          >
            »
          </button>
        </div>
      );
    }

    if (type === 'color') {
      const colorStr = String(value || '#FFFFFFFF');
      let hex6 = '#ffffff';
      if (colorStr.startsWith('#')) {
        hex6 = colorStr.length === 9 ? `#${colorStr.slice(3)}` : colorStr.slice(0, 7);
      }
      return (
        <div class="color-picker-wrap">
          <input
            type="color"
            class="color-thumb-input"
            value={hex6}
            onInput={(e) => {
              const hex = (e.target as HTMLInputElement).value.toUpperCase();
              const alphaHex = colorStr.startsWith('#') && colorStr.length === 9 ? colorStr.slice(1, 3) : 'FF';
              onUpdate({
                value: `#${alphaHex}${hex.slice(1)}`,
                toggle: 0,
              });
            }}
          />
          <input
            type="text"
            class="prop-input-text color-hex-text"
            value={colorStr}
            onInput={(e) =>
              onUpdate({
                value: (e.target as HTMLInputElement).value,
                toggle: 0,
              })
            }
          />
        </div>
      );
    }

    if (type === 'enum' && enumName) {
      const enumValues = (ALL_ENUMS as Record<string, readonly string[]>)[enumName] || [];
      return (
        <select
          class="prop-select"
          value={String(value)}
          onChange={(e) =>
            onUpdate({
              value: (e.target as HTMLSelectElement).value,
              toggle: 0,
            })
          }
        >
          {enumValues.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type="text"
        class="prop-input-text"
        value={String(value)}
        onInput={(e) =>
          onUpdate({
            value: (e.target as HTMLInputElement).value,
            toggle: 0,
          })
        }
      />
    );
  };

  return (
    <div class="prop-row" key={propKey}>
      <div
        class="prop-label-col"
        onMouseDown={handleLabelMouseDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: type === 'number' || type === 'percent' || type === 'angle' ? 'ew-resize' : 'default',
        }}
      >
        <span style={{ color: 'var(--text-subtle, #686872)', display: 'inline-flex', flexShrink: 0 }}>
          {getPropIcon(propKey)}
        </span>
        <span class="prop-label" title={`${label} (${propKey})`}>
          {label}
        </span>
      </div>

      <div class="prop-control-col">{renderValueControl()}</div>

      {/* Action buttons on the right: Calculator (fx) & Global (gv) */}
      <div class="prop-source-col" style={{ display: 'flex', gap: '4px' }}>
        <button
          class={`source-toggle-btn ${isFormula ? 'active-fx' : ''}`}
          title={isFormula ? 'Edit Formula' : 'Convert to Formula'}
          type="button"
          onClick={handleOpenFormula}
        >
          {isFormula ? <span class="fx-chip">fx</span> : <CalculatorIcon size={14} />}
        </button>

        <button
          class={`source-toggle-btn ${isGlobal ? 'active-gv' : ''}`}
          title={isGlobal ? 'Unbind Global' : 'Bind Global Variable'}
          type="button"
          onClick={handleToggleGlobal}
        >
          {isGlobal ? <span class="gv-chip">gv</span> : <GlobalIcon size={14} />}
        </button>
      </div>
    </div>
  );
}
