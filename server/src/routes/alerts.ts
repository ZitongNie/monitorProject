import { Router } from 'express';
import { db, AlertInfo } from '../data/store';

export const alertsRouter = Router();

// 7. 变更预警处理状态（RESTful）
// PUT /api/alerts/{id}/status
alertsRouter.put('/:id/status', (req, res) => {
  const rawId = req.params.id;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ code: 400, message: 'ID 必须为正整数', data: null });
  }

  const body = req.body || {};
  if (body.handled === undefined || body.handled === null) {
    return res.status(400).json({ code: 400, message: 'handled 不能为空', data: null });
  }
  const handled: boolean = Boolean(body.handled);
  const handler: string | undefined = body.handler ? String(body.handler) : undefined;

  const idx = db.alerts.findIndex((a: AlertInfo) => a.id === id);
  if (idx === -1) {
    return res.status(404).json({ code: 404, message: '预警记录不存在', data: null });
  }

  const current = db.alerts[idx];
  const next: AlertInfo = { ...current };

  if (handled) {
    next.handleStatus = 1;
    next.handleTime = new Date().toISOString();
    next.handler = handler ?? current.handler ?? null;
  } else {
    next.handleStatus = 0;
    next.handleTime = null;
    next.handler = null;
  }

  // 此处不实现 Redis，同步逻辑仅体现在内存数据
  db.alerts[idx] = next;

  return res.json({ code: 200, message: 'success', data: null });
});

export default alertsRouter;
