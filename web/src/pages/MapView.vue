<!--
  地图视图页面
  功能：百度地图展示测站和界桩点位、点击查看详情、管理员可新增/编辑/删除点位
  技术：集成百度地图API,支持坐标转换(BD09/GCJ02/WGS84)
-->
<template>
  <!-- 百度地图容器 -->
  <div id="allmap" class="map-container" ref="mapEl"></div>
  
  <!-- 点位详情抽屉 -->
  <el-drawer v-model="drawerVisible" title="点位详情" :with-header="true">
    <div v-if="activeItem">
      <p>名称/编号：{{ getItemName(activeItem) }}</p>
      <p>坐标：{{ activeItem.lat }}, {{ activeItem.lng }}</p>
      <p>状态：<el-tag :type="activeItem.status==='warn'?'danger':'success'">{{ activeItem.status }}</el-tag></p>
      <el-space v-if="isAdmin">
        <el-button type="primary" @click="onEdit">编辑</el-button>
        <el-button type="danger" @click="onRemove">删除</el-button>
      </el-space>
    </div>
  </el-drawer>
  
  <!-- 管理员新增点位按钮 -->
  <el-button v-if="isAdmin" type="primary" style="position:absolute;right:24px;bottom:24px;" @click="onAdd">新增点位</el-button>

  <!-- 新增点位弹窗 -->
  <el-dialog v-model="addVisible" title="新增点位" width="520px">
    <el-form :model="addForm" :rules="addRules" ref="addFormRef" label-width="100px">
      <el-form-item label="点位种类" prop="type">
        <el-select v-model="addForm.type" placeholder="请选择点位种类">
          <el-option label="白蚁测站" value="station" />
          <el-option label="电子界桩" value="pile" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="addForm.type==='station'" label="名称" prop="name">
        <el-input v-model.trim="addForm.name" placeholder="请输入测站名称" />
      </el-form-item>
      <el-form-item v-else label="编号" prop="code">
        <el-input v-model.trim="addForm.code" placeholder="请输入界桩编号" />
      </el-form-item>
      <el-form-item label="经度" prop="lng">
        <el-input-number v-model="addForm.lng" :min="-180" :max="180" :step="0.000001" controls-position="right" style="width: 100%" />
      </el-form-item>
      <el-form-item label="纬度" prop="lat">
        <el-input-number v-model="addForm.lat" :min="-90" :max="90" :step="0.000001" controls-position="right" style="width: 100%" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input type="textarea" v-model.trim="addForm.remark" :rows="3" placeholder="可选：备注信息" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="addVisible=false">取消</el-button>
      <el-button type="primary" :loading="adding" @click="onConfirmAdd">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from 'vue';
import { listStations, type Station, createStation, deleteStation } from '../services/stations';
import { listPiles, type Pile, deletePile, createPile } from '../services/piles';
import { ElMessageBox, ElMessage } from 'element-plus';
import { useAuthStore } from '../store/auth';

type Item = (Station | Pile) & { _type: 'station'|'pile' };
declare const BMapGL: any;
const mapEl = ref<HTMLDivElement | null>(null);
let ws: WebSocket | null = null;
let map: any = null;
const markers: any[] = [];
const drawerVisible = ref(false);
const activeItem = ref<Item | null>(null);
const auth = useAuthStore();
const isAdmin = computed(() => auth.hasRole('admin'));

const addVisible = ref(false);
const adding = ref(false);
const addFormRef = ref();
const addForm = ref<{ type: 'station'|'pile'; name: string; code: string; lng: number; lat: number; remark?: string }>({
  type: 'station', name: '', code: '', lng: 114.365, lat: 30.537, remark: ''
});
const addRules: any = {
  type: [{ required: true, message: '请选择点位种类', trigger: 'change' }],
  name: [{ required: true, message: '名称不能为空', trigger: 'blur' }],
  code: [{ required: true, message: '编号不能为空', trigger: 'blur' }],
  lng: [
    { required: true, message: '经度不能为空', trigger: 'blur' },
    { validator: (_: any, v: any, cb: any) => (v>=-180 && v<=180) ? cb() : cb(new Error('经度范围 -180~180')), trigger: 'blur' }
  ],
  lat: [
    { required: true, message: '纬度不能为空', trigger: 'blur' },
    { validator: (_: any, v: any, cb: any) => (v>=-90 && v<=90) ? cb() : cb(new Error('纬度范围 -90~90')), trigger: 'blur' }
  ]
};

// 将给定经纬度转换为百度 BD09 坐标（根据环境变量判定源坐标系）
async function toBD09Point(lng: number, lat: number): Promise<any> {
  const sys = (import.meta as any).env?.VITE_COORD_SYS || 'bd09';
  if (!sys || sys.toLowerCase() === 'bd09') {
    return new BMapGL.Point(lng, lat);
  }
  if (!(window as any).BMapGL || !(BMapGL as any).Convertor) {
    return new BMapGL.Point(lng, lat);
  }
  const convertor = new (BMapGL as any).Convertor();
  const from = sys.toLowerCase() === 'wgs84' ? 1 : 3; // 1: WGS84(GPS), 3: GCJ02
  const to = 5; // 5: BD09
  return new Promise((resolve) => {
    convertor.translate([{ lng, lat }], from, to, (res: any) => {
      if (res?.status === 0 && res?.points?.length) {
        resolve(new BMapGL.Point(res.points[0].lng, res.points[0].lat));
      } else {
        resolve(new BMapGL.Point(lng, lat));
      }
    });
  });
}

