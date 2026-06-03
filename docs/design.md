# CPO 产业链分析 APP（前端原型）设计需求与技术实现文档

> 版本：v1.0
> 目标：使用 Vue 生态构建 CPO 产业链的可视化展示与交互原型，为后续接入分析引擎打好基础。
> 范围：仅前端页面、交互、数据驱动视图；不含供需计算与预测算法。

---

## 一、设计需求

### 1.1 全局框架

- **应用类型**：响应式 Web 应用（桌面为主，兼顾平板），后续可通过 Capacitor 或 Uni-app 打包为移动端。
- **信息架构**：底部/侧边导航切换三大主视图。
- **风格**：专业数据工具感，浅色/深色双模式，字体清晰，配色以蓝灰为基底，瓶颈/预警使用橙红色。

### 1.2 三大主视图

#### 视图 1：产业链拓扑图（核心页面）

**布局**：水平分层流图，从左至右展示 CPO 产业链层级：

```
硅光芯片 → 光引擎 → CPO 模组 → 交换机/服务器 → 云厂商/AI 算力
```

**节点**：

- 每个节点代表一个"产业环节/产品"（如 CW 激光器、硅光晶圆）。
- 显示名称、图标/首字母缩略、简要状态（如"量产""送样"标签）。
- 节点大小可统一或按"市场容量"粗分。

**连线**：

- 连线粗细表示"供应关系强度"（初期静态赋值，以后可动态）。
- 箭头指示物料/产品流向。

**交互**：

- 点击某节点，高亮其直接上下游路径，其余节点与连线半透明/折叠。
- 双击节点进入详情卡片（见下文）。
- 拓扑图可拖拽、缩放、平移。

**切换开关**：

- "显示潜在瓶颈"：开启后，人工标记的关键环节节点亮起橙红色边框，附带悬浮文字简述原因（如"高精度贴片设备产能极有限"），此为静态占位，先不计算。

#### 节点详情卡片（弹出或侧边栏）

**内容**：

- 在 CPO 中的成本占比（静态文本）
- 主要供应商列表（含公司名称、Logo、送样/量产状态）
- 替代方案有限性说明（静态文本）
- "纠错/补充"按钮（点击打开反馈表单）

**交互**：

- 从供应商可跳转至该公司详情（或外链）
- 卡片可钉住，方便用户来回点击比较。

#### 视图 2：变化时间线

**形式**：纵向时间轴，按日期排列产业链关键事件。

**事件条目包含**：

- 日期（精确到日或月）
- 事件类型标签（如"送样""通过认证""良率突破""订单"）
- 涉及公司/产品（可点击跳转到拓扑图对应节点）
- 简短摘要（1-2 行）

**交互**：

- 按环节筛选（如只看"硅光芯片"相关事件）
- 点击事件后在拓扑图中高亮相关节点（联动）

**数据来源**：新闻、公司公告、券商研报提取的关键事件，初期手工导入。

#### 视图 3：标的观察表

**形式**：可筛选、排序的表格组件。

**列**：

| 列名 | 说明 |
|---|---|
| 公司名称 | Logo + 代码 |
| 产业链位置 | 所属层级 |
| 技术路线 | 如 Sipho、InP 等 |
| 当前最高阶段 | 研发/送样/小批量/量产 |
| 已知量产时间窗口 | 如 2027H1 |
| 关联主要客户/供应商 | |
| "加入观察"收藏按钮 | |

**交互**：

- 按环节、阶段筛选。
- 点击公司名可跳转拓扑图定位该公司的所有节点。
- 支持导出 CSV / 分享观察清单。

### 1.3 全局交互需求

**反馈入口**：每个节点卡片、事件卡片、表格行旁均有"纠错/补充"按钮，提交后存入后端（或暂存本地），以帮助打磨数据准确度。

**预留给计算的位置**：

- 节点详情卡片中预留"瓶颈指数""供需缺口"等灰色字段，文案显示"即将上线"。
- 时间线右侧预留"影响预测"区，鼠标悬停提示"未来将自动推导"。
- 这些位置的点击频率可被埋点统计，确认真实需求。

