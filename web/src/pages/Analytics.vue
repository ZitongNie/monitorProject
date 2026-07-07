<!--
  统计分析页面
  功能：通过 ECharts 展示白蚁监测站和电子界桩的曲线、柱状、饼状统计。
-->
<template>
  <el-card class="analytics-filter-card">
    <div class="analytics-head">
      <div>
        <h2>统计分析</h2>
        <p>{{ chartModeSummary }}</p>
      </div>
      <el-tabs
        v-model="activeDeviceType"
        class="device-tabs"
        @tab-change="handleDeviceTypeChange"
      >
        <el-tab-pane label="白蚁监测站" name="termite" />
        <el-tab-pane label="电子界桩" name="boundary" />
      </el-tabs>
    </div>
  </el-card>

  <el-row :gutter="12">
    <el-col :span="12">
      <el-card v-loading="loading">
        <template #header>{{ lineHeader }}</template>
        <v-chart class="chart" :option="lineOption" autoresize />
      </el-card>
    </el-col>
    <el-col :span="12">
      <el-card v-loading="loading">
        <template #header>{{ barHeader }}</template>
        <v-chart class="chart" :option="barOption" autoresize @click="handleBarClick" />
      </el-card>
    </el-col>
    <el-col :span="12" style="margin-top:12px;">
      <el-card v-loading="loading">
        <template #header>{{ pieHeader }}</template>
        <v-chart class="chart" :option="pieOption" autoresize />
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  fetchTermiteAlertCurve,
  fetchTermiteAlertBar,
  fetchTermiteAlertPie,
  type TermiteAlertCurveResponse,
  type TermiteAlertBarResponse,
  type TermiteAlertPieResponse
} from '../services/termiteMonitor';
import {
  fetchBoundaryAlertCurve,
  fetchBoundaryAlertBar,
  fetchBoundaryAlertPie,
  type BoundaryAlertCurveResponse,
  type BoundaryAlertBarResponse,
  type BoundaryAlertPieResponse
} from '../services/electronicBoundaries';
import { use } from 'echarts/core';
import VChart from 'vue-echarts';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
import dayjs from 'dayjs';

use([CanvasRenderer, BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent]);

type DeviceType = 'termite' | 'boundary';

interface AlertCurvePointLike {
  bucketTime: string;
  totalCount: number;
  safeCount: number;
  alertCount: number;
}

interface AlertBarItemLike {
  name: string;
  totalCount: number;
  safeCount: number;
  alertCount: number;
}

interface BarTarget {
  id: number;
  name: string;
}

const router = useRouter();
const loading = ref(false);
const activeDeviceType = ref<DeviceType>('termite');
const barTargets = ref<BarTarget[]>([]);
const currentBarItems = ref<AlertBarItemLike[]>([]);

const deviceLabel = computed(() => activeDeviceType.value === 'termite' ? '白蚁监测站' : '电子界桩');
const chartModeSummary = computed(() => activeDeviceType.value === 'termite'
  ? '查看白蚁监测站的近 7 日状态变化、Top10 预警次数和站点预警分布。'
  : '查看电子界桩的近 7 日状态变化、Top10 预警次数和界桩预警分布。');
const lineHeader = computed(() => activeDeviceType.value === 'termite'
  ? '单站点安全/预警状态变化曲线'
  : '单界桩安全/预警状态变化曲线');
const barHeader = computed(() => activeDeviceType.value === 'termite'
  ? '多站点累计安全/预警次数统计（点击柱体可跳转详情）'
  : '多界桩累计安全/预警次数统计（点击柱体可跳转详情）');
const pieHeader = computed(() => activeDeviceType.value === 'termite'
  ? '按是否预警分类的站点数量分布'
  : '按是否预警分类的界桩数量分布');

const lineOption = ref<any>({
  title: {
    text: '近7日趋势',
    subtext: '总次数 0 次 | 预警 0 次',
    left: 'center',
    top: 4,
    textStyle: { fontSize: 13, fontWeight: 600 },
    subtextStyle: { fontSize: 12, color: '#666' }
  },
  tooltip: { trigger: 'axis' },
  legend: { data: ['总次数', '安全次数', '预警次数'], top: 42 },
  grid: { left: '3%', right: '4%', bottom: '3%', top: 78, containLabel: true },
  xAxis: {
    type: 'category',
    data: [],
    axisTick: { show: false }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { type: 'dashed', color: '#eee' } }
  },
  series: [
    { name: '总次数', type: 'line', label: { show: true, position: 'top', formatter: '{c}次', fontSize: 10 }, data: [] },
    { name: '安全次数', type: 'line', label: { show: true, position: 'top', formatter: '{c}次', fontSize: 10 }, data: [] },
    { name: '预警次数', type: 'line', label: { show: true, position: 'top', formatter: '{c}次', fontSize: 10 }, data: [] }
  ]
});

