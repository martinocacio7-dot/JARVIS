# JARVIS para Android · 2.2.0

**Edición principal 2.2.0:** lector opcional de notificaciones, activado únicamente desde los ajustes de Android. También se distribuye una edición sin lector con las mismas funciones de chat, apps y recordatorios. Las notas de versiones 2.0.x sin lector describen esas ediciones históricas.

Aplicación nativa para Android 8.0 o posterior, con CPU ARM de 32 o 64 bits. El lanzador abre NativeChatActivity: mensajes, esfera, clasificador y conocimiento se ejecutan en el teléfono. No abre la página de Render ni le solicita las respuestas. Esta entrega no incluye bibliotecas x86 de emulador. Las secciones de versiones 1.x describen el comportamiento histórico de la interfaz web; la sección 2.0 al final detalla el nuevo flujo.

La activación por «JARVIS» usa **Vosk 0.3.75 y el modelo español vosk-model-small-es-0.42**. No requiere Picovoice, AccessKey, cuenta externa ni validación de licencia por Internet. El APK incluye el modelo: no lo descarga el teléfono. La actualización elimina las preferencias y la clave Keystore usadas para la AccessKey antigua.

## Instalar y activar

1. Descarga el [APK](../downloads/JARVIS-Android-prueba.apk) o el [ZIP](../downloads/JARVIS-Android-prueba.zip), extrae el APK e instálalo. Mantiene la misma firma de prueba local.
2. Abre la aplicación y comprueba **JARVIS 2.2.0** y la pantalla azul del núcleo. El motor móvil no necesita iniciar sesión en Render.
3. Pulsa **Activar JARVIS** o **Hablar con JARVIS**. Acepta la activación y los permisos de micrófono y notificaciones. La activación no solicita credenciales ni conexión a tu servidor.
4. Espera **ESCUCHANDO**. La primera activación verifica y prepara unos 58 MiB de archivos privados. Puede tardar varios segundos; la preparación tiene un límite de 45 segundos.
5. Di **«JARVIS»**, espera **«Sí, dígame, señor.»** y después da tu petición. No se conservan las palabras dichas junto al nombre.
6. La notificación permite **Pausar**, **Retomar** y **Apagar**. La esfera refleja el estado real, incluido PAUSADO.

Es una distribución de prueba fuera de Google Play, firmada y sin depuración. Si Play Protect bloquea su instalación, utiliza la web mientras se gestiona una revisión formal; no desactives Play Protect. Otra máquina usa otra firma salvo que configures la misma clave.

## Micrófono y peticiones

Mientras espera el nombre, un AudioRecord alimenta continuamente al modelo local. **No se abre SpeechRecognizer de Android para esperar «JARVIS»**, ni se reinicia la captura por silencio. El indicador del micrófono es normal durante la escucha. Los segmentos ambientales se descartan tras procesarlos: no se guardan grabaciones o transcripciones ni se envían al servidor.

El vocabulario incluye el nombre, distractores y [unk]. Solo la palabra final exacta jarvis con confianza acústica >= 0.85 activa el asistente. Las hipótesis parciales no activan nada. Esta puntuación no es una probabilidad calibrada.

Tras detectar el nombre se libera la captura local antes del saludo y se abre el dictado Android, que puede enviar audio al proveedor, necesitar Internet y emitir sus tonos normales. Los cuatro segundos solo limitan la espera para empezar la petición; si empiezas a tiempo, hay hasta 30 segundos para terminar. Si el reconocedor termina antes por falta de voz, se permite un solo reintento dentro del mismo plazo original; no se reinician los cuatro segundos. El silencio vuelve al detector local sin despedida ni sesiones de dictado continuas mientras espera el nombre.

El motor 2.0 resuelve las peticiones soportadas con código y datos del teléfono. Hora, fecha y el resumen opcional de notificaciones también son locales. El servicio responde con una voz española local instalada. El dictado Android sigue siendo una dependencia separada y puede necesitar Internet. YouTube requiere su propia conexión. La configuración de voz de la web es independiente y no participa en el chat nativo.

## Vídeos y segundo plano

**Pausa o apaga JARVIS antes de grabar vídeo o audio.** Se mantiene la pausa ante cámara, llamadas, captura silenciada por Android y pérdida de foco de audio. No se garantiza detectar todos los usos externos del micrófono; comprueba un vídeo corto con sonido después de pausarlo.

