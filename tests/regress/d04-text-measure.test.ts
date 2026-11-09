import { describe, it, expect } from 'vitest';
import { measureNode } from '../../src/core/layout/measure.ts';
import { PropertyResolver } from '../../src/core/layout/resolver.ts';
import { createFormulaContext, defaultSimState } from '../../src/core/formula/index.ts';
import type { Node } from '../../src/core/model/types.ts';

describe('D04: Text measurement, wrapping and sizing modes', () => {
  const ctx = createFormulaContext(defaultSimState());
  const resolver = new PropertyResolver();

  it('wraps text to text_width when text_size_type is FIXED_WIDTH and respects text_lines', () => {
    const longText = 'The quick brown fox jumps over the lazy dog and runs through the deep forest';
    const node: Node = {
      id: 'text1',
      type: 'TextModule',
      title: 'Wrapped Text',
      props: {
        text_expression: { value: longText },
        text_size: { value: 20 },
        text_size_type: { value: 'FIXED_WIDTH' },
        text_width: { value: 200 },
        text_lines: { value: 2 },
      },
    };

    const layout = measureNode(node, 1, ctx, resolver, 500, 500);

    // Box width should not exceed text_width
    expect(layout.box.w).toBeLessThanOrEqual(200);
    // Should produce wrapped lines respecting text_lines
    expect(layout.textLayout).toBeDefined();
    expect(layout.textLayout?.lines.length).toBeLessThanOrEqual(2);
  });

  it('scales down font size when text_size_type is SINGLE_FIXED_WIDTH and text overflows', () => {
    const longText = 'A very long headline that definitely exceeds 150 units at font size 40';
    const node: Node = {
      id: 'text2',
      type: 'TextModule',
      title: 'Scaled Text',
      props: {
        text_expression: { value: longText },
        text_size: { value: 40 },
        text_size_type: { value: 'SINGLE_FIXED_WIDTH' },
        text_width: { value: 150 },
      },
    };

    const layout = measureNode(node, 1, ctx, resolver, 500, 500);

    expect(layout.box.w).toBeLessThanOrEqual(150);
    expect(layout.textLayout).toBeDefined();
    expect(layout.textLayout?.fontSize).toBeLessThan(40);
  });
});
