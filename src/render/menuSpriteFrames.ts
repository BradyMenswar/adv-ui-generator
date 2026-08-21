import * as UPNG from "upng-js";

interface MenuSpriteAnimation {
  frames: HTMLCanvasElement[];
  delay: number;
  bounds: MenuSpriteBounds;
}

export interface MenuSpriteBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const animationCache = new Map<string, Promise<MenuSpriteAnimation>>();

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

async function decodeMenuSprite(url: string): Promise<MenuSpriteAnimation> {
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
    delay: decoded.frames[0]?.delay || 170,
    bounds: opaqueUnionBounds(rgbaFrames, decoded.width, decoded.height),
  };
}

export function loadMenuSpriteFrames(
  url: string,
): Promise<MenuSpriteAnimation> {
  const cached = animationCache.get(url);
  if (cached) return cached;
  const animation = decodeMenuSprite(url);
  animationCache.set(url, animation);
  return animation;
}
