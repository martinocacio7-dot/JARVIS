# Revisión de instalación: JARVIS Android 2.0.1

La captura del dispositivo muestra «Se bloqueó la app para proteger tu dispositivo» por posible acceso a datos sensibles. No contiene la regla exacta, el hash del APK ni una certificación de malware. No se ha realizado una comprobación física de Play Protect con 2.0.1.

Esta edición retira funcionalidades y permisos reales: no hay NotificationListenerService, acceso a notificaciones ajenas, SMS, accesibilidad, WebView ni solicitudes HTTP a Render. Mantiene chat nativo, conocimiento incluido, micrófono activado por el usuario, síntesis local, recordatorios y apertura de otras apps mediante intents. Permanece la identidad `com.miguel.jarvis`, con versionCode 18 y la misma firma de prueba de la edición anterior. No se modifica la identidad ni se ofuscan componentes para eludir el bloqueo.

Los permisos de micrófono, notificaciones propias, alarmas exactas, servicio de micrófono, bloqueo parcial de CPU y restauración de avisos deben explicarse con sus funciones al enviar una revisión. El APK no enciende el micrófono al reiniciar. La reducción de permisos y las pruebas automatizadas no garantizan la aceptación por Google ni sustituyen una auditoría de seguridad independiente.

Si vuelve a bloquearse el APK exacto de 2.0.1, conserva el aviso completo y presenta el archivo/URL y su SHA-256 al formulario oficial de revisión de Play Protect:

https://support.google.com/googleplay/android-developer/contact/protectappeals

No se ha enviado el APK a Google ni solicitado esa revisión desde esta tarea. No desactives Play Protect para probarlo. La huella del archivo distribuido está en `downloads/JARVIS-Android-prueba.apk.sha256`; el ZIP contiene ese mismo APK. Revisa la versión 2.0.1 y evita confundirlo con un APK antiguo reenviado por mensajería.
