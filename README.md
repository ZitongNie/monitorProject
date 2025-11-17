# 电子界桩及白蚁监测数据管理（前端 + 模拟后端）

基于 Vue 3 + Element Plus 的 PC 端管理系统，含地图标注（Leaflet 作为概化图方案）、实时/历史数据与统计图表（ECharts）。内置 Node/Express + WebSocket 模拟网关与数据接口。提供 Capacitor Android 封装准备。

## 功能概览

- 登录与权限：系统管理员、普通用户（基于路由守卫与菜单权限）。
- 地图：增删改查白蚁监测站、电子界桩；查看位置与基本信息。
- 数据：实时（WebSocket 模拟）与历史（REST），现场图片、状态、预警信息。
- 统计分析：
  - 单个测站/界桩安全/预警状态变化曲线（折线图）
  - 多个测站/界桩累计安全/预警次数柱状图
  - 按是否预警分类数量分布饼状图
- 系统管理：用户与角色分配、基础信息维护（仅管理员）。
- 移动端：提供 Capacitor 封装 Android 的准备与说明（代码复用，响应式界面）。

## 运行环境

- Node.js 18+
- Windows PowerShell（已适配命令）

## 安装依赖

```powershell
# 安装根工具（仅并发执行用）
npm install

# 安装前端依赖
npm --prefix .\web install

# 安装后端依赖
npm --prefix .\server install
```

## 启动开发

```powershell
# 同时启动前端 Vite 与后端 Express（含 WS）
npm run dev
```

- 前端地址：`http://localhost:5173`
- 后端地址：`http://localhost:5174`
- WebSocket：`ws://localhost:5174`

默认账号（模拟）：

- 管理员：admin / 123456
- 普通用户：user / 123456

## 构建

```powershell
# 分别构建前后端
npm run build

# 仅前端
npm run build:web
```

## 预览（仅前端静态）

```powershell
npm run preview
```

## Android 封装

当前阶段仅交付网页端（PC 端 Web）；移动端封装已移除，后续若需要再行添加。

## Baidu 地图说明

项目默认使用 Leaflet（概化图）。若需切换 Baidu 地图，请在 `MapView` 中按注释启用 Baidu SDK，并在 `.env` 中提供 `VITE_BAIDU_AK`（需自行申请），或保留概化图方案。

## 目录结构

- web：前端（Vite + Vue3 + Element Plus + Pinia + Router + ECharts + Leaflet）
- server：模拟后端（Express + WS）

## 许可

仅作演示与需求落地参考，生产使用请替换模拟后端为真实网关与数据库服务。
