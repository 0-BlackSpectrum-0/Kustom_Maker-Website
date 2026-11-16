import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import {
  currentDoc,
  simState,
  commit,
  formulaDialogState,
} from '../state/editor-state.ts';
import { evalFormula } from '../../core/formula/index.ts';
import { setProp } from '../../core/model/edit.ts';
import { CloseIcon } from '../icons/icons.tsx';

const FORMULA_EXAMPLES = [
  { label: 'Time (12h)', expr: '$df(hh:mm)$' },
  { label: 'Time (24h)', expr: '$df(HH:mm)$' },
  { label: 'Date', expr: '$df(EEEE, MMMM d)$' },
  { label: 'Battery %', expr: '$bi(level)$%' },
  { label: 'Battery Temp', expr: '$bi(temp)$°C' },
  { label: 'Weather Temp', expr: '$wi(temp)$°$wi(tempu)$' },
  { label: 'Weather Condition', expr: '$wi(cond)$' },
  { label: 'Track Title', expr: '$mi(title)$' },
  { label: 'Artist', expr: '$mi(artist)$' },
  { label: 'Wifi SSID', expr: '$nc(ssid)$' },
];

export function FormulaDialog() {
  const state = formulaDialogState.value;
  if (!state || !state.open) return null;

  const [inputExpr, setInputExpr] = useState(state.formula || '$df(hh:mm)$');
  const sim = simState.value;
  const doc = currentDoc.value;

  useEffect(() => {
    if (state.formula) {
      setInputExpr(state.formula);
    }
  }, [state.formula]);

  let evalResult = '';
  let evalError: string | null = null;
  try {
    const res = evalFormula(
      inputExpr,
      sim,
      doc?.globals,
    );
    evalResult = String(res ?? '');
  } catch (err) {
    evalError = (err as Error).message;
  }

  const handleApply = () => {
    if (state.nodeId && state.propKey && doc) {
      const nextDoc = setProp(doc, state.nodeId, state.propKey, {
        formula: inputExpr,
      });
      commit(nextDoc, `Set formula for ${state.propKey}`);
    }
    formulaDialogState.value = null;
  };

  const handleClose = () => {
    formulaDialogState.value = null;
  };

  return (
    <div class="modal-backdrop" onClick={handleClose}>
      <div class="modal-card" style={{ width: '560px', maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h3 style={{ margin: 0, fontSize: '16px' }}>
            Formula Editor {state.label ? `— ${state.label}` : ''}
          </h3>
          <button class="icon-btn" onClick={handleClose} title="Close">
            <CloseIcon size={18} />
          </button>
        </div>

        <div style={{ marginTop: '14px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            Formula Expression
          </label>
          <textarea
            style={{
              width: '100%',
              minHeight: '80px',
              fontFamily: 'monospace',
              fontSize: '13px',
              backgroundColor: 'var(--bg-card, #1A1A1E)',
              color: 'var(--text-main, #FFFFFF)',
              border: '1px solid var(--border-color, #24242A)',
              borderRadius: '6px',
              padding: '10px',
              boxSizing: 'border-box',
            }}
            value={inputExpr}
            onInput={(e) => setInputExpr((e.target as HTMLTextAreaElement).value)}
            placeholder="e.g. $df(hh:mm)$ or $bi(level)$%"
          />
        </div>

        <div style={{ marginTop: '12px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            Live Evaluated Result:
          </span>
          <div style={{
            padding: '8px 12px',
            backgroundColor: '#16161A',
            border: '1px solid #24242A',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#4CAF50',
            minHeight: '20px',
          }}>
            {evalError ? (
              <span style={{ color: '#E53935' }}>⚠ {evalError}</span>
            ) : (
              evalResult
            )}
          </div>
        </div>

        <div style={{ marginTop: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            Quick Examples:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {FORMULA_EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                class="btn btn-sm"
                style={{ fontSize: '11px', padding: '3px 8px' }}
                onClick={() => setInputExpr(ex.expr)}
                title={ex.expr}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
          <button class="btn btn-sm" onClick={handleClose}>
            Cancel
          </button>
          <button class="btn btn-primary btn-sm" onClick={handleApply}>
            Apply Formula
          </button>
        </div>
      </div>
    </div>
  );
}
