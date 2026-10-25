let installPrompt = null;
export function showTools() {
  document.body.classList.add('tools-open');
  document.querySelector('#mobile-tools').setAttribute('aria-expanded', 'true');
}
export function initMobile() {
  const install = document.querySelector('#install-app');
  const status = document.querySelector('#install-notice');
  document.querySelector('#mobile-tools').addEventListener('click', () => {
    const open = document.body.classList.toggle('tools-open');
    document.querySelector('#mobile-tools').setAttribute('aria-expanded', String(open));
  });
  document.querySelector('#mobile-new-chat').addEventListener('click', () => document.querySelector('#new-chat').click());
  document.addEventListener('jarvis:show-tools', showTools);
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; install.textContent = 'Instalar JARVIS'; });
  window.addEventListener('appinstalled', () => { installPrompt = null; status.textContent = 'JARVIS instalado. Mantén la conexión y permite el micrófono cuando lo uses.'; });
  install.addEventListener('click', async () => {
    if (installPrompt) {
      const prompt = installPrompt; installPrompt = null;
      try { await prompt.prompt(); const result = await prompt.userChoice; status.textContent = result.outcome === 'accepted' ? 'Instalación solicitada al navegador.' : 'Puedes instalar JARVIS después desde el menú del navegador.'; }
      catch { status.textContent = 'Abre el menú del navegador y busca «Instalar aplicación» o «Añadir a la pantalla de inicio».'; }
    } else status.textContent = 'Android: menú de Chrome → Instalar aplicación o Añadir a pantalla de inicio. iPhone: Safari → Compartir → Añadir a pantalla de inicio. Si ya está instalada, ábrela desde su icono. Necesita Internet y tu contraseña.';
  });
  if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('/sw.js').catch(() => { status.textContent = 'No se pudo preparar la instalación. Puedes seguir usando JARVIS en esta pestaña.'; });
}
