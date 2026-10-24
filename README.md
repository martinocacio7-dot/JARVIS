# JARVIS

Primera versión de un asistente personal con interfaz web en español, chat, sugerencias y un historial local. Usa un modelo existente mediante la API de OpenAI; este proyecto no entrena un modelo desde cero.

## Ejecutar

Requiere Node.js 22.9 o superior (recomendado: Node.js 24 LTS). No requiere instalar paquetes externos.

```sh
cd /workspace/JARVIS
npm start
```

El servidor usa el puerto 3000. Sin credenciales se usa una red neuronal local de clasificación de intenciones con respuestas predefinidas. No genera texto libre.

## Conectar la IA

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

Es una base de desarrollo para uso personal. No incluye cuentas, autenticación, herramientas para controlar dispositivos, voz ni memoria entre dispositivos. Antes de publicarlo en Internet, añade autenticación y límites de uso para proteger el acceso a tu cuenta del proveedor. El indicador «IA configurada» significa que existe una clave, no que su validez o saldo hayan sido verificados.

## Red neuronal local

`neural/network.js` implementa una red de una capa: 51 características de palabras y 5 neuronas de salida softmax en el conjunto inicial. Aprende pesos y sesgos mediante descenso de gradiente y entropía cruzada durante 600 épocas. No usa dependencias ni servicios externos.

El conjunto inicial de 30 frases en `neural/intents.json` cubre saludo, identidad, ayuda, agradecimiento y despedida. Las respuestas están escritas en ese archivo; el modelo aprende a elegir la intención. Si faltan palabras conocidas o confianza suficiente, responde que todavía no sabe. La confianza softmax no es una garantía de corrección. No interpreta el historial ni aprende de los mensajes de usuarios.

Para enseñar nuevas intenciones, añade ejemplos variados, un identificador único y una respuesta al conjunto de datos. Ejecuta `npm run train`, después `npm test` y reinicia `npm start`. El entrenamiento guarda los pesos en `neural/model.json`; el servidor carga ese archivo al arrancar. Se incluye el modelo inicial para arrancar sin entrenar. Las pruebas cubren las frases de entrenamiento, algunas combinaciones reservadas y entradas desconocidas; no demuestran capacidad conversacional general.
