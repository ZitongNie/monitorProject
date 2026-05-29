<!--
  仪表盘页面
  功能：展示系统总体概览(测站/界桩数量与预警统计)和快速入口导航
-->
<template>
  <div v-loading="loading" class="dashboard-root" ref="dashboardRoot">
    <!-- 头部：完全复刻 original/echart header 样式，只调整文案 -->
    <header class="screen-header">
      <h1>电子界桩与白蚁监测管理</h1>
      <div class="header-actions">
        <el-button size="small" type="primary" plain @click="toggleFullscreen">
          {{ isFullscreen ? '退出全屏' : '全屏' }}
        </el-button>
      </div>
      <div class="showTime">{{ nowTime }}</div>
    </header>

    <!-- 主体：使用 mainbox / column / panel 结构承载现有功能 -->
    <section class="mainbox">
      <!-- 左列：白蚁测站总览 -->
      <div class="column">
        <div class="panel">
          <h2>白蚁测站总览</h2>

          <!-- 统计卡片 -->
          <div class="panel-inner">
            <el-row :gutter="12" style="margin-bottom:12px">
              <el-col :span="12">
                <el-card shadow="hover" class="stat-card">
                  <el-statistic title="测站总数" :value="stats.stationTotal">
                    <template #suffix>
                      <el-icon color="#409eff"><Odometer /></el-icon>
                    </template>
                  </el-statistic>
                </el-card>
              </el-col>
              <el-col :span="12">
                <el-card shadow="hover" class="stat-card">
                  <el-statistic title="有白蚁" :value="stats.stationWithTermites">
                    <template #suffix>
                      <el-icon color="#f56c6c"><Warning /></el-icon>
                    </template>
                  </el-statistic>
                </el-card>
              </el-col>
              <el-col :span="12" style="margin-top:12px">
                <el-card shadow="hover" class="stat-card">
                  <el-statistic title="无白蚁" :value="stats.stationNoTermites">
                    <template #suffix>
                      <el-icon color="#67c23a"><CircleCheck /></el-icon>
                    </template>
                  </el-statistic>
                </el-card>
              </el-col>
              <el-col :span="12" style="margin-top:12px">
                <el-card shadow="hover" class="stat-card">
                  <el-statistic title="无数据" :value="stats.stationNoData">
                    <template #suffix>
                      <el-icon color="#909399"><QuestionFilled /></el-icon>
                    </template>
                  </el-statistic>
                </el-card>
              </el-col>
            </el-row>
          </div>

          <!-- 状态分布饼图 -->
          <div class="panel chart-panel">
            <h2>状态分布</h2>
            <div class="chart">
              <v-chart :option="termitePieOptions" autoresize />
            </div>
            <div class="panel-footer"></div>
          </div>

          <!-- 白蚁测站预警：使用原样式包裹表格 -->
          <div class="panel table-panel">
            <h2>最新预警</h2>
            <div class="chart">
              <template v-if="stationAlerts.length">
                <div class="alert-scroll">
                  <div v-for="row in stationAlerts" :key="row.alertId" class="alert-card">
                    <div class="alert-item">
                      <div class="alert-line1">
                        <span class="alert-name">{{ row.name }}</span>
                        <el-tag v-if="row.handleStatus === 0" size="small" type="danger" effect="plain">未处理</el-tag>
                        <el-tag v-else size="small" type="success" effect="plain">已处理</el-tag>
                      </div>
                      <div class="alert-line2">
                        <span class="muted">编号：{{ row.stationCode }}</span>
                        <span class="muted">时间：{{ formatDateTime(row.alertTime) }}</span>
                      </div>
                      <div class="alert-line3">
                        <span class="muted alert-desc" :title="row.alertDesc">{{ row.alertDesc }}</span>
                      </div>
                      <div class="alert-actions">
                        <el-space>
                          <el-button type="primary" plain size="small" @click="viewStationDetail(row.stationId)">查看详情</el-button>
                          <el-button v-if="row.handleStatus === 0" type="success" plain size="small" @click="handleAlert(row)">已处理</el-button>
                        </el-space>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <el-empty v-else description="暂无预警" />
            </div>
            <div class="panel-footer"></div>
          </div>

          <div class="panel-footer"></div>
        </div>
      </div>

      <!-- 中列：总量数字 + 地图占位（地图内容留空） -->
      <div class="column">
        <div class="no">
          <div class="no-hd">
            <ul>
              <li>{{ stats.stationTotal }}</li>
              <li>{{ stats.boundaryTotal }}</li>
            </ul>
          </div>
          <div class="no-bd">
            <ul>
              <li>白蚁测站总数</li>
              <li>电子界桩总数</li>
            </ul>
          </div>
        </div>
        <div class="map panel">
          <div class="panel-inner" style="height: 100%; display: flex; flex-direction: column;">
            <!-- 地图切换按钮 -->
            <div class="map-controls">
              <div 
                class="map-btn" 
                :class="{ active: currentMap === 'china' }"
                @click="handleMapSwitch('china')"
              >全国</div>
              <div 
                class="map-btn" 
                :class="{ active: currentMap === 'hubei' }"
                @click="handleMapSwitch('hubei')"
              >湖北省</div>
              <div 
                class="map-btn" 
                :class="{ active: currentMap === 'wuhan' }"
                @click="handleMapSwitch('wuhan')"
              >武汉市</div>
            </div>
            <!-- 地图背景装饰 -->
            <div class="map1"></div>
            <div class="map2"></div>
            <div class="map3"></div>
            <!-- Echarts 概化地图组件 -->
            <div class="center-map" id="centerMapEchart">
              <v-chart 
                :option="currentMapOptions" 
                autoresize 
                :init-options="{renderer: 'canvas'}" 
                @click="onMapRegionClick"
              />
            </div>
          </div>
          <div class="panel-footer"></div>
        </div>
      </div>

      <!-- 右列：电子界桩总览（结构与 original 右侧列一致） -->
      <div class="column">
        <div class="panel">
          <h2>电子界桩总览</h2>
          <div class="panel-inner">
            <!-- 统计卡片占位 -->
            <el-row :gutter="12" style="margin-bottom:12px">
              <el-col :span="12">
                <el-card shadow="hover" class="stat-card">
                  <el-statistic title="界桩总数" :value="stats.boundaryTotal">
                    <template #suffix>
                      <el-icon color="#409eff"><Odometer /></el-icon>
                    </template>
                  </el-statistic>
                </el-card>
              </el-col>
              <el-col :span="12">
                <el-card shadow="hover" class="stat-card">
                  <el-statistic title="在线" :value="stats.boundaryOnline">
                    <template #suffix>
                      <el-icon color="#67c23a"><CircleCheck /></el-icon>
                    </template>
                  </el-statistic>
                </el-card>
              </el-col>
              <el-col :span="12" style="margin-top:12px">
                <el-card shadow="hover" class="stat-card">
                  <el-statistic title="离线" :value="stats.boundaryOffline">
                    <template #suffix>
                      <el-icon color="#f56c6c"><Warning /></el-icon>
                    </template>
                  </el-statistic>
                </el-card>
              </el-col>
              <el-col :span="12" style="margin-top:12px">
                <el-card shadow="hover" class="stat-card">
                  <el-statistic title="未知预留" :value="0">
                    <template #suffix>
                      <el-icon color="#909399"><QuestionFilled /></el-icon>
                    </template>
                  </el-statistic>
                </el-card>
              </el-col>
            </el-row>
          </div>

          <!-- 电子界桩饼图（测试） -->
          <div class="panel chart-panel">
            <h2>界桩状态分布</h2>
            <div class="chart">
              <v-chart :option="pilePieOptions" autoresize />
            </div>
            <div class="panel-footer"></div>
          </div>

          <!-- 电子界桩预警 -->
          <div class="panel table-panel">
            <h2>电子界桩预警</h2>
            <div class="chart">
              <template v-if="boundaryAlerts.length">
                <div class="alert-scroll">
                  <div v-for="row in boundaryAlerts" :key="row.alertId" class="alert-card">
                    <div class="alert-item">
                      <div class="alert-line1">
                        <span class="alert-name">{{ row.name }}</span>
                        <el-tag v-if="row.handleStatus === 0" size="small" type="danger" effect="plain">未处理</el-tag>
                        <el-tag v-else size="small" type="success" effect="plain">已处理</el-tag>
                      </div>
                      <div class="alert-line2">
                        <span class="muted">编号：{{ row.boundaryCode }}</span>
                        <span class="muted">时间：{{ formatDateTime(row.alertTime) }}</span>
                      </div>
                      <div class="alert-line3">
                        <span class="muted alert-desc" :title="row.alertDesc">{{ row.alertDesc }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <el-empty v-else description="暂无界桩预警数据" />
            </div>
            <div class="panel-footer"></div>
          </div>

          <div class="panel-footer"></div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Odometer, Warning, CircleCheck, QuestionFilled } from '@element-plus/icons-vue';
