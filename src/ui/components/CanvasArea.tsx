// src/ui/components/CanvasArea.tsx
import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import {
  currentDoc,
  canvasTarget,
  simState,
  zoom,
  showGridOverlay,
  showDeviceFrame,
  currentProfileId,
  targetOrientation,
  setTargetSize,
  toggleOrientation,
  multiSizeModalOpen,
} from '../state/editor-state.ts';
import { renderPreset } from '../../core/render/renderer.ts';
import { DEVICE_PROFILES, getDeviceProfile } from '../targets/device-profiles.ts';
import { WIDGET_SIZE_PRESETS, getWidgetSizePreset } from '../targets/widget-sizes.ts';
import { MultiSizeModal } from './MultiSizeModal.tsx';

export function CanvasArea() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const doc = currentDoc.value;
  const target = canvasTarget.value;
  const sim = simState.value;
  const currentZoom = zoom.value;
  const isWidget = doc?.kind === 'kwgt';
  const isKLWP = doc?.kind === 'klwp';

  useEffect(() => {
    let active = true;

    const draw = async () => {
      if (!doc || !canvasRef.current) return;
      const canvas = canvasRef.current;
      canvas.width = target.w;
      canvas.height = target.h;

      try {
        await renderPreset(doc, target, {
          sim,
          screens: target.screens,
          offset: target.offset,
          customCanvas: canvas,
        });
      } catch (err) {
        console.error('Render error:', err);
      }
    };

    draw();

    return () => {
      active = false;
    };
  }, [doc, target, sim]);

  const handleProfileChange = (e: Event) => {
    const val = (e.target as HTMLSelectElement).value;
    if (val === 'preset' && doc) {
      const w = doc.info.width ?? (isWidget ? 415 : 540);
      const h = doc.info.height ?? (isWidget ? 542 : 1200);
      setTargetSize(w, h, 'preset');
    } else if (isWidget) {
      const preset = getWidgetSizePreset(val);
      if (preset) {
        setTargetSize(preset.width, preset.height, preset.id);
      }
    } else {
      const prof = getDeviceProfile(val);
      if (prof) {
        setTargetSize(prof.width, prof.height, prof.id);
      }
    }
  };

  const handleScreenCountChange = (delta: number) => {
    const current = target.screens ?? 1;
    const next = Math.max(1, Math.min(7, current + delta));
    canvasTarget.value = {
      ...target,
      screens: next,
    };
  };

  const handleScrollOffsetChange = (e: Event) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    canvasTarget.value = {
      ...target,
      offset: val,
    };
  };

  const currentScreenIndex = Math.min(
    target.screens ?? 1,
    Math.floor((target.offset ?? 0) * (target.screens ?? 1)) + 1,
  );

  return (
    <main class="canvas-container">
      {/* Top Floating Target Toolbar */}
      <div class="target-top-bar">
        {/* Profile Selector */}
        <select class="target-select" value={currentProfileId.value} onChange={handleProfileChange}>
          <option value="preset">Native ({doc?.info.width ?? target.w}×{doc?.info.height ?? target.h})</option>
          {isWidget && (
            <optgroup label="Widget Sizes">
              {WIDGET_SIZE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.width}×{p.height})
                </option>
              ))}
            </optgroup>
          )}
          {(!isWidget || isKLWP) && (
            <optgroup label="Device Profiles">
              {DEVICE_PROFILES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.width}×{p.height})
                </option>
              ))}
            </optgroup>
          )}
        </select>

        {/* Orientation Toggle */}
        <button
          class="btn btn-sm"
          title="Toggle Orientation (Portrait / Landscape)"
          onClick={toggleOrientation}
        >
          🔄 {targetOrientation.value === 'portrait' ? 'Port' : 'Land'}
        </button>

        {/* Device Frame Toggle */}
        <button
          class={`btn btn-sm ${showDeviceFrame.value ? 'btn-primary' : ''}`}
          title="Toggle Device Frame Mockup"
          onClick={() => (showDeviceFrame.value = !showDeviceFrame.value)}
        >
          📱 Frame
        </button>

        {/* Grid Overlay Toggle */}
        <button
          class={`btn btn-sm ${showGridOverlay.value ? 'btn-primary' : ''}`}
          title="Toggle Launcher Grid Overlay"
          onClick={() => (showGridOverlay.value = !showGridOverlay.value)}
        >
          # Grid
        </button>

        {/* Multi-Size Preview (for widgets) */}
        {isWidget && (
          <button
            class="btn btn-sm"
            title="Multi-size 2x2 / 4x2 / 4x4 preview"
            onClick={() => (multiSizeModalOpen.value = true)}
          >
            ⊞ Multi-Size
          </button>
        )}

        {/* Multi-Screen Scroll (for KLWP or multi-screen setups) */}
        {(isKLWP || (target.screens && target.screens > 1)) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '1px solid var(--border-color)', paddingLeft: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Screens:</span>
            <button class="btn btn-sm" style={{ padding: '1px 5px' }} onClick={() => handleScreenCountChange(-1)}>-</button>
            <span style={{ fontSize: '11px', minWidth: '14px', textAlign: 'center' }}>{target.screens ?? 1}</span>
            <button class="btn btn-sm" style={{ padding: '1px 5px' }} onClick={() => handleScreenCountChange(1)}>+</button>

            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>Scroll:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={target.offset ?? 0.5}
              onInput={handleScrollOffsetChange}
              style={{ width: '70px', accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '11px', color: 'var(--accent)' }}>
              P{currentScreenIndex}
            </span>
          </div>
        )}
      </div>

      {/* Main Viewport */}
      <div
        class="canvas-viewport"
        style={{
          transform: `scale(${currentZoom})`,
          transformOrigin: 'center center',
          transition: 'transform 0.1s ease-out',
        }}
      >
        <div
          class={showDeviceFrame.value ? 'phone-mockup-frame' : ''}
          style={{
            position: 'relative',
            width: `${target.w}px`,
            height: `${target.h}px`,
            boxShadow: showDeviceFrame.value ? undefined : '0 12px 36px rgba(0, 0, 0, 0.4)',
            borderRadius: showDeviceFrame.value ? undefined : '12px',
            overflow: 'hidden',
          }}
        >
          {/* Device Frame Extras */}
          {showDeviceFrame.value && (
            <>
              <div class="phone-punch-hole" />
              <div class="phone-status-bar">
                <span>10:10</span>
                <span style={{ display: 'flex', gap: '6px', fontSize: '10px' }}>
                  <span>5G</span>
                  <span>📶</span>
                  <span>85%</span>
                </span>
              </div>
              <div class="phone-nav-bar" />
            </>
          )}

          {/* Home Launcher Grid Overlay */}
          {showGridOverlay.value && (
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 8,
              }}
            >
              {/* 4 columns or 5 columns */}
              {[1, 2, 3, 4].map((col) => (
                <line
                  key={`col-${col}`}
                  x1={`${(col / 4) * 100}%`}
                  y1="0"
                  x2={`${(col / 4) * 100}%`}
                  y2="100%"
                  stroke="rgba(59, 130, 246, 0.5)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              ))}
              {/* 5 rows or 6 rows */}
              {[1, 2, 3, 4, 5].map((row) => (
                <line
                  key={`row-${row}`}
                  x1="0"
                  y1={`${(row / 6) * 100}%`}
                  x2="100%"
                  y2={`${(row / 6) * 100}%`}
                  stroke="rgba(59, 130, 246, 0.5)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              ))}
            </svg>
          )}

          <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
        </div>
      </div>

      {/* Bottom Floating Zoom Bar */}
      <div class="floating-bar">
        <button class="btn btn-sm" onClick={() => (zoom.value = Math.max(0.1, zoom.value - 0.1))}>
          -
        </button>
        <span style={{ fontSize: '12px', minWidth: '40px', textAlign: 'center' }}>
          {Math.round(currentZoom * 100)}%
        </span>
        <button class="btn btn-sm" onClick={() => (zoom.value = Math.min(4.0, zoom.value + 0.1))}>
          +
        </button>
        <button class="btn btn-sm" onClick={() => (zoom.value = 1.0)}>
          100%
        </button>
        <button
          class="btn btn-sm"
          title="Fit to view"
          onClick={() => {
            const containerH = window.innerHeight - 150;
            const fitZoom = Math.min(1.0, containerH / target.h);
            zoom.value = Math.round(fitZoom * 10) / 10;
          }}
        >
          Fit
        </button>
        <span style={{ borderLeft: '1px solid var(--border-color)', height: '14px' }} />
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {target.w} × {target.h} px
        </span>
      </div>

      {/* Multi-Size Modal */}
      <MultiSizeModal />
    </main>
  );
}
