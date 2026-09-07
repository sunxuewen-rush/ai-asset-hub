import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { csrfProtection } from './csrf.js';
import { InMemorySessionStore, SessionManager } from './session.js';
import { sessionMiddleware } from './session-middleware.js';

function csrfApp(extra?: Parameters<typeof csrfProtection>[0]): Hono {
  const app = new Hono();
  app.use('*', csrfProtection(extra));
  app.post('/protected', (c) => c.json({ ok: true }));
  app.get('/read', (c) => c.json({ ok: true }));
  return app;
}

describe('csrfProtection', () => {
  it('allows same-origin non-GET with matching Origin', async () => {
    const res = await csrfApp().request('/protected', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000', host: 'localhost:3000' },
    });
    expect(res.status).toBe(200);
  });

  it('allows same-origin non-GET via Referer when Origin missing', async () => {
    const res = await csrfApp().request('/protected', {
      method: 'POST',
      headers: { referer: 'http://localhost:3000/some-page', host: 'localhost:3000' },
    });
    expect(res.status).toBe(200);
  });

  it('rejects cross-origin non-GET', async () => {
    const res = await csrfApp().request('/protected', {
      method: 'POST',
      headers: { origin: 'https://evil.example.com', host: 'localhost:3000' },
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'auth.csrf_failed' });
  });

  it('rejects non-GET with neither Origin nor Referer', async () => {
    const res = await csrfApp().request('/protected', { method: 'POST' });
    expect(res.status).toBe(403);
  });

  it('exempts GET', async () => {
    const res = await csrfApp().request('/read');
    expect(res.status).toBe(200);
  });

  it('honors allowed-origins whitelist', async () => {
    const app = csrfApp({ allowedOrigins: ['https://cli.example.com'] });
    const res = await app.request('/protected', {
      method: 'POST',
      headers: { origin: 'https://cli.example.com', host: 'localhost:3000' },
    });
    expect(res.status).toBe(200);
  });
});

describe('sessionMiddleware', () => {
  it('exposes principal when a valid session cookie is present', async () => {
    const manager = new SessionManager(new InMemorySessionStore(60_000));
    const sid = await manager.createSession('usr_1', 'alice');
    const app = new Hono();
    app.use('*', sessionMiddleware(manager));
    app.get('/me', (c) => {
      const p = c.get('principal');
      return c.json({ userId: p?.userId ?? null });
    });
    const res = await app.request('/me', {
      headers: { cookie: `aih_session=${sid}` },
    });
    expect(await res.json()).toEqual({ userId: 'usr_1' });
  });

  it('stays anonymous for missing/invalid cookie', async () => {
    const manager = new SessionManager(new InMemorySessionStore(60_000));
    const app = new Hono();
    app.use('*', sessionMiddleware(manager));
    app.get('/me', (c) => c.json({ userId: c.get('principal')?.userId ?? null }));
    const res = await app.request('/me', { headers: { cookie: 'aih_session=bogus' } });
    expect(await res.json()).toEqual({ userId: null });
  });
});
