<!--
  白蚁测站管理页面
  功能：列表展示、新增、编辑、删除测站，查看历史记录
-->
<template>
  <el-card :shadow="'never'" :bordered="false">
    <template #header>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span>白蚁监测站管理</span>
        <el-space>
          <el-button type="primary" @click="openEdit()">新增监测站</el-button>
          <el-button @click="load">刷新</el-button>
        </el-space>
      </div>
    </template>

    <!-- 查询条件 -->
    <el-form :model="query" label-width="96px" inline class="query-form">
      <el-form-item label="监测站编号"><el-input v-model="query.stationCode" placeholder="stationCode" clearable /></el-form-item>
      <el-form-item label="名称"><el-input v-model="query.name" placeholder="名称" clearable /></el-form-item>
      <el-form-item label="水库编码"><el-input v-model="query.reservoirCode" placeholder="reservoirCode" clearable /></el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" placeholder="全部" clearable style="width:120px">
          <el-option label="离线" :value="0" />
          <el-option label="在线" :value="1" />
        </el-select>
      </el-form-item>
      <el-form-item label="联系人"><el-input v-model="query.contactPerson" placeholder="联系人" clearable /></el-form-item>
      <el-form-item>
        <el-space>
          <el-button type="primary" @click="onSearch">搜索</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-space>
      </el-form-item>
    </el-form>

    <!-- 统计卡片 -->
    <el-row :gutter="8" style="margin-bottom:8px">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card-compact" body-style="padding:8px 12px">
          <div class="stat-compact">
            <span class="stat-compact-label">测站总数</span>
            <span class="stat-compact-value">{{ total }}</span>
            <el-icon class="stat-compact-icon" color="#409eff"><Odometer /></el-icon>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card-compact" body-style="padding:8px 12px">
          <div class="stat-compact">
            <span class="stat-compact-label">有白蚁</span>
            <span class="stat-compact-value">{{ statsWithTermites }}</span>
            <el-icon class="stat-compact-icon" color="#f56c6c"><Warning /></el-icon>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card-compact" body-style="padding:8px 12px">
          <div class="stat-compact">
            <span class="stat-compact-label">无白蚁</span>
            <span class="stat-compact-value">{{ statsNoTermites }}</span>
            <el-icon class="stat-compact-icon" color="#67c23a"><CircleCheck /></el-icon>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card-compact" body-style="padding:8px 12px">
          <div class="stat-compact">
            <span class="stat-compact-label">无数据</span>
            <span class="stat-compact-value">{{ statsNoData }}</span>
            <el-icon class="stat-compact-icon" color="#909399"><QuestionFilled /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 列表 -->
    <el-table :data="records" :style="{ marginTop: '8px' }" max-height="calc(100vh - 380px)" size="default" v-loading="loading">
      <el-table-column type="index" label="序号" width="70" :index="getIndex" />
      <el-table-column prop="stationCode" label="监测站编号" min-width="150" />
      <el-table-column prop="name" label="名称" min-width="180" />
      <el-table-column prop="rtuid" label="RTUID" min-width="150" />
      <el-table-column prop="reservoirCode" label="水库编码" min-width="130" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-button :type="row.status===1?'success':'info'" plain size="small" @click="toggleStatus(row)">
            {{ row.status===1? '在线':'离线' }}
          </el-button>
        </template>
      </el-table-column>
        <!-- 白蚁预警列移除，统一以后端分页返回的 termiteStatus 展示 -->
        <el-table-column prop="termiteStatus" label="白蚁状态" width="110">
          <template #default="scope">
            <el-tag :type="scope.row.termiteStatus === 1 ? 'danger' : 'success'">
              {{ scope.row.termiteStatus === 1 ? '有白蚁' : '正常' }}
            </el-tag>
          </template>
        </el-table-column>
      <el-table-column prop="lngWgs84" label="经度(WGS84)" min-width="140" />
      <el-table-column prop="latWgs84" label="纬度(WGS84)" min-width="140" />
      <el-table-column label="详细" width="120" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" plain size="small" @click="viewDetail(row)">详细信息</el-button>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager-wrapper">
      <el-pagination
        background
        layout="prev, pager, next, jumper, sizes, total"
        :total="total"
        v-model:current-page="query.pageNo"
        v-model:page-size="query.pageSize"
        @current-change="load"
        @size-change="load"
        :page-sizes="[10,20,30,50]"
      />
    </div>
  </el-card>

  <!-- 新增/编辑弹窗 -->
  <el-dialog v-model="editVisible" :title="form.id? '编辑白蚁监测站':'新增白蚁监测站'" width="680px">
    <el-form :model="form" label-width="120px" :rules="rules" ref="formRef">
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="监测站编号" prop="stationCode" required>
            <el-input v-model="form.stationCode" placeholder="请输入监测站编号" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="监测站名称" prop="name" required>
            <el-input v-model="form.name" placeholder="请输入监测站名称" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="设备标识" prop="rtuid" required>
            <el-input v-model="form.rtuid" placeholder="设备唯一标识RTUID" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="水库编码" prop="reservoirCode" required>
            <el-input v-model="form.reservoirCode" placeholder="请输入水库编码" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="设备密码" prop="password" required>
            <el-input v-model="form.password" placeholder="4-20位密码" type="password" show-password clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态" prop="status" required>
            <el-select v-model="form.status" placeholder="请选择状态" style="width:100%">
              <el-option label="离线" :value="0" />
              <el-option label="在线" :value="1" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="经度(WGS84)" prop="lngWgs84" required>
            <el-input-number 
              v-model="form.lngWgs84" 
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
              v-model="form.latWgs84" 
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
            <el-input v-model="form.address" placeholder="请输入安装地址" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="联系人" prop="contactPerson">
            <el-input v-model="form.contactPerson" placeholder="联系人姓名(可选)" clearable />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="联系电话" prop="contactPhone">
            <el-input v-model="form.contactPhone" placeholder="11位手机号(可选)" clearable maxlength="11" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-space>
        <el-button @click="editVisible=false">取消</el-button>
        <el-button type="primary" @click="save" :loading="saving">保存</el-button>
      </el-space>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus';
