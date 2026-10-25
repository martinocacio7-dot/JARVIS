# JARVIS

Asistente personal con interfaz web en español, una red neuronal propia de clasificación, contexto de conversación y biblioteca privada en base de datos. La red y la búsqueda de documentos funcionan sin Ollama ni una API de IA. La biblioteca usa SQLite en desarrollo y PostgreSQL en producción, mediante el controlador `pg`. Incluye una conexión opcional a OpenAI, desactivada mientras no haya una clave configurada. La red local selecciona respuestas predefinidas; no es un modelo generativo como ChatGPT.

## Ejecutar

Requiere Node.js 24 LTS o superior, que incluye SQLite. Instala las dependencias exactas del archivo de bloqueo:

```sh
# Desde la carpeta donde descargaste o clonaste el proyecto:
cd JARVIS
npm ci
npm start
```

Abre http://localhost:3000 en el navegador y deja la terminal abierta. En PowerShell puedes usar `npm.cmd start` si la política de ejecución impide usar `npm`. El servidor usa el puerto 3000; en el entorno de desarrollo en la nube la carpeta es `/workspace/JARVIS`.

## Probar la memoria y los temas

Escribe los mensajes uno por uno en el chat:

```text
Me llamo Miguel
¿Cómo me llamo?
Quiero aprender programación
Continúa
Gracias
¿De qué hablábamos?
Continúa
Repite
Olvida el contexto
```

Reconoce 20 intenciones funcionales y una categoría de pregunta no cubierta y ofrece guías de tres pasos sobre programación, proyectos, organización e inteligencia artificial. «Continúa» avanza dentro del tema activo; «Repite» repite la última respuesta sin avanzar. Al cambiar de tema empieza una guía nueva. Sus explicaciones y ejemplos son predefinidos: no ejecuta código, organiza tu agenda ni resuelve cualquier pregunta.

La memoria usa reglas y se reconstruye únicamente desde los mensajes del usuario incluidos en cada petición. Recuerda el nombre indicado con «Me llamo…», «Mi nombre es…» o «Puedes llamarme…». No modifica los pesos del modelo durante el chat. «Olvida el contexto» reinicia nombre y tema para los siguientes mensajes, pero deja el historial visible; «Nueva conversación» borra el historial local de la aplicación.

El cliente conserva una ventana reciente de hasta 40 mensajes (hasta 38 al enviar). Cuando el mensaje donde diste tu nombre o elegiste un tema sale de esa ventana, ese contexto deja de estar disponible. No hay memoria entre dispositivos ni un almacén compartido en el servidor.

## Biblioteca y correcciones persistentes

La biblioteca es independiente de la memoria del chat descrita arriba: sus documentos y respuestas enseñadas sí se guardan en una base de datos. La aplicación tiene un único usuario, así que cualquier dispositivo que entre con tus credenciales accede a la misma biblioteca.

1. Abre **Biblioteca privada** y pulsa **Cargar ejemplo**, o carga un archivo de texto UTF-8 `.txt` o `.md`. No admite PDF o Word todavía.
2. Activa **Consultar biblioteca** y pregunta, por ejemplo, «¿Qué es una variable?».
3. JARVIS devuelve fragmentos con el nombre del documento y su número de fragmento, o indica que no encontró información suficiente. No envía documentos a OpenAI, Gemini ni Groq, incluso si existe una clave para el chat opcional.
4. Pulsa **Enseñar una respuesta mejor** debajo de un mensaje, o completa el formulario de la biblioteca. Al volver a preguntar lo mismo, ignorando puntuación, mayúsculas y acentos, se usará la respuesta que enseñaste. Puedes editarla o eliminarla.
5. Usa **Exportar copia** para descargar un JSON privado. **Restaurar copia** reemplaza la biblioteca actual, con confirmación. «Nueva conversación» borra el chat de ese navegador, pero no elimina la biblioteca.

La búsqueda BM25 de `knowledge/search.js` compara palabras y clasifica fragmentos. No es búsqueda semántica, no sintetiza texto libre y no verifica la verdad de los documentos. Las correcciones se guardan como pares de pregunta y respuesta: no entrenan automáticamente los pesos de la red. No afirmamos que esta función haga razonar al modelo.

Límites iniciales: 10 documentos, 20 000 caracteres por documento, 60 000 en total, y 20 respuestas enseñadas de hasta 500 caracteres de pregunta y 2000 de respuesta. No guardes secretos en los documentos. Las copias exportadas contienen el texto completo y deben conservarse en privado.

