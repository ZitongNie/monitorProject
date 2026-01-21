import { Router } from 'express';
import { db, nextIds } from '../data/store';

// Coordinate conversion (WGS84 -> GCJ-02 -> BD-09)
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
function wgs84ToGcj02(lng: number, lat: number) {
  const a = 6378245.0; const ee = 0.00669342162296594323;
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
function gcj02ToBd09(lng: number, lat: number) {
  const x = lng, y = lat;
  const z = Math.sqrt(x * x + y * y) + 0.00002 * Math.sin(y * Math.PI * 3000.0 / 180.0);
  const theta = Math.atan2(y, x) + 0.000003 * Math.cos(x * Math.PI * 3000.0 / 180.0);
  const bdLng = z * Math.cos(theta) + 0.0065;
  const bdLat = z * Math.sin(theta) + 0.006;
  return { lng: bdLng, lat: bdLat };
}
function wgs84ToBd09(lng: number, lat: number) {
  const gcj = wgs84ToGcj02(lng, lat); return gcj02ToBd09(gcj.lng, gcj.lat);
}

export const boundariesRouter = Router();

// 5. 查询电子界桩（分页列表）
boundariesRouter.get('/', (req, res) => {
  const { keyword, boundaryCode, deviceId, status, pageNum = '1', pageSize = '10', orderBy = 'update_time', order = 'desc' } = req.query as any;
  let list = [...db.boundaries];
  if (keyword) {
    const k = String(keyword);
    list = list.filter(b => (b.boundaryCode||'').includes(k) || (b.name||'').includes(k) || (b.address||'').includes(k));
  }
  if (boundaryCode) list = list.filter(b => b.boundaryCode === boundaryCode);
  if (deviceId) list = list.filter(b => b.deviceId === deviceId);
  if (status !== undefined) list = list.filter(b => b.status === Number(status));
  const p = Number(pageNum)||1, s = Number(pageSize)||10;
  const total = list.length; const start = (p-1)*s; const records = list.slice(start, start+s);
  res.json({ code: 200, message: 'success', data: { total, pages: Math.ceil(total/s), pageNum: p, pageSize: s, list: records } });
});

// 1. 新增电子界桩
boundariesRouter.post('/', (req, res) => {
  const body = req.body || {};
  const required = ['boundaryCode','name','deviceId','password','lngWgs84','latWgs84'];
  for (const k of required) { if (body[k] === undefined || body[k] === null || String(body[k]).trim() === '') return res.status(400).json({ code: 400, message: `${k==='boundaryCode'?'界桩编号':k==='name'?'界桩名称':k==='deviceId'?'设备唯一标识':k==='password'?'设备密码':k.includes('lng')?'经度':'纬度'}不能为空`, data: null }); }
  const lng = Number(body.lngWgs84), lat = Number(body.latWgs84);
  if (isNaN(lng) || isNaN(lat)) return res.status(400).json({ code: 400, message: '经纬度不能为空', data: null });
  if (lat < -90 || lat > 90) return res.status(422).json({ code: 422, message: '纬度必须在 [-90,90] 范围内', data: null });
  if (lng < -180 || lng > 180) return res.status(422).json({ code: 422, message: '经度必须在 [-180,180] 范围内', data: null });
  if (body.height !== undefined && Number(body.height) < 0) return res.status(422).json({ code: 422, message: '高度必须非负', data: null });
  if (db.boundaries.some(b => b.boundaryCode === body.boundaryCode)) return res.status(409).json({ code: 409, message: '界桩编号重复', data: null });
  if (db.boundaries.some(b => b.deviceId === body.deviceId)) return res.status(409).json({ code: 409, message: 'deviceId已被绑定', data: null });
  const bd = wgs84ToBd09(lng, lat);
  const now = new Date().toISOString();
  const id = nextIds.boundary();
  const initLng = body.initLngWgs84 === undefined ? lng : Number(body.initLngWgs84);
  const initLat = body.initLatWgs84 === undefined ? lat : Number(body.initLatWgs84);
  const initBd = wgs84ToBd09(initLng, initLat);
  db.boundaries.push({
    id,
    boundaryCode: String(body.boundaryCode),
    name: String(body.name),
    deviceId: String(body.deviceId),
    password: String(body.password),
    address: body.address,
    material: body.material,
    height: body.height !== undefined ? Number(body.height) : undefined,
    buryDepth: body.buryDepth !== undefined ? Number(body.buryDepth) : undefined,
    status: (Number(body.status) === 1 ? 1 : 0),
    lngWgs84: lng, latWgs84: lat,
    initLngWgs84: initLng, initLatWgs84: initLat,
    lngBd09: bd.lng, latBd09: bd.lat,
    initLngBd09: initBd.lng, initLatBd09: initBd.lat,
    createTime: now, updateTime: now
  });
  return res.json({ code: 200, message: 'success', data: null });
});

// 2. 修改电子界桩（部分字段更新）
boundariesRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ code: 400, message: 'ID 必须为正整数', data: null });
  const idx = db.boundaries.findIndex(b => b.id === id);
  if (idx === -1) return res.status(404).json({ code: 404, message: '电子界桩不存在', data: null });
  const body = req.body || {};
  const curr = db.boundaries[idx];
  // unique checks excluding self
  if (body.boundaryCode && body.boundaryCode !== curr.boundaryCode && db.boundaries.some(b => b.boundaryCode === body.boundaryCode)) return res.status(409).json({ code: 409, message: '界桩编号重复', data: null });
  if (body.deviceId && body.deviceId !== curr.deviceId && db.boundaries.some(b => b.deviceId === body.deviceId)) return res.status(409).json({ code: 409, message: 'deviceId已被绑定', data: null });
  // validations
  if (body.boundaryCode !== undefined && String(body.boundaryCode).trim() === '') return res.status(400).json({ code: 400, message: '界桩编号不能为空', data: null });
  if (body.name !== undefined && String(body.name).trim() === '') return res.status(400).json({ code: 400, message: '界桩名称不能为空', data: null });
  if (body.deviceId !== undefined && String(body.deviceId).trim() === '') return res.status(400).json({ code: 400, message: '设备唯一标识不能为空', data: null });
  if (body.password !== undefined && String(body.password).trim() === '') return res.status(400).json({ code: 400, message: '设备密码不能为空', data: null });
  if (body.height !== undefined && Number(body.height) < 0) return res.status(422).json({ code: 422, message: '高度必须非负', data: null });
  const next = { ...curr };
  const fields = ['boundaryCode','name','deviceId','password','address','material','height','buryDepth','status'];
  for (const k of fields) if (body[k] !== undefined) (next as any)[k] = k==='height'||k==='buryDepth'||k==='status'? Number(body[k]) : body[k];
  if (body.status !== undefined) next.status = (Number(body.status) === 1 ? 1 : 0);
  // coord updates
  const hasCurrPair = body.lngWgs84 !== undefined || body.latWgs84 !== undefined;
  if (hasCurrPair && (body.lngWgs84 === undefined || body.latWgs84 === undefined)) return res.status(400).json({ code: 400, message: '经纬度不能为空', data: null });
  if (hasCurrPair) {
    const lng = Number(body.lngWgs84), lat = Number(body.latWgs84);
    if (isNaN(lng) || isNaN(lat)) return res.status(400).json({ code: 400, message: '经纬度不能为空', data: null });
    if (lat < -90 || lat > 90) return res.status(422).json({ code: 422, message: '纬度必须在 [-90,90] 范围内', data: null });
    if (lng < -180 || lng > 180) return res.status(422).json({ code: 422, message: '经度必须在 [-180,180] 范围内', data: null });
    const bd = wgs84ToBd09(lng, lat);
    next.lngWgs84 = lng; next.latWgs84 = lat;
    next.lngBd09 = bd.lng; next.latBd09 = bd.lat;
  }
  const hasInitPair = body.initLngWgs84 !== undefined || body.initLatWgs84 !== undefined;
  if (hasInitPair && (body.initLngWgs84 === undefined || body.initLatWgs84 === undefined)) return res.status(400).json({ code: 400, message: '经纬度不能为空', data: null });
  if (hasInitPair) {
    const lng = Number(body.initLngWgs84), lat = Number(body.initLatWgs84);
    if (isNaN(lng) || isNaN(lat)) return res.status(400).json({ code: 400, message: '经纬度不能为空', data: null });
    if (lat < -90 || lat > 90) return res.status(422).json({ code: 422, message: '纬度必须在 [-90,90] 范围内', data: null });
    if (lng < -180 || lng > 180) return res.status(422).json({ code: 422, message: '经度必须在 [-180,180] 范围内', data: null });
    const bd = wgs84ToBd09(lng, lat);
    next.initLngWgs84 = lng; next.initLatWgs84 = lat;
    next.initLngBd09 = bd.lng; next.initLatBd09 = bd.lat;
  }
  next.updateTime = new Date().toISOString();
  db.boundaries[idx] = next;
  return res.json({ code: 200, message: 'success', data: null });
});

