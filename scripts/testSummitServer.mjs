/**
 * Summit lobby server tests: `npm run server:test`.
 * Starts the real server on an ephemeral port and drives it with WebSocket clients.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import nodeHttp from 'node:http';
import zlib from 'node:zlib';
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

await test('malformed, hostile and oversized messages are sanitised or ignored', () =>
  withServer({}, async ({ server, url }) => {
    const a = client(url);
    await a.open;
    a.send('not json');
    a.send('null');
    a.send('42');
    const j = await a.join({
      mode: 'public',
      climber: { name: '\u0000'.repeat(3) + 'x'.repeat(50), position: 'bad' },
    });
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
    const me = server.rooms
      .get('PUBLIC')
      .clients.get([...server.rooms.get('PUBLIC').clients.keys()][0]);
    assert.equal(me.id, j.clientId);
    assert.equal(me.name.length, 18);
    assert.deepEqual(me.position, [0, 1, 0]);
    assert.ok(Number.isFinite(me.altitudeM));
    assert.equal(me.emote, null, 'unknown emote text must be dropped');
    assert.equal(me.avatar.name.length, 32);
    assert.equal(me.avatar.evil, undefined);
    assert.equal(me.avatar.primaryColor, '#fff');
    assert.equal(me.avatar.bodyType, 'critter', 'missing avatar keys get defaults');
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

await test('relayed climbers carry only validated fields (no spoofing, clamping, yaw wrap)', () =>
  withServer({}, async ({ url }) => {
    const a = client(url);
    const b = client(url);
    await Promise.all([a.open, b.open]);
    const ja = await a.join({
      mode: 'create',
      lobbyCode: 'VAL1',
      lobbyName: 'Room\u0000\u202e\u0007 name that is way too long for the lobby list',
      includeBots: false,
      climber: [1, 2, 3],
    });
    assert.equal(ja.lobbyName, 'Room name that is way too long f');
    await b.join({ mode: 'join', lobbyCode: 'VAL1' });
    a.send({
      type: 'state-update',
      id: 'spoofed-id',
      isBot: true,
      extra: { huge: 'x'.repeat(1000) },
      position: [1e9, -1e9, 1.23456],
      yaw: 7 * Math.PI,
      altitudeM: 1e9,
      avatar: {
        bodyType: '<img src=x>',
        primaryColor: 'red; background:url(x)',
        secondaryColor: '#123456',
      },
      emote: 'gg',
    });
    await settle();
    b.clearInbox();
    const st = await b.roomState('VAL1');
    const me = st.climbers.find((c) => c.id === ja.clientId);
    assert.ok(me, 'id cannot be spoofed');
    assert.deepEqual(Object.keys(me).sort(), [
      'altitudeM',
      'avatar',
      'emote',
      'id',
      'isBot',
      'name',
      'peakAltitudeM',
      'position',
      'yaw',
    ]);
    assert.equal(me.isBot, false);
    assert.deepEqual(me.position, [5000, -5000, 1.23]);
    assert.ok(Math.abs(Math.abs(me.yaw) - Math.PI) < 0.01, `yaw wrapped, got ${me.yaw}`);
    assert.equal(me.altitudeM, 5000);
    assert.equal(me.avatar.bodyType, 'critter');
    assert.equal(me.avatar.primaryColor, '#FF9F1C');
    assert.equal(me.avatar.secondaryColor, '#123456');
    assert.equal(me.emote, 'gg');
    assert.equal(me.name, 'Climber', 'array climber payload ignored');
    await Promise.all([a.close(), b.close()]);
  }));

await test('rate limit: messages over budget are dropped, a flood closes the socket (1008)', () =>
  withServer(
    { limits: { msgPerSec: 20, msgBurst: 5, maxDroppedMsgs: 1000 } },
    async ({ server, url }) => {
      const a = client(url);
      await a.open;
      await a.join({ mode: 'create', lobbyCode: 'RATE1', includeBots: false });
      for (let i = 1; i <= 50; i++) a.send({ type: 'state-update', altitudeM: i });
      await settle(150);
      const me = [...server.rooms.get('RATE1').clients.values()][0];
      assert.ok(
        me.altitudeM >= 4 && me.altitudeM <= 10,
        `only the burst is applied, got ${me.altitudeM}`,
      );
      assert.equal(a.ws.readyState, WebSocket.OPEN, 'dropping is not disconnecting');
      // Back under the rate: updates apply again.
      await settle(300);
      a.send({ type: 'state-update', altitudeM: 99 });
      await settle();
      assert.equal([...server.rooms.get('RATE1').clients.values()][0].altitudeM, 99);
      await a.close();
    },
  ).then(() =>
    withServer({}, async ({ server, url }) => {
      // Default limits: a 20 Hz client never trips them, a flood gets the socket closed.
      const ok = client(url);
      await ok.open;
      await ok.join({ mode: 'create', lobbyCode: 'RATE2', includeBots: false });
      for (let i = 0; i < 30; i++) {
        ok.send({ type: 'state-update', altitudeM: i });
        await settle(50);
      }
      assert.equal([...server.rooms.get('RATE2').clients.values()][0].altitudeM, 29);
      const flood = client(url);
      await flood.open;
      await flood.join({ mode: 'create', lobbyCode: 'FLOOD', includeBots: false });
      const closed = new Promise((r) => flood.ws.once('close', (code) => r(code)));
      for (let i = 0; i < 400; i++) flood.send({ type: 'state-update', altitudeM: i });
      assert.equal(await closed, 1008);
      await settle();
      assert.ok(!server.rooms.has('FLOOD'), 'flooder cleaned up');
      assert.ok(server.rooms.has('RATE2'), 'other rooms unaffected');
      await ok.close();
    }),
  ));

await test('join rate limit: rapid join-or-create spam is refused without moving the climber', () =>
  withServer({}, async ({ server, url }) => {
    const a = client(url);
    await a.open;
    await a.join({ mode: 'create', lobbyCode: 'HOME' });
    for (let i = 0; i < 7; i++) await a.join({ mode: 'join', lobbyCode: 'HOME' });
    const r = await a.join({ mode: 'create', lobbyCode: 'SPAM' });
    assert.equal(r.type, 'lobby-error');
    assert.equal(r.code, 'rate-limited');
    assert.ok(!server.rooms.has('SPAM'));
    assert.equal(server.rooms.get('HOME').clients.size, 1, 'still in its room');
    await a.close();
  }));

await test('caps: private room count, room size, PUBLIC size, total connections', () =>
  withServer(
    {
      limits: {
        maxPrivateRooms: 2,
        maxPrivateRoomClients: 2,
        maxPublicClients: 1,
        maxConnections: 5,
      },
    },
    async ({ server, url }) => {
      const [a, b, c, d, e] = Array.from({ length: 5 }, () => client(url));
      await Promise.all([a, b, c, d, e].map((x) => x.open));
      assert.equal((await a.join({ mode: 'create', lobbyCode: 'CAP1' })).type, 'lobby-joined');
      assert.equal((await b.join({ mode: 'create', lobbyCode: 'CAP2' })).type, 'lobby-joined');
      const full = await c.join({ mode: 'create', lobbyCode: 'CAP3' });
      assert.equal(full.code, 'server-full');
      assert.ok(!server.rooms.has('CAP3'));
      const rec = await c.join({ mode: 'join', lobbyCode: 'CAP3', recreate: true });
      assert.equal(rec.code, 'not-found', 'recreate respects the room cap too');
      assert.equal((await c.join({ mode: 'join', lobbyCode: 'CAP1' })).type, 'lobby-joined');
      const roomFull = await d.join({ mode: 'join', lobbyCode: 'CAP1' });
      assert.equal(roomFull.code, 'room-full');
      assert.equal((await d.join({ mode: 'public' })).type, 'lobby-joined');
      assert.equal((await e.join({ mode: 'public' })).code, 'room-full');
      const sixth = client(url);
      const code = await new Promise((r) => sixth.ws.once('close', (c2) => r(c2)));
      assert.equal(code, 1013);
      // Freed slots are reusable: leaving CAP2 deletes it and lets a new room be created.
      b.send({ type: 'leave' });
      await settle();
      assert.equal((await e.join({ mode: 'create', lobbyCode: 'CAP3' })).type, 'lobby-joined');
      await Promise.all([a, b, c, d, e].map((x) => x.close()));
    },
  ));

/** Raw HTTP request (no automatic decompression), resolves { status, headers, body: Buffer }. */
function rawGet(base, pathName, { method = 'GET', headers = {} } = {}) {
  const u = new URL(base);
  return new Promise((resolve, reject) => {
    const req = nodeHttp.request(
      { host: u.hostname, port: u.port, path: pathName, method, headers },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }),
        );
      },
    );
    req.on('error', reject);
    req.end();
  });
}

