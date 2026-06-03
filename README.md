# ChainSight

ChainSight 是一个面向产业链分析的前端项目。当前版本以产业链拓扑、事件时间线和企业观察列表为核心视图，用于展示产业链上下游关系、关键节点状态和相关事件。

项目后续会扩展到更多行业和更复杂的供应链/产业链场景，并结合分析逻辑自动识别潜在瓶颈、关键依赖和风险传导路径。

## 技术栈

- Vue 3
- Vite
- Pinia
- Vue Router
- Naive UI
- AntV G6

## 安装依赖

请先安装 Node.js，然后在项目根目录运行：

```bash
npm install
```

## 本地启动

```bash
npm run dev
```

启动后，Vite 会在终端输出本地访问地址，通常是：

```text
http://localhost:5173/
```

## 构建

生成生产环境构建：

```bash
npm run build
```

## 预览构建产物

```bash
npm run preview
```

## 目录结构

```text
src/
  components/   通用组件和图谱组件
  data/         产业链节点、边、事件和企业数据
  stores/       图谱、事件和企业相关状态
  views/        拓扑图、时间线和观察列表页面
  utils/        G6 配置和工具函数
```
