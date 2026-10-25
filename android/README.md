# JARVIS para Android

Aplicación Android 8.0 o posterior. Abre tu servidor privado `https://jarvis-privado-rmkm.onrender.com` en un WebView con acceso nativo a voz y avisos de agenda. No contiene contraseñas ni claves API. Necesita que el servidor tenga desplegada esta versión del repositorio; usa tu usuario y contraseña habituales.

## Instalar y probar

Descarga [JARVIS-Android-prueba.apk](../downloads/JARVIS-Android-prueba.apk) en tu teléfono, ábrelo y permite la instalación desde ese navegador/gestor de archivos. Es una compilación de prueba firmada, no una publicación en Google Play. Para actualizarla sin desinstalar necesitas conservar la misma clave de firma. Las claves no se publican en el repositorio.

Si el navegador no descarga el APK directamente, descarga el [ZIP con el mismo APK](../downloads/JARVIS-Android-prueba.zip), extráelo en el teléfono y abre el archivo `.apk`.

Abre JARVIS y entra. En Android, **Leer respuestas en voz alta** viene activado; puedes desactivarlo y se recuerda tu elección. Si no hay voz española instalada, usa **Permisos → Instalar o configurar voz en español**. En **Permisos** puedes habilitar:

- **Micrófono** para dictado y activación «JARVIS» con la aplicación abierta.
- **Permitir avisos de recordatorios** para que Android muestre los recordatorios.
- **Alarmas y recordatorios a la hora exacta** para avisos puntuales. Si no lo permites, Android programa avisos aproximados y JARVIS lo indica.
Desde la versión 1.0.1 no se declara el servicio de acceso a notificaciones de otras aplicaciones ni ofrece activar ese permiso. La versión anterior fue bloqueada por Play Protect con un aviso de acceso sensible. El aviso no identifica una causa exacta: reducir permisos no garantiza que Google acepte un APK distribuido fuera de Play. Si vuelve a bloquearlo, utiliza la versión web instalable mientras se tramita una revisión por los canales oficiales de Google; no es necesario desactivar Play Protect.

Pulsa **Activar «JARVIS»** y prueba:

- «JARVIS, qué hora es»: consulta la hora y zona del teléfono.
- «JARVIS, qué notificaciones tengo»: informa de que esta versión no tiene acceso.
- «JARVIS, hazme un recordatorio mañana a las 9 sobre tomar agua»: guarda el pendiente en tu base de datos y sincroniza su aviso en el teléfono.

En Android las peticiones de ese modo de voz se envían al terminar de hablar; el dictado manual con 🎤 permite revisar antes de enviar. Se requiere activar la escucha cada vez que vuelvas a la aplicación. No escucha con la pantalla bloqueada o en segundo plano. Al salir de JARVIS o perder el foco de la ventana se destruye su reconocedor de voz. También se detiene cuando Android informa de otra grabación o retira el foco de audio, y no se reactiva automáticamente; vuelve a pulsar Activar «JARVIS» al terminar. Si Android informa de audio ocupado, la respuesta queda en pantalla. Escuchar una palabra desde otra aplicación exigiría mantener el micrófono activo y podría entrar en conflicto con una cámara o grabadora. Esta versión prioriza liberar el micrófono, por lo que no incorpora escucha permanente en segundo plano. La detección de grabaciones depende de lo que Android y el proveedor de reconocimiento expongan: no garantiza compatibilidad con todas las cámaras, grabadoras o equipos. Antes de grabar, sal de JARVIS y comprueba un vídeo corto con sonido. Android puede interrumpir la escucha si su servicio no está disponible. Instala una voz española en los ajustes de síntesis de voz si no hay ninguna voz local disponible.

Las horas de los recordatorios se interpretan en **America/Guayaquil (UTC−5)** y se muestran al confirmar. Cuando solo indicas una hora se elige su próxima ocurrencia; si faltan datos se abre el formulario. No admite recordatorios recurrentes.

## Avisos y privacidad

Los recordatorios se sincronizan al cargar/actualizar pendientes, al crearlos y al editarlos desde esta app. Los cambios hechos en otro equipo necesitan abrir o actualizar JARVIS en el teléfono; no hay sincronización push. Una vez programado, el aviso puede aparecer con la app cerrada y sin Internet. Los avisos futuros se restauran tras reiniciar Android. Si fuerzas la detención de JARVIS o revocas permisos, vuelve a abrirla y revisa los permisos. Android y el fabricante pueden retrasar o bloquear avisos; comprueba un recordatorio corto en tu dispositivo antes de depender de ellos.

Esta versión no puede consultar notificaciones de otras aplicaciones. Las respuestas locales de hora y de disponibilidad quedan fuera del historial y de las llamadas al servidor o a ElevenLabs. Se usa una voz local instalada; si falta, se muestra el texto. El servicio de reconocimiento de voz de Android puede enviar el audio al proveedor correspondiente. La voz personalizada de ElevenLabs sigue disponible para las demás respuestas; requiere su configuración independiente.

Se rechaza tráfico HTTP, errores TLS y navegación interna a otros dominios. Los enlaces HTTPS externos se abren en el navegador sin el puente nativo. Los documentos se guardan mediante el selector de archivos de Android, sin solicitar acceso general al almacenamiento. No hay telemetría propia ni almacenamiento de la contraseña en preferencias.

## Compilar

Abre esta carpeta en Android Studio o instala JDK 21, Android SDK 35 y Build Tools 35.0.0. Configura `ANDROID_HOME` o un `local.properties` local con `sdk.dir=...`. No publiques ese archivo ni claves de firma.

```sh
cd android
./gradlew --no-daemon assembleDebug lintDebug
```

En Windows usa `gradlew.bat`. El APK sale en `app/build/outputs/apk/debug/app-debug.apk`. También puedes usar GitHub → Actions → **Android APK** → Run workflow y descargar el artefacto del resultado. Cada nueva máquina genera su propia firma de prueba: para una distribución estable configura una clave de lanzamiento privada y consérvala.

Las comprobaciones realizadas son compilación, análisis Android Lint, revisión del manifiesto empaquetado y pruebas de integración web con el puente Android simulado (hora, privacidad de respuestas locales, voz y recordatorios). La entrega de avisos reales, el reconocimiento con micrófono y los permisos deben probarse en un teléfono Android; no se han verificado con un teléfono físico.
