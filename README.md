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

Reconoce 20 intenciones y ofrece guías de tres pasos sobre programación, proyectos, organización e inteligencia artificial. «Continúa» avanza dentro del tema activo; «Repite» repite la última respuesta sin avanzar. Al cambiar de tema empieza una guía nueva. Sus explicaciones y ejemplos son predefinidos: no ejecuta código, organiza tu agenda ni resuelve cualquier pregunta.

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
3. Guarda las variables y vuelve a desplegar el servicio. Se crean automáticamente las tablas `jarvis_library` y `jarvis_feedback`; no se eliminan documentos o correcciones anteriores ni otras tablas.
4. Carga un documento, recarga la web y abre el mismo servicio en otro dispositivo con tus credenciales para comprobar que se conserva.

Se usa TLS con verificación de certificados por defecto. Solo para una conexión dentro de una red privada o una base local de pruebas sin TLS se puede indicar `sslmode=disable`. No desactives TLS para conexiones públicas. El controlador mantiene un máximo de tres conexiones. Guarda copias de respaldo antes de cambiar de base: no hay migración automática entre SQLite y PostgreSQL.

`GET /api/library` recupera la biblioteca, `PUT /api/library` la actualiza con una revisión esperada y `POST /api/knowledge` recibe `{ "query": "¿Qué es una variable?" }`. Las tres rutas requieren autenticación cuando está configurada. Una revisión desactualizada devuelve HTTP 409 para evitar perder cambios hechos en otro dispositivo. Recarga antes de reintentar.

## Corregir lo que la red entendió

**Entendiste mal** aparece debajo de las nuevas respuestas del modo local. Es distinto de **Enseñar una respuesta mejor**: este último guarda una respuesta literal para la biblioteca; el nuevo botón guarda qué intención debería reconocer la red para tu frase.

1. Pulsa **Entendiste mal**, revisa la frase y selecciona lo que querías pedir entre las 20 intenciones disponibles. Puedes resumir la frase antes de guardar; el máximo es de 1000 caracteres.
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

## Documentos de Word, PDF, PowerPoint y Excel

Abre **Crear Word, PDF, PowerPoint y Excel**, selecciona un formato y proporciona el contenido. También puedes escribir «Hazme un informe en Word» en el chat y abrir el formulario desde la respuesta. El nuevo comando forma parte de las intenciones entrenadas y hay una ruta explícita para peticiones directas.

- **Word `.docx`:** documento editable con Times New Roman de 12 puntos y texto negro. Formato base APA 7 estudiantil: tamaño carta, márgenes de 2,54 cm, interlineado doble, alineación izquierda, primera línea a 1,27 cm, portada con los datos aportados, número de página arriba a la derecha y referencias alfabéticas con sangría francesa. No añade encabezado abreviado porque el formato estudiantil no lo exige por defecto.
- **PDF:** versión independiente con el mismo contenido, fuente serif Times de 12 puntos, formato base de informe APA, texto negro y páginas numeradas. Se genera directamente, sin convertir Word ni depender de Microsoft Office o LibreOffice.
- **PowerPoint `.pptx`:** presentación editable con portada, contenido distribuido en diapositivas y referencias si se proporcionan. Fondo blanco y texto negro, sin paletas de colores decorativas. Revisa la distribución final en tu aplicación de presentaciones.
- **Excel `.xlsx`:** hoja con los datos que pegues separados por tabulaciones, encabezado, filtros y primera fila inmovilizada. Hasta 200 filas y 20 columnas. Conserva códigos como `007`; el texto que empieza por `=` se almacena como texto, no como una fórmula ejecutable.

El formulario conserva tu redacción: no inserta frases de relleno ni atribuciones de investigación inexistente. La red actual no puede redactar un informe completo solo a partir de un tema, investigar fuentes ni certificar cumplimiento APA integral. El formato base no sustituye la revisión de citas autor-fecha, referencias según el tipo de fuente, tablas, figuras, resúmenes y requisitos de tu institución. Las alertas de citas son comprobaciones simples, no verificaciones bibliográficas.

Separa párrafos con una línea en blanco y usa `# Encabezado` o `## Encabezado secundario`. En Word y PDF, `*texto*` marca cursivas. Introduce referencias completas, una por línea, de fuentes que hayas consultado. Si faltan, no se inventan; el formulario informa de los datos pendientes. El contenido admite hasta 16 000 caracteres y las referencias hasta 4000. Los documentos se generan en memoria, se descargan y no se conservan en el servidor ni se envían a otras IA. No se prometen resultados de detectores de IA.

`POST /api/documents` recibe el formato, título, metadatos, contenido y referencias o tabla, y devuelve el archivo binario con su tipo de contenido y nombre de descarga. Usa la misma contraseña y comprobación de origen de la aplicación. No necesita `DATABASE_URL` para generar archivos.

## Micrófono y respuestas habladas

Pulsa **🎤** para dictar un mensaje en español. El navegador solicitará permiso de micrófono; el sitio debe usar HTTPS o ejecutarse en localhost. Puedes detenerlo con el mismo botón. El texto queda visible para revisarlo y no se envía automáticamente. El micrófono no permanece escuchando, y no hay activación por palabra clave como «Alexa».

