<!--
  白蚁测站管理页面
  功能：列表展示、新增、编辑、删除测站，查看历史记录
-->
<template>
  <el-card :shadow="'never'" :bordered="false">
    <template #header>白蚁测站</template>
    <!-- 操作按钮 -->
    <el-space wrap>
      <el-button type="primary" @click="openEdit()">新增</el-button>
      <el-button @click="load">刷新</el-button>
    </el-space>
    <!-- 测站列表表格 -->
    <el-table :data="items" :style="{ marginTop: '12px' }" height="520">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="lat" label="纬度" width="120" />
      <el-table-column prop="lng" label="经度" width="120" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }"><el-tag :type="row.status==='warn'?'danger':'success'">{{ row.status }}</el-tag></template>
      </el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button size="small" @click="openHistory(row)">历史</el-button>
          <el-button size="small" type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>

      <el-table-column label="详细信息" width="140">
        <template #default="{ row }">
          <el-button size="small" type="primary" plain @click="viewDetail(row)">查看详细信息</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <!-- 新增/编辑测站弹窗 -->
  <el-dialog v-model="editVisible" :title="form.id? '编辑测站':'新增测站'">
    <el-form :model="form" label-width="88px">
      <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
      <el-form-item label="纬度"><el-input v-model.number="form.lat" /></el-form-item>
      <el-form-item label="经度"><el-input v-model.number="form.lng" /></el-form-item>
      <el-form-item label="状态"><el-select v-model="form.status"><el-option label="安全" value="safe" /><el-option label="预警" value="warn" /></el-select></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="editVisible=false">取消</el-button>
      <el-button type="primary" @click="save">保存</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="historyVisible" title="历史曲线" width="720px">
    <v-chart class="chart" :option="lineOption" autoresize />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { listStations, createStation, updateStation, deleteStation, getStationHistory, type Station } from '@/services/stations';
import { ElMessage, ElMessageBox } from 'element-plus';
import { use } from 'echarts/core';
import VChart from 'vue-echarts';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent]);

const router = useRouter();
const items = ref<Station[]>([]);
const editVisible = ref(false);
const form = ref<Partial<Station>>({ status: 'safe', lat: 23.1, lng: 113.26 });
const historyVisible = ref(false);
const lineOption = ref<any>({ title: { text: '状态变化(1=预警,0=安全)' }, xAxis: { type: 'category', data: [] }, yAxis: { type:'value' }, series: [{ type:'line', data: [] }] });

async function load() { items.value = await listStations(); }
function viewDetail(row: Station) { router.push({ path: '/station-detail', query: { id: row.id } }); }
function openEdit(row?: Station) { form.value = row? { ...row } : { status: 'safe', lat: 23.1, lng: 113.26 }; editVisible.value = true; }
async function save() {
  if (form.value.id) await updateStation(form.value.id, form.value);
  else await createStation(form.value);
  editVisible.value = false; await load(); ElMessage.success('已保存');
}
async function onDelete(row: Station) { await ElMessageBox.confirm('确认删除？','提示'); await deleteStation(row.id); await load(); ElMessage.success('已删除'); }

load();

async function openHistory(row: Station) {
  const hist = await getStationHistory(row.id);
  lineOption.value.xAxis.data = hist.map((h: any) => new Date(h.t).toLocaleTimeString());
  lineOption.value.series[0].data = hist.map((h: any) => h.status === 'warn' ? 1 : 0);
  historyVisible.value = true;
}
</script>

<style scoped>
.chart { height: 360px; }

:deep(.el-card) {
  border: none;
  box-shadow: none;
}

:deep(.el-card__header) {
  border-bottom: 1px solid #e4e7ed;
  padding: 16px 20px;
}
</style>
