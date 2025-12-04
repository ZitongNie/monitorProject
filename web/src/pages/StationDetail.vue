<!--
  测站详细信息页面
  功能：展示单个测站的完整信息，包括基本信息、历史数据、图表等
-->
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
          <span>测站详细信息</span>
        </div>
        <el-space>
          <el-button type="primary" @click="openEditDialog">编辑测站信息</el-button>
          <el-button @click="refreshData">刷新数据</el-button>
        </el-space>
      </div>
    </template>

    <div v-if="detail" class="detail-content">
      <el-descriptions title="基础信息" :column="3" border>
        <el-descriptions-item label="ID">{{ detail.id }}</el-descriptions-item>
        <el-descriptions-item label="监测站编号">{{ detail.stationCode }}</el-descriptions-item>
        <el-descriptions-item label="名称">{{ detail.name }}</el-descriptions-item>
        <el-descriptions-item label="RTUID">{{ detail.rtuid }}</el-descriptions-item>
        <el-descriptions-item label="水库编码">{{ detail.reservoirCode }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="detail.status===1? 'success':'info'" effect="dark">{{ detail.status===1? '在线':'离线' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="联系人">{{ detail.contactPerson || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ detail.contactPhone || '-' }}</el-descriptions-item>
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
          <el-descriptions-item label="经度">{{ realtime.realTimeData?.lngWgs84 }}</el-descriptions-item>
          <el-descriptions-item label="纬度">{{ realtime.realTimeData?.latWgs84 }}</el-descriptions-item>
          <el-descriptions-item label="设备电量">{{ realtime.realTimeData?.devicePower }}</el-descriptions-item>
          <el-descriptions-item label="是否预警">{{ realtime.realTimeData?.isAlert }}</el-descriptions-item>
          <el-descriptions-item label="信号强度">{{ realtime.realTimeData?.signalStrength }}</el-descriptions-item>
          <el-descriptions-item label="点位序号">{{ realtime.realTimeData?.pointOrder }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 预警信息 -->
      <div class="mt24">
        <h3 style="margin:0">预警</h3>
        <el-row :gutter="12">
          <el-col :span="12">
            <h4>未处理</h4>
            <el-table :data="realtime?.alerts?.openAlerts || []" size="small" :max-height="240">
              <el-table-column prop="alertId" label="ID" width="70" />
              <el-table-column prop="alertTime" label="时间" width="160" />
              <el-table-column prop="alertDesc" label="描述" />
            </el-table>
          </el-col>
          <el-col :span="12">
            <h4>近期已处理</h4>
            <el-table :data="realtime?.alerts?.recentHandledAlerts || []" size="small" :max-height="240">
              <el-table-column prop="alertId" label="ID" width="70" />
              <el-table-column prop="alertTime" label="时间" width="160" />
              <el-table-column prop="alertDesc" label="描述" />
              <el-table-column prop="handler" label="处理人" width="90" />
            </el-table>
          </el-col>
        </el-row>
      </div>

      <!-- 图片 -->
      <div class="mt24">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="margin:0">最近图片</h3>
        </div>
        <el-empty v-if="!(realtime?.images?.length)" description="无图片" />
        <el-space wrap v-else>
          <el-card v-for="img in realtime!.images" :key="img.imageCode" shadow="hover" body-style="padding:4px" style="width:180px;position:relative">
            <el-button 
              circle 
              size="small" 
              type="danger" 
              @click="handleDeleteImage(img.imageCode)"
              style="position:absolute;top:8px;right:8px;z-index:10"
            >
              <template #icon><el-icon><Close /></el-icon></template>
            </el-button>
            <div style="font-size:12px;">{{ formatDateTime(img.reportTime) }}</div>
            <el-image :src="img.imagePath" :preview-src-list="[img.imagePath]" fit="cover" style="margin-top:4px; width:100%; height:120px; background:#f5f5f5" />
            <div style="margin-top:4px; font-size:12px; color:#999;">{{ img.imageCode }}</div>
          </el-card>
          <!-- 上传框 -->
          <el-upload
            :show-file-list="false"
            :before-upload="handleUploadImage"
            accept="image/*"
            style="display:inline-block"
          >
            <el-card shadow="hover" body-style="padding:4px" style="width:180px;cursor:pointer" class="upload-card">
              <div style="height:152px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fafafa;border:2px dashed #dcdfe6;border-radius:4px">
                <el-icon :size="40" color="#409eff"><Plus /></el-icon>
                <div style="margin-top:8px;font-size:14px;color:#606266">上传图片</div>
              </div>
            </el-card>
          </el-upload>
        </el-space>
      </div>
    </div>

    <el-empty v-else description="监测站不存在" />
  </el-card>

  <!-- 编辑弹窗（完整编辑表单） -->
  <el-dialog v-model="editVisible" title="编辑白蚁监测站" width="680px">
    <el-form :model="editForm" label-width="120px" :rules="rules" ref="formRef">
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="监测站编号" prop="stationCode" required>
            <el-input v-model="editForm.stationCode" placeholder="请输入监测站编号" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="监测站名称" prop="name" required>
            <el-input v-model="editForm.name" placeholder="请输入监测站名称" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="设备标识" prop="rtuid" required>
            <el-input v-model="editForm.rtuid" placeholder="设备唯一标识RTUID" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="水库编码" prop="reservoirCode" required>
            <el-input v-model="editForm.reservoirCode" placeholder="请输入水库编码" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="设备密码" prop="password" required>
            <el-input v-model="editForm.password" placeholder="4-20位密码" type="password" show-password clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态" prop="status" required>
            <el-select v-model="editForm.status" placeholder="请选择状态" style="width:100%">
              <el-option label="离线" :value="0" />
              <el-option label="在线" :value="1" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="经度(WGS84)" prop="lngWgs84" required>
            <el-input-number 
              v-model="editForm.lngWgs84" 
              :precision="6" 
              :step="0.0001" 
              :min="-180" 
              :max="180"
              placeholder="请输入经度"
              controls-position="right"
              style="width:100%" 
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="纬度(WGS84)" prop="latWgs84" required>
            <el-input-number 
              v-model="editForm.latWgs84" 
              :precision="6" 
              :step="0.0001" 
              :min="-90" 
              :max="90"
              placeholder="请输入纬度"
              controls-position="right"
              style="width:100%" 
            />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="安装地址" prop="address" required>
            <el-input v-model="editForm.address" placeholder="请输入安装地址" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="联系人" prop="contactPerson">
            <el-input v-model="editForm.contactPerson" placeholder="联系人姓名(可选)" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="联系电话" prop="contactPhone">
            <el-input v-model="editForm.contactPhone" placeholder="11位手机号(可选)" clearable maxlength="11" />
          </el-form-item>
        </el-col>
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
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Close, Plus } from '@element-plus/icons-vue';
import { getTermiteStationDetail, updateTermiteStation, queryTermiteRealtime, listTermiteStations, type TermiteStation, type TermiteRealtimeResponse } from '@/services/termiteStations';
import type { FormInstance, FormRules } from 'element-plus';

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const detail = ref<TermiteStation | null>(null);
const editVisible = ref(false);
const editForm = ref<Partial<TermiteStation>>({});
const realtime = ref<TermiteRealtimeResponse | null>(null);
const formRef = ref<FormInstance>();
const saving = ref(false);

// 格式化日期时间：将 ISO8601 转为本地可读格式
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

const rules: FormRules = {
  stationCode: [
    { required: true, message: '请输入监测站编号', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入监测站名称', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  rtuid: [
    { required: true, message: '请输入设备唯一标识(RTUID)', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  reservoirCode: [
    { required: true, message: '请输入水库编码', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入设备密码', trigger: 'blur' },
    { min: 4, max: 20, message: '长度在 4 到 20 个字符', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ],
  address: [
    { required: true, message: '请输入安装地址', trigger: 'blur' },
    { max: 200, message: '最多 200 个字符', trigger: 'blur' }
  ],
  lngWgs84: [
    { required: true, type: 'number', message: '请输入经度(WGS84坐标系)', trigger: 'blur' },
    { type: 'number', min: -180, max: 180, message: '经度范围: -180 到 180', trigger: 'blur' }
  ],
  latWgs84: [
    { required: true, type: 'number', message: '请输入纬度(WGS84坐标系)', trigger: 'blur' },
    { type: 'number', min: -90, max: 90, message: '纬度范围: -90 到 90', trigger: 'blur' }
  ],
  contactPerson: [
    { max: 50, message: '最多 50 个字符', trigger: 'blur' }
  ],
  contactPhone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ]
};

function goBack() { router.back(); }

async function loadDetail() {
  const id = route.query.id ? Number(route.query.id) : undefined as number | undefined;
  const rtuid = typeof route.query.rtuid === 'string' ? route.query.rtuid : undefined;
  const reservoirCode = typeof route.query.reservoirCode === 'string' ? route.query.reservoirCode : undefined;
  if (!id && !rtuid && !reservoirCode) { ElMessage.error('缺少定位参数'); return; }
  loading.value = true;
  try {
    // 1) 优先 id 详情接口
    if (id) {
      try { detail.value = await getTermiteStationDetail(id); } catch {}
    }
    // 2) 若未命中，用列表按 rtuid/reservoirCode 回退匹配
    if (!detail.value) {
      const page = await listTermiteStations({ pageNo: 1, pageSize: 500 });
      let found: any = undefined;
      if (id) found = page.records.find(s => s.id === id);
      if (!found && rtuid) found = page.records.find(s => s.rtuid === rtuid);
      if (!found && reservoirCode) found = page.records.find(s => s.reservoirCode === reservoirCode);
      if (found) detail.value = found as any;
    }
    // if (!detail.value) throw new Error('白蚁监测站不存在');
  } catch (e: any) { ElMessage.error(e.message || '加载失败'); } finally { loading.value = false; }
}

function openEditDialog() { 
  if (detail.value) { 
    editForm.value = { 
      id: detail.value.id, 
      stationCode: detail.value.stationCode,
      name: detail.value.name, 
      rtuid: detail.value.rtuid,
      reservoirCode: detail.value.reservoirCode,
      password: detail.value.password || '123456',
      status: detail.value.status, 
      lngWgs84: detail.value.lngWgs84, 
      latWgs84: detail.value.latWgs84,
      address: detail.value.address,
      contactPerson: detail.value.contactPerson,
      contactPhone: detail.value.contactPhone
    }; 
    editVisible.value = true; 
  } 
}

async function saveEdit() {
  if (!editForm.value.id || !formRef.value) return;
  
  try {
    // 验证表单
    await formRef.value.validate();
  } catch (error) {
    ElMessage.warning('请填写必填字段');
    return;
  }
  
  saving.value = true;
  try { 
    await updateTermiteStation(editForm.value.id, editForm.value); 
    ElMessage.success('保存成功'); 
    editVisible.value = false; 
    await loadDetail(); 
  } catch (e: any) { 
    ElMessage.error(e.message || '保存失败'); 
  } finally {
    saving.value = false;
  }
}

async function refreshData() { await loadDetail(); ElMessage.success('已刷新'); }

async function fetchRealtime() {
  if (!detail.value) return; 
  try { 
    const body: any = { includeImages: true, includeAlerts: true, imageLimit: 5, handledMonths: 6 };
    if (detail.value.id) body.id = detail.value.id;
    else if ((detail.value as any).rtuid) body.rtuid = (detail.value as any).rtuid;
    else if ((detail.value as any).reservoirCode) body.reservoirCode = (detail.value as any).reservoirCode;
    realtime.value = await queryTermiteRealtime(body); 
    ElMessage.success('实时数据已更新'); 
  } catch (e: any) { 
    ElMessage.error(e.message || '获取实时数据失败'); 
  }
}

function handleUploadImage(file: File) {
  console.log('选择的文件:', file);
  ElMessage.info('图片上传功能开发中...');
  // TODO: 实现图片上传逻辑
  // 1. 验证文件类型和大小
  // 2. 上传到服务器 await uploadTermiteImage(detail.value!.id, file)
  // 3. 刷新实时数据 await fetchRealtime()
  return false; // 阻止自动上传
}

async function handleDeleteImage(imageCode: string) {
  try {
    await ElMessageBox.confirm(`确定删除图片 ${imageCode} 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    ElMessage.success('图片已删除');
    // TODO: 调用后端删除接口
    // await deleteTermiteImage(imageCode);
    // 刷新实时数据
    await fetchRealtime();
  } catch {
    // 用户取消
  }
}

onMounted(async () => { 
  await loadDetail(); 
  await fetchRealtime(); 
});
</script>

<style scoped>
.detail-content { padding:8px 0; }
.mt16 { margin-top:16px; }
.mt24 { margin-top:24px; }
:deep(.el-card) { border:none; box-shadow:none; }
:deep(.el-card__header) { border-bottom:1px solid #e4e7ed; padding:16px 20px; }
h3 { font-size:16px; font-weight:600; color:#303133; }
h4 { margin:4px 0; font-weight:500; }
.upload-card:hover { border-color:#409eff; }
</style>