---

## 二、技术实现方案

### 2.1 技术栈

| 类别 | 选型 |
|---|---|
| 框架 | Vue 3（Composition API + `<script setup>`） |
| 构建工具 | Vite |
| 状态管理 | Pinia |
| UI 基础组件库 | Naive UI |
| 关系图可视化 | AntV G6 v5 |
| 时间线 | 自定义组件 + Naive UI Timeline |
| 表格 | Naive UI Data Table |
| 网络请求 | Axios（前期使用静态 JSON） |
| 路由 | Vue Router 4（Hash 模式） |

### 2.2 项目结构（src 下）

```
src/
├── assets/                  # 图标、公司Logo
├── components/
│   ├── TopologyGraph.vue    # 核心拓扑图组件（封装G6）
│   ├── NodeDetailDrawer.vue # 节点详情侧边栏
│   ├── TimelineView.vue     # 事件时间线
│   ├── WatchTable.vue       # 标的观察表
│   └── FeedbackButton.vue   # 纠错/补充按钮
├── stores/
│   ├── graphStore.js        # 图谱节点/边数据、选中状态
│   ├── eventStore.js        # 事件列表
│   └── companyStore.js      # 公司基础信息
├── views/
│   ├── TopologyView.vue     # 主页面-拓扑图
│   ├── TimelineViewPage.vue
│   └── WatchlistView.vue
├── data/                    # 静态样例数据（JSON/JS）
│   ├── nodes.json
│   ├── edges.json
│   ├── events.json
│   └── companies.json
├── utils/
│   ├── g6Config.js          # G6图配置与布局
│   └── helpers.js
└── App.vue
```

### 2.3 数据模型定义

#### graphStore

```js
{
  nodes: [
    {
      id: 'silicon_photonics',
      label: '硅光芯片',
      layer: 'chip',           // 层级枚举: chip | engine | module | system | cloud
      status: 'mass_prod',     // R&D | sampling | mass_prod
      bottleneck: false,
      bottleneckNote: '',
      marketSizeHint: 'large', // small | medium | large
      companies: ['companyA', 'companyB']
    }
  ],
  edges: [
    {
      source: 'silicon_photonics',
      target: 'optical_engine',
      strength: 0.7,           // 0-1，决定连线粗细
      label: '晶圆供应'
    }
  ],
  selectedNodeId: null,
  highlightNodeIds: []         // 用于多节点高亮（时间线联动等）
}
```

#### eventStore

```js
{
  events: [
    {
      date: '2026-05-20',
      type: 'sampling',        // sampling | certification | yield | order | other
      title: 'A公司硅光引擎送样B客户',
      relatedNodeIds: ['optical_engine'],
      relatedCompanyIds: ['companyA', 'companyB'],
      summary: '...'
    }
  ],
  filterLayer: null
}
```

#### companyStore

```js
{
  companies: [
    {
      id: 'companyA',
      name: '某光电',
      ticker: 'XXXX.SH',
      layer: '光引擎',
      techRoute: 'Sipho',
      stage: 'sampling',
      massProductionEta: '2027H1',
      keyCustomers: ['云厂商X'],
      logoUrl: ''
    }
  ]
}
```

### 2.4 拓扑图实现要点（AntV G6 v5）

- **布局**：使用 Dagre 分层布局，根据 `layer` 字段自动排列节点，从左至右（LR）。
- **自定义节点样式**：用 G6 v5 的自定义节点绘制矩形卡片，内含圆角背景、产品图标、名称、状态标签。根据 `status` 改变角标颜色。
- **交互实现**：
  - 点击节点 → 高亮上下游：利用 G6 的状态管理控制节点与边的透明度。
  - 双击 → 触发 emit 打开详情抽屉。
  - 切换"潜在瓶颈"开关 → 遍历 nodes，给 `bottleneck: true` 的节点应用红色描边状态。
- **性能**：CPO 产业链节点数量有限（初期几十个），无需虚拟化，G6 的 Canvas 渲染完全够用。
