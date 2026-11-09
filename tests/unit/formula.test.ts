import { describe, expect, it } from 'vitest';
import {
  createFormulaContext,
  defaultSimState,
  evaluateExpression,
  evaluateText,
  evaluateValue,
  parseExpression,
} from '../../src/core/formula/index.ts';

describe('Formula Engine - Tokenizer & Parser', () => {
  it('parses basic arithmetic and operator precedence', () => {
    const ctx = createFormulaContext();
    expect(evaluateValue('$2 + 3 * 4$', ctx)).toBe(14);
    expect(evaluateValue('$(2 + 3) * 4$', ctx)).toBe(20);
    expect(evaluateValue('$10 - 4 / 2$', ctx)).toBe(8);
    expect(evaluateValue('$2 ^ 3 + 1$', ctx)).toBe(9);
  });

  it('handles unary minus', () => {
    const ctx = createFormulaContext();
    expect(evaluateValue('$-5 + 10$', ctx)).toBe(5);
    expect(evaluateValue('$-(2 + 3)$', ctx)).toBe(-5);
  });

  it('handles comparisons and logical operators', () => {
    const ctx = createFormulaContext();
    expect(evaluateValue('$5 > 3$', ctx)).toBe(1);
    expect(evaluateValue('$5 < 3$', ctx)).toBe(0);
    expect(evaluateValue('$5 = 5$', ctx)).toBe(1);
    expect(evaluateValue('$5 != 5$', ctx)).toBe(0);
    expect(evaluateValue('$1 & 1$', ctx)).toBe(1);
    expect(evaluateValue('$1 & 0$', ctx)).toBe(0);
    expect(evaluateValue('$1 | 0$', ctx)).toBe(1);
  });

  it('handles string comparisons case-insensitively', () => {
    const ctx = createFormulaContext();
    expect(evaluateValue('$"Hello" = "hello"$', ctx)).toBe(1);
    expect(evaluateValue('$"Foo" != "bar"$', ctx)).toBe(1);
  });

  it('handles regex matching ~=', () => {
    const ctx = createFormulaContext();
    expect(evaluateValue('$"DarkWave" ~= "wave"$', ctx)).toBe(1);
    expect(evaluateValue('$"DarkWave" ~= "^Light"$', ctx)).toBe(0);
  });

  it('handles string concatenation with +', () => {
    const ctx = createFormulaContext();
    expect(evaluateValue('$"Hello " + "World"$', ctx)).toBe('Hello World');
    expect(evaluateValue('$"Num: " + 42$', ctx)).toBe('Num: 42');
  });

  it('handles escaped dollar signs in text', () => {
    const ctx = createFormulaContext();
    expect(evaluateText('Cost: $$50 for $2 + 2$ items', ctx)).toBe('Cost: $50 for 4 items');
  });
});

