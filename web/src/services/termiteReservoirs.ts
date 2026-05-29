import api from './api';
import dayjs from 'dayjs';

function isRealtimeMock() {
  const mockValue = (import.meta as any).env?.VITE_REALTIME_MOCK;
  return mockValue === '1' || mockValue === 'true';
}

interface Wrapper<T> { code: number; message: string; data: T; }

async function request<T>(promise: Promise<any>): Promise<T> {
  const res = await promise;
  const body: Wrapper<T> = res.data;
  if (body.code !== 200) {
    throw new Error(body.message || 'serverError');
  }
  return body.data;
}

// WGS84 -> BD09 (via GCJ02) for mock marker placement
function wgs84ToGcj02(lng: number, lat: number) {
  const a = 6378245.0;
  const ee = 0.00669342162296594323;
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

function gcj02ToBd09(lng: number, lat: number) {
  const x = lng, y = lat;
  const z = Math.sqrt(x * x + y * y) + 0.00002 * Math.sin(y * Math.PI * 3000.0 / 180.0);
  const theta = Math.atan2(y, x) + 0.000003 * Math.cos(x * Math.PI * 3000.0 / 180.0);
  const bdLng = z * Math.cos(theta) + 0.0065;
  const bdLat = z * Math.sin(theta) + 0.006;
  return { lng: bdLng, lat: bdLat };
}

function toBd09(lngWgs84: number, latWgs84: number) {
  const { lng: gcjLng, lat: gcjLat } = wgs84ToGcj02(lngWgs84, latWgs84);
  return gcj02ToBd09(gcjLng, gcjLat);
}

function buildDamStations(
  baseId: number,
  codePrefix: string,
  namePrefix: string,
  centerLngWgs84: number,
  centerLatWgs84: number
) {
  const offsets = [-0.0005, -0.00016, 0.00016, 0.0005];
  const statuses: Array<{ display: 'HAS_TERMITE' | 'NO_TERMITE' | 'NO_DATA'; termite: 0 | 1 | null; online: 0 | 1; time: string | null }> = [
    { display: 'NO_TERMITE', termite: 0, online: 1, time: '2026-05-29T09:10:00' },
    { display: 'HAS_TERMITE', termite: 1, online: 1, time: '2026-05-29T08:40:00' },
    { display: 'NO_DATA', termite: null, online: 0, time: null },
    { display: 'NO_TERMITE', termite: 0, online: 1, time: '2026-05-29T07:58:00' }
  ];
  return offsets.map((dx, i) => {
    const lng = centerLngWgs84 + dx;
    const lat = centerLatWgs84 + (i % 2 === 0 ? 0.00004 : -0.00004);
    const bd = toBd09(lng, lat);
    return {
      stationId: baseId + i,
      stationCode: `${codePrefix}-${String(i + 1).padStart(3, '0')}`,
      stationName: `${namePrefix}-${i + 1}号点`,
      rtuid: `${codePrefix}RT${String(i + 1).padStart(3, '0')}`,
      lngWgs84: Number(lng.toFixed(6)),
      latWgs84: Number(lat.toFixed(6)),
      lngBd09: Number(bd.lng.toFixed(6)),
      latBd09: Number(bd.lat.toFixed(6)),
      displayStatus: statuses[i].display,
      termiteStatus: statuses[i].termite,
      latestReportTime: statuses[i].time,
      status: statuses[i].online
    };
  });
}

function buildDamStationsBd09(
  baseId: number,
  codePrefix: string,
  namePrefix: string,
  centerLngBd09: number,
  centerLatBd09: number,
  centerLngWgs84?: number,
  centerLatWgs84?: number
) {
  const offsets = [-0.0005, -0.00016, 0.00016, 0.0005];
  const statuses: Array<{ display: 'HAS_TERMITE' | 'NO_TERMITE' | 'NO_DATA'; termite: 0 | 1 | null; online: 0 | 1; time: string | null }> = [
    { display: 'NO_TERMITE', termite: 0, online: 1, time: '2026-05-29T09:10:00' },
    { display: 'HAS_TERMITE', termite: 1, online: 1, time: '2026-05-29T08:40:00' },
    { display: 'NO_DATA', termite: null, online: 0, time: null },
    { display: 'NO_TERMITE', termite: 0, online: 1, time: '2026-05-29T07:58:00' }
  ];
  return offsets.map((dx, i) => {
    const lng = centerLngBd09 + dx;
    const lat = centerLatBd09 + (i % 2 === 0 ? 0.00004 : -0.00004);
    const lngWgs84 = centerLngWgs84 !== undefined ? centerLngWgs84 + dx : undefined;
    const latWgs84 = centerLatWgs84 !== undefined ? centerLatWgs84 + (i % 2 === 0 ? 0.00004 : -0.00004) : undefined;
    return {
      stationId: baseId + i,
      stationCode: `${codePrefix}-${String(i + 1).padStart(3, '0')}`,
      stationName: `${namePrefix}-${i + 1}号点`,
      rtuid: `${codePrefix}RT${String(i + 1).padStart(3, '0')}`,
      lngWgs84: lngWgs84 !== undefined ? Number(lngWgs84.toFixed(6)) : undefined,
      latWgs84: latWgs84 !== undefined ? Number(latWgs84.toFixed(6)) : undefined,
      lngBd09: Number(lng.toFixed(6)),
      latBd09: Number(lat.toFixed(6)),
      displayStatus: statuses[i].display,
      termiteStatus: statuses[i].termite,
      latestReportTime: statuses[i].time,
      status: statuses[i].online
    };
  });
}

export interface ReservoirOption {
  reservoirCode: string;
  reservoirName: string;
  stationCount: number;
}

export interface TermiteMarker {
  stationId: number;
  stationCode: string;
  stationName: string;
  rtuid: string;
  reservoirCode: string;
  reservoirName: string;
  lngBd09: number;
  latBd09: number;
  lngWgs84?: number;
  latWgs84?: number;
  displayStatus: 'HAS_TERMITE' | 'NO_TERMITE' | 'NO_DATA';
  termiteStatus: 0 | 1 | null;
  latestReportTime: string | null;
}

export interface TermiteTableRow {
  stationId: number;
  monitorDate: string;
  stationCode: string;
  stationName: string;
  rtuid: string;
  termiteStatus: 0 | 1 | null;
  displayStatus: 'HAS_TERMITE' | 'NO_TERMITE' | 'NO_DATA';
  handleStatus: 0 | 1 | null;
  handleStatusLabel: '未处理' | '已处理' | null;
  latestReportTime: string | null;
}

export interface TermiteOverviewQuery {
  reservoirCode: string;
  monitorDate: string;
}

export interface TermiteOverviewResponse {
  reservoirCode: string;
  reservoirName: string;
  monitorDate: string;
  stationCount: number;
  hasTermiteCount: number;
  noTermiteCount: number;
  noDataCount: number;
  markers: TermiteMarker[];
  tableRows: TermiteTableRow[];
}

export interface TermiteTrendQuery {
  reservoirCode: string;
  startDate: string;
  endDate: string;
}

export interface TermiteTrendPoint {
  date: string;
  hasTermiteStationCount: number;
}

export interface TermiteTrendResponse {
  reservoirCode: string;
  reservoirName: string;
  startDate: string;
  endDate: string;
  points: TermiteTrendPoint[];
}

export interface TermiteStationsQuery {
  reservoirCode: string;
}

export interface TermiteStationOption {
  stationId: number;
  stationCode: string;
  stationName: string;
  rtuid: string;
  reservoirCode: string;
  reservoirName: string;
  status: 0 | 1;
  latestTermiteStatus: 0 | 1 | null;
  displayStatus: 'HAS_TERMITE' | 'NO_TERMITE' | 'NO_DATA';
  latestReportTime: string | null;
}

export interface TermiteStationsResponse {
  reservoirCode: string;
  reservoirName: string;
  stations: TermiteStationOption[];
}

export interface TermiteImagesQuery {
  reservoirCode: string;
  stationId: number;
  startTime?: string;
  endTime?: string;
  pageNo?: number;
  pageSize?: number;
  selectedImageId?: number;
}

export interface TermiteImageRecord {
  imageId: number;
  imageCode: string;
  imageUrl: string;
  reportTime: string;
  isComplete: 0 | 1;
}

export interface TermiteImageDetail {
  reservoirCode: string;
  reservoirName: string;
  stationId: number;
  stationCode: string;
  stationName: string;
  imageId: number;
  imageCode: string;
  imageUrl: string;
  reportTime: string;
  aiBoxes: any[];
}

export interface TermiteImagesResponse {
  reservoirCode: string;
  reservoirName: string;
  stationId: number;
  stationCode: string;
  stationName: string;
  records: TermiteImageRecord[];
  pageNo: number;
  pageSize: number;
  total: number;
  pages: number;
  selectedImage: TermiteImageDetail | null;
}

export interface TermiteImageDetailQuery {
  reservoirCode: string;
  stationId: number;
  imageId: number;
}

const mockReservoirs: Array<{
  reservoirCode: string;
  reservoirName: string;
  cityName: string;
  provinceName: string;
  stations: Array<{
    stationId: number;
    stationCode: string;
    stationName: string;
    rtuid: string;
    lngWgs84?: number;
    latWgs84?: number;
    lngBd09: number;
    latBd09: number;
    displayStatus: 'HAS_TERMITE' | 'NO_TERMITE' | 'NO_DATA';
    termiteStatus: 0 | 1 | null;
    latestReportTime: string | null;
    status: 0 | 1;
  }>;
}> = [
  {
    reservoirCode: '1200000001',
    reservoirName: '三门峡水库',
    cityName: '三门峡市',
    provinceName: '河南省',
    stations: buildDamStations(93001, 'SMX-TM', '三门峡水库大坝', 111.34472, 34.82944)
  },
  {
    reservoirCode: '1200000002',
    reservoirName: '三峡水库',
    cityName: '宜昌市',
    provinceName: '湖北省',
    stations: buildDamStationsBd09(93101, 'SX-TM', '三峡大坝', 111.282532, 30.742781, 111.258675, 30.766743)
  },
  {
    reservoirCode: '1200000003',
    reservoirName: '丹江口水库',
    cityName: '十堰市',
    provinceName: '湖北省',
    stations: buildDamStations(93201, 'DJK-TM', '丹江口大坝', 111.126934, 32.711372)
  },
  {
    reservoirCode: '1200000004',
    reservoirName: '漳河水库',
    cityName: '荆门市',
    provinceName: '湖北省',
    stations: buildDamStations(93301, 'ZH-TM', '漳河大坝', 112.071653, 30.996204)
  },
  {
    reservoirCode: '1200000005',
    reservoirName: '王英水库',
    cityName: '黄石市',
    provinceName: '湖北省',
    stations: buildDamStations(93401, 'WY-TM', '王英大坝', 114.844231, 29.789419)
  },
  {
    reservoirCode: '1200000006',
    reservoirName: '浮桥河水库',
    cityName: '黄冈市',
    provinceName: '湖北省',
    stations: buildDamStations(93501, 'FQH-TM', '浮桥河大坝', 114.845285, 31.21505)
  },
  {
    reservoirCode: '1200000007',
    reservoirName: '北山水库',
    cityName: '钟祥市',
    provinceName: '湖北省',
    stations: buildDamStations(93601, 'BS-TM', '北山大坝', 112.408297, 31.195261)
  }
];

export interface MockReservoirStation {
  reservoirCode: string;
  reservoirName: string;
  cityName: string;
  provinceName: string;
  stationId: number;
  stationCode: string;
  stationName: string;
  rtuid: string;
  lngWgs84?: number;
  latWgs84?: number;
  lngBd09: number;
  latBd09: number;
  displayStatus: 'HAS_TERMITE' | 'NO_TERMITE' | 'NO_DATA';
  termiteStatus: 0 | 1 | null;
  latestReportTime: string | null;
  status: 0 | 1;
}

export function getMockReservoirStations(): MockReservoirStation[] {
  return mockReservoirs.flatMap((reservoir) =>
    reservoir.stations.map((station) => ({
      reservoirCode: reservoir.reservoirCode,
      reservoirName: reservoir.reservoirName,
      cityName: reservoir.cityName,
      provinceName: reservoir.provinceName,
      stationId: station.stationId,
      stationCode: station.stationCode,
      stationName: station.stationName,
      rtuid: station.rtuid,
      lngWgs84: station.lngWgs84,
      latWgs84: station.latWgs84,
      lngBd09: station.lngBd09,
      latBd09: station.latBd09,
      displayStatus: station.displayStatus,
      termiteStatus: station.termiteStatus,
      latestReportTime: station.latestReportTime,
      status: station.status
    }))
  );
}

const mockImageFiles = ['qs-001.jpg', 'qs-002.jpg', 'qs-003.jpg'];
const mockImageBase = `${(import.meta as any).env?.BASE_URL || '/'}termite/demo`;

function getMockReservoir(reservoirCode: string) {
  return mockReservoirs.find(r => r.reservoirCode === reservoirCode) || mockReservoirs[0];
}

export async function fetchReservoirOptions(): Promise<{ reservoirs: ReservoirOption[] }> {
  if (isRealtimeMock()) {
    const reservoirs = mockReservoirs.map(r => ({
      reservoirCode: r.reservoirCode,
      reservoirName: r.reservoirName,
      stationCount: r.stations.length
    }));
    return { reservoirs };
  }
  return await request<{ reservoirs: ReservoirOption[] }>(
    api.get('/termite-reservoirs/reservoir-options')
  );
}

export async function fetchOverview(q: TermiteOverviewQuery): Promise<TermiteOverviewResponse> {
  if (isRealtimeMock()) {
    const target = getMockReservoir(q.reservoirCode);
    const tableRows: TermiteTableRow[] = target.stations.map(st => ({
      stationId: st.stationId,
      monitorDate: q.monitorDate,
      stationCode: st.stationCode,
      stationName: st.stationName,
      rtuid: st.rtuid,
      termiteStatus: st.termiteStatus,
      displayStatus: st.displayStatus,
      handleStatus: st.termiteStatus === 1 ? 0 : st.termiteStatus === 0 ? 1 : null,
      handleStatusLabel: st.termiteStatus === 1 ? '未处理' : st.termiteStatus === 0 ? '已处理' : null,
      latestReportTime: st.latestReportTime
    }));
    const hasTermiteCount = tableRows.filter(r => r.displayStatus === 'HAS_TERMITE').length;
    const noTermiteCount = tableRows.filter(r => r.displayStatus === 'NO_TERMITE').length;
    const noDataCount = tableRows.filter(r => r.displayStatus === 'NO_DATA').length;
    const markers: TermiteMarker[] = target.stations.map(st => ({
      stationId: st.stationId,
      stationCode: st.stationCode,
      stationName: st.stationName,
      rtuid: st.rtuid,
      reservoirCode: target.reservoirCode,
      reservoirName: target.reservoirName,
      lngBd09: st.lngBd09,
      latBd09: st.latBd09,
      displayStatus: st.displayStatus,
      termiteStatus: st.termiteStatus,
      latestReportTime: st.latestReportTime
    }));
    return {
      reservoirCode: target.reservoirCode,
      reservoirName: target.reservoirName,
      monitorDate: q.monitorDate,
      stationCount: target.stations.length,
      hasTermiteCount,
      noTermiteCount,
      noDataCount,
      markers,
      tableRows
    };
  }
  const params = { ...q };
  return await request<TermiteOverviewResponse>(
    api.get('/termite-reservoirs/overview', { params })
  );
}

export async function fetchTrend(q: TermiteTrendQuery): Promise<TermiteTrendResponse> {
  if (isRealtimeMock()) {
    const target = getMockReservoir(q.reservoirCode);
    const start = dayjs(q.startDate);
    const end = dayjs(q.endDate);
    const days = end.diff(start, 'day');
    const points: TermiteTrendPoint[] = [];
    for (let i = 0; i <= Math.max(days, 0); i++) {
      const date = start.add(i, 'day').format('YYYY-MM-DD');
      const base = target.stations.filter(s => s.displayStatus === 'HAS_TERMITE').length;
      const offset = (i % 3) - 1;
      points.push({ date, hasTermiteStationCount: Math.max(base + offset, 0) });
    }
    return {
      reservoirCode: target.reservoirCode,
      reservoirName: target.reservoirName,
      startDate: q.startDate,
      endDate: q.endDate,
      points
    };
  }
  const params = { ...q };
  return await request<TermiteTrendResponse>(
    api.get('/termite-reservoirs/trend', { params })
  );
}

export async function fetchStations(q: TermiteStationsQuery): Promise<TermiteStationsResponse> {
  if (isRealtimeMock()) {
    const target = getMockReservoir(q.reservoirCode);
    const stations: TermiteStationOption[] = target.stations.map(st => ({
      stationId: st.stationId,
      stationCode: st.stationCode,
      stationName: st.stationName,
      rtuid: st.rtuid,
      reservoirCode: target.reservoirCode,
      reservoirName: target.reservoirName,
      status: st.status,
      latestTermiteStatus: st.termiteStatus,
      displayStatus: st.displayStatus,
      latestReportTime: st.latestReportTime
    }));
    return {
      reservoirCode: target.reservoirCode,
      reservoirName: target.reservoirName,
      stations
    };
  }
  const params = { ...q };
  return await request<TermiteStationsResponse>(
    api.get('/termite-reservoirs/stations', { params })
  );
}

export async function fetchImages(q: TermiteImagesQuery): Promise<TermiteImagesResponse> {
  if (isRealtimeMock()) {
    const target = getMockReservoir(q.reservoirCode);
    const station = target.stations.find(s => s.stationId === q.stationId) || target.stations[0];
    const pageNo = q.pageNo ?? 1;
    const pageSize = q.pageSize ?? 10;
    const total = mockImageFiles.length;
    const records: TermiteImageRecord[] = [];
    for (let i = 0; i < total; i++) {
      const id = 991000 + i + 1;
      const time = dayjs().subtract(i, 'hour').format('YYYY-MM-DDTHH:mm:ss');
      const file = mockImageFiles[i % mockImageFiles.length];
      records.push({
        imageId: id,
        imageCode: `${station.stationCode}-IMG-${String(i + 1).padStart(3, '0')}`,
        imageUrl: `${mockImageBase}/${file}`,
        reportTime: time,
        isComplete: 1
      });
    }
    const start = (pageNo - 1) * pageSize;
    const pageRecords = records.slice(start, start + pageSize);
    const selectedRecord = q.selectedImageId
      ? records.find(r => r.imageId === q.selectedImageId)
      : pageRecords[0];
    const selectedImage: TermiteImageDetail | null = selectedRecord
      ? {
          reservoirCode: target.reservoirCode,
          reservoirName: target.reservoirName,
          stationId: station.stationId,
          stationCode: station.stationCode,
          stationName: station.stationName,
          imageId: selectedRecord.imageId,
          imageCode: selectedRecord.imageCode,
          imageUrl: selectedRecord.imageUrl,
          reportTime: selectedRecord.reportTime,
          aiBoxes: []
        }
      : null;
    return {
      reservoirCode: target.reservoirCode,
      reservoirName: target.reservoirName,
      stationId: station.stationId,
      stationCode: station.stationCode,
      stationName: station.stationName,
      records: pageRecords,
      pageNo,
      pageSize,
      total,
      pages: Math.ceil(total / pageSize),
      selectedImage
    };
  }
  const params = { ...q };
  return await request<TermiteImagesResponse>(
    api.get('/termite-reservoirs/images', { params })
  );
}

export async function fetchImageDetail(q: TermiteImageDetailQuery): Promise<TermiteImageDetail> {
  if (isRealtimeMock()) {
    const target = getMockReservoir(q.reservoirCode);
    const station = target.stations.find(s => s.stationId === q.stationId) || target.stations[0];
    const index = Math.max(q.imageId - 991001, 0) % mockImageFiles.length;
    const imageUrl = `${mockImageBase}/${mockImageFiles[index]}`;
    return {
      reservoirCode: target.reservoirCode,
      reservoirName: target.reservoirName,
      stationId: station.stationId,
      stationCode: station.stationCode,
      stationName: station.stationName,
      imageId: q.imageId,
      imageCode: `${station.stationCode}-IMG-${String(q.imageId).slice(-3)}`,
      imageUrl,
      reportTime: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
      aiBoxes: []
    };
  }
  const params = { ...q };
  return await request<TermiteImageDetail>(
    api.get('/termite-reservoirs/images/detail', { params })
  );
}
