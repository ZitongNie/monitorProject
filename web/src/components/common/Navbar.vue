<template>
  <el-header height="56px" style="display:flex;align-items:center;justify-content:space-between;padding:0 16px;background:#fff;border-bottom:1px solid #ebeef5;">
    <div style="display:flex;align-items:center;gap:12px;">
      <el-icon><Location /></el-icon>
      <strong>电子界桩与白蚁监测管理</strong>
    </div>
    <div style="display:flex;align-items:center;gap:12px;">
      <el-tag type="success" v-if="auth.user">{{ auth.user.username }} ({{ auth.user.role }})</el-tag>
      <el-button type="primary" link @click="onLogout">退出</el-button>
    </div>
  </el-header>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Location } from '@element-plus/icons-vue';
import { logout as apiLogout } from '@/services/auth';
const auth = useAuthStore();
const router = useRouter();
const onLogout = async () => { try { await apiLogout(); } catch {} ElMessage.success('已退出'); router.push({ name: 'login' }); };
</script>

<style scoped>
</style>
