// src/core/model/json-lex.ts
import { LexNumber } from './types.ts';

/**
 * Parses a JSON string while preserving exact number formatting (e.g. "22.0" -> LexNumber).
 */
export function parseJsonWithLex(text: string): any {
  let pos = 0;
  const len = text.length;

  function skipWhitespace() {
    while (pos < len) {
      const ch = text.charCodeAt(pos);
      if (ch === 32 || ch === 9 || ch === 10 || ch === 13) {
        pos++;
      } else {
        break;
      }
    }
  }

  function parseString(): string {
    pos++; // skip opening quote
    let str = '';
    while (pos < len) {
      const ch = text.charCodeAt(pos);
      if (ch === 34) {
        // closing quote
        pos++;
        return str;
      }
      if (ch === 92) {
        // escape backslash
        pos++;
        if (pos >= len) throw new SyntaxError('Unterminated escape in JSON string');
        const esc = text[pos++];
        switch (esc) {
          case '"':
            str += '"';
            break;
          case '\\':
            str += '\\';
            break;
          case '/':
            str += '/';
            break;
          case 'b':
            str += '\b';
            break;
          case 'f':
            str += '\f';
            break;
          case 'n':
            str += '\n';
            break;
          case 'r':
            str += '\r';
            break;
          case 't':
            str += '\t';
            break;
          case 'u': {
            const hex = text.slice(pos, pos + 4);
            if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
              throw new SyntaxError(`Invalid unicode escape \\u${hex}`);
            }
            str += String.fromCharCode(parseInt(hex, 16));
            pos += 4;
            break;
          }
          default:
            str += esc;
        }
      } else {
        str += text[pos++];
      }
    }
    throw new SyntaxError('Unterminated string in JSON');
  }

  function parseNumber(): number | LexNumber {
    const start = pos;
    if (text[pos] === '-') pos++;
    while (pos < len && text.charCodeAt(pos) >= 48 && text.charCodeAt(pos) <= 57) {
      pos++;
    }
    if (pos < len && text[pos] === '.') {
      pos++;
      while (pos < len && text.charCodeAt(pos) >= 48 && text.charCodeAt(pos) <= 57) {
        pos++;
      }
    }
    if (pos < len && (text[pos] === 'e' || text[pos] === 'E')) {
      pos++;
      if (pos < len && (text[pos] === '+' || text[pos] === '-')) {
        pos++;
      }
      while (pos < len && text.charCodeAt(pos) >= 48 && text.charCodeAt(pos) <= 57) {
        pos++;
      }
    }
    const raw = text.slice(start, pos);
    const num = Number(raw);
    if (Number.isNaN(num)) {
      throw new SyntaxError(`Invalid number "${raw}"`);
    }
    return String(num) !== raw ? new LexNumber(num, raw) : num;
  }

  function parseArray(): any[] {
    pos++; // skip '['
    skipWhitespace();
    const arr: any[] = [];
    if (pos < len && text[pos] === ']') {
      pos++;
      return arr;
    }
    while (pos < len) {
      arr.push(parseValue());
      skipWhitespace();
      if (pos < len && text[pos] === ',') {
        pos++;
        skipWhitespace();
      } else if (pos < len && text[pos] === ']') {
        pos++;
        return arr;
      } else {
        throw new SyntaxError(`Expected ',' or ']' at position ${pos}`);
      }
    }
    throw new SyntaxError('Unterminated array in JSON');
  }

  function parseObject(): Record<string, any> {
    pos++; // skip '{'
    skipWhitespace();
    const obj: Record<string, any> = {};
    if (pos < len && text[pos] === '}') {
      pos++;
      return obj;
    }
    while (pos < len) {
      skipWhitespace();
      if (text[pos] !== '"') {
        throw new SyntaxError(`Expected string key at position ${pos}`);
      }
      const key = parseString();
      skipWhitespace();
      if (pos >= len || text[pos] !== ':') {
        throw new SyntaxError(`Expected ':' after key "${key}" at position ${pos}`);
      }
      pos++; // skip ':'
      const val = parseValue();
      obj[key] = val;
      skipWhitespace();
      if (pos < len && text[pos] === ',') {
        pos++;
        skipWhitespace();
      } else if (pos < len && text[pos] === '}') {
        pos++;
        return obj;
      } else {
        throw new SyntaxError(`Expected ',' or '}' at position ${pos}`);
      }
    }
    throw new SyntaxError('Unterminated object in JSON');
  }

  function parseValue(): any {
    skipWhitespace();
    if (pos >= len) throw new SyntaxError('Unexpected end of JSON');
    const ch = text[pos];
    if (ch === '"') return parseString();
    if (ch === '{') return parseObject();
    if (ch === '[') return parseArray();
    if (ch === 't' && text.startsWith('true', pos)) {
      pos += 4;
      return true;
    }
    if (ch === 'f' && text.startsWith('false', pos)) {
      pos += 5;
      return false;
    }
    if (ch === 'n' && text.startsWith('null', pos)) {
      pos += 4;
      return null;
    }
    if (ch === '-' || (ch >= '0' && ch <= '9')) {
      return parseNumber();
    }
    throw new SyntaxError(`Unexpected character "${ch}" at position ${pos}`);
  }

  const result = parseValue();
  skipWhitespace();
  return result;
}

/**
 * Serializes a JavaScript value to JSON string, preserving LexNumber raw representation.
 */
export function stringifyWithLex(val: any, space?: number): string {
  const indent = typeof space === 'number' && space > 0 ? ' '.repeat(space) : '';

  function serialize(v: any, depth: number): string {
    if (v === null || v === undefined) return 'null';
    if (v instanceof LexNumber) return v.raw;
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'string') return JSON.stringify(v);

    if (Array.isArray(v)) {
      if (v.length === 0) return '[]';
      if (!indent) {
        return '[' + v.map((item) => serialize(item, depth)).join(',') + ']';
      }
      const itemIndent = indent.repeat(depth + 1);
      const closeIndent = indent.repeat(depth);
      const items = v.map((item) => itemIndent + serialize(item, depth + 1)).join(',\n');
      return `[\n${items}\n${closeIndent}]`;
    }

    if (typeof v === 'object') {
      const keys = Object.keys(v);
      if (keys.length === 0) return '{}';
      if (!indent) {
        const pairs = keys.map((k) => `${JSON.stringify(k)}:${serialize(v[k], depth)}`);
        return '{' + pairs.join(',') + '}';
      }
      const propIndent = indent.repeat(depth + 1);
      const closeIndent = indent.repeat(depth);
      const pairs = keys
        .map((k) => `${propIndent}${JSON.stringify(k)}: ${serialize(v[k], depth + 1)}`)
        .join(',\n');
      return `{\n${pairs}\n${closeIndent}}`;
    }

    return JSON.stringify(v);
  }

  return serialize(val, 0);
}
