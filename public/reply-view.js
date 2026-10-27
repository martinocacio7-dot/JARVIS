// Only fenced blocks are formatted; all content stays text, never executable HTML.
export function replyView(text) {
  const fragment = document.createDocumentFragment();
  const tick = String.fromCharCode(96).repeat(3);
  const pattern = new RegExp(tick + '([a-zA-Z0-9+#-]*)\\n([\\s\\S]*?)' + tick, 'g');
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    fragment.append(document.createTextNode(text.slice(cursor, match.index)));
    const block = document.createElement('div'); block.className = 'reply-code';
    const bar = document.createElement('div'); bar.className = 'reply-code-bar';
    const language = document.createElement('span'); language.textContent = match[1] || 'Código';
    const copy = document.createElement('button'); copy.type = 'button'; copy.textContent = 'Copiar código';
    const status = document.createElement('span'); status.setAttribute('role', 'status');
    const pre = document.createElement('pre'); const code = document.createElement('code');
    const value = match[2].replace(/\n$/, ''); code.textContent = value;
    pre.append(code); bar.append(language, copy, status); block.append(bar, pre); fragment.append(block);
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(value); status.textContent = 'Copiado'; }
      catch { status.textContent = 'Selecciona el código y cópialo manualmente.'; }
    });
    cursor = match.index + match[0].length;
  }
  fragment.append(document.createTextNode(text.slice(cursor)));
  return fragment;
}
