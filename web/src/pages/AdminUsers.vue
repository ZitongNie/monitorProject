<!--
  用户管理页面（管理员专用）
  功能：用户列表查询(支持按用户名/角色/状态筛选)、分页、新增、编辑、删除、状态切换
  权限：仅管理员可访问
-->
<template>
  <el-card>
    <template #header>用户管理（管理员）</template>
    
    <!-- 搜索栏：支持按用户名、角色、状态筛选 -->
    <el-form :inline="true" :model="searchForm" style="margin-bottom:12px;">
      <el-form-item label="用户名">
        <el-input v-model.trim="searchForm.username" placeholder="模糊搜索" clearable style="width:160px;" />
      </el-form-item>
      <el-form-item label="角色">
        <el-select v-model="searchForm.role" placeholder="全部" clearable style="width:120px;">
          <el-option label="管理员" value="admin"/>
          <el-option label="普通用户" value="user"/>
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="searchForm.status" placeholder="全部" clearable style="width:120px;">
          <el-option label="正常" :value="1"/>
          <el-option label="禁用" :value="0"/>
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 操作按钮 -->
    <el-space>
      <el-button type="primary" @click="openEdit()">新增用户</el-button>
      <el-button @click="load">刷新</el-button>
    </el-space>
    
    <!-- 用户列表表格 -->
    <el-table :data="items" style="margin-top:12px;width:100%;" height="580">
      <el-table-column label="序号" width="80" type="index" :index="getIndex" />
      <el-table-column prop="username" label="用户名" min-width="120" />
      <el-table-column prop="realName" label="姓名" min-width="120" />
      <el-table-column prop="phone" label="手机号" min-width="140" />
      <el-table-column prop="role" label="角色" min-width="100">
        <template #default="{ row }">{{ row.role==='admin' ? '管理员' : '普通用户' }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="120">
        <template #default="{ row }">
          <el-button 
            size="small" 
            :type="row.status===1?'success':'info'"
            @click="toggleStatus(row)"
          >
            {{ row.status===1?'正常':'禁用' }}
          </el-button>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页组件 -->
    <el-pagination
      v-model:current-page="pagination.pageNum"
      v-model:page-size="pagination.pageSize"
      :total="pagination.total"
      :page-sizes="[10, 20, 50, 100]"
      layout="total, sizes, prev, pager, next, jumper"
      style="margin-top:16px;justify-content:flex-end;"
      @current-change="load"
      @size-change="load"
      :prev-text="'上一页'"
      :next-text="'下一页'"
    />
  </el-card>

  <!-- 新增/编辑用户弹窗 -->
  <el-dialog v-model="editVisible" :title="form.id? '编辑用户':'新增用户'" width="540px">
    <el-form :model="form" :rules="formRules" ref="formRef" label-width="88px">
      <el-form-item label="用户名" prop="username">
        <el-input v-model.trim="form.username" :disabled="!!form.id" placeholder="1-50 字符" />
        <div v-if="form.id" style="font-size:12px;color:#909399;margin-top:4px;">用户名不可修改</div>
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input v-model="form.password" type="password" :placeholder="form.id ? '留空则不修改' : '必填，≥6 位'" show-password />
      </el-form-item>
      <el-form-item label="真实姓名">
        <el-input v-model.trim="form.realName" placeholder="可选，≤50 字符" />
      </el-form-item>
      <el-form-item label="手机号" prop="phone">
        <el-input v-model.trim="form.phone" placeholder="可选，11 位手机号" />
      </el-form-item>
      <el-form-item label="角色" prop="role">
        <el-select v-model="form.role" style="width:100%">
          <el-option label="管理员" value="admin"/>
          <el-option label="普通用户" value="user"/>
        </el-select>
      </el-form-item>
      <el-form-item label="角色描述">
        <el-input v-model.trim="form.roleDesc" type="textarea" :rows="2" placeholder="可选，≤200 字符" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="form.status">
          <el-radio :label="1">正常</el-radio>
          <el-radio :label="0">禁用</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="editVisible=false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { listUsers, createUser, updateUser, deleteUser, getUserDetail, type User } from '../services/users';
import { ElMessage, ElMessageBox } from 'element-plus';

// 用户列表数据
const items = ref<User[]>([]);
const editVisible = ref(false);
const saving = ref(false);
const formRef = ref();
const form = ref<any>({ role: 'user', status: 1 });

