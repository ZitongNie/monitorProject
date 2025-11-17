<template>
  <el-card>
    <template #header>用户管理（管理员）</template>
    <el-space>
      <el-button type="primary" @click="openEdit()">新增用户</el-button>
      <el-button @click="load">刷新</el-button>
    </el-space>
    <el-table :data="items" style="margin-top:12px;" height="520">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="role" label="角色" width="120" />
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="editVisible" :title="form.id? '编辑用户':'新增用户'">
    <el-form :model="form" label-width="88px">
      <el-form-item label="用户名"><el-input v-model="form.username" /></el-form-item>
      <el-form-item label="密码" v-if="!form.id"><el-input v-model="form.password" type="password" /></el-form-item>
      <el-form-item label="角色"><el-select v-model="form.role"><el-option label="管理员" value="admin"/><el-option label="普通用户" value="user"/></el-select></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="editVisible=false">取消</el-button>
      <el-button type="primary" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { listUsers, createUser, updateUser, deleteUser, type User } from '../services/users';
import { ElMessage, ElMessageBox } from 'element-plus';

const items = ref<User[]>([]);
const editVisible = ref(false);
const form = ref<any>({ role: 'user' });

async function load() { items.value = await listUsers(); }
function openEdit(row?: User) { form.value = row? { ...row } : { role: 'user' }; editVisible.value = true; }
async function save() {
  if (form.value.id) await updateUser(form.value.id, form.value);
  else await createUser(form.value);
  editVisible.value = false; await load(); ElMessage.success('已保存');
}
async function onDelete(row: User) { await ElMessageBox.confirm('确认删除？','提示'); await deleteUser(row.id); await load(); ElMessage.success('已删除'); }

load();
</script>

<style scoped>
</style>
