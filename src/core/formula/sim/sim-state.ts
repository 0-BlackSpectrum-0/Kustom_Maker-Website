import type { SimState } from '../types.ts';

export function defaultSimState(now = new Date()): SimState {
  const sunrise = new Date(now);
  sunrise.setHours(6, 42, 0, 0);

  const sunset = new Date(now);
  sunset.setHours(19, 18, 0, 0);

  return {
    now,
    locale: 'en-US',
    darkmode: 0,
    darkwp: 0,
    rwidth: 720,
    rheight: 1280,
    battery: {
      level: 85,
      charging: false,
      temp: 30,
      volt: 4120,
    },
    weather: {
      temp: 22,
      unit: 'C',
      cond: 'Partly Cloudy',
      code: 'PARTLY_CLOUDY',
      icon: 'partly-cloudy-day',
      humidity: 55,
      wind: 12,
      windUnit: 'km/h',
      windDir: 'NW',
      clouds: 40,
      uv: 4,
      pressure: 1013,
      forecast: [
        { day: 0, min: 18, max: 26, cond: 'Partly Cloudy', code: 'PARTLY_CLOUDY' },
        { day: 1, min: 17, max: 25, cond: 'Sunny', code: 'SUNNY' },
        { day: 2, min: 16, max: 24, cond: 'Rain', code: 'RAIN' },
        { day: 3, min: 18, max: 27, cond: 'Mostly Sunny', code: 'MOSTLY_SUNNY' },
        { day: 4, min: 19, max: 28, cond: 'Clear', code: 'CLEAR' },
      ],
    },
    music: {
      state: 'PLAYING',
      title: 'Midnight City',
      artist: 'M83',
      album: "Hurry Up, We're Dreaming",
      pos: 95,
      len: 244,
      cover: '',
      package: 'com.spotify.music',
      vol: 65,
    },
    notifications: [
      {
        title: 'New message from Alice',
        text: 'Are we meeting at 3pm today?',
        icon: 'notification_message',
        app: 'Messages',
        pkg: 'com.google.android.apps.messaging',
      },
      {
        title: 'Upcoming calendar event',
        text: 'Team Sync at 4:00 PM',
        icon: 'notification_event',
        app: 'Calendar',
        pkg: 'com.google.android.calendar',
      },
    ],
    astronomy: {
      sunrise,
      sunset,
      moonPhase: 'Waxing Gibbous',
      moonIllum: 72,
      zodiac: 'Libra',
    },
    network: {
      wifi: true,
      ssid: 'Home_WiFi',
      sig: 4,
      cell: '5G',
      ip: '192.168.1.100',
    },
    resources: {
      mused: 4850,
      mtot: 8192,
      sused: 64,
      stot: 128,
    },
    fitness: {
      steps: 6420,
      dist: 4.8,
      cal: 320,
    },
    unread: {
      sms: 2,
      calls: 0,
      mail: 5,
    },
    monet: {
      sysca1: '#FFD71921',
      sysca2: '#FFFF8B94',
      sysca3: '#FFFFD3B6',
      syscn1: '#FF2B2B2B',
      syscn2: '#FF1A1A1A',
    },
    screen: {
      on: true,
      locked: false,
      land: false,
    },
    pkgname: 'org.kustom.maker',
  };
}

export function createSimState(overrides?: Partial<SimState>): SimState {
  const base = defaultSimState();
  if (!overrides) return base;
  return {
    ...base,
    ...overrides,
    battery: { ...base.battery, ...(overrides.battery || {}) },
    weather: { ...base.weather, ...(overrides.weather || {}) },
    music: { ...base.music, ...(overrides.music || {}) },
    astronomy: { ...base.astronomy, ...(overrides.astronomy || {}) },
    network: { ...base.network, ...(overrides.network || {}) },
    resources: { ...base.resources, ...(overrides.resources || {}) },
    fitness: { ...base.fitness, ...(overrides.fitness || {}) },
    unread: { ...base.unread, ...(overrides.unread || {}) },
    monet: { ...base.monet, ...(overrides.monet || {}) },
    screen: { ...base.screen, ...(overrides.screen || {}) },
  };
}
