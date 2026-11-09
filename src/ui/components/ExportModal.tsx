// src/ui/components/ExportModal.tsx
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { currentDoc, exportModalOpen, validationReport, commit } from '../state/editor-state.ts';
import { writePresetArchive } from '../../core/archive/writer.ts';
import { readPresetArchive } from '../../core/archive/reader.ts';
import { sanitize } from '../../core/validate/fixers/index.ts';
import { buildDeviceTestPackZip } from '../../core/device-pack/generator.ts';
import { cloneDoc } from '../../core/model/edit.ts';

export function ExportModal() {
  const [pruneAssets, setPruneAssets] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!exportModalOpen.value || !currentDoc.value) return null;

  const doc = currentDoc.value;
  const report = validationReport.value;

  const errors = report?.issues.filter((i) => i.severity === 'error') || [];
  const warnings = report?.issues.filter((i) => i.severity === 'warning') || [];
  const canExport = errors.length === 0;

  const handleFixAll = () => {
    const cloned = cloneDoc(doc);
    sanitize(cloned);
    commit(cloned, 'Auto-fix all issues');
    setStatusMessage('All auto-fixable issues resolved.');
  };

  const handleDownload = async () => {
    setIsExporting(true);
    setStatusMessage('Validating and packaging archive...');

    try {
      // 1. Generate archive bytes
      const bytes = writePresetArchive(doc);

      // 2. Pre-export validation gate: re-read bytes and verify lossless roundtrip
      const verifiedDoc = await readPresetArchive(bytes);
      if (!verifiedDoc.root || !verifiedDoc.info) {
        throw new Error('Archive re-validation failed. Output corrupt.');
      }

      // 3. Trigger download
      const filename = `${doc.info.title || 'preset'}.${doc.kind}`;
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setStatusMessage(`Successfully exported ${filename}`);
      setTimeout(() => {
        exportModalOpen.value = false;
      }, 1200);
    } catch (err) {
      setStatusMessage(`Export failed: ${(err as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTestPack = async () => {
    try {
      setStatusMessage('Building Device Test Pack...');
      const zipBytes = await buildDeviceTestPackZip();
      const blob = new Blob([zipBytes as unknown as BlobPart], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kustomweb-device-test-pack.zip';
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('Device Test Pack downloaded.');
    } catch (err) {
      setStatusMessage(`Failed to build test pack: ${(err as Error).message}`);
    }
  };

  return (
    <div class="modal-overlay" onClick={() => (exportModalOpen.value = false)}>
      <div class="modal-card" style={{ width: '560px', maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h3 style={{ margin: 0, fontSize: '16px' }}>Export Preset ({doc.kind.toUpperCase()})</h3>
          <button class="btn btn-sm" onClick={() => (exportModalOpen.value = false)}>✕</button>
        </div>

        {/* Validation Gate Report */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Pre-Export Validation</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span class={`status-chip ${errors.length > 0 ? 'chip-error' : 'chip-success'}`}>
                {errors.length} Errors
              </span>
              <span class={`status-chip ${warnings.length > 0 ? 'chip-warning' : 'chip-success'}`}>
                {warnings.length} Warnings
              </span>
            </div>
          </div>

          {/* Issue list */}
          {(errors.length > 0 || warnings.length > 0) && (
            <div style={{ maxHeight: '140px', overflowY: 'auto', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {errors.map((e, idx) => (
                <div key={`err-${idx}`} style={{ color: 'var(--danger)' }}>
                  ✖ [{e.code}] {e.message}
                </div>
              ))}
              {warnings.map((w, idx) => (
                <div key={`warn-${idx}`} style={{ color: 'var(--warning)' }}>
                  ⚠ [{w.code}] {w.message}
                </div>
              ))}
            </div>
          )}

          {warnings.length > 0 && errors.length === 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button class="btn btn-sm" onClick={handleFixAll}>
                ⚡ Auto-Fix Warnings
              </button>
            </div>
          )}

          {errors.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--danger)' }}>Resolve errors before exporting.</span>
              <button class="btn btn-sm btn-primary" onClick={handleFixAll}>
                ⚡ Auto-Fix All Issues
              </button>
            </div>
          )}
        </div>

        {/* Preset Info Fields */}
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Title</label>
            <input
              type="text"
              class="input-sm"
              style={{ width: '100%' }}
              value={doc.info.title || ''}
              onInput={(e) => {
                doc.info.title = (e.target as HTMLInputElement).value;
                currentDoc.value = { ...doc };
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Author</label>
            <input
              type="text"
              class="input-sm"
              style={{ width: '100%' }}
              value={doc.info.author || ''}
              onInput={(e) => {
                doc.info.author = (e.target as HTMLInputElement).value;
                currentDoc.value = { ...doc };
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <input
              type="checkbox"
              id="prune-assets"
              checked={pruneAssets}
              onChange={(e) => setPruneAssets((e.target as HTMLInputElement).checked)}
            />
            <label for="prune-assets" style={{ fontSize: '12px', cursor: 'pointer' }}>
              Prune unreferenced assets on export
            </label>
          </div>
        </div>

        {statusMessage && (
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--accent)' }}>
            {statusMessage}
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <button class="btn btn-sm" onClick={handleDownloadTestPack} title="Download suite of on-device test presets">
            📦 Device Test Pack
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button class="btn" onClick={() => (exportModalOpen.value = false)}>
              Cancel
            </button>
            <button
              class="btn btn-primary"
              disabled={!canExport || isExporting}
              onClick={handleDownload}
            >
              Download .{doc.kind}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
