<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand">
        <div class="logo">🔍</div>
        <div class="title">登录</div>
        <div class="subtitle">登录您的账户以继续</div>
        <el-alert v-if="MOCK" class="hint" type="info" :closable="false"
                  title="已启用本地账号：admin/123456 或 user/123456" />
      </div>

      <el-form class="form" :model="form" :rules="rules" ref="formRef" label-position="top" @keyup.enter.native="onSubmit">
        <el-form-item label="用户名" prop="username">
          <el-input v-model.trim="form.username" placeholder="请输入用户名" clearable>
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" :type="passwordVisible ? 'text' : 'password'" placeholder="请输入密码（≥6位）">
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
            <template #suffix>
              <el-icon @click="passwordVisible = !passwordVisible" style="cursor:pointer;">
                <View v-if="passwordVisible" />
                <Hide v-else />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <div class="actions">
          <el-checkbox v-model="form.remember">记住用户名</el-checkbox>
          <el-link type="primary" underline="never" @click="onForgot">忘记密码？</el-link>
        </div>
        <div class="btn-col">
          <el-button type="primary" @click="onSubmit" :loading="loading">登录</el-button>
          <el-button @click="regVisible = true" :disabled="loading">注册</el-button>
        </div>
      </el-form>
      <div class="footer">© {{ year }} 监测数据平台</div>
    </div>
  </div>

  <el-dialog v-model="regVisible" title="注册新用户" width="480px">
    <el-form :model="regForm" :rules="regRules" ref="regFormRef" label-width="88px">
      <el-form-item label="用户名" prop="username">
        <el-input v-model.trim="regForm.username" placeholder="1-50 字符，建议字母/数字/下划线" />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input v-model="regForm.password" type="password" placeholder="3-64 字符" />
      </el-form-item>
      <el-form-item label="姓名">
        <el-input v-model.trim="regForm.realName" placeholder="可选：真实姓名" />
      </el-form-item>
      <el-form-item label="手机号" prop="phone">
        <el-input v-model.trim="regForm.phone" placeholder="可选：11 位手机号" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="regVisible = false">取消</el-button>
      <el-button type="primary" :loading="regLoading" @click="onRegister">注册</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { login, register as registerApi } from '../services/auth';
import { User, Lock, View, Hide } from '@element-plus/icons-vue';

const router = useRouter();
const route = useRoute();
const formRef = ref();
const year = new Date().getFullYear();
const passwordVisible = ref(false);
const form = reactive({ username: localStorage.getItem('lastUsername') || '', password: '', remember: !!localStorage.getItem('lastUsername') });
const loading = ref(false);
const MOCK = (import.meta as any).env?.VITE_AUTH_MOCK === '1' || (import.meta as any).env?.VITE_AUTH_MOCK === 'true';
const rules = {
  username: [
    { required: true, message: '用户名不能为空', trigger: 'blur' },
    { min: 1, message: '用户名不能为空', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '密码不能为空', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ]
};

onMounted(() => {
  // 可选：自动聚焦用户名输入框
  try { (formRef.value as any)?.$el?.querySelector('input')?.focus(); } catch {}
});

async function onSubmit() {
  if (loading.value) return;
  await (formRef.value as any)?.validate?.();
  loading.value = true;
  try {
    await login(form.username, form.password);
    if (form.remember) localStorage.setItem('lastUsername', form.username); else localStorage.removeItem('lastUsername');
    ElMessage.success('登录成功');
    const redirect = (route.query.redirect as string) || '/';
    router.replace(redirect);
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || '登录失败';
    ElMessage.error(msg);
  } finally {
    loading.value = false;
  }
}

function onForgot() {
  ElMessage.info('请联系管理员重置密码');
}

// 注册弹窗
const regVisible = ref(false);
const regLoading = ref(false);
const regFormRef = ref();
const regForm = reactive<{ username: string; password: string; realName?: string; phone?: string }>({ username: '', password: '', realName: '', phone: '' });
const regRules = {
  username: [
    { required: true, message: '用户名不能为空', trigger: 'blur' },
    { min: 1, max: 50, message: '用户名长度 1-50', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '密码不能为空', trigger: 'blur' },
    { min: 3, max: 64, message: '密码长度 3-64', trigger: 'blur' }
  ],
  phone: [
    { validator: (_: any, v: string, cb: any) => { if (!v) return cb(); /^1\d{10}$/.test(v) ? cb() : cb(new Error('手机号格式不正确')); }, trigger: 'blur' }
  ]
};

async function onRegister() {
  await (regFormRef.value as any)?.validate?.();
  regLoading.value = true;
  try {
    await registerApi({ username: regForm.username, password: regForm.password, realName: regForm.realName, phone: regForm.phone });
    ElMessage.success('注册成功，请使用新账号登录');
    form.username = regForm.username;
    regVisible.value = false;
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || '注册失败';
    ElMessage.error(msg);
  } finally {
    regLoading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(1200px 600px at 20% 10%, #e8f3ff 0%, transparent 60%),
              radial-gradient(1200px 600px at 80% 90%, #e8fff3 0%, transparent 60%),
              linear-gradient(180deg, #f6f9fc 0%, #eef2f7 100%);
}
.login-card {
  width: 420px;
  background: rgba(255,255,255,0.9);
  backdrop-filter: blur(8px);
  border-radius: 14px;
  box-shadow: 0 12px 32px rgba(31, 45, 61, 0.12);
  padding: 22px 24px 18px;
}
.brand { text-align: center; margin-bottom: 16px; }
.logo { font-size: 28px; }
.title { font-weight: 700; font-size: 18px; margin-top: 6px; }
.subtitle { color: #8a8f98; margin-top: 2px; font-size: 13px; }
.form { margin-top: 8px; }
.actions { display:flex; align-items:center; justify-content:space-between; margin-bottom: 4px; }
.btn-col { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; max-width: 320px; margin-left: auto; margin-right: auto; }
.btn-col :deep(.el-button) { width: 100%; }
.footer { text-align:center; margin-top: 14px; color:#9aa0a6; font-size: 12px; }
</style>
