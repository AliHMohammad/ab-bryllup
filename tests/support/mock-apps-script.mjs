/**
 * Efterligner Google Apps Script-webappen, så testene kan køre uden at røre
 * et rigtigt Google Sheet.
 *
 * Testene styrer serveren via kontrol-endpoints under /__test:
 *   POST /__test/reset            nulstiller alle rækker
 *   GET  /__test/rows             returnerer alt hvad serveren har modtaget
 *   POST /__test/seed             indsætter rækker direkte (body: { entries: [...] })
 *   POST /__test/fail             næste kald fejler (body: { mode: 'error' | 'off' })
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.MOCK_PORT ?? 9999);
const SECRET = process.env.MOCK_SECRET ?? 'test-secret';

/** @type {{date: string, name: string, message: string, approved: boolean, secretOk: boolean}[]} */
let rows = [];
let failMode = 'off';

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
  });

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');

  // --- Kontrol-endpoints (kun til test) ---
  if (url.pathname.startsWith('/__test')) {
    if (url.pathname === '/__test/reset') {
      rows = [];
      failMode = 'off';
      return send(res, 200, { ok: true });
    }
    if (url.pathname === '/__test/rows') {
      return send(res, 200, { rows });
    }
    if (url.pathname === '/__test/seed') {
      const body = await readBody(req);
      rows = rows.concat(body.entries ?? []);
      return send(res, 200, { ok: true, count: rows.length });
    }
    if (url.pathname === '/__test/fail') {
      const body = await readBody(req);
      failMode = body.mode ?? 'off';
      return send(res, 200, { ok: true, failMode });
    }
    return send(res, 404, { error: 'ukendt kontrol-endpoint' });
  }

  if (failMode === 'error') {
    return send(res, 500, { error: 'simuleret fejl fra Apps Script' });
  }

  // --- doGet: kun godkendte hilsner, nyeste først ---
  if (req.method === 'GET') {
    if (url.searchParams.get('secret') !== SECRET) {
      return send(res, 200, { error: 'unauthorized' });
    }
    const entries = rows
      .filter((row) => row.approved)
      .map(({ date, name, message }) => ({ date, name, message }))
      .reverse();
    return send(res, 200, { entries });
  }

  // --- doPost: tilføj række, ikke godkendt som udgangspunkt ---
  if (req.method === 'POST') {
    const body = await readBody(req);
    if (body.secret !== SECRET) {
      return send(res, 200, { error: 'unauthorized' });
    }
    rows.push({
      date: body.submittedAt ?? new Date().toISOString(),
      name: body.name ?? '',
      message: body.message ?? '',
      approved: false,
      secretOk: true,
    });
    return send(res, 200, { ok: true });
  }

  return send(res, 405, { error: 'metode ikke understøttet' });
}).listen(PORT, () => {
  console.log(`mock apps script klar på http://localhost:${PORT}`);
});
