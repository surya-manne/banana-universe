# Rosetta KB Full List — Phase 4 Reference

Generated during Phase 4 (Rules) of init-workspace-flow.

## Exclusion Set Applied
- `init-workspace-*` skills and workflows → EXCLUDED
- `templates/shell-schemas/*` → EXCLUDED
- `configure/*` → EXCLUDED
- `rules/bootstrap.md` → EXCLUDED (already in copilot-instructions.md)

## Full KB Listing

```
agents/architect.md
agents/discoverer.md
agents/engineer.md
agents/executor.md
agents/planner.md
agents/prompt-engineer.md
agents/researcher.md
agents/reviewer.md
agents/validator.md
configure/antigravity.md              [EXCLUDED]
configure/claude-code.md              [EXCLUDED]
configure/cursor.md                   [EXCLUDED]
configure/github-copilot.md           [EXCLUDED]
configure/jetbrains-junie.md          [EXCLUDED]
configure/opencode.md                 [EXCLUDED]
configure/windsurf.md                 [EXCLUDED]
rules/bootstrap-additional-workflows.md
rules/bootstrap-core-policy.md
rules/bootstrap-execution-policy.md
rules/bootstrap-guardrails.md
rules/bootstrap-hitl-questioning.md
rules/bootstrap-rosetta-files.md
rules/bootstrap.md                    [EXCLUDED]
rules/coding-iac-best-practices.md
rules/local-files-mode.md
rules/plugin-files-mode.md
rules/prompt-best-practices.md
rules/requirements-best-practices.md
rules/requirements-use-best-practices.md
rules/speckit-integration-policy.md
skills/coding-agents-farm/SKILL.md
skills/coding-agents-prompt-adaptation/SKILL.md
skills/coding-agents-prompt-authoring/SKILL.md
skills/coding-agents-prompt-authoring/assets/pa-change-log.md
skills/coding-agents-prompt-authoring/assets/pa-meta-prompt.md
skills/coding-agents-prompt-authoring/assets/pa-prompt-brief.md
skills/coding-agents-prompt-authoring/assets/pa-validation-report.md
skills/coding-agents-prompt-authoring/references/pa-best-practices.md
skills/coding-agents-prompt-authoring/references/pa-blueprint.md
skills/coding-agents-prompt-authoring/references/pa-draft.md
skills/coding-agents-prompt-authoring/references/pa-edit.md
skills/coding-agents-prompt-authoring/references/pa-extract.md
skills/coding-agents-prompt-authoring/references/pa-hardening.md
skills/coding-agents-prompt-authoring/references/pa-intake.md
skills/coding-agents-prompt-authoring/references/pa-knowledge-base.md
skills/coding-agents-prompt-authoring/references/pa-patterns.md
skills/coding-agents-prompt-authoring/references/pa-rosetta.md
skills/coding-agents-prompt-authoring/references/pa-schemas.md
skills/coding-agents-prompt-authoring/references/pa-simulation.md
skills/coding/SKILL.md
skills/debugging/SKILL.md
skills/init-workspace-context/SKILL.md       [EXCLUDED]
skills/init-workspace-discovery/SKILL.md     [EXCLUDED]
skills/init-workspace-discovery/scripts/codemap.ps1.txt  [EXCLUDED]
skills/init-workspace-discovery/scripts/codemap.sh.txt   [EXCLUDED]
skills/init-workspace-documentation/SKILL.md [EXCLUDED]
skills/init-workspace-patterns/SKILL.md      [EXCLUDED]
skills/init-workspace-rules/SKILL.md         [EXCLUDED]
skills/init-workspace-shells/SKILL.md        [EXCLUDED]
skills/init-workspace-verification/SKILL.md  [EXCLUDED]
skills/large-workspace-handling/SKILL.md
skills/load-context/SKILL.md
skills/natural-writing/SKILL.md
skills/planning/SKILL.md
skills/planning/assets/pl-functional-requirements.md
skills/planning/assets/pl-risk-and-unknowns.md
skills/planning/assets/pl-validation-rubric.md
skills/planning/assets/pl-wbs.md
skills/questioning/SKILL.md
skills/reasoning/SKILL.md
skills/requirements-authoring/SKILL.md
skills/requirements-authoring/assets/ra-change-log.md
skills/requirements-authoring/assets/ra-intent-capture.md
skills/requirements-authoring/assets/ra-requirement-unit.xml
skills/requirements-authoring/assets/ra-validation-rubric.md
skills/requirements-use/SKILL.md
skills/requirements-use/assets/ru-change-log.md
skills/requirements-use/assets/ru-scope-capture.md
skills/requirements-use/assets/ru-traceability-matrix.md
skills/requirements-use/assets/ru-validation-rubric.md
skills/research/SKILL.md
skills/reverse-engineering/SKILL.md
skills/tech-specs/SKILL.md
skills/testing/SKILL.md
templates/shell-schemas/agent-shell.md       [EXCLUDED]
templates/shell-schemas/skill-shell.md       [EXCLUDED]
templates/shell-schemas/workflow-shell.md    [EXCLUDED]
workflows/adhoc-flow-with-plan-manager.md
workflows/adhoc-flow.md
workflows/aqa-flow-code-analysis.md
workflows/aqa-flow-data-collection.md
workflows/aqa-flow-requirements-clarification.md
workflows/aqa-flow-selector-identification.md
workflows/aqa-flow-selector-implementation.md
workflows/aqa-flow-test-correction.md
workflows/aqa-flow-test-implementation.md
workflows/aqa-flow-test-report-analysis.md
workflows/aqa-flow.md
workflows/coding-agents-prompting-flow.md
workflows/coding-flow.md
workflows/external-lib-flow.md
workflows/init-workspace-flow-context.md       [EXCLUDED]
workflows/init-workspace-flow-discovery.md     [EXCLUDED]
workflows/init-workspace-flow-documentation.md [EXCLUDED]
workflows/init-workspace-flow-patterns.md      [EXCLUDED]
workflows/init-workspace-flow-questions.md     [EXCLUDED]
workflows/init-workspace-flow-rules.md         [EXCLUDED]
workflows/init-workspace-flow-shells.md        [EXCLUDED]
workflows/init-workspace-flow-verification.md  [EXCLUDED]
workflows/init-workspace-flow.md               [EXCLUDED]
workflows/modernization-flow-analysis.md
workflows/modernization-flow-crossproject.md
workflows/modernization-flow-grouping.md
workflows/modernization-flow-implement.md
workflows/modernization-flow-mapping.md
workflows/modernization-flow-reuse.md
workflows/modernization-flow-review.md
workflows/modernization-flow-testing.md
workflows/modernization-flow.md
workflows/requirements-authoring-flow.md
workflows/research-flow.md
workflows/self-help-flow.md
workflows/testgen-flow-data-collection.md
workflows/testgen-flow-gap-and-contradiction-analysis.md
workflows/testgen-flow-project-config-loading.md
workflows/testgen-flow-question-generation.md
workflows/testgen-flow-requirements-document-generation.md
workflows/testgen-flow-test-case-export.md
workflows/testgen-flow-test-case-generation.md
workflows/testgen-flow.md
```

## Summary

- Total items: 125
- Excluded: 26
- To process: 99
  - Rules: 8 (1 root entry point + 6 bootstrap + 6 non-bootstrap, minus bootstrap.md) 
  - Agents: 9 (skipped for GitHub Copilot — already in .github/agents/)
  - Skills: 42 (17 main SKILL.md + 25 asset/reference sub-files)
  - Workflows: 40 (non-init-workspace workflows + sub-flows)