// 3. 删除电子界桩
boundariesRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ code: 400, message: 'ID 必须为正整数', data: null });
  const idx = db.boundaries.findIndex(b => b.id === id);
  if (idx === -1) return res.status(404).json({ code: 404, message: '电子界桩不存在', data: null });
  const b = db.boundaries[idx];
  if (b.status === 1) return res.status(409).json({ code: 409, message: '设备在线，禁止删除', data: null });
  db.boundaries.splice(idx,1);
  return res.json({ code: 200, message: 'success', data: null });
});

// 4. 查询电子界桩详情
boundariesRouter.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ code: 400, message: 'ID 必须为正整数', data: null });
  const b = db.boundaries.find(x => x.id === id);
  if (!b) return res.status(404).json({ code: 404, message: '电子界桩不存在', data: null });
  return res.json({ code: 200, message: 'success', data: b });
});

// 6. 实时查询电子界桩详细数据（仅数据库）
boundariesRouter.post('/realtime-db', (req, res) => {
  const body = req.body || {};
  const id = body.id !== undefined ? Number(body.id) : undefined;
  const deviceId = body.deviceId !== undefined ? String(body.deviceId) : undefined;
  if (id !== undefined && (!Number.isInteger(id) || id <= 0)) {
    return res.status(400).json({ code: 400, message: 'ID 必须为正整数', data: null });
  }
  if ((id === undefined || id === null) && (!deviceId || deviceId.trim() === '')) {
    return res.status(400).json({ code: 400, message: '参数校验失败: id 或 deviceId 至少提供一个', data: null });
  }
  const b = id ? db.boundaries.find(x => x.id === id) : db.boundaries.find(x => x.deviceId === deviceId);
  if (!b) return res.status(404).json({ code: 404, message: '电子界桩不存在', data: null });
  const baseInfo = {
    id: b.id,
    boundaryCode: b.boundaryCode,
    name: b.name,
    address: b.address,
    deviceId: b.deviceId,
    material: b.material,
    height: b.height,
    buryDepth: b.buryDepth,
    status: b.status,
    initLngBd09: b.initLngBd09,
    initLatBd09: b.initLatBd09,
    lngBd09: b.lngBd09,
    latBd09: b.latBd09
  };
  // latest monitor data
  const m = db.boundaryMonitor.filter(x => x.boundaryId === b.id).sort((a,b)=>b.reportTime.localeCompare(a.reportTime))[0];
  const images = db.boundaryImages.filter(x => x.boundaryId === b.id).sort((a,b)=>b.reportTime.localeCompare(a.reportTime)).slice(0,5);
  const alerts = db.alerts.filter(a => a.deviceType === 2 && a.uniqueId === b.deviceId);
  const nowStr = new Date().toISOString();
  const response = {
    baseInfo,
    realTimeData: m || {
      reportTime: nowStr,
      lngWgs84: b.lngWgs84, latWgs84: b.latWgs84, lngBd09: b.lngBd09, latBd09: b.latBd09,
      temperature: 28.7, humidity: 67.4, tiltAngle: 8,
      tiltStatus: 1, vibrationStatus: 0,
      voltage: 4.0, remainingPower: 88, signalStrength: 29,
      isAlert: Math.random() > 0.7 ? 1 : 0,
      stationType: 67, observationTime: nowStr
    },
    images,
    alerts
  } as any;
  return res.json({ code: 200, message: 'success', data: response });
});

export default boundariesRouter;
