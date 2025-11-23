<!--
  主布局组件
  功能：定义应用的整体布局结构（顶部导航栏、左侧边栏、主内容区）
-->
<template>
  <div class="layout">
    <!-- 顶部导航栏 -->
    <div class="nav">
      <Navbar />
    </div>
    <!-- 左侧边栏 -->
    <div class="side">
      <Sidebar />
    </div>
    <!-- 主内容区 -->
    <div class="main">
      <PageContainer>
        <router-view />
      </PageContainer>
    </div>
  </div>
  
  </template>
  
  <script setup lang="ts">
  import Navbar from '../components/common/Navbar.vue';
  import Sidebar from '../components/common/Sidebar.vue';
  import PageContainer from '../components/common/PageContainer.vue';
  </script>
  
  <style scoped>
  </style>
