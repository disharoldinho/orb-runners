/**
 * Summit lobby server tests: `npm run server:test`.
 * Starts the real server on an ephemeral port and drives it with WebSocket clients.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';
import { createSummitServer } from '../server/summitServer.mjs';

const quiet = { warn() {}, log() {} };
let failures = 0;
const results = [];

async function withServer(opts, fn) {
  const server = createSummitServer({ distDir: null, tickMs: 25, log: quiet, ...opts });
  await new Promise((r) => server.httpServer.listen(0, '127.0.0.1', r));
  const { port } = server.httpServer.address();
  try {
    await fn({
      server,
      port,
      url: `ws://127.0.0.1:${port}/ws-summit`,
      http: `http://127.0.0.1:${port}`,
    });
  } finally {
    await server.close();
  }
}

function client(url) {
  const ws = new WebSocket(url);
  const inbox = [];
  const waiters = [];
  ws.on('message', (raw) => {
    const msg = JSON.parse(String(raw));
    const i = waiters.findIndex((w) => w.pred(msg));
    if (i >= 0) waiters.splice(i, 1)[0].resolve(msg);
    else inbox.push(msg);
  });
  const next = (pred, ms = 2000) => {
    const i = inbox.findIndex(pred);
    if (i >= 0) return Promise.resolve(inbox.splice(i, 1)[0]);
    return new Promise((resolve, reject) => {
      const w = { pred, resolve };
      waiters.push(w);
      setTimeout(() => {
        const j = waiters.indexOf(w);
        if (j >= 0) {
          waiters.splice(j, 1);
          reject(new Error('timeout waiting for message'));
        }
      }, ms);
    });
  };
  const open = new Promise((r, j) => {
    ws.once('open', r);
    ws.once('error', j);
  });
  const send = (o) => ws.send(typeof o === 'string' ? o : JSON.stringify(o));
  const join = async (o) => {
    send({ type: 'join-or-create', climber: { name: 'T' }, ...o });
    return next((m) => m.type === 'lobby-joined' || m.type === 'lobby-error');
  };
  const roomState = (code) =>
    next((m) => m.type === 'room-state' && (!code || m.lobbyCode === code));
  const close = () =>
    new Promise((r) => {
      if (ws.readyState === WebSocket.CLOSED) return r();
      ws.once('close', r);
      ws.close();
    });
  return { ws, open, send, join, next, roomState, close, clearInbox: () => (inbox.length = 0) };
}

const settle = (ms = 80) => new Promise((r) => setTimeout(r, ms));

async function test(name, fn) {
  try {
    await fn();
    results.push(`ok   ${name}`);
  } catch (err) {
    failures++;
    results.push(`FAIL ${name}\n     ${err.stack?.split('\n').slice(0, 3).join('\n     ')}`);
  }
}

await test('public join receives room-state with bots', () =>
  withServer({}, async ({ url }) => {
    const a = client(url);
    await a.open;
    const j = await a.join({ mode: 'public' });
    assert.equal(j.type, 'lobby-joined');
    assert.equal(j.lobbyCode, 'PUBLIC');
    const st = await a.roomState('PUBLIC');
    assert.ok(st.climbers.some((c) => c.id === j.clientId));
    assert.ok(st.climbers.filter((c) => c.isBot).length >= 5);
    await a.close();
  }));

await test('create private room, second client joins with password; wrong password rejected', () =>
  withServer({}, async ({ server, url }) => {
    const host = client(url);
    const guest = client(url);
    await Promise.all([host.open, guest.open]);
    const j = await host.join({
      mode: 'create',
      lobbyCode: 'abc-1',
      password: 'pw',
      includeBots: false,
    });
    assert.equal(j.lobbyCode, 'ABC-1');
    assert.equal(j.includeBots, false);
    const bad = await guest.join({ mode: 'join', lobbyCode: 'ABC-1', password: 'nope' });
    assert.equal(bad.type, 'lobby-error');
    assert.equal(bad.code, 'bad-password');
    const ok = await guest.join({ mode: 'join', lobbyCode: 'abc-1', password: 'pw' });
    assert.equal(ok.type, 'lobby-joined');
    assert.equal(server.rooms.get('ABC-1').clients.size, 2);
    const st = await host.roomState('ABC-1');
    assert.equal(st.climbers.filter((c) => c.isBot).length, 0);
    await host.close();
    await guest.close();
  }));

await test('creating a taken code gets a fresh code instead of hijacking the room', () =>
  withServer({}, async ({ url }) => {
    const a = client(url);
    const b = client(url);
    await Promise.all([a.open, b.open]);
    await a.join({ mode: 'create', lobbyCode: 'SAME' });
    const j = await b.join({ mode: 'create', lobbyCode: 'SAME' });
    assert.notEqual(j.lobbyCode, 'SAME');
    await a.close();
    await b.close();
  }));

await test('empty private room is deleted when its last climber disconnects', () =>
  withServer({}, async ({ server, url }) => {
    const a = client(url);
    await a.open;
    await a.join({ mode: 'create', lobbyCode: 'GONE1' });
    assert.ok(server.rooms.has('GONE1'));
    await a.close();
    await settle();
    assert.ok(!server.rooms.has('GONE1'));
    assert.ok(server.rooms.has('PUBLIC'), 'PUBLIC must never be deleted');
  }));

await test('switching lobby on the same socket deletes the empty private room it left', () =>
  withServer({}, async ({ server, url }) => {
    const a = client(url);
    await a.open;
    await a.join({ mode: 'create', lobbyCode: 'OLD1' });
    await a.join({ mode: 'create', lobbyCode: 'NEW1' });
    assert.ok(!server.rooms.has('OLD1'), 'old empty room must be deleted');
    assert.ok(server.rooms.has('NEW1'));
    await a.join({ mode: 'public' });
    assert.ok(!server.rooms.has('NEW1'));
    assert.equal(server.rooms.get('PUBLIC').clients.size, 1);
    await a.close();
  }));

await test('switching lobby keeps a non-empty private room alive', () =>
  withServer({}, async ({ server, url }) => {
    const a = client(url);
    const b = client(url);
    await Promise.all([a.open, b.open]);
    await a.join({ mode: 'create', lobbyCode: 'KEEP' });
    await b.join({ mode: 'join', lobbyCode: 'KEEP' });
    await a.join({ mode: 'public' });
    assert.ok(server.rooms.has('KEEP'));
    assert.equal(server.rooms.get('KEEP').clients.size, 1);
    await a.close();
    await b.close();
  }));

await test('failed switch (unknown code / bad password) leaves the old room and deletes it if empty', () =>
  withServer({}, async ({ server, url }) => {
    // Lobby semantics verified in #15: the browser client returns to the lobby screen on any
    // lobby-error, so a failed switch must not keep the socket (or an empty room) around.
    const host = client(url);
    const a = client(url);
    const b = client(url);
    await Promise.all([host.open, a.open, b.open]);
    await host.join({ mode: 'create', lobbyCode: 'LOCK', password: 'x' });
    await a.join({ mode: 'create', lobbyCode: 'MINE' });
    const err1 = await a.join({ mode: 'join', lobbyCode: 'NOPE99' });
    assert.equal(err1.type, 'lobby-error');
    assert.equal(err1.code, 'not-found');
    assert.ok(!server.rooms.has('MINE'), 'empty room left by a failed switch is deleted');
    // A room that still has someone in it survives a failed switch by another climber.
    await a.join({ mode: 'create', lobbyCode: 'SHARED' });
    await b.join({ mode: 'join', lobbyCode: 'SHARED' });
    const err2 = await a.join({ mode: 'join', lobbyCode: 'LOCK', password: 'bad' });
    assert.equal(err2.type, 'lobby-error');
    assert.equal(err2.code, 'bad-password');
    assert.equal(server.rooms.get('SHARED').clients.size, 1);
    assert.equal(server.rooms.get('LOCK').clients.size, 1);
    // After the error the socket is in no room: state updates are ignored, joins still work.
    a.send({ type: 'state-update', position: [1, 2, 3] });
    await settle();
    assert.equal(server.rooms.get('SHARED').clients.size, 1);
    const ok = await a.join({ mode: 'join', lobbyCode: 'LOCK', password: 'x' });
    assert.equal(ok.type, 'lobby-joined');
    assert.equal(server.rooms.get('LOCK').clients.size, 2);
    await Promise.all([host.close(), a.close(), b.close()]);
  }));

await test('re-joining your own room while alone in it keeps the room', () =>
  withServer({}, async ({ server, url }) => {
    const a = client(url);
    await a.open;
    await a.join({ mode: 'create', lobbyCode: 'SOLO', password: 'pw' });
    const j = await a.join({ mode: 'join', lobbyCode: 'SOLO', password: 'pw' });
    assert.equal(j.type, 'lobby-joined');
    assert.ok(server.rooms.has('SOLO'));
    assert.equal(server.rooms.get('SOLO').clients.size, 1);
    await a.close();
  }));

await test('reconnecting host can recreate its room under the same code', () =>
  withServer({}, async ({ server, url }) => {
    const a = client(url);
    await a.open;
    await a.join({ mode: 'create', lobbyCode: 'BACK1', password: 'pw', includeBots: false });
    await a.close();
    await settle();
    assert.ok(!server.rooms.has('BACK1'));
    const b = client(url);
    await b.open;
    const j = await b.join({
      mode: 'join',
      lobbyCode: 'BACK1',
      password: 'pw',
      recreate: true,
      includeBots: false,
    });
    assert.equal(j.type, 'lobby-joined');
    assert.equal(j.lobbyCode, 'BACK1');
    assert.equal(j.includeBots, false);
    // A plain join (no recreate) of a missing room still fails.
    const c = client(url);
    await c.open;
    const e = await c.join({ mode: 'join', lobbyCode: 'NOTHERE' });
    assert.equal(e.type, 'lobby-error');
    assert.ok(!server.rooms.has('NOTHERE'));
    await b.close();
    await c.close();
  }));

await test('explicit leave removes the climber and deletes the empty room', () =>
  withServer({}, async ({ server, url }) => {
    const a = client(url);
    await a.open;
    await a.join({ mode: 'create', lobbyCode: 'BYE1' });
    a.send({ type: 'leave' });
    await settle();
    assert.ok(!server.rooms.has('BYE1'));
    await a.close();
  }));

await test('malformed messages are ignored and never crash the server', () =>
  withServer({}, async ({ server, url }) => {
    const a = client(url);
    await a.open;
    for (const raw of ['not json', 'null', '42', '"str"', '[]', '{"type":"state-update"}'])
      a.send(raw);
    a.send({ type: 'join-or-create', mode: 'public', climber: null });
    const j = await a.next((m) => m.type === 'lobby-joined');
    assert.equal(j.lobbyCode, 'PUBLIC');
    a.send({ type: 'join-or-create', mode: 'join', lobbyCode: { toString: 1 } });
    a.send({ type: 'join-or-create', mode: 'create', lobbyCode: ['x'], lobbyName: 5 });
    await settle();
    const again = await a.join({ mode: 'public' });
    assert.equal(again.type, 'lobby-joined');
    assert.ok(server.rooms.has('PUBLIC'));
    await a.close();
  }));

console.log(results.join('\n'));
console.log(failures ? `\n${failures} FAILED` : `\nALL ${results.length} SERVER TESTS PASSED`);
process.exit(failures ? 1 : 0);
