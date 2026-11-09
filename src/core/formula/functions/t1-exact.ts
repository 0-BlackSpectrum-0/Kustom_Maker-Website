import type { FormulaFunction, FormulaValue } from '../types.ts';
import {
  adjustAlpha,
  adjustLuminance,
  adjustSaturation,
  complementaryColor,
  formatColor,
  getContrastColor,
  invertColor,
  parseColor,
} from './color-utils.ts';
import { isNumeric } from '../tokenizer.ts';

const pad = (n: number, w: number) => String(Math.trunc(Math.abs(n))).padStart(w, '0');

export function valueToString(v: FormulaValue | undefined): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'number') {
    if (!isFinite(v)) return String(v);
    if (v % 1 === 0) return String(Math.trunc(v));
    const f = Math.floor(v * 100000) / 100000;
    return String(parseFloat(f.toFixed(5)));
  }
  return String(v);
}

export function isTruthy(v: FormulaValue | undefined): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  const s = String(v).trim();
  return s.length > 0 && s !== '0' && s.toLowerCase() !== 'false';
}

function toNum(v: FormulaValue | undefined, def = 0): number {
  if (v === undefined || v === null || v === '') return def;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isNaN(n) ? def : n;
}

export function shiftDate(base: Date, spec: string): Date {
  const d = new Date(base);
  const re = /([ar])(\d+)([smhdMwy])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(spec))) {
    const n = parseInt(m[2], 10) * (m[1] === 'a' ? 1 : -1);
    switch (m[3]) {
      case 's': d.setSeconds(d.getSeconds() + n); break;
      case 'm': d.setMinutes(d.getMinutes() + n); break;
      case 'h': d.setHours(d.getHours() + n); break;
      case 'd': d.setDate(d.getDate() + n); break;
      case 'w': d.setDate(d.getDate() + n * 7); break;
      case 'M': d.setMonth(d.getMonth() + n); break;
      case 'y': d.setFullYear(d.getFullYear() + n); break;
    }
  }
  return d;
}

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor(
    (d.getTime() - start.getTime() - (d.getTimezoneOffset() - start.getTimezoneOffset()) * 60000) /
      86400000,
  );
}

function weekOfYear(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function formatDate(d: Date, pattern: string, locale = 'en-US'): string {
  let out = '';
  for (let i = 0; i < pattern.length; ) {
    const c = pattern[i];
    if (c === "'") {
      const end = pattern.indexOf("'", i + 1);
      if (end === i + 1) {
        out += "'";
        i += 2;
        continue;
      }
      out += pattern.slice(i + 1, end < 0 ? undefined : end);
      i = end < 0 ? pattern.length : end + 1;
      continue;
    }
    if (!/[a-zA-Z]/.test(c)) {
      out += c;
      i++;
      continue;
    }
    let n = 1;
    while (pattern[i + n] === c) n++;
    i += n;
    const h = d.getHours();
    switch (c) {
      case 'y':
      case 'Y':
        out += n === 2 ? pad(d.getFullYear() % 100, 2) : pad(d.getFullYear(), n);
        break;
      case 'M':
        if (n >= 4) out += d.toLocaleString(locale, { month: 'long' });
        else if (n === 3) out += d.toLocaleString(locale, { month: 'short' });
        else out += pad(d.getMonth() + 1, n);
        break;
      case 'L':
        out += pad(d.getMonth() + 1, n);
        break;
      case 'd':
        out += pad(d.getDate(), n);
        break;
      case 'D':
        out += pad(dayOfYear(d), n);
        break;
      case 'w':
        out += pad(weekOfYear(d), n);
        break;
      case 'E':
        out += d.toLocaleString(locale, { weekday: n >= 4 ? 'long' : 'short' });
        break;
      case 'e':
      case 'f':
        out += pad(d.getDay() === 0 ? 7 : d.getDay(), n);
        break;
      case 'a':
        out += h < 12 ? 'AM' : 'PM';
        break;
      case 'H':
        out += pad(h, n);
        break;
      case 'k':
        out += pad(h === 0 ? 24 : h, n);
        break;
      case 'K':
        out += pad(h % 12, n);
        break;
      case 'h':
        out += pad(h % 12 === 0 ? 12 : h % 12, n);
        break;
      case 'm':
        out += pad(d.getMinutes(), n);
        break;
      case 's':
        out += pad(d.getSeconds(), n);
        break;
      case 'S':
        out += pad(d.getMilliseconds(), 3).slice(0, n);
        break;
      case 'z':
      case 'Z': {
        const off = -d.getTimezoneOffset();
        out += (off >= 0 ? '+' : '-') + pad(off / 60, 2) + (c === 'z' ? ':' : '') + pad(off % 60, 2);
        break;
      }
      default:
        out += c.repeat(n);
    }
  }
  return out;
}

export function parseDate(spec: FormulaValue | undefined, now: Date): Date {
  if (spec === undefined || spec === '') return now;
  if (typeof spec === 'number') {
    return new Date(spec > 1e11 ? spec : spec * 1000);
  }
  const s = String(spec).trim();
  if (isNumeric(s)) {
    const num = parseFloat(s);
    return new Date(num > 1e11 ? num : num * 1000);
  }
  if (/^[ar]\d+[smhdMwy]/.test(s)) {
    return shiftDate(now, s);
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? now : parsed;
}

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function numberToWords(n: number): string {
  if (n < 0) return 'minus ' + numberToWords(-n);
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
  if (n < 1000) return ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + numberToWords(n % 100) : '');
  if (n < 1e6) return numberToWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + numberToWords(n % 1000) : '');
  return String(n);
}