### Base de datos local

Sin `DATABASE_URL`, el modo de desarrollo crea `data/jarvis.sqlite`, excluido de Git. Los datos sobreviven al reinicio del proceso mientras conserves ese archivo. Puedes cambiar su ubicación con `JARVIS_DATABASE_PATH`. No uses SQLite en el disco efímero de Render como almacenamiento permanente.

### PostgreSQL para Render

En producción no se usa un archivo temporal: hace falta una conexión PostgreSQL. El chat sigue funcionando si falta, pero la biblioteca muestra que está sin configurar.

1. Crea una base de datos PostgreSQL en tu proveedor. Una opción es un proyecto gratuito en https://neon.tech; comprueba sus límites y condiciones vigentes antes de crearlo. No hace falta contratar un plan de pago para probar esta función.
2. Copia la cadena PostgreSQL desde el panel del proveedor y guárdala en Render → **jarvis-privado → Environment** con el nombre **DATABASE_URL**. Es un secreto: no la pegues en el chat, GitHub ni `render.yaml`.
3. Guarda las variables y vuelve a desplegar el servicio. Se crean automáticamente las tablas `jarvis_library`, `jarvis_feedback` y `jarvis_tasks`; no se eliminan documentos o correcciones anteriores ni otras tablas.
4. Carga un documento, recarga la web y abre el mismo servicio en otro dispositivo con tus credenciales para comprobar que se conserva.

Se usa TLS con verificación de certificados por defecto. Solo para una conexión dentro de una red privada o una base local de pruebas sin TLS se puede indicar `sslmode=disable`. No desactives TLS para conexiones públicas. El controlador mantiene un máximo de tres conexiones. Guarda copias de respaldo antes de cambiar de base: no hay migración automática entre SQLite y PostgreSQL.

`GET /api/library` recupera la biblioteca, `PUT /api/library` la actualiza con una revisión esperada y `POST /api/knowledge` recibe `{ "query": "¿Qué es una variable?" }`. Las tres rutas requieren autenticación cuando está configurada. Una revisión desactualizada devuelve HTTP 409 para evitar perder cambios hechos en otro dispositivo. Recarga antes de reintentar.

## Corregir lo que la red entendió

**Entendiste mal** aparece debajo de las nuevas respuestas del modo local. Es distinto de **Enseñar una respuesta mejor**: este último guarda una respuesta literal para la biblioteca; el nuevo botón guarda qué intención debería reconocer la red para tu frase.

1. Pulsa **Entendiste mal**, revisa la frase y selecciona lo que querías pedir entre las 21 categorías disponibles (incluida una pregunta no cubierta). Puedes resumir la frase antes de guardar; el máximo es de 1000 caracteres.
2. La corrección se guarda en la base de datos como **Pendiente**. En **Mejorar mi comprensión**, comprueba que la etiqueta sea correcta y pulsa **Aprobar** o **Descartar**. También puedes editar o eliminar la corrección; editarla la devuelve a Pendiente.
3. **Exportar aprobadas para entrenar** descarga solo las aprobadas. Si una misma frase tiene dos etiquetas aprobadas distintas, exige resolver ese conflicto. Se admiten hasta 200 correcciones guardadas.

Requiere la misma base de datos de la biblioteca: SQLite en desarrollo, PostgreSQL mediante `DATABASE_URL` en Render. Si falta la conexión, el chat funciona y el panel indica el requisito. No se capturan conversaciones enteras: guardamos la frase que revisaste, la intención interpretada, la intención que elegiste y el estado de revisión. El acceso usa la misma contraseña de la web.

**Guardar, aprobar o exportar no reentrena la red ni mejora automáticamente la próxima respuesta.** No admite añadir intenciones completamente nuevas desde la web: para eso hay que ampliar el conjunto de datos y sus comportamientos en el código. Las correcciones de comprensión están en una tabla independiente y no se borran al iniciar otro chat o restaurar una copia de la biblioteca. El respaldo JSON de la biblioteca no incluye estas revisiones; utiliza además la exportación de aprobadas y las copias de tu base de datos.

### Preparar un entrenamiento revisado

Guarda el archivo exportado dentro de `data/`, que está excluido de Git, y ejecuta desde la carpeta del proyecto:

