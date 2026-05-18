<template>
  <div class="reservoir-shell">
    <section class="main-panel">
      <div class="page-header">
        <div class="header-left">
          <div class="page-title">{{ reservoirName }}</div>
          <div class="page-meta">RESERVOIR TERMITE MONITORING CONSOLE</div>
        </div>
        <div class="header-actions">
          <div class="header-label">切换水库</div>
          <el-select
            v-model="reservoirCode"
            filterable
            placeholder="选择水库"
            style="width: 220px"
            @change="handleReservoirChange"
          >
            <el-option
              v-for="item in reservoirOptions"
              :key="item.reservoirCode"
              :label="item.reservoirName"
              :value="item.reservoirCode"
            />
          </el-select>
          <div class="header-pill">水库编码 {{ reservoirCode || '-' }}</div>
        </div>
      </div>

      <div class="tab-strip">
        <div
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-chip"
          :class="{ active: activeTab === tab.key }"
          @click="switchTab(tab.key)"
        >
          {{ tab.label }}
        </div>
      </div>

      <section v-if="activeTab === 'overview'" class="tab-content">
        <div class="summary-row">
          <div class="summary-left">
            <div class="summary-title">
              白蚁监测总数：
              <span class="summary-value">{{ overview?.stationCount ?? 0 }}</span>
              个
            </div>
            <div class="summary-legend">
              <span class="legend-item red"><i></i>有白蚁</span>
              <span class="legend-item green"><i></i>无白蚁</span>
              <span class="legend-item gray"><i></i>无数据</span>
            </div>
          </div>
          <div class="summary-cards">
            <div class="summary-card">
              <div class="card-number blue">{{ overview?.stationCount ?? 0 }}</div>
              <div class="card-label">当前页面点数</div>
            </div>
            <div class="summary-card">
              <div class="card-number red">{{ overview?.hasTermiteCount ?? 0 }}</div>
              <div class="card-label">有白蚁</div>
            </div>
            <div class="summary-card">
              <div class="card-number green">{{ overview?.noTermiteCount ?? 0 }}</div>
              <div class="card-label">无白蚁</div>
            </div>
            <div class="summary-card">
              <div class="card-number gray">{{ overview?.noDataCount ?? 0 }}</div>
              <div class="card-label">无数据</div>
            </div>
          </div>
        </div>

        <div class="info-bar" v-if="overviewLoading">实时监测数据加载中...</div>

        <div class="overview-grid">
          <div class="overview-map">
            <div class="filter-row">
              <span class="filter-label">监测日期</span>
              <el-date-picker
                v-model="monitorDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择监测日期"
                @change="loadOverview"
              />
            </div>
            <div ref="mapEl" class="map-container"></div>
          </div>
          <div class="overview-side">
            <div class="table-header">
              <div class="table-title">站点明细</div>
              <div class="table-count">{{ overview?.tableRows?.length ?? 0 }} 条记录</div>
            </div>
            <el-table
              :data="overview?.tableRows || []"
              size="small"
              height="560"
              v-loading="overviewLoading"
              class="overview-table"
            >
              <el-table-column type="index" label="编号" width="60" />
              <el-table-column prop="stationName" label="监测站名称" min-width="140" />
              <el-table-column label="有无白蚁" width="90">
                <template #default="{ row }">
                  <span :class="['status-pill', statusPillClass(row.displayStatus)]">
                    {{ statusPillLabel(row.displayStatus) }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="handleStatusLabel" label="状态" width="90">
                <template #default="{ row }">
                  <span class="status-text" :class="row.handleStatus === 0 ? 'warn' : row.handleStatus === 1 ? 'ok' : 'muted'">
                    {{ row.handleStatusLabel || '-' }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="latestReportTime" label="最新上报时间" min-width="140" />
            </el-table>
          </div>
        </div>
      </section>

      <section v-else-if="activeTab === 'trend'" class="tab-content">
        <div class="info-bar" v-if="trendLoading">趋势数据加载中...</div>
        <div class="trend-toolbar">
          <div class="trend-meta">
            <div class="meta-label">当前水库</div>
            <div class="meta-value">{{ reservoirName }}</div>
          </div>
          <div class="trend-filters">
            <span class="filter-label">开始日期</span>
          <el-date-picker
            v-model="trendRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="到"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            @change="loadTrend"
          />
          </div>
        </div>
        <div class="trend-card" v-loading="trendLoading">
          <v-chart :option="trendOption" class="trend-chart" autoresize />
        </div>
      </section>

      <section v-else class="tab-content">
          <div class="photo-toolbar">
            <div class="toolbar-left">
              <div class="meta-chip">
                <div class="meta-label">当前水库</div>
                <div class="meta-value">{{ reservoirName }}</div>
              </div>
              <span class="filter-label">白蚁测站</span>
              <el-select
                v-model="imageStationId"
                filterable
                placeholder="选择站点"
                style="width: 200px"
                @change="loadImages"
              >
                <el-option
                  v-for="st in imageStations"
                  :key="st.stationId"
                  :label="st.stationName"
                  :value="st.stationId"
                />
              </el-select>
              <span class="filter-label">开始时间</span>
              <el-date-picker
                v-model="imageRange"
                type="datetimerange"
                value-format="YYYY-MM-DDTHH:mm:ss"
                range-separator="到"
                start-placeholder="开始时间"
                end-placeholder="结束时间"
                @change="loadImages"
              />
            </div>
          </div>

        <div class="photo-grid">
          <div class="photo-list" v-loading="imagesLoading">
            <div
              v-for="item in imageRecords"
              :key="item.imageId"
              class="photo-thumb"
              :class="{ active: item.imageId === selectedImage?.imageId }"
              @click="selectImage(item)"
            >
              <el-image :src="item.imageUrl" fit="cover" class="thumb-image" />
              <div class="thumb-time">{{ item.reportTime }}</div>
            </div>
            <div v-if="!imageRecords.length" class="empty">暂无图片</div>
            <div class="pager">
              <el-pagination
                background
                layout="prev, pager, next"
                :total="imageTotal"
                :page-size="imagePageSize"
                :current-page="imagePageNo"
                @current-change="handleImagePageChange"
              />
            </div>
          </div>
          <div class="photo-detail" v-loading="imagesLoading">
            <div v-if="!selectedImage" class="empty">请选择左侧图片</div>
            <div v-else class="detail-body">
              <el-image :src="selectedImage.imageUrl" fit="contain" class="detail-image" />
              <div class="detail-meta">
                <div class="detail-line">站点：{{ selectedImage.stationName }}</div>
                <div class="detail-line">编号：{{ selectedImage.imageCode }}</div>
                <div class="detail-line">时间：{{ selectedImage.reportTime }}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue';
import dayjs from 'dayjs';
import { ElMessage } from 'element-plus';
import { use } from 'echarts/core';
import VChart from 'vue-echarts';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
import {
  fetchReservoirOptions,
  fetchOverview,
  fetchTrend,
  fetchStations,
  fetchImages,
  fetchImageDetail,
  type ReservoirOption,
  type TermiteOverviewResponse,
  type TermiteTrendResponse,
  type TermiteStationOption,
  type TermiteImageRecord,
  type TermiteImageDetail
} from '@/services/termiteReservoirs';

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent]);

