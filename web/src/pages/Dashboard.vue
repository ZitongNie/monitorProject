<!--
  仪表盘页面
  功能：展示系统总体概览(测站/界桩数量与预警统计)和快速入口导航
-->
<template>
  <div v-loading="loading" class="dashboard-root">
    <el-row :gutter="12">
      <!-- 左侧：白蚁测站概览 -->
      <el-col :span="6">
        <el-card ref="leftOverviewCard" shadow="never" body-style="padding:12px 12px 8px 12px">
          <template #header>
            <span style="font-weight:600;color:#303133;">白蚁测站总览</span>
          </template>

          <!-- 统计卡片 -->
          <el-row :gutter="12" style="margin-bottom:12px">
            <el-col :span="12">
              <el-card shadow="hover">
                <el-statistic title="测站总数" :value="stats.stationTotal">
                  <template #suffix>
                    <el-icon color="#409eff"><Odometer /></el-icon>
                  </template>
                </el-statistic>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card shadow="hover">
                <el-statistic title="有白蚁" :value="stats.stationWithTermites">
                  <template #suffix>
                    <el-icon color="#f56c6c"><Warning /></el-icon>
                  </template>
                </el-statistic>
              </el-card>
            </el-col>
            <el-col :span="12" style="margin-top:12px">
              <el-card shadow="hover">
                <el-statistic title="无白蚁" :value="stats.stationNoTermites">
                  <template #suffix>
                    <el-icon color="#67c23a"><CircleCheck /></el-icon>
                  </template>
                </el-statistic>
              </el-card>
            </el-col>
            <el-col :span="12" style="margin-top:12px">
              <el-card shadow="hover">
                <el-statistic title="无数据" :value="stats.stationNoData">
                  <template #suffix>
                    <el-icon color="#909399"><QuestionFilled /></el-icon>
                  </template>
                </el-statistic>
              </el-card>
            </el-col>
          </el-row>
          <!-- 状态分布饼图 -->
          <el-card shadow="never" body-style="padding:8px 8px 0 8px;">
            <template #header>
              <span>状态分布</span>
            </template>
            <v-chart :option="termitePieOptions" autoresize style="height:220px;width:100%" />
          </el-card>

          <!-- 白蚁测站预警：并入左侧总览，放在饼图下方 -->
          <el-card shadow="never" body-style="padding:8px;" style="margin-top:12px;">
            <template #header>
              <span>最新预警</span>
            </template>
            <el-table :data="stationAlerts" size="small" height="360" border>
              <el-table-column label="预警信息">
                <template #default="{ row }">
                  <div class="alert-item">
                    <div class="alert-line1">
                      <span class="alert-name">{{ row.name }}</span>
                      <el-tag v-if="row.handleStatus === 0" size="small" type="danger">未处理</el-tag>
                      <el-tag v-else size="small" type="success">已处理</el-tag>
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
            <el-empty v-if="!stationAlerts.length" description="暂无预警" />
          </el-card>

        </el-card>
      </el-col>

      <!-- 中间：地图总览 -->
      <el-col :span="12">
        <el-card shadow="never" :body-style="{ padding: '0', height: mapBodyHeight + 'px', overflow: 'hidden' }">
          <template #header>
            <span style="font-weight:600;color:#303133;">测站分布地图</span>
          </template>
          <div id="overview-map" ref="overviewMapEl" style="width:100%;height:100%;"></div>
        </el-card>
      </el-col>

      <!-- 右侧：电子界桩概览（占位，同风格） -->
      <el-col :span="6">
        <el-card ref="rightOverviewCard" shadow="never" body-style="padding:12px 12px 8px 12px">
          <template #header>
            <span style="font-weight:600;color:#303133;">电子界桩总览</span>
          </template>

          <!-- 统计卡片占位 -->
          <el-row :gutter="12" style="margin-bottom:12px">
            <el-col :span="12">
              <el-card shadow="hover">
                <el-statistic title="测试" :value="0">
                  <template #suffix>
                    <el-icon color="#909399"><Odometer /></el-icon>
                  </template>
                </el-statistic>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card shadow="hover">
                <el-statistic title="测试" :value="0">
                  <template #suffix>
                    <el-icon color="#909399"><Warning /></el-icon>
                  </template>
                </el-statistic>
              </el-card>
            </el-col>
            <el-col :span="12" style="margin-top:12px">
              <el-card shadow="hover">
                <el-statistic title="测试" :value="0">
                  <template #suffix>
                    <el-icon color="#909399"><CircleCheck /></el-icon>
                  </template>
                </el-statistic>
              </el-card>
            </el-col>
            <el-col :span="12" style="margin-top:12px">
              <el-card shadow="hover">
                <el-statistic title="测试" :value="0">
                  <template #suffix>
                    <el-icon color="#909399"><QuestionFilled /></el-icon>
                  </template>
                </el-statistic>
              </el-card>
            </el-col>
          </el-row>

          <!-- 饼状图占位：与测站同样结构（目前为占位统计） -->
          <v-chart :option="pilePieOption" style="height: 240px" autoresize />

          <!-- 预警占位已移除 -->

          <!-- 电子界桩饼图（测试） -->
          <el-card shadow="never" body-style="padding:8px 8px 0 8px;">
            <template #header>
              <span>测试</span>
            </template>
            <v-chart :option="pilePieOptions" autoresize style="height:220px;width:100%" />
          </el-card>

          <!-- 电子界桩预警：并入右侧总览，放在饼图下方 -->
          <el-card shadow="never" body-style="padding:8px;" style="margin-top:12px;">
            <template #header>
              <span>电子界桩预警</span>
            </template>
            <el-empty description="暂无界桩预警数据" />
          </el-card>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Odometer, Warning, CircleCheck, QuestionFilled } from '@element-plus/icons-vue';
