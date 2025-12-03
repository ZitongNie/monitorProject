import api from './api';

// WGS84 → GCJ-02 转换（用于模拟后端坐标转换）
function wgs84ToGcj02(lng: number, lat: number) {
  const a = 6378245.0; // 长半轴
  const ee = 0.00669342162296594323; // 偏心率平方
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = lat / 180.0 * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI);
  dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * Math.PI);
  return { lng: lng + dLng, lat: lat + dLat };
}

function transformLat(lng: number, lat: number) {
  let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
  ret += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(lat * Math.PI) + 40.0 * Math.sin(lat / 3.0 * Math.PI)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(lat / 12.0 * Math.PI) + 320 * Math.sin(lat * Math.PI / 30.0)) * 2.0 / 3.0;
  return ret;
}

function transformLng(lng: number, lat: number) {
  let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
  ret += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(lng * Math.PI) + 40.0 * Math.sin(lng / 3.0 * Math.PI)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(lng / 12.0 * Math.PI) + 300.0 * Math.sin(lng / 30.0 * Math.PI)) * 2.0 / 3.0;
  return ret;
}

// GCJ-02 → BD-09 转换
function gcj02ToBd09(lng: number, lat: number) {
  const x = lng, y = lat;
  const z = Math.sqrt(x * x + y * y) + 0.00002 * Math.sin(y * Math.PI * 3000.0 / 180.0);
  const theta = Math.atan2(y, x) + 0.000003 * Math.cos(x * Math.PI * 3000.0 / 180.0);
  const bdLng = z * Math.cos(theta) + 0.0065;
  const bdLat = z * Math.sin(theta) + 0.006;
  return { lng: bdLng, lat: bdLat };
}