const activeTab = ref('overview');
const tabs = [
  { key: 'overview', label: '实时监测' },
  { key: 'trend', label: '白蚁监测趋势' },
  { key: 'images', label: '白蚁监测照片' }
];
const reservoirOptions = ref<ReservoirOption[]>([]);
const reservoirCode = ref('');
const monitorDate = ref(dayjs().format('YYYY-MM-DD'));
const overview = ref<TermiteOverviewResponse | null>(null);
const overviewLoading = ref(false);

const trendRange = ref<[string, string]>([
  dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
  dayjs().format('YYYY-MM-DD')
]);
const trendLoading = ref(false);
const trendOption = ref<any>({
  tooltip: { trigger: 'axis' },
  grid: { left: '3%', right: '4%', bottom: '6%', top: 30, containLabel: true },
  xAxis: { type: 'category', data: [], axisTick: { show: false }, axisLine: { lineStyle: { color: '#cfd7e6' } } },
  yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#e9eff7' } }, axisLine: { show: false } },
  series: [{
    name: '有白蚁测点',
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    lineStyle: { color: '#ff3b30', width: 2 },
    itemStyle: { color: '#ff3b30' },
    areaStyle: { color: 'rgba(255, 59, 48, 0.15)' },
    data: []
  }]
});

const imageStations = ref<TermiteStationOption[]>([]);
const imageStationId = ref<number | null>(null);
const imageRange = ref<[string, string] | null>(null);
const imageRecords = ref<TermiteImageRecord[]>([]);
const selectedImage = ref<TermiteImageDetail | null>(null);
const imagesLoading = ref(false);
const imagePageNo = ref(1);
const imagePageSize = ref(6);
const imageTotal = ref(0);

