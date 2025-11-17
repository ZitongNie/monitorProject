import api from './api';
import type { Station } from './stations';
import type { Pile } from './piles';

function isMock() {
  return (import.meta as any).env?.VITE_AUTH_MOCK === '1' || (import.meta as any).env?.VITE_AUTH_MOCK === 'true';
}

function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return fallback;
}

export async function getOverview() {
  if (isMock()) {
    const stations = getLocal<Station[]>('mock_stations', []);
    const piles = getLocal<Pile[]>('mock_piles', []);
    const sWarn = stations.filter(s => s.status === 'warn').length;
    const pWarn = piles.filter(p => p.status === 'warn').length;
    return {
      stations: { total: stations.length, warn: sWarn, safe: stations.length - sWarn },
      piles: { total: piles.length, warn: pWarn, safe: piles.length - pWarn }
    };
  }
  const { data } = await api.get('/analytics/overview');
  return data as {
    stations: { total: number; warn: number; safe: number };
    piles: { total: number; warn: number; safe: number };
  };
}

export async function getCounts() {
  if (isMock()) {
    const stations = getLocal<Station[]>('mock_stations', []);
    const piles = getLocal<Pile[]>('mock_piles', []);
    const sWarn = stations.filter(s => s.status === 'warn').length;
    const pWarn = piles.filter(p => p.status === 'warn').length;
    return {
      stationWarnCounts: [{ name: '全部', warn: sWarn, safe: stations.length - sWarn }],
      pileWarnCounts: [{ name: '全部', warn: pWarn, safe: piles.length - pWarn }]
    };
  }
  const { data } = await api.get('/analytics/counts');
  return data as {
    stationWarnCounts: Array<{ name: string; warn: number; safe: number }>;
    pileWarnCounts: Array<{ name: string; warn: number; safe: number }>;
  };
}
