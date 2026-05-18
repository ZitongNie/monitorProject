<template>
  <el-card :shadow="'never'" :bordered="false">
    <template #header>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span>电子界桩管理</span>
        <el-space>
          <el-button type="primary" @click="openEdit()">新增界桩</el-button>
          <el-button @click="load">刷新</el-button>
        </el-space>
      </div>
    </template>

    <!-- 查询条件 -->
    <el-form :model="query" label-width="96px" inline class="query-form" @keyup.enter="onSearch">
      <el-form-item label="关键词"><el-input v-model="query.keyword" placeholder="编号/名称/地址" clearable /></el-form-item>
      <el-form-item label="编号"><el-input v-model="query.boundaryCode" placeholder="boundaryCode" clearable /></el-form-item>
      <el-form-item label="设备ID"><el-input v-model="query.deviceId" placeholder="deviceId" clearable /></el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" placeholder="全部" clearable style="width:120px">
          <el-option label="离线" :value="0" />
          <el-option label="在线" :value="1" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-space>
          <el-button type="primary" @click="onSearch" :disabled="loading">搜索</el-button>
          <el-button @click="onReset" :disabled="loading">重置</el-button>
        </el-space>
      </el-form-item>
    </el-form>

    <!-- 列表 -->
    <el-table :data="records" :style="{ marginTop: '8px' }" max-height="calc(100vh - 380px)" size="default" v-loading="loading">
      <el-table-column type="index" label="序号" width="70" :index="getIndex" />
      <el-table-column prop="boundaryCode" label="界桩编号" min-width="150" />
      <el-table-column prop="name" label="名称" min-width="180" />
      <el-table-column prop="deviceId" label="设备ID" min-width="150" />
      <el-table-column prop="address" label="安装地址" min-width="200" />
      <el-table-column prop="material" label="材质" min-width="120" />
      <el-table-column prop="height" label="高度(m)" width="110" />
      <el-table-column prop="buryDepth" label="埋深(m)" width="110" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-button :type="row.status===1?'success':'info'" plain size="small" @click="toggleStatus(row)">
            {{ row.status===1? '在线':'离线' }}
          </el-button>
        </template>
      </el-table-column>
      <el-table-column prop="lngWgs84" label="经度(WGS84)" min-width="140" />
      <el-table-column prop="latWgs84" label="纬度(WGS84)" min-width="140" />
      <el-table-column label="详细" width="220" fixed="right">
        <template #default="{ row }">
          <el-space>
            <el-button type="primary" plain size="small" @click="toDetail(row)">实时数据</el-button>
            <el-button plain size="small" @click="openEdit(row)">编辑</el-button>
          </el-space>
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
        v-model:current-page="query.pageNum"
        v-model:page-size="query.pageSize"
        @current-change="load"
        @size-change="load"
        :page-sizes="[10,20,30,50]"
      />
    </div>
  </el-card>

  <!-- 新增/编辑弹窗 -->
  <el-dialog v-model="editVisible" :title="form.id? '编辑电子界桩':'新增电子界桩'" width="1020px">
    <el-form :model="form" label-width="140px" :rules="rules" ref="formRef" @keyup.enter="save">
      <el-row :gutter="12">
        <el-col :span="12"><el-form-item label="界桩编号" prop="boundaryCode" required><el-input v-model="form.boundaryCode" size="large" clearable /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="界桩名称" prop="name" required><el-input v-model="form.name" size="large" clearable /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="设备唯一标识" prop="deviceId" required><el-input v-model="form.deviceId" size="large" clearable /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="设备密码" prop="password" required><el-input v-model="form.password" size="large" type="password" show-password clearable /></el-form-item></el-col>
        <el-col :span="24"><el-form-item label="安装地址" prop="address"><el-input v-model="form.address" size="large" clearable /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="材质" prop="material"><el-input v-model="form.material" size="large" clearable /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="高度(m)" prop="height"><el-input-number v-model="form.height" size="large" :min="0" :step="0.1" :precision="2" controls-position="right" style="width:100%" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="埋深(m)" prop="buryDepth"><el-input-number v-model="form.buryDepth" size="large" :min="0" :step="0.1" :precision="2" controls-position="right" style="width:100%" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="状态" prop="status" required><el-select v-model="form.status" size="large" style="width:100%"><el-option label="离线" :value="0" /><el-option label="在线" :value="1" /></el-select></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="经度(WGS84)" prop="lngWgs84" required><el-input-number v-model="form.lngWgs84" size="large" :precision="6" :step="0.0001" :min="-180" :max="180" controls-position="right" style="width:100%" /></el-form-item></el-col>
        <el-col :span="12"><el-form-item label="纬度(WGS84)" prop="latWgs84" required><el-input-number v-model="form.latWgs84" size="large" :precision="6" :step="0.0001" :min="-90" :max="90" controls-position="right" style="width:100%" /></el-form-item></el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-space>
        <el-button @click="editVisible=false" :disabled="saving">取消</el-button>
        <el-button type="primary" @click="save" :loading="saving" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</el-button>
      </el-space>
    </template>
  </el-dialog>

  <!-- 详情采用独立页面，不再使用弹窗 -->
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus';
import {
  listElectronicBoundaries as listBoundaries,
  createElectronicBoundary as createBoundary,
  updateElectronicBoundary as updateBoundary,
  deleteElectronicBoundary as deleteBoundary,
  type ElectronicBoundary as ElectronicBoundaryDTO,
  type PageResult as PageResp,
  type ElectronicBoundaryQuery as BoundaryQuery
} from '@/services/electronicBoundaries';