const mapEl = ref<HTMLDivElement | null>(null);
let mapInstance: any = null;
let mapOverlays: any[] = [];

declare const BMapGL: any;

const reservoirName = computed(() => {
  const match = reservoirOptions.value.find(r => r.reservoirCode === reservoirCode.value);
  return match?.reservoirName || '未选择水库';
});

function statusPillLabel(status: string) {
  if (status === 'HAS_TERMITE') return '有';
  if (status === 'NO_TERMITE') return '无';
  return '无数据';
}

function statusPillClass(status: string) {
  if (status === 'HAS_TERMITE') return 'pill-red';
  if (status === 'NO_TERMITE') return 'pill-green';
  return 'pill-gray';
}

function clearMapOverlays() {
  if (!mapInstance) return;
  mapOverlays.forEach((overlay) => mapInstance.removeOverlay(overlay));
  mapOverlays = [];
}

function destroyMap() {
  if (!mapInstance) return;
  clearMapOverlays();
  mapInstance = null;
}

function ensureMap() {
  if (mapInstance || !mapEl.value) return;
  mapInstance = new BMapGL.Map(mapEl.value);
  mapInstance.enableScrollWheelZoom(true);
  const center = new BMapGL.Point(113.001, 28.231);
  mapInstance.centerAndZoom(center, 12);
}

function statusLabel(status: string) {
  if (status === 'HAS_TERMITE') return '有白蚁';
  if (status === 'NO_TERMITE') return '无白蚁';
  return '无数据';
}

function renderMapMarkers() {
  if (!overview.value) return;
  ensureMap();
  if (!mapInstance) return;
  clearMapOverlays();
  const markers = overview.value.markers || [];
  if (!markers.length) return;
  const points: any[] = [];
  markers.forEach((marker) => {
    if (marker.lngBd09 === undefined || marker.latBd09 === undefined) return;
    const point = new BMapGL.Point(marker.lngBd09, marker.latBd09);
    points.push(point);
    const overlay = new BMapGL.Marker(point);
    const label = new BMapGL.Label(
      `${marker.stationName}(${statusLabel(marker.displayStatus)})`,
      { offset: new BMapGL.Size(12, -18) }
    );
    label.setStyle({
      color: '#1f2a44',
      background: 'rgba(255,255,255,0.9)',
      border: '1px solid #dfe6f3',
      borderRadius: '4px',
      padding: '2px 6px',
      fontSize: '12px'
    });
    overlay.setLabel(label);
    mapInstance.addOverlay(overlay);
    mapOverlays.push(overlay);
  });
  if (points.length === 1) {
    mapInstance.centerAndZoom(points[0], 14);
  } else if (points.length > 1) {
    const view = mapInstance.getViewport(points);
    mapInstance.centerAndZoom(view.center, view.zoom);
  }
}

async function loadReservoirs() {
  const data = await fetchReservoirOptions();
  reservoirOptions.value = data.reservoirs || [];
  if (!reservoirCode.value && reservoirOptions.value.length) {
    reservoirCode.value = reservoirOptions.value[0].reservoirCode;
  }
}

async function loadOverview() {
  if (!reservoirCode.value) return;
  overviewLoading.value = true;
  try {
    const data = await fetchOverview({
      reservoirCode: reservoirCode.value,
      monitorDate: monitorDate.value
    });
    const priority = (status: string) => {
      if (status === 'HAS_TERMITE') return 0;
      if (status === 'NO_DATA') return 1;
      return 2;
    };
    const rows = [...(data.tableRows || [])].sort((a, b) => {
      const p = priority(a.displayStatus) - priority(b.displayStatus);
      if (p !== 0) return p;
      const at = a.latestReportTime || '';
      const bt = b.latestReportTime || '';
      return bt.localeCompare(at);
    });
    overview.value = { ...data, tableRows: rows };
    await nextTick();
    renderMapMarkers();
  } catch (e: any) {
    ElMessage.error(e.message || '加载实时监测失败');
  } finally {
    overviewLoading.value = false;
  }
}

async function loadTrend() {
  if (!reservoirCode.value) return;
  trendLoading.value = true;
  try {
    const [startDate, endDate] = trendRange.value;
    const data: TermiteTrendResponse = await fetchTrend({
      reservoirCode: reservoirCode.value,
      startDate,
      endDate
    });
    trendOption.value.xAxis.data = data.points.map(p => p.date);
    trendOption.value.series[0].data = data.points.map(p => p.hasTermiteStationCount);
  } catch (e: any) {
    ElMessage.error(e.message || '加载趋势数据失败');
  } finally {
    trendLoading.value = false;
  }
}

