# JARVIS para Android

Aplicación para Android 8.0 o posterior, conectada a `https://jarvis-privado-rmkm.onrender.com`. La versión 1.1.1 corrige la activación después de conceder permisos y muestra el estado del servicio. Incorpora un modo opcional para oír «JARVIS» desde otras aplicaciones, mediante un servicio de micrófono en primer plano de Android. No accede a las notificaciones de otras aplicaciones.

## Instalar

Descarga el [APK de prueba](../downloads/JARVIS-Android-prueba.apk) o el [ZIP](../downloads/JARVIS-Android-prueba.zip), extráelo y abre el APK en tu teléfono. Usa tu usuario y contraseña habituales. El servidor debe tener desplegada la misma versión web del repositorio.

Es una distribución de prueba fuera de Google Play. El APK entregado está firmado y no permite depuración, pero no ha pasado una revisión de Google Play. Mantiene el identificador y la firma de las versiones anteriores compiladas en este entorno. Si Play Protect bloquea la instalación, utiliza la web instalable mientras se gestiona una revisión oficial; no es necesario desactivar Play Protect. La compilación desde otra máquina usa otra clave de prueba, salvo que configures tu propia firma.

En **Permisos** puedes habilitar micrófono, avisos de recordatorios y alarmas exactas, o instalar una voz en español. Las respuestas habladas vienen activadas y puedes cambiar esa preferencia. Las notificaciones de recordatorios y la notificación de escucha son notificaciones de JARVIS; no requieren leer mensajes de otras apps.

## Escuchar fuera de la aplicación

1. Entra a JARVIS y pulsa **Activar JARVIS** en la barra superior de Android.
2. Pulsa **Activar** en el aviso y permite micrófono y notificaciones si Android los solicita. La activación continúa automáticamente después de cada permiso. Este modo requiere que su notificación esté habilitada.
3. Si falta el acceso privado, introdúcelo en el teléfono. Espera hasta ver **Escucha fuera de la app: ESCUCHANDO** y la notificación de JARVIS. **INACTIVO**, **PERMISO PENDIENTE**, **ACCESO PENDIENTE**, **PREPARANDO**, **PAUSADO** y **ERROR** indican que todavía no está escuchando el nombre; la línea inferior explica el siguiente paso. Se guarda cifrado con una clave de Android Keystore para que el servicio pueda consultar tu servidor sin mantener la pantalla abierta.
4. Puedes cambiar a otra aplicación. La notificación de escucha muestra **Pausar**, **Retomar** o **Apagar**. El botón superior cambia a **Apagar JARVIS** y también permite apagarlo.

Funcionamiento:

- Mientras espera, ignora las frases que no contienen la palabra «JARVIS».
- Al oír el nombre dice **«Sí, dígame, señor.»** y espera tu petición.
- Los **cuatro segundos** cuentan desde que el reconocedor está listo para captar la petición. Si no empiezas a hablar dentro del plazo, vuelve a esperar el nombre **sin despedida ni voz adicional de JARVIS**. Los tonos propios del reconocedor dependen del motor de Android.
- Si empiezas dentro del plazo, permite terminar la frase, con un límite de 30 segundos. También acepta «JARVIS, qué hora es» en una frase.
- Contesta con una voz española instalada en el teléfono y vuelve a esperar el nombre. El modo de segundo plano utiliza voz local; la voz personalizada de ElevenLabs sigue disponible en la interfaz web, con su configuración independiente.

Prueba «JARVIS» → «Qué hora es», o «JARVIS, hazme un recordatorio mañana a las 9 sobre tomar agua». La hora se consulta en el teléfono. Las demás peticiones se envían a la API privada de JARVIS; los recordatorios guardados se sincronizan con los avisos de Android. Su zona horaria sigue siendo **America/Guayaquil (UTC−5)**. No admite recordatorios recurrentes.

El silencio no significa que el teléfono haya apagado el micrófono: para volver a detectar el nombre tiene que seguir escuchando. Este modo puede consumir batería y datos. El reconocedor de Android puede enviar audio a su proveedor incluso antes de oír «JARVIS»; no es un detector de palabra local propio ni un sistema de bajo consumo como el de un asistente integrado del fabricante.

## Cámara, grabadoras y llamadas

**Antes de grabar un vídeo o un audio, pulsa Pausar o Apagar en la notificación de JARVIS.** La pausa destruye su reconocedor y detiene su voz; **Retomar** es manual. Al detectar otra grabación, audio silenciado por Android, un conflicto del reconocedor o pérdida de foco de audio, el servicio también se pausa sin reactivarse solo.

