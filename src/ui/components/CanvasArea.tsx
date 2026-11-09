import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  currentDoc,
  canvasTarget,
  simState,
  zoom,
  pan,
  selectedNodeId,
  showGridOverlay,
  showDeviceFrame,
  currentProfileId,
  targetOrientation,
  toggleOrientation,
  multiSizeModalOpen,
  currentResourceManager,
} from '../state/editor-state.ts';
import { renderPreset, getResourceManagerForDoc } from '../../core/render/renderer.ts';
import type { LayoutNode } from '../../core/layout/types.ts';
import {
  FitFrameIcon,
  ScreenIcon,
  LockIcon,
  UnlockIcon,
  PlayIcon,
  PauseIcon,
  LayersIcon,
} from '../icons/icons.tsx';
import { MultiSizeModal } from './MultiSizeModal.tsx';

function findLayoutNode(node: LayoutNode, id: string): LayoutNode | null {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findLayoutNode(child, id);
    if (found) return found;
  }
  return null;
}

function hitTest(node: LayoutNode, px: number, py: number): LayoutNode | null {
  // Check children in reverse z-order (top-most first)
  for (let i = (node.children?.length ?? 0) - 1; i >= 0; i--) {
    const child = node.children![i];
    const hit = hitTest(child, px, py);
    if (hit) return hit;
  }
  const bx = node.box.x ?? 0;
  const by = node.box.y ?? 0;
  const bw = node.box.w;
  const bh = node.box.h;
  if (px >= bx && px <= bx + bw && py >= by && py <= by + bh) {
    return node;
  }
  return null;
}

