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
            <el-descriptions-item label="测站编号">
              {{ selectedStation.stationCode }}
            </el-descriptions-item>
            <el-descriptions-item label="当前状态">
              <el-button 
                :type="selectedStation.status === 1 ? 'success' : 'info'" 
                size="small"
                @click="toggleStatus"
              >
                {{ selectedStation.status === 1 ? '在线' : '离线' }}
              </el-button>
            </el-descriptions-item>
            <el-descriptions-item label="经度">
              {{ selectedStation.lngWgs84 }}
            </el-descriptions-item>
            <el-descriptions-item label="纬度">
              {{ selectedStation.latWgs84 }}
            </el-descriptions-item>
            <el-descriptions-item label="安装地址">
              {{ selectedStation.address }}
            </el-descriptions-item>
          </el-descriptions>
          
          <!-- 操作按钮 -->
          <div style="margin-top: 16px; text-align: center;">
            <el-space>
              <el-button type="primary" plain @click="viewDetail">详细信息</el-button>
              <el-button type="danger" plain @click="deleteStation">删除</el-button>
            </el-space>
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
import { listTermiteStations, deleteTermiteStation, updateTermiteStation, type TermiteStation } from '@/services/termiteStations';
import { ElMessage, ElMessageBox } from 'element-plus';
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
const selectedStation = ref<TermiteStation | null>(null);
const historyData = ref<Array<{ t: number; status: number }>>([]);
let hoverOpenTimer: any = null;
let lastHoverId: string | number | null = null;

function formatDateTime(dateStr: string) {
  if (!dateStr) return '-';
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm:ss');
}

function viewDetail() {
  if (selectedStation.value) {
    const s = selectedStation.value;
    router.push({ 
      path: '/station-detail', 
      query: { 
        id: s.id, 
        rtuid: s.rtuid, 
        reservoirCode: s.reservoirCode 
      } 
    });
  }
}

async function toggleStatus() {
  if (!selectedStation.value) return;
  
  const station = selectedStation.value;
  const newStatus = station.status === 1 ? 0 : 1;
  const statusText = newStatus === 1 ? '在线' : '离线';
  
  try {
    await ElMessageBox.confirm(
      `确认将测站 "${station.name}" 状态改为 ${statusText} 吗？`,
      '状态切换',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 执行更新
    await updateTermiteStation(station.id, { status: newStatus });
    ElMessage.success('状态已更新');
    
    // 更新本地选中的测站状态
    selectedStation.value.status = newStatus;
    
    // 重新加载地图数据以更新marker颜色
    await loadData();
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '状态更新失败');
    }
  }
}

async function deleteStation() {
  if (!selectedStation.value) return;
  
  const station = selectedStation.value;
  try {
    await ElMessageBox.confirm(
      `确认删除测站 "${station.name}" 吗？此操作不可恢复！`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    );
    
    // 执行删除
    await deleteTermiteStation(station.id);
    ElMessage.success('删除成功');
    
    // 清空选中状态
    selectedStation.value = null;
    
    // 重新加载地图数据
    await loadData();
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '删除失败');
    }
  }
}

const chartOption = computed(() => {
  if (!historyData.value.length) return {};
  const times = historyData.value.map(d => dayjs(d.t).format('MM-DD HH:mm'));
  const values = historyData.value.map(d => d.status);
  return {
    title: { text: '', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: times, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value', min: 0, max: 1, axisLabel: { formatter: (v: number) => v === 1 ? '在线' : '离线' } },
    series: [{ name: '状态', type: 'line', data: values, step: 'end', lineStyle: { color: '#409EFF' } }]
  };
});

function pushMockHistory(st: TermiteStation) {
  const key = `mock_hist_termite_${st.id}`;
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [{ t: Date.now() - 3600_000, status: st.status }];
    arr.push({ t: Date.now(), status: st.status });
    localStorage.setItem(key, JSON.stringify(arr.slice(-40)));
  } catch {}
}
function getMockHistory(st: TermiteStation) {
  const key = `mock_hist_termite_${st.id}`;
  try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw); } catch {}
  return [] as Array<{ t:number; status:number }>;
}

