import { predict, tokenize } from './network.js';
import { answerLesson, lessonTitle } from '../knowledge/lessons.js';

const topics = {
  programacion: {
    name: 'programación',
    steps: [
      'Una variable guarda un dato. Prueba en la consola del navegador: const nombre = "Miguel"; console.log(nombre); Cambia el nombre y observa el resultado.',
      'Una condición permite decidir: const tareas = 3; if (tareas > 0) { console.log("Hay pendientes"); } Cambia tareas a 0 y observa qué ocurre.',
      'Una función agrupa instrucciones: function saludar(nombre) { return "Hola, " + nombre; } console.log(saludar("Miguel")); Practica cambiando el argumento.'
    ]
  },
  proyecto: {
    name: 'tu proyecto',
    steps: [
      'Define una primera versión con una sola función útil. Por ejemplo: añadir una tarea y verla en una lista. Deja las cuentas y las notificaciones para después.',
      'Dibuja la pantalla en papel: un campo para escribir, un botón para añadir y una lista. Ese boceto te servirá para construir la interfaz.',
      'Comprueba un flujo completo: añadir una tarea, verla y marcarla como terminada. Anota los errores antes de incorporar más funciones.'
    ]
  },
  organizacion: {
    name: 'organizar tu día',
    steps: [
      'Elige hasta tres prioridades. Separa lo urgente de lo importante y comienza por una tarea concreta que puedas terminar hoy.',
      'Reserva bloques realistas de tiempo y pequeños descansos. Por ejemplo: 25 minutos para una tarea, seguidos de 5 minutos de descanso.',
      'Al terminar el día, revisa lo completado y mueve lo pendiente al siguiente. Ajusta tu plan a lo que realmente pudiste hacer.'
    ]
  },
  aprendizaje_ia: {
    name: 'inteligencia artificial',
    steps: [
      'Ejemplo: «hola» activa características de palabras, pares de palabras y fragmentos de texto. Mi capa oculta combina esas entradas con una función tanh. La capa de salida usa softmax para puntuar las intenciones.',
      'Entrenar consiste en comparar la intención predicha con la etiqueta correcta y ajustar los pesos mediante descenso de gradiente. Aquí usamos ejemplos escritos en neural/intents.json.',
      'Para comprobar el aprendizaje, prueba frases que no estén en los ejemplos. Acertar las frases de entrenamiento no garantiza entender frases nuevas; tampoco equivale a generar lenguaje libre.'
    ]
  }
};

// Solo se conserva estado durante esta petición. Se reconstruye con los mensajes
// del usuario: nunca se comparten recuerdos entre navegadores ni se confía en
// respuestas del asistente para establecer nombres o temas.
export function respond(model, messages) {
  let name = null;
  let lesson = null;
  let topic = null;
  let step = 0;
  let lastReply = null;
  let result;
  for (const message of messages) {
    if (message.role !== 'user') continue;
    const text = message.content.trim();
    const normalized = tokenize(text).join(' ');
    const introduction = text.match(/^(?:me llamo|mi nombre es|puedes llamarme)\s+([\p{L}]+(?:[ '\-][\p{L}]+){0,3})[.!]?$/iu);
    if (['olvida el contexto', 'olvida mi nombre', 'borra el contexto', 'olvida todo'].includes(normalized)) {
      name = null;
      lesson = null;
      topic = null;
      step = 0;
      result = { intent: 'olvidar_contexto', reply: 'He reiniciado el nombre y el tema para los mensajes siguientes. El historial sigue visible; usa «Nueva conversación» para borrarlo del navegador.' };
    } else if (introduction && introduction[1].length <= 50) {
      name = introduction[1];
      result = { intent: 'guardar_nombre', reply: `Encantado, ${name}. Usaré tu nombre mientras esté en el historial reciente de esta conversación.` };
    } else {
      const taught = answerLesson(text, lesson);
      if (taught) {
        lesson = taught.state;
        result = { kind: 'lesson', intent: taught.intent, reply: taught.reply };
        topic = lesson ? 'programacion' : null;
        step = 0;
      } else result = predict(model, text);
      if (result.intent === 'desconocido') {
        result.reply = topic
          ? `No entendí qué necesitas sobre ${lessonTitle(lesson) || topics[topic].name}. ¿Quieres una explicación, un ejemplo o ayuda con algo concreto?`
          : 'No entendí bien lo que necesitas. ¿Qué quieres hacer y con qué necesitas ayuda? Puedes darme un ejemplo. Mi modo local todavía no responde cualquier tema.';
      }
      if (result.intent === 'cancelar') {
        lesson = null;
        topic = null;
        step = 0;
      } else if (result.intent === 'memoria') {
        result.reply = `En el historial reciente: ${name ? `tu nombre es ${name}` : 'no tengo un nombre guardado'}; ${topic ? `el tema es ${(lessonTitle(lesson) || topics[topic].name)}` : 'no hay un tema activo'}. La biblioteca guarda documentos por separado cuando su base de datos está conectada. Conversar no cambia mis pesos.`;
      } else if (topics[result.intent] && !taught) {
        lesson = null;
        topic = result.intent;
        step = 0;
      } else if (result.intent === 'consultar_nombre' && name) {
        result.reply = `Me dijiste que te llamas ${name}.`;
      } else if (result.intent === 'recordar_tema' && topic) {
        result.reply = `Estábamos hablando de ${(lessonTitle(lesson) || topics[topic].name)}. Escribe «Continúa» para seguir desde donde nos quedamos.`;
      } else if (result.intent === 'continuar' && topic) {
        const current = topics[topic];
        result.reply = step < current.steps.length
          ? `Seguimos con ${current.name}. Paso ${step + 1}: ${current.steps[step++]}`
          : `Llegamos al final de mi guía de ${current.name}. Puedes repetir el último paso o elegir otro tema. Todavía no genero explicaciones fuera de estas guías.`;
      } else if (result.intent === 'repetir' && lastReply) {
        result.reply = lastReply;
      } else if (result.intent === 'saludo' && name) {
        result.reply = `Hola, ${name}. ${topic ? `Podemos continuar con ${(lessonTitle(lesson) || topics[topic].name)}.` : '¿Quieres aprender programación, crear un proyecto u organizar tu día?'}`;
      }
    }
    lastReply = result.reply;
  }
  return result;
}
