import * as UPNG from "upng-js";

export interface SpriteAnimation {
  frames: HTMLCanvasElement[];
  delays: number[];
  bounds: MenuSpriteBounds;
  restingBounds: MenuSpriteBounds;
}

export interface MenuSpriteBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AnimationFrameSelection = number | "last";

export function resolveAnimationFrameIndex(
  selection: AnimationFrameSelection,
  frameCount: number,
): number {
  if (frameCount < 1) throw new Error("The animation has no frames.");
  if (selection === "last") return frameCount - 1;
  return ((selection % frameCount) + frameCount) % frameCount;
}

export function bottomCenterBounds(
  bounds: MenuSpriteBounds,
  container: MenuSpriteBounds,
  offset: { x: number; y: number },
): { x: number; y: number } {
  return {
    x: Math.round(
      container.x +
        container.width / 2 -
        (bounds.x + bounds.width / 2) +
        offset.x,
    ),
    y: container.y + container.height - (bounds.y + bounds.height) + offset.y,
  };
}

const animationCache = new Map<string, Promise<SpriteAnimation>>();

export function opaqueUnionBounds(
  frames: ArrayBuffer[],
  width: number,
  height: number,
): MenuSpriteBounds {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (const frame of frames) {
    const rgba = new Uint8Array(frame);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (rgba[(y * width + x) * 4 + 3] === 0) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) return { x: 0, y: 0, width, height };
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

async function decodeSpriteAnimation(url: string): Promise<SpriteAnimation> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load menu sprite (${response.status}).`);
  }

  const decoded = UPNG.decode(await response.arrayBuffer());
  const rgbaFrames = UPNG.toRGBA8(decoded);
  const frames = rgbaFrames.map((rgba) => {
    const canvas = document.createElement("canvas");
    canvas.width = decoded.width;
    canvas.height = decoded.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas rendering is unavailable.");
    context.putImageData(
      new ImageData(new Uint8ClampedArray(rgba), decoded.width, decoded.height),
      0,
      0,
    );
    return canvas;
  });

  if (!frames.length) throw new Error("The menu sprite has no frames.");
  return {
    frames,
    delays: frames.map((_, index) => decoded.frames[index]?.delay || 100),
    bounds: opaqueUnionBounds(rgbaFrames, decoded.width, decoded.height),
    restingBounds: opaqueUnionBounds(
      [rgbaFrames[rgbaFrames.length - 1]],
      decoded.width,
      decoded.height,
    ),
  };
}

export function loadSpriteAnimation(url: string): Promise<SpriteAnimation> {
  const cached = animationCache.get(url);
  if (cached) return cached;
  const animation = decodeSpriteAnimation(url);
  animationCache.set(url, animation);
  return animation;
}

export const loadMenuSpriteFrames = loadSpriteAnimation;
