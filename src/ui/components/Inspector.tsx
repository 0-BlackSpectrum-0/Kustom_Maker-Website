import { h } from 'preact';
import {
  currentDoc,
  selectedNodeId,
  findNodeById,
  updateNodeProp,
  drawerOpen,
  activeDrawerTab,
} from '../state/editor-state.ts';

export function Inspector() {
  const doc = currentDoc.value;
  const selectedId = selectedNodeId.value;

  if (!doc || !selectedId) {
    return (
      <aside class="inspector-panel">
        <div style={{ padding: '16px', color: 'var(--text-subtle)' }}>No module selected</div>
      </aside>
    );
  }

  const node = findNodeById(doc.root, selectedId);
  if (!node) {
    return (
      <aside class="inspector-panel">
        <div style={{ padding: '16px', color: 'var(--text-subtle)' }}>Selected module not found</div>
      </aside>
    );
  }

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

    return (
      <div class="prop-row" key={propKey}>
        <div class="prop-label" title={label}>{label}</div>

        <div class="prop-input-group">
          {toggle === 0 && (
            <div>
              {type === 'select' && options ? (
                <select
                  value={String(value)}
                  onChange={(e) =>
                    updateNodeProp(node.id, propKey, { value: (e.target as HTMLSelectElement).value })
                  }
                >
                  {options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : type === 'color' ? (
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={(String(value).slice(0, 7) || '#ffffff')}
                    onChange={(e) => {
                      const hex = (e.target as HTMLInputElement).value.toUpperCase();
                      updateNodeProp(node.id, propKey, { value: '#FF' + hex.slice(1) });
                    }}
                    style={{ width: '28px', height: '24px', padding: 0, border: 'none', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={String(value)}
                    onChange={(e) =>
                      updateNodeProp(node.id, propKey, { value: (e.target as HTMLInputElement).value })
                    }
                  />
                </div>
              ) : (
                <input
                  type={type === 'number' ? 'number' : 'text'}
                  value={String(value)}
                  onChange={(e) => {
                    const raw = (e.target as HTMLInputElement).value;
                    const val = type === 'number' ? (parseFloat(raw) || 0) : raw;
                    updateNodeProp(node.id, propKey, { value: val });
                  }}
                />
              )}
            </div>
          )}

          {toggle === 10 && (
            <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
              <input
                type="text"
                value={formula}
                placeholder="$...$"
                style={{ color: '#60a5fa' }}
                onChange={(e) =>
                  updateNodeProp(node.id, propKey, { formula: (e.target as HTMLInputElement).value })
                }
              />
              <button
                class="btn btn-sm"
                title="Open Formula Drawer"
                onClick={() => {
                  drawerOpen.value = true;
                  activeDrawerTab.value = 'formula';
                }}
              >
                fx
              </button>
            </div>
          )}

          {toggle === 100 && (
            <select
              value={globalName}
              style={{ color: '#34d399' }}
              onChange={(e) =>
                updateNodeProp(node.id, propKey, { global: (e.target as HTMLSelectElement).value })
              }
            >
              <option value="">-- select global --</option>
              {Object.keys(doc.globals).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          )}

          {/* Three-way source toggle button group */}
          <div class="source-switch">
            <button
              class={`source-opt ${toggle === 0 ? 'active' : ''}`}
              title="Literal Value"
              onClick={() => handleToggle(0)}
            >
              Val
            </button>
            <button
              class={`source-opt ${toggle === 10 ? 'active-fx' : ''}`}
              title="Formula"
              onClick={() => handleToggle(10)}
            >
              fx
            </button>
            <button
              class={`source-opt ${toggle === 100 ? 'active-glob' : ''}`}
              title="Global Variable"
              onClick={() => handleToggle(100)}
            >
              gv
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside class="inspector-panel">
      <div style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>
        {node.title || node.type} ({node.type})
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Module Specific Properties */}
        {node.type === 'ShapeModule' && (
          <div class="inspector-section">
            <div class="section-title">Shape</div>
            {renderPropEditor('Shape Type', 'shape_type', 'select', [
              'RECT',
              'CIRCLE',
              'SQUARE',
              'OVAL',
              'TRIANGLE',
              'RTRIANGLE',
              'EXAGON',
              'ARC',
              'SLICE',
            ])}
            {renderPropEditor('Width', 'shape_width', 'number')}
            {renderPropEditor('Height', 'shape_height', 'number')}
            {renderPropEditor('Corners', 'shape_corners', 'number')}
            {renderPropEditor('Angle', 'shape_angle', 'number')}
          </div>
        )}

        {node.type === 'TextModule' && (
          <div class="inspector-section">
            <div class="section-title">Text</div>
            {renderPropEditor('Text', 'text_expression', 'string')}
            {renderPropEditor('Size', 'text_size', 'number')}
            {renderPropEditor('Align', 'text_align', 'select', ['LEFT', 'CENTER', 'RIGHT'])}
          </div>
        )}

        {/* Paint Properties */}
        {['ShapeModule', 'TextModule', 'FontIconModule'].includes(node.type) && (
          <div class="inspector-section">
            <div class="section-title">Paint</div>
            {renderPropEditor('Color', 'paint_color', 'color')}
            {renderPropEditor('Style', 'paint_style', 'select', ['FILL', 'STROKE'])}
            {renderPropEditor('Stroke', 'paint_stroke', 'number')}
            {renderPropEditor('Mode', 'paint_mode', 'select', [
              'NORMAL',
              'CLEAR',
              'XOR',
              'SRC',
              'DARKEN',
              'LIGHTEN',
              'MULTIPLY',
              'SCREEN',
              'ADD',
            ])}
          </div>
        )}

        {/* FX Properties */}
        <div class="inspector-section">
          <div class="section-title">FX</div>
          {renderPropEditor('Gradient', 'fx_gradient', 'select', [
            'NONE',
            'HORIZONTAL',
            'VERTICAL',
            'RADIAL',
            'SWEEP',
          ])}
          {renderPropEditor('Grad Color', 'fx_gradient_color', 'color')}
          {renderPropEditor('Mask', 'fx_mask', 'select', ['NONE', 'CLIP_NEXT', 'CLIP_ALL'])}
          {renderPropEditor('Shadow', 'fx_shadow', 'select', ['NONE', 'OUTER'])}
        </div>

        {/* Position Properties */}
        <div class="inspector-section">
          <div class="section-title">Position</div>
          {renderPropEditor('Anchor', 'position_anchor', 'select', [
            'TOP_LEFT',
            'TOP',
            'TOP_RIGHT',
            'CENTER_LEFT',
            'CENTER',
            'CENTER_RIGHT',
            'BOTTOM_LEFT',
            'BOTTOM',
            'BOTTOM_RIGHT',
          ])}
          {node.type !== 'RootLayerModule' && renderPropEditor('Offset X', 'position_offset_x', 'number')}
          {node.type !== 'RootLayerModule' && renderPropEditor('Offset Y', 'position_offset_y', 'number')}
          {renderPropEditor('Padding L', 'position_padding_left', 'number')}
          {renderPropEditor('Padding T', 'position_padding_top', 'number')}
          {renderPropEditor('Padding R', 'position_padding_right', 'number')}
          {renderPropEditor('Padding B', 'position_padding_bottom', 'number')}
        </div>
      </div>
    </aside>
  );
}