const loading = ref(false);
const saving = ref(false);
const records = ref<ElectronicBoundaryDTO[]>([]);
const total = ref(0);
const query = reactive<BoundaryQuery>({ pageNum: 1, pageSize: 20 });

const editVisible = ref(false);
const form = ref<Partial<ElectronicBoundaryDTO>>({ status: 0 });
const formRef = ref<FormInstance>();

const rules: FormRules = {
  boundaryCode: [{ required: true, message: '请输入界桩编号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入界桩名称', trigger: 'blur' }],
  deviceId: [{ required: true, message: '请输入设备唯一标识', trigger: 'blur' }],
  password: [{ required: true, message: '请输入设备密码', trigger: 'blur' }],
  lngWgs84: [
    { required: true, type: 'number', message: '请输入经度(WGS84)', trigger: 'blur' },
    { type: 'number', min: -180, max: 180, message: '经度范围: -180 到 180', trigger: 'blur' }
  ],
  latWgs84: [
    { required: true, type: 'number', message: '请输入纬度(WGS84)', trigger: 'blur' },
    { type: 'number', min: -90, max: 90, message: '纬度范围: -90 到 90', trigger: 'blur' }
  ],
  height: [ { type: 'number', min: 0, message: '高度必须非负', trigger: 'blur' } ]
};

function getIndex(index: number) { return (query.pageNum! - 1) * (query.pageSize!) + index + 1; }

async function load() {
  loading.value = true;
  try {
    const page: PageResp<ElectronicBoundaryDTO> = await listBoundaries({ ...query });
    records.value = page.list; total.value = page.total;
  } catch (e: any) { ElMessage.error(e.message || '加载失败'); }
  finally { loading.value = false; }
}
function onSearch() { query.pageNum = 1; load(); }
function onReset() { Object.assign(query, { keyword: undefined, boundaryCode: undefined, deviceId: undefined, status: undefined, pageNum: 1, pageSize: query.pageSize }); load(); }

function openEdit(row?: ElectronicBoundaryDTO) {
  form.value = row ? { ...row } : { status: 0 };
  editVisible.value = true; setTimeout(() => formRef.value?.clearValidate(), 50);
}

async function save() {
  if (!formRef.value) return;
  try { await formRef.value.validate(); } catch { ElMessage.warning('请填写必填字段'); return; }
  saving.value = true;
  try {
    if (form.value.id) { await updateBoundary(form.value.id, form.value); ElMessage.success('更新成功'); }
    else { await createBoundary(form.value); ElMessage.success('新增成功'); }
    editVisible.value = false; load();
  } catch (e: any) { ElMessage.error(e.message || '保存失败'); }
  finally { saving.value = false; }
}

async function toggleStatus(row: ElectronicBoundaryDTO) {
  const newStatus = row.status === 1 ? 0 : 1;
  const statusText = newStatus === 1 ? '在线' : '离线';
  try {
    await ElMessageBox.confirm(`确认将状态改为 ${statusText} 吗？`, '提示');
    await updateBoundary(row.id, { status: newStatus });
    ElMessage.success('状态已更新'); load();
  } catch (e: any) { if (e !== 'cancel') ElMessage.error(e.message || '状态更新失败'); }
}

async function onDelete(row: ElectronicBoundaryDTO) {
  try {
    await ElMessageBox.confirm('确认删除该界桩？', '提示');
    await deleteBoundary(row.id); ElMessage.success('已删除'); load();
  } catch (e: any) { if (e !== 'cancel') ElMessage.error(e.message || '删除失败'); }
}

const router = useRouter();
function toDetail(row: ElectronicBoundaryDTO) { router.push({ path: '/boundary-detail', query: { id: row.id, deviceId: row.deviceId } }); }

load();
</script>

<style scoped>
.query-form { margin-bottom: 4px; }
.pager-wrapper { display:flex; justify-content:flex-end; margin-top:8px; }
:deep(.el-card) { border:none; box-shadow:none; height: calc(100vh - 100px); display: flex; flex-direction: column; }
:deep(.el-card__header) { border-bottom:1px solid #e4e7ed; padding:12px 16px; flex-shrink: 0; }

@media (max-width: 768px) {
  .query-form {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 0;
  }

  .query-form :deep(.el-form-item) {
    margin-right: 0;
    width: 100%;
  }

  .query-form :deep(.el-form-item__content) {
    width: 100%;
  }

  .pager-wrapper {
    justify-content: center;
    overflow-x: auto;
    padding-bottom: 4px;
  }
}
</style>
