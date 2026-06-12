# 02 MVP 范围锁定

## 一、MVP 目标

第一版 MVP 不是完整系统，而是展示：

> 水厂工程价格信息库 + AI报价识别 + AI价格采集 + 项目套价 + AI报告 的核心闭环。

## 二、MVP 页面

### 必做页面

```text
/login
/dashboard
/equipment-prices
/material-prices
/suppliers
/ai-quote-recognition
/pending-quotes
/ai-price-collection
/price-leads
/project-pricing
/ai-report-center
```

### MVP 必做能力

1. 登录页高质量展示；
2. 首页展示价格库规模、AI任务、风险预警；
3. 设备价格表格可筛选、可查看、可显示可信度；
4. 地材价格表格可筛选、可显示地区与运输条件；
5. 供应商表格可展示评分和风险；
6. AI报价识别展示上传、识别、风险、待审核；
7. 待审核报价支持确认/需补充/作废的 UI 闭环；
8. AI价格采集支持任务创建与线索进入线索池；
9. 项目套价中心支持 BOQ 匹配结果展示；
10. AI报告中心支持报告生成配置和报告列表。

## 三、MVP 暂不做

```text
真实登录
真实数据库
真实AI API
真实文件上传
复杂权限
多语言
正式部署
完整报表导出
```

## 四、MVP 验收标准

MVP 达标条件：

1. 视觉高度贴近 28 页参考图；
2. 页面字段符合字段字典；
3. 使用 mock 数据驱动；
4. 表格、图表、按钮全部用代码实现；
5. Image2 仅用于背景、插图、装饰；
6. SVG/lucide-react 仅用于图标；
7. AI结果不直接入库，必须进入待审核流程；
8. 页面通过 `acceptance-checklists/` 的 P0 项。
