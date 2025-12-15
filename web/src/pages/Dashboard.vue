<!--
  仪表盘页面
  功能：展示系统总体概览(测站/界桩数量与预警统计)和快速入口导航
-->
<template>
  <div v-loading="loading">
    <el-row :gutter="12">
      <!-- 左侧：白蚁测站概览 -->
      <el-col :span="12">
        <el-card shadow="never" body-style="padding:12px 12px 8px 12px">
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

          <!-- 饼状图：与“白蚁状态”统计对齐 -->
          <v-chart :option="stationPieOption" style="height: 240px" autoresize />

        </el-card>
      </el-col>

      <!-- 右侧：电子界桩概览（占位，同风格） -->
      <el-col :span="12">
        <el-card shadow="never" body-style="padding:12px 12px 8px 12px">
          <template #header>
            <span style="font-weight:600;color:#303133;">电子界桩总览</span>
          </template>

          <!-- 统计卡片占位 -->
          <el-row :gutter="12" style="margin-bottom:12px">
            <el-col :span="12">
              <el-card shadow="hover">
                <el-statistic title="测试" value="-">
                  <template #suffix>
                    <el-icon color="#909399"><Odometer /></el-icon>
                  </template>
                </el-statistic>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card shadow="hover">
                <el-statistic title="测试" value="-">
                  <template #suffix>
                    <el-icon color="#909399"><Warning /></el-icon>
                  </template>
                </el-statistic>
              </el-card>
            </el-col>
            <el-col :span="12" style="margin-top:12px">
              <el-card shadow="hover">
                <el-statistic title="测试" value="-">
                  <template #suffix>
                    <el-icon color="#909399"><CircleCheck /></el-icon>
                  </template>
                </el-statistic>
              </el-card>
            </el-col>
            <el-col :span="12" style="margin-top:12px">
              <el-card shadow="hover">
                <el-statistic title="测试" value="-">
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
        </el-card>
      </el-col>
    </el-row>

    <!-- 实时预警（拆分到下方独立模块） -->
    <el-card style="margin-top:12px" shadow="never">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>实时预警</span>
          <el-button size="small" @click="loadAlerts">刷新</el-button>
        </div>
      </template>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="白蚁测站预警" name="stations">
          <el-table :data="stationAlerts" size="small" max-height="400">
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="stationCode" label="测站编号" width="150" />
            <el-table-column prop="name" label="测站名称" width="200" />
            <el-table-column prop="alertTime" label="预警时间" width="180">
              <template #default="{ row }">{{ formatDateTime(row.alertTime) }}</template>
            </el-table-column>
            <el-table-column prop="alertDesc" label="预警描述" />
            <el-table-column label="处理状态" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.handleStatus === 0" type="danger">未处理</el-tag>
                <el-tag v-else type="success">已处理</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-space>
                  <el-button type="primary" plain size="small" @click="viewStationDetail(row.stationId)">查看详情</el-button>
                  <el-button v-if="row.handleStatus === 0" type="success" plain size="small" @click="handleAlert(row)">已处理</el-button>
                </el-space>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!stationAlerts.length" description="暂无预警" />
        </el-tab-pane>
        <el-tab-pane label="电子界桩预警" name="piles">
          <el-empty description="暂无界桩预警数据" />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Odometer, Warning, CircleCheck, QuestionFilled } from '@element-plus/icons-vue';
import { listTermiteStations, type TermiteStation } from '@/services/termiteStations';
import { use } from 'echarts/core';
import VChart from 'vue-echarts';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
use([CanvasRenderer, PieChart, TooltipComponent, LegendComponent, TitleComponent]);
import { ElMessage, ElMessageBox } from 'element-plus';

const router = useRouter();
const loading = ref(false);
const activeTab = ref('stations');

// 统计数据
const stats = reactive({
  stationTotal: 0,
  stationWithTermites: 0,
  stationNoTermites: 0,
  stationNoData: 0
});
// 饼图配置 - 白蚁测站
const stationPieOption = computed(() => ({
  title: { text: '白蚁状态分布', left: 'center' },
  tooltip: { trigger: 'item' },
  legend: { bottom: 0 },
  series: [
    {
      name: '白蚁状态',
      type: 'pie',
      radius: '60%',
      data: [
        { value: stats.stationWithTermites, name: '有白蚁' },
        { value: stats.stationNoTermites, name: '无白蚁' },
        { value: stats.stationNoData, name: '无数据' }
      ],
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.3)' } }
    }
  ]
}));

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
});
</script>

<style scoped>
</style>
