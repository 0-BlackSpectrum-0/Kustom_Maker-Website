// src/core/validate/fixers/index.ts
import type { Doc, Node } from '../../model/types.ts';
import { SpecRegistry } from '../../spec/loader.ts';

export interface FixContext {
  targetRelease?: number;
  normalizeAliases?: boolean;
}

export interface FixReport {
  fixerId: string;
  applied: boolean;
  description: string;
}

export function fixColorFormat(doc: Doc): FixReport[] {
  const reports: FixReport[] = [];
  function walk(node: Node) {
    for (const [key, prop] of Object.entries(node.props)) {
      if (typeof prop.value === 'string' && prop.value.startsWith('#')) {
        let hex = prop.value.slice(1).toUpperCase();
        if (hex.length === 3) {
          // #RGB -> #FFRRGGBB
          hex = `FF${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
          prop.value = `#${hex}`;
          reports.push({ fixerId: 'F-color-format', applied: true, description: `Normalized 3-char hex on ${key}` });
        } else if (hex.length === 6) {
          // #RRGGBB -> #FFRRGGBB
          hex = `FF${hex}`;
          prop.value = `#${hex}`;
          reports.push({ fixerId: 'F-color-format', applied: true, description: `Normalized 6-char hex on ${key}` });
        } else if (hex.length === 8 && prop.value !== `#${hex}`) {
          prop.value = `#${hex}`;
          reports.push({ fixerId: 'F-color-format', applied: true, description: `Uppercase hex on ${key}` });
        }
      }
    }
    if (node.children) node.children.forEach(walk);
  }
  walk(doc.root);
  return reports;
}

export function fixDefaultOmit(doc: Doc): FixReport[] {
  const reports: FixReport[] = [];
  const spec = SpecRegistry.getInstance().spec;

  function walk(node: Node) {
    const modSpec = spec.modules[node.type];
    if (modSpec) {
      for (const section of Object.values(modSpec.sections)) {
        for (const p of section) {
          const prop = node.props[p.key];
          // If property value matches default and has no formula/global/toggle active, omit literal value
          if (prop && prop.value !== undefined && prop.value === p.default) {
            if (!prop.toggle && !prop.formula && !prop.global) {
              delete node.props[p.key];
              reports.push({ fixerId: 'F-default-omit', applied: true, description: `Omitted default value on ${p.key}` });
            } else if (prop.toggle === 0) {
              delete prop.value;
              reports.push({ fixerId: 'F-default-omit', applied: true, description: `Omitted default value on ${p.key}` });
            }
          }
        }
      }
    }
    if (node.children) node.children.forEach(walk);
  }
  walk(doc.root);
  return reports;
}

export function fixInfoMissing(doc: Doc): FixReport[] {
  const reports: FixReport[] = [];
  if (doc.info.version === undefined) {
    doc.info.version = 13;
    reports.push({ fixerId: 'F-info-missing', applied: true, description: 'Set version to 13' });
  }
  if (!doc.info.title) {
    doc.info.title = 'Untitled';
    reports.push({ fixerId: 'F-info-missing', applied: true, description: 'Set default title' });
  }
  if (doc.info.locked === undefined) {
    doc.info.locked = false;
    reports.push({ fixerId: 'F-info-missing', applied: true, description: 'Set locked to false' });
  }
  return reports;
}

export function fixRelease(doc: Doc, context: FixContext = {}): FixReport[] {
  const reports: FixReport[] = [];
  const target = context.targetRelease || 377435216;
  if (!doc.info.release || doc.info.release > target) {
    doc.info.release = target;
    reports.push({ fixerId: 'F-release', applied: true, description: `Set release to ${target}` });
  }
  return reports;
}

export function fixFeatures(doc: Doc): FixReport[] {
  const reports: FixReport[] = [];
  const features = new Set<string>();

  function scanStr(str?: string) {
    if (!str) return;
    if (/\bwi\s*\(/.test(str)) features.add('WEATHER');
    if (/\bwf\s*\(/.test(str)) features.add('FORECAST');
    if (/\bmi\s*\(/.test(str)) features.add('MUSIC');
    if (/\bni\s*\(/.test(str)) features.add('NOTIFICATIONS');
    if (/\bci\s*\(/.test(str)) features.add('CALENDAR');
    if (/\baq\s*\(/.test(str)) features.add('AIR_QUALITY');
    if (/\bnc\s*\(/.test(str)) {
      features.add('NETWORK_INFO');
      features.add('SIGNAL');
    }
    if (/\bbr\s*\([^,]*bluetooth/i.test(str)) features.add('BLUETOOTH');
  }

  function walk(node: Node) {
    for (const [k, p] of Object.entries(node.props)) {
      if (typeof p.value === 'string' && p.value.includes('CLOCK_')) {
        features.add('ANALOG_CLOCK');
      }
      scanStr(p.formula);
    }
    if (node.children) node.children.forEach(walk);
  }

  walk(doc.root);
  for (const g of Object.values(doc.globals)) {
    scanStr(g.global_formula);
  }

  const computed = Array.from(features).sort().join(' ');
  if (computed && doc.info.features !== computed) {
    doc.info.features = computed;
    reports.push({ fixerId: 'F-features', applied: true, description: `Recomputed features: ${computed}` });
  }
  return reports;
}

export function fixKfileAlias(doc: Doc, context: FixContext = {}): FixReport[] {
  const reports: FixReport[] = [];
  if (!context.normalizeAliases) return reports;

  const aliasRegex = /^kfile:\/\/org\.kustom\.provider\/(?:widgets|wallpapers|komponents)\/[^/]+\.(?:klwp|kwgt|komp)\/(.+)$/i;

  function walk(node: Node) {
    for (const [k, p] of Object.entries(node.props)) {
      if (typeof p.value === 'string') {
        const m = aliasRegex.exec(p.value);
        if (m) {
          const tail = m[1];
          p.value = `kfile://org.kustom.provider/${tail}`;
          reports.push({ fixerId: 'F-kfile-alias', applied: true, description: `Normalized alias kfile on ${k}` });
        }
      }
    }
    if (node.children) node.children.forEach(walk);
  }

  walk(doc.root);
  return reports;
}

export function sanitize(doc: Doc, context: FixContext = {}): FixReport[] {
  const allReports: FixReport[] = [
    ...fixInfoMissing(doc),
    ...fixRelease(doc, context),
    ...fixFeatures(doc),
    ...fixColorFormat(doc),
    ...fixDefaultOmit(doc),
    ...fixKfileAlias(doc, context),
  ];
  return allReports;
}
