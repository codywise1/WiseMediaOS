import jsPDF from 'jspdf';

export const WISE_LOGO_URL = 'https://wisemedia.io/wp-content/uploads/2025/12/Black-Logo-scaled.png';
export const WISE_EMAIL = 'info@wisemedia.io';
export const WISE_SITE = 'wisemedia.io';

export const ACCENT = '#3aa3eb';
export const ACCENT_RGB: [number, number, number] = [58, 163, 235];
export const INK = '#0f172a';
export const INK_RGB: [number, number, number] = [15, 23, 42];
export const SLATE = '#475569';
export const SLATE_RGB: [number, number, number] = [71, 85, 109];
export const MUTED = '#94a3b8';
export const MUTED_RGB: [number, number, number] = [148, 163, 184];
export const LINE = '#e2e8f0';
export const LINE_RGB: [number, number, number] = [226, 232, 240];
export const SURFACE = '#f8fafc';
export const SURFACE_RGB: [number, number, number] = [248, 250, 252];

let logoCache: string | null = null;

export async function fetchLogoDataUrl(): Promise<string | null> {
  if (logoCache) return logoCache;
  try {
    const res = await fetch(WISE_LOGO_URL, { mode: 'cors' });
    const blob = await res.blob();
    logoCache = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
    return logoCache || null;
  } catch {
    return null;
  }
}

export function stripMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '$1')
    .replace(/^#{1,6}\s+/gim, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
}

export function fmtMoney(n: number, cents = false): string {
  const v = cents ? n / 100 : n;
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function fmtDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export interface PdfPageOpts {
  margin?: number;
  bg?: [number, number, number];
}

export function addImageMultiPage(
  pdf: jsPDF,
  imgData: string,
  imgW: number,
  imgH: number,
  opts: PdfPageOpts = {},
) {
  const margin = opts.margin ?? 12;
  const bg = opts.bg ?? [255, 255, 255];
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  const innerW = pdfW - margin * 2;
  const ratio = innerW / imgW;
  const renderedH = imgH * ratio;

  const drawMasks = () => {
    pdf.setFillColor(bg[0], bg[1], bg[2]);
    pdf.rect(0, 0, pdfW, margin, 'F');
    pdf.rect(0, pdfH - margin, pdfW, margin, 'F');
    pdf.rect(0, 0, margin, pdfH, 'F');
    pdf.rect(pdfW - margin, 0, margin, pdfH, 'F');
  };

  let heightLeft = renderedH;
  let position = margin;
  pdf.addImage(imgData, 'PNG', margin, position, innerW, renderedH);
  drawMasks();
  heightLeft -= pdfH - margin * 2;
  while (heightLeft > 0) {
    position -= pdfH - margin * 2;
    pdf.addPage();
    pdf.setFillColor(bg[0], bg[1], bg[2]);
    pdf.rect(0, 0, pdfW, pdfH, 'F');
    pdf.addImage(imgData, 'PNG', margin, position, innerW, renderedH);
    drawMasks();
    heightLeft -= pdfH - margin * 2;
  }
}
