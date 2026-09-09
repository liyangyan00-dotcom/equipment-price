# 水务智采域名绑定与提交前核验

## 域名

- 正式入口：https://www.aquacost.cn
- GitHub：https://github.com/liyangyan00-dotcom/equipment-price
- Vercel 项目：shuiwu-zhicai；仅绑定本项目的生产部署。
- 阿里云 www CNAME：861f6149aa58ebf1.vercel-dns-017.com。
- DNS 配置通过 Vercel 校验；HTTPS 证书已签发，自动续期已启用。
- HTTPS 根路径、登录页和未登录工作台访问均检查通过，登录页标题为水务智采。
- 本次域名操作未修改招标系统、现场询价系统或共享数据库。

## 本次代码差异

- BOQ 解析接受上传工具生成的扁平对象路径，同时兼容历史嵌套路径；拒绝跨组织、跨项目及路径穿越。
- 存储对象采用 ASCII BOQ 文件名，附件原始名称仍保留原文件名。
- BOQ 附件使用数据库允许的 other 类型，metadata.documentPurpose 保留 boq_source 用途。
- 已人工确认的套价行展示确认状态，避免继续标记为尚未确认的 AI 推荐。

## 验证与边界

- BOQ 存储行为测试：3 项通过。
- 本地发布回归：191 项通过。
- TypeScript 类型检查通过。
- 本次提交推送不等于已完成新的生产部署；不将本地验证描述为生产全流程验收。
- screenshot-diffs 与 supplier-data 中的 Round / Mock 记录是历史阶段资料，以各文档标注的阶段为准。