await test('http: lobby list, SPA fallback, 404 for missing assets, no path traversal', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-dist-'));
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<html>shell</html>');
  fs.writeFileSync(path.join(dir, 'assets', 'app-abc.js'), 'console.log(1)');
  fs.writeFileSync(path.join(dir, 'manifest.webmanifest'), '{}');
  try {
    await withServer({ distDir: dir }, async ({ http }) => {
      const lobbies = await fetch(`${http}/api/lobbies`);
      assert.equal(lobbies.headers.get('cache-control'), 'no-store');
      const l = await lobbies.json();
      assert.equal(l.status, 'online');
      assert.ok(l.rooms.some((r) => r.code === 'PUBLIC'));
      for (const route of ['/', '/some/route', '/summit?x=1']) {
        const shell = await fetch(`${http}${route}`);
        assert.equal(shell.status, 200, route);
        assert.equal(shell.headers.get('cache-control'), 'no-cache');
        assert.match(shell.headers.get('content-type'), /text\/html/);
        assert.match(await shell.text(), /shell/);
      }
      const js = await fetch(`${http}/assets/app-abc.js`);
      assert.equal(js.status, 200);
      assert.match(js.headers.get('cache-control'), /immutable/);
      assert.match(js.headers.get('content-type'), /javascript/);
      assert.equal(js.headers.get('x-content-type-options'), 'nosniff');
      const manifest = await fetch(`${http}/manifest.webmanifest`);
      assert.match(manifest.headers.get('content-type'), /manifest\+json/);
      assert.equal(manifest.headers.get('cache-control'), 'no-cache');
      for (const missing of [
        '/assets/missing-123.js',
        '/favicon.ico',
        '/icons/x.png',
        '/assets/',
      ]) {
        const r = await fetch(`${http}${missing}`);
        assert.equal(r.status, 404, missing);
        assert.doesNotMatch(await r.text(), /shell/);
      }
      const sneaky = await fetch(`${http}/assets/..%2findex.html`);
      assert.equal(
        sneaky.headers.get('cache-control'),
        'no-cache',
        'immutable only for real /assets files',
      );
      for (const p of [
        '/../../../../etc/passwd',
        '/%2e%2e/%2e%2e/etc/passwd',
        '/..%2f..%2fetc%2fpasswd',
      ]) {
        const r = await rawGet(http, p);
        assert.ok(!/root:/.test(r.body.toString()), `traversal via ${p}`);
      }
      assert.equal((await fetch(`${http}/%E0%A4%A`)).status, 400);
      assert.equal((await fetch(`${http}/a%00.js`)).status, 400);
      assert.equal((await fetch(`${http}/`, { method: 'POST' })).status, 405);
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

await test('http: gzip for text assets, ETag revalidation (304), HEAD', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orb-dist-'));
  fs.mkdirSync(path.join(dir, 'assets'));
  const bigJs = `const data = ${JSON.stringify('orb '.repeat(5000))};\n`;
  fs.writeFileSync(path.join(dir, 'index.html'), '<html>shell</html>');
  fs.writeFileSync(path.join(dir, 'assets', 'big-1.js'), bigJs);
  fs.writeFileSync(path.join(dir, 'assets', 'font-1.woff2'), Buffer.alloc(4096, 7));
  try {
    await withServer({ distDir: dir }, async ({ http }) => {
      const gz = await rawGet(http, '/assets/big-1.js', {
        headers: { 'Accept-Encoding': 'gzip, br' },
      });
      assert.equal(gz.status, 200);
      assert.equal(gz.headers['content-encoding'], 'gzip');
      assert.equal(gz.headers.vary, 'Accept-Encoding');
      assert.equal(zlib.gunzipSync(gz.body).toString(), bigJs);
      assert.ok(gz.body.length < bigJs.length / 5, 'actually compressed');
      assert.equal(Number(gz.headers['content-length']), gz.body.length);
      const again = await rawGet(http, '/assets/big-1.js', {
        headers: { 'Accept-Encoding': 'gzip' },
      });
      assert.deepEqual(again.body, gz.body, 'cached gzip is reused');
      const plain = await rawGet(http, '/assets/big-1.js');
      assert.equal(plain.headers['content-encoding'], undefined);
      assert.equal(plain.body.toString(), bigJs);
      const font = await rawGet(http, '/assets/font-1.woff2', {
        headers: { 'Accept-Encoding': 'gzip' },
      });
      assert.equal(font.headers['content-encoding'], undefined, 'woff2 is not re-compressed');
      assert.equal(font.headers['content-type'], 'font/woff2');
      const shell = await rawGet(http, '/');
      const etag = shell.headers.etag;
      assert.ok(etag);
      const revalidated = await rawGet(http, '/', { headers: { 'If-None-Match': etag } });
      assert.equal(revalidated.status, 304);
      assert.equal(revalidated.body.length, 0);
      const head = await rawGet(http, '/assets/big-1.js', { method: 'HEAD' });
      assert.equal(head.status, 200);
      assert.equal(Number(head.headers['content-length']), Buffer.byteLength(bigJs));
      assert.equal(head.body.length, 0);
      // A rebuilt file (new mtime/size) is not served from the stale gzip cache.
      const rebuilt = bigJs.replace('orb', 'ORB') + '// v2\n';
      fs.writeFileSync(path.join(dir, 'assets', 'big-1.js'), rebuilt);
      const fresh = await rawGet(http, '/assets/big-1.js', {
        headers: { 'Accept-Encoding': 'gzip' },
      });
      assert.equal(zlib.gunzipSync(fresh.body).toString(), rebuilt);
    });
    // No build at all: the plain status text, not a crash.
    await withServer({ distDir: path.join(dir, 'nope') }, async ({ http }) => {
      const r = await fetch(`${http}/`);
      assert.equal(r.status, 200);
      assert.match(await r.text(), /Summit Multiplayer Server is running/);
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

console.log(results.join('\n'));
console.log(failures ? `\n${failures} FAILED` : `\nALL ${results.length} SERVER TESTS PASSED`);
process.exit(failures ? 1 : 0);