import { listTermiteStations } from '@/services/termiteStations';
import { use } from 'echarts/core';
import VChart from 'vue-echarts';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart } from 'echarts/charts';
import { LegendComponent, TooltipComponent } from 'echarts/components';
import { ElMessage, ElMessageBox } from 'element-plus';

use([CanvasRenderer, PieChart, LegendComponent, TooltipComponent]);

const router = useRouter();
const loading = ref(false);
// 底部预警模块已并入左右总览，不再需要 tabs
const overviewMapEl = ref<HTMLDivElement | null>(null);
const leftOverviewCard = ref<any>(null);
const rightOverviewCard = ref<any>(null);
const mapBodyHeight = ref(420);
let overviewMap: any = null;
let mapvglView: any = null;

// 统计数据
const stats = reactive({
  stationTotal: 0,
  stationWithTermites: 0,
  stationNoTermites: 0,
  stationNoData: 0
});
// 饼图配置 - 电子界桩（占位）
const pilePieOption = computed(() => ({
  title: { text: '界桩状态分布', left: 'center' },
  tooltip: { trigger: 'item' },
  legend: { bottom: 0 },
  series: [
    {
      name: '界桩状态',
      type: 'pie',
      radius: '60%',
      data: [
        { value: 0, name: '异常' },
        { value: 0, name: '正常' },
        { value: 0, name: '无数据' }
      ],
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.3)' } }
    }
  ]
}));

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
  legend: { bottom: 0 },
  color: ['#f09d5b', '#86ce9e', '#909399'],
  series: [
    {
      name: '状态',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      label: { show: false, position: 'center' },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
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
  legend: { bottom: 0 },
  series: [
    {
      name: '测试',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      label: { show: false, position: 'center' },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      labelLine: { show: false },
      data: [
        { value: 40, name: '测试A' },
        { value: 35, name: '测试B' },
        { value: 25, name: '测试C' }
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

// 加载外部脚本
function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.body.appendChild(s);
  });
}

async function loadMapLibs() {
  // BMapGL
  if (!(window as any).BMapGL) {
    await loadScript('//api.map.baidu.com/api?v=1.0&type=webgl&ak=7j9Zg3mGoFudBiK624Yw8TzPCdiqbNB5');
  }
  // mapvgl
  if (!(window as any).mapvgl) {
    await loadScript('https://code.bdstatic.com/npm/mapvgl@1.0.0-beta.189/dist/mapvgl.min.js');
  }
}

async function initOverviewMap() {
  try {
    await loadMapLibs();
    const BMapGL = (window as any).BMapGL;
    const mapvgl = (window as any).mapvgl;
    if (!overviewMapEl.value) return;

    overviewMap = new BMapGL.Map(overviewMapEl.value);
    overviewMap.enableScrollWheelZoom(true);
    overviewMap.setTilt(10);
    overviewMap.setZoom(10);
    overviewMap.setCenter(new BMapGL.Point(112.9388, 28.2282)); // 默认中心：长沙

    // 白底增强样式：显著保留水系(河流/湖泊)与主要道路、行政区文本，隐藏POI/楼块
    const WHITE_WATER_ENHANCED = [
      // 地表与绿地
      { featureType: 'land', elementType: 'geometry', stylers: { color: '#f5f7faff' } },
      { featureType: 'green', elementType: 'geometry', stylers: { color: '#eaf4ecff' } },
      // 水系：提高对比度，并开启文本
      { featureType: 'water', elementType: 'geometry', stylers: { color: '#9cc9ffff' } },
      { featureType: 'water', elementType: 'labels.text.fill', stylers: { color: '#6c8fbaff', visibility: 'on' } },
      // 行政区与边界
      { featureType: 'boundary', elementType: 'geometry', stylers: { color: '#cfd7e3ff' } },
      { featureType: 'districtlabel', elementType: 'labels.text.fill', stylers: { color: '#6e7787ff' } },
      // 道路主干次干
      { featureType: 'highway', elementType: 'geometry', stylers: { color: '#e7ecf0ff' } },
      { featureType: 'arterial', elementType: 'geometry', stylers: { color: '#eef3f7ff' } },
      { featureType: 'local', elementType: 'geometry', stylers: { color: '#f6f8fbff' } },
      { featureType: 'road', elementType: 'labels.text.fill', stylers: { color: '#98a3b3ff' } },
      // 隐藏干扰项
      { featureType: 'poilabel', elementType: 'all', stylers: { visibility: 'off' } },
      { featureType: 'building', elementType: 'all', stylers: { visibility: 'off' } },
      { featureType: 'manmade', elementType: 'all', stylers: { visibility: 'off' } }
    ];
    try {
      overviewMap.setMapStyleV2({ styleJson: WHITE_WATER_ENHANCED });
      // 天空渐变，与示例风格一致
      if (typeof (overviewMap as any).setSkyColors === 'function') {
        (overviewMap as any).setSkyColors([
          'rgba(226, 237, 248, 0)',
          'rgba(186, 211, 252, 1)'
        ]);
      }
    } catch {}

    // 加载测站并适配视野
    const page = await listTermiteStations({ pageNo: 1, pageSize: 200 });
    const points = page.records
      .filter(s => s.lngBd09 != null && s.latBd09 != null)
      .map(s => new BMapGL.Point(s.lngBd09!, s.latBd09!));
    if (points.length) {
      const view = overviewMap.getViewport(points);
      overviewMap.centerAndZoom(view.center, view.zoom);
    }

    // 准备聚合数据
    const data = page.records
      .filter(s => s.lngBd09 != null && s.latBd09 != null)
      .map(s => ({
        geometry: { type: 'Point', coordinates: [s.lngBd09 as number, s.latBd09 as number] },
        properties: { id: s.id, name: s.name }
      }));

    // 创建视图与聚合图层
    mapvglView = new mapvgl.View({ map: overviewMap });

    // 柱状层（用于低级别时的聚合效果展示）
    const barLayer = new mapvgl.BarLayer({
      height: 1000 * 800, // 柱体基准高度
      size: 20 * 1000,    // 柱体直径
      edgeCount: 30
    });
    mapvglView.addLayer(barLayer);

    // 聚合层，联动柱状层（参考示例）
    const clusterLayer = new mapvgl.ClusterLayer({
      minSize: 30,
      maxSize: 50,
      clusterRadius: 150,
      gradient: { 0: 'blue', 0.5: 'green', 1.0: 'red' },
      maxZoom: 15,
      minZoom: 5,
      showText: true,
      minPoints: 5,
      textOptions: {
        fontSize: 12,
        color: 'white',
        format: function (count: number) {
          return count >= 10000 ? Math.round(count / 1000) + 'k'
            : count >= 1000 ? Math.round(count / 100) / 10 + 'k' : count;
        }
      },
      beforeRender: (clusterData: any[]) => {
        if (overviewMap.getZoom() > 8) {
          barLayer.setData([]);
          return true; // 使用默认聚合渲染
        }
        const bars: any[] = [];
        clusterData.forEach((item: any) => {
          bars.push({
            geometry: item.geometry,
            height: (item.properties.point_count || 1) * 100, // 与示例一致的倍率
            color: item.properties.color
          });
        });
        barLayer.setData(bars);
        return false; // 阻止默认渲染，仅显示柱状
      }
    });
    mapvglView.addLayer(clusterLayer);
    clusterLayer.setData(data);
    // 地图就绪后同步一次高度
    syncMapHeight();
  } catch (e) {
    // 地图失败静默，不阻断概览
    console.warn('[Dashboard] 地图初始化失败:', e);
  }
}

function getElHeight(r: any): number {
  if (!r) return 0;
  const el = (r as any).$el ? (r as any).$el : r;
  return el && el.offsetHeight ? el.offsetHeight : 0;
}

function syncMapHeight() {
  const lh = getElHeight(leftOverviewCard.value);
  const rh = getElHeight(rightOverviewCard.value);
  const h = Math.max(lh, rh);
  // 预留卡片头部高度 ~ 48px
  mapBodyHeight.value = Math.max(420, h - 48);
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
    
    // TODO: 调用后端接口标记预警为已处理
    // await handleTermiteAlert(alert.alertId, { handleStatus: 1, handler: 'admin' });
    
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

onMounted(() => {
  loadAlerts();
  initOverviewMap();
  // 初始与窗口变化时同步高度
  setTimeout(syncMapHeight, 0);
  window.addEventListener('resize', syncMapHeight);
});
</script>

<style scoped>
.dashboard-root {
  padding: 12px;
  box-sizing: border-box;
  background-color: #ffffff;
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
  color: #303133;
}
.alert-line2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
}
.alert-line3 {
  font-size: 12px;
  color: #909399;
}
.alert-desc {
  word-break: break-word;
  white-space: normal;
}
.alert-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
