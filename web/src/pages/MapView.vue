<!--
  地图视图页面
  功能：左侧百度地图展示测站点位，右侧展示点击的测站详细信息
  技术：集成百度地图API,支持坐标转换(BD09/GCJ02/WGS84)
-->
<template>
  <div class="map-view-container">
    <!-- 左侧：百度地图 -->
    <div class="map-section">
      <div id="allmap" ref="mapEl" class="map-container"></div>
    </div>
    
    <!-- 右侧：测站详细信息 -->
    <div class="detail-section">
      <el-card class="detail-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span class="title">测站详细信息</span>
          </div>
        </template>
        
        <!-- 未选中时提示 -->
        <div v-if="!selectedStation" class="empty-tip">
          <el-icon :size="48" color="#909399"><Location /></el-icon>
          <p>点击地图上的测站查看详细信息</p>
        </div>
        
        <!-- 已选中测站详情 -->
        <div v-else class="station-detail">
          <el-descriptions :column="1" border size="default">
            <el-descriptions-item label="测站名称">
              {{ selectedStation.name }}
            </el-descriptions-item>
            <el-descriptions-item label="测站ID">
              {{ selectedStation.id }}
            </el-descriptions-item>
            <el-descriptions-item label="经度">
              {{ selectedStation.lng }}
            </el-descriptions-item>
            <el-descriptions-item label="纬度">
              {{ selectedStation.lat }}
            </el-descriptions-item>
            <el-descriptions-item label="当前状态">
              <el-tag :type="selectedStation.status === 'warn' ? 'danger' : 'success'" effect="dark">
                {{ selectedStation.status === 'warn' ? '预警' : '安全' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item v-if="selectedStation.picture" label="现场照片">
              <el-image :src="selectedStation.picture" style="width: 100%; max-width: 320px;" fit="cover" />
            </el-descriptions-item>
          </el-descriptions>
          
          <!-- 查看详细信息按钮 -->
          <div style="margin-top: 16px; text-align: center;">
            <el-button type="success" @click="viewDetail">查看详细信息</el-button>
          </div>
          
          <!-- 历史数据图表区域 -->
          <div v-if="historyData.length > 0" class="history-section">
            <div class="section-title">历史监测数据</div>
            <v-chart :option="chartOption" style="height: 260px; margin-top: 12px;" autoresize />
          </div>
          <div v-else class="no-history">
            <el-empty description="暂无历史数据" :image-size="80" />
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { listStations, type Station, getStationHistory } from '../services/stations';
import { ElMessage } from 'element-plus';
import { Location } from '@element-plus/icons-vue';
import { use } from 'echarts/core';
import VChart from 'vue-echarts';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
import dayjs from 'dayjs';

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent]);

const router = useRouter();
declare const BMapGL: any;
const mapEl = ref<HTMLDivElement | null>(null);
let ws: WebSocket | null = null;
let map: any = null;
const markers: any[] = [];
const selectedStation = ref<Station | null>(null);
const historyData = ref<Array<{ t: number; status: 'safe'|'warn' }>>([]);
let hoverOpenTimer: any = null;
let lastHoverId: string | number | null = null;

function viewDetail() {
  if (selectedStation.value) {
    router.push({ path: '/station-detail', query: { id: selectedStation.value.id } });
  }
}

