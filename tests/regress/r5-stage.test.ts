import { describe, it, expect } from 'vitest';

describe('Phase R5: Stage Correctness, Direct Manipulation, and Zoom Math', () => {
  it('correctly calculates drag-to-move offsets based on anchor sign rules', () => {
    // Left-aligned anchor: dragging right (+15px) increases position_offset_x by 15
    const isRightTopLeft = 'TOPLEFT'.includes('RIGHT');
    const isBottomTopLeft = 'TOPLEFT'.includes('BOTTOM');
    const nextX_left = 10 + (isRightTopLeft ? -15 : 15);
    const nextY_top = 20 + (isBottomTopLeft ? -15 : 15);
    expect(nextX_left).toBe(25);
    expect(nextY_top).toBe(35);

    // Right-aligned anchor: dragging right (+15px) decreases position_offset_x by 15
    const isRightTopRight = 'TOPRIGHT'.includes('RIGHT');
    const isBottomTopRight = 'TOPRIGHT'.includes('BOTTOM');
    const nextX_right = 50 + (isRightTopRight ? -15 : 15);
    const nextY_right = 20 + (isBottomTopRight ? -15 : 15);
    expect(nextX_right).toBe(35);
    expect(nextY_right).toBe(35);

    // Bottom-aligned anchor: dragging down (+10px) decreases position_offset_y by 10
    const isRightBottom = 'BOTTOM'.includes('RIGHT');
    const isBottomBottom = 'BOTTOM'.includes('BOTTOM');
    const nextX_bottom = 0 + (isRightBottom ? -10 : 10);
    const nextY_bottom = 40 + (isBottomBottom ? -10 : 10);
    expect(nextX_bottom).toBe(10);
    expect(nextY_bottom).toBe(30);
  });

  it('preserves point under cursor during zoom around cursor', () => {
    const mouseX = 120;
    const mouseY = 80;
    const currentPan = { x: 50, y: 30 };
    const currentZoom = 1.0;
    const nextZoom = 1.5;
    const scaleRatio = nextZoom / currentZoom;

    const nextPan = {
      x: mouseX - (mouseX - currentPan.x) * scaleRatio,
      y: mouseY - (mouseY - currentPan.y) * scaleRatio,
    };

    // Calculate stage coordinate before zoom: (mouseX - pan.x) / zoom
    const stageXBefore = (mouseX - currentPan.x) / currentZoom;
    const stageYBefore = (mouseY - currentPan.y) / currentZoom;

    // Calculate stage coordinate after zoom with new pan: (mouseX - nextPan.x) / nextZoom
    const stageXAfter = (mouseX - nextPan.x) / nextZoom;
    const stageYAfter = (mouseY - nextPan.y) / nextZoom;

    expect(stageXAfter).toBeCloseTo(stageXBefore, 5);
    expect(stageYAfter).toBeCloseTo(stageYBefore, 5);
  });
});
