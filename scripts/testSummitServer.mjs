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
    await fn({ server, port, url: `ws://127.0.0.1:${port}/ws-summit`, http: `http://127.0.0.1:${port}` });
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
  const roomState = (code) => next((m) => m.type === 'room-state' && (!code || m.lobbyCode === code));
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
    const j = await host.join({ mode: 'create', lobbyCode: 'abc-1', password: 'pw', includeBots: false });
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

await test('failed join (unknown code / bad password) leaves the climber in their current room', () =>
  withServer({}, async ({ server, url }) => {
    const host = client(url);
    const a = client(url);
    await Promise.all([host.open, a.open]);
    await host.join({ mode: 'create', lobbyCode: 'LOCK', password: 'x' });
    const j = await a.join({ mode: 'create', lobbyCode: 'MINE' });
    const err1 = await a.join({ mode: 'join', lobbyCode: 'NOPE99' });
    assert.equal(err1.type, 'lobby-error');
    assert.equal(err1.code, 'not-found');
    assert.equal(err1.lobbyCode, 'MINE');
    const err2 = await a.join({ mode: 'join', lobbyCode: 'LOCK', password: 'bad' });
    assert.equal(err2.type, 'lobby-error');
    assert.ok(server.rooms.has('MINE'), 'room must survive a failed switch');
    assert.equal(server.rooms.get('MINE').clients.size, 1);
    a.clearInbox();
    // Still receives its room's state and its updates are still applied.
    a.send({ type: 'state-update', position: [1, 2, 3], altitudeM: 7 });
    await settle();
    const st = await a.roomState('MINE');
    const me = st.climbers.find((c) => c.id === j.clientId);
    assert.deepEqual(me.position, [1, 2, 3]);
    assert.equal(me.altitudeM, 7);
    await host.close();
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
    const j = await b.join({ mode: 'join', lobbyCode: 'BACK1', password: 'pw', recreate: true, includeBots: false });
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

await test('malformed, hostile and oversized messages are sanitised or ignored', () =>
  withServer({}, async ({ server, url }) => {
    const a = client(url);
    await a.open;
    a.send('not json');
    a.send('null');
    a.send('42');
    const j = await a.join({ mode: 'public', climber: { name: '\u0000'.repeat(3) + 'x'.repeat(50), position: 'bad' } });
    a.send({
      type: 'state-update',
      name: '',
      position: [NaN, 1e12, 'x'],
      yaw: 'y',
      altitudeM: Infinity,
      emote: '👋'.repeat(100),
      avatar: { name: 'n'.repeat(200), primaryColor: '#fff', evil: { deep: 1 } },
    });
    await settle();
    const me = server.rooms.get('PUBLIC').clients.get([...server.rooms.get('PUBLIC').clients.keys()][0]);
    assert.equal(me.id, j.clientId);
    assert.equal(me.name.length, 18);
    assert.deepEqual(me.position, [0, 1, 0]);
    assert.ok(Number.isFinite(me.altitudeM));
    assert.equal(me.emote, null, 'unknown emote text must be dropped');
    assert.equal(me.avatar.name.length, 32);
    assert.equal(me.avatar.evil, undefined);
    // Oversized payload: the socket is dropped, the server keeps running and cleans up.
    const big = client(url);
    await big.open;
    await big.join({ mode: 'create', lobbyCode: 'BIG1' });
    const closed = new Promise((r) => big.ws.once('close', r));
    big.send({ type: 'state-update', name: 'x'.repeat(40000) });
    await closed;
    await settle();
    assert.ok(!server.rooms.has('BIG1'));
    const again = await a.join({ mode: 'public' });
    assert.equal(again.type, 'lobby-joined');
    await a.close();
  }));

await test('emotes: sticker ids and legacy emoji pass, anything else is dropped', () =>
  withServer({}, async ({ server, url }) => {
    const a = client(url);
    await a.open;
    await a.join({ mode: 'create', lobbyCode: 'EMO1', includeBots: false });
    const me = () => [...server.rooms.get('EMO1').clients.values()][0];
    for (const [sent, want] of [
      ['laugh', 'laugh'],
      ['gg', 'gg'],
      ['👋', '👋'],
      ['👑', '👑'],
      ['<script>', null],
      ['hello', null],
      [42, null],
    ]) {
      a.send({ type: 'state-update', emote: sent });
      await settle(40);
      assert.equal(me().emote, want, `emote ${sent}`);
    }
    await a.close();
  }));

await test('dead sockets (no pong) are terminated by the heartbeat and removed', () =>
  withServer({ heartbeatMs: 60 }, async ({ server, url }) => {
    const a = client(url);
    await a.open;
    await a.join({ mode: 'create', lobbyCode: 'ZOMBIE' });
    // Simulate a frozen phone: stop answering pings.
    a.ws.pong = () => {};
    a.ws._receiver.removeAllListeners('ping');
    a.ws._receiver.on('ping', () => {});
    const closed = new Promise((r) => a.ws.once('close', r));
    await closed;
    await settle();
    assert.ok(!server.rooms.has('ZOMBIE'));
  }));

await test('http: lobby list, SPA fallback, 404 for missing assets, no path traversal', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-dist-'));
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<html>shell</html>');
  fs.writeFileSync(path.join(dir, 'assets', 'app-abc.js'), 'console.log(1)');
  await withServer({ distDir: dir }, async ({ http }) => {
    const l = await (await fetch(`${http}/api/lobbies`)).json();
    assert.equal(l.status, 'online');
    assert.ok(l.rooms.some((r) => r.code === 'PUBLIC'));
    const shell = await fetch(`${http}/some/route`);
    assert.equal(shell.status, 200);
    assert.equal(shell.headers.get('cache-control'), 'no-cache');
    assert.match(await shell.text(), /shell/);
    const js = await fetch(`${http}/assets/app-abc.js`);
    assert.match(js.headers.get('cache-control'), /immutable/);
    assert.match(js.headers.get('content-type'), /javascript/);
    assert.equal((await fetch(`${http}/assets/missing-123.js`)).status, 404);
    for (const p of ['/../../../../etc/passwd', '/%2e%2e/%2e%2e/etc/passwd', '/..%2f..%2fetc%2fpasswd']) {
      const r = await fetch(`${http}${p}`);
      const t = await r.text();
      assert.ok(!/root:/.test(t), `traversal via ${p}`);
    }
    assert.equal((await fetch(`${http}/%E0%A4%A`)).status, 400);
  });
  fs.rmSync(dir, { recursive: true, force: true });
});

console.log(results.join('\n'));
console.log(failures ? `\n${failures} FAILED` : `\nALL ${results.length} SERVER TESTS PASSED`);
process.exit(failures ? 1 : 0);