```sh
npm run prepare-training -- data/jarvis-correcciones-revisadas.json
```

Esto crea `data/reviewed-intents.json`, combinando ejemplos aprobados con los datos originales. Omite duplicados con la misma etiqueta y rechaza conflictos, etiquetas desconocidas, ejemplos sin aprobación y frases pertenecientes a `evaluation.json` o `challenge.json`. No altera los pesos, los datos originales ni archivos existentes. Si ya existe el archivo de salida, elige otro con `--out data/reviewed-intents-2.json`.

Revisa el conjunto resultante antes de entrenar:

```sh
npm run train -- --data data/reviewed-intents.json
npm test
```

En PowerShell puedes sustituir `npm` por `npm.cmd`. El entrenamiento sigue comprobando el ajuste de los ejemplos y la regresión anterior antes de reemplazar los pesos; revisa también los errores y métricas de `neural/report.json`, y conserva el cambio solo si mejora las tareas que necesitas. Reinicia el servidor o despliega el modelo revisado para usarlo. La web no ejecuta estos comandos ni publica los pesos automáticamente. `npm run train` sin `--data` vuelve a usar el conjunto original de `neural/intents.json`.

Los archivos exportados, el conjunto ampliado y los pesos entrenados pueden revelar información de tus ejemplos. No introduzcas contraseñas o información sensible, ni subas datos privados a GitHub. Estos pasos permiten aprendizaje supervisado a partir de correcciones; no equivalen a aprender de cualquier mensaje sin revisión.

`GET /api/feedback` devuelve las correcciones y las intenciones disponibles. `PUT /api/feedback` guarda una lista validada con `expectedRevision`; una revisión desactualizada devuelve HTTP 409. Las rutas están protegidas por la misma autenticación y comprobación de origen que la biblioteca. Las revisiones de biblioteca y correcciones son independientes.

## Pendientes, listas y agenda por voz o chat

En modo **Conversación**, con **Consultar biblioteca** desactivado, puedes escribir o dictar:

```text
Recuérdame entregar el informe mañana a las 9
Añade leche a mi lista
Qué tengo pendiente
Qué tengo mañana
Qué hay en mi lista
Cambia entregar el informe para pasado mañana a las 10
Marca entregar el informe como hecho
Elimina leche de mi lista
```

Estas peticiones activan acciones propias de JARVIS sobre la base de datos, sin llamar a otras IA. Solo se interpreta el último mensaje del usuario; no se vuelven a ejecutar órdenes anteriores al enviar el historial. Las acciones usan reglas explícitas, no significan que el modelo tenga comprensión o autonomía general.

Horarios de **America/Guayaquil (UTC−5)**: «mañana» y «pasado mañana» se calculan desde ese huso, aunque el servidor esté en UTC. Se admiten «hoy», «mañana», «pasado mañana» y fechas `AAAA-MM-DD`, seguidas de «a las H» o «a las HH:MM», en formato de 24 horas; también `am` y `pm` cuando se indican. No se programa una repetición diaria o semanal: se pide una fecha única.

Si falta la fecha o la hora, es inválida o ya pasó, JARVIS devuelve un borrador sin guardarlo. Pulsa **Completar pendiente** y revisa sus datos. No inventa una hora. Las descripciones admiten hasta 300 caracteres y puedes guardar hasta 200 pendientes. Repetir la misma creación activa no añade un duplicado.

En **Mis pendientes y agenda** puedes crear, editar, completar, reabrir o eliminar entradas. Los cambios por chat requieren un nombre exacto y un único elemento coincidente; si hay ambigüedad, pide elegirlo en el panel y no modifica nada. El chat muestra hasta diez resultados, con el número total; el panel muestra todos, incluidos completados y vencidos. Usa **Actualizar pendientes** para recuperar cambios de otro dispositivo.

Los datos están en `jarvis_tasks`: SQLite local o PostgreSQL mediante `DATABASE_URL` en Render. Son independientes de la biblioteca, las correcciones de intención y el historial del navegador. No desaparecen al crear otra conversación. Si falta la conexión, no se confirma que algo haya sido guardado. Las ediciones incluyen una revisión para impedir que un dispositivo sobrescriba cambios de otro.

**Esta versión no emite alarmas automáticas, con la web abierta ni cerrada.** Para obtener avisos, **Exportar agenda para calendario (.ics)** descarga los recordatorios no completados. Importa el archivo en un calendario compatible y comprueba sus avisos y permisos. Los eventos se exportan en UTC con un aviso al inicio, pero su ejecución depende del calendario. No hay sincronización posterior: los cambios en JARVIS no actualizan automáticamente lo importado; revisa posibles duplicados al importar de nuevo. El archivo contiene tus descripciones y debe guardarse en privado.

`GET /api/tasks` devuelve `{ items, revision }`; `PUT /api/tasks` acepta `{ items, expectedRevision }` y devuelve HTTP 409 si la revisión cambió. Los elementos tienen `id`, `kind` (`reminder` o `list`), `text`, `dueAt` (ISO UTC o `null` para lista) y `completed`. Las fechas históricas se conservan como vencidas; el formulario y las órdenes de creación solicitan una fecha futura. Las rutas están protegidas por la autenticación de JARVIS y la comprobación de origen en escrituras. También se utilizan desde la versión web móvil instalable.

## Documentos de Word, PDF, PowerPoint y Excel

Abre **Crear Word, PDF, PowerPoint y Excel**, selecciona un formato y proporciona el contenido. También puedes escribir «Hazme un informe en Word» en el chat y abrir el formulario desde la respuesta. El nuevo comando forma parte de las intenciones entrenadas y hay una ruta explícita para peticiones directas.

- **Word `.docx`:** documento editable con Times New Roman de 12 puntos y texto negro. Formato base APA 7 estudiantil: tamaño carta, márgenes de 2,54 cm, interlineado doble, alineación izquierda, primera línea a 1,27 cm, portada con los datos aportados, número de página arriba a la derecha y referencias alfabéticas con sangría francesa. No añade encabezado abreviado porque el formato estudiantil no lo exige por defecto.
- **PDF:** versión independiente con el mismo contenido, fuente serif Times de 12 puntos, formato base de informe APA, texto negro y páginas numeradas. Se genera directamente, sin convertir Word ni depender de Microsoft Office o LibreOffice.
- **PowerPoint `.pptx`:** presentación editable con portada, contenido distribuido en diapositivas y referencias si se proporcionan. Fondo blanco y texto negro, sin paletas de colores decorativas. Revisa la distribución final en tu aplicación de presentaciones.
- **Excel `.xlsx`:** hoja con los datos que pegues separados por tabulaciones, encabezado, filtros y primera fila inmovilizada. Hasta 200 filas y 20 columnas. Conserva códigos como `007`; el texto que empieza por `=` se almacena como texto, no como una fórmula ejecutable.

El formulario conserva tu redacción: no inserta frases de relleno ni atribuciones de investigación inexistente. La red actual no puede redactar un informe completo solo a partir de un tema, investigar fuentes ni certificar cumplimiento APA integral. El formato base no sustituye la revisión de citas autor-fecha, referencias según el tipo de fuente, tablas, figuras, resúmenes y requisitos de tu institución. Las alertas de citas son comprobaciones simples, no verificaciones bibliográficas.

Separa párrafos con una línea en blanco y usa `# Encabezado` o `## Encabezado secundario`. En Word y PDF, `*texto*` marca cursivas. Introduce referencias completas, una por línea, de fuentes que hayas consultado. Si faltan, no se inventan; el formulario informa de los datos pendientes. El contenido admite hasta 16 000 caracteres y las referencias hasta 4000. Los documentos se generan en memoria, se descargan y no se conservan en el servidor ni se envían a otras IA. No se prometen resultados de detectores de IA.

`POST /api/documents` recibe el formato, título, metadatos, contenido y referencias o tabla, y devuelve el archivo binario con su tipo de contenido y nombre de descarga. Usa la misma contraseña y comprobación de origen de la aplicación. No necesita `DATABASE_URL` para generar archivos.

## Aplicación Android (APK)

La aplicación nativa está en [`android/`](android/README.md). Incluye consulta de hora del teléfono y avisos de recordatorios mediante Android, además del acceso al mismo JARVIS privado. [Descarga el APK de prueba](downloads/JARVIS-Android-prueba.apk) y sigue las instrucciones de permisos. Requiere Android 8.0 o posterior. Incluye el modo opcional **Fuera de app** con notificación visible: responde al nombre, espera cuatro segundos y vuelve en silencio a esperar. Mantiene el micrófono activo; debe pausarse antes de grabar vídeos.

## Versión móvil instalable

Abre la dirección privada de JARVIS en tu teléfono y entra con tu usuario y contraseña. En Android/Chrome usa **Instalar JARVIS** o el menú **Instalar aplicación**. En iPhone/Safari usa **Compartir → Añadir a pantalla de inicio**. Es una aplicación web instalable (PWA), no un APK. El botón **Funciones** abre biblioteca, documentos, pendientes y ajustes de voz; el chat se adapta al ancho del teléfono.

Necesita conexión. El service worker no guarda páginas privadas ni respuestas de API en caché: sin red muestra una pantalla genérica. El manifiesto, el service worker y los iconos son públicos para permitir instalar; la aplicación y las API conservan su contraseña. El historial sigue en cada navegador; biblioteca, pendientes y configuración de la voz se comparten mediante la base de datos.

## Micrófono y respuestas habladas

Pulsa **🎤** para dictar en español. Necesita HTTPS y permiso del navegador. El texto queda visible para revisarlo; pulsa **Enviar** para solicitar una respuesta.

Para activar por nombre, pulsa **Activar «JARVIS»**. Al oír «JARVIS» responde **«Sí, dígame, señor.»** y escucha tu petición. También admite «JARVIS, añade leche a mi lista» en una frase. La petición queda preparada para revisar y enviar. Este modo habilita la lectura de respuestas y pausa la escucha mientras habla. Se detiene al ocultar la aplicación, bloquear el teléfono o perder conexión; debes reactivarlo al volver. No es escucha permanente en segundo plano.

El dictado y la detección del nombre usan Web Speech API (`SpeechRecognition` o `webkitSpeechRecognition`). El navegador puede enviar audio a su proveedor mientras escucha, incluso antes del nombre. La compatibilidad depende del equipo; prueba Chrome/Edge si no funciona. Render no necesita un micrófono físico.

**Leer respuestas en voz alta** permite oír hasta 4000 caracteres de cada respuesta. **Detener voz** interrumpe la reproducción. Puedes elegir una voz española instalada que el navegador identifique como local, o configurar ElevenLabs para usar una misma voz personalizada en el saludo y las respuestas nuevas. La síntesis cambia la voz, no la inteligencia del modelo.

### Usar tus muestras para la misma voz en todas las respuestas

1. En Render → servicio JARVIS → **Environment → Edit**, añade `ELEVENLABS_API_KEY` con una clave de tu cuenta ElevenLabs que permita crear voces y sintetizar audio. Guarda y vuelve a desplegar. No publiques la clave en GitHub ni en el chat. Las claves de Gemini/Groq no sirven para este servicio; el plan del proveedor puede requerir pago.
2. Descomprime `vos.zip`. En **Funciones → Voz y muestras personales**, carga hasta cuatro audios de la misma voz (.ogg, .mp3, .wav o .m4a, máximo 500 KB cada uno). Puedes escucharlos antes; se conservan en IndexedDB del dispositivo. Cargar archivos no clona una voz ni los envía al proveedor.
3. Pulsa **Crear voz en ElevenLabs y enviar muestras**. Esta acción envía las muestras al proveedor y guarda el identificador de la voz creada en PostgreSQL/SQLite. Después selecciona **Voz personalizada · ElevenLabs** y activa la lectura. Los textos leídos se envían a ElevenLabs para producir audio nuevo con esa voz.

Si ya tienes una voz creada, puedes configurar `ELEVENLABS_VOICE_ID` en Render junto a la clave. Una voz creada desde JARVIS y guardada en la base de datos tiene prioridad. Si el proveedor crea la voz pero falla el guardado, se muestra su identificador para configurarlo manualmente sin crear otra. Las grabaciones originales y la clave no se guardan en la base de datos de JARVIS; el proveedor conserva los datos según sus condiciones. Borrar las muestras del dispositivo no elimina la voz en ElevenLabs.

Las pruebas automáticas verifican contratos de API, autenticación, persistencia, interfaz móvil y activación mediante voz simulada. La clonación real y el micrófono físico requieren probar con tu cuenta y dispositivo. La calidad depende de las muestras y del servicio; no se garantiza una reproducción idéntica.

## Desarrollar prototipos de código

El modo **Desarrollar código local** crea tres tipos de prototipo mediante un generador propio (`developer/generator.js`), sin consultar otras IA ni necesitar una base de datos:

| Petición de ejemplo | Funciones incluidas |
| --- | --- |
| «Desarrolla una lista de tareas» | Añadir, completar, reabrir y eliminar tareas; guardado local. |
| «Desarrolla un inventario en HTML» | Crear, editar y eliminar productos, cantidades y precios; calcular el valor total; guardado local. |
| «Hazme una calculadora» | Sumar, restar, multiplicar y dividir; validación y control de división por cero. |

Selecciona ese modo junto al campo de mensaje y describe uno de esos proyectos. También reconoce peticiones explícitas como «Crea un inventario» en el chat normal, siempre que no estés consultando la biblioteca. Para personalizar el título, añade `titulado "Mi proyecto"`.

Cada respuesta permite **Ver código**, **Copiar código** y **Descargar** un único archivo HTML con sus estilos y JavaScript incluidos. Abre el archivo descargado en tu navegador para usarlo. El código se muestra como texto en JARVIS y no se ejecuta dentro de la web privada. Los archivos generados se conservan con el historial de ese navegador; descarga una copia para conservarlos.

Son estructuras de código programadas, no un modelo que haya aprendido a programar o razonar libremente. No generan aplicaciones arbitrarias ni implementan todos los detalles de una petición. No admiten backend, cuentas, pagos, otros lenguajes ni conexión a PostgreSQL. Los datos de los prototipos de tareas e inventario se guardan en el navegador, no en la biblioteca de JARVIS. Son prototipos personales y deben revisarse antes de adaptarlos a un uso real. La biblioteca de JARVIS mantiene su propia base de datos independiente.

`POST /api/develop` acepta `{ "prompt": "Crea una calculadora" }` y devuelve una explicación y, si es compatible, un proyecto con `filename` y `code`. Mantiene la misma protección de acceso que el resto de la aplicación.

## Conectar un modelo generativo externo (opcional)

Configura `JARVIS_API_KEY` de forma segura en las variables del entorno o copia `.env.example` a `.env` y añade tu clave localmente. Reinicia el servidor después. El modelo predeterminado es `gpt-4.1-mini`; puedes cambiarlo con `JARVIS_MODEL`. La cuenta del proveedor necesita acceso al modelo y saldo; las solicitudes pueden tener coste. La clave permanece en el servidor.

Los mensajes se envían a `https://api.openai.com/v1/responses` solo cuando hay una clave configurada. El servidor solicita `store: false`; las políticas de tratamiento de datos del proveedor siguen siendo aplicables. El historial se guarda en este navegador con `localStorage`; «Nueva conversación» borra el historial de la aplicación en ese navegador. No introduzcas información sensible en equipos compartidos.

## Desarrollo y comprobaciones

```sh
npm run dev
npm test
```

Las pruebas verifican las rutas HTTP, validación, modo local y contrato con el proveedor mediante respuestas simuladas. La llamada a IA real requiere una clave y no forma parte de las pruebas automáticas.

También comprueban recuperación con fuentes, correcciones, persistencia real en SQLite y conflictos entre dispositivos. Para probar PostgreSQL, define `JARVIS_TEST_DATABASE_URL` apuntando a una **base exclusiva de pruebas** y ejecuta `npm test`: esa prueba modifica su biblioteca. Si falta esa variable, solo esa prueba se marca como omitida. Nunca uses una base con información real para las pruebas.

`GET /api/status` informa el modo de funcionamiento; `POST /api/chat` acepta `{ "messages": [{ "role": "user", "content": "Hola" }] }`. Se admiten hasta 40 mensajes, 8000 caracteres por mensaje y 64 KiB por petición. El cliente mantiene una ventana reciente de la conversación.

## Alcance de esta versión

Es una base de desarrollo para uso personal. Incluye acceso privado con un usuario y contraseña mediante HTTP Basic, sin registro de cuentas. No incluye herramientas para controlar dispositivos. La voz funciona según la compatibilidad del navegador y la configuración elegida. El chat permanece en cada navegador; la biblioteca se comparte entre tus dispositivos mediante la base de datos. El indicador «IA configurada» significa que existe una clave, no que su validez o saldo hayan sido verificados.

## Publicar una web privada en Render

El archivo `render.yaml` prepara un servicio web con HTTPS y contraseña obligatoria. La red neuronal se ejecuta en el servidor sin una API de IA. El alojamiento es un servicio externo y requiere una cuenta de Render; las condiciones y límites del plan gratuito dependen de ese proveedor.

