import { createServer } from '../server.js';
import { createDesktop } from '../assistant/desktop.js';
// Deliberately local: do not inherit HOST=0.0.0.0 or enable a remote language model.
const server = createServer({ apiKey: '', desktop: createDesktop(), auth: { production: false } });
const port = Number(process.env.PORT || 3000);
server.listen(port, '127.0.0.1', () => console.log(`JARVIS PC: abre http://127.0.0.1:${server.address().port}. Cierra este proceso para detener el acceso al PC.`));
