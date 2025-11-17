<template>
  <el-card>
    <template #header>电子界桩</template>
    <el-space wrap>
      <el-button type="primary" @click="openEdit()">新增</el-button>
      <el-button @click="load">刷新</el-button>
    </el-space>
    <el-table :data="items" style="margin-top:12px;" height="520">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="code" label="编号" />
      <el-table-column prop="lat" label="纬度" width="120" />
      <el-table-column prop="lng" label="经度" width="120" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }"><el-tag :type="row.status==='warn'?'danger':'success'">{{ row.status }}</el-tag></template>
      </el-table-column>
      <el-table-column label="操作" width="260">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" @click="openHistory(row)">历史</el-button>
          <el-button size="small" type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="editVisible" :title="form.id? '编辑界桩':'新增界桩'">
    <el-form :model="form" label-width="88px">
      <el-form-item label="编号"><el-input v-model="form.code" /></el-form-item>
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
import { listPiles, createPile, updatePile, deletePile, getPileHistory, type Pile } from '@/services/piles';
import { ElMessage, ElMessageBox } from 'element-plus';
import { use } from 'echarts/core';
import VChart from 'vue-echarts';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent]);

const items = ref<Pile[]>([]);
const editVisible = ref(false);
const form = ref<Partial<Pile>>({ status: 'safe', lat: 23.1, lng: 113.26 });
const historyVisible = ref(false);
const lineOption = ref<any>({ title: { text: '状态变化(1=预警,0=安全)' }, xAxis: { type: 'category', data: [] }, yAxis: { type:'value' }, series: [{ type:'line', data: [] }] });

async function load() { items.value = await listPiles(); }
function openEdit(row?: Pile) { form.value = row? { ...row } : { status: 'safe', lat: 23.1, lng: 113.26 }; editVisible.value = true; }
async function save() {
  if (form.value.id) await updatePile(form.value.id, form.value);
  else await createPile(form.value);
  editVisible.value = false; await load(); ElMessage.success('已保存');
}
async function onDelete(row: Pile) { await ElMessageBox.confirm('确认删除？','提示'); await deletePile(row.id); await load(); ElMessage.success('已删除'); }

load();

async function openHistory(row: Pile) {
  const hist = await getPileHistory(row.id);
  lineOption.value.xAxis.data = hist.map(h => new Date(h.t).toLocaleTimeString());
  lineOption.value.series[0].data = hist.map(h => h.status === 'warn' ? 1 : 0);
  historyVisible.value = true;
}
</script>

<style scoped>
.chart { height: 360px; }
</style>
