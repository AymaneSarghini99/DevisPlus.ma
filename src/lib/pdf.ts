/**
 * Direct PDF download of a document preview (no print dialog).
 *
 * The A4 sheet is drawn to an image at high resolution and placed on A4 pages, so the file
 * looks exactly like the preview (fonts, Arabic, watermark). Text in this PDF is not
 * selectable; "PDF / Print" still produces a text PDF through the browser.
 * Libraries are loaded on first use only.
 */
const A4_W = 210;
const A4_H = 297;
let fontCss: Promise<string> | null = null;

/** The PDF of the A4 sheet, as a Blob (used by the download and by Google Drive uploads). */
export async function renderPdf(node: HTMLElement, title: string): Promise<Blob> {
  const [{ toCanvas, getFontEmbedCSS }, { jsPDF }] = await Promise.all([
    import("html-to-image"),
    import("jspdf"),
  ]);
  await document.fonts.ready;
  // Embedding the web fonts is the slow part: do it once per page load.
  fontCss ??= getFontEmbedCSS(node).catch(() => "");
  const canvas = await toCanvas(node, {
    pixelRatio: 2.5,
    backgroundColor: "#ffffff",
    fontEmbedCSS: await fontCss,
    width: node.offsetWidth,
    height: node.offsetHeight,
  });

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  const pxPerMm = canvas.width / A4_W;
  const pagePx = Math.round(A4_H * pxPerMm);
  for (let y = 0, page = 0; y < canvas.height; y += pagePx, page++) {
    const h = Math.min(pagePx, canvas.height - y);
    if (page > 0 && h < 5 * pxPerMm) break; // rounding sliver, not a real page
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = h;
    slice.getContext("2d")?.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (page > 0) pdf.addPage();
    pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, A4_W, h / pxPerMm);
  }
  pdf.setProperties({ title });
  return pdf.output("blob");
}

export async function downloadPdf(node: HTMLElement, fileName: string) {
  const blob = await renderPdf(node, fileName);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName.replace(/[\\/:*?"<>|]+/g, "-")}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
