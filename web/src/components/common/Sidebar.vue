<template>
  <el-menu :default-active="active" class="el-menu-vertical-demo" router unique-opened>
    <el-menu-item index="/dashboard"><el-icon><DataLine /></el-icon>概览</el-menu-item>
    <el-menu-item index="/map"><el-icon><MapLocation /></el-icon>地图</el-menu-item>
    <el-menu-item index="/stations"><el-icon><OfficeBuilding /></el-icon>白蚁测站</el-menu-item>
    <el-menu-item index="/piles"><el-icon><Guide /></el-icon>电子界桩</el-menu-item>
    <el-menu-item index="/analytics"><el-icon><PieChart /></el-icon>统计分析</el-menu-item>
    <el-sub-menu v-if="isAdmin" index="/admin">
      <template #title><el-icon><Setting /></el-icon><span>系统管理</span></template>
      <el-menu-item index="/admin/users">用户管理</el-menu-item>
      <el-menu-item index="/admin/assets">资产维护</el-menu-item>
    </el-sub-menu>
  </el-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../../store/auth';
import { DataLine, MapLocation, OfficeBuilding, Guide, PieChart, Setting } from '@element-plus/icons-vue';
const route = useRoute();
const active = computed(() => route.path);
const auth = useAuthStore();
const BYPASS = (import.meta as any).env?.VITE_BYPASS_LOGIN === '1' || (import.meta as any).env?.VITE_BYPASS_LOGIN === 'true';
const isAdmin = computed(() => BYPASS || auth.hasRole('admin'));
</script>

<style scoped>
.el-menu-vertical-demo { height: calc(100vh - 56px); border-right: 1px solid #ebeef5; }
</style>
