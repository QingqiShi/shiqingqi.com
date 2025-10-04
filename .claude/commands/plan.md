---
description: Create an executable implementation plan from a feature specification with phased tasks and technical research.
---

The user input is provided as a command argument - you **MUST** analyze it before executing the planning workflow (if not empty).

User input:

$ARGUMENTS

The text that the user typed after `/plan` in the triggering message contains:

1. **SPEC_FILE reference** (required): The specification file identifier (e.g., `001-my-new-feature`)
2. **Planning scope** (optional): Specific aspect of the work to plan (e.g., testing, refactoring, mobile support)

Examples:

- `/plan 001-theme-toggle` → Plan full implementation of the spec
- `/plan 001-theme-toggle write playwright tests` → Plan only test automation for existing feature
- `/plan 001-theme-toggle refactor existing implementation` → Plan refactoring work
- `/plan 001-theme-toggle add mobile support` → Plan extension of existing feature

If no spec file is provided, stop and instruct the user to re-run the command with a spec file included.

Given the spec file reference and optional planning scope, do this:

1. **Validate Prerequisites**
   → Read `ai-artifacts/specs/[SPEC_FILE].md` to understand the feature specification
   → If file not found: **ERROR:** "Spec file not found. Run /specify first."

   → **Validate Spec Status:**
   - Extract Status field from spec header (treat missing as "active" for backward compatibility)
   - IF status == "superseded":
     - Extract "Superseded by" field
     - Display warning: "⚠️ SPEC SUPERSEDED - Spec '{SPEC_FILE}' was superseded by: {list successor specs}. The feature was broken down into smaller specs. Recommend: Plan one of the successor specs instead. Continue with superseded spec? (y/n)"
     - PAUSE for user confirmation
     - If user says no: STOP with message to plan successor specs
   - ELSE IF status == "deprecated":
     - ERROR: "❌ Cannot plan deprecated spec '{SPEC_FILE}'"
     - STOP execution

   → If contains [NEEDS CLARIFICATION]: **ERROR:** "Spec has unresolved ambiguities. Update spec first."
   → If spec incomplete: **ERROR:** "Spec must be complete before planning."
   → Read `ai-artifacts/templates/plan-template.md` to understand required sections

2. **Determine Planning Scope**
   → Parse the planning scope from user input (if provided)
   → Default scope: Full implementation of the specification
   → Custom scope examples: testing, refactoring, extending, or documenting
   → Validate that scope is achievable and well-defined

3. **Analyze Specification**
   → Extract user stories and acceptance criteria relevant to the planning scope
   → Identify functional and non-functional requirements within scope
   → Note success criteria and validation methods for the planned work
   → List technical dependencies, external constraints, and prerequisite work affecting the scope

4. **Research Codebase Architecture**
   → Examine existing patterns in the codebase
   → Identify relevant files, components, and utilities
   → Map out data flow and integration points
   → Document current conventions and best practices
   → Note testing patterns and infrastructure

5. **Create Implementation Plan**
   → Generate `ai-artifacts/plans/P[SPEC_NUMBER]-[scope-description].md`
   → Examples: `P001-theme-toggle-implementation.md`, `P001-theme-toggle-tests.md`
   → Note: SPEC_NUMBER should match the number from the SPEC_FILE reference
   → Use `ai-artifacts/templates/plan-template.md` as the structure
   → Replace placeholders with concrete details derived from the specification and scope
   → Break the work into primitive, deliverable phases
   → Each phase must be individually testable and verifiable
   → Include validation checkpoints and feedback loops

6. **Validate Plan Quality**
   → Each phase has clear acceptance criteria
   → All phases are independently deliverable
   → Testing strategy is defined for each phase
   → No phase depends on future, unbuilt components
   → The plan is executable without ambiguity

7. **Return Plan Summary**
   → Report the plan file path
   → List the number of phases created
   → Highlight the planning scope covered

---

## Workflow Summary

The `/plan` command follows this workflow:

1. Validates that the specified spec file exists and is complete
2. Determines the planning scope (full implementation or specific aspect)
3. Analyzes the specification and researches existing codebase patterns
4. Generates a detailed implementation plan with phased tasks
5. Validates the plan quality and returns a summary

---

## Quality Guidelines

### Phase Design Principles

- **Atomic**: Each phase delivers a complete, working increment
- **Testable**: Every phase has clear validation criteria
- **Independent**: Phases can be developed and deployed separately
- **Measurable**: Success criteria are objective and verifiable

### Common Anti-Patterns to Avoid

- **Avoid:** Phases that depend on incomplete future work
- **Avoid:** "Research" or "Investigation" phases without concrete deliverables
- **Avoid:** Large, vague phases like "implement the feature" or "build the UI"
- **Avoid:** Vague acceptance criteria like "works correctly" or "functions properly"
- **Avoid:** Missing test validation strategies for any phase

### Validation Checkpoints

- Does each phase have clear, testable acceptance criteria?
- Can each phase be verified independently?
- Are there feedback loops to catch issues early?
- Is the plan executable by a developer unfamiliar with the feature?
- Are all architectural decisions documented and justified?
