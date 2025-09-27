---
description: Create or update the feature specification from a natural language feature description.
---

The user input to you is provided as a command argument - you **MUST** consider it before proceeding with the prompt (if not empty).

User input:

$ARGUMENTS

The text the user typed after `/specify` in the triggering message **is** the feature description. Do not ask the user to repeat it unless they provided an empty command.

Given that feature description, do this:

1. Parse user description from input
   → If empty: ERROR "No feature description provided"
2. Read `ai-artifacts/templates/spec-template.md` to understand required sections
3. Determine the correct SPEC_FILE to use
   → Use the spec file mentioned in user input if available
   → Create new spec file in `ai-artifacts/specs/`, following naming convention like `001-my-new-feature.md`
4. Write the specification to SPEC_FILE using the template structure, replacing placeholders with concrete details derived from the feature description (arguments) while preserving section order and headings:
   a. Extract key concepts from description
   → Identify: actors, actions, data, constraints
   b. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
   c. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
   d. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
   e. Identify Key Entities (if data is involved)
5. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
6. Return: SUCCESS (spec ready for planning) and report the spec file path

---

Review & Acceptance Checklist:

- No implementation details (languages, frameworks, APIs)
- Focused on user value and business needs
- Written for non-technical stakeholders
- All mandatory sections completed
- No [NEEDS CLARIFICATION] markers remain
- Requirements are testable and unambiguous
- Success criteria are measurable
- Scope is clearly bounded
- Dependencies and assumptions identified

---

## ⚡ Quick Guidelines

- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements

- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation

When creating this spec from a user prompt:

1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common under-specified areas**:
   - User types and permissions
   - Data retention/deletion policies
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs
