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
                <el-table :data="stationAlerts" size="small" height="240" border>
                  <el-table-column label="预警信息">
                    <template #default="{ row }">
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
                    </template>
                  </el-table-column>
                </el-table>
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
              <li>0</li>
            </ul>
          </div>
          <div class="no-bd">
            <ul>
              <li>白蚁测站总数</li>
              <li>电子界桩总数</li>
            </ul>
          </div>
        </div>
        <div class="map">
          <!-- 地图区域留空，仅保留背景装饰 -->
          <div class="map1"></div>
          <div class="map2"></div>
          <div class="map3"></div>
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
                  <el-statistic title="测试" :value="0">
                    <template #suffix>
                      <el-icon color="#909399"><Odometer /></el-icon>
                    </template>
                  </el-statistic>
                </el-card>
              </el-col>
              <el-col :span="12">
                <el-card shadow="hover" class="stat-card">
                  <el-statistic title="测试" :value="0">
                    <template #suffix>
                      <el-icon color="#909399"><Warning /></el-icon>
                    </template>
                  </el-statistic>
                </el-card>
              </el-col>
              <el-col :span="12" style="margin-top:12px">
                <el-card shadow="hover" class="stat-card">
                  <el-statistic title="测试" :value="0">
                    <template #suffix>
                      <el-icon color="#909399"><CircleCheck /></el-icon>
                    </template>
                  </el-statistic>
                </el-card>
              </el-col>
              <el-col :span="12" style="margin-top:12px">
                <el-card shadow="hover" class="stat-card">
                  <el-statistic title="测试" :value="0">
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
            <h2>测试</h2>
            <div class="chart">
              <v-chart :option="pilePieOptions" autoresize />
            </div>
            <div class="panel-footer"></div>
          </div>

          <!-- 电子界桩预警 -->
          <div class="panel table-panel">
            <h2>电子界桩预警</h2>
            <div class="chart">
              <el-empty description="暂无界桩预警数据" />
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
import { listTermiteStations } from '@/services/termiteStations';
import { listElectronicBoundaries } from '@/services/electronicBoundaries';
import { updateAlertStatus } from '@/services/alerts';
import { use } from 'echarts/core';
import VChart from 'vue-echarts';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent } from 'echarts/components';
import { ElMessage, ElMessageBox } from 'element-plus';

use([CanvasRenderer, PieChart, LegendComponent, TooltipComponent]);

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
    const page = await listTermiteStations({ pageNo: 1, pageSize: 100 });
    const stations = page.records;
    
    stats.stationTotal = page.total;
    // 概览统计统一与列表的“白蚁状态”对齐
    stats.stationWithTermites = stations.filter(s => s.termiteStatus === 1).length;
    stats.stationNoTermites = stations.filter(s => s.termiteStatus === 0).length;
    stats.stationNoData = stations.filter(s => s.termiteStatus === undefined).length;
    
    // 预警列表保持为空或后续单独接口加载（避免阻塞统计）
    stationAlerts.value = [];
    
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
  padding: 8px 8px 0;
  box-sizing: border-box;
  min-height: 100vh;
  overflow: hidden;
  background: url('/images/bg.jpg') no-repeat #000;
  background-size: cover;
  line-height: 1.15;
  color: #e8f5ff;
}

/* 复刻 original/echart header，但用 px 调整在 PC 下更合适 */
.screen-header {
  position: relative;
  height: 72px;
  background: url('/images/head_bg.png') no-repeat top center;
  background-size: 100% 100%;
}

.screen-header h1 {
  font-size: 24px;
  color: #fff;
  text-align: center;
  line-height: 60px;
}

.showTime {
  position: absolute;
  top: 0;
  right: 24px;
  line-height: 60px;
  font-size: 13px;
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
  width: 100%;
  max-width: 1920px;
  margin: 12px auto;
  display: flex;
  gap: 12px;
  padding: 0 12px;
}

.mainbox .column {
  flex: 1;
  min-width: 0;
}

.mainbox .column:nth-child(2) {
  flex: 1.2;
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
  font-size: 14px;
  font-weight: 400;
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
  box-shadow: 0 0 12px rgba(0, 255, 255, 0.12) inset;
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
  height: 64px;
  line-height: 64px;
  font-size: 34px;
  color: #ffeb7b;
  padding: 4px 0;
  font-family: electronicFont, Arial, sans-serif;
  font-weight: bold;
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
  height: 26px;
  line-height: 26px;
  text-align: center;
  font-size: 13px;
  color: rgba(245, 250, 255, 0.9);
  padding-top: 4px;
}

.map {
  position: relative;
  height: 340px;
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
}
.alert-line1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.alert-name {
  font-weight: 600;
  color: #fefefe;
}
.alert-line2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: rgba(200, 220, 255, 0.7);
}
.alert-line3 {
  font-size: 12px;
  color: rgba(200, 220, 255, 0.7);
}
.alert-desc {
  word-break: break-word;
  white-space: normal;
}
.alert-actions {
  display: flex;
  justify-content: flex-end;
}

:deep(.el-card) {
  background-color: transparent;
}

:deep(.el-card__header) {
  border-bottom-color: rgba(25, 186, 139, 0.35);
}

:deep(.el-statistic__head),
:deep(.el-statistic__title),
:deep(.el-statistic__content),
:deep(.el-statistic__number) {
  color: #ffffff !important;
}

:deep(.el-table) {
  background-color: transparent;
  color: #e8f5ff;
}

:deep(.el-table tr) {
  background-color: transparent;
}

:deep(.el-table th),
:deep(.el-table td) {
  background-color: rgba(9, 32, 63, 0.95);
  border-color: rgba(25, 186, 139, 0.25);
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
</style>
