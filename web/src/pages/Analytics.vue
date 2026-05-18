<!--
  统计分析页面
  功能：通过ECharts图表展示数据统计(折线图、柱状图、饼图)
  示例：单点状态变化曲线、多点累计次数、按预警状态分类统计
-->
<template>
  <el-row :gutter="12">
    <el-col :span="12">
      <el-card v-loading="loading">
        <template #header>单站点安全/预警状态变化曲线</template>
        <v-chart class="chart" :option="lineOption" autoresize />
      </el-card>
    </el-col>
    <el-col :span="12">
      <el-card v-loading="loading">
        <template #header>多站点累计安全/预警次数统计（点击柱体可跳转详情）</template>
        <v-chart class="chart" :option="barOption" autoresize @click="handleBarClick" />
      </el-card>
    </el-col>
    <el-col :span="12" style="margin-top:12px;">
      <el-card v-loading="loading">
        <template #header>按是否预警分类的站点数量分布</template>
        <v-chart class="chart" :option="pieOption" autoresize />
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { fetchTermiteAlertCurve, fetchTermiteAlertBar, fetchTermiteAlertPie, type TermiteAlertCurveResponse, type TermiteAlertBarResponse, type TermiteAlertPieResponse, type TermiteAlertBarItem } from '../services/termiteMonitor';
import { listTermiteStations } from '../services/termiteStations';
// ECharts相关导入
import { use } from 'echarts/core';
import VChart from 'vue-echarts';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
import dayjs from 'dayjs';

// 注册ECharts组件
use([CanvasRenderer, BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent]);

const router = useRouter();
const loading = ref(false);
const barItems = ref<TermiteAlertBarItem[]>([]);

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
    text: 'Top10 站点统计',
    subtext: '点击柱体可跳转对应测站详情',
    left: 'center',
    top: 4,
    textStyle: { fontSize: 13, fontWeight: 600 },
    subtextStyle: { fontSize: 12, color: '#666' }
  },
  tooltip: { trigger: 'axis' },
  color: ['#fac858', '#91cc75', '#5470c6'],
  legend: { data: ['预警次数', '安全次数', '总次数'], top: 42 },
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
    { name: '预警次数', type: 'bar', stack: 'total', barMaxWidth: 30, label: { show: true, position: 'top', formatter: '{c}次', fontSize: 10 }, data: [] },
    { name: '安全次数', type: 'bar', stack: 'total', barMaxWidth: 30, label: { show: true, position: 'insideTop', formatter: '{c}', fontSize: 10 }, itemStyle: { borderRadius: [4, 4, 0, 0] }, data: [] },
    { name: '总次数', type: 'bar', barMaxWidth: 30, label: { show: true, position: 'top', formatter: '{c}次', fontSize: 10 }, itemStyle: { borderRadius: [4, 4, 0, 0] }, data: [] }
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

async function loadAlertCurve() {
  const page = await listTermiteStations({ pageNo: 1, pageSize: 1 });
  const first = page.records[0];
  if (!first) {
    lineOption.value.xAxis.data = [];
    lineOption.value.series[0].data = [];
    lineOption.value.series[1].data = [];
    lineOption.value.series[2].data = [];
    return;
  }
  const { startTime, endTime } = getRange(7);
  const data: TermiteAlertCurveResponse = await fetchTermiteAlertCurve({
    stationId: first.id,
    startTime,
    endTime,
    bucket: 'day',
    onlyAlert: 0
  });
  const x = data.points.map(p => dayjs(p.bucketTime).format('MM-DD'));
  const totalSum = data.points.reduce((sum, p) => sum + p.totalCount, 0);
  const alertSum = data.points.reduce((sum, p) => sum + p.alertCount, 0);
  lineOption.value.title.subtext = `总次数 ${totalSum} 次 | 预警 ${alertSum} 次`;
  lineOption.value.xAxis.data = x;
  lineOption.value.series[0].data = data.points.map(p => p.totalCount);
  lineOption.value.series[1].data = data.points.map(p => p.safeCount);
  lineOption.value.series[2].data = data.points.map(p => p.alertCount);
}

async function loadAlertBar() {
  const { startTime, endTime } = getRange(30);
  const data: TermiteAlertBarResponse = await fetchTermiteAlertBar({
    startTime,
    endTime,
    sortBy: 'alertCount',
    order: 'desc',
    topN: 10
  });
  barItems.value = data.items;
  const names = data.items.map(i => i.name);
  const topStation = data.items[0];
  barOption.value.title.subtext = topStation
    ? `预警最高：${topStation.name}（${topStation.alertCount}次）`
    : '暂无统计数据';
  barOption.value.xAxis.data = names;
  barOption.value.series[0].data = data.items.map(i => i.alertCount);
  barOption.value.series[1].data = data.items.map(i => i.safeCount);
  barOption.value.series[2].data = data.items.map(i => i.totalCount);
}

async function loadAlertPie() {
  const { startTime, endTime } = getRange(30);
  const data: TermiteAlertPieResponse = await fetchTermiteAlertPie({
    startTime,
    endTime
  });
  pieOption.value.series[0].data = [
    { name: '有发生预警的站点', value: data.alertedCount },
    { name: '未发生预警的站点', value: data.safeCount }
  ];
  pieOption.value.title.subtext = `总站点 ${data.totalStations} 个`;
}

async function loadAll() {
  loading.value = true;
  try {
    await Promise.all([loadAlertCurve(), loadAlertBar(), loadAlertPie()]);
  } catch (e: any) {
    ElMessage.error(e.message || '加载分析数据失败');
  } finally {
    loading.value = false;
  }
}

function handleBarClick(params: any) {
  const idx = params?.dataIndex;
  if (typeof idx !== 'number') return;
  const item = barItems.value[idx];
  if (!item) return;
  router.push({ path: '/station-detail', query: { id: item.stationId } });
}

onMounted(async () => {
  try {
    await loadAll();
  } catch (e: any) {
    ElMessage.error(e.message || '初始化分析页面失败');
  }
});
</script>

<style scoped>
.chart { height: 320px; }
</style>
