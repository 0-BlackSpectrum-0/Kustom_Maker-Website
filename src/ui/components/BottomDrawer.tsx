import { h } from 'preact';
import { useState } from 'preact/hooks';
import {
  currentDoc,
  activeDrawerTab,
  drawerOpen,
  validationReport,
  simState,
  commit,
} from '../state/editor-state.ts';
import { sanitize } from '../../core/validate/fixers/index.ts';
import { evalFormula } from '../../core/formula/index.ts';
import { cloneDoc } from '../../core/model/edit.ts';

export function BottomDrawer() {
  const isOpen = drawerOpen.value;
  const tab = activeDrawerTab.value;
  const doc = currentDoc.value;
  const report = validationReport.value;
  const sim = simState.value;

  const [formulaInput, setFormulaInput] = useState('$df(hh:mm)$');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [diffMode, setDiffMode] = useState<boolean>(false);

  if (!isOpen) {
    return (
      <div
        style={{
          height: '24px',
          backgroundColor: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          fontSize: '11px',
          cursor: 'pointer',
        }}
        onClick={() => (drawerOpen.value = true)}
      >
        <span style={{ color: 'var(--text-muted)' }}>
          Drawer: Formula Editor | Problems ({report?.issues.length ?? 0})
        </span>
        <span style={{ color: 'var(--text-subtle)' }}>▲ Open Drawer</span>
      </div>
    );
  }

  const evalResult = evalFormula(
    formulaInput,
    sim,
    doc?.globals,
  );

  const handleFixAll = () => {
    if (!doc) return;
    const cloned = cloneDoc(doc);
    sanitize(cloned);
    commit(cloned, 'Auto-fix all issues');
  };

  return (
    <div class="bottom-drawer">
      <div class="drawer-header">
        <div class="drawer-tabs">
          <button
            class={`tab-btn ${tab === 'formula' ? 'active' : ''}`}
            onClick={() => (activeDrawerTab.value = 'formula')}
          >
            Formula Editor
          </button>
          <button
            class={`tab-btn ${tab === 'problems' ? 'active' : ''}`}
            onClick={() => (activeDrawerTab.value = 'problems')}
          >
            Problems ({report?.issues.length ?? 0})
          </button>
          <button
            class={`tab-btn ${tab === 'compare' ? 'active' : ''}`}
            onClick={() => (activeDrawerTab.value = 'compare')}
          >
            Compare (L8)
          </button>
        </div>

        <button
          class="btn btn-sm"
          onClick={() => (drawerOpen.value = false)}
          title="Close Drawer"
        >
          ▼
        </button>
      </div>

      <div class="drawer-content">
        {tab === 'formula' && (
          <div style={{ display: 'flex', height: '100%', gap: '16px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <textarea
                value={formulaInput}
                onInput={(e) => setFormulaInput((e.target as HTMLTextAreaElement).value)}
                style={{
                  flex: 1,
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: '#60a5fa',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  padding: '8px',
                  borderRadius: 'var(--radius-sm)',
                  resize: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  class="btn btn-sm"
                  onClick={() => setFormulaInput((prev) => prev + '$gv()$')}
                >
                  + gv()
                </button>
                <button
                  class="btn btn-sm"
                  onClick={() => setFormulaInput((prev) => prev + '$if()$')}
                >
                  + if()
                </button>
                <button
                  class="btn btn-sm"
                  onClick={() => setFormulaInput((prev) => prev + '$df()$')}
                >
                  + df()
                </button>
                <button
                  class="btn btn-sm"
                  onClick={() => setFormulaInput((prev) => prev + '$ce()$')}
                >
                  + ce()
                </button>
                <button
                  class="btn btn-sm"
                  onClick={() => setFormulaInput((prev) => prev + '$si()$')}
                >
                  + si()
                </button>
              </div>
            </div>

            <div
              style={{
                width: '320px',
                borderLeft: '1px solid var(--border-color)',
                paddingLeft: '16px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                Evaluation Preview
              </div>
              <div
                style={{
                  flex: 1,
                  background: 'var(--bg-input)',
                  padding: '8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  color: 'var(--text-main)',
                  wordBreak: 'break-all',
                }}
              >
                {String(evalResult)}
              </div>
            </div>
          </div>
        )}

        {tab === 'problems' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                Validation Issues ({report?.issues.length ?? 0})
              </span>
              {report && report.issues.length > 0 && (
                <button class="btn btn-sm btn-primary" onClick={handleFixAll}>
                  Fix All Issues
                </button>
              )}
            </div>

            {report && report.issues.length === 0 && (
              <div style={{ color: 'var(--success)', padding: '12px 0' }}>
                ✓ No validation problems found. Preset satisfies all specs.
              </div>
            )}

            {report &&
              report.issues.map((iss, i) => (
                <div
                  key={i}
                  style={{
                    padding: '6px 0',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                  }}
                >
                  <span
                    style={{
                      color:
                        iss.severity === 'error'
                          ? 'var(--danger)'
                          : iss.severity === 'warning'
                          ? 'var(--warning)'
                          : 'var(--text-subtle)',
                      fontWeight: 600,
                    }}
                  >
                    [{iss.code}]
                  </span>
                  <span style={{ flex: 1 }}>{iss.message}</span>
                  <span style={{ color: 'var(--text-subtle)', fontSize: '11px' }}>{iss.path}</span>
                </div>
              ))}
          </div>
        )}

        {tab === 'compare' && (
          <div style={{ display: 'flex', gap: '20px', height: '100%', alignItems: 'center' }}>
            <div
              style={{
                border: '2px dashed var(--border-color)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                minWidth: '240px',
              }}
              onClick={() => {
                const inp = document.createElement('input');
                inp.type = 'file';
                inp.accept = 'image/png,image/jpeg,image/webp';
                inp.onchange = (e) => {
                  const f = (e.target as HTMLInputElement).files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = (re) => setScreenshotUrl(re.target?.result as string);
                  reader.readAsDataURL(f);
                };
                inp.click();
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer?.files[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = (re) => setScreenshotUrl(re.target?.result as string);
                reader.readAsDataURL(f);
              }}
            >
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>📷</div>
              <div style={{ fontSize: '12px', fontWeight: 600 }}>Drop On-Device Screenshot</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PNG, JPG or WebP from phone</div>
            </div>

            {screenshotUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Screenshot Loaded</span>
                  <img
                    src={screenshotUrl}
                    style={{ maxHeight: '110px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    class={`btn btn-sm ${diffMode ? 'btn-primary' : ''}`}
                    onClick={() => setDiffMode(!diffMode)}
                  >
                    {diffMode ? '✓ Onion-Skin Diff On' : 'Toggle Diff Mode'}
                  </button>
                  <button class="btn btn-sm" onClick={() => setScreenshotUrl(null)}>
                    Clear Screenshot
                  </button>
                  <span style={{ fontSize: '11px', color: 'var(--success)' }}>
                    ✓ L8 Match check ready
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
