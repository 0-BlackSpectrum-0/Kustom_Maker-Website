import { h } from 'preact';
import { useState } from 'preact/hooks';
import {
  currentDoc,
  canvasTarget,
  simState,
  validationReport,
  targetOrientation,
} from '../state/editor-state.ts';

export function StatusBar() {
  const doc = currentDoc.value;
  const target = canvasTarget.value;
  const sim = simState.value;
  const report = validationReport.value;
  const [problemsOpen, setProblemsOpen] = useState(false);

  const unitPx = (Math.min(target.w, target.h) / 720).toFixed(2);
  const timeStr = sim.now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <footer class="status-bar">
      {/* Left: Validation Chip */}
      <div class="status-bar-left">
        {report && (
          <div class="problems-trigger-wrap">
            <button
              class={`status-chip ${report.valid ? 'chip-success' : 'chip-warning'}`}
              onClick={() => setProblemsOpen(!problemsOpen)}
              title="Click to view validation details"
            >
              {report.valid ? '✓ Valid Preset' : `⚠ ${report.issues.length} Issues`}
            </button>

            {problemsOpen && (
              <div class="problems-popover">
                <div class="popover-header">
                  <span>Validation Issues ({report.issues.length})</span>
                  <button class="popover-close" onClick={() => setProblemsOpen(false)}>✕</button>
                </div>
                <div class="popover-body">
                  {report.issues.length === 0 ? (
                    <div class="popover-empty">All structural and spec checks passed.</div>
                  ) : (
                    report.issues.map((issue, idx) => (
                      <div key={idx} class={`issue-item issue-${issue.severity.toLowerCase()}`}>
                        <span class="issue-code">{issue.code}</span>
                        <span class="issue-msg">{issue.message}</span>
                        {issue.path && <span class="issue-path">{issue.path}</span>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <span class="status-item">
          Unit: 1 u = {unitPx} px
        </span>
      </div>

      {/* Center: Preset & Version Info */}
      <div class="status-bar-center">
        {doc && (
          <span class="status-item status-muted">
            {doc.kind.toUpperCase()} v{doc.info.version || 13} · Release {doc.info.release || 0}
          </span>
        )}
      </div>

      {/* Right: Active Simulation Indicators */}
      <div class="status-bar-right">
        <span class="status-item" title="Simulated Clock Time">
          🕒 {timeStr}
        </span>
        <span class="status-item" title="Simulated Battery Level">
          🔋 {sim.battery}%
        </span>
        <span class="status-item" title="Orientation">
          📱 {targetOrientation.value === 'portrait' ? 'Portrait' : 'Landscape'}
        </span>
        <span class="status-item" title="Network Connection">
          📶 {sim.network}
        </span>
      </div>
    </footer>
  );
}