const barOption = ref<any>({
  title: {
    text: 'Top10 白蚁监测站统计',
    subtext: '点击柱体可跳转对应测站详情',
    left: 'center',
    top: 4,
    textStyle: { fontSize: 13, fontWeight: 600 },
    subtextStyle: { fontSize: 12, color: '#666' }
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: (params: any[]) => {
      const idx = params?.[0]?.dataIndex;
      const item = currentBarItems.value[idx];
      if (!item) return '';
      return [
        item.name,
        `总次数：${item.totalCount} 次`,
        `安全次数：${item.safeCount} 次`,
        `预警次数：${item.alertCount} 次`
      ].join('<br/>');
    }
  },
  color: ['#fac858', '#91cc75', '#5470c6'],
  legend: { data: ['预警次数', '安全次数'], top: 42 },
  grid: { left: '4%', right: '4%', bottom: '10%', top: 78, containLabel: true },
  xAxis: {
    type: 'category',
    data: [],
    axisTick: { show: false },
    axisLabel: {
      interval: 0,
      rotate: 18,
      width: 90,
      overflow: 'truncate'
    }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { type: 'dashed', color: '#eee' } }
  },
  series: [
    { name: '预警次数', type: 'bar', stack: 'monitor', barMaxWidth: 32, label: { show: true, position: 'insideTop', formatter: (p: any) => p.value > 0 ? `${p.value}` : '', fontSize: 10 }, data: [] },
    { name: '安全次数', type: 'bar', stack: 'monitor', barMaxWidth: 32, label: { show: true, position: 'top', formatter: (p: any) => `${currentBarItems.value[p.dataIndex]?.totalCount || p.value}次`, fontSize: 10 }, itemStyle: { borderRadius: [4, 4, 0, 0] }, data: [] }
  ]
});

const pieOption = ref<any>({
  title: {
    text: '预警分布',
    subtext: '总站点 0 个',
    left: 'center',
    top: '36%',
    textStyle: { fontSize: 14, fontWeight: 600 },
    subtextStyle: { fontSize: 12, color: '#666' }
  },
  tooltip: { trigger: 'item' },
  legend: { bottom: 0 },
  series: [
    {
      type: 'pie',
      radius: ['40%', '70%'],
      label: {
        show: true,
        formatter: '{b}\n{c}个 ({d}%)',
        fontSize: 11
      },
      itemStyle: {
        borderRadius: 8,
        borderColor: '#fff',
        borderWidth: 2
      },
      data: []
    }
  ]
});

function getRange(defaultDays = 30) {
  const end = dayjs();
  const start = end.subtract(defaultDays, 'day');
  return {
    startTime: start.format('YYYY-MM-DDTHH:mm:ss'),
    endTime: end.format('YYYY-MM-DDTHH:mm:ss')
  };
}

function clearLineOption(message: string) {
  lineOption.value.title.subtext = message;
  lineOption.value.xAxis.data = [];
  lineOption.value.series[0].data = [];
  lineOption.value.series[1].data = [];
  lineOption.value.series[2].data = [];
}

function formatChartName(name: string) {
  const normalized = name.replace(/^PERF-BOUNDARY\s*/i, '界桩 ');
  if (normalized.length <= 14) return normalized;
  return `${normalized.slice(0, 8)}...${normalized.slice(-4)}`;
}

function applyCurveOption(points: AlertCurvePointLike[], subjectName?: string) {
  const x = points.map((point) => dayjs(point.bucketTime).format('MM-DD'));
  const totalSum = points.reduce((sum, point) => sum + point.totalCount, 0);
  const alertSum = points.reduce((sum, point) => sum + point.alertCount, 0);
  lineOption.value.title.text = subjectName ? `${subjectName}近7日趋势` : '近7日趋势';
  lineOption.value.title.subtext = `总次数 ${totalSum} 次 | 预警 ${alertSum} 次`;
  lineOption.value.xAxis.data = x;
  lineOption.value.series[0].data = points.map((point) => point.totalCount);
  lineOption.value.series[1].data = points.map((point) => point.safeCount);
  lineOption.value.series[2].data = points.map((point) => point.alertCount);
}

function applyBarOption(items: AlertBarItemLike[], targets: BarTarget[], emptyText: string) {
  barTargets.value = targets;
  currentBarItems.value = items;
  const names = items.map((item) => formatChartName(item.name));
  const topItem = items[0];
  barOption.value.title.text = `Top10 ${deviceLabel.value}统计`;
  barOption.value.title.subtext = topItem
    ? `预警最高：${topItem.name}（${topItem.alertCount}次）`
    : emptyText;
  barOption.value.xAxis.data = names;
  barOption.value.series[0].data = items.map((item) => item.alertCount);
  barOption.value.series[1].data = items.map((item) => item.safeCount);
  currentBarItems.value = items;
  barTargets.value = targets;
}

