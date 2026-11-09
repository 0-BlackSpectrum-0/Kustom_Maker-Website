import type { SimState } from '../formula/types.ts';

export function calculateRotation(
  mode: string,
  offset: number,
  now: Date,
): { rot: number; flipX: boolean; flipY: boolean } {
  let rot = 0;
  let flipX = false;
  let flipY = false;

  const m = mode.trim().toUpperCase();
  const h = now.getHours();
  const min = now.getMinutes();
  const s = now.getSeconds();
  const ms = now.getMilliseconds();

  switch (m) {
    case 'MANUAL':
      rot = offset;
      break;
    case 'DEG90':
      rot = 90 + offset;
      break;
    case 'DEG180':
      rot = 180 + offset;
      break;
    case 'DEG270':
      rot = 270 + offset;
      break;
    case 'FLIP_X':
      flipX = true;
      rot = offset;
      break;
    case 'FLIP_Y':
      flipY = true;
      rot = offset;
      break;
    case 'CLOCK_HOUR':
      rot = (h % 12) * 30 + offset;
      break;
    case 'CLOCK_HOUR_SMOOTH':
      rot = (((h % 12) * 60 + min) / 720) * 360 + offset;
      break;
    case 'CLOCK_MINUTE':
      rot = min * 6 + offset;
      break;
    case 'CLOCK_MINUTE_SMOOTH':
      rot = ((min * 60 + s) / 3600) * 360 + offset;
      break;
    case 'CLOCK_SECOND':
      rot = s * 6 + offset;
      break;
    case 'CLOCK_SECOND_SMOOTH':
      rot = ((s * 1000 + ms) / 60000) * 360 + offset;
      break;
    default:
      rot = offset;
  }

  return { rot, flipX, flipY };
}

export function rotatedBoundingBox(w: number, h: number, deg: number): [number, number] {
  if (deg % 360 === 0) return [Math.round(w), Math.round(h)];
  const rad = (deg * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  return [Math.round(w * c + h * s), Math.round(w * s + h * c)];
}