1. Abre https://render.com/deploy?repo=https://github.com/martinocacio7-dot/JARVIS e inicia sesión en Render.
2. Revisa el Blueprint y crea el servicio `jarvis-privado`. No hace falta configurar una clave de OpenAI.
3. En las variables del servicio, consulta de forma privada el valor generado para `JARVIS_PASSWORD`. El usuario predeterminado es `jarvis`. No copies la contraseña a GitHub ni al chat.
4. Cuando termine el despliegue, abre la dirección HTTPS que Render asigne al servicio. El navegador solicitará el usuario y la contraseña antes de mostrar la página o permitir llamadas al chat.
5. Comprueba desde una ventana privada que, sin credenciales, la página pide autenticación y no muestra JARVIS. Después verifica que puedes entrar y enviar «Hola» con tus credenciales.

Render genera una contraseña aleatoria con `generateValue: true`, configura `NODE_ENV=production` y usa el puerto proporcionado por su plataforma. El servidor se niega a arrancar en producción si falta `JARVIS_PASSWORD` o tiene menos de 16 caracteres. La protección abarca la página, los recursos y las rutas API. Tras diez intentos incorrectos se bloquean nuevos intentos hasta finalizar una ventana de un minuto; ese límite es global y se reinicia al reiniciar el proceso.

Comparte únicamente la URL si lo necesitas y conserva la contraseña en privado: cualquiera que obtenga ambas podrá entrar. Usa siempre HTTPS fuera de tu equipo. El navegador puede recordar las credenciales de HTTP Basic; en equipos compartidos usa una ventana privada y cierra todas sus ventanas al terminar. Cambiar la contraseña del servicio y volver a desplegar invalida la anterior.

Este despliegue protege el acceso a la aplicación, pero no cambia la visibilidad del repositorio en GitHub ni impide que los administradores del alojamiento o de la base de datos accedan a los datos alojados. El historial permanece en el navegador que uses; la biblioteca se sincroniza mediante PostgreSQL. El plan gratuito puede suspender el servicio cuando no hay actividad, así que el primer acceso puede tardar.

Para activar esta misma protección en otro alojamiento, define `NODE_ENV=production`, `JARVIS_USER` y una `JARVIS_PASSWORD` segura de al menos 16 caracteres, y sitúa el servidor detrás de HTTPS. Para desarrollo local puedes dejar la contraseña vacía; nunca publiques ese modo sin protección.

## Red neuronal local

`neural/network.js` implementa la versión 3 de la red propia: 2133 características de entrada, una capa oculta de 32 neuronas tanh y 21 salidas softmax (20 intenciones funcionales y una categoría `desconocido`). Tiene 68 981 parámetros aprendidos por retropropagación durante 450 épocas, frente a los 35 572 de la versión anterior. No usa bibliotecas de IA, modelos descargados ni servicios externos para clasificar.

Las entradas incluyen palabras, pares consecutivos y 128 posiciones de trigramas de caracteres. La preparación de texto normaliza acentos y admite erratas de una letra, letras duplicadas y transposiciones adyacentes cuando hay un candidato inequívoco. Las palabras ya conocidas no se sustituyen. Es una regla de preparación del texto, no razonamiento lingüístico. La versión 2 de los pesos sigue siendo legible y conserva su preparación anterior para permitir comparaciones y recuperación.

El conjunto de 623 frases en `neural/intents.json` contiene 579 ejemplos de peticiones cubiertas y 44 de preguntas o acciones que JARVIS todavía no sabe resolver. Los pesos activos siguen entrenados con las 540 frases anteriores: la ampliación candidata no superó el control de regresión final. Estas últimas enseñan a reconocer límites de capacidad; no son filtros legales ni una garantía de detectar toda pregunta desconocida. Las respuestas siguen siendo programadas y los comandos de pendientes tienen su propio analizador: ampliar esta red no le permite redactar texto libre o desarrollar programas arbitrarios.

Los umbrales no se rebajaron: cobertura de palabras informativas de al menos 60 %, puntuación softmax de 0.75 y diferencia con la segunda opción de 0.2. Si no acepta una intención, puede ofrecer ejemplos para aclarar la petición. La categoría desconocida no se ofrece como sugerencia de tarea. Las puntuaciones no son probabilidades calibradas de verdad.

