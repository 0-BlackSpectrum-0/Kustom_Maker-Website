import type { Node, Prop } from '../model/types.ts';
import type { FormulaContext } from '../formula/types.ts';
import { evaluateValue } from '../formula/evaluator.ts';
import { valueToString } from '../formula/functions/t1-exact.ts';
import { isNumeric } from '../formula/tokenizer.ts';
import { SpecRegistry } from '../spec/loader.ts';

export class PropertyResolver {
  private defaults: Record<string, unknown> = {};

  constructor() {
    this.defaults = SpecRegistry.getInstance().spec.defaults as Record<string, unknown>;
  }

  getDefault(moduleType: string, key: string): unknown {
    return this.defaults[key];
  }

  resolveValue(node: Node, key: string, ctx: FormulaContext): unknown {
    const prop: Prop | undefined = node.props[key];
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

    // First resolve all known properties in node.props
    for (const key of Object.keys(node.props)) {
      resolved[key] = this.resolveValue(node, key, ctx);
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
  if (typeof v === 'number') return isNaN(v) ? def : v;
  if (typeof v === 'string' && isNumeric(v)) return parseFloat(v);
  return def;
}

export function propEnum<T extends string>(
  resolved: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  def: T,
): T {
  const s = propStr(resolved, key).trim().toUpperCase() as T;
  return allowed.includes(s) ? s : def;
}
