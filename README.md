# JARVIS

Asistente personal con interfaz web en español, una red neuronal propia de clasificación y contexto de conversación. Entrena y funciona localmente con Node.js, sin paquetes externos, Ollama ni una API. Incluye una conexión opcional a OpenAI, desactivada mientras no haya una clave configurada. La red local selecciona respuestas predefinidas; no es un modelo generativo como ChatGPT.

## Ejecutar

Requiere Node.js 22.9 o superior (recomendado: Node.js 24 LTS). No requiere instalar paquetes externos.

```sh
# Desde la carpeta donde descargaste o clonaste el proyecto:
cd JARVIS
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

Reconoce 13 intenciones y ofrece guías de tres pasos sobre programación, proyectos, organización e inteligencia artificial. «Continúa» avanza dentro del tema activo; «Repite» repite la última respuesta sin avanzar. Al cambiar de tema empieza una guía nueva. Sus explicaciones y ejemplos son predefinidos: no ejecuta código, organiza tu agenda ni resuelve cualquier pregunta.

La memoria usa reglas y se reconstruye únicamente desde los mensajes del usuario incluidos en cada petición. Recuerda el nombre indicado con «Me llamo…», «Mi nombre es…» o «Puedes llamarme…». No modifica los pesos del modelo durante el chat. «Olvida el contexto» reinicia nombre y tema para los siguientes mensajes, pero deja el historial visible; «Nueva conversación» borra el historial local de la aplicación.

El cliente conserva una ventana reciente de hasta 40 mensajes (hasta 38 al enviar). Cuando el mensaje donde diste tu nombre o elegiste un tema sale de esa ventana, ese contexto deja de estar disponible. No hay memoria entre dispositivos ni un almacén compartido en el servidor.

## Conectar un modelo generativo externo (opcional)

Configura `JARVIS_API_KEY` de forma segura en las variables del entorno o copia `.env.example` a `.env` y añade tu clave localmente. Reinicia el servidor después. El modelo predeterminado es `gpt-4.1-mini`; puedes cambiarlo con `JARVIS_MODEL`. La cuenta del proveedor necesita acceso al modelo y saldo; las solicitudes pueden tener coste. La clave permanece en el servidor.

Los mensajes se envían a `https://api.openai.com/v1/responses` solo cuando hay una clave configurada. El servidor solicita `store: false`; las políticas de tratamiento de datos del proveedor siguen siendo aplicables. El historial se guarda en este navegador con `localStorage`; «Nueva conversación» borra el historial de la aplicación en ese navegador. No introduzcas información sensible en equipos compartidos.

## Desarrollo y comprobaciones

```sh
npm run dev
npm test
```

Las pruebas verifican las rutas HTTP, validación, modo local y contrato con el proveedor mediante respuestas simuladas. La llamada a IA real requiere una clave y no forma parte de las pruebas automáticas.

`GET /api/status` informa el modo de funcionamiento; `POST /api/chat` acepta `{ "messages": [{ "role": "user", "content": "Hola" }] }`. Se admiten hasta 40 mensajes, 8000 caracteres por mensaje y 64 KiB por petición. El cliente mantiene una ventana reciente de la conversación.

## Alcance de esta versión

Es una base de desarrollo para uso personal. Incluye acceso privado con un usuario y contraseña mediante HTTP Basic, sin registro de cuentas. No incluye herramientas para controlar dispositivos, voz ni memoria entre dispositivos. El indicador «IA configurada» significa que existe una clave, no que su validez o saldo hayan sido verificados.

## Publicar una web privada en Render

El archivo `render.yaml` prepara un servicio web con HTTPS y contraseña obligatoria. La red neuronal se ejecuta en el servidor sin una API de IA. El alojamiento es un servicio externo y requiere una cuenta de Render; las condiciones y límites del plan gratuito dependen de ese proveedor.

