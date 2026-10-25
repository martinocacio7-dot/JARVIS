import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import { generateDocument } from '../documents/generator.js';
import { validateDocument, documentWarnings, isDocumentRequest } from '../public/document-data.js';
import { createServer } from '../server.js';

const input = { title: 'Informe de prueba', author: 'Autor de prueba', institution: 'Institución', course: 'Asignatura', instructor: 'Docente', date: 'Fecha de prueba', body: '# Objetivo\n\nEste texto de prueba conserva el contenido recibido (Autor de prueba, 2024).\n\n## Conclusión\n\nNo presenta resultados reales de investigación.', references: 'Autor de prueba. (2024). *Texto de prueba*. Editorial de prueba.', table: 'Producto\tCantidad\n=1+1\t007\nCuaderno\t3' };
test('Word usa portada, márgenes APA, doble espacio, sangrías, número de página y texto negro', async () => {
  const result = await generateDocument({ ...input, format: 'docx' });
  const zip = await JSZip.loadAsync(result.buffer);
  const document = await zip.file('word/document.xml').async('string');
  const styles = await zip.file('word/styles.xml').async('string');
  const header = await zip.file('word/header1.xml').async('string');
  assert.match(document, /w:top="1440"/); assert.match(document, /w:left="1440"/);
  assert.match(document, /w:firstLine="720"/); assert.match(document, /w:hanging="720"/);
  assert.match(document, /w:pageBreakBefore/); assert.match(document, /w:color w:val="000000"/);
  assert.match(styles, /w:line="480"/); assert.match(styles, /Times New Roman/);
  assert.match(header, /PAGE/); assert.match(document, /Texto de prueba/); assert.match(document, /w:i/);
});
test('PDF y PowerPoint son archivos reales y las diapositivas usan texto negro', async () => {
  const pdf = await generateDocument({ ...input, format: 'pdf' });
  assert.equal(pdf.buffer.subarray(0, 5).toString(), '%PDF-');
  assert.match(pdf.buffer.toString('latin1'), /\/MediaBox \[0 0 612 792\]/);
  assert.match(pdf.buffer.toString('latin1'), /\/Count 3/);
  const pptx = await generateDocument({ ...input, format: 'pptx' });
  const zip = await JSZip.loadAsync(pptx.buffer);
  const slides = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name));
  assert.ok(slides.length >= 3);
  for (const name of slides) {
    const xml = await zip.file(name).async('string');
    assert.match(xml, /000000/); assert.doesNotMatch(xml, /<a:srgbClr val="(?!000000|FFFFFF)/);
  }
});
test('Excel conserva textos, códigos y números sin convertir contenido del usuario en fórmulas', async () => {
  const result = await generateDocument({ ...input, format: 'xlsx' });
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(result.buffer);
  const sheet = workbook.getWorksheet('Datos');
  assert.equal(sheet.getCell('A2').value, '=1+1'); assert.equal(sheet.getCell('A2').type, ExcelJS.ValueType.String);
  assert.equal(sheet.getCell('B2').value, '007'); assert.equal(sheet.getCell('B3').value, 3);
  assert.equal(sheet.getCell('A1').font.color.argb, 'FF000000');
});
test('valida entradas y avisa de referencias ausentes sin inventarlas', () => {
  assert.equal(isDocumentRequest('informe'), true);
  assert.throws(() => validateDocument({ format: 'exe' }));
  assert.throws(() => validateDocument({ format: 'docx', title: 'Solo título', author: 'Autor' }), /contenido/);
  assert.throws(() => validateDocument({ ...input, format: 'xlsx', table: 'a\n'.repeat(201) }));
  assert.ok(documentWarnings({ ...input, format: 'docx', references: '' }).some(w => w.includes('No proporcionaste referencias')));
});
test('descarga autenticada y detección de una petición de informe en el chat', async t => {
  const server = createServer({ apiKey: '', auth: { production: false, password: '' } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, format: 'docx' }) };
  const result = await fetch(base + '/api/documents', options);
  assert.equal(result.status, 200); assert.match(result.headers.get('content-disposition'), /informe-apa.docx/);
  assert.equal((await fetch(base + '/api/documents', { ...options, headers: { ...options.headers, Origin: 'https://other.example' } })).status, 403);
  const chat = await fetch(base + '/api/chat', { ...options, body: JSON.stringify({ messages: [{ role: 'user', content: 'Hazme un informe en Word' }] }) });
  assert.equal((await chat.json()).documentDraft, true);
});
