# Applied Optoelectronics 2025 Form 10-K 解读

## 这份报告能支持什么

AAOI 在 2025 Form 10-K 中把自己描述为垂直整合的 fiber-optic networking products 供应商，覆盖 internet data center、CATV、telecom 和 FTTH 四个终端市场。对当前产业链图谱最相关的是 internet data center 市场。

报告明确说明：AAOI 向大型互联网数据中心运营商和设备供应商销售数据中心光收发模块，这些模块插入数据中心内的 switches 和 servers，并通过光纤发送和接收数据。因此，这份报告可以支持：

- `pluggable_optical_module -> data_center_switch`
- `pluggable_optical_module -> ai_server`

但报告没有拆分交换机侧和服务器侧收入，所以两条边都只能使用 internet data center 收入增长作为代理，不能当成直接披露的边交易金额。

## 关键数据

- 2025 年总收入：455.7 million USD，2024 年为 249.4 million USD，同比约 +82.7%。
- 2025 年毛利率：约 30.0%。
- 2025 年净亏损：38.2 million USD。
- 2025 年 internet data center 收入：195.7 million USD，占收入 42.9%，2024 年为 148.5 million USD，同比约 +31.8%。
- 2025 年 CATV 收入：245.1 million USD，占收入 53.8%，是当年最大收入来源。
- 2025 年前五大客户贡献 95.2% 收入，其中 Digicomm 占 53.1%，Microsoft 占 28.8%。

## 映射口径

当前图谱只把 internet data center 收入映射到 AI 数据中心相关链路，不把 CATV、telecom、FTTH 收入混入 CPO/AI 服务器链路。

`pluggable_optical_module -> data_center_switch` 的置信度高于 `pluggable_optical_module -> ai_server`，原因是“插入 switches and servers”是直接文字证据，但报告没有披露二者收入拆分；AI 服务器侧还包含从一般数据中心服务器到 AI 服务器的应用推断。

## 局限性

AAOI 不是一个纯 AI 数据中心光模块公司。2025 年 CATV 收入超过 data center 收入，所以不能用公司总收入增长代表 AI 数据中心光模块增长。

这份 10-K 没有披露 CPO 收入或 CPO 盈利，因此不生成 CPO 节点或 CPO 边的图谱信号。

原始 HTML 已保存在 `raw/aaoi20251231_10k.htm`，该目录被 Git 忽略；结构化结果保存在同目录的 `extracted.json`。
