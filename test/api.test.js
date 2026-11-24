// Pruebas de los endpoints con el ejecutor nativo de Node (node --test).
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nails-spa-'));
process.env.DATA_FILE = path.join(dir, 'turnos.json');

const app = require('../index');
const { PORCENTAJE_RECARGO } = require('../services/tarifa.service');

let server;
let base;

before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://localhost:${server.address().port}/api`;
});

after(() => {
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const post = (body) =>
  fetch(`${base}/turnos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const turnoValido = {
  cliente: 'Laura Gómez',
  telefono: '3001234567',
  servicio: 'unas-gel',
  manicurista: 'Paola',
  fecha: '2026-12-05',
  hora: '10:00',
  precioBase: 60000,
};

test('GET /api/turnos responde 200 con un arreglo', async () => {
  const res = await fetch(`${base}/turnos`);
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(await res.json()));
});

test('POST no prioritario -> 201 y totalPagar = precioBase', async () => {
  const res = await post(turnoValido);
  assert.strictEqual(res.status, 201);
  const t = await res.json();
  assert.strictEqual(t.totalPagar, 60000);
  assert.strictEqual(t.horaFin, '11:30'); // uñas en gel = 90 min
  assert.strictEqual(t.estado, 'activa');
});

test('POST prioritario -> 201 con recargo N × 2 %', async () => {
  const res = await post({ ...turnoValido, manicurista: 'Andrea', prioritario: true });
  assert.strictEqual(res.status, 201);
  const t = await res.json();
  assert.strictEqual(t.porcentajeRecargo, PORCENTAJE_RECARGO);
  assert.strictEqual(t.totalPagar, 60000 + 60000 * (PORCENTAJE_RECARGO / 100));
});

test('GET /api/turnos/:id existente -> 200', async () => {
  const res = await fetch(`${base}/turnos/1`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual((await res.json()).id, 1);
});

test('GET /api/turnos/:id inexistente -> 404', async () => {
  for (const id of ['999', 'abc']) {
    const res = await fetch(`${base}/turnos/${id}`);
    assert.strictEqual(res.status, 404);
    assert.ok((await res.json()).error);
  }
});

test('POST con campos faltantes -> 400', async () => {
  const res = await post({ cliente: 'Ana' });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.match(body.detalles[0], /Faltan campos obligatorios/);
});

test('POST con precioBase <= 0 o no numérico -> 400', async () => {
  for (const precioBase of [0, -5000, '60000']) {
    const res = await post({ ...turnoValido, hora: '15:00', precioBase });
    assert.strictEqual(res.status, 400, `precioBase=${JSON.stringify(precioBase)}`);
  }
});

test('POST con fecha, hora, servicio o prioritario inválidos -> 400', async () => {
  const casos = [
    { fecha: '2026-02-30' },
    { hora: '25:00' },
    { servicio: 'masaje' },
    { prioritario: 'si' },
  ];
  for (const caso of casos) {
    const res = await post({ ...turnoValido, hora: '16:00', ...caso });
    assert.strictEqual(res.status, 400, JSON.stringify(caso));
  }
});

test('POST con JSON mal formado -> 400 sin detener el servidor', async () => {
  const res = await post('{"cliente": ');
  assert.strictEqual(res.status, 400);
  assert.strictEqual((await fetch(`${base}/turnos`)).status, 200);
});

test('POST que se cruza con otra cita de la misma manicurista -> 409', async () => {
  const res = await post({ ...turnoValido, hora: '11:00', servicio: 'manicura' });
  assert.strictEqual(res.status, 409);
});

test('Cancelar libera el horario; cancelar id inexistente -> 404', async () => {
  assert.strictEqual((await fetch(`${base}/turnos/1/cancelar`, { method: 'PATCH' })).status, 200);
  assert.strictEqual((await post({ ...turnoValido, hora: '11:00', servicio: 'manicura' })).status, 201);
  assert.strictEqual((await fetch(`${base}/turnos/999/cancelar`, { method: 'PATCH' })).status, 404);
});

test('Ruta inexistente -> 404', async () => {
  assert.strictEqual((await fetch(`${base}/no-existe`)).status, 404);
});
