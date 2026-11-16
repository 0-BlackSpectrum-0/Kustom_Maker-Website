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
  targetOrientation,
  multiSizeModalOpen,
  exportModalOpen,
  currentResourceManager,
  deleteNode,
  undo,
  redo,
  commit,
  findParentNode,
  findNodeById,
  updateNodeProp,
} from '../state/editor-state.ts';
import { renderPreset, getResourceManagerForDoc } from '../../core/render/renderer.ts';
import type { LayoutNode } from '../../core/layout/types.ts';
import { setProp, addChild, cloneNode } from '../../core/model/edit.ts';
import { WIDGET_SIZE_PRESETS } from '../targets/widget-sizes.ts';
import { DEVICE_PROFILES } from '../targets/device-profiles.ts';
import {
  FitFrameIcon,
  ScreenIcon,
  LockIcon,
  UnlockIcon,
  PlayIcon,
  PauseIcon,
  LayersIcon,
  TargetIcon,
  SimIcon,
  HelpIcon,
} from '../icons/icons.tsx';
import { MultiSizeModal } from './MultiSizeModal.tsx';
import { ShortcutsDialog } from '../dialogs/ShortcutsDialog.tsx';

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
  const box = node.absBox ?? node.box;
  const bx = box.x ?? 0;
  const by = box.y ?? 0;
  const bw = box.w;
  const bh = box.h;
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
  const [targetPopoverOpen, setTargetPopoverOpen] = useState(false);
  const [simPopoverOpen, setSimPopoverOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Dragging / Panning State
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Live Simulation Clock Ticking
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      simState.value = {
        ...simState.value,
        now: new Date(),
      };
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || '');
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && doc && selectedId !== doc.root.id) {
          e.preventDefault();
          deleteNode(selectedId);
        }
      } else if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
      } else if (mod && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        exportModalOpen.value = true;
      } else if (mod && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        if (selectedId && doc && selectedId !== doc.root.id) {
          const parent = findParentNode(doc.root, selectedId);
          if (parent) {
            const nodeToDup = parent.children?.find((c) => c.id === selectedId);
            if (nodeToDup) {
              const dup = cloneNode(nodeToDup);
              dup.id = `${dup.type}_${Date.now()}`;
              dup.title = `${dup.title} (Copy)`;
              commit(addChild(doc, parent.id, dup), `Duplicate ${nodeToDup.title}`);
            }
          }
        }
      } else if (e.key === 'f' || e.key === 'F') {
        handleFit();
      } else if (e.key === 'Escape') {
        if (selectedId && doc && selectedId !== doc.root.id) {
          const parent = findParentNode(doc.root, selectedId);
          if (parent) selectedNodeId.value = parent.id;
        }
      } else if (e.key === '?') {
        setShortcutsOpen(true);
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedId && doc && selectedId !== doc.root.id) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const selNode = findNodeById(doc.root, selectedId);
          const currX = Number(selNode?.props?.position_offset_x?.value || 0);
          const currY = Number(selNode?.props?.position_offset_y?.value || 0);
          let dx = 0;
          let dy = 0;
          if (e.key === 'ArrowLeft') dx = -step;
          if (e.key === 'ArrowRight') dx = step;
          if (e.key === 'ArrowUp') dy = -step;
          if (e.key === 'ArrowDown') dy = step;

          if (dx !== 0) {
            commit(setProp(doc, selectedId, 'position_offset_x', { value: currX + dx }), 'Nudge X');
          }
          if (dy !== 0) {
            commit(setProp(doc, selectedId, 'position_offset_y', { value: currY + dy }), 'Nudge Y');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, doc]);

  const [spacePressed, setSpacePressed] = useState(false);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const renderGenRef = useRef(0);
  const dragNodeRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    anchor: string;
  } | null>(null);

  // Space key tracking for Pan
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (['input', 'textarea', 'select'].includes(activeTag)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setSpacePressed(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Single rAF Render Loop with HiDPI support and no canvas.width resets when size unchanged
  useEffect(() => {
    let active = true;
    renderGenRef.current += 1;
    const currentGen = renderGenRef.current;

    const draw = async () => {
      if (!doc || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const targetW = Math.round(target.w * dpr);
      const targetH = Math.round(target.h * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

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

        if (active && renderGenRef.current === currentGen && renderedCanvas && (renderedCanvas as any).layoutRoot) {
          setLayoutTree((renderedCanvas as any).layoutRoot);
        }
      } catch (err) {
        console.error('Render error:', err);
      }
    };

    requestAnimationFrame(() => {
      if (active) draw();
    });

    return () => {
      active = false;
    };
  }, [doc, target, sim]);

  // Click on canvas for Hit-Testing
  const handleCanvasClick = (e: MouseEvent) => {
    if (isDraggingNode || isPanning) return;
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
    if (e.button === 1 || spacePressed) {
      e.preventDefault();
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

  // Wheel to Zoom around cursor
  const handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;

      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      const currentZ = zoom.value;
      const nextZ = Math.max(0.2, Math.min(4.0, currentZ + delta));
      const scaleRatio = nextZ / currentZ;

      pan.value = {
        x: mouseX - (mouseX - pan.value.x) * scaleRatio,
        y: mouseY - (mouseY - pan.value.y) * scaleRatio,
      };
      zoom.value = nextZ;
    }
  };

  // Find selection box (using calibrated absBox)
  const selectedLayout = layoutTree && selectedId ? findLayoutNode(layoutTree, selectedId) : null;
  const isSelectedRoot = selectedId === doc?.root.id;
  const selBox = selectedLayout ? (selectedLayout.absBox ?? selectedLayout.box) : null;

  // Drag to move selected node (calibrated per anchor sign rules)
  const handleSelectionMouseDown = (e: MouseEvent) => {
    e.stopPropagation();
    if (!doc || !selectedId || isSelectedRoot) return;
    const selNode = findNodeById(doc.root, selectedId);
    if (!selNode) return;

    const anchor = String(selNode.props?.position_anchor?.value || 'CENTER');
    const origX = Number(selNode.props?.position_offset_x?.value || 0);
    const origY = Number(selNode.props?.position_offset_y?.value || 0);

    dragNodeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX,
      origY,
      anchor,
    };
    setIsDraggingNode(true);

    const handleNodeMouseMove = (ev: MouseEvent) => {
      if (!dragNodeRef.current || !doc || !selectedId) return;
      const dx = (ev.clientX - dragNodeRef.current.startX) / zoom.value;
      const dy = (ev.clientY - dragNodeRef.current.startY) / zoom.value;

      const isRight = dragNodeRef.current.anchor.includes('RIGHT');
      const isBottom = dragNodeRef.current.anchor.includes('BOTTOM');

      const nextX = Math.round(dragNodeRef.current.origX + (isRight ? -dx : dx));
      const nextY = Math.round(dragNodeRef.current.origY + (isBottom ? -dy : dy));

      updateNodeProp(selectedId, 'position_offset_x', { value: nextX });
      updateNodeProp(selectedId, 'position_offset_y', { value: nextY });
    };

    const handleNodeMouseUp = () => {
      dragNodeRef.current = null;
      setIsDraggingNode(false);
      window.removeEventListener('mousemove', handleNodeMouseMove);
      window.removeEventListener('mouseup', handleNodeMouseUp);
    };

    window.addEventListener('mousemove', handleNodeMouseMove);
    window.addEventListener('mouseup', handleNodeMouseUp);
  };

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
      style={{ cursor: spacePressed ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
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
          cursor: isPanning ? 'grabbing' : (spacePressed ? 'grab' : 'default'),
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

          {/* Interactive Selection Outline with absolute coordinates & 8 handles */}
          {selBox && !isSelectedRoot && (
            <div
              class="selection-box"
              style={{
                position: 'absolute',
                left: `${selBox.x ?? 0}px`,
                top: `${selBox.y ?? 0}px`,
                width: `${selBox.w}px`,
                height: `${selBox.h}px`,
                border: '2px solid var(--accent, #EF5350)',
                cursor: isDraggingNode ? 'grabbing' : 'grab',
                zIndex: 10,
              }}
              onMouseDown={handleSelectionMouseDown}
            >
              {/* 4 Corner Handles */}
              <div class="handle handle-tl" />
              <div class="handle handle-tr" />
              <div class="handle handle-bl" />
              <div class="handle handle-br" />

              {/* 4 Edge Handles */}
              <div class="handle handle-tc" />
              <div class="handle handle-bc" />
              <div class="handle handle-ml" />
              <div class="handle handle-mr" />

              {/* Live Coordinate & Dimension Readout Badge */}
              <div
                class="selection-badge"
                style={{
                  position: 'absolute',
                  bottom: '-22px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(26, 26, 30, 0.9)',
                  border: '1px solid var(--border-color, #2C2C34)',
                  borderRadius: '3px',
                  padding: '1px 6px',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: '#FFFFFF',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                {Math.round(selBox.x ?? 0)}, {Math.round(selBox.y ?? 0)} · {Math.round(selBox.w)}×{Math.round(selBox.h)}
              </div>
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
                  stroke="rgba(255, 255, 255, 0.2)"
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
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              ))}
            </svg>
          )}
        </div>
      </div>

      {/* Right Vertical Floating Tool Strip */}
      <div class="stage-tools-strip">
        {/* Target (Size & Device) Popover Trigger */}
        <div style={{ position: 'relative' }}>
          <button
            class={`stage-tool-btn ${targetPopoverOpen ? 'active' : ''}`}
            title="Target & Dimensions"
            onClick={() => {
              setTargetPopoverOpen(!targetPopoverOpen);
              setSimPopoverOpen(false);
            }}
          >
            <TargetIcon size={18} />
          </button>

          {targetPopoverOpen && (
            <div
              class="popover-menu"
              style={{
                position: 'absolute',
                right: '48px',
                top: '0',
                width: '240px',
                backgroundColor: '#1A1A1E',
                border: '1px solid #24242A',
                borderRadius: '8px',
                padding: '12px',
                zIndex: 100,
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#FFF' }}>
                Target Dimensions
              </div>

              {doc?.kind === 'kwgt' ? (
                <div>
                  <div style={{ fontSize: '11px', color: '#8E8E93', marginBottom: '6px' }}>Widget Presets</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '10px' }}>
                    {WIDGET_SIZE_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        class={`btn btn-sm ${target.w === p.width && target.h === p.height ? 'btn-active' : ''}`}
                        style={{ fontSize: '10px', padding: '4px' }}
                        onClick={() => {
                          canvasTarget.value = { ...target, w: p.width, h: p.height };
                          setTargetPopoverOpen(false);
                        }}
                      >
                        {p.name.split(' ')[0]} ({p.width}×{p.height})
                      </button>
                    ))}
                  </div>

                  <button
                    class="btn btn-sm btn-block"
                    style={{ fontSize: '11px', width: '100%', marginBottom: '8px' }}
                    onClick={() => {
                      multiSizeModalOpen.value = true;
                      setTargetPopoverOpen(false);
                    }}
                  >
                    Compare Sizes...
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '11px', color: '#8E8E93', marginBottom: '6px' }}>Device Profiles</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    {DEVICE_PROFILES.slice(0, 4).map((p) => (
                      <button
                        key={p.id}
                        class={`btn btn-sm ${target.w === p.width && target.h === p.height ? 'btn-active' : ''}`}
                        style={{ fontSize: '11px', textAlign: 'left', padding: '4px 8px' }}
                        onClick={() => {
                          canvasTarget.value = { ...target, w: p.width, h: p.height };
                          setTargetPopoverOpen(false);
                        }}
                      >
                        {p.name} ({p.width}×{p.height})
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                    <button
                      class={`btn btn-sm ${targetOrientation.value === 'landscape' ? 'btn-active' : ''}`}
                      style={{ flex: 1, fontSize: '11px' }}
                      onClick={() => {
                        targetOrientation.value = targetOrientation.value === 'portrait' ? 'landscape' : 'portrait';
                        canvasTarget.value = { ...target, w: target.h, h: target.w };
                      }}
                    >
                      {targetOrientation.value === 'portrait' ? 'Portrait' : 'Landscape'}
                    </button>
                    <button
                      class={`btn btn-sm ${showDeviceFrame.value ? 'btn-active' : ''}`}
                      style={{ flex: 1, fontSize: '11px' }}
                      onClick={() => (showDeviceFrame.value = !showDeviceFrame.value)}
                    >
                      Frame
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Simulation Popover Trigger */}
        <div style={{ position: 'relative' }}>
          <button
            class={`stage-tool-btn ${simPopoverOpen ? 'active' : ''}`}
            title="Simulation Controls"
            onClick={() => {
              setSimPopoverOpen(!simPopoverOpen);
              setTargetPopoverOpen(false);
            }}
          >
            <SimIcon size={18} />
          </button>

          {simPopoverOpen && (
            <div
              class="popover-menu"
              style={{
                position: 'absolute',
                right: '48px',
                top: '0',
                width: '230px',
                backgroundColor: '#1A1A1E',
                border: '1px solid #24242A',
                borderRadius: '8px',
                padding: '12px',
                zIndex: 100,
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '10px', color: '#FFF' }}>
                Environment Simulation
              </div>

              {/* Dark Mode */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#AAA' }}>Dark Mode</span>
                <button
                  class={`btn btn-sm ${sim.darkmode ? 'btn-active' : ''}`}
                  style={{ fontSize: '11px', padding: '2px 8px' }}
                  onClick={() => {
                    simState.value = {
                      ...sim,
                      darkmode: sim.darkmode ? 0 : 1,
                      darkwp: sim.darkwp ? 0 : 1,
                    };
                  }}
                >
                  {sim.darkmode ? 'Dark (ON)' : 'Light (OFF)'}
                </button>
              </div>

              {/* Battery Level */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#AAA', marginBottom: '4px' }}>
                  <span>Battery</span>
                  <span>{sim.battery.level}% {sim.battery.charging ? '⚡' : ''}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sim.battery.level}
                  style={{ width: '100%' }}
                  onInput={(e) => {
                    const level = Number((e.target as HTMLInputElement).value);
                    simState.value = {
                      ...sim,
                      battery: { ...sim.battery, level },
                    };
                  }}
                />
              </div>

              {/* Network */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#AAA' }}>Network</span>
                <button
                  class="btn btn-sm"
                  style={{ fontSize: '11px', padding: '2px 8px' }}
                  onClick={() => {
                    simState.value = {
                      ...sim,
                      network: {
                        ...sim.network,
                        wifi: !sim.network.wifi,
                      },
                    };
                  }}
                >
                  {sim.network.wifi ? 'Wi-Fi' : 'Cellular'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Screen count indicator */}
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

        {/* Fit to Stage */}
        <button
          class="stage-tool-btn"
          title="Fit to Stage (F)"
          onClick={handleFit}
        >
          <FitFrameIcon size={18} />
        </button>

        {/* Lock toggle */}
        <button
          class={`stage-tool-btn ${isLocked ? 'active' : ''}`}
          title={isLocked ? 'Locked (click to unlock)' : 'Unlocked (click to lock)'}
          onClick={() => setIsLocked(!isLocked)}
        >
          {isLocked ? <LockIcon size={18} /> : <UnlockIcon size={18} />}
        </button>

        {/* Grid toggle */}
        <button
          class={`stage-tool-btn ${showGridOverlay.value ? 'active' : ''}`}
          title="Toggle Grid Overlay"
          onClick={() => (showGridOverlay.value = !showGridOverlay.value)}
        >
          <LayersIcon size={18} />
        </button>

        {/* Animation Play / Pause (Live Ticking) */}
        <button
          class={`stage-tool-btn ${isPlaying ? 'active' : ''}`}
          title={isPlaying ? 'Pause Simulation Clock' : 'Resume Simulation Clock'}
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
        </button>

        {/* Shortcuts Help */}
        <button
          class="stage-tool-btn"
          title="Keyboard Shortcuts (?)"
          onClick={() => setShortcutsOpen(true)}
        >
          <HelpIcon size={18} />
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
      <ShortcutsDialog isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </main>
  );
}
