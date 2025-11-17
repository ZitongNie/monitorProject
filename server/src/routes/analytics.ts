import { Router } from 'express';
import { db } from '../data/store';

export const analyticsRouter = Router();

analyticsRouter.get('/overview', (_req, res) => {
  const sTotal = db.stations.length; const sWarn = db.stations.filter(s=>s.status==='warn').length;
  const pTotal = db.piles.length; const pWarn = db.piles.filter(p=>p.status==='warn').length;
  res.json({ stations: { total: sTotal, warn: sWarn, safe: sTotal - sWarn }, piles: { total: pTotal, warn: pWarn, safe: pTotal - pWarn } });
});

analyticsRouter.get('/counts', (_req, res) => {
  const stationWarnCounts = db.stations.map(s => ({ name: s.name, warn: (db.history.stations.get(s.id)||[]).filter(i=>i.status==='warn').length, safe: (db.history.stations.get(s.id)||[]).filter(i=>i.status==='safe').length }));
  const pileWarnCounts = db.piles.map(p => ({ name: p.code, warn: (db.history.piles.get(p.id)||[]).filter(i=>i.status==='warn').length, safe: (db.history.piles.get(p.id)||[]).filter(i=>i.status==='safe').length }));
  res.json({ stationWarnCounts, pileWarnCounts });
});
