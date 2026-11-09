export * from './types.ts';
export * from './tokenizer.ts';
export * from './parser.ts';
export * from './evaluator.ts';
export * from './sim/sim-state.ts';
export * from './functions/color-utils.ts';
export * from './functions/t1-exact.ts';
export * from './functions/t2-simulated.ts';
export * from './functions/t3-placeholder.ts';
export * from './functions/registry.ts';

import type { FormulaContext, FormulaValue, SimState } from './types.ts';
import { defaultSimState } from './sim/sim-state.ts';
import { evaluateExpression, evaluateText, evaluateValue } from './evaluator.ts';

export function createFormulaContext(
  sim?: SimState,
  globals?: Record<string, { value?: unknown; formula?: string; toggles?: number }>,
): FormulaContext {
  const effectiveSim = sim ?? defaultSimState();
  const locals = new Map<string, FormulaValue>();

  const ctx: FormulaContext = {
    sim: effectiveSim,
    globals,
    locals,
    resolveGlobal: (name, currentCtx) => {
      const g = globals?.[name] ?? globals?.[name.replace(/\.0$/, '')];
      if (!g) return '';
      if (g.formula) {
        return evaluateValue(g.formula, currentCtx);
      }
      return (g.value as FormulaValue) ?? '';
    },
    evaluateExpression: (expr, currentCtx) => evaluateExpression(expr, currentCtx),
  };

  return ctx;
}

export function evalFormula(
  text: string,
  sim?: SimState,
  globals?: Record<string, { value?: unknown; formula?: string; toggles?: number }>,
): FormulaValue {
  const ctx = createFormulaContext(sim, globals);
  return evaluateValue(text, ctx);
}