async function loadImageStations() {
  if (!reservoirCode.value) return;
  try {
    const data = await fetchStations({ reservoirCode: reservoirCode.value });
    imageStations.value = data.stations || [];
    if (!imageStationId.value && imageStations.value.length) {
      imageStationId.value = imageStations.value[0].stationId;
    }
  } catch (e: any) {
    ElMessage.error(e.message || '加载站点列表失败');
  }
}

async function loadImages() {
  if (!reservoirCode.value || !imageStationId.value) return;
  imagesLoading.value = true;
  try {
    const [startTime, endTime] = imageRange.value || [];
    const data = await fetchImages({
      reservoirCode: reservoirCode.value,
      stationId: imageStationId.value,
      startTime,
      endTime,
      pageNo: imagePageNo.value,
      pageSize: imagePageSize.value,
      selectedImageId: selectedImage.value?.imageId
    });
    imageRecords.value = data.records || [];
    selectedImage.value = data.selectedImage;
    imageTotal.value = data.total || 0;
  } catch (e: any) {
    ElMessage.error(e.message || '加载图片失败');
  } finally {
    imagesLoading.value = false;
  }
}

async function selectImage(item: TermiteImageRecord) {
  if (!reservoirCode.value || !imageStationId.value) return;
  try {
    selectedImage.value = await fetchImageDetail({
      reservoirCode: reservoirCode.value,
      stationId: imageStationId.value,
      imageId: item.imageId
    });
  } catch (e: any) {
    ElMessage.error(e.message || '加载图片详情失败');
  }
}

function handleImagePageChange(page: number) {
  imagePageNo.value = page;
  loadImages();
}

function handleReservoirChange() {
  imagePageNo.value = 1;
  selectedImage.value = null;
  loadOverview();
  loadTrend();
  loadImageStations().then(loadImages);
}

function handleTabChange() {
  if (activeTab.value === 'overview') loadOverview();
  if (activeTab.value === 'trend') loadTrend();
  if (activeTab.value === 'images') {
    loadImageStations().then(loadImages);
  }
}

function switchTab(key: string) {
  const prev = activeTab.value;
  if (prev === 'overview' && key !== 'overview') {
    destroyMap();
  }
  activeTab.value = key;
  handleTabChange();
}

function reloadCurrent() {
  handleTabChange();
}

onMounted(async () => {
  try {
    await loadReservoirs();
    await loadOverview();
    await loadTrend();
    await loadImageStations();
    await loadImages();
  } catch (e: any) {
    ElMessage.error(e.message || '初始化失败');
  }
});
</script>