describe('Formula Engine - T1 Exact Functions', () => {
  it('evaluates if() condition branching', () => {
    const ctx = createFormulaContext();
    expect(evaluateValue('$if(1, "yes", "no")$', ctx)).toBe('yes');
    expect(evaluateValue('$if(0, "yes", "no")$', ctx)).toBe('no');
    expect(evaluateValue('$if(5 > 10, "A", 2 < 4, "B", "C")$', ctx)).toBe('B');
  });

  it('evaluates tc() text operations', () => {
    const ctx = createFormulaContext();
    expect(evaluateValue('$tc(up, "hello")$', ctx)).toBe('HELLO');
    expect(evaluateValue('$tc(low, "HELLO")$', ctx)).toBe('hello');
    expect(evaluateValue('$tc(cap, "hello world")$', ctx)).toBe('Hello World');
    expect(evaluateValue('$tc(len, "abcde")$', ctx)).toBe(5);
    expect(evaluateValue('$tc(cut, "abcdef", 1, 3)$', ctx)).toBe('bcd');
    expect(evaluateValue('$tc(ell, "very long string", 8)$', ctx)).toBe('very lon…');
    expect(evaluateValue('$tc(split, "a#b#c#d", "#", 2)$', ctx)).toBe('c');
    expect(evaluateValue('$tc(lpad, "5", 3, "0")$', ctx)).toBe('005');
    expect(evaluateValue('$tc(rpad, "5", 3, "0")$', ctx)).toBe('500');
    expect(evaluateValue('$tc(reg, "foo-bar-baz", "-", "_")$', ctx)).toBe('foo_bar_baz');
  });

  it('evaluates mu() math operations', () => {
    const ctx = createFormulaContext();
    expect(evaluateValue('$mu(round, 3.14159, 2)$', ctx)).toBe(3.14);
    expect(evaluateValue('$mu(floor, 3.8)$', ctx)).toBe(3);
    expect(evaluateValue('$mu(ceil, 3.2)$', ctx)).toBe(4);
    expect(evaluateValue('$mu(abs, -42)$', ctx)).toBe(42);
    expect(evaluateValue('$mu(min, 10, 5, 20)$', ctx)).toBe(5);
    expect(evaluateValue('$mu(max, 10, 5, 20)$', ctx)).toBe(20);
    expect(evaluateValue('$mu(sqrt, 16)$', ctx)).toBe(4);
    expect(evaluateValue('$mu(pow, 2, 4)$', ctx)).toBe(16);
    expect(evaluateValue('$mu(sin, 90)$', ctx)).toBeCloseTo(1);
    expect(evaluateValue('$mu(cos, 0)$', ctx)).toBeCloseTo(1);
    expect(evaluateValue('$mu(d2h, 255)$', ctx)).toBe('FF');
    expect(evaluateValue('$mu(h2d, "FF")$', ctx)).toBe(255);
  });

  it('evaluates ce() color editor operations', () => {
    const ctx = createFormulaContext();
    // Invert
    expect(evaluateValue('$ce(#FFFFFFFF, invert)$', ctx)).toBe('#FF000000');
    // Contrast
    expect(evaluateValue('$ce(#FFFFFFFF, contrast)$', ctx)).toBe('#FF000000');
    expect(evaluateValue('$ce(#FF000000, contrast)$', ctx)).toBe('#FFFFFFFF');
    // Alpha
    expect(evaluateValue('$ce(#FFFFFFFF, alpha, 50)$', ctx)).toBe('#80FFFFFF');
    // Luminance absolute a0
    expect(evaluateValue('$ce(#FFFF0000, lum, a0)$', ctx)).toBe('#FF000000');
    expect(evaluateValue('$ce(#FFFF0000, lum, a100)$', ctx)).toBe('#FFFFFFFF');
  });

  it('evaluates cm() color maker', () => {
    const ctx = createFormulaContext();
    expect(evaluateValue('$cm(255, 215, 25, 33)$', ctx)).toBe('#FFD71921');
    expect(evaluateValue('$cm(128, 0, 128, 255)$', ctx)).toBe('#800080FF');
  });

  it('evaluates df() date formatting with static time', () => {
    const fixedDate = new Date('2026-05-15T10:30:45Z');
    const sim = defaultSimState(fixedDate);
    const ctx = createFormulaContext(sim);

    expect(evaluateValue('$df(yyyy)$', ctx)).toBe('2026');
    expect(evaluateValue('$df(MM)$', ctx)).toBe('05');
    expect(evaluateValue('$df(dd)$', ctx)).toBe('15');
    // Date shift
    expect(evaluateValue('$df(yyyy, a1y)$', ctx)).toBe('2027');
    expect(evaluateValue('$df(MM, a1M)$', ctx)).toBe('06');
    expect(evaluateValue('$df(dd, a1d)$', ctx)).toBe('16');
  });

  it('evaluates lv() local variables and #var syntax', () => {
    const ctx = createFormulaContext();
    evaluateValue('$lv(myval, 42)$', ctx);
    expect(evaluateValue('$lv(myval)$', ctx)).toBe(42);
    expect(evaluateValue('$#myval + 8$', ctx)).toBe(50);
  });

  it('evaluates fl() for-loops', () => {
    const ctx = createFormulaContext();
    expect(evaluateValue('$fl(1, 5, 1, "#i", ",")$', ctx)).toBe('1,2,3,4,5');
    expect(evaluateValue('$fl(0, 4, 2, "#i", "")$', ctx)).toBe('024');
  });

  it('evaluates gv() global resolution including nested names', () => {
    const globals = {
      theme: { value: 'dark' },
      pal_dark: { value: '#FF121212' },
      pal_light: { value: '#FFFFFFFF' },
      side: { formula: '$if(si(rwidth)>si(rheight), si(rheight), si(rwidth))$' },
    };
    const ctx = createFormulaContext(undefined, globals);

    expect(evaluateValue('$gv(theme)$', ctx)).toBe('dark');
    expect(evaluateValue('$gv("pal_" + gv(theme))$', ctx)).toBe('#FF121212');
    expect(evaluateValue('$gv(side)$', ctx)).toBe(720);
  });
});

describe('Formula Engine - T2 Simulated Functions', () => {
  it('evaluates battery, weather, and music functions', () => {
    const ctx = createFormulaContext();
    expect(evaluateValue('$bi(level)$', ctx)).toBe(85);
    expect(evaluateValue('$bi(charging)$', ctx)).toBe(0);
    expect(evaluateValue('$wi(temp)$', ctx)).toBe(22);
    expect(evaluateValue('$wi(cond)$', ctx)).toBe('Partly Cloudy');
    expect(evaluateValue('$mi(state)$', ctx)).toBe('PLAYING');
    expect(evaluateValue('$mi(title)$', ctx)).toBe('Midnight City');
    expect(evaluateValue('$mi(artist)$', ctx)).toBe('M83');
  });

  it('evaluates notification counts and properties', () => {
    const ctx = createFormulaContext();
    expect(evaluateValue('$ni(count)$', ctx)).toBe(2);
    expect(evaluateValue('$ni(0, title)$', ctx)).toBe('New message from Alice');
    expect(evaluateValue('$ni(0, app)$', ctx)).toBe('Messages');
  });

  it('evaluates Monet colors and system info', () => {
    const ctx = createFormulaContext();
    expect(evaluateValue('$si(darkmode)$', ctx)).toBe(0);
    expect(evaluateValue('$si(rwidth)$', ctx)).toBe(720);
    expect(evaluateValue('$si(rheight)$', ctx)).toBe(1280);
    expect(evaluateValue('$si(sysca1)$', ctx)).toBe('#FFD71921');
  });
});