const chartOption = computed(() => {
  if (!historyData.value.length) return {};
  const times = historyData.value.map(d => dayjs(d.t).format('MM-DD HH:mm'));
  const values = historyData.value.map(d => d.status === 'warn' ? 1 : 0);
  return {
    title: { text: '', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: times, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value', min: 0, max: 1, axisLabel: { formatter: (v: number) => v === 1 ? '预警' : '安全' } },
    series: [{ name: '状态', type: 'line', data: values, step: 'end', lineStyle: { color: '#409EFF' } }]
  };
});

async function toBD09Point(lng: number, lat: number): Promise<any> {
  const sys = (import.meta as any).env?.VITE_COORD_SYS || 'bd09';
  if (!sys || sys.toLowerCase() === 'bd09') {
    return new BMapGL.Point(lng, lat);
  }
  if (!(window as any).BMapGL || !(BMapGL as any).Convertor) {
    return new BMapGL.Point(lng, lat);
  }
  const convertor = new (BMapGL as any).Convertor();
  const from = sys.toLowerCase() === 'wgs84' ? 1 : 3;
  const to = 5;
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

async function loadData() {
  const stations = await listStations();
  clearMarkers();
  await Promise.all(stations.map(s => addMarker(s)));
}

async function addMarker(station: Station) {
  if (!map || !(window as any).BMapGL) return;
  const point = await toBD09Point(station.lng, station.lat);
  const marker = new BMapGL.Marker(point);
  // 悬停显示信息气泡（带防抖，避免重复打开导致闪烁）
  marker.addEventListener('mouseover', () => {
    try {
      if (lastHoverId === station.id) return;
      if (hoverOpenTimer) clearTimeout(hoverOpenTimer);
      hoverOpenTimer = window.setTimeout(() => {
        try { map.closeInfoWindow(); } catch {}
        const info = new BMapGL.InfoWindow(
          `<div><strong>${station.name}</strong><br/>坐标：${station.lat}, ${station.lng}</div>`,
          { offset: new BMapGL.Size(0, -28) }
        );
        map.openInfoWindow(info, point);
        lastHoverId = station.id;
      }, 120);
    } catch {}
  });

  // 点击用于选中并加载右侧详情
  marker.addEventListener('click', async () => {
    selectedStation.value = station;
    try {
      historyData.value = await getStationHistory(station.id);
    } catch {
      historyData.value = [];
    }
  });
  map.addOverlay(marker);
  markers.push(marker);
}

function clearMarkers() {
  try { markers.forEach((m:any) => map.removeOverlay(m)); } catch {}
  markers.length = 0;
}

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

onMounted(async () => {
  const ak = AK;
  if (!ak) { ElMessage.error('未配置百度地图 AK，无法加载百度地图'); return; }
  try {
    if (!(window as any).BMapGL) await loadBaiduScript(ak);
    map = new BMapGL.Map(mapEl.value || 'allmap', { enableRotate: true, enableTilt: true });
    const center = new BMapGL.Point(114.365, 30.537);
    map.centerAndZoom(center, 15);
    map.enableScrollWheelZoom(true);
    try { map.addControl(new BMapGL.ZoomControl()); } catch {}
    // 点击/拖拽/缩放时关闭气泡，防止悬停后残留
    try { map.addEventListener('click', () => { try { map.closeInfoWindow(); } catch {}; lastHoverId = null; }); } catch {}
    try { map.addEventListener('dragstart', () => { try { map.closeInfoWindow(); } catch {}; lastHoverId = null; }); } catch {}
    try { map.addEventListener('zoomstart', () => { try { map.closeInfoWindow(); } catch {}; lastHoverId = null; }); } catch {}
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
  try { if (hoverOpenTimer) clearTimeout(hoverOpenTimer); } catch {}
  hoverOpenTimer = null;
});
</script>

<style scoped>
.map-view-container {
  display: flex;
  height: calc(100vh - 104px);
  width: 100%;
  gap: 16px;
}

.map-section {
  flex: 1;
  min-width: 0;
  position: relative;
}

.map-container {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
}

.detail-section {
  width: 420px;
  min-width: 360px;
  max-width: 480px;
  display: flex;
  flex-direction: column;
}

.detail-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-card :deep(.el-card__header) {
  padding: 14px 18px;
  background: #fff;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-header .title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.detail-card :deep(.el-card__body) {
  flex: 1;
  overflow-y: auto;
  padding: 18px;
}

.empty-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
  padding: 40px 20px;
}

.empty-tip p {
  margin-top: 16px;
  font-size: 14px;
}

.station-detail {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.history-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.no-history {
  margin-top: 24px;
  padding: 20px 0;
}

@media (max-width: 1200px) {
  .detail-section {
    width: 360px;
    min-width: 320px;
  }
}

@media (max-width: 768px) {
  .map-view-container {
    flex-direction: column;
  }
  
  .detail-section {
    width: 100%;
    max-width: 100%;
    height: 400px;
  }
}
</style>
