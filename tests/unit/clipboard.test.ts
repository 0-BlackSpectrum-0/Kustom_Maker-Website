// tests/unit/clipboard.test.ts
import { describe, it, expect } from 'vitest';
import { copyNodeToKustomClip, parseKustomClip, KUSTOM_CLIP_PREFIX } from '../../src/core/model/clipboard.ts';
import type { Node } from '../../src/core/model/types.ts';

describe('KustomClip Clipboard Format', () => {
  const sampleNode: Node = {
    id: 'shape_btn',
    type: 'ShapeModule',
    title: 'Button',
    props: {
      shape_type: { value: 'RECT' },
      shape_width: { value: 200 },
      paint_color: { value: '#FFE11D48' },
    },
    extras: { custom_tag: 'test' },
  };

  it('serializes a node with ##KUSTOMCLIP## prefix', () => {
    const clip = copyNodeToKustomClip(sampleNode);
    expect(clip.startsWith(KUSTOM_CLIP_PREFIX)).toBe(true);

    const json = JSON.parse(clip.slice(KUSTOM_CLIP_PREFIX.length));
    expect(json.clip_version).toBe(1);
    expect(json.clip_item.title).toBe('Button');
    expect(json.clip_item.props.shape_type.value).toBe('RECT');
  });

  it('parses a valid KUSTOMCLIP and regenerates unique IDs', () => {
    const clip = copyNodeToKustomClip(sampleNode);
    const pasted = parseKustomClip(clip);

    expect(pasted).not.toBeNull();
    expect(pasted?.type).toBe('ShapeModule');
    expect(pasted?.title).toBe('Button');
    expect(pasted?.props.shape_width.value).toBe(200);
    // ID must be regenerated so pasting multiple times doesn't collide
    expect(pasted?.id).not.toBe(sampleNode.id);
  });

  it('gracefully returns null for non-KUSTOMCLIP text or corrupt JSON', () => {
    expect(parseKustomClip('')).toBeNull();
    expect(parseKustomClip('Just normal text')).toBeNull();
    expect(parseKustomClip(`${KUSTOM_CLIP_PREFIX}invalid-json`)).toBeNull();
  });
});