Después de cerrar una captura propia se permiten hasta tres segundos para que Android la libere, sin abrir otra captura ni consumir el plazo para dictar. Si sigue ocupada, se pausa con un motivo explícito. Retomar es manual.

El servicio conserva su notificación fuera de la app y consume batería y CPU. Vosk es mayor y más pesado que un detector integrado del fabricante. Las restricciones del teléfono pueden detenerlo, especialmente con pantalla bloqueada. No se promete la continuidad de Alexa.

Al forzar la detención, reiniciar el teléfono o morir el proceso no se reactiva el micrófono: abre JARVIS y actívalo. Los recordatorios futuros sí se restauran tras reiniciar Android, independientemente de la escucha.

## Privacidad y diagnóstico

No se solicitan SMS. Desde 1.6.0 el acceso a notificaciones ajenas es opcional y se autoriza por separado para resumir cantidades por aplicación. El micrófono manual sigue disponible con el servicio apagado; mientras lo controla el servicio se deshabilita para evitar dos capturas. El modo de voz del navegador es distinto y no funciona fuera de su pestaña.

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

Las 19 pruebas JVM cubren separación entre nombre y dictado, espera de cuatro segundos, ausencia de vencimiento durante una hora simulada esperando el nombre, pausa/apagado, transición limitada del micrófono, permisos y aceptación del nombre/confianza. También se ejecutan Android Lint y pruebas web con puente simulado.

[wake-evaluation.json](wake-evaluation.json) registra ensayos con voces sintéticas eSpeak: 9/9 activaciones y 0/36 falsas activaciones en la primera tanda; la adicional obtuvo 8/9 y 1/36. Con las dos voces españolas, ambas tandas detectaron las 12 activaciones sin disparar con las 48 frases negativas. La falsa activación adicional fue «Harvey» con voz inglesa. No se ajustaron umbral o vocabulario a esa tanda adicional.

Estas cifras **no miden precisión real en teléfonos**. Las pruebas acústicas usan Python Vosk 0.3.45; el APK incluye Android Vosk 0.3.75. No se probó micrófono físico, ruido, batería ni pronunciación del usuario. Para reproducir usa Python 3.12 con vosk==0.3.45 y espeakng-loader:

~~~sh
python scripts/evaluate-wake-model.py --model /ruta/al/modelo --output resultado.json
python scripts/evaluate-wake-model.py --model /ruta/al/modelo --output adicional.json --extended
~~~

Valida en el teléfono: 30 segundos en silencio, «JARVIS» → saludo → hora, silencio tras el saludo, pausa manual, otra app y pantalla bloqueada. Prueba la cámara con JARVIS pausado. Puede fallar o activarse por palabras parecidas; no es el modelo de Amazon Alexa ni añade inteligencia generativa al chat.


## Conversación y escucha fuera de la app (1.3.1)

La secuencia es: detector local → «Sí, dígame, señor.» → preparar dictado → cuatro segundos para empezar la pregunta → responder o volver silenciosamente al detector. El saludo no consume esos cuatro segundos: empiezan cuando el reconocedor confirma que está listo. La ausencia de pregunta termina la conversación activa, no el servicio que debe seguir oyendo «JARVIS».

El servicio solicita un bloqueo parcial de CPU con duración limitada y renovación mientras está activado, incluida la preparación, el saludo, el dictado y la respuesta. Se libera al pausar o apagar. No enciende la pantalla ni arranca tras reiniciar/forzar detención; requiere activación explícita y conserva la notificación. Esta continuidad consume batería y las restricciones del fabricante pueden seguir deteniendo el proceso.

Para usarlo desde otra app: activa desde la barra superior nativa con JARVIS abierto, espera ESCUCHANDO y la notificación, luego sal con Inicio. En Permisos → Segundo plano y batería hay acceso a los ajustes de la aplicación para revisar «Sin restricciones», actividad en segundo plano o inicio automático si tu fabricante lo ofrece. La app no concede esas opciones por sí sola. Desde 1.6.0 ofrece por separado el acceso opcional a notificaciones para resumir cantidades.

Se conserva Android SpeechRecognizer para el dictado de la pregunta: una prueba exploratoria de Vosk con vocabulario libre transcribió mal varias frases sintéticas, incluida «qué hora es», y no se activó esa alternativa. El detector del nombre sí sigue siendo local. El dictado Android puede usar Internet y emitir tonos; los errores incluyen su código en el diagnóstico.

