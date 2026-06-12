# 01 Round 1：项目初始化提示词

## 目标

初始化项目基础结构，但不做具体页面。

## 给 Codex 的提示词

```text
请执行 Round 1：项目初始化。

必须阅读：
- AGENTS.md
- README.md
- development-plan/00_DEVELOPMENT_SEQUENCE.md
- development-plan/02_MVP_SCOPE_LOCK.md
- docs/31_FINAL_PACKAGE_OVERVIEW.md

任务：
1. 初始化 Next.js + TypeScript + Tailwind CSS 项目；
2. 配置基础目录结构；
3. 安装并配置 shadcn/ui；
4. 安装 lucide-react、recharts、clsx、tailwind-merge；
5. 建立 src/data/mock/ 目录；
6. 建立 src/components/ 目录；
7. 建立 src/lib/ 目录；
8. 配置路径别名；
9. 不开发业务页面；
10. 不接数据库；
11. 不接 AI API。

输出：
- 修改的文件清单；
- 运行命令；
- 当前项目目录；
- 下一轮建议。
```

## 验收标准

1. 项目能启动；
2. Tailwind 生效；
3. shadcn/ui 可用；
4. 目录结构清晰；
5. 没有提前开发页面。