<style scoped>
.reservoir-shell { min-height: calc(100vh - 120px); }
.main-panel { background: #f3f6fb; border-radius: 12px; padding: 16px 20px; }
.main-panel::before { content: ''; display: block; height: 4px; background: linear-gradient(90deg, #dbe7ff 0%, #f4f7ff 60%, #dbe7ff 100%); border-radius: 4px; margin-bottom: 8px; }
.page-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.header-left { display: flex; flex-direction: column; gap: 4px; }
.page-title { font-size: 18px; font-weight: 700; color: #1f2a44; display: flex; align-items: center; gap: 8px; }
.page-title::before { content: ''; width: 4px; height: 20px; background: #3a8bff; border-radius: 2px; display: inline-block; }
.page-meta { font-size: 11px; color: #9aa8bd; letter-spacing: 1px; }
.header-actions { display: flex; align-items: center; gap: 10px; }
.header-label { font-size: 12px; color: #6a768a; }
.header-pill { background: #223b63; color: #fff; padding: 6px 12px; border-radius: 14px; font-size: 12px; }

.tab-strip { display: inline-flex; gap: 6px; margin: 12px 0 6px; background: #e9eff8; border-radius: 20px; padding: 4px; }
.tab-chip { padding: 6px 14px; border-radius: 16px; color: #333; background: transparent; cursor: pointer; font-size: 13px; }
.tab-chip.active { background: #3a8bff; color: #fff; box-shadow: 0 6px 12px rgba(58,139,255,0.2); }

.tab-content { padding-top: 10px; }
.summary-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 12px 0; }
.summary-left { display: flex; flex-direction: column; gap: 8px; }
.summary-title { font-size: 20px; font-weight: 700; color: #1f2a44; }
.summary-value { font-size: 24px; color: #3a8bff; margin: 0 6px; }
.summary-legend { display: flex; align-items: center; gap: 14px; color: #666; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 13px; }
.legend-item i { width: 12px; height: 12px; border-radius: 2px; display: inline-block; }
.legend-item.red i { background: #ff3b30; }
.legend-item.green i { background: #13a10e; }
.legend-item.gray i { background: #9aa0a6; }
.summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.summary-card { background: #fff; border-radius: 12px; padding: 12px 14px; min-width: 110px; box-shadow: 0 6px 16px rgba(24, 72, 140, 0.08); text-align: center; }
.card-number { font-size: 22px; font-weight: 700; }
.card-number.blue { color: #3a8bff; }
.card-number.red { color: #ff3b30; }
.card-number.green { color: #13a10e; }
.card-number.gray { color: #9aa0a6; }
.card-label { font-size: 12px; color: #8a94a6; margin-top: 2px; }

.info-bar { background: linear-gradient(90deg, #ffecc2 0%, #fff5db 100%); color: #8a5a00; font-size: 12px; padding: 8px 12px; border-radius: 10px; margin-bottom: 10px; }

.overview-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 16px; margin-top: 12px; }
.overview-map { min-height: 620px; background: #fff; border-radius: 14px; padding: 16px; box-shadow: 0 10px 24px rgba(24, 72, 140, 0.08); }
.map-container { width: 100%; height: 520px; border-radius: 12px; overflow: hidden; }

.overview-side { display: flex; flex-direction: column; gap: 12px; background: #fff; border-radius: 14px; padding: 12px; box-shadow: 0 10px 24px rgba(24, 72, 140, 0.08); }

.filter-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.filter-label { font-size: 13px; color: #6a768a; }
.overview-table :deep(.el-table__header) { background: #f6f9ff; }
.table-header { display: flex; align-items: center; justify-content: space-between; padding: 6px 4px 12px; }
.table-title { font-weight: 600; color: #1f2a44; }
.table-count { font-size: 12px; color: #9aa0a6; }

.status-pill { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; height: 20px; padding: 0 6px; border-radius: 10px; font-size: 12px; color: #fff; white-space: nowrap; }
.pill-red { background: #ff3b30; }
.pill-green { background: #13a10e; }
.pill-gray { background: #9aa0a6; }
.status-text { font-size: 12px; }
.status-text.warn { color: #ff3b30; }
.status-text.ok { color: #13a10e; }
.status-text.muted { color: #9aa0a6; }

.trend-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 0 14px; }
.trend-meta { display: flex; flex-direction: column; gap: 4px; }
.meta-label { font-size: 12px; color: #8a94a6; }
.meta-value { font-size: 14px; font-weight: 600; color: #1f2a44; }
.trend-filters { display: flex; align-items: center; gap: 10px; }
.trend-card { background: #fff; border-radius: 14px; padding: 10px; min-height: 520px; box-shadow: 0 10px 24px rgba(24, 72, 140, 0.08); }
.trend-chart { height: 500px; }

.photo-toolbar { display: flex; align-items: center; gap: 10px; padding: 6px 0 12px; }
.toolbar-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.meta-chip { background: #fff; border-radius: 12px; padding: 8px 12px; box-shadow: 0 6px 16px rgba(24, 72, 140, 0.08); }
.photo-grid { display: grid; grid-template-columns: 240px 1fr; gap: 12px; }
.photo-list { background: #fff; border-radius: 14px; padding: 10px; display: flex; flex-direction: column; gap: 10px; min-height: 600px; box-shadow: 0 10px 24px rgba(24, 72, 140, 0.08); }
.photo-thumb { border: 1px solid transparent; border-radius: 6px; padding: 6px; cursor: pointer; }
.photo-thumb.active { border-color: #3a8bff; background: #f1f7ff; }
.thumb-image { width: 100%; height: 120px; border-radius: 4px; }
.thumb-time { font-size: 12px; color: #666; margin-top: 4px; }
.photo-detail { background: #fff; border-radius: 14px; padding: 10px; min-height: 600px; box-shadow: 0 10px 24px rgba(24, 72, 140, 0.08); }
.detail-body { display: flex; flex-direction: column; gap: 12px; }
.detail-image { width: 100%; height: 460px; background: #f5f7fa; }
.detail-meta { font-size: 13px; color: #666; display: flex; flex-direction: column; gap: 4px; }
.detail-line { padding-left: 4px; }
.pager { margin-top: auto; display: flex; justify-content: center; }
.empty { color: #9aa0a6; text-align: center; padding: 30px 0; }
</style>
