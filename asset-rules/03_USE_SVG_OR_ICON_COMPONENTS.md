# 03 应使用 SVG / Icon Components 的内容

## 一、菜单图标

建议用 lucide-react 或自定义 SVG：

| 菜单 | 图标建议 |
|---|---|
| 首页 | Home |
| 设备价格库 | Package / Cog |
| 地材价格库 | Layers |
| 供应商库 | Users |
| AI报价识别 | ScanLine / Bot |
| 待审核报价 | FileClock |
| AI价格采集 | SearchCheck / Radar |
| 价格线索池 | DatabaseZap |
| 询价比价 | Scale |
| 项目套价 | Calculator |
| 附件证据 | FolderArchive |
| 统计分析 | BarChart |
| AI工作台 | Bot |
| AI报告中心 | FileText |
| 系统设置 | Settings |

## 二、操作图标

- 新增；
- 编辑；
- 查看；
- 删除；
- 下载；
- 上传；
- 导出；
- 筛选；
- 搜索；
- 刷新；
- 确认；
- 作废；
- 复核。

## 三、状态图标

- 成功；
- 警告；
- 风险；
- AI；
- 待审核；
- 已确认；
- 已作废；
- 缺失信息。

## 四、品牌 Logo

建议使用 SVG：

```text
assets/svg-icons/logo_water_price_system.svg
```

Logo 应包含：

- 水滴；
- 数据线条；
- 工程蓝色；
- 简洁可识别。

## 五、SVG 规范

1. 使用 `currentColor` 或系统色；
2. 支持 16/20/24/32px；
3. 不要复杂渐变；
4. 不要包含位图；
5. 图标风格统一为线性或轻量面性；
6. 可直接作为 React component 使用。

## 六、当前已完成 SVG 资产

已生成并归档到：

```text
assets/svg-icons/
```

包含：

- 系统 Logo；
- 导航图标；
- 操作图标；
- 状态图标。

重要说明：

前端开发时优先使用 `lucide-react`，本目录 SVG 作为自定义图标资产。  
如果使用本目录 SVG，应转换为 React 组件或通过 `<img>` / `next/image` 引用。
