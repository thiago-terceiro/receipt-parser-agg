# Engineering Workflow Rules

## General Principles

* Prefer simple, readable, and maintainable solutions over clever or overly abstract ones.

* Use clear naming, small focused functions, explicit error handling, and consistent structure.

* Prioritize correctness first, then improve performance with efficient algorithms and data structures when it meaningfully helps without harming readability.

* Always check the web when additional context, framework behavior, documentation, library changes, security implications, or ecosystem best practices may be relevant, even if the user did not explicitly request it.

## Planning and Execution

* Every task plan must be broken into micro-steps:

  1. Understand the requirement
  2. Inspect the existing implementation
  3. Create a minimal scoped plan
  4. Add or update tests
  5. Implement incrementally
  6. Run tests and validation
  7. Perform self-review
  8. Check edge cases and regressions
  9. Verify DX and UX impacts
  10. Prepare review-friendly diffs
  11. Move to the next validated step

* Prefer incremental and reversible changes over large rewrites.

* Avoid mixing unrelated refactors into feature or bug-fix work.

## Code Review Expectations

* Treat every change as if it will go through a strict PR review.

* Optimize for reviewer readability:

  * keep diffs focused and isolated,
  * preserve existing conventions unless intentionally improving them,
  * minimize unnecessary churn,
  * explain tradeoffs clearly,
  * and structure commits logically.

* Perform an adversarial review of every code change:

  * identify potential state management issues,
  * rendering performance regressions,
  * unnecessary re-renders,
  * race conditions,
  * UX inconsistencies,
  * accessibility regressions,
  * hydration or async boundary issues,
  * memory leaks,
  * and maintainability concerns.

## Frontend and UI Expectations

* When modifying UI code:

  * analyze rendering behavior,
  * verify memoization boundaries,
  * minimize unnecessary state,
  * avoid duplicated derived state,
  * validate loading, error, and empty states,
  * and ensure accessibility expectations are preserved.

* Prefer predictable data flow and composable components over tightly coupled abstractions.

## Validation Before Completion

* Before finalizing any change:

  * run relevant tests,
  * validate accessibility,
  * review for regressions,
  * verify developer experience impacts,
  * and summarize risks and follow-up opportunities.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
