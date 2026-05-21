import net from 'net';
import { parsearValorBooleano } from '../utils/utilidadesApp.js';

const DEFAULT_PRINTER_PORT = 9100;
const DEFAULT_TIMEOUT_MS = 4000;
const PRINTER_SETTINGS_KEY = 'ticket_printer';
const TICKET_WIDTH = 32;

function normalizarTextoTicket(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\n]/g, '')
    .trim();
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return `${amount.toFixed(2)} EUR`;
}

function line(char = '-') {
  return char.repeat(TICKET_WIDTH);
}

function leftRight(left, right) {
  const safeLeft = normalizarTextoTicket(left);
  const safeRight = normalizarTextoTicket(right);
  const available = Math.max(1, TICKET_WIDTH - safeRight.length - 1);
  const clippedLeft = safeLeft.length > available ? `${safeLeft.slice(0, available - 1)}.` : safeLeft;
  return `${clippedLeft}${' '.repeat(Math.max(1, TICKET_WIDTH - clippedLeft.length - safeRight.length))}${safeRight}`;
}

function itemLines(item) {
  const quantity = Number.parseInt(item.quantity, 10) || 1;
  const unitPrice = Number(item.price || 0);
  const subtotal = Number(item.subtotal ?? unitPrice * quantity);
  const productName = normalizarTextoTicket(item.product_name || item.name || 'Producto');
  const notes = normalizarTextoTicket(item.notes || '');

  const rows = [leftRight(`${quantity}x ${productName}`, formatMoney(subtotal))];
  if (notes) rows.push(`  ${notes.slice(0, TICKET_WIDTH - 2)}`);
  return rows;
}

function normalizarConfiguracionImpresora(rawConfig = {}, env = process.env) {
  const envHost = String(env.TICKET_PRINTER_HOST || '').trim();
  const host = String(rawConfig.host ?? envHost).trim();
  const port = Number.parseInt(rawConfig.port ?? env.TICKET_PRINTER_PORT ?? DEFAULT_PRINTER_PORT, 10);
  const timeoutMs = Number.parseInt(rawConfig.timeoutMs ?? env.TICKET_PRINTER_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS, 10);
  const enabled = parsearValorBooleano(rawConfig.enabled ?? env.TICKET_PRINTER_ENABLED, Boolean(host));

  return {
    enabled,
    host,
    port: Number.isInteger(port) && port > 0 ? port : DEFAULT_PRINTER_PORT,
    timeoutMs: Number.isInteger(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS,
  };
}

export function crearTicketPrinterService(options = {}) {
  const env = options.env || (options.TICKET_PRINTER_HOST !== undefined ? options : process.env);
  const supabase = options.supabase || null;
  let cachedConfig = normalizarConfiguracionImpresora({}, env);

  async function cargarConfiguracionPersistida() {
    if (!supabase) return cachedConfig;

    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', PRINTER_SETTINGS_KEY)
        .maybeSingle();

      if (error) {
        if (!String(error.message || '').toLowerCase().includes('app_settings')) {
          console.error('No se pudo cargar la configuracion de impresora:', error.message);
        }
        return cachedConfig;
      }

      cachedConfig = normalizarConfiguracionImpresora(data?.value || {}, env);
      return cachedConfig;
    } catch (error) {
      console.error('No se pudo cargar la configuracion de impresora:', error.message);
      return cachedConfig;
    }
  }

  function construirTicket({ orderId, items = [], total = 0, title = 'Pedido cafeteria', customerName = null }) {
    const createdAt = new Date().toLocaleString('es-ES');
    const rows = [
      '\x1B@',
      '\x1Ba\x01',
      'CAFETERIA SSG',
      normalizarTextoTicket(title).toUpperCase(),
      '\x1Ba\x00',
      line(),
      leftRight('Pedido', `#${orderId}`),
      leftRight('Fecha', createdAt),
    ];

    if (customerName) rows.push(leftRight('Cliente', customerName));
    rows.push(line());
    items.flatMap(itemLines).forEach((row) => rows.push(row));
    rows.push(line());
    rows.push(leftRight('TOTAL', formatMoney(total)));
    rows.push('\n\n\n');
    rows.push('\x1DVA\x00');

    return Buffer.from(rows.join('\n'), 'ascii');
  }

  async function imprimirTicketPedido(ticket) {
    const { enabled, host, port, timeoutMs } = await cargarConfiguracionPersistida();
    if (!enabled || !host) return { skipped: true, reason: 'printer_disabled' };

    const payload = construirTicket(ticket);

    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host, port });

      socket.setTimeout(Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS);
      socket.once('connect', () => socket.end(payload));
      socket.once('timeout', () => {
        socket.destroy();
        reject(new Error(`Timeout imprimiendo ticket en ${host}:${port}`));
      });
      socket.once('error', reject);
      socket.once('close', (hadError) => {
        if (!hadError) resolve({ sent: true, host, port });
      });
    });
  }

  async function imprimirTicketPedidoSinFallo(ticket) {
    try {
      return await imprimirTicketPedido(ticket);
    } catch (error) {
      const { host, port } = cachedConfig;
      console.error('No se pudo imprimir el ticket:', {
        host,
        port,
        message: error.message,
      });
      return { sent: false, error };
    }
  }

  return {
    construirTicket,
    cargarConfiguracionPersistida,
    actualizarConfiguracionLocal(config) {
      cachedConfig = normalizarConfiguracionImpresora(config || {}, env);
      return cachedConfig;
    },
    imprimirTicketPedido,
    imprimirTicketPedidoSinFallo,
  };
}
