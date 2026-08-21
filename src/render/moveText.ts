export function moveDescriptionText(
  shortDescription: string,
  description: string,
): string {
  const text = shortDescription || description || "No additional effect";
  return text.trim().replace(/\.+$/, "");
}

export function smallFontText(value: string): string {
  return value.replace(/’/g, "'").replace(/[^A-Za-z0-9.!?+/%'\- ]/g, "");
}

export function rightAlignedMoveStats(
  widths: { power: number; pp: number; accuracy: number },
  right: number,
  gap: number,
): { power: number; pp: number; accuracy: number } {
  const accuracy = right - widths.accuracy;
  const pp = accuracy - gap - widths.pp;
  const power = pp - gap - widths.power;
  return { power, pp, accuracy };
}

export function maximumMovePp(basePp: number, noPpBoosts = false): number {
  return noPpBoosts ? basePp : basePp + Math.floor(basePp / 5) * 3;
}