Las pruebas verifican liberación de CPU al pausar/apagar y que un reintento temprano no amplía el plazo. No se comprobó un Android físico ni el ahorro de batería de un fabricante concreto. Pausa JARVIS antes de grabar vídeos y prueba la secuencia sin grabar la pantalla.


## Cambio de audio después del saludo (1.3.2)

La pérdida de foco de audio solo pausa cuando JARVIS aún posee ese foco y está hablando. Un aviso tardío después de liberar el foco al terminar «Sí, dígame, señor.» ya no cancela el dictado de la pregunta. Se mantienen la pausa por grabación/llamada, la pausa manual y los errores explícitos del reconocedor. No se reanuda automáticamente una pausa real.

Dos pruebas JVM verifican los avisos tardíos, la conservación de los cuatro segundos y las interrupciones durante una respuesta. Esta corrección aborda una causa identificada en el código; sin el diagnóstico del teléfono no confirma la causa de cualquier estado PAUSADO. No se validó en un Android físico.


## Comprobación de grabación durante el cambio de captura (1.3.3)

El callback de grabación ya no decide una pausa usando su lista histórica: consulta las configuraciones actuales. Un indicador de captura silenciada se vuelve a comprobar tras 250 ms, o después del margen de liberación de tres segundos cuando JARVIS acaba de cerrar su propia captura. La comprobación diferida conserva la generación de la conversación y no puede reanudar una pausa. Las fuentes CAMCORDER, VOICE_COMMUNICATION y el modo de llamada siguen interrumpiendo inmediatamente; un micrófono que permanece silenciado también pausa al terminar el margen.

La prueba adicional cubre el límite del margen y que cámara/llamada nunca queden exentas. Se mantienen las pruebas de cuatro segundos y de foco. Sin diagnóstico ni teléfono físico no se puede asegurar que esta fuera la causa del dispositivo; el estado conserva un motivo explícito para distinguirlo.


## Saludo sin continuación en segundo plano (1.3.4)

Después de onStart de la voz actual se consulta isSpeaking; dos observaciones consecutivas sin reproducción permiten completar el saludo si el proveedor omite onDone. El identificador de voz invalida las comprobaciones tras pausa/apagado o nueva reproducción. No se abre la captura mientras el motor informa que sigue hablando.

En Android 12+ se prefiere SpeechRecognizer instalado en el dispositivo cuando Android declara que existe. Si devuelve un error antes de estar listo, se intenta una vez el predeterminado, excepto denegación de permiso. No instala paquetes de idiomas ni garantiza que haya español local. El predeterminado puede usar Internet. La notificación distingue preparación y micrófono listo; diez segundos sin confirmación terminan el intento y regresan al detector del nombre. Los cuatro segundos siguen empezando en onReadyForSpeech.

Las pruebas JVM cubren la confirmación de fin de voz y su paso a la ventana de cuatro segundos. La compilación y Lint no validan restricciones de fabricantes ni el servicio de reconocimiento de un teléfono físico; sigue siendo necesario comprobar la secuencia fuera de la app.


## Fecha, recordatorios y apertura de aplicaciones (1.4.0)

- «Qué día es hoy», «qué fecha es hoy» o «dime la fecha»: respuesta con día de la semana y fecha del teléfono, sin servidor. El chat web consulta America/Guayaquil.
- «Recuérdame tomar agua en cinco minutos», «pon un recordatorio para revisar el informe dentro de dos horas» o «hazme un recordatorio mañana a las nueve de la mañana sobre estudiar»: guarda en la base de datos y sincroniza las alarmas Android. Los recordatorios siguen interpretándose en America/Guayaquil y la confirmación incluye la fecha/hora. Los intervalos admitidos son de un minuto a siete días, sin repeticiones.
- «Haz un recordatorio» pide descripción y horario. «Recuérdame estudiar mañana» permite completar con «a las nueve de la mañana». Una pregunta distinta o «cancela» descarta el borrador del contexto; no borra avisos ya guardados. No se guarda un borrador sin datos completos.
- «Abre WhatsApp», «entra a Netflix» o «abre la aplicación cámara»: busca coincidencia exacta del nombre visible entre aplicaciones con icono de inicio. La consulta de visibilidad es MAIN/LAUNCHER, sin QUERY_ALL_PACKAGES. Si no encuentra una app o encuentra varias, no elige por su cuenta.

