<template>
  <el-card :shadow="'never'" :bordered="false" v-loading="loading">
    <template #header>
      <div class="header-row">
        <div>
          <div class="title">资产维护总览（管理员）</div>
          <div class="subtitle">聚焦维护事项，避免与概览展板重复</div>
        </div>
        <el-space>
          <el-button @click="goMap">地图联查</el-button>
          <el-button type="primary" @click="load">刷新数据</el-button>
        </el-space>
      </div>
    </template>

    <el-row :gutter="12" class="kpi-row">
      <el-col :xs="24" :sm="12" :lg="8">
        <div class="kpi-card">
          <div class="kpi-label">待巡检离线资产</div>
          <div class="kpi-value">{{ totalOffline }}</div>
          <div class="kpi-hint">测站 {{ stationOffline }} · 界桩 {{ boundaryOffline }}</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="8">
        <div class="kpi-card">
          <div class="kpi-label">坐标异常资产</div>
          <div class="kpi-value">{{ totalMissingCoord }}</div>
          <div class="kpi-hint">测站 {{ stationMissingCoord }} · 界桩 {{ boundaryMissingCoord }}</div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="8">
        <div class="kpi-card">
          <div class="kpi-label">近24小时变更</div>
          <div class="kpi-value">{{ recent24hChanges }}</div>
          <div class="kpi-hint">用于核查新增、状态变更与巡检记录</div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="12" class="panel-row">
      <el-col :xs="24" :lg="8">
        <div class="panel">
          <div class="panel-title">快捷维护</div>
          <el-space wrap>
            <el-button type="primary" plain @click="goStations">管理测站</el-button>
            <el-button type="primary" plain @click="goBoundaries">管理界桩</el-button>
            <el-button @click="goAnalytics">统计分析</el-button>
            <el-button @click="goMap">地图定位</el-button>
          </el-space>
        </div>
      </el-col>
      <el-col :xs="24" :lg="16">
        <div class="panel">
          <div class="panel-title">维护提示</div>
          <div class="tips-grid">
            <div class="tip-item">
              <div class="tip-label">离线测站</div>
              <div class="tip-value">{{ stationOffline }}</div>
            </div>
            <div class="tip-item">
              <div class="tip-label">离线界桩</div>
              <div class="tip-value">{{ boundaryOffline }}</div>
            </div>
            <div class="tip-item">
              <div class="tip-label">坐标缺失测站</div>
              <div class="tip-value">{{ stationMissingCoord }}</div>
            </div>
            <div class="tip-item">
              <div class="tip-label">坐标缺失界桩</div>
              <div class="tip-value">{{ boundaryMissingCoord }}</div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <div class="table-header">
      <span>最近资产变更（Top 10）</span>
      <el-button link type="primary" @click="load">重新生成</el-button>
    </div>
    <el-table :data="recentActivities" :style="{ width: '100%' }" max-height="420" size="default">
      <el-table-column type="index" label="#" width="60" />
      <el-table-column prop="timeText" label="时间" min-width="170" />
      <el-table-column prop="assetType" label="类型" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.assetType === '测站' ? 'primary' : 'success'">{{ row.assetType }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="名称" min-width="180" show-overflow-tooltip />
      <el-table-column prop="code" label="编号/设备ID" min-width="150" show-overflow-tooltip />
      <el-table-column prop="action" label="动作" width="110" />
      <el-table-column prop="statusText" label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="row.statusText === '在线' ? 'success' : 'info'">{{ row.statusText }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="address" label="位置" min-width="220" show-overflow-tooltip />
    </el-table>
    <el-empty v-if="!recentActivities.length && !loading" description="暂无资产变更数据" />
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { listAllTermiteStations, type TermiteStation } from '@/services/termiteStations';
import { listAllElectronicBoundaries, type ElectronicBoundary } from '@/services/electronicBoundaries';

interface AssetActivity {
  ts: number;
  timeText: string;
  assetType: '测站' | '界桩';
  name: string;
  code: string;
  action: string;
  statusText: '在线' | '离线';
  address: string;
}

const router = useRouter();
const loading = ref(false);
const stations = ref<TermiteStation[]>([]);
const boundaries = ref<ElectronicBoundary[]>([]);

const stationTotal = computed(() => stations.value.length);
const stationOnline = computed(() => stations.value.filter(s => s.status === 1).length);
const stationOffline = computed(() => stationTotal.value - stationOnline.value);
const stationMissingCoord = computed(() =>
  stations.value.filter(s => s.lngWgs84 == null || s.latWgs84 == null).length
);

const boundaryTotal = computed(() => boundaries.value.length);
const boundaryOnline = computed(() => boundaries.value.filter(b => b.status === 1).length);
const boundaryOffline = computed(() => boundaryTotal.value - boundaryOnline.value);
const boundaryMissingCoord = computed(() =>
  boundaries.value.filter(b => b.lngWgs84 == null || b.latWgs84 == null).length
);

const totalOffline = computed(() => stationOffline.value + boundaryOffline.value);
const totalMissingCoord = computed(() => stationMissingCoord.value + boundaryMissingCoord.value);

function toTs(v?: string) {
  if (!v) return 0;
  const ts = new Date(v).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function formatTime(ts: number) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

function inferAction(createTs: number, updateTs: number, status: 0 | 1) {
  if (createTs && updateTs && Math.abs(updateTs - createTs) < 60 * 1000) {
    return '新增入库';
  }
  return status === 1 ? '状态更新' : '离线巡检';
}

const recentActivities = computed<AssetActivity[]>(() => {
  const stationRows: AssetActivity[] = stations.value.map(s => {
    const createTs = toTs(s.createTime);
    const updateTs = Math.max(toTs(s.updateTime), createTs);
    return {
      ts: updateTs,
      timeText: formatTime(updateTs),
      assetType: '测站',
      name: s.name,
      code: s.stationCode,
      action: inferAction(createTs, updateTs, s.status),
      statusText: s.status === 1 ? '在线' : '离线',
      address: s.address || '-'
    };
  });

  const boundaryRows: AssetActivity[] = boundaries.value.map(b => {
    const createTs = toTs(b.createTime);
    const updateTs = Math.max(toTs(b.updateTime), createTs);
    return {
      ts: updateTs,
      timeText: formatTime(updateTs),
      assetType: '界桩',
      name: b.name,
      code: b.boundaryCode || b.deviceId,
      action: inferAction(createTs, updateTs, b.status),
      statusText: b.status === 1 ? '在线' : '离线',
      address: b.address || '-'
    };
  });

  return [...stationRows, ...boundaryRows]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 10);
});

const recent24hChanges = computed(() => {
  const now = Date.now();
  const windowMs = 24 * 60 * 60 * 1000;
  return [...stations.value, ...boundaries.value].filter((item: any) => {
    const ts = Math.max(toTs(item.updateTime), toTs(item.createTime));
    return ts > 0 && now - ts <= windowMs;
  }).length;
});

async function load() {
  loading.value = true;
  try {
    const [stationList, boundaryList] = await Promise.all([
      listAllTermiteStations({ sortBy: 'updateTime', order: 'desc' }),
      listAllElectronicBoundaries({ order: 'desc' })
    ]);
    stations.value = stationList;
    boundaries.value = boundaryList;
  } catch (e: any) {
    ElMessage.error(e?.message || '加载资产总览失败');
  } finally {
    loading.value = false;
  }
}

function goStations() {
  router.push('/stations');
}

function goBoundaries() {
  router.push('/boundaries');
}

function goMap() {
  router.push('/map');
}

function goAnalytics() {
  router.push('/analytics');
}

onMounted(load);
</script>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.kpi-row {
  margin-bottom: 12px;
}

.kpi-card {
  border: 1px solid #ebeef5;
  border-radius: 10px;
  padding: 12px;
  min-height: 108px;
  background: #fff;
}

.kpi-label {
  font-size: 12px;
  color: #909399;
}

.kpi-value {
  margin-top: 8px;
  font-size: 28px;
  line-height: 1;
  font-weight: 700;
  color: #303133;
}

.kpi-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #606266;
}

.panel-row {
  margin-bottom: 12px;
}

.panel {
  border: 1px solid #ebeef5;
  border-radius: 10px;
  padding: 12px;
  min-height: 120px;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.tip-item {
  border-radius: 8px;
  background: #f5f7fa;
  padding: 10px;
}

.tip-label {
  font-size: 12px;
  color: #909399;
}

.tip-value {
  margin-top: 8px;
  font-size: 20px;
  font-weight: 700;
  color: #303133;
}

.table-header {
  margin: 6px 0 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #303133;
  font-weight: 600;
}

@media (max-width: 1200px) {
  .tips-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .tips-grid {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}
</style>
