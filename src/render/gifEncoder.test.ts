import { describe, expect, it } from "vitest";

import {
  gifFrameDelay,
  gifRepeatCount,
  scaleIndexedPixels,
} from "./gifEncoder";

describe("GIF animation timing", () => {
  it("keeps source timing and omits repeat metadata for play-once GIFs", () => {
    const options = { repeat: "once" as const, loopPauseMs: 1500 };
    expect(gifFrameDelay([80, 120], 0, 2, options)).toBe(80);
    expect(gifFrameDelay([80, 120], 1, 2, options)).toBe(120);
    expect(gifRepeatCount(options.repeat)).toBe(-1);
  });

  it("adds the configured pause only after the final looping frame", () => {
    const options = { repeat: "forever" as const, loopPauseMs: 1500 };
    expect(gifFrameDelay([80, 120], 0, 2, options)).toBe(80);
    expect(gifFrameDelay([80, 120], 1, 2, options)).toBe(1620);
    expect(gifRepeatCount(options.repeat)).toBe(0);
  });

  it("does not allow a negative loop pause to shorten the last frame", () => {
    expect(
      gifFrameDelay([100], 0, 1, {
        repeat: "forever",
        loopPauseMs: -500,
      }),
    ).toBe(100);
  });
});

describe("GIF nearest-neighbor scaling", () => {
  it("expands indexed pixels without creating scaled RGBA frames", () => {
    expect([
      ...scaleIndexedPixels(new Uint8Array([1, 2, 3, 4]), 2, 2, 2),
    ]).toEqual([1, 1, 2, 2, 1, 1, 2, 2, 3, 3, 4, 4, 3, 3, 4, 4]);
  });

  it("rejects invalid scale values", () => {
    expect(() => scaleIndexedPixels(new Uint8Array([1]), 1, 1, 0)).toThrow(
      "positive integer",
    );
  });
});