1. Abre https://render.com/deploy?repo=https://github.com/martinocacio7-dot/JARVIS e inicia sesión en Render.
2. Revisa el Blueprint y crea el servicio `jarvis-privado`. No hace falta configurar una clave de OpenAI.
3. En las variables del servicio, consulta de forma privada el valor generado para `JARVIS_PASSWORD`. El usuario predeterminado es `jarvis`. No copies la contraseña a GitHub ni al chat.
4. Cuando termine el despliegue, abre la dirección HTTPS que Render asigne al servicio. El navegador solicitará el usuario y la contraseña antes de mostrar la página o permitir llamadas al chat.
5. Comprueba desde una ventana privada que, sin credenciales, la página pide autenticación y no muestra JARVIS. Después verifica que puedes entrar y enviar «Hola» con tus credenciales.

Render genera una contraseña aleatoria con `generateValue: true`, configura `NODE_ENV=production` y usa el puerto proporcionado por su plataforma. El servidor se niega a arrancar en producción si falta `JARVIS_PASSWORD` o tiene menos de 16 caracteres. La protección abarca la página, los recursos y las rutas API. Tras diez intentos incorrectos se bloquean nuevos intentos hasta finalizar una ventana de un minuto; ese límite es global y se reinicia al reiniciar el proceso.

Comparte únicamente la URL si lo necesitas y conserva la contraseña en privado: cualquiera que obtenga ambas podrá entrar. Usa siempre HTTPS fuera de tu equipo. El navegador puede recordar las credenciales de HTTP Basic; en equipos compartidos usa una ventana privada y cierra todas sus ventanas al terminar. Cambiar la contraseña del servicio y volver a desplegar invalida la anterior.

Este despliegue protege el acceso a la aplicación, pero no cambia la visibilidad del repositorio en GitHub ni impide que los administradores del alojamiento accedan al servidor. El historial permanece en el navegador que uses; no se sincroniza con otros dispositivos. El plan gratuito puede suspender el servicio cuando no hay actividad, así que el primer acceso puede tardar.

Para activar esta misma protección en otro alojamiento, define `NODE_ENV=production`, `JARVIS_USER` y una `JARVIS_PASSWORD` segura de al menos 16 caracteres, y sitúa el servidor detrás de HTTPS. Para desarrollo local puedes dejar la contraseña vacía; nunca publiques ese modo sin protección.

## Red neuronal local

`neural/network.js` implementa una red de una capa: 170 características de palabras y 13 neuronas de salida softmax en el conjunto incluido. Aprende pesos y sesgos mediante descenso de gradiente y entropía cruzada durante 600 épocas. No usa dependencias ni servicios externos.

El conjunto de 128 frases en `neural/intents.json` cubre saludo, identidad, ayuda, agradecimiento, despedida, programación, proyecto, organización, aprendizaje de IA, continuación, consulta de tema, consulta de nombre y repetición. Las respuestas están escritas en ese archivo y en las guías de `neural/conversation.js`; el modelo aprende a elegir la intención. La capa de conversación aplica las reglas de contexto y pasos sobre esa predicción.

Si menos del 60 % de las palabras informativas son conocidas o la puntuación softmax es menor que 0.75, responde que todavía no sabe. Se excluyen palabras comunes al calcular esa cobertura. Son heurísticas: incluso con una puntuación alta puede equivocarse, y no comprenden la semántica de una pregunta arbitraria.

Para enseñar nuevas intenciones, añade ejemplos variados, un identificador único y una respuesta al conjunto de datos. Ejecuta `npm run train`, después `npm test` y reinicia `npm start`. El entrenamiento guarda los pesos en `neural/model.json`; el servidor carga ese archivo al arrancar. Se incluye el modelo entrenado para arrancar sin repetir el entrenamiento. Si deseas un tema con pasos propios, define su guía en `neural/conversation.js` usando el identificador de la intención.

`neural/evaluation.json` contiene 19 frases reservadas, incluidas preguntas fuera del alcance. No se utiliza para ajustar pesos. El entrenamiento informa por separado los aciertos de entrenamiento y los de esta evaluación, y devuelve un error si la evaluación falla. Las pruebas también comprueban nombres, cambios de tema, pasos, reinicio de contexto, aislamiento entre conversaciones y el flujo HTTP completo sin solicitudes externas. Este conjunto pequeño no demuestra capacidad conversacional general.
