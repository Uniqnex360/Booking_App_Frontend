export async function fileToDataUrl(file: File, maxW = 600, quality = 0.7): Promise<string> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, maxW / img.width);
  const c = document.createElement("canvas");
  c.width = img.width * scale;
  c.height = img.height * scale;
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
}
