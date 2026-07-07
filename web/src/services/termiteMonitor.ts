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

export interface TermiteMonitorHistoryQuery {
  stationId: number;
  startTime?: string;
  endTime?: string;
  termiteStatus?: 0 | 1;
  isAlert?: 0 | 1;
  pageNo?: number;
  pageSize?: number;
  sortOrder?: 'asc' | 'desc';
}

export interface TermiteMonitorHistoryRecord {
  id: number;
  stationId: number;
  reportTime: string;
  lngWgs84?: number;
  latWgs84?: number;
  lngBd09?: number;
  latBd09?: number;
  termiteStatus?: 0 | 1;
  devicePower?: number;
  pointOrder?: string;
  signalStrength?: number;
  isAlert?: 0 | 1;
  createTime?: string;
  updateTime?: string;
}

export interface TermiteMonitorHistoryResponse {
  records: TermiteMonitorHistoryRecord[];
  pageNo: number;
  pageSize: number;
  total: number;
  pages: number;
  sortBy?: string | null;
  order?: string | null;
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
  limit?: number; // 1..500，默认100
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
  sortBy?: TermiteSortBy;
  order?: TermiteOrder;
  topN?: number;
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

interface BackendTermiteAlertBarItem {
  deviceId: number;
  deviceCode: string;
  deviceName: string;
  totalCount: number;
  safeCount: number;
  alertCount: number;
}

interface BackendTermiteAlertBarResponse {
  items: BackendTermiteAlertBarItem[];
  startTime?: string;
  endTime?: string;
}

interface BackendTermiteAlertPieItem {
  alertStatus: 0 | 1;
  label: string;
  deviceCount: number;
}

interface BackendTermiteAlertPieResponse {
  items: BackendTermiteAlertPieItem[];
  startTime?: string;
  endTime?: string;
}

// --- Mock 实现 ---

function createMockHistory(q: TermiteMonitorHistoryQuery): TermiteMonitorHistoryResponse {
  const pageNo = q.pageNo ?? 1;
  const pageSize = q.pageSize ?? 10;
  const total = pageSize;
  const now = Date.now();
  const records: TermiteMonitorHistoryRecord[] = [];
  for (let i = 0; i < total; i++) {
    const reportTime = new Date(now - (total - i) * 2 * 3600_000).toISOString();
    const termiteStatus = (i + q.stationId) % 3 === 0 ? 1 : 0;
    const isAlert = termiteStatus === 1 ? 1 : 0;
    records.push({
      id: q.stationId * 1000 + i + 1,
      stationId: q.stationId,
      reportTime,
      termiteStatus,
      devicePower: 85 - (i % 5),
      pointOrder: '1-1',
      signalStrength: 25 + (i % 5),
      isAlert,
      createTime: reportTime,
      updateTime: reportTime
    });
  }
  return {
    records,
    pageNo,
    pageSize,
    total,
    pages: 1,
    sortBy: null,
    order: q.sortOrder ?? 'asc'
  };
}

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
  const sortBy: TermiteSortBy = 'alertCount';
  const order: TermiteOrder = 'desc';
  items.sort((a, b) => {
    const av = a[sortBy];
    const bv = b[sortBy];
    return bv - av;
  });
  const topN = Math.min(Math.max(q.limit ?? 20, 1), 100);
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

export async function fetchTermiteMonitorHistory(q: TermiteMonitorHistoryQuery): Promise<TermiteMonitorHistoryResponse> {
  if (isMock()) {
    return createMockHistory(q);
  }
  const params: any = { ...q };
  if (!params.pageNo) params.pageNo = 1;
  if (!params.pageSize) params.pageSize = 20;
  if (!params.sortOrder) params.sortOrder = 'asc';
  return await request<TermiteMonitorHistoryResponse>(
    api.get('/termite-monitor/history', { params })
  );
}

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
  const data = await request<BackendTermiteAlertBarResponse>(
    api.get('/termite-monitor/multi-device-alert-stats', { params })
  );
  return {
    items: (data.items || []).map((item) => ({
      stationId: item.deviceId,
      stationCode: item.deviceCode,
      name: item.deviceName,
      totalCount: item.totalCount,
      safeCount: item.safeCount,
      alertCount: item.alertCount
    })),
    startTime: data.startTime,
    endTime: data.endTime
  };
}

export async function fetchTermiteAlertPie(q: TermiteAlertPieQuery): Promise<TermiteAlertPieResponse> {
  if (isMock()) {
    return createMockPie(q);
  }
  const params: any = { ...q };
  const data = await request<BackendTermiteAlertPieResponse>(
    api.get('/termite-monitor/alert-distribution', { params })
  );
  const items = data.items || [];
  const alertedItem = items.find((item) => item.alertStatus === 1);
  const safeItem = items.find((item) => item.alertStatus === 0);
  const alertedCount = alertedItem?.deviceCount || 0;
  const safeCount = safeItem?.deviceCount || 0;
  return {
    totalStations: alertedCount + safeCount,
    alertedCount,
    safeCount,
    alertedStationIds: [],
    startTime: data.startTime,
    endTime: data.endTime
  };
}