Con JARVIS visible solicita la apertura mediante un intent explícito. Desde segundo plano prepara una notificación que el usuario toca para abrirla: no solicita superposición ni intenta eludir las restricciones de lanzamiento de Android. El canal «Abrir aplicaciones» debe estar permitido. No lee datos ni controla la interfaz de otras apps. La apertura no resuelve el problema de dictado en segundo plano: todavía hace falta el diagnóstico del dispositivo para investigarlo.

Las pruebas verifican fechas en un cambio de día UTC/Guayaquil, creación real en SQLite, borradores y cancelación, selección explícita de comandos y compatibilidad con APK anteriores. La apertura física de otras apps y las alarmas requieren validación en el teléfono; las pruebas JVM no simulan PackageManager ni fabricantes Android.


## Conversación continua (1.5.0)

Activa el modo nativo y di «Jarvis» una vez. El saludo conserva los cuatro segundos iniciales; después de cada respuesta vuelve al dictado con ocho segundos para empezar el siguiente turno. El plazo comienza cuando Android confirma el micrófono listo, no mientras JARVIS está hablando. No hay captura paralela del nombre y la pregunta. El historial reciente se conserva como antes, hasta doce mensajes, sin modificar los pesos del modelo.

«Eso es todo», «gracias, eso es todo», «gracias», «hasta luego» o «termina la conversación» cierran el diálogo y vuelven al detector del nombre. También termina con silencio. Abrir otra aplicación cierra el diálogo para no interpretar su audio como continuación. La pausa por grabación, llamada o acción manual nunca reanuda el diálogo automáticamente.

Un NO_MATCH/SPEECH_TIMEOUT después de detectar voz permite pedir una repetición, como máximo una vez sin una frase válida entre medias. Si solo hay silencio no insiste. Las preguntas de aclaración semánticas provienen del modo local: conserva las aclaraciones de recordatorios y lecciones; cuando no reconoce una intención pide concretar qué necesitas. No añade generación libre ni una comprensión general comparable a una persona.

Cinco pruebas JVM verifican encadenamiento de turnos, los plazos, retorno al nombre, cierre explícito y rechazo de callbacks de continuación después de pausa/apagado. Todavía falta probar el micrófono y el proveedor de dictado del teléfono real, en especial las restricciones de segundo plano.


## Conceptos cotidianos, música y avisos (1.6.0)

El servidor explica los conceptos revisados aesthetic (también «astetic» y «aestetic»), minimalismo y vintage, con ejemplo, matiz y referencia de consulta. Es un catálogo acotado; no realiza búsquedas web en directo ni pretende responder cualquier concepto.

«Pon música de salsa» o «pon música para estudiar» preparan una búsqueda en YouTube. «Pon música» pregunta artista/género/ambiente si no hay gusto guardado; puedes contestar «de salsa». Con «recuerda que mi música favorita es salsa», una petición posterior usa ese dato. También admite las etiquetas música, género musical y artista favorito. No consulta la cuenta de YouTube ni sus recomendaciones privadas. Con JARVIS visible solicita abrir resultados en YouTube (o navegador); desde segundo plano publica una notificación para tocar. El usuario elige un resultado para reproducir: no hay garantía de reproducción automática. La apertura cierra el turno de escucha para no interpretar el audio de YouTube como una continuación.

Para «mis notificaciones» o «cuántas notificaciones tengo», abre **Permisos → Resumen de notificaciones**, lee el alcance y autoriza a JARVIS en los ajustes especiales de Android. El sistema concede un acceso amplio, pero el código solo consulta paquetes y flags de avisos activos cuando lo pides; no utiliza títulos, textos, extras ni contenidos de mensajes. Excluye JARVIS, avisos permanentes y resúmenes de grupos para no contarlos dos veces. Cuenta entradas de notificación, no mensajes sin leer, y muestra hasta diez aplicaciones en el resumen. Un permiso no concedido o un lector aún desconectado produce una explicación, nunca un número inventado. Puedes retirar el acceso en los mismos ajustes.

