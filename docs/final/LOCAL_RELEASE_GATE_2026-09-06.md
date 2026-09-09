# 累计本地质量门禁

日期：2026-09-06。整体发布状态：未完成，不可据此认定参赛交付已就绪。

## 本轮实测

| 检查 | 结果 | 证明边界 |
| --- | --- | --- |
| npm run build | 退出0，82个静态页面生成完成 | Windows、Node v24.15.0，现有.env.local环境；不是无配置CI或公网部署结果 |
| npm run lint | 全量退出0 | 当前工作树，包括尚未提交文件 |
| npm run test:release-local | 151项通过，无失败/跳过 | 单元、合成传输路由、PGlite本地数据库与源码契约混合测试；不是151项线上端到端验证 |
| npm run check:migrations | 172条历史、2条待应用、52份原件一致 | 对2026-09-06保存的只读快照离线核对；没有查询或修改当前云端迁移状态 |
| local-quality.yml | YAML可解析，9步骤、只读contents、Action固定SHA | 本地配置检查；GitHub未运行、未设置必需检查 |
| npm run test:browser-material | 本地通过并正常退出 | 隔离服务、真实组件与构建CSS、合成API；不验证登录态后端 |

当前Git HEAD为6292618fad26918f92c0b8e37198c4194336eca2，但本次测试对象是有大量修改和未跟踪文件的工作树，不能把该HEAD当作已冻结的完整测试版本。

## 可重复入口

- `npm run test:release-local`收录本轮使用的11个测试文件，不包含seed、业务采集或云端写入。
- `npm run check:migrations`只检查本地历史与待应用清单，不执行DDL。
- `.github/workflows/local-quality.yml`在push、pull_request或手动触发时，执行npm ci、Lint、本地测试、离线迁移核对和生产构建。Node24、20分钟超时、同分支新运行取消旧运行。
- 不配置业务数据库凭据、服务密钥、部署token或自动发布，不使用pull_request_target。
- Checkout关闭持久化凭据；checkout v7与setup-node v6固定到本轮从官方仓库标签核实的40位提交SHA。[Checkout官方说明](https://github.com/actions/checkout)、[Setup Node官方说明](https://github.com/actions/setup-node)。

## 仍然不能省略

1. 将所需业务源码、测试、迁移快照和配置审查后一起提交；不是只推送工作流文件。
2. 在远程PR上完成首次CI运行，检查无本地.env.local时构建及Linux路径行为；失败应修复，不能注入正式密钥来让只读质量任务通过。
3. 用户确认仓库策略后设置必需检查；当前没有更改仓库设置。
4. 浏览器回归已固定Playwright开发依赖并加入CI配置，首次远程运行尚未验证；登录态权限、云端Worker、7业务流程、CDF真实证据落库、公网只读体验仍需独立验收。
5. 完成主列表分页/聚合、真实Egress观察、脱敏环境部署与授权成效证据。不能用绿色本地门禁代替R01至R12完整交付。

本轮没有提交、推送、部署、创建资源或应用数据库迁移。

## 浏览器回归可移植性补充

- 开发依赖固定playwright 1.63.0并更新锁文件；本地安装Chromium后使用项目依赖运行，不要求个人Codex缓存路径。npm安装返回依赖审计0漏洞，这是该次依赖审计结果，不是全系统安全证明。
- 新机器顺序：`npm ci`、`npm run build`、`npx playwright install chromium`、`npm run test:browser-material`。Linux CI使用`npx playwright install --with-deps chromium`补齐系统依赖。
- `scripts/run-material-browser.cjs`只在127.0.0.1随机端口提供构建样式与字体等静态白名单；不会加载.env.local、连接数据库或实现业务API。完成或测试失败后关闭服务器。
- 测试读取真实组件，浏览器API请求使用合成响应，外部站点被阻止。测试服务的/login仅是样式容器，不是应用登录页、评审登录入口或认证绕过；不能把它交付给组委会。
- 真实审核/新增/编辑/主列表组件用例与1440/390截图通过；生产CSS来自当前.next/static，测试前必须重新构建，不能拿旧样式作为新版本证据。
- 当前CI执行顺序为安装依赖、Lint、151项本地测试、迁移离线校验、构建、安装浏览器、组件浏览器回归，另含两个环境准备Action，共9步骤。没有自动部署或业务周期任务。
