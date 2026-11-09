// src/core/model/edit.ts
import type { Doc, Node, Prop, GlobalDef } from './types.ts';

/**
 * Recursively maps over nodes to produce a new tree with the target node updated.
 * Preserves structural sharing for all unchanged subtrees.
 */
export function mapNode(n: Node, id: string, fn: (n: Node) => Node): Node {
  if (n.id === id) return fn(n);
  if (!n.children || n.children.length === 0) return n;

  let changed = false;
  const nextChildren = n.children.map((c) => {
    const updated = mapNode(c, id, fn);
    if (updated !== c) changed = true;
    return updated;
  });

  return changed ? { ...n, children: nextChildren } : n;
}

/**
 * Updates a node inside a document immutably, preserving assets Map and thumbnails.
 */
export const editNode = (d: Doc, id: string, fn: (n: Node) => Node): Doc => ({
  ...d,
  root: mapNode(d.root, id, fn),
});

/**
 * Updates a specific property of a node immutably.
 */
export const setProp = (d: Doc, id: string, key: string, patch: Partial<Prop>): Doc =>
  editNode(d, id, (n) => ({
    ...n,
    props: {
      ...n.props,
      [key]: { ...(n.props[key] || {}), ...patch },
    },
  }));

/**
 * Adds a child node to a parent node immutably.
 */
export function addChild(d: Doc, parentId: string, child: Node, index?: number): Doc {
  return editNode(d, parentId, (parent) => {
    const kids = parent.children ? [...parent.children] : [];
    if (index !== undefined && index >= 0 && index <= kids.length) {
      kids.splice(index, 0, child);
    } else {
      kids.push(child);
    }
    return { ...parent, children: kids };
  });
}

/**
 * Removes a node by ID immutably.
 */
export function removeNode(d: Doc, nodeId: string): Doc {
  if (d.root.id === nodeId) return d; // Root cannot be deleted

  function filterKids(n: Node): Node {
    if (!n.children || n.children.length === 0) return n;
    const hasTarget = n.children.some((c) => c.id === nodeId);
    if (hasTarget) {
      return { ...n, children: n.children.filter((c) => c.id !== nodeId) };
    }
    let changed = false;
    const nextKids = n.children.map((c) => {
      const updated = filterKids(c);
      if (updated !== c) changed = true;
      return updated;
    });
    return changed ? { ...n, children: nextKids } : n;
  }

  return { ...d, root: filterKids(d.root) };
}

/**
 * Moves a node within its parent's children list by a given delta (e.g. -1 for up, +1 for down).
 */
export function moveNode(d: Doc, nodeId: string, delta: number): Doc {
  if (d.root.id === nodeId || delta === 0) return d;

  function moveInKids(n: Node): Node {
    if (!n.children || n.children.length === 0) return n;
    const idx = n.children.findIndex((c) => c.id === nodeId);
    if (idx >= 0) {
      const newIdx = idx + delta;
      if (newIdx < 0 || newIdx >= n.children.length) return n;
      const kids = [...n.children];
      const [item] = kids.splice(idx, 1);
      kids.splice(newIdx, 0, item);
      return { ...n, children: kids };
    }
    let changed = false;
    const nextKids = n.children.map((c) => {
      const updated = moveInKids(c);
      if (updated !== c) changed = true;
      return updated;
    });
    return changed ? { ...n, children: nextKids } : n;
  }

  return { ...d, root: moveInKids(d.root) };
}

/**
 * Clones a node deeply while preserving plain field key orders.
 */
export function cloneNode(n: Node): Node {
  const copyProps: Record<string, Prop> = {};
  for (const [k, p] of Object.entries(n.props)) {
    copyProps[k] = { ...p };
  }

  const keys = n.keyOrder || n.originalKeyOrder;

  return {
    ...n,
    props: copyProps,
    extras: { ...n.extras },
    events: n.events ? [...n.events] : undefined,
    animations: n.animations ? [...n.animations] : undefined,
    flows: n.flows ? [...n.flows] : undefined,
    keyOrder: keys ? [...keys] : undefined,
    originalKeyOrder: keys ? [...keys] : undefined,
    globals: n.globals ? { ...n.globals } : undefined,
    children: n.children ? n.children.map(cloneNode) : undefined,
  };
}

/**
 * Clones a Doc while strictly preserving `assets` (Map) and `thumbs` (Uint8Array) instances.
 */
export function cloneDoc(d: Doc): Doc {
  const clonedGlobals: Record<string, GlobalDef> = {};
  for (const [k, g] of Object.entries(d.globals)) {
    clonedGlobals[k] = { ...g };
  }

  return {
    kind: d.kind,
    info: { ...d.info },
    root: cloneNode(d.root),
    globals: clonedGlobals,
    assets: new Map(d.assets),
    thumbs: { ...d.thumbs },
    extras: { ...d.extras },
    originalEntryOrder: d.originalEntryOrder ? [...d.originalEntryOrder] : undefined,
  };
}

/**
 * Finds a node by ID in the tree.
 */
export function findNodeById(root: Node, id: string): Node | null {
  if (root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
}
