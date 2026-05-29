# 电子界桩与白蚁监测数据管理系统

基于 **Vue 3 + Element Plus** 的 PC 端管理系统，集成了地图标注（百度地图 BMapGL + ECharts 概化地图）、实时/历史数据与统计图表（ECharts）、水库白蚁监测等模块。内置 **Node/Express + WebSocket** 模拟网关与数据接口。

## 功能概览

### 仪表盘
- 大屏概览：白蚁测站与电子界桩数量统计、状态分布饼图、最新预警列表
- 概化地图：全国 → 湖北省 → 武汉市三级下钻，ECharts 散点图展示测站与界桩分布
- 支持全屏展示、实时时间显示

### 地图视图
- 百度地图 WebGL（BMapGL）展示测站与电子界桩点位
- SVG 自定义图标区分测站（圆形）与界桩（菱形），颜色区分在线/离线/预警状态
- 搜索定位测站、切换图层显示、图例、视野重置
- 点击标注查看详细信息与历史数据曲线
- WebSocket 实时推送数据更新

### 白蚁监测
- **白蚁测站管理**：列表查询（编号/名称/水库/状态）、新增、编辑、删除，支持 WGS84/BD09 坐标
- **水库白蚁监测**：按水库切换，包含实时监测（地图 + 站点明细表）、白蚁监测趋势（折线图）、监测照片（图片列表 + 大图预览）
- **测站详情**：实时数据（经纬度/电量/信号强度/预警状态）、预警列表（未处理/已处理）、安全/预警状态变化曲线、图片浏览与上传

### 电子界桩管理
- 列表查询（编号/设备ID/状态）、新增、编辑、删除、在线/离线状态切换
- **界桩详情**：实时数据（温度/湿度/倾斜角/倾斜状态/震动状态/电压/电量/信号强度）、预警信息、最近图片、坐标信息（当前坐标与初始安装坐标）

### 统计分析
- 单站点安全/预警状态变化曲线（折线图）
- 多站点累计安全/预警次数柱状图（点击柱体可跳转详情）
- 按是否预警分类的站点数量分布饼图

### 系统管理（管理员）
- 用户管理：列表查询、新增、编辑、删除、状态启用/禁用
- 资产维护页面

### 登录与权限
- 用户名/密码登录，支持记住用户名
- 新用户注册
- 路由守卫 + 角色权限控制（管理员/普通用户）

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 (Composition API) + TypeScript |
| 构建工具 | Vite 5 |
| UI 组件库 | Element Plus |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| HTTP 客户端 | Axios |
| 图表 | ECharts 5 + vue-echarts |
| 地图 | 百度地图 WebGL (BMapGL) + ECharts 概化地图 (GeoJSON) |
| CSS 预处理 | Sass |
| 日期处理 | dayjs |
| 后端模拟 | Express + WebSocket (ws) |
| 运行引擎 | tsx (TypeScript 直接执行) |

## 运行环境

- Node.js 18+
- 包管理器 npm（已适配 Windows PowerShell 命令）

## 安装依赖

```powershell
# 安装根工具（并发执行用）
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

### 默认账号（Mock 模式）

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | 123456 | 系统管理员 |
| user01 | 123456 | 普通用户 |
| user02 | 123456 | 普通用户（禁用） |

## Mock 模式与环境变量

项目内置完整的 Mock 数据层，无需后端即可运行全部功能。通过环境变量控制：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_AUTH_MOCK` | 启用前端 Mock 认证与数据 | `1` |
| `VITE_REALTIME_MOCK` | 启用水库白蚁监测 Mock 数据 | `1` |
| `VITE_BYPASS_LOGIN` | 跳过登录认证 | `0` |
| `VITE_API_BASE` | 后端 API 基础路径 | `/api` |
| `VITE_API_TOKEN` | 默认 API Token | - |
| `VITE_WS_URL` | WebSocket 地址 | `ws://localhost:5174` |
| `VITE_API_DEBUG` | API 请求调试日志 | DEV 下自动开启 |

Mock 数据存储于 `localStorage`，关闭浏览器后数据保留。后端 `server/` 的模拟数据存储于内存。

## 构建

```powershell
# 分别构建前后端
npm run build

# 仅前端
npm run build:web

# 仅后端
npm run build:server
```

## 预览（仅前端静态）

```powershell
npm run preview
```

## 目录结构

```
monitorProject/
├── web/                          # 前端（Vite + Vue 3 + Element Plus）
│   └── src/
│       ├── pages/                # 页面组件
│       │   ├── Dashboard.vue     # 仪表盘大屏
│       │   ├── Login.vue         # 登录/注册
│       │   ├── MapView.vue       # 百度地图视图
│       │   ├── Stations.vue      # 白蚁测站管理
│       │   ├── StationDetail.vue # 测站详情
│       │   ├── TermiteReservoirs.vue  # 水库白蚁监测
│       │   ├── ElectronicBoundaries.vue    # 电子界桩管理
│       │   ├── ElectronicBoundaryDetail.vue # 界桩详情
│       │   ├── Analytics.vue     # 统计分析
│       │   ├── AdminUsers.vue    # 用户管理
│       │   ├── AdminAssets.vue   # 资产维护
│       │   └── Piles.vue         # 界桩管理（旧版）
│       ├── services/             # API 服务层（含 Mock 实现）
│       ├── store/                # Pinia 状态管理
│       ├── router/               # Vue Router 路由配置
│       ├── components/           # 公共组件
│       └── types/                # TypeScript 类型定义
├── server/                       # 模拟后端
│   └── src/
│       ├── index.ts              # Express + WebSocket 入口
│       ├── data/store.ts         # 内存数据存储
│       └── routes/               # API 路由
├── package.json                  # 根配置（并发脚本）
└── Documents/                    # 文档与交付物
```

## 坐标系统说明

项目支持三种坐标系：
- **WGS84**：GPS 原始坐标，用户录入与展示使用
- **BD09**：百度坐标系，百度地图显示使用
- **GCJ02**：国测局坐标系（中间转换层）

前端 Mock 层内置 WGS84 → GCJ02 → BD09 坐标转换算法，创建/编辑测站与界桩时自动计算 BD09 坐标。

## 百度地图说明

地图页面使用百度地图 WebGL（BMapGL），需要有效的 AK（API Key）。当前 AK 已内置于 `MapView.vue` 中，如过期请在百度地图开放平台申请替换。

仪表盘概化地图使用 ECharts 的 `geo` 组件加载 GeoJSON（中国/湖北/武汉），无需百度地图 AK。

## 许可

仅作演示与需求落地参考，生产使用请替换模拟后端为真实网关与数据库服务。
