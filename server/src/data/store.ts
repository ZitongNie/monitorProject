export type Role = 'admin'|'user';
export interface User { id: number; username: string; password: string; role: Role }
export interface Station { id: number; name: string; lat: number; lng: number; status: 'safe'|'warn'; picture?: string }
export interface Pile { id: number; code: string; lat: number; lng: number; status: 'safe'|'warn' }

// 电子界桩与监测/预警相关实体（用于模拟数据库）
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
  createTime: string;
  updateTime: string;
  lngWgs84: number;
  latWgs84: number;
  lngBd09: number;
  latBd09: number;
  initLngWgs84: number;
  initLatWgs84: number;
  initLngBd09: number;
  initLatBd09: number;
}

export interface BoundaryMonitorData {
  id: number;
  boundaryId: number;
  reportTime: string;
  lngWgs84: number;
  latWgs84: number;
  lngBd09: number;
  latBd09: number;
  temperature: number;
  humidity: number;
  tiltAngle: number;
  tiltStatus: number;
  vibrationStatus: number;
  voltage: number;
  remainingPower: number;
  signalStrength: number;
  isAlert: number;
}

export interface BoundaryImageData {
  id: number;
  boundaryId: number;
  imageCode: string;
  imagePath: string;
  reportTime: string;
  isComplete: 0 | 1;
}

export interface AlertInfo {
  id: number;
  deviceType: 1 | 2; // 1=白蚁, 2=电子界桩
  uniqueId: string;   // 设备唯一标识（如 deviceId）
  alertType: string;
  alertCode: number | string;
  alertTime: string;
  alertDesc?: string;
  handleStatus: 0 | 1; // 0=未处理 1=已处理
  handleTime?: string | null;
  handler?: string | null;
}

let userId = 2, stationId = 2, pileId = 2, boundaryId = 0;

export const db = {
  users: [
    { id: 1, username: 'admin', password: '123456', role: 'admin' as Role },
    { id: 2, username: 'user', password: '123456', role: 'user' as Role }
  ] as User[],
  stations: [
    { id: 1, name: '测站-001', lat: 23.1291, lng: 113.2644, status: 'safe' as const }
  ] as Station[],
  piles: [
    { id: 1, code: 'P-001', lat: 23.135, lng: 113.27, status: 'safe' as const }
  ] as Pile[],
  // 电子界桩基础信息
  boundaries: [] as ElectronicBoundary[],
  // 电子界桩最新监测数据（仅用于实时接口示例）
  boundaryMonitor: [] as BoundaryMonitorData[],
  // 电子界桩图片数据
  boundaryImages: [] as BoundaryImageData[],
  // 通用预警信息（白蚁/电子界桩共用）
  alerts: [] as AlertInfo[],
  history: {
    stations: new Map<number, Array<{ t: number; status: 'safe'|'warn' }>>(),
    piles: new Map<number, Array<{ t: number; status: 'safe'|'warn' }>>()
  }
};

export const nextIds = {
  user: () => ++userId,
  station: () => ++stationId,
  pile: () => ++pileId,
  boundary: () => ++boundaryId
};

export function pushHistory(type: 'stations'|'piles', id: number, status: 'safe'|'warn') {
  const map = db.history[type];
  const arr = map.get(id) || [];
  arr.push({ t: Date.now(), status });
  map.set(id, arr);
}

// 初始化历史数据
db.stations.forEach(s => pushHistory('stations', s.id, s.status));
db.piles.forEach(p => pushHistory('piles', p.id, p.status));
