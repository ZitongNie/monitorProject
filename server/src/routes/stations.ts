import { Router } from 'express';
import { db, nextIds, pushHistory } from '../data/store';

export const stationsRouter = Router();

stationsRouter.get('/', (_req, res) => res.json(db.stations));
stationsRouter.post('/', (req, res) => {
  const id = nextIds.station();
  const item = { id, name: req.body?.name || `测站-${id}`, lat: Number(req.body?.lat)||23.1, lng: Number(req.body?.lng)||113.26, status: req.body?.status==='warn'?'warn':'safe', picture: req.body?.picture } as const;
  db.stations.push(item as any);
  pushHistory('stations', id, item.status);
  res.json(item);
});
stationsRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = db.stations.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).end();
  const before = db.stations[idx];
  const next = { ...before, ...req.body, id };
  db.stations[idx] = next;
  if (req.body?.status) pushHistory('stations', id, next.status);
  res.json(next);
});
stationsRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = db.stations.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).end();
  db.stations.splice(idx,1);
  res.status(204).end();
});
stationsRouter.get('/:id/history', (req, res) => {
  const id = Number(req.params.id);
  res.json(db.history.stations.get(id) || []);
});
