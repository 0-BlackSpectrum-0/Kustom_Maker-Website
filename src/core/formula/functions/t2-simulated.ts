import type { FormulaFunction, FormulaValue } from '../types.ts';
import { isTruthy, valueToString } from './t1-exact.ts';

function toNum(v: FormulaValue | undefined, def = 0): number {
  if (v === undefined || v === null || v === '') return def;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isNaN(n) ? def : n;
}

export const t2Functions: Record<string, FormulaFunction> = {
  mi: (args, ctx) => {
    const key = valueToString(args[0]).trim().toLowerCase();
    const m = ctx.sim.music;
    switch (key) {
      case 'title': return m.title;
      case 'artist': return m.artist;
      case 'album': return m.album;
      case 'state': return m.state;
      case 'len': return m.len;
      case 'pos': return m.pos;
      case 'percent': return m.len ? Math.round((m.pos / m.len) * 100) : 0;
      case 'cover': return m.cover || 'kfile://org.kustom.provider/bitmaps/sim_cover.png';
      case 'package': return m.package;
      case 'vol': return m.vol;
      default: return '';
    }
  },

  bi: (args, ctx) => {
    const key = valueToString(args[0]).trim().toLowerCase();
    const b = ctx.sim.battery;
    switch (key) {
      case 'level': return b.level;
      case 'charging': return b.charging ? 1 : 0;
      case 'plugged': return b.charging ? 1 : 0;
      case 'temp': return b.temp;
      case 'tempc': return b.temp;
      case 'tempf': return Math.round(b.temp * 1.8 + 32);
      case 'volt': return b.volt;
      case 'source': return b.charging ? 'USB' : 'Battery';
      default: return '';
    }
  },

  wi: (args, ctx) => {
    const key = valueToString(args[0]).trim().toLowerCase();
    const w = ctx.sim.weather;
    switch (key) {
      case 'temp': return w.temp;
      case 'tempu': return w.unit;
      case 'flik': return w.temp - 1;
      case 'cond': return w.cond;
      case 'code': return w.code;
      case 'icon': return w.icon;
      case 'hum': return w.humidity;
      case 'wspeed': return w.wind;
      case 'wspeedu': return w.windUnit;
      case 'wdir': return w.windDir;
      case 'clouds': return w.clouds;
      case 'uvindex': return w.uv;
      case 'press': return w.pressure;
      default: return '';
    }
  },

  wf: (args, ctx) => {
    const key = valueToString(args[0]).trim().toLowerCase();
    const day = toNum(args[1], 0);
    const forecast = ctx.sim.weather.forecast[day] ?? ctx.sim.weather.forecast[0];
    if (!forecast) return '';

    switch (key) {
      case 'min': return forecast.min;
      case 'max': return forecast.max;
      case 'cond': return forecast.cond;
      case 'code': return forecast.code;
      case 'icon': return forecast.code.toLowerCase();
      default: return '';
    }
  },

  ai: (args, ctx) => {
    const key = valueToString(args[0]).trim().toLowerCase();
    const st = ctx.sim;
    switch (key) {
      case 'isday':
        return st.now >= st.astronomy.sunrise && st.now < st.astronomy.sunset ? 1 : 0;
      case 'sunrise':
        return Math.floor(st.astronomy.sunrise.getTime() / 1000);
      case 'sunset':
        return Math.floor(st.astronomy.sunset.getTime() / 1000);
      case 'nsunrise':
        return Math.floor(st.astronomy.sunrise.getTime() / 1000) + 86400;
      case 'nsunset':
        return Math.floor(st.astronomy.sunset.getTime() / 1000);
      case 'mphase':
        return st.astronomy.moonPhase;
      case 'mill':
        return st.astronomy.moonIllum;
      case 'zodiac':
        return st.astronomy.zodiac;
      default:
        return '';
    }
  },

  ci: (args) => {
    const key = valueToString(args[0]).trim().toLowerCase();
    switch (key) {
      case 'title': return 'Team Meeting';
      case 'loc': return 'Office';
      case 'allday': return 0;
      case 'count': return 1;
      default: return '';
    }
  },

  rm: (args, ctx) => {
    const key = valueToString(args[0]).trim().toLowerCase();
    const r = ctx.sim.resources;
    switch (key) {
      case 'mused': return r.mused;
      case 'mtot': return r.mtot;
      case 'mfree': return r.mtot - r.mused;
      case 'sused': return r.sused;
      case 'stot': return r.stot;
      case 'sfree': return r.stot - r.sused;
      default: return '';
    }
  },

  mq: (args, ctx) => {
    const key = valueToString(args[0]).trim().toLowerCase();
    switch (key) {
      case 'title': return 'Next Track';
      case 'artist': return ctx.sim.music.artist;
      case 'count': return 5;
      default: return '';
    }
  },

  nc: (args, ctx) => {
    const key = valueToString(args[0]).trim().toLowerCase();
    const n = ctx.sim.network;
    switch (key) {
      case 'wifi': return n.wifi ? 1 : 0;
      case 'ssid': return n.ssid;
      case 'sig': return n.sig;
      case 'cell': return n.cell;
      case 'ip': return n.ip;
      case 'operator': return 'Carrier';
      default: return '';
    }
  },

  ni: (args, ctx) => {
    // Can be ni(count), ni(pcount, pkg), ni(idx, key), or ni(pkg, icon)
    const arg0 = valueToString(args[0]).trim();
    const arg0Lower = arg0.toLowerCase();
    const notifs = ctx.sim.notifications;

    if (arg0Lower === 'count') {
      return notifs.length;
    }
    if (arg0Lower === 'pcount') {
      const pkg = valueToString(args[1]).trim().toLowerCase();
      return notifs.filter((n) => n.pkg.toLowerCase() === pkg).length;
    }

    let idx = 0;
    let prop = '';

    if (/^\d+$/.test(arg0)) {
      idx = parseInt(arg0, 10);
      prop = valueToString(args[1]).trim().toLowerCase();
    } else {
      // Could be ni(package, icon)
      prop = valueToString(args[1]).trim().toLowerCase();
      const match = notifs.find((n) => n.pkg.toLowerCase() === arg0Lower);
      if (match) {
        if (prop === 'icon') return match.icon;
        if (prop === 'title') return match.title;
        if (prop === 'text') return match.text;
      }
      return prop === 'icon' ? 'notification_icon' : '';
    }

    const item = notifs[idx] ?? notifs[0];
    if (!item) return '';

    switch (prop) {
      case 'title': return item.title;
      case 'text': return item.text;
      case 'icon': return item.icon;
      case 'app': return item.app;
      case 'pkg': return item.pkg;
      default: return item.title;
    }
  },

  bp: (args, ctx) => {
    // Bitmap palette: vibrant, dominant, muted, lvibrant, dvibrant, lmuted, dmuted
    const type = valueToString(args[0]).trim().toLowerCase();
    const monet = ctx.sim.monet;
    switch (type) {
      case 'vibrant':
      case 'lvibrant':
        return monet.sysca1;
      case 'dominant':
        return monet.sysca2;
      case 'muted':
      case 'lmuted':
        return monet.sysca3;
      case 'dvibrant':
        return monet.syscn1;
      case 'dmuted':
        return monet.syscn2;
      default:
        return monet.sysca1;
    }
  },

  aq: (args) => {
    const key = valueToString(args[0]).trim().toLowerCase();
    switch (key) {
      case 'aqi': return 35;
      case 'pm25': return 12;
      case 'pm10': return 20;
      default: return 35;
    }
  },

  li: (args) => {
    const key = valueToString(args[0]).trim().toLowerCase();
    switch (key) {
      case 'city': return 'San Francisco';
      case 'addr': return 'Market St';
      case 'loc': return '37.7749,-122.4194';
      default: return 'San Francisco';
    }
  },

  uc: (args, ctx) => {
    const key = valueToString(args[0]).trim().toLowerCase();
    const u = ctx.sim.unread;
    switch (key) {
      case 'sms': return u.sms;
      case 'calls': return u.calls;
      case 'mail': return u.mail;
      default: return 0;
    }
  },

  fd: (args, ctx) => {
    const key = valueToString(args[0]).trim().toLowerCase();
    const f = ctx.sim.fitness;
    switch (key) {
      case 'steps': return f.steps;
      case 'dist': return f.dist;
      case 'cal': return f.cal;
      default: return 0;
    }
  },

  ts: () => '15 mins',
  tu: () => 1,
  gh: () => 42,
};
