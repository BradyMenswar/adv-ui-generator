import type { StatId } from "./types";

export interface StatBarColors {
  main: number;
  shade: number;
}

export interface StatBarScale {
  percentage: number;
  hue: number;
  maxStat: number;
  colors: StatBarColors;
}

const COLOR_STOPS: Array<{ hue: number; colors: StatBarColors }> = [
  { hue: 0, colors: { main: 0xf04b36, shade: 0xd9382d } },
  { hue: 30, colors: { main: 0xffb84f, shade: 0xee9343 } },
  { hue: 60, colors: { main: 0xf1f75b, shade: 0xd1dd42 } },
  { hue: 120, colors: { main: 0x8bdd63, shade: 0x22ad59 } },
];

function hueDistance(left: number, right: number): number {
  const distance = Math.abs(left - right) % 360;
  return Math.min(distance, 360 - distance);
}

export function showdownMaxStat(stat: StatId, level: number): number {
  return stat === "hp"
    ? Math.floor((176 * level) / 25) + 10
    : Math.floor((247 * level) / 50) + 5;
}

export function showdownStatBarScale(
  value: number,
  stat: StatId,
  level: number,
): StatBarScale {
  const maxStat = showdownMaxStat(stat, level);
  const percentage = Math.min(value / maxStat, 1);
  const hue = Math.min(Math.floor((value * 180) / maxStat), 360);
  const closest = COLOR_STOPS.reduce((best, candidate) =>
    hueDistance(hue, candidate.hue) < hueDistance(hue, best.hue)
      ? candidate
      : best,
  );

  return { percentage, hue, maxStat, colors: closest.colors };
}