function ordinal(n: number): string {
  const m100 = n % 100;
  if (m100 >= 11 && m100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}

function roman(n: number): string {
  const map: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  for (const [v, s] of map) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}

export function formatDuration(totalSeconds: number, pattern?: string): string {
  const neg = totalSeconds < 0;
  let s = Math.abs(Math.round(totalSeconds));
  if (!pattern) {
    if (s < 60) return `${s} seconds`;
    if (s < 3600) return `${Math.round(s / 60)} minutes`;
    return `${Math.round(s / 3600)} hours`;
  }
  const hasH = /[hH]/.test(pattern);
  const hasM = /m/.test(pattern);
  const H = hasH ? Math.floor(s / 3600) : 0;
  s -= H * 3600;
  const M = hasM ? Math.floor(s / 60) : 0;
  s -= M * 60;
  const out = pattern.replace(/([hHms])\1*/g, (tok) => {
    const n = tok.length;
    if (tok[0] === 'h' || tok[0] === 'H') return pad(H, n);
    if (tok[0] === 'm') return pad(M, n);
    return pad(s, n);
  });
  return (neg ? '-' : '') + out;
}

export const t1Functions: Record<string, FormulaFunction> = {
  gv: (args, ctx) => {
    const name = valueToString(args[0]).trim();
    if (!name) return '';
    if (ctx.resolveGlobal) {
      return ctx.resolveGlobal(name, ctx);
    }
    if (ctx.globals) {
      const g = ctx.globals[name] ?? ctx.globals[name.replace(/\.0$/, '')];
      if (g) {
        if (g.formula && ctx.evaluateExpression) {
          return ctx.evaluateExpression(g.formula, ctx);
        }
        return (g.value as FormulaValue) ?? '';
      }
    }
    return '';
  },

  ce: (args) => {
    if (args.length === 0) return '';
    const colorStr = valueToString(args[0]).trim();
    const parsed = parseColor(colorStr);
    const op = valueToString(args[1]).trim().toLowerCase();
    const arg2 = valueToString(args[2]).trim();

    switch (op) {
      case 'alpha':
      case 'a0':
        return formatColor(adjustAlpha(parsed, arg2));
      case 'lum':
      case 'lightness':
        return formatColor(adjustLuminance(parsed, arg2));
      case 'sat':
      case 'saturation':
        return formatColor(adjustSaturation(parsed, arg2));
      case 'contrast':
        return getContrastColor(parsed);
      case 'invert':
        return formatColor(invertColor(parsed));
      case 'comp':
      case 'complement':
        return formatColor(complementaryColor(parsed));
      default:
        // If 2nd argument is numeric or an alpha value directly: ce(color, 50)
        if (isNumeric(op) || /^[ar]?\d+$/.test(op)) {
          return formatColor(adjustAlpha(parsed, op));
        }
        return formatColor(parsed);
    }
  },

  si: (args, ctx) => {
    const key = valueToString(args[0]).trim().toLowerCase();
    const sim = ctx.sim;
    switch (key) {
      case 'darkmode':
        return sim.darkmode;
      case 'darkwp':
        return sim.darkwp;
      case 'rwidth':
        return sim.rwidth;
      case 'rheight':
        return sim.rheight;
      case 'pkgname':
        return sim.pkgname;
      case 'mindex': {
        const def = args[1] !== undefined ? toNum(args[1]) : 0;
        return def;
      }
      case 'sysca1':
        return sim.monet.sysca1;
      case 'sysca2':
        return sim.monet.sysca2;
      case 'sysca3':
        return sim.monet.sysca3;
      case 'syscn1':
        return sim.monet.syscn1;
      case 'syscn2':
        return sim.monet.syscn2;
      case 'screen':
        return sim.screen.on ? 1 : 0;
      case 'locked':
        return sim.screen.locked ? 1 : 0;
      case 'land':
        return sim.screen.land ? 1 : 0;
      case 'alarmd':
      case 'alarmt':
        return '';
      case 'boot':
        return 0;
      default:
        return '';
    }
  },

  tc: (args) => {
    const mode = valueToString(args[0]).trim().toLowerCase();
    const text = valueToString(args[1]);

    switch (mode) {
      case 'low':
        return text.toLowerCase();
      case 'up':
        return text.toUpperCase();
      case 'cap':
        return text.replace(/(^|\s)(\S)/g, (_, a: string, b: string) => a + b.toUpperCase());
      case 'cut': {
        const a = toNum(args[2]);
        const b = args[3] !== undefined ? toNum(args[3]) : undefined;
        if (b === undefined) return a >= 0 ? text.slice(0, a) : text.slice(a);
        return text.substr(a, b);
      }
      case 'ell': {
        const n = toNum(args[2]);
        return text.length > n ? text.slice(0, n) + '…' : text;
      }
      case 'len':
        return text.length;
      case 'count': {
        const sub = valueToString(args[2]);
        return sub ? text.split(sub).length - 1 : 0;
      }
      case 'ord':
        return ordinal(Math.trunc(toNum(args[1])));
      case 'n2w':
        return numberToWords(Math.trunc(toNum(args[1])));
      case 'roman':
        return text.replace(/\d+/g, (d) => roman(parseInt(d, 10)));
      case 'lpad':
        return text.padStart(toNum(args[2]), valueToString(args[3] ?? '0') || '0');
      case 'rpad':
        return text.padEnd(toNum(args[2]), valueToString(args[3] ?? '0') || '0');
      case 'reg':
        try {
          return text.replace(new RegExp(valueToString(args[2]), 'g'), valueToString(args[3]));
        } catch {
          return text;
        }
      case 'split': {
        const delim = valueToString(args[2]);
        const idx = toNum(args[3]);
        const parts = text.split(delim);
        return parts[idx] ?? '';
      }
      case 'lines':
        return text.split('\n').length;
      case 'utf':
        return String.fromCodePoint(parseInt(text, 16));
      case 'url':
        return encodeURIComponent(text);
      case 'html':
        return text.replace(/<[^>]*>/g, '');
      case 'nfmt':
        return text.replace(/\d+(\.\d+)?/g, (d) => Number(d).toLocaleString('en-US'));
      default:
        return text;
    }
  },

  if: (args) => {
    let i = 0;
    while (i + 1 < args.length) {
      if (isTruthy(args[i])) return args[i + 1];
      i += 2;
    }
    return i < args.length ? args[i] : '';
  },

  df: (args, ctx) => {
    const pattern = valueToString(args[0]);
    const date = parseDate(args[1], ctx.sim.now);
    return formatDate(date, pattern, ctx.sim.locale);
  },

  dp: (args, ctx) => {
    const d = parseDate(args[0], ctx.sim.now);
    return Math.floor(d.getTime() / 1000);
  },

  tf: (args, ctx) => {
    const v = args[0];
    const pattern = args[1] !== undefined ? valueToString(args[1]) : undefined;
    if (typeof v === 'number' || isNumeric(valueToString(v))) {
      return formatDuration(toNum(v), pattern);
    }
    const d = parseDate(v, ctx.sim.now);
    const diffSeconds = (d.getTime() - ctx.sim.now.getTime()) / 1000;
    return formatDuration(diffSeconds, pattern);
  },

  mu: (args) => {
    const op = valueToString(args[0]).trim().toLowerCase();
    const nums = args.slice(1).map((x) => toNum(x));

    switch (op) {
      case 'round':
        return nums.length > 1 ? Number(nums[0].toFixed(nums[1])) : Math.round(nums[0]);
      case 'floor':
        return Math.floor(nums[0]);
      case 'ceil':
        return Math.ceil(nums[0]);
      case 'abs':
        return Math.abs(nums[0]);
      case 'min':
        return Math.min(...nums);
      case 'max':
        return Math.max(...nums);
      case 'sqrt':
        return Math.sqrt(nums[0]);
      case 'pow':
        return Math.pow(nums[0], nums[1]);
      case 'log':
        return Math.log10(nums[0]);
      case 'ln':
        return Math.log(nums[0]);
      case 'sin':
        return Math.sin((nums[0] * Math.PI) / 180);
      case 'cos':
        return Math.cos((nums[0] * Math.PI) / 180);
      case 'tan':
        return Math.tan((nums[0] * Math.PI) / 180);
      case 'asin':
        return (Math.asin(nums[0]) * 180) / Math.PI;
      case 'acos':
        return (Math.acos(nums[0]) * 180) / Math.PI;
      case 'atan':
        return (Math.atan(nums[0]) * 180) / Math.PI;
      case 'rnd':
        return Math.floor(nums[0] + Math.random() * (nums[1] - nums[0] + 1));
      case 'h2d':
        return parseInt(valueToString(args[1]), 16);
      case 'd2h':
        return Math.trunc(nums[0]).toString(16).toUpperCase();
      default:
        return '';
    }
  },

  lv: (args, ctx) => {
    const name = valueToString(args[0]).trim().toLowerCase();
    if (!name) return '';
    if (args.length > 1) {
      ctx.locals.set(name, args[1]);
      return '';
    }
    return ctx.locals.get(name) ?? '';
  },

  cm: (args) => {
    // cm(alpha, red, green, blue) or cm(red, green, blue)
    let a = 255;
    let r = 0;
    let g = 0;
    let b = 0;
    if (args.length >= 4) {
      a = toNum(args[0], 255);
      r = toNum(args[1]);
      g = toNum(args[2]);
      b = toNum(args[3]);
    } else {
      r = toNum(args[0]);
      g = toNum(args[1]);
      b = toNum(args[2]);
    }
    return formatColor({
      a: Math.max(0, Math.min(255, a)),
      r: Math.max(0, Math.min(255, r)),
      g: Math.max(0, Math.min(255, g)),
      b: Math.max(0, Math.min(255, b)),
    });
  },

  fl: (args, ctx) => {
    // fl(start, end, step, expr, [sep])
    const start = toNum(args[0]);
    const end = toNum(args[1]);
    const step = toNum(args[2], 1) || 1;
    const expr = valueToString(args[3]);
    const sep = args[4] !== undefined ? valueToString(args[4]) : '';

    const results: string[] = [];
    const limit = 500; // loop safety guard
    let count = 0;

    for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
      if (++count > limit) break;
      ctx.locals.set('i', i);
      if (ctx.evaluateExpression) {
        results.push(valueToString(ctx.evaluateExpression(expr, ctx)));
      } else {
        results.push(String(i));
      }
    }

    return results.join(sep);
  },
};
