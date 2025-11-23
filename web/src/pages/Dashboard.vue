<!--
  仪表盘页面
  功能：展示系统总体概览(测站/界桩数量与预警统计)和快速入口导航
-->
<template>
  <el-row :gutter="12">
    <!-- 总体概览卡片 -->
    <el-col :span="12">
      <el-card>
        <template #header>总体概览</template>
        <div style="display:flex;gap:24px;">
          <el-statistic title="测站总数" :value="overview?.stations.total || 0" />
          <el-statistic title="测站预警" :value="overview?.stations.warn || 0" />
          <el-statistic title="界桩总数" :value="overview?.piles.total || 0" />
          <el-statistic title="界桩预警" :value="overview?.piles.warn || 0" />
        </div>
      </el-card>
    </el-col>
    <!-- 快速入口卡片 -->
    <el-col :span="12">
      <el-card>
        <template #header>快速入口</template>
        <el-space>
          <el-button @click="$router.push('/map')">地图</el-button>
          <el-button @click="$router.push('/stations')">白蚁测站</el-button>
          <el-button @click="$router.push('/piles')">电子界桩</el-button>
          <el-button @click="$router.push('/analytics')">统计分析</el-button>
        </el-space>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getOverview } from '@/services/analytics';

// 概览数据(测站/界桩总数及预警数)
const overview = ref<any>(null);

// 加载概览数据
onMounted(async () => { overview.value = await getOverview(); });
</script>

<style scoped>
</style>