function applyPieOption(alertedLabel: string, safeLabel: string, alertedCount: number, safeCount: number, totalLabel: string) {
  pieOption.value.series[0].data = [
    { name: alertedLabel, value: alertedCount },
    { name: safeLabel, value: safeCount }
  ];
  pieOption.value.title.subtext = totalLabel;
}

async function loadTermiteAlertCurve(target: BarTarget | null) {
  if (!target) {
    lineOption.value.title.text = '近7日趋势';
    clearLineOption('暂无白蚁监测站数据');
    return;
  }
  const { startTime, endTime } = getRange(7);
  const data: TermiteAlertCurveResponse = await fetchTermiteAlertCurve({
    stationId: target.id,
    startTime,
    endTime,
    bucket: 'day',
    onlyAlert: 0
  });
  applyCurveOption(data.points, target.name);
}

async function loadBoundaryAlertCurve(target: BarTarget | null) {
  if (!target) {
    lineOption.value.title.text = '近7日趋势';
    clearLineOption('暂无电子界桩数据');
    return;
  }
  const { startTime, endTime } = getRange(7);
  const data: BoundaryAlertCurveResponse = await fetchBoundaryAlertCurve({
    boundaryId: target.id,
    startTime,
    endTime,
    bucket: 'day',
    onlyAlert: 0
  });
  applyCurveOption(data.points, target.name);
}

async function loadTermiteAlertBar(): Promise<BarTarget | null> {
  const { startTime, endTime } = getRange(30);
  const data: TermiteAlertBarResponse = await fetchTermiteAlertBar({
    startTime,
    endTime,
    limit: 10
  });
  const targets = data.items.map((item) => ({ id: item.stationId, name: item.name }));
  applyBarOption(
    data.items,
    targets,
    '暂无白蚁监测站统计数据'
  );
  return targets[0] || null;
}

async function loadBoundaryAlertBar(): Promise<BarTarget | null> {
  const { startTime, endTime } = getRange(30);
  const data: BoundaryAlertBarResponse = await fetchBoundaryAlertBar({
    startTime,
    endTime,
    limit: 10
  });
  const targets = data.items.map((item) => ({ id: item.boundaryId, name: item.name }));
  applyBarOption(
    data.items,
    targets,
    '暂无电子界桩统计数据'
  );
  return targets[0] || null;
}

async function loadTermiteAlertPie() {
  const { startTime, endTime } = getRange(30);
  const data: TermiteAlertPieResponse = await fetchTermiteAlertPie({
    startTime,
    endTime
  });
  applyPieOption(
    '有发生预警的站点',
    '未发生预警的站点',
    data.alertedCount,
    data.safeCount,
    `总站点 ${data.totalStations} 个`
  );
}

async function loadBoundaryAlertPie() {
  const { startTime, endTime } = getRange(30);
  const data: BoundaryAlertPieResponse = await fetchBoundaryAlertPie({
    startTime,
    endTime
  });
  applyPieOption(
    '有发生预警的界桩',
    '未发生预警的界桩',
    data.alertedCount,
    data.safeCount,
    `总界桩 ${data.totalBoundaries} 个`
  );
}

async function loadAll() {
  loading.value = true;
  try {
    if (activeDeviceType.value === 'termite') {
      const [curveTarget] = await Promise.all([loadTermiteAlertBar(), loadTermiteAlertPie()]);
      await loadTermiteAlertCurve(curveTarget);
    } else {
      const [curveTarget] = await Promise.all([loadBoundaryAlertBar(), loadBoundaryAlertPie()]);
      await loadBoundaryAlertCurve(curveTarget);
    }
  } catch (e: any) {
    ElMessage.error(e.message || '加载分析数据失败');
  } finally {
    loading.value = false;
  }
}

function handleDeviceTypeChange() {
  barTargets.value = [];
  currentBarItems.value = [];
  void loadAll();
}

function handleBarClick(params: any) {
  const idx = params?.dataIndex;
  if (typeof idx !== 'number') return;
  const target = barTargets.value[idx];
  if (!target) return;
  if (activeDeviceType.value === 'termite') {
    router.push({ path: '/station-detail', query: { id: target.id } });
  } else {
    router.push({ path: '/boundary-detail', query: { id: target.id } });
  }
}

onMounted(() => {
  void loadAll();
});
</script>

<style scoped>
.analytics-filter-card {
  margin-bottom: 12px;
}

.analytics-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.analytics-head h2 {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 700;
  color: #1f2d3d;
}

.analytics-head p {
  margin: 0;
  color: #667085;
  font-size: 13px;
}

.device-tabs {
  min-width: 260px;
}

.device-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.chart {
  height: 320px;
}

@media (max-width: 900px) {
  .analytics-head {
    align-items: stretch;
    flex-direction: column;
  }

  .device-tabs {
    min-width: 0;
  }
}
</style>
