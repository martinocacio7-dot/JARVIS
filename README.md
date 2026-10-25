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

Reconoce 19 intenciones y ofrece guías de tres pasos sobre programación, proyectos, organización e inteligencia artificial. «Continúa» avanza dentro del tema activo; «Repite» repite la última respuesta sin avanzar. Al cambiar de tema empieza una guía nueva. Sus explicaciones y ejemplos son predefinidos: no ejecuta código, organiza tu agenda ni resuelve cualquier pregunta.

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
3. Guarda las variables y vuelve a desplegar el servicio. Se crea automáticamente la tabla `jarvis_library`; no cambia ni elimina otras tablas.
4. Carga un documento, recarga la web y abre el mismo servicio en otro dispositivo con tus credenciales para comprobar que se conserva.

Se usa TLS con verificación de certificados por defecto. Solo para una conexión dentro de una red privada o una base local de pruebas sin TLS se puede indicar `sslmode=disable`. No desactives TLS para conexiones públicas. El controlador mantiene un máximo de tres conexiones. Guarda copias de respaldo antes de cambiar de base: no hay migración automática entre SQLite y PostgreSQL.

`GET /api/library` recupera la biblioteca, `PUT /api/library` la actualiza con una revisión esperada y `POST /api/knowledge` recibe `{ "query": "¿Qué es una variable?" }`. Las tres rutas requieren autenticación cuando está configurada. Una revisión desactualizada devuelve HTTP 409 para evitar perder cambios hechos en otro dispositivo. Recarga antes de reintentar.

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

`neural/network.js` implementa la versión 2 de la red propia: 1005 características de entrada, una capa oculta de 32 neuronas con activación tanh y 19 salidas softmax. Tiene 32 819 parámetros aprendidos por retropropagación y descenso de gradiente durante 450 épocas. No usa bibliotecas de IA, modelos descargados ni servicios externos para clasificar.

Las entradas incluyen palabras, pares consecutivos de palabras y 128 posiciones para trigramas de caracteres. La red puede combinar características mediante la capa oculta, en lugar de usar solo una clasificación lineal. La preparación del texto normaliza acentos e intenta corregir erratas de una letra cuando encuentra una única palabra candidata; esta regla no es aprendizaje neuronal y no corrige cualquier error.

El conjunto de 278 frases en `neural/intents.json` cubre 19 intenciones: las anteriores más desarrollo de código, entrenamiento de la red, memoria, biblioteca, límites y cancelación. La consulta de memoria informa el nombre y tema disponibles. Cancelar una guía libera el tema sin borrar el nombre. Las respuestas siguen siendo escritas en el conjunto de datos y en `neural/conversation.js`; la red no genera lenguaje libre ni código arbitrario.

Si menos del 60 % de las palabras informativas son conocidas, la puntuación máxima es menor que 0.75 o su diferencia con la segunda opción es menor que 0.2, el modelo no acepta la intención. Cuando hay suficiente vocabulario conocido, puede ofrecer dos ejemplos para aclarar la petición mediante botones. Estas puntuaciones no son una medida calibrada de certeza o veracidad.

Para enseñar nuevas intenciones, añade ejemplos variados, un identificador único y una respuesta al conjunto de datos. Ejecuta `npm run train`, después `npm test` y reinicia `npm start`. El entrenamiento guarda los pesos en `neural/model.json` y un reporte en `neural/report.json`. No reemplaza los pesos si falla la clasificación de los ejemplos de entrenamiento o la evaluación de regresión. El modelo se incluye ya entrenado para arrancar sin repetir ese trabajo. Usa la semilla fija 20261025 para poder reproducir el entrenamiento.

### Qué se midió y qué sigue fallando

- Entrenamiento: 278/278 frases reconocidas; la pérdida bajó de aproximadamente 2.96 a 0.021. Esto solo muestra ajuste al conjunto de entrenamiento.
- Evaluación anterior (`neural/evaluation.json`): 19/19, sin usar esas frases para actualizar pesos.
- Desafío ampliado (`neural/challenge.json`): 18/22. El reporte conserva los cuatro errores, incluidas dos erratas y dos formulaciones de capacidades que todavía no reconoce con suficiente seguridad.
- Comparación con la versión publicada en el commit `fe63730`: pasó de 9/20 a 16/20 en las mismas 20 frases adicionales. Los resultados previos se conservan en `neural/baseline.json`. Se cambiaron tanto la arquitectura como los datos, así que no atribuimos toda la mejora a añadir neuronas.

Son conjuntos pequeños de regresión y desarrollo, no una prueba independiente de comprensión general. Algunas frases nuevas fallarán incluso si parecen sencillas. Tampoco significa que JARVIS piense como una persona. El entrenamiento sigue siendo ligero para un equipo con 8 GB de RAM, pero el tiempo depende de la CPU y de los datos. Las pruebas entrenan una vez y reutilizan el modelo para evitar trabajo duplicado.
