export type Role = 'admin'|'user';
export interface User { id: number; username: string; password: string; role: Role }
export interface Station { id: number; name: string; lat: number; lng: number; status: 'safe'|'warn'; picture?: string }
export interface Pile { id: number; code: string; lat: number; lng: number; status: 'safe'|'warn' }

let userId = 2, stationId = 2, pileId = 2;

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
  history: {
    stations: new Map<number, Array<{ t: number; status: 'safe'|'warn' }>>(),
    piles: new Map<number, Array<{ t: number; status: 'safe'|'warn' }>>()
  }
};

export const nextIds = {
  user: () => ++userId,
  station: () => ++stationId,
  pile: () => ++pileId
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
