import api from './api';

// --- 坐标转换，仅用于前端 Mock，真实后端会在服务端做 ---
function wgs84ToGcj02(lng: number, lat: number) {
  const a = 6378245.0;
  const ee = 0.00669342162296594323;
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
  dLng = (dLng * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return { lng: lng + dLng, lat: lat + dLat };
}

function transformLat(lng: number, lat: number) {
  let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
  ret += ((20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(lat * Math.PI) + 40.0 * Math.sin((lat / 3.0) * Math.PI)) * 2.0) / 3.0;
  ret += ((160.0 * Math.sin((lat / 12.0) * Math.PI) + 320 * Math.sin((lat * Math.PI) / 30.0)) * 2.0) / 3.0;
  return ret;
}

function transformLng(lng: number, lat: number) {
  let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
  ret += ((20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(lng * Math.PI) + 40.0 * Math.sin((lng / 3.0) * Math.PI)) * 2.0) / 3.0;
  ret += ((150.0 * Math.sin((lng / 12.0) * Math.PI) + 300.0 * Math.sin((lng / 30.0) * Math.PI)) * 2.0) / 3.0;
  return ret;
}

function gcj02ToBd09(lng: number, lat: number) {
  const x = lng, y = lat;
  const z = Math.sqrt(x * x + y * y) + 0.00002 * Math.sin((y * Math.PI * 3000.0) / 180.0);
  const theta = Math.atan2(y, x) + 0.000003 * Math.cos((x * Math.PI * 3000.0) / 180.0);
  const bdLng = z * Math.cos(theta) + 0.0065;
  const bdLat = z * Math.sin(theta) + 0.006;
  return { lng: bdLng, lat: bdLat };
}

export interface ElectronicBoundary {
  id: number;
  boundaryCode: string;
  name: string;
  deviceId: string;
  password: string;
  address?: string;
  material?: string;
  height?: number;
  buryDepth?: number;
  status: 0 | 1; // 0=离线 1=在线
  createTime?: string;
  updateTime?: string;
  lngWgs84?: number;
  latWgs84?: number;
  lngBd09?: number;
  latBd09?: number;
  initLngWgs84?: number;
  initLatWgs84?: number;
  initLngBd09?: number;
  initLatBd09?: number;
}

export interface ElectronicBoundaryCreatePayload {
  boundaryCode: string;
  name: string;
  deviceId: string;
  password: string;
  address?: string;
  material?: string;
  height?: number;
  buryDepth?: number;
  status?: 0 | 1;
  lngWgs84: number;
  latWgs84: number;
  initLngWgs84?: number;
  initLatWgs84?: number;
}

export interface ElectronicBoundaryUpdatePayload {
  boundaryCode?: string;
  name?: string;
  deviceId?: string;
  password?: string;
  address?: string;
  material?: string;
  height?: number;
  buryDepth?: number;
  status?: 0 | 1;
  lngWgs84?: number;
  latWgs84?: number;
  initLngWgs84?: number;
  initLatWgs84?: number;
}

export interface ElectronicBoundaryQuery {
  keyword?: string;
  boundaryCode?: string;
  deviceId?: string;
  status?: 0 | 1;
  pageNum?: number;
  pageSize?: number;
  orderBy?: 'create_time' | 'update_time' | 'boundary_code' | 'name';
  order?: 'asc' | 'desc';
}

export interface PageResult<T> {
  total: number;
  pages: number;
  pageNum: number;
  pageSize: number;
  list: T[];
}

export interface BoundaryRealtimeRequest {
  id?: number;
  deviceId?: string;
  validKey?: boolean; // 对本接口无效，后端忽略
  preferCache?: boolean; // 兼容前端调用参数，后端忽略
}

export interface BoundaryRealtimeData {
  reportTime: string;
  lngWgs84?: number;
  latWgs84?: number;
  lngBd09?: number;
  latBd09?: number;
  temperature?: number;
  humidity?: number;
  tiltAngle?: number;
  tiltStatus?: number;
  vibrationStatus?: number;
  voltage?: number;
  remainingPower?: number;
  signalStrength?: number;
  isAlert?: number;
}

export interface BoundaryImageDTO {
  imageCode: string;
  imagePath: string;
  reportTime: string;
  isComplete: number;
}

export interface BoundaryAlertDTO {
  alertId: number;
  alertType: string;
  alertCode: number | string;
  alertTime: string;
  alertDesc?: string;
  handleStatus: 0 | 1;
}

export interface BoundaryRealtimeResponse {
  baseInfo: ElectronicBoundary;
  realTimeData?: BoundaryRealtimeData | null;
  images?: BoundaryImageDTO[];
  alerts?: BoundaryAlertDTO[];
}

interface Wrapper<T> { code: number; message: string; data: T | null }

function isMock() {
  const mockValue = (import.meta as any).env?.VITE_AUTH_MOCK;
  return mockValue === '1' || mockValue === 'true';
}

async function request<T>(promise: Promise<any>): Promise<T> {
  const res = await promise;
  const body: Wrapper<T> = res.data;
  if (body.code !== 200) {
    throw new Error(body.message || 'serverError');
  }
  return body.data as T;
}

// --- Mock 数据：仅在 VITE_AUTH_MOCK 开启时使用 ---

const MOCK_KEY = 'mock_electronic_boundaries_v1';

function getMockList(): ElectronicBoundary[] {
  let existing: ElectronicBoundary[] | null = null;
  try {
    const raw = localStorage.getItem(MOCK_KEY);
    if (raw) existing = JSON.parse(raw);
  } catch {}

  const createBoundary = (
    id: number,
    boundaryCode: string,
    name: string,
    deviceId: string,
    lngWgs84: number,
    latWgs84: number,
    status: 0 | 1,
    material?: string,
    height?: number,
    buryDepth?: number,
    address?: string
  ): ElectronicBoundary => {
    const { lng: gcjLng, lat: gcjLat } = wgs84ToGcj02(lngWgs84, latWgs84);
    const { lng: bdLng, lat: bdLat } = gcj02ToBd09(gcjLng, gcjLat);
    const now = new Date().toISOString();
    return {
      id,
      boundaryCode,
      name,
      deviceId,
      password: '1234',
      address,
      material,
      height,
      buryDepth,
      status,
      createTime: now,
      updateTime: now,
      lngWgs84,
      latWgs84,
      lngBd09: bdLng,
      latBd09: bdLat,
      initLngWgs84: lngWgs84,
      initLatWgs84: latWgs84,
      initLngBd09: bdLng,
      initLatBd09: bdLat
    };
  };

  const seed: ElectronicBoundary[] = [
    // 武汉（5个点位）
    createBoundary(1, 'JZ-2025-0001', '界桩-江汉001', '5544332201', 114.305278, 30.593099, 1, '混凝土', 1.2, 0.3, '湖北省武汉市江汉区'),
    createBoundary(2, 'JZ-2025-0002', '界桩-硚口002', '5544332202', 114.315278, 30.603099, 1, '混凝土', 1.2, 0.3, '湖北省武汉市硚口区'),
    createBoundary(3, 'JZ-2025-0003', '界桩-江岸003', '5544332203', 114.295, 30.605, 0, '花岗岩', 1.3, 0.35, '湖北省武汉市江岸区'),
    createBoundary(4, 'JZ-2025-0004', '界桩-武昌004', '5544332204', 114.315, 30.585, 1, '不锈钢', 1.5, 0.4, '湖北省武汉市武昌区'),
    createBoundary(5, 'JZ-2025-0005', '界桩-洪山005', '5544332205', 114.34, 30.57, 0, '混凝土', 1.1, 0.25, '湖北省武汉市洪山区'),

    // 湖北其他地市（15个点位，均匀分布）
    createBoundary(6, 'JZ-2025-0006', '界桩-黄石006', '5544332206', 115.038, 30.2, 1, '混凝土', 1.2, 0.3, '湖北省黄石市黄石港区'),
    createBoundary(7, 'JZ-2025-0007', '界桩-十堰007', '5544332207', 110.799, 32.629, 0, '花岗岩', 1.3, 0.35, '湖北省十堰市茅箭区'),
    createBoundary(8, 'JZ-2025-0008', '界桩-宜昌008', '5544332208', 111.286, 30.692, 1, '不锈钢', 1.4, 0.35, '湖北省宜昌市西陵区'),
    createBoundary(9, 'JZ-2025-0009', '界桩-襄阳009', '5544332209', 112.144, 32.042, 1, '混凝土', 1.2, 0.3, '湖北省襄阳市襄城区'),
    createBoundary(10, 'JZ-2025-0010', '界桩-鄂州010', '5544332210', 114.89, 30.396, 0, '花岗岩', 1.3, 0.35, '湖北省鄂州市鄂城区'),
    createBoundary(11, 'JZ-2025-0011', '界桩-荆门011', '5544332211', 112.204, 31.035, 1, '混凝土', 1.2, 0.3, '湖北省荆门市掇刀区'),
    createBoundary(12, 'JZ-2025-0012', '界桩-孝感012', '5544332212', 113.917, 30.924, 1, '混凝土', 1.1, 0.25, '湖北省孝感市孝南区'),
    createBoundary(13, 'JZ-2025-0013', '界桩-荆州013', '5544332213', 112.24, 30.334, 0, '不锈钢', 1.4, 0.35, '湖北省荆州市沙市区'),
    createBoundary(14, 'JZ-2025-0014', '界桩-黄冈014', '5544332214', 114.872, 30.453, 1, '混凝土', 1.2, 0.3, '湖北省黄冈市黄州区'),
    createBoundary(15, 'JZ-2025-0015', '界桩-咸宁015', '5544332215', 114.328, 29.832, 0, '花岗岩', 1.3, 0.35, '湖北省咸宁市咸安区'),
    createBoundary(16, 'JZ-2025-0016', '界桩-随州016', '5544332216', 113.371, 31.716, 1, '混凝土', 1.2, 0.3, '湖北省随州市曾都区'),
    createBoundary(17, 'JZ-2025-0017', '界桩-恩施017', '5544332217', 109.488, 30.272, 1, '不锈钢', 1.4, 0.35, '湖北省恩施市'),
    createBoundary(18, 'JZ-2025-0018', '界桩-仙桃018', '5544332218', 113.453, 30.365, 0, '混凝土', 1.1, 0.25, '湖北省仙桃市'),
    createBoundary(19, 'JZ-2025-0019', '界桩-潜江019', '5544332219', 112.9, 30.402, 1, '混凝土', 1.2, 0.3, '湖北省潜江市'),
    createBoundary(20, 'JZ-2025-0020', '界桩-神农架020', '5544332220', 110.671, 31.744, 0, '花岗岩', 1.3, 0.35, '湖北省神农架林区')
  ];

  const TARGET_COUNT = 20;
  if (existing && Array.isArray(existing)) {
    if (existing.length >= TARGET_COUNT) return existing;
    const codes = new Set(existing.map(b => b.boundaryCode));
    const merged = existing.slice();
    for (const b of seed) {
      if (merged.length >= TARGET_COUNT) break;
      if (codes.has(b.boundaryCode)) continue;
      merged.push(b);
      codes.add(b.boundaryCode);
    }
    setMockList(merged);
    return merged;
  }

  setMockList(seed);
  return seed;
}

function setMockList(list: ElectronicBoundary[]) {
  localStorage.setItem(MOCK_KEY, JSON.stringify(list));
}

// --- 对外 API 封装 ---

export async function createElectronicBoundary(payload: ElectronicBoundaryCreatePayload): Promise<void> {
  if (isMock()) {
    if (!payload.boundaryCode) throw new Error('界桩编号不能为空');
    if (!payload.name) throw new Error('界桩名称不能为空');
    if (!payload.deviceId) throw new Error('设备唯一标识不能为空');
    if (!payload.password) throw new Error('设备密码不能为空');
    if (payload.lngWgs84 === undefined || payload.latWgs84 === undefined) throw new Error('经纬度不能为空');
    if (payload.latWgs84 < -90 || payload.latWgs84 > 90) throw new Error('纬度必须在 [-90,90] 范围内');
    if (payload.lngWgs84 < -180 || payload.lngWgs84 > 180) throw new Error('经度必须在 [-180,180] 范围内');
    if (payload.height !== undefined && payload.height < 0) throw new Error('高度必须非负');

    const list = getMockList();
    if (list.some(b => b.boundaryCode === payload.boundaryCode)) throw new Error('界桩编号重复');
    if (list.some(b => b.deviceId === payload.deviceId)) throw new Error('deviceId已被绑定');
    const id = list.length ? Math.max(...list.map(b => b.id)) + 1 : 1;
    const now = new Date().toISOString();
    const lngWgs84 = payload.lngWgs84;
    const latWgs84 = payload.latWgs84;
    const { lng: gcjLng, lat: gcjLat } = wgs84ToGcj02(lngWgs84, latWgs84);
    const bd = gcj02ToBd09(gcjLng, gcjLat);
    const st: ElectronicBoundary = {
      id,
      boundaryCode: payload.boundaryCode,
      name: payload.name,
      deviceId: payload.deviceId,
      password: payload.password,
      address: payload.address,
      material: payload.material,
      height: payload.height,
      buryDepth: payload.buryDepth,
      status: payload.status ?? 0,
      createTime: now,
      updateTime: now,
      lngWgs84,
      latWgs84,
      lngBd09: bd.lng,
      latBd09: bd.lat,
      initLngWgs84: payload.initLngWgs84 ?? lngWgs84,
      initLatWgs84: payload.initLatWgs84 ?? latWgs84,
      initLngBd09: bd.lng,
      initLatBd09: bd.lat
    };
    list.push(st);
    setMockList(list);
    return;
  }
  await request<void>(api.post('/electronic-boundaries', payload));
}

export async function updateElectronicBoundary(id: number, payload: ElectronicBoundaryUpdatePayload): Promise<void> {
  if (isMock()) {
    const list = getMockList();
    const idx = list.findIndex(b => b.id === id);
    if (idx < 0) throw new Error('电子界桩不存在');
    const current = list[idx];

    // 唯一性校验
    if (payload.boundaryCode && payload.boundaryCode !== current.boundaryCode && list.some(b => b.boundaryCode === payload.boundaryCode)) {
      throw new Error('界桩编号重复');
    }
    if (payload.deviceId && payload.deviceId !== current.deviceId && list.some(b => b.deviceId === payload.deviceId)) {
      throw new Error('deviceId已被绑定');
    }

    if ((payload.lngWgs84 !== undefined && payload.latWgs84 === undefined) || (payload.lngWgs84 === undefined && payload.latWgs84 !== undefined)) {
      throw new Error('经纬度不能为空');
    }
    if ((payload.initLngWgs84 !== undefined && payload.initLatWgs84 === undefined) || (payload.initLngWgs84 === undefined && payload.initLatWgs84 !== undefined)) {
      throw new Error('经纬度不能为空');
    }

    if (payload.latWgs84 !== undefined && (payload.latWgs84 < -90 || payload.latWgs84 > 90)) {
      throw new Error('纬度必须在 [-90,90] 范围内');
    }
    if (payload.lngWgs84 !== undefined && (payload.lngWgs84 < -180 || payload.lngWgs84 > 180)) {
      throw new Error('经度必须在 [-180,180] 范围内');
    }
    if (payload.height !== undefined && payload.height < 0) {
      throw new Error('高度必须非负');
    }

    const merged: ElectronicBoundary = { ...current, ...payload, id };
    const now = new Date().toISOString();
    merged.updateTime = now;

    // 更新当前坐标 BD09
    if (payload.lngWgs84 !== undefined && payload.latWgs84 !== undefined) {
      const { lng: gcjLng, lat: gcjLat } = wgs84ToGcj02(payload.lngWgs84, payload.latWgs84);
      const bd = gcj02ToBd09(gcjLng, payload.latWgs84);
      merged.lngBd09 = bd.lng;
      merged.latBd09 = bd.lat;
    }

    // 更新初始坐标 BD09
    if (payload.initLngWgs84 !== undefined && payload.initLatWgs84 !== undefined) {
      const { lng: gcjLng0, lat: gcjLat0 } = wgs84ToGcj02(payload.initLngWgs84, payload.initLatWgs84);
      const bd0 = gcj02ToBd09(gcjLng0, gcjLat0);
      merged.initLngBd09 = bd0.lng;
      merged.initLatBd09 = bd0.lat;
    }

    list[idx] = merged;
    setMockList(list);
    return;
  }
  await request<void>(api.put(`/electronic-boundaries/${id}`, payload));
}

export async function deleteElectronicBoundary(id: number): Promise<void> {
  if (isMock()) {
    const list = getMockList();
    const idx = list.findIndex(b => b.id === id);
    if (idx < 0) throw new Error('电子界桩不存在');
    // 简化：不做“设备在线/存在引用”校验，交由真实后端
    list.splice(idx, 1);
    setMockList(list);
    return;
  }
  await request<void>(api.delete(`/electronic-boundaries/${id}`));
}

export async function getElectronicBoundaryDetail(id: number): Promise<ElectronicBoundary> {
  if (isMock()) {
    const list = getMockList();
    const st = list.find(b => b.id === id);
    if (!st) throw new Error('电子界桩不存在');
    return st;
  }
  return await request<ElectronicBoundary>(api.get(`/electronic-boundaries/${id}`));
}

export async function listElectronicBoundaries(query: ElectronicBoundaryQuery): Promise<PageResult<ElectronicBoundary>> {
  if (isMock()) {
    let list = getMockList();
    if (query.keyword) {
      const kw = query.keyword.trim();
      list = list.filter(b =>
        b.boundaryCode.includes(kw) ||
        b.name.includes(kw) ||
        (b.address || '').includes(kw)
      );
    }
    if (query.boundaryCode) {
      list = list.filter(b => b.boundaryCode === query.boundaryCode);
    }
    if (query.deviceId) {
      list = list.filter(b => b.deviceId === query.deviceId);
    }
    if (query.status !== undefined) {
      list = list.filter(b => b.status === query.status);
    }
    // 简化排序：仅按 updateTime 或 createTime
    if (query.orderBy === 'update_time') {
      list = list.slice().sort((a, b) =>
        (a.updateTime || '').localeCompare(b.updateTime || '') * (query.order === 'asc' ? 1 : -1)
      );
    } else if (query.orderBy === 'create_time') {
      list = list.slice().sort((a, b) =>
        (a.createTime || '').localeCompare(b.createTime || '') * (query.order === 'asc' ? 1 : -1)
      );
    }
    const pageNum = query.pageNum || 1;
    const pageSize = query.pageSize || 10;
    const start = (pageNum - 1) * pageSize;
    const pageList = list.slice(start, start + pageSize);
    return {
      total: list.length,
      pages: Math.ceil(list.length / pageSize),
      pageNum,
      pageSize,
      list: pageList
    };
  }
  // 真实后端返回结构: { records, pageNo, pageSize, total, pages, ... }
  // 这里做一层转换，统一为前端内部使用的 PageResult 结构
  const params: any = { ...query };
  const raw = await request<{
    records: ElectronicBoundary[];
    pageNo: number;
    pageSize: number;
    total: number;
    pages: number;
    sortBy?: string;
    order?: string;
  }>(api.get('/electronic-boundaries', { params }));

  return {
    list: raw.records || [],
    total: raw.total ?? (raw.records?.length || 0),
    pages: raw.pages ?? 1,
    pageNum: raw.pageNo ?? query.pageNum ?? 1,
    pageSize: raw.pageSize ?? query.pageSize ?? (raw.records?.length || 10)
  };
}

export async function queryBoundaryRealtime(body: BoundaryRealtimeRequest): Promise<BoundaryRealtimeResponse> {
  if (isMock()) {
    const list = getMockList();
    const target = body.id
      ? list.find(b => b.id === body.id)
      : body.deviceId
      ? list.find(b => b.deviceId === body.deviceId)
      : undefined;
    if (!target) throw new Error('电子界桩不存在');

    const now = new Date();
    const realtime: BoundaryRealtimeData = {
      reportTime: now.toISOString(),
      lngWgs84: target.lngWgs84,
      latWgs84: target.latWgs84,
      lngBd09: target.lngBd09,
      latBd09: target.latBd09,
      temperature: 25 + Math.random() * 8,
      humidity: 50 + Math.random() * 30,
      tiltAngle: Math.random() * 10,
      tiltStatus: Math.random() > 0.8 ? 1 : 0,
      vibrationStatus: Math.random() > 0.9 ? 1 : 0,
      voltage: 3.7 + Math.random() * 0.6,
      remainingPower: 10 + Math.floor(Math.random() * 90),
      signalStrength: 20 + Math.floor(Math.random() * 40),
      isAlert: Math.random() > 0.7 ? 1 : 0
    };

    const images: BoundaryImageDTO[] = [];
    for (let i = 0; i < 5; i++) {
      const t = new Date(now.getTime() - i * 10 * 60 * 1000);
      const code = `${target.deviceId}_${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, '0')}${String(t.getDate()).padStart(2, '0')}${String(t.getHours()).padStart(2, '0')}${String(t.getMinutes()).padStart(2, '0')}${String(t.getSeconds()).padStart(2, '0')}`;
      const w = 240 + (i % 3) * 20;
      const h = 160 + (i % 3) * 10;
      const url = `https://picsum.photos/${w}/${h}?boundary=${i}`;
      images.push({ imageCode: code, imagePath: url, reportTime: t.toISOString(), isComplete: 1 });
    }

    const alerts: BoundaryAlertDTO[] = [];
    if (realtime.isAlert === 1) {
      alerts.push({
        alertId: 10000 + target.id,
        alertType: '倾斜预警',
        alertCode: 1,
        alertTime: realtime.reportTime,
        alertDesc: '姿态报警，超过15°',
        handleStatus: 0
      });
    }

    return {
      baseInfo: target,
      realTimeData: realtime,
      images,
      alerts
    };
  }
  return await request<BoundaryRealtimeResponse>(api.post('/electronic-boundaries/realtime-db', body));
}
