# 05 Round 5：价格库核心页面提示词

## 目标

完成设备价格、地材价格、供应商三个核心业务模块。

## 给 Codex 的提示词

```text
请执行 Round 5：价格库核心页面。

必须阅读：
- field-dictionary/01_EQUIPMENT_PRICE_FIELDS.md
- field-dictionary/02_MATERIAL_PRICE_FIELDS.md
- field-dictionary/03_SUPPLIER_FIELDS.md
- field-dictionary/10_PAGE_FIELD_USAGE_MATRIX.md
- mock-data-spec/02_EQUIPMENT_PRICE_MOCK_DATA.md
- mock-data-spec/03_MATERIAL_PRICE_MOCK_DATA.md
- mock-data-spec/04_SUPPLIER_MOCK_DATA.md
- visual-references/ui-images/02_equipment_price_library_ai.png
- visual-references/ui-images/05_material_price_library_ai.png
- visual-references/ui-images/07_supplier_library_ai.png

任务：
1. 实现 /equipment-prices；
2. 实现 /equipment-prices/[id]；
3. 实现 /material-prices；
4. 实现 /suppliers；
5. 实现 /suppliers/[id]；
6. 表格字段必须符合字段字典；
7. 支持筛选、搜索、状态标签、可信度标签；
8. 空状态使用对应 empty_*.png；
9. 使用 mock-data/ 中数据；
10. 不接真实 API。

输出：
- 页面清单；
- 表格字段清单；
- mock 数据引用；
- 视觉对照自查。
```

## 验收标准

1. 表格字段完整；
2. 状态标签明确；
3. 可信度和风险清楚；
4. 详情页能展示证据链入口；
5. 供应商能和价格数据关联。
