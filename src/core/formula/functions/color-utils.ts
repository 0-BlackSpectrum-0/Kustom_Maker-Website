export interface ARGB {
  a: number; // 0..255
  r: number; // 0..255
  g: number; // 0..255
  b: number; // 0..255
}

export interface HSL {
  h: number; // 0..360
  s: number; // 0..1
  l: number; // 0..1
}

export function parseColor(input: string): ARGB {
  let s = input.trim();
  if (s.startsWith('#')) s = s.slice(1);

  let a = 255;
  let r = 0;
  let g = 0;
  let b = 0;

  if (s.length === 3) {
    // RGB -> FFRRGGBB
    r = parseInt(s[0] + s[0], 16);
    g = parseInt(s[1] + s[1], 16);
    b = parseInt(s[2] + s[2], 16);
  } else if (s.length === 4) {
    // ARGB -> AARRGGBB
    a = parseInt(s[0] + s[0], 16);
    r = parseInt(s[1] + s[1], 16);
    g = parseInt(s[2] + s[2], 16);
    b = parseInt(s[3] + s[3], 16);
  } else if (s.length === 6) {
    // RRGGBB -> FFRRGGBB
    r = parseInt(s.slice(0, 2), 16);
    g = parseInt(s.slice(2, 4), 16);
    b = parseInt(s.slice(4, 6), 16);
  } else if (s.length === 8) {
    // AARRGGBB
    a = parseInt(s.slice(0, 2), 16);
    r = parseInt(s.slice(2, 4), 16);
    g = parseInt(s.slice(4, 6), 16);
    b = parseInt(s.slice(6, 8), 16);
  } else {
    // Fallback: try parsing as integer or return black
    const num = parseInt(s, 16);
    if (!isNaN(num) && s.length > 0) {
      b = num & 0xff;
      g = (num >> 8) & 0xff;
      r = (num >> 16) & 0xff;
      a = (num >> 24) & 0xff || 255;
    }
  }

  return {
    a: isNaN(a) ? 255 : Math.max(0, Math.min(255, a)),
    r: isNaN(r) ? 0 : Math.max(0, Math.min(255, r)),
    g: isNaN(g) ? 0 : Math.max(0, Math.min(255, g)),
    b: isNaN(b) ? 0 : Math.max(0, Math.min(255, b)),
  };
}

export function formatColor(c: ARGB): string {
  const pad = (n: number) => Math.round(n).toString(16).padStart(2, '0').toUpperCase();
  return `#${pad(c.a)}${pad(c.r)}${pad(c.g)}${pad(c.b)}`;
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }

  return { h, s, l };
}

function hueToRgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360;
  h /= 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));

  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h + 1 / 3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

export function getLuminance(c: ARGB): number {
  // WCAG relative luminance
  const toLinear = (v: number) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(c.r) + 0.7152 * toLinear(c.g) + 0.0722 * toLinear(c.b);
}

export function adjustLuminance(c: ARGB, valStr: string): ARGB {
  const hsl = rgbToHsl(c.r, c.g, c.b);
  const s = valStr.trim();
  if (s.startsWith('a')) {
    // Absolute 0..100
    const pct = parseFloat(s.slice(1)) / 100;
    hsl.l = Math.max(0, Math.min(1, pct));
  } else if (s.startsWith('r')) {
    // Relative +/- %
    const delta = parseFloat(s.slice(1)) / 100;
    hsl.l = Math.max(0, Math.min(1, hsl.l + delta));
  } else {
    const val = parseFloat(s);
    if (!isNaN(val)) {
      hsl.l = Math.max(0, Math.min(1, val / 100));
    }
  }
  const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  return { a: c.a, ...rgb };
}

export function adjustSaturation(c: ARGB, valStr: string): ARGB {
  const hsl = rgbToHsl(c.r, c.g, c.b);
  const s = valStr.trim();
  if (s.startsWith('a')) {
    const pct = parseFloat(s.slice(1)) / 100;
    hsl.s = Math.max(0, Math.min(1, pct));
  } else if (s.startsWith('r')) {
    const delta = parseFloat(s.slice(1)) / 100;
    hsl.s = Math.max(0, Math.min(1, hsl.s + delta));
  } else {
    const val = parseFloat(s);
    if (!isNaN(val)) {
      hsl.s = Math.max(0, Math.min(1, val / 100));
    }
  }
  const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  return { a: c.a, ...rgb };
}

export function adjustAlpha(c: ARGB, valStr: string): ARGB {
  const s = valStr.trim();
  let a = c.a;
  if (s.startsWith('a')) {
    a = Math.round((parseFloat(s.slice(1)) / 100) * 255);
  } else if (s.startsWith('r')) {
    const delta = (parseFloat(s.slice(1)) / 100) * 255;
    a = Math.round(c.a + delta);
  } else {
    const num = parseFloat(s);
    if (!isNaN(num)) {
      // 0..100 is percentage, or > 100 is direct byte
      a = num <= 100 ? Math.round((num / 100) * 255) : Math.round(num);
    }
  }
  return { ...c, a: Math.max(0, Math.min(255, a)) };
}

export function getContrastColor(c: ARGB): string {
  const lum = getLuminance(c);
  // If lum > 0.4 return black, else white
  return lum > 0.4 ? '#FF000000' : '#FFFFFFFF';
}

export function invertColor(c: ARGB): ARGB {
  return {
    a: c.a,
    r: 255 - c.r,
    g: 255 - c.g,
    b: 255 - c.b,
  };
}

export function complementaryColor(c: ARGB): ARGB {
  const hsl = rgbToHsl(c.r, c.g, c.b);
  hsl.h = (hsl.h + 180) % 360;
  const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  return { a: c.a, ...rgb };
}
