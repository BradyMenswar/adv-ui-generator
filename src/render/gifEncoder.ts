import { GIFEncoder, applyPalette, quantize } from "gifenc";

const TRANSPARENT_INDEX = 0;

export interface GifAnimationOptions {
  repeat: "once" | "forever";
  loopPauseMs?: number;
  scale?: number;
}

export function gifFrameDelay(
  delays: number[],
  frameIndex: number,
  frameCount: number,
  options: GifAnimationOptions,
): number {
  const sourceDelay = delays[frameIndex] ?? delays[0] ?? 100;
  const loopPause =
    options.repeat === "forever" && frameIndex === frameCount - 1
      ? Math.max(0, options.loopPauseMs ?? 0)
      : 0;
  return sourceDelay + loopPause;
}

export function gifRepeatCount(repeat: GifAnimationOptions["repeat"]): number {
  return repeat === "once" ? -1 : 0;
}

export function scaleIndexedPixels(
  source: Uint8Array,
  width: number,
  height: number,
  scale: number,
): Uint8Array {
  if (!Number.isInteger(scale) || scale < 1) {
    throw new Error("GIF scale must be a positive integer.");
  }
  if (scale === 1) return source;

  const scaledWidth = width * scale;
  const scaled = new Uint8Array(scaledWidth * height * scale);
  for (let sourceY = 0; sourceY < height; sourceY += 1) {
    const scaledRow = new Uint8Array(scaledWidth);
    for (let sourceX = 0; sourceX < width; sourceX += 1) {
      scaledRow.fill(
        source[sourceY * width + sourceX],
        sourceX * scale,
        (sourceX + 1) * scale,
      );
    }
    for (let repeatY = 0; repeatY < scale; repeatY += 1) {
      scaled.set(scaledRow, (sourceY * scale + repeatY) * scaledWidth);
    }
  }
  return scaled;
}

function opaquePixels(frames: ImageData[]): Uint8Array {
  const values = new Uint8Array(
    frames.reduce((total, frame) => total + frame.data.length, 0),
  );
  let cursor = 0;
  for (const frame of frames) {
    for (let index = 0; index < frame.data.length; index += 4) {
      if (frame.data[index + 3] < 128) continue;
      values[cursor] = frame.data[index];
      values[cursor + 1] = frame.data[index + 1];
      values[cursor + 2] = frame.data[index + 2];
      values[cursor + 3] = 255;
      cursor += 4;
    }
  }
  return values.subarray(0, cursor);
}

export function encodeAnimatedGif(
  canvases: HTMLCanvasElement[],
  delays: number[],
  options: GifAnimationOptions = { repeat: "forever" },
): Blob {
  if (!canvases.length) throw new Error("No animation frames were rendered.");
  const sourceWidth = canvases[0].width;
  const sourceHeight = canvases[0].height;
  const scale = options.scale ?? 1;
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  const frames = canvases.map((canvas) => {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas rendering is unavailable.");
    return context.getImageData(0, 0, sourceWidth, sourceHeight);
  });
  const opaque = opaquePixels(frames);
  const opaquePalette = opaque.length
    ? quantize(opaque, 255)
    : ([[0, 0, 0]] as number[][]);
  const palette = [[0, 0, 0], ...opaquePalette];
  const gif = GIFEncoder();

  for (const [frameIndex, frame] of frames.entries()) {
    const mapped = applyPalette(frame.data, opaquePalette);
    const sourceIndexed = new Uint8Array(sourceWidth * sourceHeight);
    for (let pixel = 0; pixel < sourceIndexed.length; pixel += 1) {
      sourceIndexed[pixel] =
        frame.data[pixel * 4 + 3] < 128 ? TRANSPARENT_INDEX : mapped[pixel] + 1;
    }
    const indexed = scaleIndexedPixels(
      sourceIndexed,
      sourceWidth,
      sourceHeight,
      scale,
    );
    gif.writeFrame(indexed, width, height, {
      palette,
      delay: gifFrameDelay(delays, frameIndex, frames.length, options),
      repeat: gifRepeatCount(options.repeat),
      transparent: true,
      transparentIndex: TRANSPARENT_INDEX,
      dispose: 2,
    });
  }

  gif.finish();
  return new Blob([gif.bytes()], { type: "image/gif" });
}
