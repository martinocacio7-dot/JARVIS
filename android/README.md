# JARVIS para Android · 1.3.0

Aplicación para Android 8.0 o posterior, con CPU ARM de 32 o 64 bits, conectada a https://jarvis-privado-rmkm.onrender.com. Esta entrega no incluye bibliotecas x86 de emulador.

La activación por «JARVIS» usa **Vosk 0.3.75 y el modelo español vosk-model-small-es-0.42**. No requiere Picovoice, AccessKey, cuenta externa ni validación de licencia por Internet. El APK incluye el modelo: no lo descarga el teléfono. La actualización elimina las preferencias y la clave Keystore usadas para la AccessKey antigua.

## Instalar y activar

1. Descarga el [APK](../downloads/JARVIS-Android-prueba.apk) o el [ZIP](../downloads/JARVIS-Android-prueba.zip), extrae el APK e instálalo. Mantiene la misma firma de prueba local.
2. Entra con tu usuario y contraseña de JARVIS. Comprueba **JARVIS 1.3.0** en la barra nativa; la interfaz web puede actualizarse sin actualizar el APK.
3. Pulsa **Activar JARVIS** o **Hablar con JARVIS**. Acepta la activación y los permisos de micrófono y notificaciones. El acceso privado se guarda cifrado para consultar tu servidor desde el servicio.
4. Espera **ESCUCHANDO**. La primera activación verifica y prepara unos 58 MiB de archivos privados. Puede tardar varios segundos; la preparación tiene un límite de 45 segundos.
5. Di **«JARVIS»**, espera **«Sí, dígame, señor.»** y después da tu petición. No se conservan las palabras dichas junto al nombre.
6. La notificación permite **Pausar**, **Retomar** y **Apagar**. La esfera refleja el estado real, incluido PAUSADO.

Es una distribución de prueba fuera de Google Play, firmada y sin depuración. Si Play Protect bloquea su instalación, utiliza la web mientras se gestiona una revisión formal; no desactives Play Protect. Otra máquina usa otra firma salvo que configures la misma clave.

## Micrófono y peticiones

Mientras espera el nombre, un AudioRecord alimenta continuamente al modelo local. **No se abre SpeechRecognizer de Android para esperar «JARVIS»**, ni se reinicia la captura por silencio. El indicador del micrófono es normal durante la escucha. Los segmentos ambientales se descartan tras procesarlos: no se guardan grabaciones o transcripciones ni se envían al servidor.

El vocabulario incluye el nombre, distractores y [unk]. Solo la palabra final exacta jarvis con confianza acústica >= 0.85 activa el asistente. Las hipótesis parciales no activan nada. Esta puntuación no es una probabilidad calibrada.

Tras detectar el nombre se libera la captura local antes del saludo y se abre **una sesión** de dictado Android, que puede enviar audio al proveedor, necesitar Internet y emitir sus tonos normales. Los cuatro segundos solo limitan la espera para empezar la petición; si empiezas a tiempo, hay hasta 30 segundos para terminar. El silencio vuelve al detector local sin despedida ni un bucle de sesiones de dictado.

La hora se consulta en el teléfono. Las demás peticiones se envían por HTTPS con autenticación al servidor privado, sin seguir redirecciones. El servicio responde con una voz española local instalada. La voz de ElevenLabs de la interfaz web conserva su configuración independiente.

## Vídeos y segundo plano

**Pausa o apaga JARVIS antes de grabar vídeo o audio.** Se mantiene la pausa ante cámara, llamadas, captura silenciada por Android y pérdida de foco de audio. No se garantiza detectar todos los usos externos del micrófono; comprueba un vídeo corto con sonido después de pausarlo.

Después de cerrar una captura propia se permiten hasta tres segundos para que Android la libere, sin abrir otra captura ni consumir el plazo para dictar. Si sigue ocupada, se pausa con un motivo explícito. Retomar es manual.

El servicio conserva su notificación fuera de la app y consume batería y CPU. Vosk es mayor y más pesado que un detector integrado del fabricante. Las restricciones del teléfono pueden detenerlo, especialmente con pantalla bloqueada. No se promete la continuidad de Alexa.

