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

   - **Validate Plan and Spec Status:**
     - Extract Status fields from plan and spec headers (treat missing as active/planned for backward compatibility)
     - IF plan.status == "obsolete":
       - ERROR: "❌ Cannot implement obsolete plan '{PLAN_FILE}'"
       - STOP execution
     - IF spec.status == "superseded":
       - IF plan.status == "completed":
         - Display info: "ℹ️ HISTORICAL IMPLEMENTATION - Spec '{spec_file}' was superseded by: {superseded_by}. This plan was completed before the spec breakdown. Continuing as historical record..."
         - Continue to step 2
       - ELSE IF plan.status IN ["in-progress", "planned"]:
         - Display warning: "⚠️ SUPERSEDED SPEC - Spec '{spec_file}' was superseded by: {superseded_by}. Recommend: Implement plans for successor specs instead. Continue with this plan? (not recommended) (y/n)"
         - PAUSE for confirmation
         - If user says no: STOP
     - ELSE IF spec.status == "deprecated":
       - ERROR: "❌ Cannot implement plan for deprecated spec '{spec_file}'"
       - STOP execution
     - ELSE IF spec.status == "active" OR not present:
       - Continue to step 2

2. **Initialize Todo Tracking**
   - Use TodoWrite tool to create essential workflow todos:
     - "Read plan file and understand implementation approach"
     - "Read spec file and understand requirements"
     - Add specific implementation task todos as you work through each phase
     - "Update plan file with implementation progress"
   - Always maintain the workflow todos as reminders of the process discipline

   - **Update Plan Status:**
     - If plan status is "planned", update to "in_progress"
     - Update header: `**Status:** in_progress`

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

   - **Update Plan Status on Completion:**
     - When all phases in scope are completed, update plan header:
       - `**Status:** completed`
       - `**Completed on:** [current date]`
