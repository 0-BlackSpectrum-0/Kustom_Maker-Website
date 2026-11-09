import type { ASTNode, FunctionCallNode, LiteralNode, LocalVarNode, Token, UnaryOpNode } from './types.ts';
import { isHexColor, isNumeric, tokenizeExpression } from './tokenizer.ts';

const BINARY_PRECEDENCE: Record<string, number> = {
  '&': 1,
  '|': 1,
  '=': 2,
  '!=': 2,
  '>': 2,
  '>=': 2,
  '<': 2,
  '<=': 2,
  '~=': 2,
  '+': 3,
  '-': 3,
  '*': 4,
  '/': 4,
  '%': 4,
  '^': 5,
};

export class FormulaParser {
  private pos = 0;
  private tokens: Token[];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ASTNode {
    if (this.tokens.length === 0) {
      return { type: 'Literal', value: '' };
    }
    const node = this.expr(0);
    return node;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private expr(minPrec: number): ASTNode {
    let left = this.unary();

    for (;;) {
      const t = this.peek();
      if (!t || t.type !== 'op') break;

      const prec = BINARY_PRECEDENCE[t.value];
      if (prec === undefined || prec < minPrec) break;

      this.pos++;
      const nextMinPrec = t.value === '^' ? prec : prec + 1;
      const right = this.expr(nextMinPrec);

      left = {
        type: 'BinaryOp',
        op: t.value,
        left,
        right,
      };
    }

    return left;
  }

  private unary(): ASTNode {
    const t = this.peek();
    if (t && t.type === 'op' && (t.value === '-' || t.value === '+')) {
      this.pos++;
      const arg = this.unary();
      return {
        type: 'UnaryOp',
        op: t.value as '-' | '+',
        argument: arg,
      };
    }
    return this.primary();
  }

  private primary(): ASTNode {
    const t = this.tokens[this.pos++];
    if (!t) {
      return { type: 'Literal', value: '' };
    }

    if (t.type === 'lit') {
      const v = t.value;

      // Check for local variable: #varname (and not a hex color)
      if (v.startsWith('#') && !t.quoted && !isHexColor(v) && /^[a-zA-Z_]\w*$/i.test(v.slice(1))) {
        return {
          type: 'LocalVar',
          name: v.slice(1).toLowerCase(),
        };
      }

      // Check numeric
      if (!t.quoted && isNumeric(v)) {
        return {
          type: 'Literal',
          value: parseFloat(v),
          raw: t.raw ?? v,
        };
      }

      return {
        type: 'Literal',
        value: v,
        raw: t.raw ?? v,
      };
    }

    if (t.type === '(') {
      const inner = this.expr(0);
      if (this.peek()?.type === ')') {
        this.pos++;
      }
      return inner;
    }

    if (t.type === 'fn') {
      const fnName = t.value.toLowerCase();
      const args: ASTNode[] = [];

      if (this.peek()?.type === '(') {
        this.pos++; // skip '('
        if (this.peek()?.type === ')') {
          this.pos++; // skip ')'
        } else {
          while (this.pos < this.tokens.length) {
            args.push(this.expr(0));
            const next = this.tokens[this.pos++];
            if (!next || next.type === ')') break;
            if (next.type !== ',') {
              // Graceful recovery: if comma is missing, keep going
              if (next.type === 'op' || next.type === 'lit') {
                this.pos--;
              }
            }
          }
        }
      }

      return {
        type: 'FunctionCall',
        name: fnName,
        args,
      };
    }

    // Fallback for stray operators / tokens
    return {
      type: 'Literal',
      value: t.value,
    };
  }
}

export function parseExpression(src: string): ASTNode {
  const tokens = tokenizeExpression(src);
  return new FormulaParser(tokens).parse();
}