// 白蚁监测站实体接口定义
export interface TermiteStation {
  id: number;
  stationCode: string;
  name: string;
  rtuid: string;
  reservoirCode: string;
  password?: string;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
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

export interface TermiteStationQuery {
  pageNo?: number;
  pageSize?: number;
  stationCode?: string;
  name?: string;
  rtuid?: string;
  reservoirCode?: string;
  status?: 0 | 1;
  contactPerson?: string;
  contactPhone?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface PageResult<T> {
  records: T[];
  pageNo: number;
  pageSize: number;
  total: number;
  pages: number;
  sortBy?: string;
  order?: string;
}

export interface TermiteRealtimeRequest {
  id?: number;
  rtuid?: string;
  reservoirCode?: string;
  includeImages?: boolean;
  includeAlerts?: boolean;
  imageLimit?: number;
  handledMonths?: number;
}

export interface TermiteRealtimeResponse {
  baseInfo: TermiteStation;
  realTimeData?: {
    reportTime: string;
    lngWgs84?: number; latWgs84?: number; lngBd09?: number; latBd09?: number;
    termiteStatus?: number; // 0|1
    devicePower?: number;
    pointOrder?: string;
    signalStrength?: number;
    isAlert?: number; // 0|1
  };
  alerts?: {
    openAlerts: Array<AlertDTO>;
    recentHandledAlerts: Array<AlertDTO>;
  };
  images?: Array<ImageDTO>;
}
export interface AlertDTO {
  alertId: number;
  alertType: string;
  alertCode: number;
  alertTime: string;
  alertDesc?: string;
  handleStatus: 0 | 1;
  handleTime?: string | null;
  handler?: string | null;
}
export interface ImageDTO {
  imageCode: string;
  imagePath: string;
  reportTime: string;
  isComplete: number;
}

function isMock() {
  const mockValue = (import.meta as any).env?.VITE_AUTH_MOCK;
  const result = mockValue === '1' || mockValue === 'true';
  console.log('[termiteStations] isMock() check:', { mockValue, result });
  return result;
}

function isRealtimeMock() {
  const mockValue = (import.meta as any).env?.VITE_REALTIME_MOCK;
  const result = mockValue === '1' || mockValue === 'true';
  console.log('[termiteStations] isRealtimeMock() check:', { mockValue, result });
  return result;
}

interface Wrapper<T> { code: number; message: string; data: T; }

async function request<T>(promise: Promise<any>): Promise<T> {
  const res = await promise;
  const body: Wrapper<T> = res.data;
  console.log('[termiteStations] 响应数据:', body);
  if (body.code !== 200) {
    console.error('[termiteStations] 请求失败:', body);
    throw new Error(body.message || 'serverError');
  }
  return body.data;
}

// --- Mock 数据 ---
function getMockList(): TermiteStation[] {
  try { const raw = localStorage.getItem('mock_termiteStations'); if (raw) return JSON.parse(raw); } catch {}
  // 种子数据：使用真实 WGS84 坐标并转换为 BD09（武汉地区多个测站）
  const createStation = (id: number, code: string, name: string, rtuid: string, reservoirCode: string, wgs84Lng: number, wgs84Lat: number, address: string, person: string, phone: string, status: 0|1) => {
    const { lng: gcjLng, lat: gcjLat } = wgs84ToGcj02(wgs84Lng, wgs84Lat);
    const { lng: bdLng, lat: bdLat } = gcj02ToBd09(gcjLng, gcjLat);
    return { id, stationCode: code, name, rtuid, reservoirCode, password: '1234', address, contactPerson: person, contactPhone: phone, status, createTime: new Date().toISOString(), updateTime: new Date().toISOString(), lngWgs84: wgs84Lng, latWgs84: wgs84Lat, lngBd09: bdLng, latBd09: bdLat, initLngWgs84: wgs84Lng, initLatWgs84: wgs84Lat, initLngBd09: bdLng, initLatBd09: bdLat };
  };
  
  const seed: TermiteStation[] = [
    createStation(101, 'BYZ-0001', '白蚁监测站-江汉区001', '6666666601', '1200000001', 114.305278, 30.593099, '湖北省武汉市江汉区民权路', '张三', '13900000001', 1),
    createStation(102, 'BYZ-0002', '白蚁监测站-硚口区002', '6666666602', '1200000002', 114.315278, 30.603099, '湖北省武汉市硚口区解放大道', '李四', '13900000002', 1),
    createStation(103, 'BYZ-0003', '白蚁监测站-江岸区003', '6666666603', '1200000003', 114.295000, 30.605000, '湖北省武汉市江岸区黄浦大街', '王五', '13900000003', 0),
    createStation(104, 'BYZ-0004', '白蚁监测站-武昌区004', '6666666604', '1200000004', 114.315000, 30.585000, '湖北省武汉市武昌区中南路', '赵六', '13900000004', 1),
    createStation(105, 'BYZ-0005', '白蚁监测站-洪山区005', '6666666605', '1200000005', 114.340000, 30.570000, '湖北省武汉市洪山区珞狮路', '钱七', '13900000005', 0),
    createStation(106, 'BYZ-0006', '白蚁监测站-汉阳区006', '6666666606', '1200000006', 114.270000, 30.560000, '湖北省武汉市汉阳区汉阳大道', '孙八', '13900000006', 1),
    createStation(107, 'BYZ-0007', '白蚁监测站-青山区007', '6666666607', '1200000007', 114.390000, 30.640000, '湖北省武汉市青山区建设一路', '周九', '13900000007', 1),
    createStation(108, 'BYZ-0008', '白蚁监测站-东湖区008', '6666666608', '1200000008', 114.385000, 30.560000, '湖北省武汉市东湖新技术开发区光谷大道', '吴十', '13900000008', 0),
    createStation(109, 'BYZ-0009', '白蚁监测站-蔡甸区009', '6666666609', '1200000009', 114.030000, 30.580000, '湖北省武汉市蔡甸区蔡甸大街', '郑十一', '13900000009', 1),
    createStation(110, 'BYZ-0010', '白蚁监测站-江夏区010', '6666666610', '1200000010', 114.320000, 30.380000, '湖北省武汉市江夏区纸坊大街', '冯十二', '13900000010', 0),
  ];
  localStorage.setItem('mock_termiteStations', JSON.stringify(seed));
  return seed;
}
function setMockList(list: TermiteStation[]) { localStorage.setItem('mock_termiteStations', JSON.stringify(list)); }

export async function listTermiteStations(query: TermiteStationQuery): Promise<PageResult<TermiteStation>> {
  console.log('[listTermiteStations] 开始查询, isMock:', isMock(), 'query:', query);
  if (isMock()) {
    console.log('[listTermiteStations] 使用 Mock 数据');
    let list = getMockList();
    console.log('[listTermiteStations] Mock 数据数量:', list.length);
    // 过滤
    list = list.filter(st => {
      if (query.stationCode && !st.stationCode.includes(query.stationCode)) return false;
      if (query.name && !st.name.includes(query.name)) return false;
      if (query.rtuid && !st.rtuid.includes(query.rtuid)) return false;
      if (query.reservoirCode && st.reservoirCode !== query.reservoirCode) return false;
      if (query.status !== undefined && st.status !== query.status) return false;
      if (query.contactPerson && !((st.contactPerson||'').includes(query.contactPerson))) return false;
      if (query.contactPhone && !((st.contactPhone||'').includes(query.contactPhone))) return false;
      return true;
    });
    const pageNo = query.pageNo || 1; const pageSize = query.pageSize || 10;
    const start = (pageNo - 1) * pageSize; const records = list.slice(start, start + pageSize);
    console.log('[listTermiteStations] Mock 返回数据:', { records: records.length, total: list.length });
    return { records, pageNo, pageSize, total: list.length, pages: Math.ceil(list.length / pageSize), sortBy: query.sortBy, order: query.order };
  }
  console.log('[listTermiteStations] 使用真实后端 API, 请求参数:', query);
  const params: any = { ...query };
  console.log('[listTermiteStations] 发送请求到: /termite-stations, params:', params);
  try {
    const result = await request<PageResult<TermiteStation>>(api.get('/termite-stations', { params }));
    console.log('[listTermiteStations] 请求成功，返回数据:', result);
    return result;
  } catch (error) {
    console.error('[listTermiteStations] 请求失败:', error);
    throw error;
  }
}

export async function getTermiteStationDetail(id: number): Promise<TermiteStation> {
  if (isMock()) {
    const st = getMockList().find(s => s.id === id); if (!st) throw new Error('白蚁监测站不存在'); return st;
  }
  return await request<TermiteStation>(api.get(`/termite-stations/${id}`));
}

export async function createTermiteStation(payload: Partial<TermiteStation>): Promise<void> {
  if (isMock()) {
    const list = getMockList();
    if (list.some(s => s.stationCode === payload.stationCode)) throw new Error('监测站编号已存在');
    if (payload.rtuid && list.some(s => s.rtuid === payload.rtuid)) throw new Error('设备唯一标识已存在');
    const id = list.length ? Math.max(...list.map(s => s.id)) + 1 : 1;
    const now = new Date().toISOString();
    
    // Mock 坐标转换：WGS84 → BD09（使用真实转换算法模拟后端行为）
    let lngBd09 = payload.lngWgs84;
    let latBd09 = payload.latWgs84;
    if (payload.lngWgs84 && payload.latWgs84) {
      // 粗略 WGS84→GCJ02→BD09 转换（基于常用算法）
      const { lng: gcjLng, lat: gcjLat } = wgs84ToGcj02(payload.lngWgs84, payload.latWgs84);
      const bd = gcj02ToBd09(gcjLng, gcjLat);
      lngBd09 = bd.lng;
      latBd09 = bd.lat;
    }
    
    const st: TermiteStation = {
      id,
      stationCode: payload.stationCode || `BYZ-${String(id).padStart(4,'0')}`,
      name: payload.name || `白蚁监测站-${String(id).padStart(3,'0')}`,
      rtuid: payload.rtuid || `RTU-${String(id).padStart(3,'0')}`,
      reservoirCode: payload.reservoirCode || '0000000000',
      password: payload.password || '123456',
      address: payload.address || '',
      contactPerson: payload.contactPerson || '',
      contactPhone: payload.contactPhone || '',
      status: payload.status ?? 0,
      createTime: now,
      updateTime: now,
      lngWgs84: payload.lngWgs84,
      latWgs84: payload.latWgs84,
      lngBd09,
      latBd09,
      initLngWgs84: payload.lngWgs84,
      initLatWgs84: payload.latWgs84,
      initLngBd09: lngBd09,
      initLatBd09: latBd09
    };
    list.push(st); setMockList(list); return;
  }
  await request<void>(api.post('/termite-stations', payload));
}

export async function updateTermiteStation(id: number, payload: Partial<TermiteStation>): Promise<void> {
  if (isMock()) {
    const list = getMockList(); const idx = list.findIndex(s => s.id === id); if (idx < 0) throw new Error('白蚁监测站不存在');
    // 唯一性校验
    if (payload.stationCode && payload.stationCode !== list[idx].stationCode && list.some(s => s.stationCode === payload.stationCode)) throw new Error('监测站编号已存在');
    if (payload.rtuid && payload.rtuid !== list[idx].rtuid && list.some(s => s.rtuid === payload.rtuid)) throw new Error('设备唯一标识已存在');
    const merged = { ...list[idx], ...Object.fromEntries(Object.entries(payload).filter(([_,v]) => v !== '')) } as TermiteStation;
    merged.updateTime = new Date().toISOString();
    // 坐标转换：如果更新了 WGS84 则重新计算 BD09
    if (payload.lngWgs84 && payload.latWgs84) {
      const { lng: gcjLng, lat: gcjLat } = wgs84ToGcj02(payload.lngWgs84, payload.latWgs84);
      const bd = gcj02ToBd09(gcjLng, gcjLat);
      merged.lngBd09 = bd.lng;
      merged.latBd09 = bd.lat;
    }
    list[idx] = merged; setMockList(list); return;
  }
  await request<void>(api.put(`/termite-stations/${id}`, payload));
}

export async function deleteTermiteStation(id: number): Promise<void> {
  if (isMock()) {
    const list = getMockList(); const idx = list.findIndex(s => s.id === id); if (idx < 0) throw new Error('白蚁监测站不存在');
    list.splice(idx,1); setMockList(list); return;
  }
  await request<void>(api.delete(`/termite-stations/${id}`));
}

export async function queryTermiteRealtime(body: TermiteRealtimeRequest): Promise<TermiteRealtimeResponse> {
  if (isRealtimeMock() || isMock()) {
    const list = getMockList();
    const target = body.id ? list.find(s => s.id === body.id) : body.rtuid ? list.find(s => s.rtuid === body.rtuid) : body.reservoirCode ? list.find(s => s.reservoirCode === body.reservoirCode) : undefined;
    if (!target) throw new Error('白蚁监测站不存在');
    // 参数校验（与后端规范保持一致）
    const imageLimit = body.imageLimit ?? 5;
    const handledMonths = body.handledMonths ?? 6;
    if (imageLimit < 1 || imageLimit > 20) throw new Error('参数校验失败：imageLimit 必须在 1..20');
    if (handledMonths < 1 || handledMonths > 12) throw new Error('参数校验失败：handledMonths 必须在 1..12');

    // 构造最近图片（倒序时间），使用公共占位图API确保可显示
    const images: ImageDTO[] = [];
    if (body.includeImages !== false) {
      for (let i = 0; i < imageLimit; i++) {
        const t = new Date(Date.now() - i * 5 * 60 * 1000); // 每张间隔5分钟
        const ts = t.toISOString();
        const code = `TS_${target.rtuid}_${t.getFullYear()}${String(t.getMonth()+1).padStart(2,'0')}${String(t.getDate()).padStart(2,'0')}${String(t.getHours()).padStart(2,'0')}${String(t.getMinutes()).padStart(2,'0')}${String(t.getSeconds()).padStart(2,'0')}`;
        // 使用 picsum.photos 公共占位图服务，每张图不同尺寸以示区别
        const w = 240 + (i % 3) * 20;
        const h = 160 + (i % 3) * 10;
        const placeholderUrl = `https://picsum.photos/${w}/${h}?random=${i}`;
        images.push({ imageCode: code, imagePath: placeholderUrl, reportTime: ts, isComplete: 1 });
      }
    }

    // 构造预警集合
    let alertsOpen: AlertDTO[] = [];
    let alertsHandled: AlertDTO[] = [];
    if (body.includeAlerts !== false) {
      // 未处理：给一到两条
      alertsOpen = [
        { alertId: 9876, alertType: '白蚁预警', alertCode: 102, alertTime: new Date().toISOString(), alertDesc: '检测到白蚁活动', handleStatus: 0, handleTime: null, handler: null }
      ];
      // 已处理：近 handledMonths 月内的若干条
      const now = Date.now();
      for (let i = 1; i <= Math.min(3, handledMonths); i++) {
        const tAlert = new Date(now - i * 24 * 3600 * 1000 * 10); // 每条相隔约10天
        alertsHandled.push({
          alertId: 8000 + i,
          alertType: '白蚁预警',
          alertCode: 102,
          alertTime: tAlert.toISOString(),
          alertDesc: '检测到白蚁活动',
          handleStatus: 1,
          handleTime: new Date(tAlert.getTime() + 3600 * 1000).toISOString(),
          handler: 'admin'
        });
      }
    }
    return {
      baseInfo: target,
      realTimeData: {
        reportTime: new Date().toISOString(),
        lngWgs84: target.lngWgs84, latWgs84: target.latWgs84, lngBd09: target.lngBd09, latBd09: target.latBd09,
        termiteStatus: Math.random() > 0.5 ? 1 : 0,
        devicePower: 80 + Math.round(Math.random()*19),
        pointOrder: '1-1',
        signalStrength: Math.round(Math.random()*4),
        isAlert: Math.random() > 0.7 ? 1 : 0
      },
      alerts: body.includeAlerts === false ? { openAlerts: [], recentHandledAlerts: [] } : {
        openAlerts: alertsOpen,
        recentHandledAlerts: alertsHandled
      },
      images
    };
  }
  return await request<TermiteRealtimeResponse>(api.post('/termite-stations/realtime:query', body));
}
