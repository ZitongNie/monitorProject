<!--
  统计分析页面
  功能：通过ECharts图表展示数据统计(折线图、柱状图、饼图)
  示例：单点状态变化曲线、多点累计次数、按预警状态分类统计
-->
<template>
  <el-row :gutter="12">
    <!-- 折线图：单点状态变化曲线 -->
    <el-col :span="12">
      <el-card>
        <template #header>单点状态变化曲线（示例）</template>
        <v-chart class="chart" :option="lineOption" autoresize />
      </el-card>
    </el-col>
    <!-- 柱状图：多点累计次数 -->
    <el-col :span="12">
      <el-card>
        <template #header>多点累计次数柱状图（示例）</template>
        <v-chart class="chart" :option="barOption" autoresize />
      </el-card>
    </el-col>
    <!-- 饼图：按预警状态分类统计 -->
    <el-col :span="12" style="margin-top:12px;">
      <el-card>
        <template #header>按是否预警分类数量饼图（示例）</template>
        <v-chart class="chart" :option="pieOption" autoresize />
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getCounts } from '../services/analytics';
// ECharts相关导入
import { use } from 'echarts/core';
import VChart from 'vue-echarts';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';

// 注册ECharts组件
use([CanvasRenderer, BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent]);

const lineOption = ref<any>({ title: { text: '状态变化' }, xAxis: { type: 'category', data: [] }, yAxis: { type: 'value' }, series: [{ type: 'line', data: [] }] });
const barOption = ref<any>({ title: { text: '累计次数' }, tooltip: {}, legend: { data: ['warn','safe'] }, xAxis: { type: 'category', data: [] }, yAxis: {}, series: [{ name:'warn', type:'bar', data:[] }, { name:'safe', type:'bar', data:[] }] });
const pieOption = ref<any>({ title: { text: '数量分布' }, tooltip: {}, series: [{ type:'pie', radius:'60%', data: [] }] });

onMounted(async () => {
  const counts = await getCounts();
  const names = counts.stationWarnCounts.map(i => i.name);
  barOption.value.xAxis.data = names;
  barOption.value.series[0].data = counts.stationWarnCounts.map(i => i.warn);
  barOption.value.series[1].data = counts.stationWarnCounts.map(i => i.safe);
  const totalWarn = counts.stationWarnCounts.reduce((a,b)=>a+b.warn,0) + counts.pileWarnCounts.reduce((a,b)=>a+b.warn,0);
  const totalSafe = counts.stationWarnCounts.reduce((a,b)=>a+b.safe,0) + counts.pileWarnCounts.reduce((a,b)=>a+b.safe,0);
  pieOption.value.series[0].data = [ { name:'预警', value: totalWarn }, { name:'安全', value: totalSafe } ];
  lineOption.value.xAxis.data = Array.from({length: 10}).map((_,i)=>`T${i}`);
  lineOption.value.series[0].data = Array.from({length: 10}).map(()=> Math.random() > 0.7 ? 1 : 0);
});
</script>

<style scoped>
.chart { height: 320px; }
</style>
