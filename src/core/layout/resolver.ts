import type { Node, Prop } from '../model/types.ts';
import type { FormulaContext } from '../formula/types.ts';
import { evaluateValue } from '../formula/evaluator.ts';
import { valueToString } from '../formula/functions/t1-exact.ts';
import { MODULE_SPECS, SPEC_DEFAULTS } from '../spec/generated.ts';

export class PropertyResolver {
  private moduleDefaults = new Map<string, Record<string, unknown>>();

  constructor() {
    for (const [modType, spec] of Object.entries(MODULE_SPECS as Record<string, any>)) {
      const defs: Record<string, unknown> = {};
      if (spec.sections) {
        for (const propList of Object.values(spec.sections as Record<string, any[]>)) {
          if (Array.isArray(propList)) {
            for (const prop of propList) {
              if (prop && prop.key && prop.default !== undefined) {
                defs[prop.key] = prop.default;
              }
            }
          }
        }
      }
      this.moduleDefaults.set(modType, defs);
    }
  }

  getDefault(moduleType: string, key: string): unknown {
    const modDefs = this.moduleDefaults.get(moduleType);
    if (modDefs && key in modDefs) {
      return modDefs[key];
    }
    return (SPEC_DEFAULTS as Record<string, unknown>)[key];
  }

  resolveValue(node: Node, key: string, ctx: FormulaContext): unknown {
    const prop: Prop | undefined = node.props ? node.props[key] : undefined;
    const toggle = prop?.toggle ?? 0;

    let v: unknown;
    if ((toggle & 100) === 100 && prop?.global) {
      if (ctx.resolveGlobal) {
        v = ctx.resolveGlobal(prop.global, ctx);
      }
    } else if ((toggle & 10) === 10 && prop?.formula) {
      v = evaluateValue(prop.formula, ctx);
    }

    if (v === undefined || v === null) {
      v = prop?.value;
    }

    if (v === undefined || v === null) {
      v = this.getDefault(node.type, key);
    }

    return v;
  }

  resolveAll(node: Node, ctx: FormulaContext): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    // 1. Fill defaults for all known properties of this module type
    const modDefs = this.moduleDefaults.get(node.type);
    if (modDefs) {
      for (const [k, defVal] of Object.entries(modDefs)) {
        resolved[k] = defVal;
      }
    }

    // 2. Resolve and override with any explicit properties in node.props
    if (node.props) {
      for (const key of Object.keys(node.props)) {
        const val = this.resolveValue(node, key, ctx);
        if (val !== undefined && val !== null) {
          resolved[key] = val;
        }
      }
    }

    return resolved;
  }
}

export function propStr(resolved: Record<string, unknown>, key: string, def = ''): string {
  const v = resolved[key];
  if (v === undefined || v === null) return def;
  if (typeof v === 'number') return valueToString(v);
  return String(v);
}

export function propNum(resolved: Record<string, unknown>, key: string, def = 0): number {
  const v = resolved[key];
  if (typeof v === 'number') return v;
  if (v && typeof (v as any).valueOf === 'function') {
    const num = Number(v);
    if (!Number.isNaN(num)) return num;
  }
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return isNaN(n) ? def : n;
  }
  return def;
}

export function propEnum<T extends string>(
  resolved: Record<string, unknown>,
  key: string,
  allowed: readonly T[] | undefined,
  def: T,
): T {
  const v = resolved[key];
  if (typeof v === 'string' && Array.isArray(allowed) && (allowed as readonly string[]).includes(v)) {
    return v as T;
  }
  return def;
}
