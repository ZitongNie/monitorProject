import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import http from 'http';
import { WebSocketServer } from 'ws';
import { authRouter, authGuard, roleGuard } from './routes/auth.ts';
import { stationsRouter } from './routes/stations.ts';
import { pilesRouter } from './routes/piles.ts';
import { analyticsRouter } from './routes/analytics.ts';
import { usersRouter } from './routes/users.ts';
import { db, pushHistory } from './data/store.ts';

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());

const _bypassEnv = (process.env.BYPASS_AUTH ?? '1').toLowerCase();
const BYPASS = _bypassEnv === '1' || _bypassEnv === 'true';
const maybeAuth: any = BYPASS ? (_req: any, _res: any, next: any) => next() : authGuard;
const maybeRoleAdmin: any = BYPASS ? (_req: any, _res: any, next: any) => next() : roleGuard('admin');

app.get('/', (_req, res) => res.send('monitor server'));
app.use('/api/auth', authRouter);
app.use('/api/stations', maybeAuth, stationsRouter);
app.use('/api/piles', maybeAuth, pilesRouter);
app.use('/api/analytics', maybeAuth, analyticsRouter);
app.use('/api/users', maybeAuth, maybeRoleAdmin, usersRouter);

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'welcome', t: Date.now() }));
});

// 模拟实时数据：每 5 秒随机切换一个点的状态并广播
setInterval(() => {
  const pickStation = Math.random() > 0.5;
  if (pickStation && db.stations.length) {
    const s = db.stations[Math.floor(Math.random() * db.stations.length)];
    s.status = Math.random() > 0.8 ? 'warn' : 'safe';
    pushHistory('stations', s.id, s.status);
    const msg = JSON.stringify({ type: 'station-update', id: s.id, status: s.status, t: Date.now() });
    wss.clients.forEach(c => { try { c.send(msg); } catch {} });
  } else if (db.piles.length) {
    const p = db.piles[Math.floor(Math.random() * db.piles.length)];
    p.status = Math.random() > 0.8 ? 'warn' : 'safe';
    pushHistory('piles', p.id, p.status);
    const msg = JSON.stringify({ type: 'pile-update', id: p.id, status: p.status, t: Date.now() });
    wss.clients.forEach(c => { try { c.send(msg); } catch {} });
  }
}, 5000);

const PORT = process.env.PORT ? Number(process.env.PORT) : 5174;
server.listen(PORT, () => console.log(`server on http://localhost:${PORT}`));
