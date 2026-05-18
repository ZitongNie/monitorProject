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
  stations: Array<{
    stationId: number;
    stationCode: string;
    stationName: string;
    rtuid: string;
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
    reservoirName: '青山水库',
    stations: [
      {
        stationId: 91001,
        stationCode: 'QS-TM-001',
        stationName: '青山北岸1号站',
        rtuid: 'QSRT001',
        lngBd09: 113.001233,
        latBd09: 28.231155,
        displayStatus: 'NO_TERMITE',
        termiteStatus: 0,
        latestReportTime: '2026-05-15T09:10:00',
        status: 1
      },
      {
        stationId: 91002,
        stationCode: 'QS-TM-002',
        stationName: '青山东坝2号站',
        rtuid: 'QSRT002',
        lngBd09: 113.005488,
        latBd09: 28.227744,
        displayStatus: 'HAS_TERMITE',
        termiteStatus: 1,
        latestReportTime: '2026-05-15T08:40:00',
        status: 1
      },
      {
        stationId: 91003,
        stationCode: 'QS-TM-003',
        stationName: '青山南岸3号站',
        rtuid: 'QSRT003',
        lngBd09: 113.013822,
        latBd09: 28.224319,
        displayStatus: 'NO_DATA',
        termiteStatus: null,
        latestReportTime: null,
        status: 0
      },
      {
        stationId: 91004,
        stationCode: 'QS-TM-004',
        stationName: '青山溢洪4号站',
        rtuid: 'QSRT004',
        lngBd09: 112.998392,
        latBd09: 28.236932,
        displayStatus: 'NO_TERMITE',
        termiteStatus: 0,
        latestReportTime: '2026-05-15T07:58:00',
        status: 1
      },
      {
        stationId: 91005,
        stationCode: 'QS-TM-005',
        stationName: '青山进水5号站',
        rtuid: 'QSRT005',
        lngBd09: 113.010921,
        latBd09: 28.239607,
        displayStatus: 'HAS_TERMITE',
        termiteStatus: 1,
        latestReportTime: '2026-05-15T06:22:00',
        status: 1
      }
    ]
  },
  {
    reservoirCode: '1200000002',
    reservoirName: '东风水库',
    stations: [
      {
        stationId: 92001,
        stationCode: 'DF-TM-001',
        stationName: '东风大坝1号站',
        rtuid: 'DFRT001',
        lngBd09: 113.221233,
        latBd09: 28.431155,
        displayStatus: 'NO_TERMITE',
        termiteStatus: 0,
        latestReportTime: '2026-05-15T09:02:00',
        status: 1
      },
      {
        stationId: 92002,
        stationCode: 'DF-TM-002',
        stationName: '东风西岸2号站',
        rtuid: 'DFRT002',
        lngBd09: 113.228899,
        latBd09: 28.424201,
        displayStatus: 'NO_DATA',
        termiteStatus: null,
        latestReportTime: null,
        status: 0
      },
      {
        stationId: 92003,
        stationCode: 'DF-TM-003',
        stationName: '东风进水3号站',
        rtuid: 'DFRT003',
        lngBd09: 113.234788,
        latBd09: 28.437513,
        displayStatus: 'HAS_TERMITE',
        termiteStatus: 1,
        latestReportTime: '2026-05-15T05:55:00',
        status: 1
      }
    ]
  }
];

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
