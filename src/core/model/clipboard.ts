// src/core/model/clipboard.ts
import type { Node } from './types.ts';

export const KUSTOM_CLIP_PREFIX = '##KUSTOMCLIP##';

export interface KustomClipEnvelope {
  clip_version: number;
  clip_type?: string;
  clip_item: Node;
}

/**
 * Serializes a Node to the official Kustom clipboard string format.
 */
export function copyNodeToKustomClip(node: Node): string {
  const envelope: KustomClipEnvelope = {
    clip_version: 1,
    clip_type: node.type,
    clip_item: JSON.parse(JSON.stringify(node)),
  };
  return `${KUSTOM_CLIP_PREFIX}${JSON.stringify(envelope)}`;
}

/**
 * Parses a Kustom clipboard string and returns a detached Node with fresh unique IDs.
 */
export function parseKustomClip(clipText: string): Node | null {
  if (!clipText || !clipText.startsWith(KUSTOM_CLIP_PREFIX)) {
    return null;
  }

  const rawJson = clipText.slice(KUSTOM_CLIP_PREFIX.length).trim();
  try {
    const parsed = JSON.parse(rawJson);
    const item: Node = parsed.clip_item ?? parsed;
    if (!item || !item.type) {
      return null;
    }

    // Deep clone and regenerate IDs
    const cloned = JSON.parse(JSON.stringify(item)) as Node;
    regenerateIds(cloned);
    return cloned;
  } catch {
    return null;
  }
}

function regenerateIds(node: Node) {
  const randSuffix = Math.random().toString(36).substring(2, 7);
  node.id = `${node.id.split('_')[0] || 'node'}_${randSuffix}`;
  if (node.children) {
    for (const child of node.children) {
      regenerateIds(child);
    }
  }
}