Para entrenar, añade ejemplos revisados, ejecuta `npm run train`, después `npm test` y reinicia el servidor. La semilla es fija (20261025). El entrenamiento guarda los pesos en `neural/model.json` y los resultados, incluidos los errores, en `neural/report.json`. Antes de entrenar rechaza frases reservadas; tampoco reemplaza los pesos si no ajusta todos los ejemplos, falla la regresión anterior o baja el número de aciertos de cualquiera de los conjuntos evaluados respecto de los pesos guardados. La preparación de correcciones también protege esos conjuntos.

### Qué se comparó

Se escribieron 100 frases nuevas antes de escoger el modelo, separadas en 50 de desarrollo y 50 de prueba. No se incorporan a los datos de entrenamiento. La arquitectura se eligió usando desarrollo; la prueba se evaluó después. Desde entonces estos conjuntos son también controles de regresión, así que no deben confundirse con una evaluación independiente de usuarios reales.

| Conjunto | Versión previa | Versión 3 |
| --- | --- | --- |
| Regresión original | 19/19 | 19/19 |
| Desafío de frases y erratas | 18/22 | 21/22 |
| Desarrollo nuevo | 39/50 | 45/50 |
| Prueba separada nueva | 37/50 | 40/50 |

El reporte conserva todos los errores: aún falla 1 de las 22 frases del desafío y 10 de las 50 de prueba. También hay una frase de identidad que acertaba antes y ahora rechaza: mejorar el resultado agregado no implica mejorar cada frase. No interpretamos 40/50 como «80 % de inteligencia» ni como precisión general del asistente. Son conjuntos pequeños, manuales y limitados a estas intenciones.

`neural/upgrade-baseline.json` conserva las predicciones anteriores, el commit `d61d1f0` y el hash de sus pesos. `neural/generalization.json` contiene las frases nuevas y sus etiquetas. `neural/experiments.json` registra dos configuraciones exploratorias con más neuronas y los mismos 300 ejemplos anteriores: no mejoraron desarrollo y no se conservaron. Se mantuvo una red ligera y se amplió el conjunto de datos; no atribuimos la mejora únicamente al número de parámetros. Los tiempos de esos experimentos fueron de pared y con procesos concurrentes, no una medida de latencia de JARVIS.

Los pesos se incluyen ya entrenados. Su carga e inferencia no vuelven a entrenar la red en cada mensaje. El entrenamiento y las pruebas siguen siendo adecuados para experimentar con 8 GB de RAM, aunque la duración depende de la CPU. Todavía no es un modelo de lenguaje ni una inteligencia comparable a Alexa o ChatGPT.


### Ensayo de ampliación a 64 y 128 neuronas

Se añadieron 83 ejemplos revisados para las intenciones existentes, sin incluir frases reservadas. El motor admite capas de 32, 64 y 128 neuronas. Para reproducir la comparación ejecuta `npm run compare-neurons`: entrena las tres configuraciones con 623 ejemplos y compara entrenamiento, regresión, desafío y desarrollo, sin usar prueba para escoger arquitectura. No modifica los pesos activos.

Las tres configuraciones acertaron 623/623 ejemplos de entrenamiento, 19/19 de regresión, 21/22 del desafío y 45/50 de desarrollo. Para la ampliación solicitada se eligió 64, la menor de las dos redes ampliadas empatadas y sin caída frente al control de 32. Esto no demuestra una mejora de generalización por añadir neuronas.

La comprobación posterior de la candidata de 64 (162 133 parámetros, 2511 entradas) obtuvo 39/50 en prueba frente a 40/50 de la red guardada. **La promoción fue rechazada**: `neural/model.json` y `neural/report.json` conservan los pesos y el reporte anteriores. No se eligió otra arquitectura utilizando ese resultado de prueba. `neural/width-comparison.json` registra las tres configuraciones y el rechazo final.

Puedes probar una configuración mediante `npm run train -- --hidden-size 64` (o 128), también junto a `--data archivo.json`. Sin esa opción se conserva el tamaño de los pesos guardados. El control de calidad sigue bloqueando cualquier caída en los conjuntos existentes; no se redujeron los umbrales para aceptar la candidata. Estos conjuntos pequeños ya se usaron en el desarrollo del proyecto y no son una evaluación independiente de inteligencia general. Los ejemplos adicionales enseñan formas de pedir funciones existentes; no incorporan un modelo generativo ni mejoran el detector de voz Android.
