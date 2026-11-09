// src/ui/components/MultiSizeModal.tsx
import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { currentDoc, simState, multiSizeModalOpen } from '../state/editor-state.ts';
import { renderPreset } from '../../core/render/renderer.ts';
import { WIDGET_SIZE_PRESETS } from '../targets/widget-sizes.ts';

export function MultiSizeModal() {
  if (!multiSizeModalOpen.value || !currentDoc.value) return null;

  const doc = currentDoc.value;
  const sim = simState.value;

  const canvas2x2 = useRef<HTMLCanvasElement>(null);
  const canvas4x2 = useRef<HTMLCanvasElement>(null);
  const canvas4x4 = useRef<HTMLCanvasElement>(null);

  const p2x2 = WIDGET_SIZE_PRESETS.find((p) => p.id === '2x2')!;
  const p4x2 = WIDGET_SIZE_PRESETS.find((p) => p.id === '4x2')!;
  const p4x4 = WIDGET_SIZE_PRESETS.find((p) => p.id === '4x4')!;

  useEffect(() => {
    let active = true;

    async function renderAll() {
      if (canvas2x2.current) {
        canvas2x2.current.width = p2x2.width;
        canvas2x2.current.height = p2x2.height;
        await renderPreset(doc, { kind: 'widget', w: p2x2.width, h: p2x2.height }, { sim, customCanvas: canvas2x2.current });
      }
      if (canvas4x2.current) {
        canvas4x2.current.width = p4x2.width;
        canvas4x2.current.height = p4x2.height;
        await renderPreset(doc, { kind: 'widget', w: p4x2.width, h: p4x2.height }, { sim, customCanvas: canvas4x2.current });
      }
      if (canvas4x4.current) {
        canvas4x4.current.width = p4x4.width;
        canvas4x4.current.height = p4x4.height;
        await renderPreset(doc, { kind: 'widget', w: p4x4.width, h: p4x4.height }, { sim, customCanvas: canvas4x4.current });
      }
    }

    renderAll();
    return () => {
      active = false;
    };
  }, [doc, sim]);

  return (
    <div class="modal-overlay" onClick={() => (multiSizeModalOpen.value = false)}>
      <div class="modal-card" style={{ maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h3 style={{ margin: 0, fontSize: '16px' }}>Multi-Size Widget Preview</h3>
          <button class="btn btn-sm" onClick={() => (multiSizeModalOpen.value = false)}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: '24px', padding: '20px 0', alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap' }}>
          {/* 2x2 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>2x2 Standard ({p2x2.width}×{p2x2.height})</span>
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden', background: '#0a0a0c', width: '200px', height: '261px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <canvas ref={canvas2x2} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </div>

          {/* 4x2 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>4x2 Wide ({p4x2.width}×{p4x2.height})</span>
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden', background: '#0a0a0c', width: '380px', height: '225px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <canvas ref={canvas4x2} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </div>

          {/* 4x4 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>4x4 Full Page ({p4x4.width}×{p4x4.height})</span>
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden', background: '#0a0a0c', width: '300px', height: '382px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <canvas ref={canvas4x4} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
          <button class="btn btn-primary" onClick={() => (multiSizeModalOpen.value = false)}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