Los resúmenes de notificaciones se procesan y hablan localmente. No se añaden al historial del servicio enviado al servidor; los eventos de interfaz se marcan deviceOnly y se excluyen tanto de las peticiones posteriores como de localStorage. El listener no guarda una copia de notificaciones, no cancela avisos ni responde mensajes. No se solicitan accesibilidad, SMS, root ni superposición. Android no ofrece un permiso de acceso total.

La compilación, Lint, las pruebas de recuento y las pruebas de comandos/servidor no sustituyen validar autorización, notificaciones y YouTube en un teléfono real. Si Play Protect bloquea este APK de prueba, usa la web mientras se gestiona su revisión; no desactives la protección.


## Chat nativo y motor del teléfono (2.0.0)

La pantalla de inicio ya no es un WebView. NativeChatActivity presenta mensajes, compositor inferior, conversaciones guardadas y una esfera Canvas que se anima al preparar o reproducir respuestas. El servicio de activación usa OfflineAssistant: no hay transporte HTTP al servidor, credenciales ni una espera de Render. Un cambio entre Wi-Fi y datos no reinicia ni recarga el chat móvil por una navegación web. Esto no garantiza que Android conserve el proceso; las restricciones de batería y de micrófono siguen aplicándose.

El APK incorpora el modelo MLP propio y sus pesos, las definiciones cotidianas y las lecciones revisadas. MobileBrain implementa la misma extracción de características, corrección de palabras y umbrales del clasificador JavaScript; se compara su intención con fixtures generadas por el motor Node. Esta es una comprobación de paridad de implementación, no una nueva medida de inteligencia. No se entrena ni incorpora un LLM de terceros. El conocimiento instalado cambia al actualizar el APK.

Funciones locales iniciales: hora y fecha, definiciones incluidas, explicaciones y ejemplos de programación, cálculo básico con paréntesis y + − × ÷, recuerdos explícitos de hasta 50 datos, y recordatorios de una fecha/hora o intervalo. La agenda usa la zona horaria del teléfono, no UTC−5 fijo, y programa AlarmManager con avisos aproximados si no se permiten alarmas exactas. Las repeticiones no están soportadas. Se conservan hasta 200 recordatorios locales y 50 chats con los últimos 40 mensajes cada uno. El resumen opcional de notificaciones permanece privado y se excluye de los chats guardados. La apertura de aplicaciones/YouTube continúa usando intents y toque en notificación cuando Android lo exige.

Los recuerdos y chats del teléfono son nuevos almacenes privados locales, separados de PostgreSQL, la web y otros dispositivos. No se descargan ni sincronizan automáticamente conversaciones o recuerdos desde Render. Los antiguos avisos que ya estaban sincronizados pueden restaurarse desde su caché local anterior; la nueva agenda móvil muestra los creados por el motor móvil. La generación de documentos, proyectos arbitrarios y biblioteca del servidor no se trasladó a esta pantalla y se informa como no disponible.

El nombre se detecta con Vosk local. Para transcribir la pregunta se prefiere el reconocedor instalado en el dispositivo (Android 12+ si está disponible) y se solicita preferencia offline al proveedor predeterminado. Esa preferencia **no garantiza** dictado offline: depende del servicio Android y sus paquetes de idioma. No se incluyó el dictado libre Vosk explorado anteriormente porque transcribía mal las frases evaluadas. Escribir sí funciona sin conexión; para responder en voz se necesita una voz española local instalada. YouTube y otras apps necesitan su propia conectividad.

Validación: compilación firmada, Android Lint, pruebas JVM de paridad con el modelo Node, definiciones/contexto, fechas de recordatorios y cálculo sin ejecución de código; guardas de arquitectura impiden reintroducir llamadas a Render en el lanzador y el servicio. No se ha probado esta UI en un teléfono físico ni se garantiza dictado/batería de un fabricante. En el teléfono: abrir sin Wi-Fi/datos y escribir «qué significa guapo», crear un recuerdo y consultarlo, programar un aviso corto con permiso de notificaciones, alternar redes y comprobar que el historial no recarga, y probar la voz española local.

El manifiesto 2.0 no solicita INTERNET para la aplicación: su código no puede hacer peticiones propias a Render. Esto no impide abrir YouTube/navegador ni usar un reconocedor de voz de otro proceso; esas aplicaciones/proveedores pueden usar su propia conexión. La consulta de notificaciones continúa siendo un permiso separado. La selección de otro chat reinicia el contexto activo de la guía; los mensajes guardados siguen visibles y los recuerdos explícitos permanecen en el teléfono.