import { listTermiteStations, type TermiteStation } from '@/services/termiteStations';
import { listElectronicBoundaries, type ElectronicBoundary } from '@/services/electronicBoundaries';
import { updateAlertStatus } from '@/services/alerts';
import { use } from 'echarts/core';
import * as echarts from 'echarts/core';
import VChart from 'vue-echarts';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart, MapChart, EffectScatterChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent, TitleComponent, GeoComponent, VisualMapComponent } from 'echarts/components';
import { ElMessage, ElMessageBox } from 'element-plus';
import chinaGeoJson from '@/assets/china.json';

use([CanvasRenderer, PieChart, MapChart, EffectScatterChart, LegendComponent, TooltipComponent, TitleComponent, GeoComponent, VisualMapComponent]);
echarts.registerMap('china', chinaGeoJson as any);

const router = useRouter();
const loading = ref(false);
// 头部时间显示
const nowTime = ref('');
// 全屏状态
const isFullscreen = ref(false);
// 大屏容器引用
const dashboardRoot = ref<HTMLElement | null>(null);

// 统计数据
const stats = reactive({
  stationTotal: 0,
  stationWithTermites: 0,
  stationNoTermites: 0,
  stationNoData: 0,
  // 电子界桩统计
  boundaryTotal: 0,
  boundaryOnline: 0,
  boundaryOffline: 0
});

// 当前呈现哪张地图
const currentMap = ref<'china' | 'hubei' | 'wuhan'>('china');
const registeredMaps = ref<string[]>(['china']);

const mapUrls: Record<string, string> = {
  hubei: '/hubei.json',
  wuhan: '/wuhan.json'
};

async function handleMapSwitch(target: 'china' | 'hubei' | 'wuhan') {
  if (target !== 'china' && !registeredMaps.value.includes(target)) {
    loading.value = true;
    try {
      const res = await fetch(mapUrls[target]);
      if (!res.ok) throw new Error('Network response was not ok');
      const geoJson = await res.json();
      echarts.registerMap(target, geoJson as any);
      registeredMaps.value.push(target);
    } catch (e: any) {
      ElMessage.error(`加载${target === 'hubei' ? '湖北省' : '武汉市'}地图数据失败`);
      loading.value = false;
      return;
    }
    loading.value = false;
  }
  currentMap.value = target;
}

