function createRectangle(x: number, y: number, width: number, height: number) {
  return [
    x,
    y,
    x + width,
    y,
    x + width,
    y + height,
    x + width,
    y + height,
    x,
    y + height,
    x,
    y,
  ];
}

export function createMesh(width: number, height: number, size: number) {
  const boxes: number[][] = [];

  for (let x = 0; x < width; x += size) {
    for (let y = 0; y < height; y += size) {
      boxes.push(createRectangle(x, y, size, size));
    }
  }

  return boxes.flatMap((b) => b);
}
