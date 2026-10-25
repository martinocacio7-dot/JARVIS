# JARVIS para Android

Aplicación Android 8.0 o posterior. Abre tu servidor privado `https://jarvis-privado-rmkm.onrender.com` en un WebView con acceso nativo a voz, notificaciones y avisos de agenda. No contiene contraseñas ni claves API. Necesita que el servidor tenga desplegada esta versión del repositorio; usa tu usuario y contraseña habituales.

## Instalar y probar

Descarga [JARVIS-Android-prueba.apk](../downloads/JARVIS-Android-prueba.apk) en tu teléfono, ábrelo y permite la instalación desde ese navegador/gestor de archivos. Es una compilación de prueba firmada, no una publicación en Google Play. Para actualizarla sin desinstalar necesitas conservar la misma clave de firma. Las claves no se publican en el repositorio.

Si el navegador no descarga el APK directamente, descarga el [ZIP con el mismo APK](../downloads/JARVIS-Android-prueba.zip), extráelo en el teléfono y abre el archivo `.apk`.

Abre JARVIS y entra. En **Permisos** puedes habilitar:

- **Micrófono** para dictado y activación «JARVIS» con la aplicación abierta.
- **Permitir avisos de recordatorios** para que Android muestre los recordatorios.
- **Alarmas y recordatorios a la hora exacta** para avisos puntuales. Si no lo permites, Android programa avisos aproximados y JARVIS lo indica.
- **Leer mis notificaciones** para responder cuando lo solicites. Algunos Android restringen este permiso para aplicaciones instaladas desde un archivo: en Ajustes → Aplicaciones → JARVIS → menú de tres puntos puede ser necesario **Permitir ajustes restringidos** antes de habilitarlo.

Pulsa **Activar «JARVIS»** y prueba:

- «JARVIS, qué hora es»: consulta la hora y zona del teléfono.
- «JARVIS, qué notificaciones tengo»: lee hasta cinco notificaciones visibles de otras aplicaciones. No puede acceder a notificaciones ocultas o que Android no entregue.
- «JARVIS, hazme un recordatorio mañana a las 9 sobre tomar agua»: guarda el pendiente en tu base de datos y sincroniza su aviso en el teléfono.

En Android las peticiones de ese modo de voz se envían al terminar de hablar; el dictado manual con 🎤 permite revisar antes de enviar. Se requiere activar la escucha cada vez que vuelvas a la aplicación. No escucha con la pantalla bloqueada o en segundo plano. Android puede interrumpir la escucha si su servicio no está disponible. Instala una voz española en los ajustes de síntesis de voz si no hay ninguna voz local disponible.

Las horas de los recordatorios se interpretan en **America/Guayaquil (UTC−5)** y se muestran al confirmar. Cuando solo indicas una hora se elige su próxima ocurrencia; si faltan datos se abre el formulario. No admite recordatorios recurrentes.

## Avisos y privacidad

Los recordatorios se sincronizan al cargar/actualizar pendientes, al crearlos y al editarlos desde esta app. Los cambios hechos en otro equipo necesitan abrir o actualizar JARVIS en el teléfono; no hay sincronización push. Una vez programado, el aviso puede aparecer con la app cerrada y sin Internet. Los avisos futuros se restauran tras reiniciar Android. Si fuerzas la detención de JARVIS o revocas permisos, vuelve a abrirla y revisa los permisos. Android y el fabricante pueden retrasar o bloquear avisos; comprueba un recordatorio corto en tu dispositivo antes de depender de ellos.

Las notificaciones se consultan bajo demanda en el teléfono: no se guardan en el historial ni se envían al servidor o a ElevenLabs para leerlas. Se usa una voz local instalada; si falta, se muestra el texto. El servicio de reconocimiento de voz de Android puede enviar el audio al proveedor correspondiente. La voz personalizada de ElevenLabs sigue disponible para las demás respuestas; requiere su configuración independiente.

Se rechaza tráfico HTTP, errores TLS y navegación interna a otros dominios. Los enlaces HTTPS externos se abren en el navegador sin el puente nativo. Los documentos se guardan mediante el selector de archivos de Android, sin solicitar acceso general al almacenamiento. No hay telemetría propia ni almacenamiento de la contraseña en preferencias.

## Compilar

Abre esta carpeta en Android Studio o instala JDK 21, Android SDK 35 y Build Tools 35.0.0. Configura `ANDROID_HOME` o un `local.properties` local con `sdk.dir=...`. No publiques ese archivo ni claves de firma.

```sh
cd android
./gradlew --no-daemon assembleDebug lintDebug
```

En Windows usa `gradlew.bat`. El APK sale en `app/build/outputs/apk/debug/app-debug.apk`. También puedes usar GitHub → Actions → **Android APK** → Run workflow y descargar el artefacto del resultado. Cada nueva máquina genera su propia firma de prueba: para una distribución estable configura una clave de lanzamiento privada y consérvala.

Las comprobaciones realizadas son compilación, análisis Android Lint y pruebas de integración web con el puente Android simulado (hora, privacidad de notificaciones, voz y recordatorios). La entrega de avisos reales, el reconocimiento con micrófono y los permisos deben probarse en un teléfono Android; no se han verificado con un teléfono físico.