// 地图点击下钻逻辑
function onMapRegionClick(params: any) {
  // 如果点的是地图区域（而不是散点），且当前在中国地图
  if (currentMap.value === 'china' && (params.name === '湖北省' || params.name === '湖北')) {
    handleMapSwitch('hubei');
  } 
  // 如果在湖北地图，并且点击了武汉市
  else if (currentMap.value === 'hubei' && (params.name === '武汉市' || params.name === '武汉')) {
    handleMapSwitch('wuhan');
  }
}

interface MapPoint {
  name: string;
  value: [number, number, number];
  stationCount: number;
  termiteCount: number;
  noTermiteCount: number;
  noDataCount: number;
}

interface BoundaryMapPoint {
  name: string;
  value: [number, number, number];
  boundaryTotal: number;
  boundaryOnline: number;
  boundaryOffline: number;
}

const defaultChinaMapData: MapPoint[] = [
  { name: '湖北省', value: [114.305393, 30.593099, 160], stationCount: 8, termiteCount: 5, noTermiteCount: 2, noDataCount: 1 }
];

const defaultHubeiMapData: MapPoint[] = [
  { name: '武汉市', value: [114.305393, 30.593099, 160], stationCount: 8, termiteCount: 5, noTermiteCount: 2, noDataCount: 1 }
];

const defaultWuhanMapData: MapPoint[] = [
  { name: '江汉区', value: [114.270924, 30.601463, 120], stationCount: 1, termiteCount: 1, noTermiteCount: 0, noDataCount: 0 },
  { name: '武昌区', value: [114.315891, 30.553896, 80], stationCount: 1, termiteCount: 0, noTermiteCount: 1, noDataCount: 0 },
  { name: '洪山区', value: [114.343763, 30.499878, 60], stationCount: 1, termiteCount: 0, noTermiteCount: 0, noDataCount: 1 }
];

const centerMapData = ref<MapPoint[]>([...defaultChinaMapData]);
const hubeiMapData = ref<MapPoint[]>([...defaultHubeiMapData]);
const wuhanMapData = ref<MapPoint[]>([...defaultWuhanMapData]);

const centerBoundaryOnlineMapData = ref<BoundaryMapPoint[]>([]);
const centerBoundaryOfflineMapData = ref<BoundaryMapPoint[]>([]);
const hubeiBoundaryOnlineMapData = ref<BoundaryMapPoint[]>([]);
const hubeiBoundaryOfflineMapData = ref<BoundaryMapPoint[]>([]);
const wuhanBoundaryOnlineMapData = ref<BoundaryMapPoint[]>([]);
const wuhanBoundaryOfflineMapData = ref<BoundaryMapPoint[]>([]);

function getStationLngLat(station: TermiteStation): [number, number] | null {
  if (typeof station.lngBd09 === 'number' && typeof station.latBd09 === 'number') {
    return [station.lngBd09, station.latBd09];
  }
  if (typeof station.lngWgs84 === 'number' && typeof station.latWgs84 === 'number') {
    return [station.lngWgs84, station.latWgs84];
  }
  return null;
}

function getBoundaryLngLat(boundary: ElectronicBoundary): [number, number] | null {
  if (typeof boundary.lngWgs84 === 'number' && typeof boundary.latWgs84 === 'number') {
    return [boundary.lngWgs84, boundary.latWgs84];
  }
  if (typeof boundary.lngBd09 === 'number' && typeof boundary.latBd09 === 'number') {
    return [boundary.lngBd09, boundary.latBd09];
  }
  return null;
}

function getBoundaryCityName(boundary: ElectronicBoundary): string {
  const address = boundary.address || '';
  const cityMatch = address.match(/([^省自治区直辖市]+市)/);
  if (cityMatch?.[1]) return cityMatch[1];
  return '武汉市';
}

function getBoundaryProvinceName(boundary: ElectronicBoundary): string {
  const address = boundary.address || '';
  const provinceMatch = address.match(/([^自治区省市]+省|[^自治区省市]+市|广西壮族自治区|内蒙古自治区|西藏自治区|宁夏回族自治区|新疆维吾尔自治区)/);
  if (provinceMatch?.[1]) return provinceMatch[1];
  return '湖北省';
}

function getCityName(station: TermiteStation): string {
  const address = station.address || '';
  const cityMatch = address.match(/([^省自治区直辖市]+市)/);
  if (cityMatch?.[1]) return cityMatch[1];
  return '武汉市';
}

function getProvinceName(station: TermiteStation): string {
  const address = station.address || '';
  const provinceMatch = address.match(/([^自治区省市]+省|[^自治区省市]+市|广西壮族自治区|内蒙古自治区|西藏自治区|宁夏回族自治区|新疆维吾尔自治区)/);
  if (provinceMatch?.[1]) return provinceMatch[1];
  return '湖北省';
}

function pushStationToAggregate(
  map: Map<string, { sumLng: number; sumLat: number; stationCount: number; termiteCount: number; noTermiteCount: number; noDataCount: number; intensity: number }>,
  key: string,
  lng: number,
  lat: number,
  termiteStatus: 0 | 1 | undefined
) {
  const intensity = termiteStatus === 1 ? 140 : termiteStatus === 0 ? 80 : 50;
  const entry = map.get(key) || {
    sumLng: 0,
    sumLat: 0,
    stationCount: 0,
    termiteCount: 0,
    noTermiteCount: 0,
    noDataCount: 0,
    intensity: 0
  };

  entry.sumLng += lng;
  entry.sumLat += lat;
  entry.stationCount += 1;
  entry.intensity += intensity;
  if (termiteStatus === 1) entry.termiteCount += 1;
  else if (termiteStatus === 0) entry.noTermiteCount += 1;
  else entry.noDataCount += 1;

  map.set(key, entry);
}

