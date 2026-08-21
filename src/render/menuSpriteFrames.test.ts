import { describe, expect, it } from "vitest";

import { opaqueUnionBounds } from "./menuSpriteFrames";

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
