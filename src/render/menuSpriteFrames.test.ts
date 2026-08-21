import { describe, expect, it } from "vitest";

import {
  bottomCenterBounds,
  opaqueUnionBounds,
  resolveAnimationFrameIndex,
} from "./menuSpriteFrames";

function frame(width: number, height: number, pixels: Array<[number, number]>) {
  const rgba = new Uint8Array(width * height * 4);
  for (const [x, y] of pixels) rgba[(y * width + x) * 4 + 3] = 255;
  return rgba.buffer;
}

describe("menu sprite positioning", () => {
  it("uses the combined visible envelope of every animation frame", () => {
    expect(
      opaqueUnionBounds(
        [
          frame(4, 4, [
            [1, 1],
            [2, 2],
          ]),
          frame(4, 4, [
            [0, 2],
            [3, 3],
          ]),
        ],
        4,
        4,
      ),
    ).toEqual({ x: 0, y: 1, width: 4, height: 3 });
  });

  it("falls back to the complete canvas for an empty image", () => {
    expect(opaqueUnionBounds([frame(3, 2, [])], 3, 2)).toEqual({
      x: 0,
      y: 0,
      width: 3,
      height: 2,
    });
  });
});

describe("animation frame selection", () => {
  it("selects the final decoded frame for static animation assets", () => {
    expect(resolveAnimationFrameIndex("last", 52)).toBe(51);
  });

  it("wraps numeric animation frames", () => {
    expect(resolveAnimationFrameIndex(52, 52)).toBe(0);
  });
});

describe("battle sprite baseline", () => {
  const container = { x: 8, y: 16, width: 65, height: 64 };

  it("uses the resting frame as a shared bottom-center anchor", () => {
    expect(
      bottomCenterBounds({ x: 12, y: 20, width: 40, height: 48 }, container, {
        x: 0,
        y: -2,
      }),
    ).toEqual({ x: 9, y: 10 });
  });

  it("preserves the exact upward offset for a tall resting frame", () => {
    expect(
      bottomCenterBounds({ x: 10, y: 8, width: 52, height: 64 }, container, {
        x: 0,
        y: -2,
      }),
    ).toEqual({ x: 5, y: 6 });
  });
});