function aggregateToMapPoints(map: Map<string, { sumLng: number; sumLat: number; stationCount: number; termiteCount: number; noTermiteCount: number; noDataCount: number; intensity: number }>): MapPoint[] {
  return Array.from(map.entries()).map(([name, item]) => ({
    name,
    value: [item.sumLng / item.stationCount, item.sumLat / item.stationCount, Math.max(item.intensity / item.stationCount, 40)],
    stationCount: item.stationCount,
    termiteCount: item.termiteCount,
    noTermiteCount: item.noTermiteCount,
    noDataCount: item.noDataCount
  }));
}

function rebuildDashboardBoundaryMapPoints(boundaries: ElectronicBoundary[]) {
  const withCoord = boundaries
    .map(boundary => ({ boundary, lngLat: getBoundaryLngLat(boundary) }))
    .filter((item): item is { boundary: ElectronicBoundary; lngLat: [number, number] } => !!item.lngLat);

  if (!withCoord.length) {
    centerBoundaryOnlineMapData.value = [];
    centerBoundaryOfflineMapData.value = [];
    hubeiBoundaryOnlineMapData.value = [];
    hubeiBoundaryOfflineMapData.value = [];
    wuhanBoundaryOnlineMapData.value = [];
    wuhanBoundaryOfflineMapData.value = [];
    return;
  }

  const chinaAggregate = new Map<string, { sumLng: number; sumLat: number; total: number; online: number; offline: number }>();
  const hubeiAggregate = new Map<string, { sumLng: number; sumLat: number; total: number; online: number; offline: number }>();

  const push = (
    map: Map<string, { sumLng: number; sumLat: number; total: number; online: number; offline: number }>,
    key: string,
    lng: number,
    lat: number,
    status: 0 | 1
  ) => {
    const entry = map.get(key) || { sumLng: 0, sumLat: 0, total: 0, online: 0, offline: 0 };
    entry.sumLng += lng;
    entry.sumLat += lat;
    entry.total += 1;
    if (status === 1) entry.online += 1;
    else entry.offline += 1;
    map.set(key, entry);
  };

  for (const { boundary, lngLat } of withCoord) {
    const [lng, lat] = lngLat;
    push(chinaAggregate, getBoundaryProvinceName(boundary), lng, lat, boundary.status);
    push(hubeiAggregate, getBoundaryCityName(boundary), lng, lat, boundary.status);
  }

  const toSeries = (
    map: Map<string, { sumLng: number; sumLat: number; total: number; online: number; offline: number }>,
    mode: 'online' | 'offline'
  ): BoundaryMapPoint[] => {
    const list: BoundaryMapPoint[] = [];
    for (const [name, item] of map.entries()) {
      const count = mode === 'online' ? item.online : item.offline;
      if (!count) continue;
      list.push({
        name,
        // 保持第三维稳定，点大小改由 symbolSize 按总数做上限控制，避免全国图出现巨大光点
        value: [item.sumLng / item.total, item.sumLat / item.total, 60],
        boundaryTotal: item.total,
        boundaryOnline: item.online,
        boundaryOffline: item.offline
      });
    }
    return list;
  };

  centerBoundaryOnlineMapData.value = toSeries(chinaAggregate, 'online');
  centerBoundaryOfflineMapData.value = toSeries(chinaAggregate, 'offline');
  hubeiBoundaryOnlineMapData.value = toSeries(hubeiAggregate, 'online');
  hubeiBoundaryOfflineMapData.value = toSeries(hubeiAggregate, 'offline');

  // 武汉市地图：只展示武汉市范围内的界桩，按在线/离线分别绘制（点位更直观）
  const wuhanBoundaries = withCoord
    .filter(({ boundary }) => {
      const city = getBoundaryCityName(boundary);
      return city === '武汉市' || (boundary.address || '').includes('武汉');
    })
    .map(({ boundary, lngLat }): BoundaryMapPoint => ({
      name: boundary.name || boundary.boundaryCode,
      value: [lngLat[0], lngLat[1], 60],
      boundaryTotal: 1,
      boundaryOnline: boundary.status === 1 ? 1 : 0,
      boundaryOffline: boundary.status === 0 ? 1 : 0
    }));

  wuhanBoundaryOnlineMapData.value = wuhanBoundaries.filter(p => p.boundaryOnline > 0);
  wuhanBoundaryOfflineMapData.value = wuhanBoundaries.filter(p => p.boundaryOffline > 0);
}

function rebuildDashboardMapPoints(stations: TermiteStation[]) {
  const withCoord = stations
    .map(station => ({ station, lngLat: getStationLngLat(station) }))
    .filter((item): item is { station: TermiteStation; lngLat: [number, number] } => !!item.lngLat);

  if (!withCoord.length) {
    centerMapData.value = [...defaultChinaMapData];
    hubeiMapData.value = [...defaultHubeiMapData];
    wuhanMapData.value = [...defaultWuhanMapData];
    return;
  }

  const chinaAggregate = new Map<string, { sumLng: number; sumLat: number; stationCount: number; termiteCount: number; noTermiteCount: number; noDataCount: number; intensity: number }>();
  const hubeiAggregate = new Map<string, { sumLng: number; sumLat: number; stationCount: number; termiteCount: number; noTermiteCount: number; noDataCount: number; intensity: number }>();

  const wuhanPoints: MapPoint[] = withCoord.map(({ station, lngLat }) => ({
    name: station.name || station.stationCode,
    value: [lngLat[0], lngLat[1], station.termiteStatus === 1 ? 140 : station.termiteStatus === 0 ? 80 : 50],
    stationCount: 1,
    termiteCount: station.termiteStatus === 1 ? 1 : 0,
    noTermiteCount: station.termiteStatus === 0 ? 1 : 0,
    noDataCount: station.termiteStatus === undefined ? 1 : 0
  }));

  for (const { station, lngLat } of withCoord) {
    const [lng, lat] = lngLat;
    pushStationToAggregate(chinaAggregate, getProvinceName(station), lng, lat, station.termiteStatus);
    pushStationToAggregate(hubeiAggregate, getCityName(station), lng, lat, station.termiteStatus);
  }

  centerMapData.value = aggregateToMapPoints(chinaAggregate);
  hubeiMapData.value = aggregateToMapPoints(hubeiAggregate);
  wuhanMapData.value = wuhanPoints;
}

