# Spec Kit Documentation Map

The project uses GitHub Spec Kit's spec-driven development artifacts. The current workflow separates durable product principles, observable feature requirements, implementation design, and execution tasks. See the [official Spec Kit quickstart](https://github.github.com/spec-kit/quickstart) and [workflow reference](https://github.com/github/spec-kit/blob/main/docs/reference/agentic-sdd.md).

## Project structure

```text
.specify/
  memory/constitution.md          # invariant product/engineering principles
specs/
  001-investor-due-diligence-demo/
    spec.md                       # user needs and acceptance criteria (WHAT)
    plan.md                       # architecture and implementation approach (HOW)
    tasks.md                      # ordered implementation backlog
    data-model.md                 # domain records and evidence contract
    contracts/openapi.yaml        # proposed HTTP contract
docs/
  FINANCIAL_ENGINE.md             # formulas, assumptions, unresolved methods
  EXTERNAL_SERVICES.md            # tools, cost, selection, privacy constraints
  DATA.md                         # workbook schema and current source decisions
  UI_DESIGN.md                    # existing visual design reference
  TECH_STACK.md                   # existing implementation inventory
```

## Working sequence

1. Review or amend the constitution before changing product-wide rules.
2. Update `spec.md` with user-visible behavior and acceptance criteria.
3. Resolve open decisions in `plan.md` before locking architecture.
4. Update domain/API contracts and financial methodology documents.
5. Break approved work into tasks; implement one user story at a time.
6. Reconcile docs with the shipped behavior and mark status honestly.

This repository contains the Spec Kit document organization, not necessarily the Spec Kit CLI or agent commands. The artifacts can be used directly or later connected to Spec Kit tooling.
