import { Router } from 'express';
import { db, nextIds } from '../data/store';

export const usersRouter = Router();

usersRouter.get('/', (_req, res) => res.json(db.users.map(u => ({ id: u.id, username: u.username, role: u.role }))));
usersRouter.post('/', (req, res) => {
  const id = nextIds.user();
  const { username, password = '123456', role = 'user' } = req.body || {};
  if (!username) return res.status(400).json({ message: '用户名必填' });
  const exists = db.users.some(u => u.username === username);
  if (exists) return res.status(409).json({ message: '用户名已存在' });
  const user = { id, username, password, role };
  db.users.push(user as any);
  res.json({ id, username, role });
});
usersRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = db.users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).end();
  db.users[idx] = { ...db.users[idx], ...req.body, id };
  const { username, role } = db.users[idx];
  res.json({ id, username, role });
});
usersRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = db.users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).end();
  db.users.splice(idx,1);
  res.status(204).end();
});