const currentMapOptions = computed(() => {
  const isChina = currentMap.value === 'china';
  const isHubei = currentMap.value === 'hubei';
  const isWuhan = currentMap.value === 'wuhan';
  
  // 决定当前显示哪组散点数据
  let mapData = centerMapData.value;
  if (isHubei) mapData = hubeiMapData.value;
  if (isWuhan) mapData = wuhanMapData.value;

  let boundaryOnlineData = centerBoundaryOnlineMapData.value;
  let boundaryOfflineData = centerBoundaryOfflineMapData.value;
  if (isHubei) {
    boundaryOnlineData = hubeiBoundaryOnlineMapData.value;
    boundaryOfflineData = hubeiBoundaryOfflineMapData.value;
  }
  if (isWuhan) {
    boundaryOnlineData = wuhanBoundaryOnlineMapData.value;
    boundaryOfflineData = wuhanBoundaryOfflineMapData.value;
  }
  const boundaryData = [...boundaryOnlineData, ...boundaryOfflineData];

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.seriesName?.includes('界桩') && params.data?.value) {
          const total = params.data?.boundaryTotal ?? '-';
          const online = params.data?.boundaryOnline ?? '-';
          const offline = params.data?.boundaryOffline ?? '-';
          return `${params.name}<br/>界桩总数: ${total}<br/>在线: ${online}<br/>离线: ${offline}`;
        }
        if (params.seriesType === 'effectScatter' && params.data?.value) {
          const stationCount = params.data?.stationCount ?? '-';
          const termiteCount = params.data?.termiteCount ?? '-';
          const noTermiteCount = params.data?.noTermiteCount ?? '-';
          const noDataCount = params.data?.noDataCount ?? '-';
          return `${params.name}<br/>测站数: ${stationCount}<br/>有白蚁: ${termiteCount}<br/>无白蚁: ${noTermiteCount}<br/>无数据: ${noDataCount}`;
        }
        return params.name || '';
      }
    },
      geo: {
      map: currentMap.value, // 直接使用对应注册的真实地图轮廓
      zoom: 1.1, // 还原正常缩放级别，Echarts自动适配容器大小和边界
      aspectScale: isChina ? 0.75 : 1, // 中国地图用默认0.75防过高，省市地图用1防压扁
      roam: false,
      itemStyle: {
        areaColor: 'rgba(20, 41, 87, 0.78)',
        borderColor: '#2cb0d9',
        borderWidth: 1
      },
      emphasis: {
        itemStyle: {
          areaColor: 'rgba(57, 134, 192, 0.95)'
        },
        label: { show: false }
      }
    },
    series: [
      {
        name: '测站',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: mapData,
        symbolSize: (val: number[]) => Math.max((val?.[2] || 0) / 8, 8),
        showEffectOn: 'render',
        rippleEffect: { brushType: 'stroke', scale: 2.8 },
        label: {
          show: false,
          formatter: '{b}',
          position: 'right',
          color: '#dff8ff',
          fontSize: 12
        },
        itemStyle: {
          color: '#00d7ff',
          shadowBlur: 10,
          shadowColor: 'rgba(0, 215, 255, 0.45)'
        },
        zlevel: 2
      },
      {
        name: '界桩',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: boundaryData,
        symbolSize: (_val: number[], params: any) => {
          const total = Number(params?.data?.boundaryTotal || 1);
          return Math.min(14, 8 + Math.sqrt(total) * 1.6);
        },
        showEffectOn: 'render',
        rippleEffect: { brushType: 'stroke', scale: 1.9 },
        label: { show: false },
        itemStyle: {
          color: '#00d7ff',
          shadowBlur: 10,
          shadowColor: 'rgba(0, 215, 255, 0.4)'
        },
        zlevel: 4
      }
    ]
  };
});

interface StationAlert {
  stationId: number;
  stationCode: string;
  name: string;
  alertId: number;
  alertTime: string;
  alertDesc: string;
  handleStatus: 0 | 1;
}

const stationAlerts = ref<StationAlert[]>([]);

// 界桩预警结构和数据
interface BoundaryAlert {
  boundaryId: number;
  boundaryCode: string;
  name: string;
  alertId: number;
  alertTime: string;
  alertDesc: string;
  handleStatus: 0 | 1;
}

const boundaryAlerts = ref<BoundaryAlert[]>([
  {
    boundaryId: 101,
    boundaryCode: "EB-WH-001",
    name: "新洲1号界桩",
    alertId: 2001,
    alertTime: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    alertDesc: "界桩发生位移或倾斜异常，疑似受到外力碰撞",
    handleStatus: 0
  },
  {
    boundaryId: 102,
    boundaryCode: "EB-WH-045",
    name: "蔡甸边界测点",
    alertId: 2002,
    alertTime: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    alertDesc: "设备离线",
    handleStatus: 1
  }
]);

// 饼图配置
const termitePieOptions = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: {
    bottom: 0,
    textStyle: { color: '#e8f5ff', fontSize: 12 }
  },
  textStyle: { color: '#e8f5ff' },
  color: ['#f09d5b', '#86ce9e', '#909399'],
  series: [
    {
      name: '状态',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      label: { show: false, position: 'center', color: '#e8f5ff' },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold', color: '#ffffff' } },
      labelLine: { show: false },
      data: [
        { value: stats.stationWithTermites, name: '有白蚁' },
        { value: stats.stationNoTermites, name: '无白蚁' },
        { value: stats.stationNoData, name: '无数据' }
      ]
    }
  ]
}));

