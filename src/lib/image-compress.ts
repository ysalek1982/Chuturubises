// Client-side image compression. Returns a JPEG Blob resized to fit MAX x MAX.
export async function compressImage(
  file: File,
  max = 800,
  quality = 0.82,
): Promise<{ blob: Blob; ext: string; type: string }> {
  if (!file.type.startsWith("image/")) {
    return { blob: file, ext: file.name.split(".").pop() ?? "bin", type: file.type };
  }
  const bitmap = await createImageBitmap(file).catch(() => null);
  let width: number, height: number;
  let source: CanvasImageSource;
  if (bitmap) {
    width = bitmap.width;
    height = bitmap.height;
    source = bitmap;
  } else {
    const img = await loadHTMLImage(file);
    width = img.naturalWidth;
    height = img.naturalHeight;
    source = img;
  }
  const scale = Math.min(1, max / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { blob: file, ext: "jpg", type: file.type };
  ctx.drawImage(source, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) return { blob: file, ext: "jpg", type: file.type };
  return { blob, ext: "jpg", type: "image/jpeg" };
}

function loadHTMLImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
