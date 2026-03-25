<!--
  登录页面
  功能：用户登录、记住用户名、注册新用户
  支持：真实后端登录与本地Mock模式
-->
<template>
  <div class="login-page">
    <div class="login-card">
      <!-- 品牌标识区 -->
      <div class="brand">
        <div class="logo">LOGO</div>
        <div class="title">登录</div>
        <div class="subtitle">副标题</div>

      </div>

      <!-- 登录表单 -->
      <el-form class="form" :model="form" :rules="rules" ref="formRef" label-position="top" @keyup.enter="onSubmit">
        <el-form-item label="用户名" prop="username">
          <el-input class="login-input" v-model.trim="form.username" placeholder="请输入用户名" clearable size="large">
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input class="login-input" v-model="form.password" :type="passwordVisible ? 'text' : 'password'" placeholder="请输入密码" size="large">
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
            <template #suffix>
              <el-icon @click="passwordVisible = !passwordVisible" style="cursor:pointer;" class="reveal-icon">
                <View v-if="passwordVisible" />
                <Hide v-else />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <!-- 记住用户名与忘记密码 -->
        <div class="actions">
          <el-checkbox v-model="form.remember">记住用户名</el-checkbox>
          <el-link type="primary" :underline="false" @click="onForgot">忘记密码？</el-link>
        </div>
        <!-- 登录和注册按钮 -->
        <div class="btn-row">
          <el-button @click="regVisible = true" :disabled="loading" size="large" class="l-btn">注册新用户</el-button>
          <el-button type="primary" @click="onSubmit" :loading="loading" size="large" class="l-btn">登 录</el-button>
        </div>
      </el-form>
      <div class="footer">© {{ year }} 监测数据平台</div>
    </div>
  </div>

  <!-- 注册弹窗 -->
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

// 登录表单数据，支持记住用户名
const form = reactive({ username: localStorage.getItem('lastUsername') || '', password: '', remember: !!localStorage.getItem('lastUsername') });
const loading = ref(false);

// 检测是否为Mock模式
const MOCK = (import.meta as any).env?.VITE_AUTH_MOCK === '1' || (import.meta as any).env?.VITE_AUTH_MOCK === 'true';

// 登录表单验证规则
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
  // 自动聚焦用户名输入框
  try { (formRef.value as any)?.$el?.querySelector('input')?.focus(); } catch {}
});

// 提交登录
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

// 忘记密码提示
function onForgot() {
  ElMessage.info('请联系管理员重置密码');
}

// 注册相关状态与表单
const regVisible = ref(false);
const regLoading = ref(false);
const regFormRef = ref();
const regForm = reactive<{ username: string; password: string; realName?: string; phone?: string }>({ username: '', password: '', realName: '', phone: '' });

// 注册表单验证规则
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

// 提交注册
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
  position: relative;
  overflow: hidden;
  background: 
    linear-gradient(135deg, rgba(64,158,255,0.1) 0%, rgba(64,158,255,0.3) 100%),
    url('../img/login_background.jpg') center/cover no-repeat,
    #f2f5f9;
}
.login-page::before {
  content: "";
  position: absolute;
  top: -20%; right: -10%; width: 50%; height: 50%;
  background: radial-gradient(circle, rgba(103,194,58,0.2) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}
.login-page::after {
  content: "";
  position: absolute;
  bottom: -20%; left: -10%; width: 50%; height: 50%;
  background: radial-gradient(circle, rgba(64,158,255,0.25) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.login-card {
  width: 440px;
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.2);
  padding: 40px 32px 30px;
  position: relative;
  z-index: 10;
  transform: translateY(0);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.login-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.12), inset 0 0 0 1px rgba(255, 255, 255, 0.3);
}

.brand { text-align: center; margin-bottom: 24px; }
.logo { font-size: 36px; margin-bottom: 8px; animation: float 6s ease-in-out infinite; display: inline-block; }
.title { font-weight: 700; font-size: 24px; color: #1f2d3d; letter-spacing: 1px; }
.subtitle { color: #5c6b77; margin-top: 6px; font-size: 14px; }
.hint { margin-top: 16px; border-radius: 8px; }

.form { margin-top: 8px; }

:deep(.login-input .el-input__wrapper) {
  background-color: rgba(255, 255, 255, 0.7);
  box-shadow: 0 2px 6px rgba(0,0,0,0.02) !important;
  border-radius: 10px;
  padding: 2px 12px;
  transition: all 0.3s ease;
}
:deep(.login-input .el-input__wrapper.is-focus) {
  background-color: #fff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2) !important;
  transform: translateY(-1px);
}
:deep(.el-form-item__label) {
  font-weight: 600;
  color: #303133;
  padding-bottom: 4px;
}

.reveal-icon { color: #909399; transition: color 0.2s; }
.reveal-icon:hover { color: #409eff; }

.actions { display:flex; align-items:center; justify-content:space-between; margin: 16px 0 24px 0; }
.btn-row { display:flex; gap:16px; width: 100%; }
.l-btn { 
  flex: 1; 
  border-radius: 10px; 
  font-weight: 600; 
  letter-spacing: 1px;
  transition: all 0.3s ease;
}
.l-btn:has(span:contains("登 录")) {
  background: linear-gradient(135deg, #409eff 0%, #3a8ee6 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(64,158,255,0.3);
}
.l-btn:has(span:contains("登 录")):hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(64,158,255,0.4);
}
.l-btn:not(.el-button--primary) {
  background: rgba(255,255,255,0.6);
  border-color: rgba(64,158,255,0.3);
  color: #409eff;
}
.l-btn:not(.el-button--primary):hover {
  background: #fff;
  border-color: #409eff;
}

.footer { text-align:center; margin-top: 24px; color: #5c6b77; font-size: 13px; }

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
  100% { transform: translateY(0px); }
}
</style>