const pilePieOptions = computed(() => ({
  tooltip: { trigger: 'item' },
  legend: {
    bottom: 0,
    textStyle: { color: '#e8f5ff', fontSize: 12 }
  },
  textStyle: { color: '#e8f5ff' },
  series: [
    {
      name: '电子界桩状态',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      label: { show: false, position: 'center', color: '#e8f5ff' },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold', color: '#ffffff' } },
      labelLine: { show: false },
      data: [
        { value: stats.boundaryOnline, name: '在线' },
        { value: stats.boundaryOffline, name: '离线' }
      ]
    }
  ]
}));

// 格式化时间
function formatDateTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });
  } catch {
    return isoString;
  }
}

function viewStationDetail(id: number) {
  router.push(`/station-detail?id=${id}`);
}

async function handleAlert(alert: StationAlert) {
  try {
    await ElMessageBox.confirm(
      `确认将预警"${alert.alertDesc}"标记为已处理吗？`,
      '处理预警',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 调用后端接口标记预警为已处理
    try {
      await updateAlertStatus(alert.alertId, { handled: true, handler: 'admin' });
    } catch (e: any) {
      ElMessage.error(e.message || '更新预警状态失败');
      return;
    }
    
    // 从列表中移除该预警
    const index = stationAlerts.value.findIndex(a => a.alertId === alert.alertId);
    if (index > -1) {
      stationAlerts.value.splice(index, 1);
    }
    
    ElMessage.success('预警已标记为已处理');
    
    // 刷新统计数据
    await loadAlerts();
  } catch {
    // 用户取消
  }
}

async function loadAlerts() {
  loading.value = true;
  try {
    // 加载所有测站
    const page = await listTermiteStations({ pageNo: 1, pageSize: 1000 });
    const stations = page.records;
    
    stats.stationTotal = page.total;
    // 概览统计统一与列表的“白蚁状态”对齐
    stats.stationWithTermites = stations.filter(s => s.termiteStatus === 1).length;
    stats.stationNoTermites = stations.filter(s => s.termiteStatus === 0).length;
    stats.stationNoData = stations.filter(s => s.termiteStatus === undefined).length;
    rebuildDashboardMapPoints(stations);
    
    // 预警列表与测站数据保持一致：仅从有白蚁的测站中生成
    const alertStations = stations.filter(s => s.termiteStatus === 1).slice(0, 6);
    stationAlerts.value = alertStations.map((s, idx) => ({
      stationId: s.id,
      stationCode: s.stationCode,
      name: s.name,
      alertId: 1000 + s.id,
      alertTime: s.updateTime || s.createTime || new Date(Date.now() - idx * 3600_000).toISOString(),
      alertDesc: '检测到白蚁活动迹象',
      handleStatus: idx < 2 ? 0 : 1
    }));
    
    ElMessage.success('数据已刷新');
  } catch (e: any) {
    ElMessage.error(e.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function loadBoundaryStats() {
  try {
    const page = await listElectronicBoundaries({ pageNum: 1, pageSize: 500 });
    const list = page.list;
    stats.boundaryTotal = page.total;
    stats.boundaryOnline = list.filter(b => b.status === 1).length;
    stats.boundaryOffline = list.filter(b => b.status === 0).length;
    rebuildDashboardBoundaryMapPoints(list);
  } catch (e: any) {
    ElMessage.error(e.message || '加载电子界桩统计失败');
  }
}

function handleFullscreenChange() {
  const doc: any = document;
  const fsEl = doc.fullscreenElement || doc.webkitFullscreenElement;
  isFullscreen.value = !!(fsEl && dashboardRoot.value && fsEl === dashboardRoot.value);
}

function toggleFullscreen() {
  const doc: any = document;
  const el: any = dashboardRoot.value;

  if (!el) return;

  if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
    const request = el.requestFullscreen || el.webkitRequestFullscreen;
    if (request) {
      request.call(el);
    }
  } else {
    const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
    if (exit) {
      exit.call(doc);
    }
  }
}

onMounted(() => {
  loadAlerts();
  loadBoundaryStats();
  const updateTime = () => {
    const dt = new Date();
    const y = dt.getFullYear();
    const mt = dt.getMonth() + 1;
    const day = dt.getDate();
    const h = dt.getHours();
    const m = dt.getMinutes();
    const s = dt.getSeconds();
    nowTime.value = `当前时间：${y}年${mt}月${day}-${h}时${m}分${s}秒`;
  };
  updateTime();
  timeTimer = window.setInterval(updateTime, 1000);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
});

let timeTimer: number | undefined;

onBeforeUnmount(() => {
  if (timeTimer) {
    clearInterval(timeTimer);
  }
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
});
</script>

<style scoped>
.dashboard-root :global(*) {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.dashboard-root :global(li) {
  list-style: none;
}

@font-face {
  font-family: electronicFont;
  src: url('/font/DS-DIGIT.TTF');
}

.dashboard-root {
  --dash-gap: clamp(8px, 0.7vw, 16px);
  --dash-pad-x: clamp(8px, 0.9vw, 18px);
  --dash-pad-y: clamp(6px, 0.7vw, 12px);
  --dash-header-h: clamp(64px, 7vh, 82px);

  padding: var(--dash-pad-y) var(--dash-pad-x);
  box-sizing: border-box;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: url('/images/bg.jpg') no-repeat #000;
  background-size: cover;
  line-height: 1.15;
  color: #e8f5ff;
}

/* 复刻 original/echart header，但用 px 调整在 PC 下更合适 */
.screen-header {
  position: relative;
  height: var(--dash-header-h);
  background: url('/images/head_bg.png') no-repeat top center;
  background-size: 100% 100%;
  flex-shrink: 0;
}

.screen-header h1 {
  font-size: clamp(22px, 1.35vw, 36px);
  color: #fff;
  text-align: center;
  line-height: calc(var(--dash-header-h) - 12px);
  letter-spacing: clamp(1px, 0.22vw, 4px);
  font-weight: 600;
  background: linear-gradient(180deg, #ffffff, #80d4ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.showTime {
  position: absolute;
  top: 0;
  right: 24px;
  line-height: calc(var(--dash-header-h) - 12px);
  font-size: clamp(12px, 0.72vw, 14px);
  color: rgba(255, 255, 255, 0.7);
}

.header-actions {
  position: absolute;
  top: 50%;
  left: 24px;
  transform: translateY(-50%);
}

.header-actions :deep(.el-button) {
  padding: 4px 14px;
  font-size: 12px;
}

/* 三列主区域：左右略窄，中间略宽 */
.mainbox {
  flex: 1;
  min-height: 0;
  width: 100%;
  margin-top: var(--dash-gap);
  display: grid;
  grid-template-columns: minmax(320px, 1fr) minmax(520px, 1.5fr) minmax(320px, 1fr);
  gap: var(--dash-gap);
  align-items: stretch;
}

.mainbox .column {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.mainbox .column:nth-child(2) {
  margin: 0;
}

.mainbox > .column > .panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin-bottom: 0;
}

/* 顶层左右列中的“预警面板”占满剩余空间 */
.mainbox > .column > .panel > .table-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.mainbox > .column > .panel > .table-panel > h2 {
  flex-shrink: 0;
}

.panel {
  position: relative;
  border: 1px solid rgba(25, 186, 139, 0.17);
  background: rgba(255, 255, 255, 0.04) url('/images/line(1).png');
  padding: 0 10px 14px;
  margin-bottom: 6px;
}

.panel::before {
  position: absolute;
  top: 0;
  left: 0;
  content: "";
  width: 10px;
  height: 10px;
  border-top: 2px solid #02a6b5;
  border-left: 2px solid #02a6b5;
}

.panel::after {
  position: absolute;
  top: 0;
  right: 0;
  content: "";
  width: 10px;
  height: 10px;
  border-top: 2px solid #02a6b5;
  border-right: 2px solid #02a6b5;
}

.panel .panel-footer {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
}

.panel .panel-footer::before {
  position: absolute;
  bottom: 0;
  left: 0;
  content: "";
  width: 10px;
  height: 10px;
  border-bottom: 2px solid #02a6b5;
  border-left: 2px solid #02a6b5;
}

.panel .panel-footer::after {
  position: absolute;
  bottom: 0;
  right: 0;
  content: "";
  width: 10px;
  height: 10px;
  border-bottom: 2px solid #02a6b5;
  border-right: 2px solid #02a6b5;
}

.panel h2 {
  height: 36px;
  line-height: 36px;
  text-align: center;
  color: #fff;
  font-size: 18px; /* 调大字号更醒目 */
  font-weight: 600;
  letter-spacing: 2px;
  text-shadow: 0 0 8px #02a6b5; /* 增加发光效果 */
}

.panel .chart {
  height: 240px;
}

.panel-inner {
  padding-top: 8px;
}

/* 统计卡片：弱化白色边框，改为青色霓虹块，更贴合大屏风格 */
.stat-card {
  background: radial-gradient(circle at top left, rgba(25, 186, 139, 0.18), transparent 60%),
    rgba(5, 25, 55, 0.9);
  border-color: rgba(25, 186, 139, 0.6);
  box-shadow: 0 0 16px rgba(0, 255, 255, 0.18) inset;
  transition: all 0.3s;
  cursor: default;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 0 25px rgba(0, 255, 255, 0.35) inset, 0 5px 15px rgba(0, 255, 255, 0.2);
}

/* 中列数字大屏与地图装饰：等比例缩小，仍保证可见 */
.no {
  background: rgba(101, 132, 226, 0.1);
  padding: 10px;
  margin-bottom: 8px;
}

.no .no-hd {
  position: relative;
  border: 1px solid rgba(25, 186, 139, 0.17);
}

.no .no-hd::before {
  content: "";
  position: absolute;
  width: 30px;
  height: 10px;
  border-top: 2px solid #02a6b5;
  border-left: 2px solid #02a6b5;
  top: 0;
  left: 0;
}

.no .no-hd::after {
  content: "";
  position: absolute;
  width: 30px;
  height: 10px;
  border-bottom: 2px solid #02a6b5;
  border-right: 2px solid #02a6b5;
  right: 0;
  bottom: 0;
}

.no .no-hd ul {
  display: flex;
}

.no .no-hd ul li {
  position: relative;
  flex: 1;
  text-align: center;
  height: 80px; /* 增大高度 */
  line-height: 80px;
  font-size: 54px; /* 增大字号极其醒目 */
  color: #ffeb7b;
  padding: 4px 0;
  font-family: electronicFont, Arial, sans-serif;
  font-weight: bold;
  text-shadow: 0 0 10px #ffeb7b, 0 0 20px #ffac40;
}

.no .no-hd ul li:first-child::after {
  content: "";
  position: absolute;
  height: 50%;
  width: 1px;
  background: rgba(255, 255, 255, 0.2);
  right: 0;
  top: 25%;
}

.no .no-bd ul {
  display: flex;
}

.no .no-bd ul li {
  flex: 1;
  height: 30px;
  line-height: 30px;
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  color: rgba(245, 250, 255, 0.95);
  padding-top: 4px;
}

.map {
  position: relative;
  flex: 1; /* 撑满剩余高度 */
  min-height: clamp(360px, 48vh, 900px); /* 保证一定的基础高度 */
  display: flex !important;
  flex-direction: column;
}

.map .panel-inner {
  position: relative;
  flex: 1;
}

.map-controls {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  gap: 15px;
  background: rgba(5, 25, 55, 0.6);
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid rgba(0, 242, 255, 0.4);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
}

.map-btn {
  font-size: 14px;
  color: #a0cfff;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 2px;
  transition: all 0.3s;
}

.map-btn:hover {
  color: #00f2ff;
  text-shadow: 0 0 5px #00f2ff;
}

.map-btn.active {
  background: rgba(0, 242, 255, 0.2);
  color: #fff;
  font-weight: bold;
  box-shadow: inset 0 0 8px rgba(0, 242, 255, 0.5);
  text-shadow: 0 0 8px #00f2ff;
}

.map .map1,
.map .map2,
.map .map3 {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 260px;
  height: 260px;
  background: url('/images/map.png') no-repeat;
  background-size: 100% 100%;
  opacity: 0.3;
}

.map .map2 {
  width: 320px;
  height: 320px;
  background-image: url('/images/lbx.png');
  opacity: 0.6;
  animation: rotate 15s linear infinite;
  z-index: 2;
}

.map .map3 {
  width: 280px;
  height: 280px;
  background-image: url('/images/jt.png');
  animation: rotate1 10s linear infinite;
}

@keyframes rotate {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes rotate1 {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(-360deg);
  }
}
.alert-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  min-width: 0;
  overflow: hidden;
}
.alert-line1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}
.alert-name {
  font-weight: 600;
  color: #fefefe;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.alert-line2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px 10px;
  min-width: 0;
  font-size: 13px;
  color: rgba(230, 245, 255, 0.95);
}
.alert-line3 {
  font-size: 13px;
  color: rgba(230, 245, 255, 0.95);
  min-width: 0;
}
.alert-desc {
  white-space: normal;
  word-break: break-word;
  line-height: 1.4;
}
.alert-actions {
  display: flex;
  justify-content: flex-end;
}

/* 预警区改为卡片滚动列表，且占满面板可用高度 */
.table-panel .chart {
  flex: 1;
  min-height: 0;
  height: auto;
  overflow: hidden;
}

.alert-scroll {
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
}

.alert-card {
  border: 1px solid rgba(25, 186, 139, 0.25);
  background: rgba(6, 25, 56, 0.92);
  border-radius: 6px;
  padding: 10px;
}

:deep(.el-card) {
  background-color: transparent;
}

:deep(.el-card__header) {
  border-bottom-color: rgba(25, 186, 139, 0.35);
}

:deep(.el-statistic__content),
:deep(.el-statistic__number) {
  color: #ffffff !important;
    font-size: 34px !important;
    font-weight: bold;
    font-family: electronicFont, Arial, sans-serif;
    text-shadow: 0 0 8px rgba(0, 255, 255, 0.6);
  }

  :deep(.el-statistic__head),
  :deep(.el-statistic__title) {
    color: rgba(220, 235, 255, 0.95) !important;
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 5px;
    letter-spacing: 1px;
  background-color: transparent;
  color: #e8f5ff;
}

:deep(.el-table tr) {
  background-color: transparent;
}

:deep(.el-table tbody tr:hover > td) {
  background-color: rgba(16, 58, 112, 0.96) !important;
}

:deep(.el-table th),
:deep(.el-table td) {
  background-color: rgba(9, 32, 63, 0.95);
  border-color: rgba(25, 186, 139, 0.25);
}

:deep(.table-panel .el-table td.el-table__cell) {
  background-color: rgba(6, 25, 56, 0.96) !important;
  color: #eef8ff !important;
}

:deep(.table-panel .el-table th.el-table__cell) {
  background: linear-gradient(to right, rgba(0, 124, 219, 0.52), rgba(5, 69, 140, 0.68)) !important;
  color: #f6fbff !important;
}

:deep(.el-table__header-wrapper th) {
  background: linear-gradient(to right, rgba(0, 242, 255, 0.35), rgba(0, 255, 157, 0.15));
  color: #f6fbff;
}

:deep(.el-table__empty-block) {
  background-color: transparent;
}

:deep(.el-empty__description) {
  color: rgba(220, 234, 255, 0.75);
}

:deep(.el-tag--danger.is-plain) {
  background-color: rgba(245, 108, 108, 0.1);
  border-color: rgba(245, 108, 108, 0.7);
}

:deep(.el-tag--success.is-plain) {
  background-color: rgba(103, 194, 58, 0.1);
  border-color: rgba(103, 194, 58, 0.7);
}

:deep(.el-button.is-plain) {
  border-color: rgba(0, 242, 255, 0.6);
}

/* 概化地图组件样式 */
.center-map {
  width: 100%;
  height: 100% !important; /* 防止被 panel chart 的固定高度覆盖 */
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

/* 超宽屏（带鱼屏）下扩大中间地图列占比，提升利用率 */
@media (min-aspect-ratio: 21/9) {
  .mainbox {
    grid-template-columns: minmax(340px, 1fr) minmax(900px, 2fr) minmax(340px, 1fr);
  }
}

/* 窄高屏（3:4、4:5）改为单列流式布局，保证可读性与无横向留白 */
@media (max-aspect-ratio: 4/3) {
  .dashboard-root {
    overflow: auto;
  }

  .mainbox {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .mainbox .column:nth-child(2) {
    order: 1;
  }

  .mainbox .column:nth-child(1) {
    order: 2;
  }

  .mainbox .column:nth-child(3) {
    order: 3;
  }

  .map {
    min-height: 520px;
  }
}

/* 常见 2K/高分辨率桌面：压缩横向内边距，进一步减少边缘空白 */
@media (min-width: 2200px) {
  .dashboard-root {
    --dash-pad-x: clamp(6px, 0.45vw, 12px);
  }
}
</style>
