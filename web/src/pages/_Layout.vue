<template>
  <div class="layout">
    <div class="nav">
      <Navbar />
    </div>
    <div class="side">
      <Sidebar />
    </div>
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
