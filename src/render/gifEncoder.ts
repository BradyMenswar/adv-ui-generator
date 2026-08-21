import { GIFEncoder, applyPalette, quantize } from "gifenc";

const TRANSPARENT_INDEX = 0;

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
  delay: number,
): Blob {
  if (!canvases.length) throw new Error("No animation frames were rendered.");
  const width = canvases[0].width;
  const height = canvases[0].height;
  const frames = canvases.map((canvas) => {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas rendering is unavailable.");
    return context.getImageData(0, 0, width, height);
  });
  const opaque = opaquePixels(frames);
  const opaquePalette = opaque.length
    ? quantize(opaque, 255)
    : ([[0, 0, 0]] as number[][]);
  const palette = [[0, 0, 0], ...opaquePalette];
  const gif = GIFEncoder();

  for (const frame of frames) {
    const mapped = applyPalette(frame.data, opaquePalette);
    const indexed = new Uint8Array(width * height);
    for (let pixel = 0; pixel < indexed.length; pixel += 1) {
      indexed[pixel] =
        frame.data[pixel * 4 + 3] < 128 ? TRANSPARENT_INDEX : mapped[pixel] + 1;
    }
    gif.writeFrame(indexed, width, height, {
      palette,
      delay,
      repeat: 0,
      transparent: true,
      transparentIndex: TRANSPARENT_INDEX,
      dispose: 2,
    });
  }

  gif.finish();
  return new Blob([gif.bytes()], { type: "image/gif" });
}
