# 34 交给 Codex 合并 V4.6 视觉规范的提示词

## 使用场景

如果你已经在 Codex 中完成了 Round 1，且项目仓库基于 V4.5，想把 V4.6 视觉规范合并进去，可复制下面提示词。

```text
请把当前上传/解压的 V4.6 视觉效果规范增强包合并到现有项目规范目录中。

合并要求：

1. 新增整个 `visual-design-spec/` 目录；
2. 覆盖更新 `codex-prompts/02_ROUND_DESIGN_TOKENS_AND_LAYOUT.md`；
3. 覆盖更新 `codex-prompts/03_ROUND_COMPONENT_LIBRARY.md`；
4. 覆盖更新 `acceptance-checklists/01_GLOBAL_UI_ACCEPTANCE.md`；
5. 新增或更新：
   - `docs/33_VISUAL_DESIGN_SPEC_GUIDE.md`
   - `docs/34_CODEX_MERGE_V4_6_VISUAL_SPEC_PROMPT.md`
6. 更新 `README.md`、`AGENTS.md`、`00_DIRECTORY_TREE.md`、`docs/31_FINAL_PACKAGE_OVERVIEW.md`、`docs/30_FINAL_CODEX_HANDOFF_PROMPT.md` 中关于 visual-design-spec 的说明；
7. 不要删除已有规范目录；
8. 不要删除已有 assets、visual-references、field-dictionary、mock-data-spec、api-spec、acceptance-checklists、codex-prompts、development-plan；
9. 不要开发业务页面；
10. 不要修改已经初始化好的 Next.js 代码，除非只是为了后续 Round 2 引用视觉规范。

合并完成后请输出：
1. 新增文件清单；
2. 覆盖更新文件清单；
3. 是否成功加入 visual-design-spec；
4. Round 2 提示词是否已经增强；
5. Round 3 提示词是否已经增强；
6. 验收表是否已经增强；
7. 下一步是否可以执行 Round 2。
```
