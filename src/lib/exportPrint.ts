import { PhoneModel, CaseColor, mmToPixels, DPI_PRINT } from '@/config/phoneModels';
import { GraphicTransform, TextItem } from '@/types';

export interface ExportPrintOptions {
  model: PhoneModel;
  color: CaseColor;
  graphicUrl: string | null;
  graphicTransform: GraphicTransform;
  previewWidth: number;
  previewHeight: number;
  textItem: TextItem | null;
  imageElement?: HTMLImageElement | null;
}

export interface ExportResult {
  blob: Blob;
  dataUrl: string;
  widthPx: number;
  heightPx: number;
  dpi: number;
  fileName: string;
  fileSizeFormatted: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export async function exportPrintFile(options: ExportPrintOptions): Promise<ExportResult> {
  const {
    model,
    color,
    graphicUrl,
    graphicTransform,
    previewWidth,
    previewHeight,
    textItem,
    imageElement,
  } = options;

  // 1. Obliczenie dokładnych wymiarów 300 DPI na podstawie milimetrów z konfiguracji
  const targetWidthPx = mmToPixels(model.dimensionsMm.width, DPI_PRINT);
  const targetHeightPx = mmToPixels(model.dimensionsMm.height, DPI_PRINT);
  const targetRadiusPx = mmToPixels(model.dimensionsMm.cornerRadius, DPI_PRINT);

  // Współczynnik skali z podglądu ekranowego do pełnego rozmiaru druku
  const scaleRatio = targetWidthPx / previewWidth;

  // 2. Utworzenie płótna o wysokiej rozdzielczości
  const canvas = document.createElement('canvas');
  canvas.width = targetWidthPx;
  canvas.height = targetHeightPx;
  const ctx = canvas.getContext('2d', { alpha: true });

  if (!ctx) {
    throw new Error('Nie można zainicjalizować kontekstu Canvas 2D');
  }

  // Włączenie wygładzania o wysokiej jakości
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 3. Przycięcie płótna do kształtu etui (zaokrąglone narożniki)
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(0, 0, targetWidthPx, targetHeightPx, targetRadiusPx);
  } else {
    // Fallback dla starszych przeglądarek bez natywnego roundRect
    const r = targetRadiusPx;
    ctx.moveTo(r, 0);
    ctx.lineTo(targetWidthPx - r, 0);
    ctx.quadraticCurveTo(targetWidthPx, 0, targetWidthPx, r);
    ctx.lineTo(targetWidthPx, targetHeightPx - r);
    ctx.quadraticCurveTo(targetWidthPx, targetHeightPx, targetWidthPx - r, targetHeightPx);
    ctx.lineTo(r, targetHeightPx);
    ctx.quadraticCurveTo(0, targetHeightPx, 0, targetHeightPx - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
  }
  ctx.clip();

  // 4. Warstwa tła koloru etui
  if (!color.isTransparent) {
    ctx.fillStyle = color.hex;
    ctx.fillRect(0, 0, targetWidthPx, targetHeightPx);
  } else {
    // Dla etui przezroczystego pozostawiamy kanał alfa (przezroczystość) z delikatną bazą
    ctx.clearRect(0, 0, targetWidthPx, targetHeightPx);
  }

  // 5. Rysowanie grafiki użytkownika
  if (graphicUrl) {
    let img: HTMLImageElement;
    if (imageElement && imageElement.complete && imageElement.naturalWidth > 0) {
      img = imageElement;
    } else {
      img = await loadImage(graphicUrl);
    }

    ctx.save();
    // Przeliczenie pozycji transformacji na rozdzielczość 300 DPI
    const imgX = graphicTransform.x * scaleRatio;
    const imgY = graphicTransform.y * scaleRatio;

    ctx.translate(imgX, imgY);
    ctx.rotate((graphicTransform.rotation * Math.PI) / 180);
    ctx.scale(graphicTransform.scaleX * scaleRatio, graphicTransform.scaleY * scaleRatio);

    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }

  // 6. Rysowanie tekstu użytkownika
  if (textItem && textItem.text.trim() !== '') {
    ctx.save();
    const textX = textItem.x * scaleRatio;
    const textY = textItem.y * scaleRatio;
    const scaledFontSize = Math.round(textItem.fontSize * scaleRatio);

    ctx.translate(textX, textY);
    ctx.rotate((textItem.rotation * Math.PI) / 180);
    ctx.font = `${scaledFontSize}px ${textItem.fontFamily}`;
    ctx.fillStyle = textItem.color;
    ctx.textBaseline = 'top';

    // Rysowanie tekstu
    ctx.fillText(textItem.text, 0, 0);
    ctx.restore();
  }

  // 7. Zakończenie przycięcia (BEZ WARSTWY WYCIĘCIA APARATU - zgodnie z wytycznymi drukarni)
  ctx.restore();

  // 8. Eksport do Blob i generowanie nazwy pliku
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Generowanie pliku PNG nie powiodło się'));
          return;
        }

        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `${model.id}_${dateStr}.png`;
        const dataUrl = canvas.toDataURL('image/png');

        resolve({
          blob,
          dataUrl,
          widthPx: targetWidthPx,
          heightPx: targetHeightPx,
          dpi: DPI_PRINT,
          fileName,
          fileSizeFormatted: formatBytes(blob.size),
        });
      },
      'image/png',
      1.0
    );
  });
}

// Funkcja wyzwalająca bezpośrednie pobranie pliku w przeglądarce
export function triggerFileDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