## Edición reducida y Play Protect (2.0.1)

Se retiraron el componente NotificationListenerService, su declaración BIND_NOTIFICATION_LISTENER_SERVICE y el acceso a sus ajustes. El método de consulta responde que esta edición no lee notificaciones ajenas. Se eliminaron también MainActivity/WebView y PrivateLogin, que eran componentes heredados sin uso en el lanzador nativo. No se añadió otro mecanismo para leer mensajes o notificaciones. No se solicitan SMS, accesibilidad, Internet ni superposición. Se mantiene el paquete com.miguel.jarvis y la misma firma de prueba; no se cambia la identidad para eludir una detección.

Permisos que permanecen: micrófono bajo activación explícita; notificaciones propias para avisos y control del servicio; alarmas exactas opcionales con alternativa aproximada; servicio visible de micrófono y bloqueo parcial de CPU; restauración de avisos tras reiniciar. Reiniciar no enciende el micrófono. Las preferencias y chats móviles usan el mismo almacenamiento local y no se eliminan con esta actualización.

El aviso mostrado por Play Protect solo indica posible acceso sensible; no identifica la regla exacta ni permite certificar que este cambio resolverá el bloqueo. La compilación y las pruebas no equivalen a aprobación de Google. Mantén Play Protect activo. Si sigue bloqueado, solicita revisión mediante el formulario oficial descrito en [PLAY_PROTECT_REVIEW.md](PLAY_PROTECT_REVIEW.md).


## Selección de español y errores 12/13 (2.0.2)

El registro 2.0.1 mostró que el detector local llegó a ESCUCHANDO y reprodujo el saludo, pero el dictado local y el predeterminado devolvieron 12 al solicitar es-EC. ERROR_LANGUAGE_NOT_SUPPORTED (12) significa idioma solicitado no admitido; ERROR_LANGUAGE_UNAVAILABLE (13) significa que no está disponible en ese momento, por ejemplo por faltar el paquete. No equivalen a permisos de micrófono ni a un error de Render. El bloqueo parcial de CPU se libera al entrar en PAUSADO; su valor false en ese estado no demuestra un fallo de batería.

El dictado del servicio y el botón Mic comparten SpanishRecognition. En Android 13+ consultan RecognitionSupport antes de capturar; eligen español instalado en el dispositivo y, para el proveedor predeterminado, pueden elegir español online si no hay uno instalado. Si no se puede consultar la disponibilidad en dos segundos, usan es-ES como primera opción en lugar de exigir es-EC. Solo se conserva como preferencia un idioma que llegó a devolver un resultado. No seleccionan inglés para transcribir español.

Ante 12/13 se permite un intento de español genérico por proveedor y un cambio del motor local al predeterminado, con un máximo de cuatro configuraciones. No hay reintentos ilimitados. Solo se reinicia la preparación temporal si todavía no ha empezado la voz del usuario; la ventana completa comienza otra vez cuando la nueva configuración confirma disponibilidad. Una pausa, apagado, pérdida de ventana o cambio de sesión invalida los callbacks pendientes. Si no funciona ninguna configuración, se pausa con el mensaje específico del idioma, en vez de culpar genéricamente a Internet/permisos.

Permisos → Idioma del dictado Android explica cómo revisar el proveedor y abre los ajustes de entrada de voz. Instalar una voz de síntesis no instala reconocimiento de español. La app no fuerza descargas, cambia el idioma del sistema ni añade permisos; el servicio predeterminado puede usar su propia conexión si el idioma se eligió de su lista online.

Las pruebas JVM cubren preferencia de idiomas instalados, códigos de idioma frente a permisos, y conservación del temporizador ante pausa/apagado o voz ya iniciada. La consulta de paquetes y el resultado real siguen necesitando prueba en el dispositivo Infinix; no se dispone de ese teléfono aquí.


## WhatsApp, seguimiento de tareas y lector opcional (2.1.0)

### Abrir aplicaciones

«Ingresa a guassa», «entra a wasap» y «abre WhatsApp» se normalizan a WhatsApp. Se admite también «ingresa al …» y peticiones corteses. La app verifica los paquetes oficiales com.whatsapp y com.whatsapp.w4b, sin adivinar otra app por una etiqueta parecida; no pide QUERY_ALL_PACKAGES. WhatsApp Business requiere su nombre explícito. Si JARVIS está visible solicita abrir la app; en segundo plano sigue preparando una notificación que debes tocar. No intenta eludir la restricción de inicio de actividades de Android. No lee ni envía chats desde WhatsApp.

