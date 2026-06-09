# Lumentum FY2026 Q3 Form 10-Q 提取说明

## 来源

- SEC EDGAR：Lumentum Holdings Inc. Fiscal 2026 Third Quarter Form 10-Q
- 报告期：2025-12-28 至 2026-03-28
- 披露日期：2026-05-05
- 本地缓存：`raw/lite-20260328.htm`

## 关键提取

- 净收入：8.084 亿美元，同比约 +90.1%。
- Components 收入：5.333 亿美元，同比约 +77.3%。
- Systems 收入：2.751 亿美元，同比约 +121.1%。
- 毛利：3.570 亿美元，毛利率约 44.2%。
- 净利润：1.442 亿美元，同比约 +227.0%。

## 图谱映射

Lumentum 在本报告中改为单一报告分部，但仍披露 Components / Systems 产品类型收入。

观察表的 `relatedNodeIds` 只标记公司实际产品覆盖的节点：`cw_laser`、`eml_laser_chip`、`optical_engine`、`silicon_photonic_pluggable_module`。不把 `data_center_switch`、`ai_server` 或 `cloud_dc` 标成 Lumentum 的产品覆盖节点。

将 Components 收入映射到 `cw_laser` 节点的收入 proxy，依据是报告对 Components 的说明：包含 semiconductor laser chips、laser sub-assemblies、laser light sources，并服务 cloud data center operators、AI/ML infrastructure providers 和 network equipment manufacturers。Lumentum 也覆盖 `eml_laser_chip` 产品节点，但报告没有拆出 EML/DFB 或可插拔模块发射端芯片收入，所以不把 Components 收入重复写入 EML 节点份额。

将 Components 收入同比增速映射为 `cw_laser -> optical_engine` 的增长 proxy。这个映射比公司总收入更贴近激光光源/光器件需求，但 Components 仍包含 line subsystems、wavelength management systems 等非纯激光光源项目。

Systems 收入只作为 `silicon_photonic_pluggable_module` 的上下文信号，不作为收入份额计算口径。原因是报告提到 Systems 增长主要由 cloud transceiver product lines 和 optical circuit switch shipments 驱动，但没有披露 cloud transceiver 的绝对收入。

按照“覆盖节点显示、相关线条低置信度读穿”的规则，Systems 收入同比增速也映射到 `optical_engine -> silicon_photonic_pluggable_module`、`pluggable_optical_module -> data_center_switch` 和 `pluggable_optical_module -> ai_server`。这些信号只表达云侧 transceiver / optical circuit switch 相关业务确实增长，不代表报告披露了具体到交换机侧或服务器侧的收入拆分。

## 局限

- Components 不是纯 CW 激光器收入，因此 `cw_laser` 收入 proxy 置信度设为 0.68。
- 报告没有披露数据中心 CW 光源、EML/DFB/CW laser、硅光光源等细分收入。
- Systems 中 cloud transceiver product lines 的绝对收入未披露，因此没有把 Systems 全额纳入光模块份额饼图。
- Systems 增长信号用于链路读穿，置信度低于 `cw_laser -> optical_engine` 的 Components 信号。