function getItemName(item: Item | null): string {
  if (!item) return '';
  return item._type === 'station' ? (item as Station).name : (item as Pile).code;
}

async function loadData() {
  const [stations, piles] = await Promise.all([listStations(), listPiles()]);
  clearMarkers();
  await Promise.all([
    ...stations.map(s => addMarker({ ...s, _type: 'station' })),
    ...piles.map(p => addMarker({ ...p, _type: 'pile' })),
  ]);
}

async function addMarker(item: Item) {
  if (!map || !(window as any).BMapGL) return;
  const point = await toBD09Point(item.lng, item.lat);
  const marker = new BMapGL.Marker(point);
  marker.addEventListener('click', () => {
    activeItem.value = item; drawerVisible.value = true;
    try {
      const title = ("name" in item ? (item as any).name : (item as any).code) as string;
      const remark = (item as any).remark ? `<br/>备注：${(item as any).remark}` : '';
      const info = new BMapGL.InfoWindow(`<div><strong>${title}</strong><br/>坐标：${item.lat}, ${item.lng}${remark}</div>`);
      map.openInfoWindow(info, point);
    } catch {}
  });
  map.addOverlay(marker);
  markers.push(marker);
}
function clearMarkers() {
  try { markers.forEach((m:any) => map.removeOverlay(m)); } catch {}
  markers.length = 0;
}

function onAdd() {
  if (!isAdmin.value) { ElMessage.error('普通用户不能编辑地图'); return; }
  if (!map) return;
  const c = map.getCenter();
  addForm.value = { type: 'station', name: '', code: '', lng: (c as any).lng, lat: (c as any).lat, remark: '' };
  addVisible.value = true;
}

function onEdit() {
  ElMessage.info('请在“白蚁测站 / 电子界桩”页面中编辑更完整的属性 (效果: 点击后跳转白蚁测站界面进行编辑)');
}

async function onRemove() {
  if (!isAdmin.value) { ElMessage.error('普通用户不能编辑地图'); return; }
  if (!activeItem.value) return;
  await ElMessageBox.confirm('确认删除该点位？', '提示');
  if (activeItem.value._type === 'station') await deleteStation(activeItem.value.id);
  else await deletePile(activeItem.value.id);
  drawerVisible.value = false;
  await loadData();
  ElMessage.success('已删除');
}

async function onConfirmAdd() {
  if (!isAdmin.value) return;
  await (addFormRef.value as any)?.validate?.();
  adding.value = true;
  try {
    const payload: any = { lat: addForm.value.lat, lng: addForm.value.lng, status: 'safe', remark: addForm.value.remark };
    if (addForm.value.type === 'station') {
      payload.name = addForm.value.name;
      const st = await createStation(payload);
      await addMarker({ ...st, _type: 'station' });
    } else {
      payload.code = addForm.value.code;
      const pl = await createPile(payload);
      await addMarker({ ...pl, _type: 'pile' });
    }
    addVisible.value = false;
    ElMessage.success('新增成功');
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '新增失败');
  } finally {
    adding.value = false;
  }
}

// 百度地图AK, 花钱申请的(学生不花钱)
const AK = '7j9Zg3mGoFudBiK624Yw8TzPCdiqbNB5';

async function loadBaiduScript(ak: string) {
  if ((window as any).BMapGL) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `//api.map.baidu.com/api?type=webgl&v=1.0&ak=${ak}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Baidu Map load failed'));
    document.head.appendChild(script);
  });
}
// 初始化地图
onMounted(async () => {
  const ak = AK;
  if (!ak) { ElMessage.error('未配置百度地图 AK，无法加载百度地图'); return; }
  try {
    if (!(window as any).BMapGL) await loadBaiduScript(ak);
    map = new BMapGL.Map(mapEl.value || 'allmap', { enableRotate: true, enableTilt: true });
    // 武汉大学坐标（经度, 纬度）
    const center = new BMapGL.Point(114.365, 30.537);
    map.centerAndZoom(center, 15);
    map.enableScrollWheelZoom(true);
    try { map.addControl(new BMapGL.ZoomControl()); } catch {}
    console.info('[Map] Using Baidu Map (BMapGL)');
  } catch (e) {
    ElMessage.error('百度地图脚本加载失败，请检查网络与 AK 配置');
    return;
  }
  await loadData();
  try {
    ws = new WebSocket(import.meta.env.VITE_WS_URL || 'ws://localhost:5174');
    ws.onmessage = () => { loadData(); };
  } catch {}
});
onBeforeUnmount(() => {
  map = null;
  try { ws?.close(); } catch {}
  ws = null;
});
</script>


<style scoped>
</style>
