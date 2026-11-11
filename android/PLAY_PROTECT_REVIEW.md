# Revisión de instalación: JARVIS Android 2.2.0

La captura anterior del dispositivo mostró un bloqueo genérico de Play Protect por posible acceso a datos sensibles. No identificaba la regla exacta ni el hash del APK. No se ha realizado una comprobación física de Play Protect con 2.2.0.

La versión 2.2.0 (versionCode 21) se distribuye en dos ediciones funcionales con la misma identidad `com.miguel.jarvis`, la misma firma de prueba y datos compatibles:

- `downloads/JARVIS-Android-prueba.apk`: incluye lector opcional mediante NotificationListenerService. Requiere autorización manual del usuario en Android. Cuenta avisos y, solo al pedirlo, puede leer título/texto de hasta tres notificaciones recientes. No lee automáticamente avisos entrantes ni envía respuestas. Ese acceso es sensible y puede bloquearse al instalar; se debe justificar en una revisión.
- `downloads/JARVIS-Android-sin-lector.apk`: no declara el servicio ni su permiso de binding; tampoco contiene su implementación de lectura. No puede leer notificaciones de otras apps. Conserva las notificaciones propias de recordatorios y del servicio de micrófono.

Ninguna edición solicita SMS, accesibilidad o superposición. Ambas solicitan INTERNET para la búsqueda explícita y opcional de Google. Ambas incluyen chat nativo y motor propio, memoria, micrófono explícitamente activado, síntesis española local, recordatorios y apertura de apps mediante intents. El servicio de reproducción foreground se usa para leer un aviso programado sin abrir un micrófono y puede ser rechazado por las reglas de segundo plano; entonces permanece la notificación. El reinicio restaura avisos pendientes, no la escucha. No se renombra el paquete, cambia la identidad ni se ocultan componentes para evitar una clasificación.

Los contenidos del lector se procesan localmente y se excluyen del historial persistente. La autorización permite a Android conceder un acceso más amplio del que este lector utiliza; la interfaz lo explica y permite abrir los ajustes para retirarlo. La app no puede concederse ese acceso ni omitir restricciones del sistema.

Si se bloquea un APK exacto, conserva el aviso y presenta su archivo/URL, versión y SHA-256 al formulario oficial:

https://support.google.com/googleplay/android-developer/contact/protectappeals

No se ha enviado ningún APK a Google ni solicitado esa revisión desde esta tarea. Mantén Play Protect activo. Las pruebas, firma y auditoría de permisos no equivalen a aprobación de Google ni a una auditoría independiente de seguridad. Las huellas están en el `.apk.sha256` correspondiente a cada edición; los ZIP contienen esos mismos APK. Verifica cuál archivo estás revisando, porque los permisos y hashes son distintos.

Desde 2.2.0 ambas ediciones declaran INTERNET para consultas explícitas de Google configuradas por el usuario. No envían audio, notificaciones ni historial a esa API. La edición sin lector sigue excluyendo de verdad el servicio de notificaciones ajenas; INTERNET no desaparece al retirar el lector. Las claves no están incluidas en los instaladores.
