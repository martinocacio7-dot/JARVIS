# JARVIS para Android

Aplicación para Android 8.0 o posterior, conectada a `https://jarvis-privado-rmkm.onrender.com`. La versión 1.2.0 sustituye la escucha repetitiva de Android por el detector local Porcupine 4.0.2 con el modelo integrado JARVIS. Requiere una AccessKey propia de Picovoice; no incluye ninguna. Incorpora un modo opcional para oír «JARVIS» desde otras aplicaciones, mediante un servicio de micrófono en primer plano de Android. No accede a las notificaciones de otras aplicaciones.

## Instalar

Descarga el [APK de prueba](../downloads/JARVIS-Android-prueba.apk) o el [ZIP](../downloads/JARVIS-Android-prueba.zip), extráelo y abre el APK en tu teléfono. Usa tu usuario y contraseña habituales. El servidor debe tener desplegada la misma versión web del repositorio.

Es una distribución de prueba fuera de Google Play. El APK entregado está firmado y no permite depuración, pero no ha pasado una revisión de Google Play. Mantiene el identificador y la firma de las versiones anteriores compiladas en este entorno. Si Play Protect bloquea la instalación, utiliza la web instalable mientras se gestiona una revisión oficial; no es necesario desactivar Play Protect. La compilación desde otra máquina usa otra clave de prueba, salvo que configures tu propia firma.

En **Permisos** puedes habilitar micrófono, avisos de recordatorios y alarmas exactas, o instalar una voz en español. Las respuestas habladas vienen activadas y puedes cambiar esa preferencia. Las notificaciones de recordatorios y la notificación de escucha son notificaciones de JARVIS; no requieren leer mensajes de otras apps.

## Escuchar fuera de la aplicación

