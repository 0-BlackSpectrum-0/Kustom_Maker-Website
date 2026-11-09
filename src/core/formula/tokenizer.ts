import type { Token, TokenType } from './types.ts';

const TWO_CHAR_OPS = ['>=', '<=', '!=', '~='];
const ONE_CHAR_OPS = '=><+-*/%^&|';

/** Splits template text into literal and formula segments */
export function splitFormulaSegments(text: string): { expr: boolean; s: string }[] {
  const out: { expr: boolean; s: string }[] = [];
  let buf = '';
  let inExpr = false;
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    // Handle escaped $$
    if (c === '$' && text[i + 1] === '$' && !inQuote) {
      buf += '$';
      i++;
      continue;
    }

    if (c === '"' && inExpr) {
      inQuote = !inQuote;
      buf += c;
      continue;
    }

    if (c === '$' && !inQuote) {
      if (inExpr) {
        // Ending an expression block
        out.push({ expr: true, s: buf });
        buf = '';
        inExpr = false;
      } else {
        // Starting an expression block
        if (buf.length > 0) {
          out.push({ expr: false, s: buf });
          buf = '';
        }
        inExpr = true;
      }
      continue;
    }

    buf += c;
  }

  // Unterminated $ block is treated as literal
  if (buf.length > 0) {
    out.push({ expr: inExpr, s: inExpr ? buf : buf });
  }

  return out;
}

export function isNumeric(s: string): boolean {
  return /^\s*[-+]?(\d+\.?\d*|\.\d+)\s*$/.test(s);
}

export function isHexColor(s: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(s.trim());
}

/** Tokenizes the contents of one $...$ expression block */
export function tokenizeExpression(src: string): Token[] {
  const tokens: Token[] = [];
  let buf = '';
  let bufStart = 0;
  let quoted = false;
  let wasQuoted = false;

  const flush = (currentPos: number) => {
    const s = wasQuoted ? buf : buf.trim();
    if (s.length > 0 || wasQuoted) {
      tokens.push({
        type: 'lit',
        value: s,
        raw: buf,
        quoted: wasQuoted,
        start: bufStart,
        end: currentPos,
      });
    }
    buf = '';
    wasQuoted = false;
  };

  for (let i = 0; i < src.length; i++) {
    const c = src[i];

    if (c === '"') {
      if (quoted) {
        quoted = false;
        flush(i);
      } else {
        if (buf.trim()) flush(i);
        bufStart = i + 1;
        buf = '';
        quoted = true;
        wasQuoted = true;
      }
      continue;
    }

    if (quoted) {
      buf += c;
      continue;
    }

    // Comments /* ... */
    if (c === '/' && src[i + 1] === '*') {
      flush(i);
      const end = src.indexOf('*/', i + 2);
      i = end < 0 ? src.length : end + 1;
      bufStart = i + 1;
      continue;
    }

    // Two-character operators
    const two = src.slice(i, i + 2);
    if (TWO_CHAR_OPS.includes(two)) {
      flush(i);
      tokens.push({ type: 'op', value: two, start: i, end: i + 2 });
      i++;
      bufStart = i + 1;
      continue;
    }

    // One-character operators
    if (ONE_CHAR_OPS.includes(c)) {
      flush(i);
      tokens.push({ type: 'op', value: c, start: i, end: i + 1 });
      bufStart = i + 1;
      continue;
    }

    if (c === '(') {
      flush(i);
      const last = tokens[tokens.length - 1];
      if (last && last.type === 'lit' && !last.quoted && /^[a-zA-Z_]\w*$/i.test(last.value)) {
        last.type = 'fn';
        last.value = last.value.toLowerCase();
      }
      tokens.push({ type: '(', value: '(', start: i, end: i + 1 });
      bufStart = i + 1;
      continue;
    }

    if (c === ')') {
      flush(i);
      tokens.push({ type: ')', value: ')', start: i, end: i + 1 });
      bufStart = i + 1;
      continue;
    }

    if (c === ',') {
      flush(i);
      tokens.push({ type: ',', value: ',', start: i, end: i + 1 });
      bufStart = i + 1;
      continue;
    }

    if (buf.length === 0) {
      bufStart = i;
    }
    buf += c;
  }

  if (quoted) wasQuoted = true;
  flush(src.length);

  return tokens;
}
