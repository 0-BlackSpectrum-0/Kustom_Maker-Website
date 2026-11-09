// src/core/model/canonical.ts

export function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    if (Object.is(value, -0)) return '0';
    return Number.isFinite(value) ? String(value) : 'null';
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalJson(item));
    return `[${items.join(',')}]`;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const entries = keys.map((k) => {
      const val = (value as Record<string, unknown>)[k];
      return `${JSON.stringify(k)}:${canonicalJson(val)}`;
    });
    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

export function areCanonicallyEqual(a: unknown, b: unknown): boolean {
  return canonicalJson(a) === canonicalJson(b);
}
