import { Router } from 'express';
import { db, nextIds, pushHistory } from '../data/store';

export const pilesRouter = Router();

pilesRouter.get('/', (_req, res) => res.json(db.piles));
pilesRouter.post('/', (req, res) => {
  const id = nextIds.pile();
  const item = { id, code: req.body?.code || `P-${id}`, lat: Number(req.body?.lat)||23.12, lng: Number(req.body?.lng)||113.27, status: req.body?.status==='warn'?'warn':'safe' } as const;
  db.piles.push(item as any);
  pushHistory('piles', id, item.status);
  res.json(item);
});
pilesRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = db.piles.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).end();
  const before = db.piles[idx];
  const next = { ...before, ...req.body, id };
  db.piles[idx] = next;
  if (req.body?.status) pushHistory('piles', id, next.status);
  res.json(next);
});
pilesRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = db.piles.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).end();
  db.piles.splice(idx,1);
  res.status(204).end();
});
pilesRouter.get('/:id/history', (req, res) => {
  const id = Number(req.params.id);
  res.json(db.history.piles.get(id) || []);
});
