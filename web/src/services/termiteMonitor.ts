import api from './api';

function isMock() {
  const mockValue = (import.meta as any).env?.VITE_AUTH_MOCK;
  return mockValue === '1' || mockValue === 'true';
}

interface Wrapper<T> { code: number; message: string; data: T | null }

async function request<T>(promise: Promise<any>): Promise<T> {
  const res = await promise;
  const body: Wrapper<T> = res.data;
  if (body.code !== 200) {
    throw new Error(body.message || 'serverError');
  }
  return body.data as T;
}

// 7. 单站点安全/预警状态变化曲线
export type TermiteBucket = 'hour' | 'day';

export interface TermiteAlertCurveQuery {
  stationId: number;
  startTime?: string;
  endTime?: string;
  bucket?: TermiteBucket; // 默认 day
  onlyAlert?: 0 | 1; // 默认 0
}

export interface TermiteAlertCurvePoint {
  bucketTime: string; // ISO8601
  totalCount: number;
  safeCount: number;
  alertCount: number;
}

export interface TermiteAlertCurveResponse {
  stationId: number;
  bucket: TermiteBucket;
  points: TermiteAlertCurvePoint[];
}

// 8. 多个站点累计安全/预警次数统计柱状图
export type TermiteSortBy = 'alertCount' | 'totalCount' | 'safeCount';
export type TermiteOrder = 'asc' | 'desc';

export interface TermiteAlertBarQuery {
  stationIds?: string; // "101,102" 形式
  startTime?: string;
  endTime?: string;
  sortBy?: TermiteSortBy;
  order?: TermiteOrder;
  topN?: number; // 1..100，默认20
}

export interface TermiteAlertBarItem {
  stationId: number;
  stationCode: string;
  name: string;
  totalCount: number;
  safeCount: number;
  alertCount: number;
}

export interface TermiteAlertBarResponse {
  items: TermiteAlertBarItem[];
  sortBy: TermiteSortBy;
  order: TermiteOrder;
  topN: number;
  startTime?: string;
  endTime?: string;
}

// 9. 按是否预警分类的站点数量分布饼状图
export interface TermiteAlertPieQuery {
  startTime?: string;
  endTime?: string;
  scopeStationIds?: string; // "101,102" 形式
}

export interface TermiteAlertPieResponse {
  totalStations: number;
  alertedCount: number;
  safeCount: number;
  alertedStationIds: number[];
  startTime?: string;
  endTime?: string;
}

// --- Mock 实现 ---

function createMockCurve(q: TermiteAlertCurveQuery): TermiteAlertCurveResponse {
  const bucket: TermiteBucket = q.bucket || 'day';
  const points: TermiteAlertCurvePoint[] = [];
  const now = Date.now();
  const step = bucket === 'hour' ? 3600_000 : 24 * 3600_000;
  const len = bucket === 'hour' ? 24 : 14;
  for (let i = len - 1; i >= 0; i--) {
    const t = new Date(now - i * step);
    const bucketTime = bucket === 'hour'
      ? new Date(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours(), 0, 0).toISOString()
      : new Date(t.getFullYear(), t.getMonth(), t.getDate(), 0, 0, 0).toISOString();
    const alertCount = Math.random() > 0.7 ? 1 + Math.floor(Math.random() * 3) : 0;
    const total = alertCount + (5 + Math.floor(Math.random() * 10));
    const safeCount = total - alertCount;
    points.push({ bucketTime, totalCount: total, safeCount, alertCount });
  }
  let filtered = points;
  if (q.onlyAlert === 1) {
    filtered = points.filter(p => p.alertCount > 0);
  }
  return { stationId: q.stationId, bucket, points: filtered };
}

function createMockBar(q: TermiteAlertBarQuery): TermiteAlertBarResponse {
  const ids = q.stationIds
    ? q.stationIds.split(',').map(s => Number(s.trim())).filter(id => id > 0)
    : [101, 102, 103, 104, 105];
  const items: TermiteAlertBarItem[] = ids.map((id, idx) => {
    const total = 50 + Math.floor(Math.random() * 100);
    const alert = Math.floor(total * (0.05 + Math.random() * 0.3));
    const safe = total - alert;
    return {
      stationId: id,
      stationCode: `BYZ-${String(id).padStart(4, '0')}`,
      name: `白蚁监测站-${String(idx + 1).padStart(3, '0')}`,
      totalCount: total,
      safeCount: safe,
      alertCount: alert
    };
  });
  const sortBy: TermiteSortBy = q.sortBy || 'alertCount';
  const order: TermiteOrder = q.order || 'desc';
  items.sort((a, b) => {
    const av = a[sortBy];
    const bv = b[sortBy];
    return order === 'asc' ? av - bv : bv - av;
  });
  const topN = Math.min(Math.max(q.topN ?? 20, 1), 100);
  return {
    items: items.slice(0, topN),
    sortBy,
    order,
    topN,
    startTime: q.startTime,
    endTime: q.endTime
  };
}

function createMockPie(q: TermiteAlertPieQuery): TermiteAlertPieResponse {
  const scopeIds = q.scopeStationIds
    ? q.scopeStationIds.split(',').map(s => Number(s.trim())).filter(id => id > 0)
    : [101, 102, 103, 104, 105, 106, 107, 108];
  const totalStations = scopeIds.length;
  const alertedStationIds: number[] = [];
  scopeIds.forEach(id => {
    if (Math.random() > 0.5) alertedStationIds.push(id);
  });
  const alertedCount = alertedStationIds.length;
  const safeCount = totalStations - alertedCount;
  return {
    totalStations,
    alertedCount,
    safeCount,
    alertedStationIds,
    startTime: q.startTime,
    endTime: q.endTime
  };
}

// --- 对外 API 封装 ---

export async function fetchTermiteAlertCurve(q: TermiteAlertCurveQuery): Promise<TermiteAlertCurveResponse> {
  if (isMock()) {
    return createMockCurve(q);
  }
  const params: any = { ...q };
  if (!params.bucket) params.bucket = 'day';
  if (params.onlyAlert === undefined) params.onlyAlert = 0;
  return await request<TermiteAlertCurveResponse>(
    api.get('/termite-monitor/alert-curve', { params })
  );
}

export async function fetchTermiteAlertBar(q: TermiteAlertBarQuery): Promise<TermiteAlertBarResponse> {
  if (isMock()) {
    return createMockBar(q);
  }
  const params: any = { ...q };
  return await request<TermiteAlertBarResponse>(
    api.get('/termite-monitor/alert-bar', { params })
  );
}

export async function fetchTermiteAlertPie(q: TermiteAlertPieQuery): Promise<TermiteAlertPieResponse> {
  if (isMock()) {
    return createMockPie(q);
  }
  const params: any = { ...q };
  return await request<TermiteAlertPieResponse>(
    api.get('/termite-monitor/alert-pie', { params })
  );
}