import { Odometer, Warning, CircleCheck, QuestionFilled } from '@element-plus/icons-vue';
import { listTermiteStations, createTermiteStation, updateTermiteStation, deleteTermiteStation, queryTermiteRealtime, type TermiteStation, type TermiteStationQuery } from '@/services/termiteStations';

// 扩展 TermiteStation 类型以包含 isAlert 属性
interface TermiteStationWithAlert extends TermiteStation {
  isAlert?: number;
}

const router = useRouter();
const loading = ref(false);
const saving = ref(false);
const records = ref<TermiteStationWithAlert[]>([]);
const total = ref(0);
const query = reactive<TermiteStationQuery>({ pageNo: 1, pageSize: 20 });

const editVisible = ref(false);
const form = ref<Partial<TermiteStation>>({});
const formRef = ref<FormInstance>();

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

function getIndex(index: number) { return (query.pageNo! - 1) * (query.pageSize!) + index + 1; }

async function load() {
  loading.value = true;
  try {
    const page = await listTermiteStations({ ...query });
    records.value = page.records;
    total.value = page.total;
    // 统计直接根据分页返回的 termiteStatus 字段
  } catch (e: any) {
    ElMessage.error(e.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

// 预警实时查询移除，统计统一与 termiteStatus 对齐

// 统计数据
const statsWithTermites = computed(() => records.value.filter(s => s.termiteStatus === 1).length);
const statsNoTermites = computed(() => records.value.filter(s => s.termiteStatus === 0).length);
const statsNoData = computed(() => records.value.filter(s => s.termiteStatus === undefined).length);

function onSearch() { query.pageNo = 1; load(); }
function onReset() { Object.assign(query, { stationCode: undefined, name: undefined, rtuid: undefined, reservoirCode: undefined, status: undefined, contactPerson: undefined, contactPhone: undefined, pageNo: 1, pageSize: query.pageSize }); load(); }

function viewDetail(row: TermiteStation) {
  router.push({ 
    path: '/station-detail', 
    query: { 
      id: row.id, 
      rtuid: (row as any).rtuid, 
      reservoirCode: (row as any).reservoirCode 
    } 
  });
}

function openEdit(row?: TermiteStation) {
  if (row) {
    // 编辑模式：复制现有数据
    form.value = { ...row };
  } else {
    // 新增模式：初始化默认值
    form.value = {
      status: 0,
      password: '123456'  // 默认密码
    };
  }
  editVisible.value = true;
  // 重置表单验证状态
  setTimeout(() => {
    formRef.value?.clearValidate();
  }, 100);
}

async function save() {
  if (!formRef.value) return;
  
  try {
    // 验证表单
    await formRef.value.validate();
  } catch (error) {
    ElMessage.warning('请填写必填字段');
    return;
  }
  
  saving.value = true;
  try {
    if (form.value.id) {
      await updateTermiteStation(form.value.id, form.value);
      ElMessage.success('更新成功');
    } else {
      await createTermiteStation(form.value);
      ElMessage.success('新增成功');
    }
    editVisible.value = false;
    load();
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(row: TermiteStation) {
  const newStatus = row.status === 1 ? 0 : 1;
  const statusText = newStatus === 1 ? '在线' : '离线';
  try {
    await ElMessageBox.confirm(`确认将状态改为 ${statusText} 吗？`, '提示', { confirmButtonText: '确定', cancelButtonText: '取消' });
    await updateTermiteStation(row.id, { status: newStatus });
    ElMessage.success('状态已更新');
    load();
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '状态更新失败');
  }
}

async function onDelete(row: TermiteStation) {
  try {
    await ElMessageBox.confirm('确认删除该监测站？', '提示', { confirmButtonText: '确定', cancelButtonText: '取消' });
    await deleteTermiteStation(row.id);
    ElMessage.success('已删除');
    load();
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '删除失败');
  }
}

load();
</script>

<style scoped>
.query-form { margin-bottom: 4px; }
.pager-wrapper { display:flex; justify-content:flex-end; margin-top:8px; }
:deep(.el-card) { border:none; box-shadow:none; height: calc(100vh - 100px); display: flex; flex-direction: column; }
:deep(.el-card__header) { border-bottom:1px solid #e4e7ed; padding:12px 16px; flex-shrink: 0; }
:deep(.el-card__body) { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

/* 统计卡片样式 - 极简紧凑版 */
.stat-card-compact {
  border: 1px solid #ebeef5;
  height: auto;
}
.stat-compact {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
}
.stat-compact-label {
  font-size: 13px;
  color: #606266;
  flex-shrink: 0;
}
.stat-compact-value {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  flex: 1;
  line-height: 1;
}
.stat-compact-icon {
  font-size: 18px;
  flex-shrink: 0;
}

/* 必填字段标记样式 */
:deep(.el-form-item.is-required:not(.is-no-asterisk) > .el-form-item__label:before) {
  content: '*';
  color: #f56c6c;
  margin-right: 4px;
}

/* 表单输入框聚焦样式 */
:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

/* 对话框样式优化 */
:deep(.el-dialog__body) {
  padding-top: 12px;
  padding-bottom: 12px;
}
</style>
