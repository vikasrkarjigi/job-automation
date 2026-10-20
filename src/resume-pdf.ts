import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import type { ResumeDoc, Run } from "./resume-view.ts";

const PAGE = { w: 612, h: 792 };
const MARGIN = { x: 42, top: 40, bottom: 40 };
const SIZE = { name: 18, contact: 9, section: 10.5, body: 9.8 };
const LEAD = 1.28;
const INK = rgb(0.08, 0.08, 0.08);
const MUTED = rgb(0.3, 0.3, 0.3);

/** Standard PDF fonts only cover WinAnsi, so anything outside it is mapped or dropped. */
const WIN_ANSI_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
function safe(s: string): string {
  return s
    .replace(/[→⇒]/g, "->")
    .replace(/[\u2010\u2011\u2012]/g, "-")
    .replace(/\u00a0/g, " ")
    .split("")
    .filter((ch) => ch.charCodeAt(0) <= 0xff || WIN_ANSI_EXTRA.has(ch))
    .join("");
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

class Writer {
  page: PDFPage;
  y: number;
  constructor(
    readonly pdf: PDFDocument,
    readonly fonts: Fonts,
  ) {
    this.page = pdf.addPage([PAGE.w, PAGE.h]);
    this.y = PAGE.h - MARGIN.top;
  }

  get width() {
    return PAGE.w - MARGIN.x * 2;
  }

  ensure(height: number) {
    if (this.y - height >= MARGIN.bottom) return;
    this.page = this.pdf.addPage([PAGE.w, PAGE.h]);
    this.y = PAGE.h - MARGIN.top;
  }

  centered(text: string, size: number, font: PDFFont, color = INK) {
    for (const line of wrapPlain(safe(text), font, size, this.width)) {
      this.ensure(size * LEAD);
      this.y -= size;
      this.page.drawText(line, { x: MARGIN.x + (this.width - font.widthOfTextAtSize(line, size)) / 2, y: this.y, size, font, color });
      this.y -= size * (LEAD - 1);
    }
  }

  section(title: string) {
    this.ensure(SIZE.section * 2.4 + SIZE.body * LEAD);
    this.y -= SIZE.section * 0.9;
    this.y -= SIZE.section;
    this.page.drawText(safe(title.toUpperCase()), { x: MARGIN.x, y: this.y, size: SIZE.section, font: this.fonts.bold, color: INK });
    this.y -= 3;
    this.page.drawLine({ start: { x: MARGIN.x, y: this.y }, end: { x: PAGE.w - MARGIN.x, y: this.y }, thickness: 0.6, color: MUTED });
    this.y -= 4;
  }

  entry(parts: string[]) {
    const [head, ...rest] = parts.map(safe);
    const right = rest.join("  |  ");
    const size = SIZE.body;
    const headW = this.fonts.bold.widthOfTextAtSize(head, size);
    const rightW = this.fonts.regular.widthOfTextAtSize(right, size);
    this.ensure(size * LEAD * 2);
    this.y -= size * 0.35;
    if (headW + rightW + 12 <= this.width) {
      this.y -= size;
      this.page.drawText(head, { x: MARGIN.x, y: this.y, size, font: this.fonts.bold, color: INK });
      if (right) this.page.drawText(right, { x: PAGE.w - MARGIN.x - rightW, y: this.y, size, font: this.fonts.regular, color: MUTED });
      this.y -= size * (LEAD - 1);
      return;
    }
    this.rich([{ text: head, bold: true }], 0);
    if (right) this.rich([{ text: right, bold: false }], 0, MUTED);
  }

  rich(runs: Run[], indent: number, color = INK, bullet = false) {
    const size = SIZE.body;
    const x0 = MARGIN.x + indent;
    const width = this.width - indent;
    const words = runs.flatMap((r) =>
      safe(r.text)
        .split(/(\s+)/)
        .filter((w) => w !== "")
        .map((w) => ({ text: w, bold: r.bold })),
    );
    const lines: { text: string; bold: boolean }[][] = [[]];
    let lineW = 0;
    for (const w of words) {
      const font = w.bold ? this.fonts.bold : this.fonts.regular;
      const ww = font.widthOfTextAtSize(w.text, size);
      const isSpace = /^\s+$/.test(w.text);
      if (!isSpace && lineW + ww > width && lines[lines.length - 1].length) {
        lines.push([]);
        lineW = 0;
      }
      if (isSpace && lineW === 0) continue;
      lines[lines.length - 1].push({ text: isSpace ? " " : w.text, bold: w.bold });
      lineW += isSpace ? font.widthOfTextAtSize(" ", size) : ww;
    }
    lines.forEach((line, i) => {
      this.ensure(size * LEAD);
      this.y -= size;
      if (bullet && i === 0) this.page.drawText("•", { x: x0 - 9, y: this.y, size, font: this.fonts.regular, color });
      let x = x0;
      for (const w of line) {
        const font = w.bold ? this.fonts.bold : this.fonts.regular;
        this.page.drawText(w.text, { x, y: this.y, size, font, color });
        x += font.widthOfTextAtSize(w.text, size);
      }
      this.y -= size * (LEAD - 1);
    });
  }
}

function wrapPlain(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(next, size) > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderResumePdf(doc: ResumeDoc, title = "Resume"): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(safe(title));
  pdf.setCreator("Shortlist");
  const fonts = { regular: await pdf.embedFont(StandardFonts.TimesRoman), bold: await pdf.embedFont(StandardFonts.TimesRomanBold) };
  const w = new Writer(pdf, fonts);

  doc.header.forEach((h, i) => (i === 0 ? w.centered(h, SIZE.name, fonts.bold) : w.centered(h, SIZE.contact, fonts.regular, MUTED)));
  for (const s of doc.sections) {
    w.section(s.title);
    for (const b of s.blocks) {
      if (b.kind === "entry") w.entry(b.parts);
      if (b.kind === "text") w.rich([{ text: b.text, bold: false }], 0);
      if (b.kind === "bullet") w.rich(b.runs, 12, INK, true);
      if (b.kind === "skills") w.rich([{ text: `${b.label}: `, bold: true }, { text: b.items.map((i) => i.text).join(", "), bold: false }], 0);
    }
  }
  return pdf.save();
}
