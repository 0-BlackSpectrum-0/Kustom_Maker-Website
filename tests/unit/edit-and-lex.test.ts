import { describe, it, expect } from 'vitest';
import { parseJsonWithLex, stringifyWithLex } from '../../src/core/model/json-lex.ts';
import { parsePresetJson, parseModule } from '../../src/core/model/parser.ts';
import { serializePresetJsonString, serializeModule } from '../../src/core/model/serializer.ts';
import { editNode, setProp, addChild, removeNode, moveNode } from '../../src/core/model/edit.ts';
import type { Doc, Node } from '../../src/core/model/types.ts';

describe('Phase F1: Edit Model, Lex Numbers, and Nested Globals', () => {
  it('preserves exact float formatting like 22.0 via LexNumber', () => {
    const raw = '{"width":22.0,"count":10,"ratio":0.50}';
    const parsed = parseJsonWithLex(raw);
    expect(parsed.width.valueOf()).toBe(22);
    expect(parsed.width.toString()).toBe('22.0');
    expect(parsed.count).toBe(10);
    expect(parsed.ratio.valueOf()).toBe(0.5);
    expect(parsed.ratio.toString()).toBe('0.50');

    const reserialized = stringifyWithLex(parsed);
    expect(reserialized).toBe('{"width":22.0,"count":10,"ratio":0.50}');
  });

  it('preserves nested globals_list on child modules (e.g. Komponents)', () => {
    const rawModule = {
      internal_type: 'KomponentModule',
      internal_title: 'MyKomp',
      globals_list: {
        accent: {
          type: 'COLOR',
          value: '#FF123456',
        },
      },
    };

    const parsedNode = parseModule(rawModule);
    expect(parsedNode.globals).toBeDefined();
    expect(parsedNode.globals?.accent?.value).toBe('#FF123456');

    const serialized = serializeModule(parsedNode, false);
    expect(serialized.globals_list).toBeDefined();
    expect((serialized.globals_list as any).accent?.value).toBe('#FF123456');
  });

  it('performs immutable tree operations via editNode, setProp, addChild, removeNode, and moveNode', () => {
    const kid1: Node = {
      id: 'k1',
      type: 'ShapeModule',
      title: 'Kid 1',
      props: { shape_width: { value: 50 } },
      extras: {},
    };
    const kid2: Node = {
      id: 'k2',
      type: 'ShapeModule',
      title: 'Kid 2',
      props: { shape_width: { value: 60 } },
      extras: {},
    };
    const doc: Doc = {
      kind: 'kwgt',
      info: { title: 'Test' },
      root: {
        id: 'root',
        type: 'RootLayerModule',
        title: 'Root',
        props: {},
        extras: {},
        children: [kid1, kid2],
      },
      globals: {},
      assets: new Map([['icon.png', new Uint8Array([1])]]),
      thumbs: {},
      extras: {},
    };

    // setProp
    const d1 = setProp(doc, 'k1', 'shape_width', { value: 75 });
    expect(d1.root.children![0].props.shape_width.value).toBe(75);
    expect(doc.root.children![0].props.shape_width.value).toBe(50); // untouched original
    expect(d1.assets).toBe(doc.assets); // preserved asset map

    // addChild
    const kid3: Node = { id: 'k3', type: 'TextModule', title: 'Kid 3', props: {}, extras: {} };
    const d2 = addChild(d1, 'root', kid3);
    expect(d2.root.children!.length).toBe(3);
    expect(d1.root.children!.length).toBe(2);

    // moveNode
    const d3 = moveNode(d2, 'k3', -1);
    expect(d3.root.children![1].id).toBe('k3');
    expect(d3.root.children![2].id).toBe('k2');

    // removeNode
    const d4 = removeNode(d3, 'k1');
    expect(d4.root.children!.length).toBe(2);
    expect(d4.root.children![0].id).toBe('k3');
  });
});
