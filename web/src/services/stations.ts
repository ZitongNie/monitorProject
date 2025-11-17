import api from './api';

export interface Station {
  id: number;
  name: string;
  lat: number;
  lng: number;
  status: 'safe' | 'warn';
  picture?: string;
}

function isMock() {
  return (import.meta as any).env?.VITE_AUTH_MOCK === '1' || (import.meta as any).env?.VITE_AUTH_MOCK === 'true';
}

function getMockStations(): Station[] {
  try {
    const raw = localStorage.getItem('mock_stations');
    if (raw) return JSON.parse(raw);
  } catch {}
  const seed: Station[] = [
    { id: 1, name: '测站-001', lat: 30.537, lng: 114.365, status: 'safe' },
    { id: 2, name: '测站-002', lat: 30.54, lng: 114.37, status: 'safe' }
  ];
  localStorage.setItem('mock_stations', JSON.stringify(seed));
  return seed;
}
function setMockStations(list: Station[]) {
  localStorage.setItem('mock_stations', JSON.stringify(list));
}

export async function listStations() {
  if (isMock()) return getMockStations();
  const { data } = await api.get('/stations');
  return data as Station[];
}

export async function createStation(payload: Partial<Station>) {
  if (isMock()) {
    const list = getMockStations();
    const id = list.length ? Math.max(...list.map(s => s.id)) + 1 : 1;
    const st: Station = { id, name: payload.name || `测站-${String(id).padStart(3,'0')}`, lat: payload.lat!, lng: payload.lng!, status: payload.status || 'safe', picture: payload.picture };
    list.push(st); setMockStations(list);
    pushMockHistory('station', st.id, st.status);
    return st;
  }
  const { data } = await api.post('/stations', payload);
  return data as Station;
}

export async function updateStation(id: number, payload: Partial<Station>) {
  if (isMock()) {
    const list = getMockStations();
    const idx = list.findIndex(s => s.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...payload } as Station;
      setMockStations(list);
      if (payload.status) pushMockHistory('station', id, payload.status as any);
      return list[idx];
    }
    throw new Error('not found');
  }
  const { data } = await api.put(`/stations/${id}`, payload);
  return data as Station;
}

export async function deleteStation(id: number) {
  if (isMock()) {
    const list = getMockStations().filter(s => s.id !== id);
    setMockStations(list);
    localStorage.removeItem(`mock_hist_station_${id}`);
    return;
  }
  await api.delete(`/stations/${id}`);
}

export async function getStationHistory(id: number) {
  if (isMock()) {
    return getMockHistory('station', id);
  }
  const { data } = await api.get(`/stations/${id}/history`);
  return data as Array<{ t: number; status: 'safe'|'warn' }>;
}

function pushMockHistory(type: 'station'|'pile', id: number, status: 'safe'|'warn') {
  const key = `mock_hist_${type}_${id}`;
  const arr = getMockHistory(type, id);
  arr.push({ t: Date.now(), status });
  localStorage.setItem(key, JSON.stringify(arr));
}
function getMockHistory(type: 'station'|'pile', id: number) {
  const key = `mock_hist_${type}_${id}`;
  try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw); } catch {}
  const seed = [{ t: Date.now() - 3600_000, status: 'safe' as const }];
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}
