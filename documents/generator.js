import { Document, Packer, Paragraph, TextRun, Header, PageNumber, AlignmentType } from 'docx';
import PDFDocument from 'pdfkit';
import pptxgen from 'pptxgenjs';
import ExcelJS from 'exceljs';
import { validateDocument, documentWarnings } from '../public/document-data.js';

const FONT = 'Times New Roman';
const references = data => data.references.split(/\r?\n/).filter(line => line.trim()).sort((a, b) => a.localeCompare(b, 'es'));
function blocks(text) {
  const result = []; let paragraph = [];
  const flush = () => { if (paragraph.length) result.push({ text: paragraph.join(' '), level: 0 }); paragraph = []; };
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) { flush(); continue; }
    const heading = line.match(/^(#{1,2})\s+(.+)/);
    if (heading) { flush(); result.push({ text: heading[2], level: heading[1].length }); }
    else paragraph.push(line.trim());
  }
  flush(); return result;
}
const metadata = data => [data.author, data.institution, data.course, data.instructor, data.date].filter(Boolean);
const runs = (text, options = {}) => text.split(/(\*[^*\n]+\*)/).filter(Boolean).map(part => new TextRun({ text: part.startsWith('*') && part.endsWith('*') ? part.slice(1, -1) : part, italics: part.startsWith('*') && part.endsWith('*'), font: FONT, size: 24, color: '000000', ...options }));

async function word(data) {
  const centered = (text, bold = false, extra = {}) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { line: 480, before: 0, after: 0 }, children: runs(text, { bold }), ...extra });
  const body = [centered(data.title, true, { spacing: { before: 1440, after: 480, line: 480 } }), ...metadata(data).map(text => centered(text)), centered(data.title, true, { pageBreakBefore: true })];
  for (const block of blocks(data.body)) body.push(new Paragraph({ alignment: block.level === 1 ? AlignmentType.CENTER : AlignmentType.LEFT, keepNext: !!block.level, indent: block.level ? {} : { firstLine: 720 }, children: runs(block.text, { bold: !!block.level }) }));
  if (data.references) {
    body.push(centered('Referencias', true, { pageBreakBefore: true }));
    for (const text of references(data)) body.push(new Paragraph({ indent: { left: 720, hanging: 720 }, children: runs(text) }));
  }
  return Packer.toBuffer(new Document({ creator: data.author, title: data.title, styles: { default: { document: { run: { font: FONT, size: 24, color: '000000' }, paragraph: { spacing: { line: 480, before: 0, after: 0 }, alignment: AlignmentType.LEFT } } } }, sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440, header: 720, footer: 720 } } }, headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 24, color: '000000' })] })] }) }, children: body }] }));
}

function pdf(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 72, bufferPages: true, info: { Title: data.title, Author: data.author } });
    const output = []; doc.on('data', chunk => output.push(chunk)); doc.on('error', reject); doc.on('end', () => resolve(Buffer.concat(output)));
    try {
      const paragraph = (text, { bold = false, align = 'left', indent = 0 } = {}) => {
        const parts = text.split(/(\*[^*\n]+\*)/).filter(Boolean);
        parts.forEach((part, index) => {
          const italic = part.startsWith('*') && part.endsWith('*');
          doc.font(bold ? italic ? 'Times-BoldItalic' : 'Times-Bold' : italic ? 'Times-Italic' : 'Times-Roman').fontSize(12).fillColor('black');
          doc.text(italic ? part.slice(1, -1) : part, { align, indent: index ? 0 : indent, lineGap: 24 - doc.currentLineHeight(true), paragraphGap: 0, continued: index < parts.length - 1 });
        });
      };
      doc.y = 144; paragraph(data.title, { bold: true, align: 'center' }); doc.moveDown(1);
      for (const text of metadata(data)) paragraph(text, { align: 'center' });
      doc.addPage(); paragraph(data.title, { bold: true, align: 'center' });
      for (const block of blocks(data.body)) paragraph(block.text, { bold: !!block.level, align: block.level === 1 ? 'center' : 'left', indent: block.level ? 0 : 36 });
      if (data.references) {
        doc.addPage(); paragraph('Referencias', { bold: true, align: 'center' });
        for (const text of references(data)) {
          doc.x = 108;
          // Reservar 0,5 pulgadas para las líneas siguientes de la referencia.
          doc.page.margins.right = 72;
          paragraph(text, { indent: -36 });
          doc.x = 72;
        }
      }
      const range = doc.bufferedPageRange();
      for (let page = 0; page < range.count; page++) {
        doc.switchToPage(range.start + page); doc.font('Times-Roman').fontSize(12).fillColor('black').text(String(page + 1), 510, 36, { width: 30, align: 'right', lineBreak: false });
      }
      doc.end();
    } catch (error) { reject(error); doc.end(); }
  });
}