1. Entra a JARVIS y pulsa **Activar JARVIS** en la barra superior de Android.
2. Pulsa **Activar** en el aviso y permite micrófono y notificaciones si Android los solicita. La activación continúa automáticamente después de cada permiso. Este modo requiere que su notificación esté habilitada.
3. Si falta el acceso privado, introdúcelo en el teléfono. Tras completar también la clave del paso siguiente, espera hasta ver **Escucha fuera de la app: ESCUCHANDO** y la notificación de JARVIS. **INACTIVO**, **PERMISO PENDIENTE**, **ACCESO PENDIENTE**, **PREPARANDO**, **PAUSADO** y **ERROR** indican que todavía no está escuchando el nombre; la línea inferior explica el siguiente paso. Se guarda cifrado con una clave de Android Keystore para que el servicio pueda consultar tu servidor sin mantener la pantalla abierta.
4. Configura tu AccessKey de [Picovoice Console](https://console.picovoice.ai/) cuando se solicite, o en **Permisos → Detector local · clave de Picovoice**. La clave se guarda cifrada solo en el teléfono. Su validez, cuotas, licencia y posible coste dependen de Picovoice. Sin clave o si falla la licencia, no se inicia la escucha ni se usa un bucle de reconocimiento como alternativa; el micrófono manual sigue disponible.
5. Puedes cambiar a otra aplicación. La notificación de escucha muestra **Pausar**, **Retomar** o **Apagar**. El botón superior cambia a **Apagar JARVIS** y también permite apagarlo.

Funcionamiento:

- Mientras espera, ignora las frases que no contienen la palabra «JARVIS».
- Al oír el nombre dice **«Sí, dígame, señor.»** y espera tu petición.
- Los **cuatro segundos** cuentan desde que el reconocedor está listo para captar la petición. Si no empiezas a hablar dentro del plazo, vuelve a esperar el nombre **sin despedida ni voz adicional de JARVIS**. Los tonos propios del reconocedor dependen del motor de Android.
- Si empiezas dentro del plazo, permite terminar la frase, con un límite de 30 segundos. Espera el saludo antes de dar la petición: el detector solo entrega la activación, no conserva las palabras dichas junto al nombre.
- Contesta con una voz española instalada en el teléfono y vuelve a esperar el nombre. El modo de segundo plano utiliza voz local; la voz personalizada de ElevenLabs sigue disponible en la interfaz web, con su configuración independiente.

Prueba «JARVIS» → espera el saludo → «Qué hora es», o «Hazme un recordatorio mañana a las 9 sobre tomar agua». La hora se consulta en el teléfono. Las demás peticiones se envían a la API privada de JARVIS; los recordatorios guardados se sincronizan con los avisos de Android. Su zona horaria sigue siendo **America/Guayaquil (UTC−5)**. No admite recordatorios recurrentes.

El silencio no significa que el teléfono haya apagado el micrófono: para volver a detectar el nombre tiene que seguir escuchando. Este modo consume batería y mantiene un AudioRecord activo mientras espera el nombre. Porcupine procesa ese audio localmente y puede necesitar Internet para validar su licencia. Solo después del saludo se abre una sesión de dictado Android, que sí puede enviar la petición a su proveedor. El silencio durante la espera del nombre no reinicia el reconocedor Android: no se abre hasta detectar la palabra. El dictado posterior puede emitir sus tonos normales al iniciar y terminar. El modelo JARVIS integrado es inglés: la precisión con distintas pronunciaciones españolas requiere comprobarse en el teléfono. No es el modelo de Amazon Alexa.

## Cámara, grabadoras y llamadas

**Antes de grabar un vídeo o un audio, pulsa Pausar o Apagar en la notificación de JARVIS.** La pausa detiene el detector, destruye el reconocedor de peticiones y detiene su voz; **Retomar** es manual. Al detectar otra grabación, audio silenciado por Android, un conflicto del reconocedor o pérdida de foco de audio, el servicio también se pausa sin reactivarse solo.

La detección depende de lo que Android y el proveedor de reconocimiento expongan. No garantiza que una cámara o grabadora pueda empezar con audio mientras JARVIS tenga el micrófono activo. Comprueba un vídeo corto con sonido en tu teléfono; no se ha probado con un Android físico en este entorno.

Al forzar la detención, reiniciar el teléfono o morir el proceso, la escucha no se inicia automáticamente: vuelve a abrir JARVIS y actívala. Algunos fabricantes y servicios de voz pueden detenerla antes. No se garantiza disponibilidad continua con pantalla bloqueada ni frente a restricciones de batería del equipo.

## Modo de la pantalla, datos y privacidad

En esta versión Android hay un único control de activación por nombre, en la barra superior nativa. El botón de activación solo dentro de la web se oculta para evitar confundir los dos modos. El dictado manual 🎤 sigue disponible cuando el servicio está apagado. Mientras el servicio está activo, el dictado de la pantalla se deshabilita para evitar dos reconocedores simultáneos. La web abierta en un navegador conserva su propio modo de activación, que no funciona fuera de ese navegador.

Si no aparece la notificación, comprueba la línea **Escucha fuera de la app**: la aplicación ahora mantiene el motivo del fallo visible, incluso cuando Android rechaza el inicio. Si deniegas un permiso, la activación se cancela sin insistir ni entrar en un bucle de solicitudes. Puedes volver a activarla manualmente tras corregir el permiso. La versión se identifica como **1.2.0**, código 7. Usa Porcupine para el nombre y Android para la petición. No incorpora el modelo propietario de Amazon Alexa.

La contraseña cifrada se guarda únicamente al activar el modo de segundo plano. Se cifra con AES-GCM y una clave no exportable de Android Keystore, sin incluir valores en el APK ni en registros. Usa **Permisos → Olvidar acceso del modo Fuera de app** para detener el servicio y eliminar ese acceso guardado; eso no equivale a cerrar todas las sesiones web. Las copias de seguridad de datos de la aplicación están excluidas.

El servicio conserva solo el contexto reciente en memoria y lo pierde al apagarse. No almacena ni envía transcripciones ambientales que no incluyan el nombre como mensajes de chat; el proveedor de dictado puede procesar el audio de la petición después del saludo. Al pronunciar una petición, esta sí se envía al servidor privado para responder. La conexión usa HTTPS, autenticación privada y no sigue redirecciones. No hay acceso a SMS ni lectura de notificaciones ajenas.

Los recordatorios se sincronizan al abrir/actualizar pendientes, al modificarlos en la app y después de órdenes de agenda ejecutadas por el servicio. Los cambios de otro equipo necesitan actualizar JARVIS en el teléfono; no hay sincronización push. Los avisos futuros se restauran tras reiniciar Android, independientemente de la escucha. Android necesita permisos de notificaciones y alarmas para mostrarlos con la precisión correspondiente.

## Compilar y comprobar

Instala JDK 21, Android SDK 35 y Build Tools 35.0.0. Configura `ANDROID_HOME` o `local.properties` con `sdk.dir=...`. En el entorno de nube se puede usar `python3 scripts/setup-android-cloud.py` desde la raíz del repositorio.

```sh
cd android
./gradlew --no-daemon assembleRelease lintRelease testDebugUnitTest
```

En Windows usa `gradlew.bat`. El archivo entregable sale en `app/build/outputs/apk/release/app-release.apk`. El tipo `release` usa la clave de prueba local (`signingConfigs.debug`) para conservar la firma de las entregas de este entorno, pero `debuggable` está desactivado. Conserva esa clave privada fuera de Git para futuras actualizaciones y configura una firma de lanzamiento propia para distribuir formalmente. GitHub Actions → **Android APK** compila y publica un artefacto descargable.

Las once pruebas JVM verifican la separación entre captura local del nombre y dictado, ausencia de temporizador de reinicio durante el silencio de espera, pausa por cámara/llamadas/silenciamiento, nombre obligatorio, espera de cuatro segundos, inicio de voz dentro del plazo, rechazo de eventos tras pausa/apagado y continuación de la activación tras micrófono/notificaciones/acceso, sin arranques duplicados ni bucles tras denegar permisos. Además se ejecutan Android Lint y pruebas web con puente Android simulado. Compilar y simular no verifica permisos, micrófono, voz, grabación simultánea ni continuidad del servicio en un teléfono real.

## Detección de grabación (1.1.2)

La fuente MIC por sí sola no identifica otra app: también puede ser el proveedor de reconocimiento. La escucha activa se pausa ante CAMCORDER, VOICE_COMMUNICATION, pérdida de foco o captura silenciada por Android. Antes de iniciar la captura se comprueba si hay grabaciones activas. Android puede ocultar o anonimizar la identidad de otros clientes; no se garantiza detectar todas las cámaras o grabadoras. Pausa JARVIS desde la notificación antes de grabar vídeos. La pausa no se reanuda automáticamente.

La nueva esfera refleja el estado real del servicio (incluido PAUSADO); el botón «Retomar escucha» usa el mismo servicio sin crear otro reconocedor. En navegador activa la escucha con la página abierta. La animación respeta la preferencia de movimiento reducido y no carga recursos externos.

## Dependencia y comprobación en dispositivo (1.2.0)

Porcupine y su procesador de audio se resuelven desde Maven Central; la versión directa está fijada en Gradle. El APK incluye el modelo JARVIS, parámetros y bibliotecas nativas para arm64-v8a, armeabi-v7a, x86 y x86_64. Se adjunta la licencia y atribución en assets/licenses. El SDK necesita una cuenta/AccessKey de Picovoice y sus condiciones de uso; no se ha proporcionado ninguna clave en este entorno. No se realizaron llamadas autenticadas ni pruebas de precisión acústica reales.

Para validar en un teléfono: configura la clave, activa JARVIS y espera ESCUCHANDO; permanece 30 segundos en silencio (no debe abrir sesiones de dictado repetitivas); di JARVIS, espera el saludo y pide la hora; repite dejando pasar cuatro segundos sin pedir nada; pausa y comprueba que no responde; prueba fuera de la app, con pantalla bloqueada y tras terminar una llamada. Antes de probar la cámara, pausa JARVIS y verifica que el vídeo tiene sonido. Si falta o falla la clave, debe verse un aviso y el dictado manual debe seguir disponible con el servicio apagado. Las restricciones de batería del fabricante siguen aplicándose.