Al forzar la detención, reiniciar el teléfono o morir el proceso no se reactiva el micrófono: abre JARVIS y actívalo. Los recordatorios futuros sí se restauran tras reiniciar Android, independientemente de la escucha.

## Privacidad y diagnóstico

No se solicitan SMS ni acceso a notificaciones ajenas. El micrófono manual sigue disponible con el servicio apagado; mientras lo controla el servicio se deshabilita para evitar dos capturas. El modo de voz del navegador es distinto y no funciona fuera de su pestaña.

**Permisos → Detector local · sin cuenta** explica el motor. **Copiar diagnóstico de voz** copia versión, fabricante/modelo, Android y los últimos doce estados. No incluye claves, conversaciones ni audio y no se envía automáticamente. Pégalo si falla.

El acceso privado del servidor se cifra con AES-GCM y una clave no exportable de Android Keystore. **Olvidar acceso del modo Fuera de app** detiene el servicio y elimina ese acceso guardado; no cierra todas las sesiones web. Las copias de seguridad están excluidas. El modelo público se prepara en el directorio privado sin backup y se verifica con SHA-256.

## Compilar

Instala JDK 21, Android SDK/Build Tools 35 y Python 3.8 o posterior. Configura ANDROID_HOME o android/local.properties. En la nube puede usarse scripts/setup-android-cloud.py.

~~~sh
cd android
./gradlew --no-daemon assembleRelease lintRelease testDebugUnitTest
~~~

En Windows usa gradlew.bat y configura JARVIS_PYTHON con tu ejecutable Python si no existe python3. El APK sale en app/build/outputs/apk/release/app-release.apk. Conserva fuera de Git la clave local de firma; para distribución formal usa una clave de lanzamiento propia.

Gradle ejecuta scripts/prepare-wake-model.py, descarga una revisión fijada y comprueba el archivo y cada fichero del modelo antes de generar assets en build. Origen, espejo, revisión y hashes están en [wake-model.json](wake-model.json). El host original no estuvo disponible; se usó un espejo GitHub y su árbol de archivos coincidió exactamente con un segundo espejo independiente. No se ejecuta código de las aplicaciones de esos espejos.

El modelo y la caché no se añaden a Git. La caché queda en android/.gradle/wake-model; CI descarga los mismos datos verificados. El teléfono recibe todo en el APK. Las bibliotecas ARM se comprimen y Android las extrae al instalar. Reserva al menos unos 150 MB libres.

## Verificación y límites

Las 16 pruebas JVM cubren separación entre nombre y dictado, espera de cuatro segundos, ausencia de vencimiento durante una hora simulada esperando el nombre, pausa/apagado, transición limitada del micrófono, permisos y aceptación del nombre/confianza. También se ejecutan Android Lint y pruebas web con puente simulado.

[wake-evaluation.json](wake-evaluation.json) registra ensayos con voces sintéticas eSpeak: 9/9 activaciones y 0/36 falsas activaciones en la primera tanda; la adicional obtuvo 8/9 y 1/36. Con las dos voces españolas, ambas tandas detectaron las 12 activaciones sin disparar con las 48 frases negativas. La falsa activación adicional fue «Harvey» con voz inglesa. No se ajustaron umbral o vocabulario a esa tanda adicional.

Estas cifras **no miden precisión real en teléfonos**. Las pruebas acústicas usan Python Vosk 0.3.45; el APK incluye Android Vosk 0.3.75. No se probó micrófono físico, ruido, batería ni pronunciación del usuario. Para reproducir usa Python 3.12 con vosk==0.3.45 y espeakng-loader:

~~~sh
python scripts/evaluate-wake-model.py --model /ruta/al/modelo --output resultado.json
python scripts/evaluate-wake-model.py --model /ruta/al/modelo --output adicional.json --extended
~~~

Valida en el teléfono: 30 segundos en silencio, «JARVIS» → saludo → hora, silencio tras el saludo, pausa manual, otra app y pantalla bloqueada. Prueba la cámara con JARVIS pausado. Puede fallar o activarse por palabras parecidas; no es el modelo de Amazon Alexa ni añade inteligencia generativa al chat.
