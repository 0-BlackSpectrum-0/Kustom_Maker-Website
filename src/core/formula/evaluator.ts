import type { ASTNode, FormulaContext, FormulaValue } from './types.ts';
import { parseExpression } from './parser.ts';
import { isNumeric, splitFormulaSegments } from './tokenizer.ts';
import { standardFunctions } from './functions/registry.ts';
import { isTruthy, valueToString } from './functions/t1-exact.ts';

const MAX_DEPTH = 60;

function toNum(v: FormulaValue): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const s = String(v).trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function areBothNumeric(a: FormulaValue, b: FormulaValue): boolean {
  if (typeof a === 'number' && typeof b === 'number') return true;
  const sa = typeof a === 'string' ? a : String(a);
  const sb = typeof b === 'string' ? b : String(b);
  return isNumeric(sa) && isNumeric(sb);
}

function compareEquals(a: FormulaValue, b: FormulaValue): boolean {
  if (typeof a === 'number' && typeof b === 'number') return a === b;
  if (areBothNumeric(a, b)) return toNum(a) === toNum(b);
  return valueToString(a).trim().toLowerCase() === valueToString(b).trim().toLowerCase();
}

export function evaluateAST(node: ASTNode, ctx: FormulaContext): FormulaValue {
  const currentDepth = (ctx.depth ?? 0) + 1;
  if (currentDepth > MAX_DEPTH) {
    ctx.warn?.(`Formula recursion limit (${MAX_DEPTH}) exceeded`);
    return '';
  }
  const childCtx = { ...ctx, depth: currentDepth };

  switch (node.type) {
    case 'Literal':
      return node.value;

    case 'Identifier': {
      const lower = node.name.toLowerCase();
      if (childCtx.locals.has(lower)) {
        return childCtx.locals.get(lower)!;
      }
      return node.name;
    }

    case 'LocalVar': {
      const lower = node.name.toLowerCase();
      return childCtx.locals.get(lower) ?? '';
    }

    case 'UnaryOp': {
      const val = evaluateAST(node.argument, childCtx);
      if (typeof val === 'number') {
        return node.op === '-' ? -val : val;
      }
      if (isNumeric(String(val))) {
        const n = parseFloat(String(val));
        return node.op === '-' ? -n : n;
      }
      return node.op === '-' ? '-' + valueToString(val) : valueToString(val);
    }

    case 'BinaryOp': {
      const left = evaluateAST(node.left, childCtx);
      const right = evaluateAST(node.right, childCtx);
      const nums = areBothNumeric(left, right);

      switch (node.op) {
        case '=':
          return compareEquals(left, right) ? 1 : 0;
        case '!=':
          return compareEquals(left, right) ? 0 : 1;
        case '~=':
          try {
            const re = new RegExp(valueToString(right), 'i');
            return re.test(valueToString(left)) ? 1 : 0;
          } catch {
            return 0;
          }
        case '+':
          return nums
            ? toNum(left) + toNum(right)
            : valueToString(left) + valueToString(right);

        case '&':
          return isTruthy(left) && isTruthy(right) ? 1 : 0;

        case '|':
          return isTruthy(left) || isTruthy(right) ? 1 : 0;
      }

      if (!nums) {
        // In Kustom, math operators on non-numeric operands join "left op right"
        return valueToString(left) + node.op + valueToString(right);
      }

      const x = toNum(left);
      const y = toNum(right);

      switch (node.op) {
        case '-':
          return x - y;
        case '*':
          return x * y;
        case '/':
          return y !== 0 ? x / y : 0;
        case '%':
          return y !== 0 ? x % y : 0;
        case '^':
          return Math.pow(x, y);
        case '>':
          return x > y ? 1 : 0;
        case '>=':
          return x >= y ? 1 : 0;
        case '<':
          return x < y ? 1 : 0;
        case '<=':
          return x <= y ? 1 : 0;
      }

      return '';
    }

    case 'FunctionCall': {
      const fnName = node.name.toLowerCase();
      const fn = ctx.functions?.[fnName] ?? standardFunctions[fnName];

      // Handle lazy evaluation for 'if'
      if (fnName === 'if') {
        let i = 0;
        while (i + 1 < node.args.length) {
          const cond = evaluateAST(node.args[i], childCtx);
          if (isTruthy(cond)) {
            return evaluateAST(node.args[i + 1], childCtx);
          }
          i += 2;
        }
        return i < node.args.length ? evaluateAST(node.args[i], childCtx) : '';
      }

      const args = node.args.map((arg) => evaluateAST(arg, childCtx));
      if (!fn) {
        ctx.warn?.(`Unknown function "${node.name}()"`);
        return '';
      }

      try {
        return fn(args, childCtx);
      } catch (e) {
        ctx.warn?.(`Error in ${node.name}(): ${(e as Error).message}`);
        return '';
      }
    }
  }
}

export function evaluateExpression(src: string, ctx: FormulaContext): FormulaValue {
  try {
    const ast = parseExpression(src);
    return evaluateAST(ast, ctx);
  } catch (e) {
    ctx.warn?.(`Failed to evaluate "${src}": ${(e as Error).message}`);
    return '';
  }
}

export function evaluateText(text: string, ctx: FormulaContext): string {
  const segments = splitFormulaSegments(text);
  let out = '';
  for (const seg of segments) {
    if (seg.expr) {
      const res = evaluateExpression(seg.s, ctx);
      out += valueToString(res);
    } else {
      out += seg.s;
    }
  }
  return out;
}

export function evaluateValue(text: string, ctx: FormulaContext): FormulaValue {
  const segments = splitFormulaSegments(text);
  if (segments.length === 1 && segments[0].expr) {
    return evaluateExpression(segments[0].s, ctx);
  }
  return evaluateText(text, ctx);
}