### Recordatorios hasta Hecho o Detener

«Hasme un recordatorio de lavar los platos a las ocho de la noche» programa el aviso en la zona horaria del teléfono. La confirmación expresa fecha y hora completas; di mañana/tarde/noche o usa 24 horas para evitar confusión entre 08:00 y 20:00. El seguimiento predeterminado solicitado repite cada cinco minutos hasta que marques Hecho o Detener. También admite terminar la orden con «y repite cada cinco minutos». Las repeticiones diarias/semanales y otros intervalos no están implementados.

El aviso dice «Señor, le recuerdo que debe lavar los platos. ¿Ya lo hizo o todavía no?» y ofrece **Hecho**, **En 5 minutos** y **Detener**. Hecho cancela el próximo aviso; aplazar lo programa cinco minutos desde la confirmación; Detener pausa los avisos manteniendo la tarea pendiente. Deslizar una notificación no equivale a marcar la tarea como hecha. En Permisos → Seguimiento de recordatorios puedes escoger treinta minutos, una hora o hasta Hecho/Detener para los nuevos avisos y aplazamientos. Los registros completados pueden depurarse al crear nuevas tareas; las conversaciones no se borran por ello.

Con Activar JARVIS encendido, un aviso hablado permite continuar escuchando y contestar «ya lo hice» o «todavía no». Esas respuestas solo se aplican a la tarea del aviso reciente, dentro de dos minutos y sin una petición ajena intermedia. Un «sí» o «no» suelto no completa ni aplaza tareas. También puedes decir «marca lavar los platos como hecho» o «cancela los avisos de lavar los platos» con el nombre exacto; si hay varias coincidencias no cambia ninguna.

Si la escucha está apagada, el recordatorio no enciende el micrófono por su cuenta. Puede leer el aviso con una voz española local a través de un servicio de reproducción visible, sujeto a las reglas de inicio en segundo plano de Android. Para contestar usa los botones o abre JARVIS y dicta/escribe la respuesta. Si Android impide arrancar ese servicio, falta voz local, hay una grabación/llamada, modo silencio o No molestar, permanece el aviso de notificación sin forzar audio. La reproducción tiene foco de audio, vigilancia y duración máxima; no crea AudioRecord ni SpeechRecognizer.

Activa notificaciones propias y Alarmas exactas. Aun con esos permisos, Doze, ahorro de batería y restricciones del fabricante pueden retrasar avisos; solicitar cinco minutos no garantiza ese intervalo con pantalla apagada. Un aviso retrasado calcula el siguiente desde su entrega real, evitando ráfagas. Los callbacks de alarmas viejas o de tareas completadas se rechazan. Tras reiniciar o abrir la app se restauran los avisos pendientes, sin arrancar el micrófono; los avisos únicos antiguos ya vencidos no se convierten en bucles.

### Ediciones y notificaciones ajenas

La edición principal contiene NotificationListenerService, desactivado hasta que Android permita el acceso especial solicitado por el usuario. Abre Permisos → Notificaciones de otras apps. «Cuántas notificaciones tengo» resume cantidades por app; «lee mis notificaciones» lee hasta tres avisos recientes, con título y texto disponibles y longitudes limitadas. No equivale a leer toda la bandeja de mensajes ni a conocer el número exacto de mensajes sin leer. Se excluyen JARVIS, avisos permanentes y resúmenes duplicados de grupos.

No lee automáticamente avisos entrantes, no responde mensajes, no persiste el contenido y no lo manda al servidor. Los resúmenes y lecturas se excluyen del historial guardado. Puede anunciar datos personales en voz alta cuando se lo pides. Puedes retirar el acceso en Android. Esta edición puede ser bloqueada por Play Protect: no hay garantía de instalación. Mantén la protección activa y solicita revisión oficial si corresponde.

La edición **sin lector** se genera con `-PjarvisNotificationReader=false`: elimina del manifiesto el servicio y su binding, y compila una implementación sin getActiveNotifications ni herencia NotificationListenerService. No es un permiso oculto: esa función no existe en ese APK. Comparte paquete, firma y formato de datos con la principal; no cambia la identidad para eludir una detección. En 2.1.0 ambas conservaban el chat sin INTERNET propio. Desde 2.2.0 se añade INTERNET solo para búsquedas explícitas de Google configuradas; el chat local sigue sin depender de Render.

