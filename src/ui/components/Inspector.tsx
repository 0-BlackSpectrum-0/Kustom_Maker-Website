import { h } from 'preact';
import { useState } from 'preact/hooks';
import {
  currentDoc,
  selectedNodeId,
  findNodeById,
  updateNodeProp,
} from '../state/editor-state.ts';
import {
  AnchorModeValues,
  ShapeValues,
  TextAlignValues,
  PaintStyleValues,
  PaintModeValues,
  GradientValues,
  MaskFilterValues,
  ShadowValues,
  ProgressStyleValues,
  ProgressShapeValues,
  LayerStackingValues,
  RotateValues,
} from '../../core/spec/generated.ts';
import { CalculatorIcon, GlobalIcon } from '../icons/icons.tsx';

export function Inspector() {
  const doc = currentDoc.value;
  const selectedId = selectedNodeId.value;

  const [activeTab, setActiveTab] = useState<string>('primary');

  if (!doc || !selectedId) {
    return (
      <aside class="inspector-panel">
        <div class="inspector-empty">No module selected</div>
      </aside>
    );
  }

  const node = findNodeById(doc.root, selectedId);
  if (!node) {
    return (
      <aside class="inspector-panel">
        <div class="inspector-empty">Selected module not found</div>
      </aside>
    );
  }

  // Determine tabs for current module type
  const isContainer =
    node.type === 'RootLayerModule' ||
    node.type === 'OverlapLayerModule' ||
    node.type === 'StackLayerModule' ||
    node.type === 'KomponentModule';

  let tabs: { id: string; label: string }[] = [];
  if (isContainer) {
    tabs = [
      { id: 'layer', label: 'Layer' },
      { id: 'position', label: 'Position' },
      { id: 'animation', label: 'Animation' },
      { id: 'touch', label: 'Touch' },
    ];
  } else if (node.type === 'ShapeModule') {
    tabs = [
      { id: 'shape', label: 'Shape' },
      { id: 'paint', label: 'Paint' },
      { id: 'fx', label: 'FX' },
      { id: 'position', label: 'Position' },
      { id: 'touch', label: 'Touch' },
    ];
  } else if (node.type === 'TextModule') {
    tabs = [
      { id: 'text', label: 'Text' },
      { id: 'paint', label: 'Paint' },
      { id: 'fx', label: 'FX' },
      { id: 'position', label: 'Position' },
      { id: 'touch', label: 'Touch' },
    ];
  } else if (node.type === 'BitmapModule') {
    tabs = [
      { id: 'bitmap', label: 'Bitmap' },
      { id: 'paint', label: 'Paint' },
      { id: 'fx', label: 'FX' },
      { id: 'position', label: 'Position' },
      { id: 'touch', label: 'Touch' },
    ];
  } else if (node.type === 'FontIconModule') {
    tabs = [
      { id: 'icon', label: 'Icon' },
      { id: 'paint', label: 'Paint' },
      { id: 'fx', label: 'FX' },
      { id: 'position', label: 'Position' },
      { id: 'touch', label: 'Touch' },
    ];
  } else if (node.type === 'ProgressModule') {
    tabs = [
      { id: 'progress', label: 'Progress' },
      { id: 'paint', label: 'Paint' },
      { id: 'fx', label: 'FX' },
      { id: 'position', label: 'Position' },
      { id: 'touch', label: 'Touch' },
    ];
  } else if (node.type === 'CurvedTextModule') {
    tabs = [
      { id: 'curved', label: 'Curved' },
      { id: 'paint', label: 'Paint' },
      { id: 'fx', label: 'FX' },
      { id: 'position', label: 'Position' },
      { id: 'touch', label: 'Touch' },
    ];
  } else {
    tabs = [
      { id: 'general', label: 'General' },
      { id: 'position', label: 'Position' },
      { id: 'touch', label: 'Touch' },
    ];
  }

  // Ensure current active tab is valid
  const currentTabId = tabs.some((t) => t.id === activeTab)
    ? activeTab
    : tabs[0].id;

  const renderPropEditor = (
    label: string,
    propKey: string,
    type: 'string' | 'number' | 'color' | 'select',
    options?: readonly string[],
  ) => {
    const prop = node.props[propKey] || {};
    const toggle = prop.toggle ?? 0;
    const value = prop.value ?? '';
    const formula = prop.formula ?? '';
    const globalName = prop.global ?? '';

    const handleToggle = (newToggle: number) => {
      updateNodeProp(node.id, propKey, { toggle: newToggle });
    };

    const handleStep = (delta: number) => {
      const num = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
      updateNodeProp(node.id, propKey, { value: num + delta });
    };

    return (
      <div class="prop-row" key={propKey}>
        <div class="prop-label-col">
          <span class="prop-label" title={label}>
            {label}
          </span>
        </div>

        <div class="prop-control-col">
          {/* Static Value Mode */}
          {toggle === 0 && (
            <>
              {type === 'string' && (
                <input
                  type="text"
                  class="prop-input-text"
                  value={String(value)}
                  onInput={(e) =>
                    updateNodeProp(node.id, propKey, {
                      value: (e.target as HTMLInputElement).value,
                    })
                  }
                />
              )}

              {type === 'number' && (
                <div class="stepper-wrap">
                  <button
                    class="stepper-btn stepper-fast"
                    title="-10"
                    onClick={() => handleStep(-10)}
                  >
                    «
                  </button>
                  <button
                    class="stepper-btn"
                    title="-1"
                    onClick={() => handleStep(-1)}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    class="stepper-input"
                    value={value !== undefined ? String(value) : '0'}
                    onInput={(e) => {
                      const parsed = parseFloat(
                        (e.target as HTMLInputElement).value,
                      );
                      updateNodeProp(node.id, propKey, {
                        value: isNaN(parsed) ? 0 : parsed,
                      });
                    }}
                  />
                  <button
                    class="stepper-btn"
                    title="+1"
                    onClick={() => handleStep(1)}
                  >
                    +
                  </button>
                  <button
                    class="stepper-btn stepper-fast"
                    title="+10"
                    onClick={() => handleStep(10)}
                  >
                    »
                  </button>
                </div>
              )}

              {type === 'color' && (
                <div class="color-picker-wrap">
                  <input
                    type="color"
                    class="color-thumb-input"
                    value={
                      typeof value === 'string' && value.startsWith('#')
                        ? `#${value.slice(-6)}`
                        : '#ffffff'
                    }
                    onInput={(e) => {
                      const hex = (e.target as HTMLInputElement).value.toUpperCase();
                      updateNodeProp(node.id, propKey, {
                        value: `#FF${hex.slice(1)}`,
                      });
                    }}
                  />
                  <input
                    type="text"
                    class="prop-input-text color-hex-text"
                    value={String(value)}
                    onInput={(e) =>
                      updateNodeProp(node.id, propKey, {
                        value: (e.target as HTMLInputElement).value,
                      })
                    }
                  />
                </div>
              )}

              {type === 'select' && options && (
                <select
                  class="prop-select"
                  value={String(value)}
                  onChange={(e) =>
                    updateNodeProp(node.id, propKey, {
                      value: (e.target as HTMLSelectElement).value,
                    })
                  }
                >
                  {options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}

          {/* Formula Mode (toggle = 10) */}
          {(toggle & 10) === 10 && (
            <div class="formula-field-wrap">
              <span class="formula-prefix">$</span>
              <input
                type="text"
                class="prop-input-text formula-text-input"
                placeholder="Formula expression"
                value={formula}
                onInput={(e) =>
                  updateNodeProp(node.id, propKey, {
                    formula: (e.target as HTMLInputElement).value,
                  })
                }
              />
            </div>
          )}

          {/* Global Mode (toggle = 100) */}
          {(toggle & 100) === 100 && (
            <select
              class="prop-select global-select"
              value={globalName}
              onChange={(e) =>
                updateNodeProp(node.id, propKey, {
                  global: (e.target as HTMLSelectElement).value,
                })
              }
            >
              <option value="">-- Select Global --</option>
              {Object.keys(doc.globals).map((gk) => (
                <option key={gk} value={gk}>
                  gv({gk})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Source Toggle Pill */}
        <div class="prop-source-col">
          <button
            class={`source-toggle-btn ${
              (toggle & 10) === 10
                ? 'active-fx'
                : (toggle & 100) === 100
                ? 'active-gv'
                : ''
            }`}
            title={
              toggle === 0
                ? 'Switch to Formula mode'
                : (toggle & 10) === 10
                ? 'Switch to Global mode'
                : 'Switch to Static value'
            }
            onClick={() => {
              if (toggle === 0) handleToggle(10);
              else if ((toggle & 10) === 10) handleToggle(100);
              else handleToggle(0);
            }}
          >
            {(toggle & 10) === 10 ? (
              <span class="fx-chip">fx</span>
            ) : (toggle & 100) === 100 ? (
              <span class="gv-chip">gv</span>
            ) : (
              <CalculatorIcon size={14} />
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <aside class="inspector-panel">
      {/* Header Info */}
      <div class="inspector-header">
        <span class="inspector-title">{node.title || node.type}</span>
        <span class="inspector-type">{node.type}</span>
      </div>

      {/* Official Tabs Strip */}
      <div class="inspector-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            class={`inspector-tab-btn ${currentTabId === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Body */}
      <div class="inspector-body">
        {/* SHAPE TAB */}
        {currentTabId === 'shape' && (
          <div class="inspector-group">
            {renderPropEditor('Shape', 'shape_type', 'select', ShapeValues)}
            {renderPropEditor('Width', 'shape_width', 'number')}
            {renderPropEditor('Height', 'shape_height', 'number')}
            {renderPropEditor('Corners', 'shape_corners', 'number')}
            {renderPropEditor('Angle', 'shape_angle', 'number')}
          </div>
        )}

        {/* TEXT TAB */}
        {currentTabId === 'text' && (
          <div class="inspector-group">
            {renderPropEditor('Text', 'text_expression', 'string')}
            {renderPropEditor('Size', 'text_size', 'number')}
            {renderPropEditor('Align', 'text_align', 'select', TextAlignValues)}
            {renderPropEditor('Width', 'text_width', 'number')}
            {renderPropEditor('Lines', 'text_lines', 'number')}
            {renderPropEditor('Rotate', 'text_rotate_mode', 'select', RotateValues)}
            {renderPropEditor('Rot Offset', 'text_rotate_offset', 'number')}
          </div>
        )}

        {/* BITMAP TAB */}
        {currentTabId === 'bitmap' && (
          <div class="inspector-group">
            {renderPropEditor('Bitmap URI', 'bitmap_bitmap', 'string')}
            {renderPropEditor('Width', 'bitmap_width', 'number')}
            {renderPropEditor('Height', 'bitmap_height', 'number')}
            {renderPropEditor('Alpha', 'bitmap_alpha', 'number')}
            {renderPropEditor('Blur', 'bitmap_blur', 'number')}
          </div>
        )}

        {/* ICON TAB */}
        {currentTabId === 'icon' && (
          <div class="inspector-group">
            {renderPropEditor('Icon Set', 'icon_set', 'string')}
            {renderPropEditor('Icon Name', 'icon_icon', 'string')}
            {renderPropEditor('Size', 'icon_size', 'number')}
          </div>
        )}

        {/* PROGRESS TAB */}
        {currentTabId === 'progress' && (
          <div class="inspector-group">
            {renderPropEditor('Style', 'progress_style', 'select', ProgressStyleValues)}
            {renderPropEditor('Shape', 'progress_shape', 'select', ProgressShapeValues)}
            {renderPropEditor('Level', 'progress_level', 'number')}
            {renderPropEditor('Width', 'progress_width', 'number')}
            {renderPropEditor('Height', 'progress_height', 'number')}
            {renderPropEditor('Size', 'progress_size', 'number')}
            {renderPropEditor('Count', 'progress_count', 'number')}
          </div>
        )}

        {/* CURVED TAB */}
        {currentTabId === 'curved' && (
          <div class="inspector-group">
            {renderPropEditor('Text', 'curved_expression', 'string')}
            {renderPropEditor('Radius', 'curved_radius', 'number')}
            {renderPropEditor('Size', 'curved_size', 'number')}
            {renderPropEditor('Angle', 'curved_angle', 'number')}
          </div>
        )}

        {/* LAYER TAB (for containers) */}
        {currentTabId === 'layer' && (
          <div class="inspector-group">
            {node.type === 'StackLayerModule' &&
              renderPropEditor('Stack Mode', 'config_stacking', 'select', LayerStackingValues)}
            {renderPropEditor('Scale', 'config_scale_value', 'number')}
            {renderPropEditor('Visible', 'config_visibility', 'string')}
          </div>
        )}

        {/* PAINT TAB */}
        {currentTabId === 'paint' && (
          <div class="inspector-group">
            {renderPropEditor('Color', 'paint_color', 'color')}
            {renderPropEditor('Style', 'paint_style', 'select', PaintStyleValues)}
            {renderPropEditor('Stroke', 'paint_stroke', 'number')}
            {renderPropEditor('Mode', 'paint_mode', 'select', PaintModeValues)}
          </div>
        )}

        {/* FX TAB */}
        {currentTabId === 'fx' && (
          <div class="inspector-group">
            {renderPropEditor('Gradient', 'fx_gradient', 'select', GradientValues)}
            {renderPropEditor('Grad Color', 'fx_gradient_color', 'color')}
            {renderPropEditor('Mask', 'fx_mask', 'select', MaskFilterValues)}
            {renderPropEditor('Shadow', 'fx_shadow', 'select', ShadowValues)}
            {renderPropEditor('Shadow Blur', 'fx_shadow_blur', 'number')}
            {renderPropEditor('Shadow Dist', 'fx_shadow_distance', 'number')}
            {renderPropEditor('Shadow Dir', 'fx_shadow_direction', 'number')}
          </div>
        )}

        {/* POSITION TAB */}
        {currentTabId === 'position' && (
          <div class="inspector-group">
            {renderPropEditor('Anchor', 'position_anchor', 'select', AnchorModeValues)}
            {node.type !== 'RootLayerModule' &&
              renderPropEditor('X Offset', 'position_offset_x', 'number')}
            {node.type !== 'RootLayerModule' &&
              renderPropEditor('Y Offset', 'position_offset_y', 'number')}
            {renderPropEditor('Padding L', 'position_padding_left', 'number')}
            {renderPropEditor('Padding T', 'position_padding_top', 'number')}
            {renderPropEditor('Padding R', 'position_padding_right', 'number')}
            {renderPropEditor('Padding B', 'position_padding_bottom', 'number')}
          </div>
        )}

        {/* TOUCH TAB */}
        {currentTabId === 'touch' && (
          <div class="inspector-group">
            <div class="touch-empty-note">
              No touch actions configured. Touch actions execute in the Android launcher.
            </div>
          </div>
        )}

        {/* ANIMATION TAB */}
        {currentTabId === 'animation' && (
          <div class="inspector-group">
            <div class="touch-empty-note">
              Animations trigger on scroll, gyro, or global switch changes.
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
