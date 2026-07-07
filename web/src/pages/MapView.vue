<!--
  地图视图页面
  功能：左侧百度地图展示测站点位，右侧展示点击的测站详细信息
  技术：集成百度地图API,支持坐标转换(BD09/GCJ02/WGS84)
-->
<template>
  <div class="map-view-container">
    <!-- 左侧：百度地图 -->
    <div class="map-section">
      <!-- 搜索框 -->
      <div class="search-bar">
        <el-select
          v-model="searchValue"
          filterable
          remote
          reserve-keyword
          placeholder="搜索监测站名称"
          :remote-method="searchStations"
          :loading="searchLoading"
          @change="selectStation"
          clearable
          style="width: 300px"
        >
          <el-option
            v-for="station in searchResults"
            :key="station.id"
            :label="station.name"
            :value="station.id"
          >
            <span style="float: left">{{ station.name }}</span>
            <span style="float: right; color: #8492a6; font-size: 13px">{{ station.stationCode }}</span>
          </el-option>
        </el-select>
      </div>
      <div class="map-toolbar">
        <div class="toolbar-title">地图工具</div>
        <el-space direction="vertical" :size="8" fill>
          <el-button size="small" @click="resetMapView">重置视野</el-button>
          <el-switch v-model="showStations" inline-prompt active-text="测站开" inactive-text="测站关" />
          <el-switch v-model="onlyOnlineStations" inline-prompt active-text="在线" inactive-text="全部" />
          <el-switch v-model="showBoundaries" inline-prompt active-text="界桩开" inactive-text="界桩关" />
          <el-switch v-model="showLegend" inline-prompt active-text="图例开" inactive-text="图例关" />
        </el-space>
        <div class="toolbar-meta">缩放：{{ currentZoom }}</div>
        <div class="toolbar-meta">测站：{{ visibleStationCount }}</div>
        <div class="toolbar-meta">界桩：{{ visibleBoundaryCount }}</div>
      </div>
      <div v-if="showLegend" class="map-legend">
        <div class="legend-title">图例</div>
        <div class="legend-row"><span class="dot dot-station dot-alert"></span>测站：在线预警</div>
        <div class="legend-row"><span class="dot dot-station dot-online"></span>测站：在线正常</div>
        <div class="legend-row"><span class="dot dot-station dot-offline"></span>测站：离线</div>
        <div class="legend-row"><span class="dot dot-boundary dot-boundary-online"></span>界桩：在线</div>
        <div class="legend-row"><span class="dot dot-boundary dot-boundary-offline"></span>界桩：离线</div>
      </div>
      <div id="allmap" ref="mapEl" class="map-container"></div>
    </div>
    
    <!-- 右侧：详情信息（测站 / 电子界桩） -->
    <div class="detail-section">
      <el-card class="detail-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span class="title">{{ headerTitle }}</span>
          </div>
        </template>
        
        <!-- 未选中时提示 -->
        <div v-if="!selectedStation && !selectedBoundary" class="empty-tip">
          <el-icon :size="48" color="#909399"><Location /></el-icon>
          <p>点击地图上的测站或电子界桩查看详细信息</p>
        </div>
        
        <!-- 已选中详情：优先显示测站，其次电子界桩 -->
        <div v-else>
          <!-- 测站详情 -->
          <div v-if="selectedStation" class="station-detail">
            <el-descriptions :column="1" border size="default">
              <el-descriptions-item label="测站名称">
                {{ selectedStation.name }}
              </el-descriptions-item>
              <el-descriptions-item label="测站编号">
                {{ selectedStation.stationCode }}
              </el-descriptions-item>
              <el-descriptions-item label="当前状态">
                <el-tag :type="selectedStation.status === 1 ? 'success' : 'info'">
                  {{ selectedStation.status === 1 ? '在线' : '离线' }}
                </el-tag>
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

          <!-- 电子界桩详情 -->
          <div v-else-if="selectedBoundary" class="station-detail">
            <el-descriptions :column="1" border size="default">
              <el-descriptions-item label="界桩名称">
                {{ selectedBoundary.name }}
              </el-descriptions-item>
              <el-descriptions-item label="界桩编号">
                {{ selectedBoundary.boundaryCode }}
              </el-descriptions-item>
              <el-descriptions-item label="当前状态">
                <el-tag :type="selectedBoundary.status === 1 ? 'success' : 'info'">
                  {{ selectedBoundary.status === 1 ? '在线' : '离线' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="经度">
                {{ selectedBoundary.lngWgs84 }}
              </el-descriptions-item>
              <el-descriptions-item label="纬度">
                {{ selectedBoundary.latWgs84 }}
              </el-descriptions-item>
              <el-descriptions-item label="安装地址">
                {{ selectedBoundary.address }}
              </el-descriptions-item>
              <el-descriptions-item label="材质">
                {{ selectedBoundary.material || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="高度(m)">
                {{ selectedBoundary.height ?? '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="埋深(m)">
                {{ selectedBoundary.buryDepth ?? '-' }}
              </el-descriptions-item>
            </el-descriptions>

            <div style="margin-top: 16px; text-align: center;">
              <el-space>
                <el-button plain @click="refreshBoundaryRealtime" :loading="boundaryRealtimeLoading">刷新实时</el-button>
                <el-button type="primary" plain @click="viewBoundaryDetail">详细信息</el-button>
              </el-space>
            </div>

            <div class="history-section" v-loading="boundaryRealtimeLoading">
              <div class="section-header">
                <div class="section-title">实时监测</div>
                <div class="section-subtitle" v-if="boundaryRealtime?.realTimeData?.reportTime">
                  {{ formatDateTime(boundaryRealtime.realTimeData.reportTime) }}
                </div>
              </div>
              <div v-if="boundaryRealtimeError" class="detail-error">{{ boundaryRealtimeError }}</div>
              <el-descriptions v-else-if="boundaryRealtime?.realTimeData" :column="2" border size="small">
                <el-descriptions-item label="温度">
                  {{ formatMetric(boundaryRealtime.realTimeData.temperature) }}
                </el-descriptions-item>
                <el-descriptions-item label="湿度">
                  {{ formatMetric(boundaryRealtime.realTimeData.humidity) }}
                </el-descriptions-item>
                <el-descriptions-item label="倾斜角">
                  {{ formatMetric(boundaryRealtime.realTimeData.tiltAngle) }}
                </el-descriptions-item>
                <el-descriptions-item label="倾斜状态">
                  {{ formatBinaryStatus(boundaryRealtime.realTimeData.tiltStatus, '异常', '正常') }}
                </el-descriptions-item>
                <el-descriptions-item label="震动状态">
                  {{ formatBinaryStatus(boundaryRealtime.realTimeData.vibrationStatus, '异常', '正常') }}
                </el-descriptions-item>
                <el-descriptions-item label="是否告警">
                  {{ formatBinaryStatus(boundaryRealtime.realTimeData.isAlert, '告警', '正常') }}
                </el-descriptions-item>
                <el-descriptions-item label="剩余电量%">
                  {{ formatMetric(boundaryRealtime.realTimeData.remainingPower) }}
                </el-descriptions-item>
                <el-descriptions-item label="信号强度">
                  {{ formatMetric(boundaryRealtime.realTimeData.signalStrength) }}
                </el-descriptions-item>
                <el-descriptions-item label="电压">
                  {{ formatMetric(boundaryRealtime.realTimeData.voltage) }}
                </el-descriptions-item>
                <el-descriptions-item label="测站类型">
                  {{ formatMetric(boundaryRealtime.realTimeData.stationType) }}
                </el-descriptions-item>
                <el-descriptions-item label="观测时间" :span="2">
                  {{ formatDateTime(boundaryRealtime.realTimeData.observationTime) }}
                </el-descriptions-item>
              </el-descriptions>
              <el-empty v-else description="暂无实时数据" :image-size="72" />
            </div>

            <div class="history-section">
              <div class="section-title">预警信息</div>
              <div v-if="boundaryAlertRows.length" class="boundary-alert-list">
                <div v-for="(alert, index) in boundaryAlertRows" :key="`${alert.alertId ?? 'null'}-${alert.alertTime}-${index}`" class="boundary-alert-item">
                  <div class="boundary-alert-head">
                    <span class="boundary-alert-type">{{ alert.alertType || '预警' }}</span>
                    <el-tag :type="alert.handleStatus === 1 ? 'success' : 'danger'" effect="plain" size="small">
                      {{ alert.handleStatus === 1 ? '已处理' : '未处理' }}
                    </el-tag>
                  </div>
                  <div class="boundary-alert-time">{{ formatDateTime(alert.alertTime) }}</div>
                  <div class="boundary-alert-desc">{{ alert.alertDesc || '暂无描述' }}</div>
                </div>
              </div>
              <el-empty v-else description="暂无预警" :image-size="72" />
            </div>

            <div v-if="latestBoundaryImage" class="history-section">
              <div class="section-title">最近图片</div>
              <div class="boundary-image-card">
                <el-image
                  :src="latestBoundaryImage.imagePath"
                  :preview-src-list="boundaryImagePreviewList"
                  fit="cover"
                  class="boundary-image-preview"
                />
                <div class="boundary-image-meta">
                  <div>{{ formatDateTime(latestBoundaryImage.reportTime) }}</div>
                  <div>{{ latestBoundaryImage.imageCode }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { listAllTermiteStations, deleteTermiteStation, type TermiteStation } from '@/services/termiteStations';
import {
  listAllElectronicBoundaries,
  queryBoundaryRealtime,
  type BoundaryAlertDTO,
  type BoundaryRealtimeResponse,
  type ElectronicBoundary
} from '@/services/electronicBoundaries';
import { fetchTermiteMonitorHistory, type TermiteMonitorHistoryRecord } from '@/services/termiteMonitor';
import { ElMessage, ElMessageBox, ElTag } from 'element-plus';
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
const stationMarkers: any[] = [];
const boundaryMarkers: any[] = [];
let boundaryClusterRenderTimer: number | null = null;
const selectedStation = ref<TermiteStation | null>(null);
const selectedBoundary = ref<ElectronicBoundary | null>(null);
const historyData = ref<TermiteMonitorHistoryRecord[]>([]);
const boundaryRealtime = ref<BoundaryRealtimeResponse | null>(null);
const boundaryRealtimeLoading = ref(false);
const boundaryRealtimeError = ref('');
let hoverOpenTimer: any = null;
let lastHoverId: string | number | null = null;

// 搜索相关
const searchValue = ref<number | null>(null);
const searchResults = ref<TermiteStation[]>([]);
const searchLoading = ref(false);
const allStations = ref<TermiteStation[]>([]);
const allBoundaries = ref<ElectronicBoundary[]>([]);
const showStations = ref(true);
const onlyOnlineStations = ref(false);
const showBoundaries = ref(true);
const showLegend = ref(true);
const visibleStationCount = ref(0);
const visibleBoundaryCount = ref(0);
const currentZoom = ref(6);

interface BoundaryClusterGroup {
  key: string;
  boundaries: ElectronicBoundary[];
  centerLng: number;
  centerLat: number;
  onlineCount: number;
  offlineCount: number;
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

function svgToDataUrl(svg: string) {
  // Use URI encoding to avoid base64/unicode pitfalls; Baidu Icon supports data:image/svg+xml
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getStationMarkerColor(station: TermiteStation) {
  const isOnline = station.status === 1;
  if (!isOnline) return '#8c8c8c';
  return (station as any).isAlert === 1 ? '#f56c6c' : '#409eff';
}

function getBoundaryMarkerColor(boundary: ElectronicBoundary) {
  const isOnline = boundary.status === 1;
  return isOnline ? '#67c23a' : '#8c8c8c';
}

function formatClusterCount(count: number) {
  if (count >= 10000) return `${Math.round(count / 1000)}k`;
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(count);
}

function getBoundaryClusterGridSizePx(zoom: number) {
  if (zoom <= 6) return 110;
  if (zoom <= 8) return 90;
  if (zoom <= 10) return 72;
  if (zoom <= 12) return 56;
  if (zoom <= 14) return 40;
  return 26;
}

function getBoundaryClusterCellSize(zoom: number) {
  const bounds = map?.getBounds?.();
  const container = mapEl.value;
  if (!bounds || !container) return null;

  const southWest = bounds.getSouthWest?.();
  const northEast = bounds.getNorthEast?.();
  if (!southWest || !northEast) return null;

  const width = Math.max(container.clientWidth || 0, 1);
  const height = Math.max(container.clientHeight || 0, 1);
  const lngSpan = Math.max(Math.abs(northEast.lng - southWest.lng), 0.0001);
  const latSpan = Math.max(Math.abs(northEast.lat - southWest.lat), 0.0001);
  const gridPx = getBoundaryClusterGridSizePx(zoom);

  return {
    gridLng: Math.max(lngSpan / Math.max(width / gridPx, 1), 0.00002),
    gridLat: Math.max(latSpan / Math.max(height / gridPx, 1), 0.00002)
  };
}

function buildBoundaryClusters(boundaries: ElectronicBoundary[]) {
  const zoom = typeof map?.getZoom === 'function' ? map.getZoom() : currentZoom.value;
  const cellSize = getBoundaryClusterCellSize(zoom);

  if (!cellSize) {
    return boundaries
      .filter((boundary) => boundary.lngBd09 != null && boundary.latBd09 != null)
      .map((boundary) => ({
        key: `single-${boundary.id}`,
        boundaries: [boundary],
        centerLng: boundary.lngBd09 as number,
        centerLat: boundary.latBd09 as number,
        onlineCount: boundary.status === 1 ? 1 : 0,
        offlineCount: boundary.status === 0 ? 1 : 0,
        minLng: boundary.lngBd09 as number,
        maxLng: boundary.lngBd09 as number,
        minLat: boundary.latBd09 as number,
        maxLat: boundary.latBd09 as number
      }));
  }

  const groups = new Map<string, {
    boundaries: ElectronicBoundary[];
    sumLng: number;
    sumLat: number;
    onlineCount: number;
    offlineCount: number;
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
  }>();

  boundaries.forEach((boundary) => {
    const lng = boundary.lngBd09;
    const lat = boundary.latBd09;
    if (lng == null || lat == null) return;

    const cellX = Math.floor(lng / cellSize.gridLng);
    const cellY = Math.floor(lat / cellSize.gridLat);
    const key = `${cellX}:${cellY}`;
    const current = groups.get(key) || {
      boundaries: [],
      sumLng: 0,
      sumLat: 0,
      onlineCount: 0,
      offlineCount: 0,
      minLng: lng,
      maxLng: lng,
      minLat: lat,
      maxLat: lat
    };

    current.boundaries.push(boundary);
    current.sumLng += lng;
    current.sumLat += lat;
    current.onlineCount += boundary.status === 1 ? 1 : 0;
    current.offlineCount += boundary.status === 0 ? 1 : 0;
    current.minLng = Math.min(current.minLng, lng);
    current.maxLng = Math.max(current.maxLng, lng);
    current.minLat = Math.min(current.minLat, lat);
    current.maxLat = Math.max(current.maxLat, lat);
    groups.set(key, current);
  });

  return Array.from(groups.entries()).map(([key, group]) => ({
    key,
    boundaries: group.boundaries,
    centerLng: group.sumLng / group.boundaries.length,
    centerLat: group.sumLat / group.boundaries.length,
    onlineCount: group.onlineCount,
    offlineCount: group.offlineCount,
    minLng: group.minLng,
    maxLng: group.maxLng,
    minLat: group.minLat,
    maxLat: group.maxLat
  }));
}

function getBoundaryClusterAppearance(count: number) {
  if (count >= 1000) {
    return { size: 66, color: '#f56c6c', ringColor: '#fde2e2', fontSize: 17 };
  }
  if (count >= 100) {
    return { size: 58, color: '#e6a23c', ringColor: '#faecd8', fontSize: 16 };
  }
  if (count >= 10) {
    return { size: 50, color: '#409eff', ringColor: '#d9ecff', fontSize: 15 };
  }
  return { size: 44, color: '#67c23a', ringColor: '#e1f3d8', fontSize: 14 };
}

function zoomToBoundaryCluster(cluster: BoundaryClusterGroup) {
  if (!map || !(window as any).BMapGL) return;

  const southWest = new BMapGL.Point(cluster.minLng, cluster.minLat);
  const northEast = new BMapGL.Point(cluster.maxLng, cluster.maxLat);
  try {
    const view = map.getViewport([southWest, northEast]);
    const nextZoom = Math.min(Math.max(view.zoom, map.getZoom() + 2), 18);
    map.centerAndZoom(view.center, nextZoom);
  } catch {
    map.centerAndZoom(new BMapGL.Point(cluster.centerLng, cluster.centerLat), Math.min(map.getZoom() + 2, 18));
  }
}

function addBoundaryClusterMarker(cluster: BoundaryClusterGroup) {
  if (!map || !(window as any).BMapGL) return;

  const count = cluster.boundaries.length;
  const point = new BMapGL.Point(cluster.centerLng, cluster.centerLat);
  const { size, color, ringColor, fontSize } = getBoundaryClusterAppearance(count);
  const label = formatClusterCount(count);
  const radius = size / 2;
  const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${radius}" cy="${radius}" r="${radius - 4}" fill="${ringColor}" fill-opacity="0.98"/>
    <circle cx="${radius}" cy="${radius}" r="${radius - 10}" fill="${color}" fill-opacity="0.95"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
      font-size="${fontSize}" font-weight="700" fill="#ffffff">${label}</text>
  </svg>`;

  const icon = new BMapGL.Icon(
    svgToDataUrl(svgIcon),
    new BMapGL.Size(size, size),
    { anchor: new BMapGL.Size(radius, radius) }
  );
  const marker = new BMapGL.Marker(point, { icon });
  (marker as any)._boundaryClusterKey = cluster.key;

  marker.addEventListener('mouseover', () => {
    if (lastHoverId === cluster.key) return;
    if (hoverOpenTimer) clearTimeout(hoverOpenTimer);
    hoverOpenTimer = window.setTimeout(() => {
      const infoWindow = new BMapGL.InfoWindow(
        `<div style="padding:8px;line-height:1.8;font-size:13px;">
          <div style="font-size:15px;font-weight:bold;margin-bottom:8px;">电子界桩聚合点</div>
          <div>聚合数量：${count}</div>
          <div>在线：<span style="color:#67c23a;font-weight:bold;">${cluster.onlineCount}</span></div>
          <div>离线：<span style="color:#909399;font-weight:bold;">${cluster.offlineCount}</span></div>
          <div style="color:#999;font-size:12px;margin-top:4px;">点击后可继续放大查看单个界桩</div>
        </div>`,
        {
          width: 240,
          height: 0,
          enableMessage: false,
          offset: new BMapGL.Size(0, -10)
        }
      );
      map.openInfoWindow(infoWindow, point);
      lastHoverId = cluster.key;
    }, 120);
  });

  marker.addEventListener('click', () => {
    console.log('[MapView] 点击电子界桩聚合点:', cluster.key, count);
    zoomToBoundaryCluster(cluster);
  });

  map.addOverlay(marker);
  boundaryMarkers.push(marker);
}

function scheduleBoundaryClusterRender() {
  if (boundaryClusterRenderTimer) {
    window.clearTimeout(boundaryClusterRenderTimer);
  }
  boundaryClusterRenderTimer = window.setTimeout(() => {
    boundaryClusterRenderTimer = null;
    void renderBoundariesFromCache();
  }, 120);
}

const headerTitle = computed(() => {
  if (selectedBoundary.value) return '电子界桩详细信息';
  return '测站详细信息';
});

const boundaryAlertRows = computed(() => {
  const list: BoundaryAlertDTO[] = [...(boundaryRealtime.value?.alerts || [])];
  list.sort((a, b) => (b.alertTime || '').localeCompare(a.alertTime || ''));
  return list.slice(0, 5);
});

const latestBoundaryImage = computed(() => boundaryRealtime.value?.images?.[0] || null);

const boundaryImagePreviewList = computed(() =>
  (boundaryRealtime.value?.images || []).map((image) => image.imagePath)
);

async function searchStations(query: string) {
  if (!query) {
    searchResults.value = [];
    return;
  }
  searchLoading.value = true;
  try {
    // 从已加载的站点中过滤
    searchResults.value = allStations.value.filter(station => 
      station.name.toLowerCase().includes(query.toLowerCase()) ||
      station.stationCode.toLowerCase().includes(query.toLowerCase())
    );
  } finally {
    searchLoading.value = false;
  }
}

async function selectStation(stationId: number | null) {
  if (!stationId) return;
  
  const station = allStations.value.find(s => s.id === stationId);
  if (!station) return;

  // 地图中心移动到该测站
  if (map && station.lngBd09 && station.latBd09) {
    const point = new BMapGL.Point(station.lngBd09, station.latBd09);
    map.centerAndZoom(point, 15);
  }

  void selectStationRecord(station);
  ElMessage.success(`已定位到 ${station.name}`);
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

function viewBoundaryDetail() {
  if (selectedBoundary.value) {
    const b = selectedBoundary.value;
    router.push({
      path: '/boundary-detail',
      query: {
        id: b.id,
        deviceId: b.deviceId
      }
    });
  }
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return value;
  }
}

function formatMetric(value?: number | string | null) {
  return value ?? '-';
}

function formatBinaryStatus(value: number | undefined, activeLabel: string, inactiveLabel: string) {
  if (value === undefined || value === null) return '-';
  return value === 1 ? activeLabel : inactiveLabel;
}

function resetBoundaryRealtimeState() {
  boundaryRealtime.value = null;
  boundaryRealtimeLoading.value = false;
  boundaryRealtimeError.value = '';
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
  const times = historyData.value.map(item => dayjs(item.reportTime).format('MM-DD HH:mm'));
  const values = historyData.value.map(item => item.termiteStatus ?? null);
  const alertValues = historyData.value.map(item => (item.isAlert === 1 ? (item.termiteStatus ?? 1) : null));
  return {
    title: { text: '', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: times, axisLabel: { rotate: 30 } },
    yAxis: {
      type: 'value',
      min: 0,
      max: 1,
      interval: 1,
      axisLabel: { formatter: (value: number) => (value === 1 ? '有白蚁' : '无白蚁') }
    },
    series: [
      {
        name: '白蚁状态',
        type: 'line',
        data: values,
        step: 'end',
        connectNulls: false,
        lineStyle: { color: '#409EFF' }
      },
      {
        name: '预警点',
        type: 'line',
        data: alertValues,
        showLine: false,
        connectNulls: false,
        symbolSize: 10,
        itemStyle: { color: '#f56c6c' }
      }
    ]
  };
});

async function loadStationHistory(station: TermiteStation) {
  const currentStationId = station.id;
  historyData.value = [];
  try {
    const endTime = dayjs();
    const startTime = endTime.subtract(7, 'day');
    const page = await fetchTermiteMonitorHistory({
      stationId: currentStationId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      pageNo: 1,
      pageSize: 50,
      sortOrder: 'asc'
    });
    if (selectedStation.value?.id !== currentStationId) {
      return;
    }
    historyData.value = page.records || [];
  } catch (e: any) {
    if (selectedStation.value?.id === currentStationId) {
      historyData.value = [];
    }
    ElMessage.error(e.message || '加载历史监测数据失败');
  }
}

async function selectStationRecord(station: TermiteStation) {
  resetBoundaryRealtimeState();
  selectedBoundary.value = null;
  selectedStation.value = station;
  await loadStationHistory(station);
}

async function loadBoundaryRealtime(boundary: ElectronicBoundary) {
  const boundaryId = boundary.id;
  boundaryRealtimeLoading.value = true;
  boundaryRealtimeError.value = '';
  boundaryRealtime.value = null;
  try {
    const data = await queryBoundaryRealtime({ id: boundaryId, preferCache: true });
    if (selectedBoundary.value?.id !== boundaryId) {
      return;
    }
    boundaryRealtime.value = data;
  } catch (e: any) {
    if (selectedBoundary.value?.id !== boundaryId) {
      return;
    }
    boundaryRealtimeError.value = e.message || '加载电子界桩实时数据失败';
  } finally {
    if (selectedBoundary.value?.id === boundaryId) {
      boundaryRealtimeLoading.value = false;
    }
  }
}

async function selectBoundaryRecord(boundary: ElectronicBoundary) {
  selectedStation.value = null;
  historyData.value = [];
  selectedBoundary.value = boundary;
  await loadBoundaryRealtime(boundary);
}

async function refreshBoundaryRealtime() {
  if (!selectedBoundary.value) return;
  await loadBoundaryRealtime(selectedBoundary.value);
}

async function loadData() {
  try {
    console.log('[MapView] 开始加载测站数据...');
    const stations = await listAllTermiteStations({ sortBy: 'updateTime', order: 'desc' });
    console.log('[MapView] 获取到测站数据数量:', stations.length);

    allStations.value = stations.map((station) => ({
      ...station,
      // 分页列表已返回最新 termiteStatus，这里直接映射成地图预警颜色，避免全量点位逐个调用 realtime
      isAlert: station.termiteStatus === 1 ? 1 : 0
    })) as TermiteStation[];
    
    await renderStationsFromCache();
    fitMapToVisiblePoints();
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
  
  const isOnline = station.status === 1;
  const markerColor = getStationMarkerColor(station);
  const isAlert = isOnline && (station as any).isAlert === 1;
  const opacity = isOnline ? 1 : 0.78;
  
  // 创建自定义图标（SVG 格式）
  // 约定：测站=圆心；界桩=菱形心（视觉上区分类型）
  const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="35" viewBox="0 0 28 35">
    <path d="M14 0C8.5 0 4 4.5 4 10c0 7.5 10 25 10 25s10-17.5 10-25c0-5.5-4.5-10-10-10z"
      fill="${markerColor}" fill-opacity="${opacity}"
      stroke="white" stroke-width="1.5"/>
    <circle cx="14" cy="10" r="4.2" fill="white"/>
    ${isAlert ? '<circle cx="14" cy="10" r="2" fill="#f56c6c"/>' : ''}
  </svg>`;
  
  const icon = new BMapGL.Icon(
    svgToDataUrl(svgIcon),
    new BMapGL.Size(28, 35),
    { anchor: new BMapGL.Size(14, 35) }  // 锚点设在图标底部中心
  );
  
  // 创建标注
  const marker = new BMapGL.Marker(point, { icon });
  
  // 保存站点ID到marker对象，便于搜索时查找
  (marker as any)._stationId = station.id;
  
  // 监听鼠标悬停事件 - 显示信息窗口
  marker.addEventListener('mouseover', () => {
    if (lastHoverId === station.id) return;
    if (hoverOpenTimer) clearTimeout(hoverOpenTimer);
    hoverOpenTimer = window.setTimeout(() => {
      const statusText = isOnline
        ? (isAlert
          ? '<span style="color:#ff4d4f;font-weight:bold;">● 在线预警</span>'
          : '<span style="color:#52c41a;font-weight:bold;">● 在线</span>')
        : '<span style="color:#8c8c8c;font-weight:bold;">● 离线</span>';
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
          offset: new BMapGL.Size(0, -50)  // 调整更贴近标记
        }
      );
      map.openInfoWindow(infoWindow, point);
      lastHoverId = station.id;
    }, 150);
  });
  
  // 监听点击事件 - 选中测站并显示详情
  marker.addEventListener('click', () => {
    console.log('[MapView] 点击测站:', station.name);
    void selectStationRecord(station);
  });
  
  // 将标注添加到地图
  map.addOverlay(marker);
  stationMarkers.push(marker);
  
  console.log(`[MapView] ✓ 测站 ${station.id} (${station.name}) 标注已添加，当前总数: ${stationMarkers.length}`);
}

async function loadBoundaryData() {
  if (!map || !(window as any).BMapGL) return;
  try {
    console.log('[MapView] 开始加载电子界桩数据...');
    allBoundaries.value = await listAllElectronicBoundaries({ order: 'desc' });
    await renderBoundariesFromCache();
    console.log('[MapView] 已添加电子界桩标注数量:', boundaryMarkers.length);
  } catch (e: any) {
    console.error('[MapView] 加载电子界桩失败:', e);
    // 这里不弹错误，避免影响测站地图的正常使用
  }
}

async function renderStationsFromCache() {
  clearStationMarkers();
  if (!showStations.value) {
    visibleStationCount.value = 0;
    if (selectedStation.value) {
      selectedStation.value = null;
      historyData.value = [];
    }
    return;
  }
  const list = onlyOnlineStations.value
    ? allStations.value.filter(s => s.status === 1)
    : allStations.value;
  visibleStationCount.value = list.length;
  if (selectedStation.value && !list.some(s => s.id === selectedStation.value?.id)) {
    selectedStation.value = null;
    historyData.value = [];
  }
  list.forEach((station) => {
    void addMarker(station);
  });
}

async function renderBoundariesFromCache() {
  clearBoundaryMarkers();
  if (!showBoundaries.value) {
    visibleBoundaryCount.value = 0;
    if (selectedBoundary.value) {
      selectedBoundary.value = null;
      resetBoundaryRealtimeState();
    }
    return;
  }
  const list = onlyOnlineStations.value
    ? allBoundaries.value.filter(b => b.status === 1)
    : allBoundaries.value;
  visibleBoundaryCount.value = list.length;
  if (selectedBoundary.value && !list.some(b => b.id === selectedBoundary.value?.id)) {
    selectedBoundary.value = null;
    resetBoundaryRealtimeState();
  }
  const clusters = buildBoundaryClusters(list);
  clusters.forEach((cluster) => {
    if (cluster.boundaries.length === 1) {
      void addBoundaryMarker(cluster.boundaries[0]);
      return;
    }
    addBoundaryClusterMarker(cluster);
  });
}

function fitMapToVisiblePoints() {
  if (!map || !(window as any).BMapGL) return;
  const points: any[] = [];
  if (showStations.value) {
    const stationList = onlyOnlineStations.value
      ? allStations.value.filter(s => s.status === 1)
      : allStations.value;
    stationList.forEach(s => {
      if (s.lngBd09 != null && s.latBd09 != null) {
        points.push(new BMapGL.Point(s.lngBd09, s.latBd09));
      }
    });
  }
  if (showBoundaries.value) {
    const boundaryList = onlyOnlineStations.value
      ? allBoundaries.value.filter(b => b.status === 1)
      : allBoundaries.value;
    boundaryList.forEach(b => {
      if (b.lngBd09 != null && b.latBd09 != null) {
        points.push(new BMapGL.Point(b.lngBd09, b.latBd09));
      }
    });
  }
  if (!points.length) return;
  try {
    const view = map.getViewport(points);
    map.centerAndZoom(view.center, Math.min(view.zoom, 15));
  } catch {}
}

function resetMapView() {
  fitMapToVisiblePoints();
  ElMessage.success('已重置地图视野');
}

watch(onlyOnlineStations, async () => {
  await Promise.all([renderStationsFromCache(), renderBoundariesFromCache()]);
  fitMapToVisiblePoints();
});

watch(showStations, async () => {
  await renderStationsFromCache();
  fitMapToVisiblePoints();
});

watch(showBoundaries, async () => {
  await renderBoundariesFromCache();
  fitMapToVisiblePoints();
});

async function addBoundaryMarker(boundary: ElectronicBoundary) {
  if (!map || !(window as any).BMapGL) return;
  const lng = boundary.lngBd09;
  const lat = boundary.latBd09;
  if (lng == null || lat == null) {
    console.warn('[MapView] 电子界桩缺少 BD09 坐标，已跳过:', boundary.id);
    return;
  }
  const point = new BMapGL.Point(lng, lat);

  // 电子界桩：在线绿色，离线灰色；中间用“菱形”区分于测站
  const isOnline = boundary.status === 1;
  const markerColor = getBoundaryMarkerColor(boundary);
  const opacity = isOnline ? 1 : 0.78;
  const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="32" viewBox="0 0 26 32">
    <path d="M13 0C8.2 0 4.2 4 4.2 8.8c0 6.6 8.8 23.2 8.8 23.2s8.8-16.6 8.8-23.2C21.8 4 17.8 0 13 0z"
      fill="${markerColor}" fill-opacity="${opacity}"
      stroke="white" stroke-width="1.3"/>
    <path d="M13 5.6 17.6 10.2 13 14.8 8.4 10.2Z" fill="white"/>
  </svg>`;
  const icon = new BMapGL.Icon(
    svgToDataUrl(svgIcon),
    new BMapGL.Size(26, 32),
    { anchor: new BMapGL.Size(13, 32) }
  );
  const marker = new BMapGL.Marker(point, { icon });
  (marker as any)._boundaryId = boundary.id;

  marker.addEventListener('mouseover', () => {
    if (hoverOpenTimer) clearTimeout(hoverOpenTimer);
    hoverOpenTimer = window.setTimeout(() => {
      const statusText = isOnline
        ? '<span style="color:#52c41a;font-weight:bold;">● 在线</span>'
        : '<span style="color:#8c8c8c;font-weight:bold;">● 离线</span>';
      const infoWindow = new BMapGL.InfoWindow(
        `<div style="padding:8px;line-height:1.8;font-size:13px;">
          <div style="font-size:15px;font-weight:bold;margin-bottom:8px;">${boundary.name}</div>
          <div>界桩编号：${boundary.boundaryCode}</div>
          <div>设备ID：${boundary.deviceId}</div>
          <div>状态：${statusText}</div>
          <div style="color:#999;font-size:12px;margin-top:4px;">经纬度：${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
        </div>`,
        {
          width: 260,
          height: 0,
          enableMessage: false,
          offset: new BMapGL.Size(0, -40)
        }
      );
      map.openInfoWindow(infoWindow, point);
    }, 150);
  });

  marker.addEventListener('click', () => {
    console.log('[MapView] 点击电子界桩:', boundary.name);
    void selectBoundaryRecord(boundary);
  });

  // 将标注添加到地图
  map.addOverlay(marker);
  boundaryMarkers.push(marker);
}

function clearStationMarkers() {
  try { stationMarkers.forEach((m:any) => map.removeOverlay(m)); } catch {}
  stationMarkers.length = 0;
}

function clearBoundaryMarkers() {
  try { boundaryMarkers.forEach((m:any) => map.removeOverlay(m)); } catch {}
  boundaryMarkers.length = 0;
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
    currentZoom.value = 6;
    map.enableScrollWheelZoom(true);
    try { map.addControl(new BMapGL.ZoomControl()); } catch {}
    // 点击/拖拽/缩放时关闭气泡，防止悬停后残留
    try { map.addEventListener('click', () => { try { map.closeInfoWindow(); } catch {}; lastHoverId = null; }); } catch {}
    try { map.addEventListener('dragstart', () => { try { map.closeInfoWindow(); } catch {}; lastHoverId = null; }); } catch {}
    try { map.addEventListener('zoomstart', () => { try { map.closeInfoWindow(); } catch {}; lastHoverId = null; }); } catch {}
    try {
      map.addEventListener('zoomend', () => {
        currentZoom.value = map.getZoom();
        scheduleBoundaryClusterRender();
      });
    } catch {}
    try { map.addEventListener('moveend', () => { scheduleBoundaryClusterRender(); }); } catch {}
    console.info('[Map] Using Baidu Map (BMapGL)');
  } catch (e) {
    ElMessage.error('百度地图脚本加载失败，请检查网络与 AK 配置');
    return;
  }
  await Promise.all([loadData(), loadBoundaryData()]);
  try {
    ws = new WebSocket(import.meta.env.VITE_WS_URL || 'ws://localhost:5174');
    ws.onmessage = () => { Promise.all([loadData(), loadBoundaryData()]); };
  } catch {}
});

onBeforeUnmount(() => {
  map = null;
  try { ws?.close(); } catch {}
  ws = null;
  try { if (hoverOpenTimer) clearTimeout(hoverOpenTimer); } catch {}
  hoverOpenTimer = null;
  try { if (boundaryClusterRenderTimer) clearTimeout(boundaryClusterRenderTimer); } catch {}
  boundaryClusterRenderTimer = null;
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

.search-bar {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 1000;
  background: white;
  padding: 8px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.map-toolbar {
  position: absolute;
  top: 88px;
  left: 16px;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.96);
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.14);
  min-width: 126px;
}

.toolbar-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
}

.toolbar-meta {
  margin-top: 6px;
  color: #606266;
  font-size: 12px;
}

.map-legend {
  position: absolute;
  right: 16px;
  top: 16px;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.96);
  padding: 10px 12px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.14);
  color: #303133;
  font-size: 12px;
}

.legend-title {
  font-weight: 600;
  margin-bottom: 6px;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 20px;
}

.dot {
  width: 10px;
  height: 10px;
  display: inline-block;
}

.dot-station {
  border-radius: 50%;
}

.dot-boundary {
  border-radius: 2px;
  transform: rotate(45deg);
}

.dot-alert { background: #f56c6c; }
.dot-online { background: #409eff; }
.dot-offline { background: #8c8c8c; }
.dot-boundary-online { background: #67c23a; }
.dot-boundary-offline { background: #8c8c8c; }

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

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.section-subtitle {
  font-size: 12px;
  color: #909399;
}

.detail-error {
  padding: 10px 12px;
  border-radius: 8px;
  background: #fef0f0;
  color: #c45656;
  font-size: 13px;
}

.boundary-alert-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.boundary-alert-item {
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafafa;
}

.boundary-alert-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.boundary-alert-type {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.boundary-alert-time {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
}

.boundary-alert-desc {
  margin-top: 8px;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

.boundary-image-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.boundary-image-preview {
  width: 100%;
  height: 180px;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f7fa;
}

.boundary-image-meta {
  font-size: 12px;
  line-height: 1.7;
  color: #606266;
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

  .map-toolbar {
    top: 78px;
    left: 10px;
    min-width: 112px;
    padding: 8px;
  }

  .map-legend {
    top: 10px;
    right: 10px;
    padding: 8px 10px;
  }
}
</style>