export function CanvasArea() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const doc = currentDoc.value;
  const target = canvasTarget.value;
  const sim = simState.value;
  const currentZoom = zoom.value;
  const selectedId = selectedNodeId.value;

  const [layoutTree, setLayoutTree] = useState<LayoutNode | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Dragging / Panning State
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let active = true;

    const draw = async () => {
      if (!doc || !canvasRef.current) return;
      const canvas = canvasRef.current;
      canvas.width = target.w;
      canvas.height = target.h;

      try {
        const res = await getResourceManagerForDoc(doc);
        currentResourceManager.value = res;

        const renderedCanvas = await renderPreset(doc, target, {
          sim,
          screens: target.screens,
          offset: target.offset,
          customCanvas: canvas,
          resources: res,
        });

        if (active && renderedCanvas && (renderedCanvas as any).layoutRoot) {
          setLayoutTree((renderedCanvas as any).layoutRoot);
        }
      } catch (err) {
        console.error('Render error:', err);
      }
    };

    draw();

    return () => {
      active = false;
    };
  }, [doc, target, sim]);

  // Click on canvas for Hit-Testing
  const handleCanvasClick = (e: MouseEvent) => {
    if (!canvasRef.current || !layoutTree) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = target.w / rect.width;
    const scaleY = target.h / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const hit = hitTest(layoutTree, clickX, clickY);
    if (hit) {
      selectedNodeId.value = hit.id;
    } else {
      selectedNodeId.value = doc ? doc.root.id : 'root';
    }
  };

  // Middle-click or space drag panning
  const handleMouseDown = (e: MouseEvent) => {
    if (e.button === 1 || (e as any).spaceKey) {
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.value.x, y: e.clientY - pan.value.y });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isPanning) {
      pan.value = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      };
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Wheel to Zoom
  const handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      zoom.value = Math.max(0.2, Math.min(4.0, zoom.value + delta));
    }
  };

  // Find selection box
  const selectedLayout = layoutTree && selectedId ? findLayoutNode(layoutTree, selectedId) : null;
  const isSelectedRoot = selectedId === doc?.root.id;

  const handleFit = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pad = 40;
    const availW = rect.width - pad;
    const availH = rect.height - pad;
    const fitW = availW / target.w;
    const fitH = availH / target.h;
    zoom.value = Math.max(0.2, Math.min(1.0, Math.min(fitW, fitH)));
    pan.value = { x: 0, y: 0 };
  };

  const currentScreenIndex = Math.min(
    target.screens ?? 1,
    Math.floor((target.offset ?? 0) * (target.screens ?? 1)) + 1,
  );

  return (
    <main
      ref={containerRef}
      class="canvas-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Viewport Stage */}
      <div
        class="canvas-viewport"
        style={{
          transform: `translate(${pan.value.x}px, ${pan.value.y}px) scale(${currentZoom})`,
          transformOrigin: 'center center',
          cursor: isPanning ? 'grabbing' : 'default',
        }}
      >
        <div
          class={showDeviceFrame.value ? 'phone-mockup-frame' : ''}
          style={{
            position: 'relative',
            width: `${target.w}px`,
            height: `${target.h}px`,
            boxShadow: showDeviceFrame.value ? undefined : '0 16px 48px rgba(0, 0, 0, 0.5)',
            borderRadius: showDeviceFrame.value ? undefined : '12px',
            overflow: 'hidden',
          }}
        >
          {/* Main Painting Canvas */}
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{ display: 'block', width: '100%', height: '100%' }}
          />

          {/* Interactive Selection Outline */}
          {selectedLayout && !isSelectedRoot && (
            <div
              class="selection-box"
              style={{
                position: 'absolute',
                left: `${selectedLayout.box.x}px`,
                top: `${selectedLayout.box.y}px`,
                width: `${selectedLayout.box.w}px`,
                height: `${selectedLayout.box.h}px`,
                border: '2px solid #E53935',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            >
              {/* Corner Handles */}
              <div class="handle handle-tl" />
              <div class="handle handle-tr" />
              <div class="handle handle-bl" />
              <div class="handle handle-br" />
            </div>
          )}

          {/* Grid Overlay */}
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
              {[1, 2, 3, 4].map((col) => (
                <line
                  key={`col-${col}`}
                  x1={`${(col / 4) * 100}%`}
                  y1="0"
                  x2={`${(col / 4) * 100}%`}
                  y2="100%"
                  stroke="rgba(229, 57, 53, 0.3)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              ))}
              {[1, 2, 3, 4, 5].map((row) => (
                <line
                  key={`row-${row}`}
                  x1="0"
                  y1={`${(row / 6) * 100}%`}
                  x2="100%"
                  y2={`${(row / 6) * 100}%`}
                  stroke="rgba(229, 57, 53, 0.3)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              ))}
            </svg>
          )}
        </div>
      </div>

      {/* Official Right Vertical Floating Tool Strip */}
      <div class="stage-tools-strip">
        <button
          class="stage-tool-btn"
          title={`Screen ${currentScreenIndex} of ${target.screens ?? 1}`}
          onClick={() => {
            const nextScreens = ((target.screens ?? 1) % 5) + 1;
            canvasTarget.value = { ...target, screens: nextScreens };
          }}
        >
          <ScreenIcon size={18} />
          <span class="stage-tool-badge">
            {currentScreenIndex}/{target.screens ?? 1}
          </span>
        </button>

        <button
          class="stage-tool-btn"
          title="Fit to Stage"
          onClick={handleFit}
        >
          <FitFrameIcon size={18} />
        </button>

        <button
          class={`stage-tool-btn ${isLocked ? 'active' : ''}`}
          title={isLocked ? 'Locked (click to unlock)' : 'Unlocked (click to lock)'}
          onClick={() => setIsLocked(!isLocked)}
        >
          {isLocked ? <LockIcon size={18} /> : <UnlockIcon size={18} />}
        </button>

        <button
          class={`stage-tool-btn ${showGridOverlay.value ? 'active' : ''}`}
          title="Toggle Grid / Layers"
          onClick={() => (showGridOverlay.value = !showGridOverlay.value)}
        >
          <LayersIcon size={18} />
        </button>

        <button
          class={`stage-tool-btn ${isPlaying ? 'active' : ''}`}
          title={isPlaying ? 'Pause Animation' : 'Play Animation'}
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
        </button>
      </div>

      {/* Bottom Floating Zoom Bar */}
      <div class="floating-bar">
        <button
          class="btn btn-sm"
          onClick={() => (zoom.value = Math.max(0.2, zoom.value - 0.1))}
        >
          -
        </button>
        <span class="zoom-text">{Math.round(currentZoom * 100)}%</span>
        <button
          class="btn btn-sm"
          onClick={() => (zoom.value = Math.min(4.0, zoom.value + 0.1))}
        >
          +
        </button>
        <button class="btn btn-sm" onClick={() => (zoom.value = 1.0)}>
          100%
        </button>
        <button class="btn btn-sm" onClick={handleFit}>
          Fit
        </button>
        <span class="bar-divider" />
        <span class="dims-text">
          {target.w} × {target.h} px
        </span>
      </div>

      <MultiSizeModal />
    </main>
  );
}
