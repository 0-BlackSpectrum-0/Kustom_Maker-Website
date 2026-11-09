// src/core/archive/resolver.ts

export interface ResolveResult {
  uri: string;
  status: 'exact' | 'alias' | 'case_insensitive' | 'missing' | 'invalid_provider';
  resolvedPath?: string;
  data?: Uint8Array;
}

export function resolveKfile(uri: string, assets: Map<string, Uint8Array>): ResolveResult {
  const prefix = 'kfile://org.kustom.provider/';
  if (!uri.startsWith(prefix)) {
    return { uri, status: 'invalid_provider' };
  }

  let p = uri.slice(prefix.length);

  // Exact match
  if (assets.has(p)) {
    return { uri, status: 'exact', resolvedPath: p, data: assets.get(p) };
  }

  // Alias match: (widgets|wallpapers|komponents)/<name>.<ext>/<path>
  const aliasRegex = /^(?:widgets|wallpapers|komponents)\/[^/]+\.(?:klwp|kwgt|komp)\/(.+)$/i;
  const match = aliasRegex.exec(p);
  if (match) {
    const tail = match[1];
    if (assets.has(tail)) {
      return { uri, status: 'alias', resolvedPath: tail, data: assets.get(tail) };
    }
    // Case-insensitive match on tail
    const lowerTail = tail.toLowerCase();
    for (const [key, val] of assets.entries()) {
      if (key.toLowerCase() === lowerTail) {
        return { uri, status: 'alias', resolvedPath: key, data: val };
      }
    }
    return { uri, status: 'missing', resolvedPath: tail };
  }

  // Case-insensitive match on full path
  const lowerP = p.toLowerCase();
  for (const [key, val] of assets.entries()) {
    if (key.toLowerCase() === lowerP) {
      return { uri, status: 'case_insensitive', resolvedPath: key, data: val };
    }
  }

  return { uri, status: 'missing', resolvedPath: p };
}