El dictado usa Web Speech API (`SpeechRecognition` o `webkitSpeechRecognition`). Depende del navegador y puede enviar el audio a su proveedor de reconocimiento; no es un modelo de voz propio ni una garantía de procesamiento local. Si tu navegador, sus permisos o su servicio no lo admiten, puedes escribir o probar Chrome/Edge. El servidor de Render no necesita un micrófono.

**Leer respuestas con voz local** es opcional y está desactivado al abrir la página. Solo se utiliza una voz en español que el navegador marque como `localService`; si no hay una, se indica que falta y no se recurre a una voz remota. El texto completo queda en pantalla; las respuestas largas leen como máximo 4000 caracteres. **Detener voz** interrumpe la lectura. Al iniciar dictado, se detiene la voz para reducir que se transcriba la propia respuesta.

La voz es una interfaz sobre la red existente: no la convierte en un modelo comparable al de Alexa. Las pruebas de interfaz simulan el reconocimiento y la síntesis; el audio real y los permisos del equipo deben comprobarse en tu navegador. La página informa de denegaciones, ausencia de micrófono y errores de servicio sin perder el texto.

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

Es una base de desarrollo para uso personal. Incluye acceso privado con un usuario y contraseña mediante HTTP Basic, sin registro de cuentas. No incluye herramientas para controlar dispositivos ni voz. El chat permanece en cada navegador; la biblioteca se comparte entre tus dispositivos mediante la base de datos. El indicador «IA configurada» significa que existe una clave, no que su validez o saldo hayan sido verificados.

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

`neural/network.js` implementa la versión 2 de la red propia: 1090 características de entrada, una capa oculta de 32 neuronas con activación tanh y 20 salidas softmax. Tiene 35 572 parámetros aprendidos por retropropagación y descenso de gradiente durante 450 épocas. No usa bibliotecas de IA, modelos descargados ni servicios externos para clasificar.

Las entradas incluyen palabras, pares consecutivos de palabras y 128 posiciones para trigramas de caracteres. La red puede combinar características mediante la capa oculta, en lugar de usar solo una clasificación lineal. La preparación del texto normaliza acentos e intenta corregir erratas de una letra cuando encuentra una única palabra candidata; esta regla no es aprendizaje neuronal y no corrige cualquier error.

El conjunto de 300 frases en `neural/intents.json` cubre 20 intenciones: las anteriores más desarrollo de código, entrenamiento de la red, memoria, biblioteca, límites, cancelación y creación de documentos. La consulta de memoria informa el nombre y tema disponibles. Cancelar una guía libera el tema sin borrar el nombre. Las respuestas siguen siendo escritas en el conjunto de datos y en `neural/conversation.js`; la red no genera lenguaje libre ni código arbitrario.

Si menos del 60 % de las palabras informativas son conocidas, la puntuación máxima es menor que 0.75 o su diferencia con la segunda opción es menor que 0.2, el modelo no acepta la intención. Cuando hay suficiente vocabulario conocido, puede ofrecer dos ejemplos para aclarar la petición mediante botones. Estas puntuaciones no son una medida calibrada de certeza o veracidad.

Para enseñar nuevas intenciones, añade ejemplos variados, un identificador único y una respuesta al conjunto de datos. Ejecuta `npm run train`, después `npm test` y reinicia `npm start`. El entrenamiento guarda los pesos en `neural/model.json` y un reporte en `neural/report.json`. No reemplaza los pesos si falla la clasificación de los ejemplos de entrenamiento o la evaluación de regresión. El modelo se incluye ya entrenado para arrancar sin repetir ese trabajo. Usa la semilla fija 20261025 para poder reproducir el entrenamiento.

### Qué se midió y qué sigue fallando

- Entrenamiento: 300/300 frases reconocidas; la pérdida bajó de aproximadamente 3.00 a 0.021. Esto solo muestra ajuste al conjunto de entrenamiento.
- Evaluación anterior (`neural/evaluation.json`): 19/19, sin usar esas frases para actualizar pesos.
- Desafío ampliado (`neural/challenge.json`): 18/22. El reporte conserva los cuatro errores, incluidas dos erratas y dos formulaciones de capacidades que todavía no reconoce con suficiente seguridad.
- Comparación con la versión publicada en el commit `fe63730`: pasó de 9/20 a 16/20 en las mismas 20 frases adicionales. Los resultados previos se conservan en `neural/baseline.json`. Se cambiaron tanto la arquitectura como los datos, así que no atribuimos toda la mejora a añadir neuronas.

Son conjuntos pequeños de regresión y desarrollo, no una prueba independiente de comprensión general. Algunas frases nuevas fallarán incluso si parecen sencillas. Tampoco significa que JARVIS piense como una persona. El entrenamiento sigue siendo ligero para un equipo con 8 GB de RAM, pero el tiempo depende de la CPU y de los datos. Las pruebas entrenan una vez y reutilizan el modelo para evitar trabajo duplicado.