Descargas: `JARVIS-Android-prueba.apk/zip` (lector opcional) y `JARVIS-Android-sin-lector.apk/zip` (permisos reducidos). Las huellas SHA-256 están junto a cada APK. CI compila ambas opciones.

Validación: pruebas JVM de alias y órdenes explícitas, estado de seguimiento con límite opcional o ilimitado, duplicados/entregas tempranas, finalización y aplazamiento, recuentos frente a contenido privado y parsers de fecha. Se auditan manifiesto y código compilado de ambos APK. No se dispone de un teléfono físico para validar AlarmManager, reproducción en segundo plano, Play Protect ni datos reales de notificaciones. Prueba primero un aviso de un minuto, confirma Hecho y verifica que no vuelva a aparecer cinco minutos después.

## Centro de voz y fuentes de Google (2.2.0)

- Interfaz nativa azul/cian con esfera de partículas, anillos, ondas y estados de reposo, preparación, escucha, consulta, voz, pausa y error. Las ondas son una ilustración del estado, **no un medidor del micrófono**. No añaden capturas de audio. La animación se detiene al salir, en reposo/pausa y cuando Android desactiva animaciones. Ocultar núcleo deja más espacio al chat; con teclado o ventanas de poca altura se oculta automáticamente y vuelve al recuperar espacio.
- Acciones permite preparar peticiones de fecha, notificaciones, agenda, apps, música, noticias y Google. El botón prepara texto para revisar/enviar; no afirma completar la acción solo al seleccionarla.
- «Busca en Google energía solar» y «Noticias sobre Ecuador» utilizan un transporte opcional; las preguntas normales siguen usando el clasificador y el conocimiento instalado. Tras «Qué es la energía solar», «Búscalo en Google» conserva solo ese tema durante cinco minutos en memoria volátil. Otra acción, un chat nuevo o el vencimiento descartan el tema; no copia recuerdos ni notificaciones.
- Configura **Permisos → Búsqueda opcional de Google**. Introduce únicamente allí una clave de Custom Search JSON API y un identificador de motor (`cx`) de una cuenta con acceso al servicio. La disponibilidad, restricciones y tarifas las determina Google: esta entrega **no incluye cuenta, clave, crédito ni garantiza altas nuevas gratuitas**. Guardar los datos no verifica el acceso. Revisa en tu cuenta las restricciones de clave para esa API.
- Las credenciales quedan en preferencias privadas del teléfono, con copias de seguridad de Android desactivadas. Desconectar las elimina. No se guardan en los chats ni el diagnóstico ni se incorporan al APK. La app ahora declara INTERNET en ambas ediciones; únicamente GoogleSearchClient realiza HTTP para esta función, con host HTTPS fijo, sin redirecciones, tiempos/límites de respuesta y hasta diez consultas por minuto. Envía el tema solicitado, no conversaciones, audio ni notificaciones.
- Se presentan hasta tres **fragmentos del buscador**, con enlaces HTTPS seleccionables. No se descargan las páginas de esas fuentes, ni se contrastan, ni se usa un LLM para redactar una conclusión. Los fragmentos pueden estar incompletos o desactualizados. La voz omite dictar las URL y dice que el enlace está en pantalla.
- Sin credenciales, la búsqueda abre Google/Google Noticias en el navegador; en segundo plano exige tocar la notificación. «Abre Google» siempre usa el navegador. Una consulta fallida no se presenta como contestada ni cambia el motor local.

El clasificador no adquiere razonamiento humano por añadir esta interfaz ni al conversar. No se ha instalado un generador de imágenes ni un agente remoto de control del PC. El repositorio sí ofrece `npm run desktop` para abrir un conjunto fijo de apps/páginas desde el navegador del propio computador. La web recibe la misma presentación y consulta opcional; no concede acceso al sistema operativo del computador.

Validación: pruebas de políticas, contexto y tratamiento de fuentes; compilación, lint y tests de ambas ediciones; navegador de escritorio y móvil con Google simulado/no configurado. No hubo credenciales reales de Google para probar cuota, acceso o una búsqueda real, ni dispositivo Android físico para verificar audio/segundo plano en esta entrega.