function chunks(text, limit = 450) {
  const output = []; let current = '';
  for (const word of text.split(/\s+/u)) {
    if ((current + ' ' + word).length > limit && current) { output.push(current); current = ''; }
    current += (current ? ' ' : '') + word;
  }
  if (current) output.push(current); return output;
}
async function presentation(data) {
  const deck = new pptxgen(); deck.layout = 'LAYOUT_WIDE'; deck.author = data.author; deck.title = data.title; deck.subject = data.title; deck.lang = 'es-ES';
  deck.theme = { headFontFace: FONT, bodyFontFace: FONT, lang: 'es-ES' };
  let slideNumber = 0;
  const slide = (title, text) => {
    const page = deck.addSlide(); page.background = { color: 'FFFFFF' };
    page.addText(title, { x: 0.7, y: 0.5, w: 12, h: 1, fontFace: FONT, fontSize: 28, bold: true, color: '000000', fit: 'shrink', margin: 0 });
    page.addText(text, { x: 0.7, y: 1.7, w: 12, h: 4.6, fontFace: FONT, fontSize: 22, color: '000000', fit: 'shrink', breakLine: false, margin: 0, valign: 'top' });
    page.addText(String(++slideNumber), { x: 11.8, y: 6.8, w: 0.7, h: 0.3, fontSize: 12, color: '000000', align: 'right' });
  };
  slide(data.title, metadata(data).join('\n'));
  const parts = chunks(data.body.replace(/^#{1,2}\s+/gm, ''));
  parts.forEach((part, index) => slide(`${data.title} (${index + 1})`, part));
  if (data.references) chunks(references(data).join('\n')).forEach(part => slide('Referencias', part));
  return Buffer.from(await deck.write({ outputType: 'nodebuffer' }));
}
async function spreadsheet(data) {
  const book = new ExcelJS.Workbook(); book.creator = data.author; book.title = data.title;
  const sheet = book.addWorksheet('Datos', { views: [{ state: 'frozen', ySplit: 1 }] });
  const rows = data.table.split(/\r?\n/).map(line => line.split('\t'));
  for (const [index, values] of rows.entries()) {
    const row = sheet.addRow(values.map(value => index && /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value) && Number.isFinite(Number(value)) && value.replace(/\D/g, '').length <= 15 ? Number(value) : value));
    row.eachCell(cell => { cell.font = { name: FONT, size: 12, color: { argb: 'FF000000' }, bold: index === 0 }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }; cell.alignment = { vertical: 'top', wrapText: true }; });
  }
  sheet.columns.forEach(column => { column.width = 26; });
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length, column: Math.max(...rows.map(row => row.length)) } };
  return Buffer.from(await book.xlsx.writeBuffer());
}

export async function generateDocument(input) {
  const data = validateDocument(input);
  const builders = { docx: word, pdf, pptx: presentation, xlsx: spreadsheet };
  const names = { docx: 'informe-apa.docx', pdf: 'informe-apa.pdf', pptx: 'presentacion.pptx', xlsx: 'datos.xlsx' };
  const mime = { docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', pdf: 'application/pdf', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  return { buffer: await builders[data.format](data), filename: names[data.format], mime: mime[data.format], warnings: documentWarnings(data) };
}
