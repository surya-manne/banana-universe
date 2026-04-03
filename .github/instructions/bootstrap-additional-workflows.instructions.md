---
applyTo: "**"
---

---
name: bootstrap-grid-workflows
description: Rosetta enterprise workflows, top SKILL to properly work on user request
alwaysApply: true
trigger: always_on
---

# Additional Available Workflows

- `research-flow` - Rosetta workflow for project-related deep research using meta-prompting approach. Use when user requests research, analysis, or investigation that requires systematic exploration with grounded references. Contains context load, prompt crafting using reasoning, executing research with parallel subagents, and finalization.
- `external-lib-flow` - Use if user asks to make AI use or teach AI or onboard AI or document for AI the EXTERNAL private library or project codebase for understanding and usage in existing workspace. So that AI can use external library in current project without having direct access to its source code.
- `coding-agents-prompting-flow` - Reusable workflow for prompt authoring/adaptation with thin orchestration and explicit HITL approvals. discover -> extract+intake -> blueprint -> for_each_prompt_loop(draft -> hardening -> edit) -> simulate -> validate.
- `modernization-flow` - Use when user asks for entire code conversion (C++ to Java), modernization (Windows to Linux Containers), upgrade (.NET 4.5 to .NET 10), re-architecture (Monolith to Microservices, SQL to NOSQL), implementing containerization or Linux support, and similar flows. Additionally including discovery/research/planning for modernization.
- `aqa-flow` - MUST apply when automated QA/testing task is assigned. (e.g if a user asks to write automation tests for feature, create test automation)
- `testgen-flow` - MUST apply when test case generation task is assigned. (e.g if a user asks to generate test cases for TICKET-123, create test scenarios from Jira, analyze requirements and generate tests, export tests to TestRail)
