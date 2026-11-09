import { describe, it, expect } from 'vitest';
import {
  createOfficialNode,
  getBreadcrumbTrail,
  createDefaultDoc,
  findParentNode,
} from '../../src/ui/state/editor-state.ts';

describe('Phase F6–F8: Official Kustom UI Shell & Stage Components', () => {
  it('creates official modules matching the 11 add-item options', () => {
    const types = [
      'KomponentModule',
      'TextModule',
      'ShapeModule',
      'BitmapModule',
      'FontIconModule',
      'ProgressModule',
      'CurvedTextModule',
      'SeriesModule',
      'OverlapLayerModule',
      'StackLayerModule',
      'AnimatedImageModule',
    ];

    for (const type of types) {
      const node = createOfficialNode(type);
      expect(node.type).toBe(type);
      expect(node.id).toBeTruthy();
      expect(node.title).toBeTruthy();
      expect(node.props).toBeDefined();
    }
  });

  it('computes breadcrumb hierarchy trail from root to leaf', () => {
    const doc = createDefaultDoc();
    const leaf = doc.root.children![0]; // 'bg'
    const trail = getBreadcrumbTrail(doc.root, leaf.id);

    expect(trail.length).toBe(2);
    expect(trail[0].id).toBe(doc.root.id);
    expect(trail[1].id).toBe(leaf.id);
  });

  it('correctly finds parent node in nested hierarchy', () => {
    const doc = createDefaultDoc();
    const leaf = doc.root.children![0];
    const parent = findParentNode(doc.root, leaf.id);

    expect(parent).not.toBeNull();
    expect(parent!.id).toBe(doc.root.id);
  });
});
