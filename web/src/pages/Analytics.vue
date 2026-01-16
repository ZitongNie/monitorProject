<!--
  统计分析页面
  功能：通过ECharts图表展示数据统计(折线图、柱状图、饼图)
  示例：单点状态变化曲线、多点累计次数、按预警状态分类统计
-->
<template>
  <el-row :gutter="12">
    <!-- 折线图：单站点安全/预警状态变化曲线 -->
    <el-col :span="12">
      <el-card>
        <template #header>单站点安全/预警状态变化曲线</template>
        <v-chart class="chart" :option="lineOption" autoresize />
      </el-card>
    </el-col>
    <!-- 柱状图：多站点累计安全/预警次数统计 -->
    <el-col :span="12">
      <el-card>
        <template #header>多站点累计安全/预警次数统计</template>
        <v-chart class="chart" :option="barOption" autoresize />
      </el-card>
    </el-col>
    <!-- 饼图：按是否预警分类的站点数量分布 -->
    <el-col :span="12" style="margin-top:12px;">
      <el-card>
        <template #header>按是否预警分类的站点数量分布</template>
        <v-chart class="chart" :option="pieOption" autoresize />
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { fetchTermiteAlertCurve, fetchTermiteAlertBar, fetchTermiteAlertPie, type TermiteAlertCurveResponse, type TermiteAlertBarResponse, type TermiteAlertPieResponse } from '../services/termiteMonitor';
import { listTermiteStations } from '../services/termiteStations';
// ECharts相关导入
import { use } from 'echarts/core';
import VChart from 'vue-echarts';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';

// 注册ECharts组件
use([CanvasRenderer, BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent]);

const lineOption = ref<any>({
  title: { text: '单站点安全/预警状态变化曲线' },
  tooltip: { trigger: 'axis' },
  legend: { data: ['总次数', '安全次数', '预警次数'] },
  xAxis: { type: 'category', data: [] },
  yAxis: { type: 'value' },
  series: [
    { name: '总次数', type: 'line', data: [] },
    { name: '安全次数', type: 'line', data: [] },
    { name: '预警次数', type: 'line', data: [] }
  ]
});

const barOption = ref<any>({
  title: { text: '多站点累计安全/预警次数统计' },
  tooltip: { trigger: 'axis' },
  legend: { data: ['预警次数', '安全次数', '总次数'] },
  xAxis: { type: 'category', data: [] },
  yAxis: { type: 'value' },
  series: [
    { name: '预警次数', type: 'bar', stack: 'total', data: [] },
    { name: '安全次数', type: 'bar', stack: 'total', data: [] },
    { name: '总次数', type: 'bar', data: [] }
  ]
});

const pieOption = ref<any>({
  title: { text: '按是否预警分类的站点数量分布' },
  tooltip: { trigger: 'item' },
  legend: { bottom: 0 },
  series: [
    {
      type: 'pie',
      radius: '60%',
      data: []
    }
  ]
});

async function loadAlertCurve() {
  try {
    // 默认选取第一个测站作为示例
    const page = await listTermiteStations({ pageNo: 1, pageSize: 1 });
    const first = page.records[0];
    if (!first) return;
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 3600_000);
    const fmt = (d: Date) => d.toISOString().split('.')[0];
    const data: TermiteAlertCurveResponse = await fetchTermiteAlertCurve({
      stationId: first.id,
      startTime: fmt(start),
      endTime: fmt(end),
      bucket: 'day',
      onlyAlert: 0
    });
    const x = data.points.map(p => p.bucketTime.replace('T', ' '));
    lineOption.value.xAxis.data = x;
    lineOption.value.series[0].data = data.points.map(p => p.totalCount);
    lineOption.value.series[1].data = data.points.map(p => p.safeCount);
    lineOption.value.series[2].data = data.points.map(p => p.alertCount);
  } catch (e: any) {
    ElMessage.error(e.message || '加载单站点曲线失败');
  }
}

async function loadAlertBar() {
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 3600_000);
    const fmt = (d: Date) => d.toISOString().split('.')[0];
    const data: TermiteAlertBarResponse = await fetchTermiteAlertBar({
      startTime: fmt(start),
      endTime: fmt(end),
      sortBy: 'alertCount',
      order: 'desc',
      topN: 10
    });
    const names = data.items.map(i => i.name);
    barOption.value.xAxis.data = names;
    barOption.value.series[0].data = data.items.map(i => i.alertCount);
    barOption.value.series[1].data = data.items.map(i => i.safeCount);
    barOption.value.series[2].data = data.items.map(i => i.totalCount);
  } catch (e: any) {
    ElMessage.error(e.message || '加载多站点统计失败');
  }
}

async function loadAlertPie() {
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 3600_000);
    const fmt = (d: Date) => d.toISOString().split('.')[0];
    const data: TermiteAlertPieResponse = await fetchTermiteAlertPie({
      startTime: fmt(start),
      endTime: fmt(end)
    });
    pieOption.value.series[0].data = [
      { name: '有发生预警的站点', value: data.alertedCount },
      { name: '未发生预警的站点', value: data.safeCount }
    ];
  } catch (e: any) {
    ElMessage.error(e.message || '加载预警分布失败');
  }
}

onMounted(async () => {
  await Promise.all([
    loadAlertCurve(),
    loadAlertBar(),
    loadAlertPie()
  ]);
});
</script>

<style scoped>
.chart { height: 320px; }
</style>
