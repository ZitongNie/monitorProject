<template>
  <el-card v-loading="loading" :shadow="'never'" :bordered="false">
    <template #header>
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <el-button circle @click="goBack">
            <template #icon>
              <el-icon><ArrowLeft /></el-icon>
            </template>
          </el-button>
          <span>电子界桩详细信息</span>
        </div>
        <el-space>
          <el-button type="primary" @click="openEditDialog">编辑界桩信息</el-button>
          <el-button @click="refreshData">刷新数据</el-button>
        </el-space>
      </div>
    </template>

    <div v-if="detail" class="detail-content">
      <!-- 实时数据 -->
      <div class="mt24">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h3 style="margin:0">实时数据</h3>
          <el-space>
            <el-button size="small" @click="fetchRealtime">刷新实时</el-button>
          </el-space>
        </div>
        <el-empty v-if="!realtime" description="未加载实时数据" />
        <el-descriptions v-else :column="4" border :title="'报告时间: '+ realtime.realTimeData?.reportTime">
          <el-descriptions-item label="经度(WGS84)">{{ realtime.realTimeData?.lngWgs84 }}</el-descriptions-item>
          <el-descriptions-item label="纬度(WGS84)">{{ realtime.realTimeData?.latWgs84 }}</el-descriptions-item>
          <el-descriptions-item label="经度(BD09)">{{ realtime.realTimeData?.lngBd09 }}</el-descriptions-item>
          <el-descriptions-item label="纬度(BD09)">{{ realtime.realTimeData?.latBd09 }}</el-descriptions-item>
          <el-descriptions-item label="温度">{{ realtime.realTimeData?.temperature }}</el-descriptions-item>
          <el-descriptions-item label="湿度">{{ realtime.realTimeData?.humidity }}</el-descriptions-item>
          <el-descriptions-item label="倾斜角">{{ realtime.realTimeData?.tiltAngle }}</el-descriptions-item>
          <el-descriptions-item label="倾斜状态">{{ realtime.realTimeData?.tiltStatus }}</el-descriptions-item>
          <el-descriptions-item label="震动状态">{{ realtime.realTimeData?.vibrationStatus }}</el-descriptions-item>
          <el-descriptions-item label="电压">{{ realtime.realTimeData?.voltage }}</el-descriptions-item>
          <el-descriptions-item label="剩余电量%">{{ realtime.realTimeData?.remainingPower }}</el-descriptions-item>
          <el-descriptions-item label="信号强度">{{ realtime.realTimeData?.signalStrength }}</el-descriptions-item>
          <el-descriptions-item label="是否告警">{{ realtime.realTimeData?.isAlert }}</el-descriptions-item>
          <el-descriptions-item label="测站类型">{{ realtime.realTimeData?.stationType }}</el-descriptions-item>
          <el-descriptions-item label="观测时间">{{ realtime.realTimeData?.observationTime }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 预警信息 -->
      <div class="mt24">
        <h3 style="margin:0">预警</h3>
        <el-table :data="alertsTable" size="small" :max-height="240">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="alertType" label="类型" width="120" />
          <el-table-column prop="alertCode" label="编码" width="90" />
          <el-table-column prop="alertTime" label="时间" width="180" />
          <el-table-column prop="alertDesc" label="描述" />
          <el-table-column prop="handleStatus" label="处理状态" width="120">
            <template #default="{ row }">
              <el-tag :type="row.handleStatus===1?'success':'danger'" effect="dark">{{ row.handleStatus===1? '已处理':'未处理' }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 图片 -->
      <div class="mt24">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="margin:0">最近图片</h3>
        </div>
        <el-empty v-if="!(realtime?.images?.length)" description="无图片" />
        <el-space wrap v-else>
          <el-card v-for="img in realtime!.images" :key="img.imageCode" shadow="hover" body-style="padding:4px" style="width:180px;position:relative">
            <div style="font-size:12px;">{{ formatDateTime(img.reportTime) }}</div>
            <el-image :src="img.imagePath" :preview-src-list="[img.imagePath]" fit="cover" style="margin-top:4px; width:100%; height:120px; background:#f5f5f5" />
            <div style="margin-top:4px; font-size:12px; color:#999;">{{ img.imageCode }}</div>
          </el-card>
        </el-space>
      </div>

      <!-- 基础信息（移动到最下方） -->
      <div class="mt24">
        <h3 style="margin:0 0 8px;">基础信息</h3>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="ID">{{ detail.id }}</el-descriptions-item>
          <el-descriptions-item label="界桩编号">{{ detail.boundaryCode }}</el-descriptions-item>
          <el-descriptions-item label="名称">{{ detail.name }}</el-descriptions-item>
          <el-descriptions-item label="设备ID">{{ detail.deviceId }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="detail.status===1? 'success':'info'" effect="dark">{{ detail.status===1? '在线':'离线' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="材质">{{ detail.material || '-' }}</el-descriptions-item>
          <el-descriptions-item label="高度(m)">{{ detail.height ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="埋深(m)">{{ detail.buryDepth ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="地址" :span="3">{{ detail.address || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(detail.createTime) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDateTime(detail.updateTime) }}</el-descriptions-item>
        </el-descriptions>

        <el-descriptions title="当前坐标 (WGS84)" :column="2" border class="mt16">
          <el-descriptions-item label="经度">{{ detail.lngWgs84 }}</el-descriptions-item>
          <el-descriptions-item label="纬度">{{ detail.latWgs84 }}</el-descriptions-item>
        </el-descriptions>
        <el-descriptions title="初始安装坐标 (WGS84)" :column="2" border class="mt16">
          <el-descriptions-item label="经度">{{ detail.initLngWgs84 }}</el-descriptions-item>
          <el-descriptions-item label="纬度">{{ detail.initLatWgs84 }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </div>

    <el-empty v-else description="电子界桩不存在" />
  </el-card>

  <!-- 编辑弹窗 -->
  <el-dialog v-model="editVisible" title="编辑电子界桩" width="680px">
    <el-form :model="editForm" label-width="120px" ref="formRef">
      <el-row :gutter="12">
        <el-col :span="12"><el-form-item label="界桩编号" prop="boundaryCode" required><el-input v-model="editForm.boundaryCode" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="界桩名称" prop="name" required><el-input v-model="editForm.name" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="设备ID" prop="deviceId" required><el-input v-model="editForm.deviceId" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="设备密码" prop="password" required><el-input v-model="editForm.password" type="password" show-password /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="状态" prop="status" required><el-select v-model="editForm.status" style="width:100%"><el-option label="离线" :value="0" /><el-option label="在线" :value="1" /></el-select></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="经度(WGS84)" prop="lngWgs84" required><el-input-number v-model="editForm.lngWgs84" :precision="6" :step="0.0001" :min="-180" :max="180" style="width:100%" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="纬度(WGS84)" prop="latWgs84" required><el-input-number v-model="editForm.latWgs84" :precision="6" :step="0.0001" :min="-90" :max="90" style="width:100%" /></el-form-item></el-col>
        <el-col :span="24"><el-form-item label="地址" prop="address"><el-input v-model="editForm.address" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="材质" prop="material"><el-input v-model="editForm.material" /></el-form-item></el-col>
        <el-col :span="6"><el-form-item label="高度(m)" prop="height"><el-input-number v-model="editForm.height" :min="0" :step="0.1" :precision="2" style="width:100%" /></el-form-item></el-col>
        <el-col :span="6"><el-form-item label="埋深(m)" prop="buryDepth"><el-input-number v-model="editForm.buryDepth" :min="0" :step="0.1" :precision="2" style="width:100%" /></el-form-item></el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-space>
        <el-button @click="editVisible=false">取消</el-button>
        <el-button type="primary" @click="saveEdit" :loading="saving">保存</el-button>
      </el-space>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import {
  getElectronicBoundaryDetail as getBoundaryDetail,
  updateElectronicBoundary as updateBoundary,
  queryBoundaryRealtime,
  listElectronicBoundaries as listBoundaries,
  type ElectronicBoundary as ElectronicBoundaryDTO,
  type BoundaryRealtimeResponse
} from '@/services/electronicBoundaries';
import type { FormInstance } from 'element-plus';

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const detail = ref<ElectronicBoundaryDTO | null>(null);
const editVisible = ref(false);
const editForm = ref<Partial<ElectronicBoundaryDTO>>({});
const realtime = ref<BoundaryRealtimeResponse | null>(null);
const formRef = ref<FormInstance>(); void formRef;
const saving = ref(false);

function formatDateTime(iso?: string) {
  if (!iso) return '-';
  try { const d = new Date(iso); return d.toLocaleString(); } catch { return iso; }
}

function goBack() { router.back(); }

async function loadDetail() {
  const id = route.query.id ? Number(route.query.id) : undefined as number | undefined;
  const deviceId = typeof route.query.deviceId === 'string' ? route.query.deviceId : undefined;
  if (!id && !deviceId) { ElMessage.error('缺少定位参数'); return; }
  loading.value = true;
  try {
    if (id) { try { detail.value = await getBoundaryDetail(id); } catch {} }
    if (!detail.value) {
      const page = await listBoundaries({ pageNum: 1, pageSize: 500 });
      let found: any = undefined;
      if (id) found = page.list.find(b => b.id === id);
      if (!found && deviceId) found = page.list.find(b => b.deviceId === deviceId);
      if (found) detail.value = found as any;
    }
    if (!detail.value) throw new Error('电子界桩不存在');
  } catch (e: any) { ElMessage.error(e.message || '加载失败'); } finally { loading.value = false; }
}

function openEditDialog() {
  if (!detail.value) return;
  editForm.value = { ...detail.value };
  editVisible.value = true;
}

async function saveEdit() {
  if (!editForm.value.id) return;
  try {
    saving.value = true;
    await updateBoundary(editForm.value.id, editForm.value);
    ElMessage.success('保存成功');
    editVisible.value = false;
    await loadDetail();
  } catch (e: any) { ElMessage.error(e.message || '保存失败'); } finally { saving.value = false; }
}

async function refreshData() { await loadDetail(); ElMessage.success('已刷新'); }

async function fetchRealtime() {
  if (!detail.value) return;
  try {
    realtime.value = await queryBoundaryRealtime({ id: detail.value.id, preferCache: true });
    ElMessage.success('实时数据已更新');
  } catch (e: any) { ElMessage.error(e.message || '获取实时数据失败'); }
}

const alertsTable = computed(() => {
  const arr = (realtime.value?.alerts || []) as any[];
  return arr.sort((a,b) => (b.alertTime||'').localeCompare(a.alertTime||''));
});

onMounted(async () => { await loadDetail(); await fetchRealtime(); });
</script>

<style scoped>
.detail-content { padding:8px 0; }
.mt16 { margin-top:16px; }
.mt24 { margin-top:24px; }
:deep(.el-card) { border:none; box-shadow:none; }
:deep(.el-card__header) { border-bottom:1px solid #e4e7ed; padding:16px 20px; }
h3 { font-size:16px; font-weight:600; color:#303133; }
</style>
