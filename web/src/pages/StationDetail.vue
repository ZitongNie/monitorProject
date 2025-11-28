<!--
  测站详细信息页面
  功能：展示单个测站的完整信息，包括基本信息、历史数据、图表等
-->
<template>
  <el-card v-loading="loading" :shadow="'never'" :bordered="false">
    <template #header>
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <el-button size="small" circle @click="goBack">
            <template #icon>
              <el-icon><ArrowLeft /></el-icon>
            </template>
          </el-button>
          <span>测站详细信息</span>
        </div>
        <el-space>
          <el-button size="small" type="primary" @click="openEditDialog">编辑测站信息</el-button>
          <el-button size="small" @click="refreshData">刷新数据</el-button>
        </el-space>
      </div>
    </template>

    <div v-if="station" class="detail-content">
      <!-- 基本信息 -->
      <el-descriptions title="基本信息" :column="2" border>
        <el-descriptions-item label="测站ID">{{ station.id }}</el-descriptions-item>
        <el-descriptions-item label="测站名称">{{ station.name }}</el-descriptions-item>
        <el-descriptions-item label="经度">{{ station.lng }}</el-descriptions-item>
        <el-descriptions-item label="纬度">{{ station.lat }}</el-descriptions-item>
        <el-descriptions-item label="当前状态">
          <el-tag :type="station.status === 'warn' ? 'danger' : 'success'" effect="dark">
            {{ station.status === 'warn' ? '预警' : '安全' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间" v-if="station.createdAt">
          {{ formatDate(station.createdAt) }}
        </el-descriptions-item>
      </el-descriptions>

      <!-- 现场照片 -->
      <div v-if="station.picture" class="photo-section">
        <h3>现场照片</h3>
        <el-image 
          :src="station.picture" 
          style="width: 100%; max-width: 600px;" 
          fit="contain"
          :preview-src-list="[station.picture]"
        />
      </div>

      <!-- 历史监测数据图表 -->
      <div class="chart-section">
        <h3>历史监测数据</h3>
        <div v-if="historyData.length > 0">
          <v-chart :option="chartOption" style="height: 400px;" autoresize />
        </div>
        <el-empty v-else description="暂无历史数据" :image-size="120" />
      </div>

      <!-- 历史记录表格 -->
      <div class="history-table-section">
        <h3>历史记录</h3>
        <el-table :data="historyData" style="width: 100%" max-height="300">
          <el-table-column prop="t" label="时间" width="180">
            <template #default="{ row }">{{ formatDate(row.t) }}</template>
          </el-table-column>
          <el-table-column prop="status" label="状态">
            <template #default="{ row }">
              <el-tag :type="row.status === 'warn' ? 'danger' : 'success'" size="small">
                {{ row.status === 'warn' ? '预警' : '安全' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <el-empty v-else description="测站不存在" />
  </el-card>

  <!-- 编辑弹窗 -->
  <el-dialog v-model="editVisible" title="编辑测站信息" width="500px">
    <el-form :model="editForm" label-width="100px">
      <el-form-item label="名称">
        <el-input v-model="editForm.name" />
      </el-form-item>
      <el-form-item label="纬度">
        <el-input-number v-model="editForm.lat" :precision="6" style="width: 100%" />
      </el-form-item>
      <el-form-item label="经度">
        <el-input-number v-model="editForm.lng" :precision="6" style="width: 100%" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="editForm.status" style="width: 100%">
          <el-option label="安全" value="safe" />
          <el-option label="预警" value="warn" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="editVisible = false">取消</el-button>
      <el-button type="primary" @click="saveEdit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { listStations, updateStation, getStationHistory, type Station } from '../services/stations';
import { ElMessage } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import { use } from 'echarts/core';
import VChart from 'vue-echarts';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent, DataZoomComponent } from 'echarts/components';
import dayjs from 'dayjs';

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, DataZoomComponent]);

const router = useRouter();
const route = useRoute();

const loading = ref(false);
const station = ref<Station | null>(null);
const historyData = ref<Array<{ t: number; status: 'safe'|'warn' }>>([]);
const editVisible = ref(false);
const editForm = ref<Partial<Station>>({});

const chartOption = computed(() => {
  if (!historyData.value.length) return {};
  const times = historyData.value.map(d => dayjs(d.t).format('MM-DD HH:mm'));
  const values = historyData.value.map(d => d.status === 'warn' ? 1 : 0);
  return {
    title: { text: '状态变化趋势', left: 'center' },
    tooltip: { 
      trigger: 'axis',
      formatter: (params: any) => {
        const status = params[0].value === 1 ? '预警' : '安全';
        return `${params[0].name}<br/>状态: ${status}`;
      }
    },
    xAxis: { 
      type: 'category', 
      data: times, 
      axisLabel: { rotate: 45, fontSize: 11 }
    },
    yAxis: { 
      type: 'value', 
      min: 0, 
      max: 1,
      interval: 1,
      axisLabel: { 
        formatter: (v: number) => v === 1 ? '预警' : '安全' 
      }
    },
    dataZoom: [
      { type: 'inside', start: 0, end: 100 },
      { start: 0, end: 100 }
    ],
    series: [{ 
      name: '状态', 
      type: 'line', 
      data: values, 
      step: 'end',
      lineStyle: { color: '#409EFF', width: 2 },
      itemStyle: { color: '#409EFF' },
      areaStyle: { color: 'rgba(64, 158, 255, 0.1)' }
    }]
  };
});

function formatDate(timestamp: number) {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
}

function goBack() {
  router.back();
}

async function loadData() {
  const id = Number(route.query.id);
  if (!id) {
    ElMessage.error('缺少测站ID参数');
    return;
  }

  loading.value = true;
  try {
    // 获取测站列表并找到对应的测站
    const stations = await listStations();
    station.value = stations.find(s => s.id === id) || null;
    
    if (!station.value) {
      ElMessage.error('测站不存在');
      return;
    }

    // 加载历史数据
    historyData.value = await getStationHistory(id);
  } catch (error: any) {
    ElMessage.error(error?.message || '加载数据失败');
  } finally {
    loading.value = false;
  }
}

function openEditDialog() {
  if (station.value) {
    editForm.value = { ...station.value };
    editVisible.value = true;
  }
}

async function saveEdit() {
  if (!station.value || !editForm.value.id) return;
  
  try {
    await updateStation(editForm.value.id, editForm.value);
    ElMessage.success('保存成功');
    editVisible.value = false;
    await loadData();
  } catch (error: any) {
    ElMessage.error(error?.message || '保存失败');
  }
}

async function refreshData() {
  await loadData();
  ElMessage.success('数据已刷新');
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.detail-content {
  padding: 8px 0;
}

:deep(.el-card) {
  border: none;
  box-shadow: none;
}

:deep(.el-card__header) {
  border-bottom: 1px solid #e4e7ed;
  padding: 16px 20px;
}

.photo-section,
.chart-section,
.history-table-section,
.action-section {
  margin-top: 32px;
}

.photo-section h3,
.chart-section h3,
.history-table-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  border-left: 4px solid #409EFF;
  padding-left: 12px;
}
</style>
