# 25 Mock 数据清单与字段字典说明

## 一、本次新增内容

本次新增两个核心目录：

```text
field-dictionary/
mock-data-spec/
```

并新增一个示例 mock 数据目录：

```text
mock-data/
```

## 二、字段字典用途

字段字典用于约束：

- 页面表格字段；
- 前端 TypeScript 类型；
- 数据库字段；
- AI 输出字段；
- mock 数据字段；
- 后续 API 字段。

## 三、Mock 数据用途

Mock 数据用于后续 Codex 还原 UI 时展示真实业务场景。

必须覆盖：

- 设备价格；
- 地材价格；
- 供应商；
- AI任务；
- 待审核报价；
- 价格线索；
- 询价比价；
- 项目套价；
- 附件证据；
- 报告；
- 系统设置。

## 四、当前阶段仍不开发代码

本次只是补齐规范和示例数据，不进入组件库开发。

正式交给 Codex 时，再让 Codex 将 `mock-data/` 转换为：

```text
src/data/mock/*.ts
```
