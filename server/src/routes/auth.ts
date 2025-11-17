import { Router } from 'express';
import { db } from '../data/store';

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ message: '用户名或密码错误' });
  const token = Buffer.from(JSON.stringify({ uid: user.id, role: user.role, exp: Date.now() + 86400_000 })).toString('base64');
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

export function authGuard(req: any, res: any, next: any) {
  const auth = req.headers['authorization'] as string | undefined;
  if (!auth) return res.status(401).json({ message: '未授权' });
  const token = auth.replace('Bearer ', '');
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    req.user = payload; next();
  } catch {
    return res.status(401).json({ message: '令牌无效' });
  }
}

export function roleGuard(role: 'admin'|'user') {
  return (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ message: '未授权' });
    if (req.user.role !== role && role === 'admin') return res.status(403).json({ message: '无权限' });
    next();
  };
}
