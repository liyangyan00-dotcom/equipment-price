# Deployment And Build Checklist

> 历史前端Mock阶段记录，不是当前参赛版本的发布证明。当前系统已接入认证和业务数据库；下文的“无需真实密钥”“Latest result: Passed”等结论不可用于本次部署验收。当前门禁见 `COMPETITION_RELEASE_READINESS_2026-09-06.md`。

## Local Development

Command:

```bash
npm run dev
```

Expected:

- Dev server starts on `http://127.0.0.1:3100`.
- All core routes render without white screen.
- Existing local route probe returned HTTP 200 for all required routes.

## Production Build

Command:

```bash
npm run build
```

Latest result: Passed.

## Lint

Command:

```bash
npm run lint
```

Latest result: Passed with no warnings after unused variable cleanup.

## TypeScript

Command:

```bash
npx tsc --noEmit
```

Latest result: Passed.

## Required Pre-Deployment Checks

- Confirm environment uses Node compatible with Next.js 16.
- Confirm no real secrets are needed for current frontend MVP.
- Confirm mock-only scope is documented for demo users.
- Confirm route list in `01_PAGE_ROUTE_INVENTORY.md` matches deployed routes.
- Confirm report/export/upload functions are presented as mock actions.

## Demo URL

Recommended local URL:

```text
http://127.0.0.1:3100/dashboard
```
