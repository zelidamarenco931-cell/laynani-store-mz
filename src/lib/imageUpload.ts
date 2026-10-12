// Prepara uma foto escolhida no telemóvel antes de a enviar:
// - lê o ficheiro para a memória logo ao escolher (em alguns Androids o ficheiro deixa de ser legível
//   depois de o seletor ser limpo, e o envio falhava sem erro);
// - corrige a rotação, reduz para no máximo `max` px e converte para JPEG (rápido em 3G e funciona sempre).

const MAX_SIDE = 1600;

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

const decode = async (blob: Blob): Promise<Decoded> => {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" });
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      /* tenta com <img> */
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Imagem inválida"));
      el.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
};

export async function prepareImage(file: File, max = MAX_SIDE): Promise<File> {
  const buffer = await file.arrayBuffer();
  if (!buffer.byteLength) throw new Error("Ficheiro vazio");

  const decoded = await decode(new Blob([buffer], { type: file.type || "image/jpeg" }));
  try {
    if (!decoded.width || !decoded.height) throw new Error("Imagem inválida");
    const scale = Math.min(1, max / Math.max(decoded.width, decoded.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(decoded.width * scale);
    canvas.height = Math.round(decoded.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.fillStyle = "#fff"; // PNG com fundo transparente fica branco
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Não foi possível converter a imagem"))), "image/jpeg", 0.85),
    );
    return new File([blob], `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`, { type: "image/jpeg" });
  } finally {
    decoded.close();
  }
}
