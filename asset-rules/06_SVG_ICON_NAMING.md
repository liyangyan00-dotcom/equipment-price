# 06 SVG 图标命名规范

## 一、目录

```text
assets/svg-icons/
```

## 二、命名规则

```text
icon_<module>_<action>.svg
```

示例：

```text
icon_nav_dashboard.svg
icon_nav_equipment.svg
icon_nav_material.svg
icon_nav_supplier.svg
icon_nav_ai_quote.svg
icon_action_upload.svg
icon_action_export.svg
icon_status_risk.svg
icon_status_confirmed.svg
icon_ai_bot.svg
```

## 三、图标清单

### 导航图标

- icon_nav_dashboard.svg
- icon_nav_equipment.svg
- icon_nav_material.svg
- icon_nav_supplier.svg
- icon_nav_inquiry.svg
- icon_nav_project_pricing.svg
- icon_nav_attachment.svg
- icon_nav_analytics.svg
- icon_nav_ai_workbench.svg
- icon_nav_settings.svg

### 操作图标

- icon_action_add.svg
- icon_action_edit.svg
- icon_action_view.svg
- icon_action_delete.svg
- icon_action_upload.svg
- icon_action_download.svg
- icon_action_export.svg
- icon_action_filter.svg
- icon_action_search.svg
- icon_action_refresh.svg
- icon_action_confirm.svg

### 状态图标

- icon_status_confirmed.svg
- icon_status_pending.svg
- icon_status_warning.svg
- icon_status_risk.svg
- icon_status_voided.svg
- icon_status_ai.svg

## 四、实现方式

优先使用 lucide-react。  
如确需自定义 SVG，放入 `assets/svg-icons/` 并转换为 React component。