La detección depende de lo que Android y el proveedor de reconocimiento expongan. No garantiza que una cámara o grabadora pueda empezar con audio mientras JARVIS tenga el micrófono activo. Comprueba un vídeo corto con sonido en tu teléfono; no se ha probado con un Android físico en este entorno.

Al forzar la detención, reiniciar el teléfono o morir el proceso, la escucha no se inicia automáticamente: vuelve a abrir JARVIS y actívala. Algunos fabricantes y servicios de voz pueden detenerla antes. No se garantiza disponibilidad continua con pantalla bloqueada ni frente a restricciones de batería del equipo.

## Modo de la pantalla, datos y privacidad

En esta versión Android hay un único control de activación por nombre, en la barra superior nativa. El botón de activación solo dentro de la web se oculta para evitar confundir los dos modos. El dictado manual 🎤 sigue disponible cuando el servicio está apagado. Mientras el servicio está activo, el dictado de la pantalla se deshabilita para evitar dos reconocedores simultáneos. La web abierta en un navegador conserva su propio modo de activación, que no funciona fuera de ese navegador.

Si no aparece la notificación, comprueba la línea **Escucha fuera de la app**: la aplicación ahora mantiene el motivo del fallo visible, incluso cuando Android rechaza el inicio. Si deniegas un permiso, la activación se cancela sin insistir ni entrar en un bucle de solicitudes. Puedes volver a activarla manualmente tras corregir el permiso. La versión se identifica como **1.1.1**, código 5. No incorpora el modelo propietario de Amazon Alexa: sigue utilizando el reconocedor de voz de Android para detectar el nombre y para dictar.

La contraseña cifrada se guarda únicamente al activar el modo de segundo plano. Se cifra con AES-GCM y una clave no exportable de Android Keystore, sin incluir valores en el APK ni en registros. Usa **Permisos → Olvidar acceso del modo Fuera de app** para detener el servicio y eliminar ese acceso guardado; eso no equivale a cerrar todas las sesiones web. Las copias de seguridad de datos de la aplicación están excluidas.

El servicio conserva solo el contexto reciente en memoria y lo pierde al apagarse. No almacena ni envía transcripciones ambientales que no incluyan el nombre como mensajes de chat; el proveedor de reconocimiento puede procesar el audio mientras escucha. Al pronunciar una petición, esta sí se envía al servidor privado para responder. La conexión usa HTTPS, autenticación privada y no sigue redirecciones. No hay acceso a SMS ni lectura de notificaciones ajenas.

Los recordatorios se sincronizan al abrir/actualizar pendientes, al modificarlos en la app y después de órdenes de agenda ejecutadas por el servicio. Los cambios de otro equipo necesitan actualizar JARVIS en el teléfono; no hay sincronización push. Los avisos futuros se restauran tras reiniciar Android, independientemente de la escucha. Android necesita permisos de notificaciones y alarmas para mostrarlos con la precisión correspondiente.

## Compilar y comprobar

Instala JDK 21, Android SDK 35 y Build Tools 35.0.0. Configura `ANDROID_HOME` o `local.properties` con `sdk.dir=...`. En el entorno de nube se puede usar `python3 scripts/setup-android-cloud.py` desde la raíz del repositorio.

```sh
cd android
./gradlew --no-daemon assembleRelease lintRelease testDebugUnitTest
```

En Windows usa `gradlew.bat`. El archivo entregable sale en `app/build/outputs/apk/release/app-release.apk`. El tipo `release` usa la clave de prueba local (`signingConfigs.debug`) para conservar la firma de las entregas de este entorno, pero `debuggable` está desactivado. Conserva esa clave privada fuera de Git para futuras actualizaciones y configura una firma de lanzamiento propia para distribuir formalmente. GitHub Actions → **Android APK** compila y publica un artefacto descargable.

Las siete pruebas JVM verifican nombre obligatorio, espera de cuatro segundos, inicio de voz dentro del plazo, rechazo de eventos tras pausa/apagado y continuación de la activación tras micrófono/notificaciones/acceso, sin arranques duplicados ni bucles tras denegar permisos. Además se ejecutan Android Lint y pruebas web con puente Android simulado. Compilar y simular no verifica permisos, micrófono, voz, grabación simultánea ni continuidad del servicio en un teléfono real.
