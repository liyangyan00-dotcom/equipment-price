# 09 附件与报告 Mock 数据

## 附件示例

```ts
export const attachments = [
  {
    id: 'att_001',
    fileName: '上海某泵业报价单.pdf',
    fileType: 'pdf',
    fileUrl: '/mock/files/pump_quote.pdf',
    relatedType: 'equipment_price',
    relatedId: 'eqp_001',
    supplierId: 'sup_001',
    sourceDescription: '供应商正式报价单',
    uploadedBy: 'admin',
    uploadedAt: '2026-06-10 09:00',
    status: 'active'
  },
  {
    id: 'att_010',
    fileName: 'Kinshasa水泥市场调研.xlsx',
    fileType: 'excel',
    fileUrl: '/mock/files/cement_research.xlsx',
    relatedType: 'material_price',
    relatedId: 'mat_001',
    sourceDescription: '现场市场调研记录',
    uploadedBy: '商务人员',
    uploadedAt: '2026-06-09 16:00',
    status: 'active'
  }
]
```

## 报告示例

```ts
export const reports = [
  {
    id: 'rpt_001',
    reportCode: 'RPT-2026-001',
    reportName: '恩吉利水厂设备价格分析报告',
    reportType: 'equipment_analysis',
    projectName: '刚果金恩吉利水厂项目',
    generatedBy: 'ai',
    status: 'draft',
    content: {
      summary: '本报告基于当前价格库和询价记录生成。',
      riskNotes: ['部分阀门报价条件不完整', '部分价格超过有效期']
    },
    attachmentIds: ['att_001', 'att_002'],
    createdAt: '2026-06-10'
  }
]
```
