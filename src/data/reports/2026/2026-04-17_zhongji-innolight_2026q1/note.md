# 中际旭创 2026Q1 报告解读

## 核心数据

- 2026Q1 营业收入为 19,496,398,083.95 元，同比增长 192.12%。
- 归母净利润为 5,734,501,526.83 元，同比增长 262.28%。
- 经营活动现金流量净额为 3,367,573,676.62 元，同比增长 55.58%。
- 根据营业收入和营业成本计算，2026Q1 毛利约 8,979,676,964.74 元，毛利率约 46.06%。

## 对图谱的映射

中际旭创 2026Q1 报告没有拆分 800G、1.6T、CPO、EML 平台或硅光平台收入。公司 2025 年年度报告披露高速光模块覆盖 EML 平台和硅光平台，因此拆分拓扑后不应把公司整体增长只归入 EML/DFB 可插拔光模块。为了让系统能够吸收该报告的信息，`extracted.json` 中的结构化信号采用 proxy 方式：

- 观察表将公司同时标记为 `pluggable_optical_module` 和 `silicon_photonic_pluggable_module` 的覆盖公司。
- 将公司 2026Q1 营业收入作为“高速可插拔光模块”大类收入 proxy，目前仍只落在 `pluggable_optical_module` 节点，避免把同一笔收入在两个细分节点重复计入份额。
- 将公司 2026Q1 营业收入同比增速作为 `pluggable_optical_module -> data_center_switch` 和 `silicon_photonic_pluggable_module -> data_center_switch` 两条链路的共同增长 proxy，方法标记为 `company_revenue_growth_proxy_without_platform_split`，置信度下调到 0.62。
- `pluggable_optical_module -> ai_server` 仍保留较低置信度增长 proxy，因为报告没有拆分交换机侧与服务器侧光模块收入。
- 不向 CPO 模组或 CPO 交换机链路输出增长信号，因为报告没有披露 CPO 收入或盈利，且当前 CPO 贡献可能仍接近 0。

这个映射的依据是：中际旭创 2025 年年度报告披露，光通信收发模块收入占营业收入比重为 97.95%，说明公司收入高度集中在该产品大类。

## 不确定性

- 可插拔光模块映射不代表纯 CPO 模组收入。
- 不能从本报告直接推断 CPO 模组或 CPO 交换机链路已经产生收入或利润贡献。
- 该映射不能区分 800G、1.6T、传统可插拔光模块、电信光模块等细分产品。
- 节点金额为人民币口径，尚未转换为图谱边数据使用的 USD/quarter。
- 链路增长是 proxy，不是该链路的直接交易金额披露。

## 对图谱的影响

- `pluggable_optical_module` 节点获得收入 proxy、毛利率 proxy。
- `pluggable_optical_module -> data_center_switch` 边获得增长 proxy，但该 proxy 不代表 EML 平台单独增速。
- `silicon_photonic_pluggable_module -> data_center_switch` 边获得同一公司收入增速 proxy，但该 proxy 不代表硅光平台单独披露值。证券时报e公司 2026-04-26 互动平台报道显示，公司称目前 800G 和 1.6T 产品硅光方案占比超过一半，硅光方案比重有望持续提升；这支持“硅光方案是重要增长方向”的判断，但当前没有可审计的单独收入增速，因此系统不填更高的具体数值。
- `pluggable_optical_module -> ai_server` 边获得较低置信度增长 proxy，因为报告没有拆分交换机侧与服务器侧光模块收入。
- CPO 相关节点和边不获得增长信号。后续只有在公告、年报、投资者交流或可信研报中出现更明确的 CPO 出货、收入、订单或产能信息时，才应新增 CPO 相关 `graphSignals`。
- 如果未来新增更细的产品拆分报告，应降低 proxy 的权重，优先使用更直接的数据。
