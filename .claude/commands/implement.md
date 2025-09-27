---
description: Execute an implementation plan with progress tracking and plan updates.
---

The user input is provided as a command argument - you **MUST** analyze it before executing the implementation workflow (if not empty).

User input:

$ARGUMENTS

The text that the user typed after `/implement` in the triggering message contains:

1. **PLAN_FILE reference** (required): The plan file identifier (e.g., `P001-theme-toggle-implementation`)
2. **Implementation scope** (optional): Specific phase or instruction (e.g., `phase 1`, `phase 2-4`, `continue from phase 3`)

Examples:

- `/implement P001-theme-toggle-implementation` → Execute the entire plan from start to finish
- `/implement P001-theme-toggle-tests phase 1` → Execute only phase 1 of the test plan
- `/implement P001-theme-toggle-implementation phase 2-4` → Execute phases 2 through 4
- `/implement P001-theme-toggle-implementation continue from phase 3` → Resume from phase 3 onwards

If no plan file is provided, stop and instruct the user to re-run the command with a plan file included.

Given the plan file reference and optional implementation scope, follow this workflow:

1. **Parse Input and Read Files**
   - Parse the implementation scope from user input (default: entire plan)
   - Read `ai-artifacts/plans/[PLAN_FILE].md` to understand the implementation plan
   - Extract spec reference from plan and read the original `ai-artifacts/specs/[SPEC_FILE].md`
   - If any files are missing: **ERROR** with appropriate message

2. **Initialize Todo Tracking**
   - Use TodoWrite tool to create essential workflow todos:
     - "Read plan file and understand implementation approach"
     - "Read spec file and understand requirements"
     - Add specific implementation task todos as you work through each phase
     - "Update plan file with implementation progress"
   - Always maintain the workflow todos as reminders of the process discipline

3. **Execute Implementation**
   - Work through the specified scope systematically according to the plan
   - For each phase: implement tasks, run validation, update plan file checkboxes
   - Use todos to stay disciplined about reading requirements, testing, and updating progress
   - Follow the plan's architectural guidance and existing codebase patterns

4. **Maintain Plan Progress**
   - Update plan file to check off completed tasks: `- [x] Task completed`
   - Update acceptance criteria: `- [x] Criteria validated`
   - Add implementation notes when deviating from the plan
   - Keep the plan file as the source of truth for what's actually done