async function loadData() {
  try {
    console.log('[MapView] 开始加载测站数据...');
    // 使用 pageSize=100，避免后端限制导致的 500 错误
    const page = await listTermiteStations({ pageNo: 1, pageSize: 100 });
    console.log('[MapView] 获取到测站数据:', page);
    console.log('[MapView] 测站数量:', page.records.length);
    
    clearMarkers();
    await Promise.all(page.records.map(s => addMarker(s)));
    console.log('[MapView] 已添加标注数量:', markers.length);
    
    // 自动调整地图视野以包含所有测站
    if (page.records.length > 0 && map) {
      const points = page.records
        .filter(s => s.lngBd09 != null && s.latBd09 != null)
        .map(s => new BMapGL.Point(s.lngBd09, s.latBd09));
      
      console.log('[MapView] 有效坐标点数量:', points.length);
      
      if (points.length > 0) {
        try {
          const view = map.getViewport(points);
          map.centerAndZoom(view.center, view.zoom);
          console.log('[MapView] 地图视野已调整至:', view.center, '缩放级别:', view.zoom);
        } catch (e) {
          console.warn('[MapView] 自动调整视野失败:', e);
        }
      }
    }
  } catch (e: any) {
    console.error('[MapView] 加载测站失败:', e);
    ElMessage.error(e.message || '加载监测站失败');
  }
}

async function addMarker(station: TermiteStation) {
  if (!map || !(window as any).BMapGL) {
    console.warn('[MapView] 地图未初始化，跳过添加标注:', station.id);
    return;
  }
  
  // 使用后端返回的 BD09 坐标（百度坐标系）
  const lng = station.lngBd09;
  const lat = station.latBd09;
  
  console.log(`[MapView] 添加测站标注: ID=${station.id}, 名称=${station.name}, 坐标=(${lng}, ${lat}), 状态=${station.status}`);
  
  if (lng === undefined || lat === undefined || lng === null || lat === null) {
    console.warn(`[MapView] 测站 ${station.id} 缺少 BD09 坐标，已跳过`);
    return;
  }
  
  // 创建地图点（百度坐标系）
  const point = new BMapGL.Point(lng, lat);
  
  // 根据状态使用不同颜色的标注图标
  const isOnline = station.status === 1;
  const markerColor = isOnline ? '#52c41a' : '#ff4d4f';  // 绿色=在线，红色=离线
  
  // 创建自定义图标（SVG 格式）
  const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="35" viewBox="0 0 28 35">
    <path d="M14 0C8.5 0 4 4.5 4 10c0 7.5 10 25 10 25s10-17.5 10-25c0-5.5-4.5-10-10-10z" 
      fill="${markerColor}" stroke="white" stroke-width="1.5"/>
    <circle cx="14" cy="10" r="4" fill="white"/>
  </svg>`;
  
  const icon = new BMapGL.Icon(
    `data:image/svg+xml;base64,${btoa(svgIcon)}`,
    new BMapGL.Size(28, 35),
    { anchor: new BMapGL.Size(14, 35) }  // 锚点设在图标底部中心
  );
  
  // 创建标注
  const marker = new BMapGL.Marker(point, { icon });
  
  // 监听鼠标悬停事件 - 显示信息窗口
  marker.addEventListener('mouseover', () => {
    if (lastHoverId === station.id) return;
    if (hoverOpenTimer) clearTimeout(hoverOpenTimer);
    hoverOpenTimer = window.setTimeout(() => {
      const statusText = isOnline ? '<span style="color:#52c41a;font-weight:bold;">● 在线</span>' : '<span style="color:#ff4d4f;font-weight:bold;">● 离线</span>';
      const infoWindow = new BMapGL.InfoWindow(
        `<div style="padding:8px;line-height:1.8;font-size:13px;">
          <div style="font-size:15px;font-weight:bold;margin-bottom:8px;">${station.name}</div>
          <div>编号：${station.stationCode}</div>
          <div>设备ID：${station.rtuid || '-'}</div>
          <div>状态：${statusText}</div>
          <div style="color:#999;font-size:12px;margin-top:4px;">经纬度：${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
        </div>`,
        { 
          width: 260, 
          height: 0, 
          enableMessage: false,
          offset: new BMapGL.Size(0, -45)  // 向上偏移45像素，避免遮挡标注
        }
      );
      map.openInfoWindow(infoWindow, point);
      lastHoverId = station.id;
    }, 150);
  });
  
  // 监听点击事件 - 选中测站并显示详情
  marker.addEventListener('click', () => {
    console.log('[MapView] 点击测站:', station.name);
    selectedStation.value = station;
    pushMockHistory(station);
    historyData.value = getMockHistory(station);
  });
  
  // 将标注添加到地图
  map.addOverlay(marker);
  markers.push(marker);
  
  console.log(`[MapView] ✓ 测站 ${station.id} (${station.name}) 标注已添加，当前总数: ${markers.length}`);
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
    // 默认中心点设为中国中部，zoom 适中以便查看多个城市的测站
    const center = new BMapGL.Point(117.0, 30.5);
    map.centerAndZoom(center, 6);
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
