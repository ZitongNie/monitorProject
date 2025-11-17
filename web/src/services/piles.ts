import api from './api';

export interface Pile {
  id: number;
  code: string;
  lat: number;
  lng: number;
  status: 'safe' | 'warn';
}

function isMock() {
  return (import.meta as any).env?.VITE_AUTH_MOCK === '1' || (import.meta as any).env?.VITE_AUTH_MOCK === 'true';
}

function getMockPiles(): Pile[] {
  try {
    const raw = localStorage.getItem('mock_piles');
    if (raw) return JSON.parse(raw);
  } catch {}
  const seed: Pile[] = [
    { id: 1, code: 'EP-001', lat: 30.536, lng: 114.362, status: 'safe' },
    { id: 2, code: 'EP-002', lat: 30.538, lng: 114.368, status: 'warn' }
  ];
  localStorage.setItem('mock_piles', JSON.stringify(seed));
  return seed;
}
function setMockPiles(list: Pile[]) {
  localStorage.setItem('mock_piles', JSON.stringify(list));
}

export async function listPiles() {
  if (isMock()) return getMockPiles();
  const { data } = await api.get('/piles');
  return data as Pile[];
}

export async function createPile(payload: Partial<Pile>) {
  if (isMock()) {
    const list = getMockPiles();
    const id = list.length ? Math.max(...list.map(p => p.id)) + 1 : 1;
    const pile: Pile = { id, code: payload.code || `EP-${String(id).padStart(3,'0')}`, lat: payload.lat!, lng: payload.lng!, status: payload.status || 'safe' };
    list.push(pile); setMockPiles(list);
    pushMockHistory('pile', pile.id, pile.status);
    return pile;
  }
  const { data } = await api.post('/piles', payload);
  return data as Pile;
}

export async function updatePile(id: number, payload: Partial<Pile>) {
  if (isMock()) {
    const list = getMockPiles();
    const idx = list.findIndex(p => p.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...payload } as Pile;
      setMockPiles(list);
      if (payload.status) pushMockHistory('pile', id, payload.status as any);
      return list[idx];
    }
    throw new Error('not found');
  }
  const { data } = await api.put(`/piles/${id}`, payload);
  return data as Pile;
}

export async function deletePile(id: number) {
  if (isMock()) {
    const list = getMockPiles().filter(p => p.id !== id);
    setMockPiles(list);
    localStorage.removeItem(`mock_hist_pile_${id}`);
    return;
  }
  await api.delete(`/piles/${id}`);
}

export async function getPileHistory(id: number) {
  if (isMock()) return getMockHistory('pile', id);
  const { data } = await api.get(`/piles/${id}/history`);
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
