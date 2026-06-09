# Coherent FY2026 Q3 Form 10-Q 提取说明

## 来源

- SEC EDGAR：Coherent Corp. Fiscal 2026 Third Quarter Form 10-Q
- 报告期：2026-01-01 至 2026-03-31
- 披露日期：2026-05-06
- 本地缓存：`raw/iivi-20260331.htm`

## 关键提取

- 总收入：18.056 亿美元，同比约 +20.5%。
- Datacenter & Communications 分部收入：13.617 亿美元，同比约 +40.6%。
- Industrial 分部收入：4.440 亿美元，同比约 -16.1%。
- 毛利：6.799 亿美元，毛利率约 37.7%。
- 净利润：1.914 亿美元。
- Datacenter & Communications 分部利润：3.476 亿美元，同比约 +49.1%。

## 图谱映射

Coherent 披露的 Datacenter & Communications 分部直接面向 datacenter 和 communications 市场，产品包括 transceivers、systems、subsystems、modules、components、optics 和 semiconductor devices。因此：

- 观察表的 `relatedNodeIds` 只标记公司实际产品覆盖的上中游节点：`cw_laser`、`eml_laser_chip`、`pd_array`、`modulator`、`optical_engine`、`pluggable_optical_module`、`silicon_photonic_pluggable_module`。不把 `data_center_switch` 或 `ai_server` 标成 Coherent 的产品覆盖节点。
- 将该分部收入映射到 `pluggable_optical_module` 节点的宽口径收入 proxy；这是 Datacenter & Communications 分部收入，不是纯可插拔光模块收入。
- 将该分部收入同比增速映射到 `optical_engine -> silicon_photonic_pluggable_module`、`pluggable_optical_module -> data_center_switch` 和 `pluggable_optical_module -> ai_server` 这些数据中心光互连链路的增长 proxy。
- Coherent 可以作为 `cw_laser` 节点的产品覆盖公司出现，但不把 Datacenter & Communications 整个分部收入写入 `cw_laser` 的收入 proxy；报告没有披露纯激光器收入，放进份额图会误导。
- 为了让节点和链路口径一致，也给 `cw_laser -> optical_engine` 写入低置信度增长 proxy，使用同一个 Datacenter & Communications 分部收入同比增速。
- 同理，给 `eml_laser_chip -> pluggable_optical_module`、`pd_array -> optical_engine` 和 `modulator -> optical_engine` 写入更低置信度的宽口径读穿信号。它们表示数据中心通信分部确实增长，但报告没有披露 EML/DFB、探测器、调制器或单项半导体光器件收入。

## 局限

- Datacenter & Communications 分部覆盖范围较宽，不等同于单一的可插拔光模块收入，也不等同于 CW 激光器收入。
- `pluggable_optical_module` 节点的 Coherent 收入 proxy 置信度下调到 0.58，并在方法名中标记 broad segment。
- 报告没有披露数据中心光模块、CW 光源、EML/DFB 激光器或硅光组件的细分收入。
- `cw_laser` 节点只保留产品覆盖和链路增长 proxy，不参与激光器收入份额估算。
