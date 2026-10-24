export function projectView(project) {
  if (!project || typeof project.filename !== 'string' || !/^jarvis-(tareas|inventario|calculadora)\.html$/.test(project.filename) || typeof project.code !== 'string' || project.code.length > 30000) return null;
  const section = document.createElement('section');
  section.className = 'generated-project';
  const download = document.createElement('button');
  download.type = 'button'; download.textContent = `Descargar ${project.filename}`;
  download.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([project.code], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = project.filename;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  const details = document.createElement('details');
  const summary = document.createElement('summary'); summary.textContent = 'Ver código HTML, CSS y JavaScript';
  const pre = document.createElement('pre'); const code = document.createElement('code');
  code.textContent = project.code; pre.append(code); details.append(summary, pre);
  const copy = document.createElement('button'); copy.type = 'button'; copy.textContent = 'Copiar código';
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(project.code); copy.textContent = 'Código copiado'; }
    catch { copy.textContent = 'Abre «Ver código» para seleccionarlo y copiarlo'; }
  });
  // Solo se muestra como texto. Nunca ejecutamos el proyecto en el origen de
  // JARVIS, que contiene las credenciales y la biblioteca privada del usuario.
  section.append(download, copy, details);
  return section;
}
