import type { FormulaFunction } from '../types.ts';
import { t1Functions } from './t1-exact.ts';
import { t2Functions } from './t2-simulated.ts';
import { t3Functions } from './t3-placeholder.ts';

export const standardFunctions: Record<string, FormulaFunction> = {
  ...t3Functions,
  ...t2Functions,
  ...t1Functions,
};

export function getFunction(name: string, custom?: Record<string, FormulaFunction>): FormulaFunction | undefined {
  const lower = name.toLowerCase();
  return custom?.[lower] ?? standardFunctions[lower];
}