// 搜索表单
const searchForm = ref<{ username?: string; role?: 'admin'|'user'; status?: 0|1 }>({});

// 分页信息
const pagination = ref({ pageNum: 1, pageSize: 10, total: 0, pages: 0 });

// 表单验证规则
const formRules: any = {
  username: [
    { required: true, message: '用户名不能为空', trigger: 'blur' },
    { min: 1, max: 50, message: '用户名长度 1-50', trigger: 'blur' }
  ],
  password: [
    { validator: (_: any, v: string, cb: any) => {
      if (!form.value.id && !v) return cb(new Error('密码不能为空'));
      if (v && v.length < 6) return cb(new Error('密码至少 6 位'));
      cb();
    }, trigger: 'blur' }
  ],
  phone: [
    { validator: (_: any, v: string, cb: any) => {
      if (!v) return cb();
      /^1\d{10}$/.test(v) ? cb() : cb(new Error('手机号格式不正确'));
    }, trigger: 'blur' }
  ],
  role: [{ required: true, message: '角色不能为空', trigger: 'change' }],
  status: [{ required: true, message: '状态不能为空', trigger: 'change' }]
};

// 计算分页序号(跨页连续编号)
function getIndex(index: number) {
  return (pagination.value.pageNum - 1) * pagination.value.pageSize + index + 1;
}

// 加载用户列表(带搜索和分页)
async function load() {
  const result = await listUsers({
    username: searchForm.value.username,
    role: searchForm.value.role,
    status: searchForm.value.status,
    pageNum: pagination.value.pageNum,
    pageSize: pagination.value.pageSize
  });
  items.value = result.list;
  pagination.value.total = result.total;
  pagination.value.pages = result.pages;
}

// 执行搜索(重置到第一页)
function onSearch() {
  pagination.value.pageNum = 1;
  load();
}

// 重置搜索条件
function onReset() {
  searchForm.value = {};
  pagination.value.pageNum = 1;
  load();
}

// 打开新增/编辑弹窗
async function openEdit(row?: User) {
  if (row) {
    // 编辑模式：调用详情接口获取完整数据
    try {
      const detail = await getUserDetail(row.id);
      form.value = { 
        ...detail, 
        password: '' // 密码留空表示不修改
      };
      editVisible.value = true;
    } catch (e: any) {
      ElMessage.error(e?.response?.data?.message || e?.message || '获取用户详情失败');
    }
  } else {
    // 新增模式
    form.value = { role: 'user', status: 1, username: '', password: '' };
    editVisible.value = true;
  }
}

// 保存用户(新增或编辑)
async function save() {
  await (formRef.value as any)?.validate?.();
  saving.value = true;
  try {
    if (form.value.id) {
      await updateUser(form.value.id, {
        username: form.value.username,
        password: form.value.password || undefined,
        role: form.value.role,
        roleDesc: form.value.roleDesc || undefined,
        realName: form.value.realName || undefined,
        phone: form.value.phone || undefined,
        status: form.value.status
      });
    } else {
      await createUser({
        username: form.value.username,
        password: form.value.password,
        role: form.value.role,
        roleDesc: form.value.roleDesc || undefined,
        realName: form.value.realName || undefined,
        phone: form.value.phone || undefined,
        status: form.value.status
      });
    }
    editVisible.value = false;
    await load();
    ElMessage.success('已保存');
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

// 删除用户(带确认)
async function onDelete(row: User) { 
  await ElMessageBox.confirm('确认删除？','提示', { 
    confirmButtonText: '确定', 
    cancelButtonText: '取消' 
  }); 
  await deleteUser(row.id); 
  await load(); 
  ElMessage.success('已删除'); 
}

// 切换用户状态(正常/禁用)
async function toggleStatus(row: User) {
  const newStatus = row.status === 1 ? 0 : 1;
  const statusText = newStatus === 1 ? '正常' : '禁用';
  try {
    await ElMessageBox.confirm(`确认将用户状态改为"${statusText}"？`, '提示', { 
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    });
    await updateUser(row.id, { status: newStatus });
    await load();
    ElMessage.success('状态已更新');
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e?.response?.data?.message || e?.message || '更新失败');
    }
  }
}

// 页面加载时获取用户列表
load();
</script>

<style scoped>
</style>
