# DigraVinci DSL — Syntax Reference

Sources: `HelpModal.tsx`, `Parser.ts`, `Token.ts`, `Element.ts`, `ExecutionEngine.ts`

---

## Element Types

The DSL has six element types. Each type has a single, fixed meaning. And it is recommended to use each accordingly.

| Syntax     | Type           | Meaning                                                                                  |
| ---------- | -------------- | ---------------------------------------------------------------------------------------- |
| `name{}`   | **Object**     | A single identifiable thing: a class, entity, component, or concept.                     |
| `name[]`   | **Collection** | A plurality of things, ideally of the same kind: an array, list, queue, or group.        |
| `name\|\|` | **State**      | A description of existence: a condition, lifecycle stage, or status something can be in. |
| `name()`   | **Function**   | An action: an operation, process, or transformation.                                     |
| `name>>`   | **Flow**       | A carrier of elements: a pipeline stage or I/O boundary.                                 |
| `name<>`   | **Choice**     | A decision point: a conditional branch or routing gate.                                  |

A bare `name` with no wrapper is treated as an **Object**.

---

## Children

Elements can contain children, declared by nesting inside the parent's wrappers.

The meaning of children depends on the parent:

| Parent         | What children represent                                                       | Their role in execution                                                                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Object**     | Sub-components, properties, and methods.                                      | Upserted by the incoming token: children with the same base name are replaced, new ones are appended.                                                                                    |
| **Collection** | Type hints for the kind of items held — purely descriptive, like annotations. | None — the collection accepts all tokens regardless of child types.                                                                                                                      |
| **State**      | Sub-states.                                                                   | None — states accumulate all tokens regardless of children.                                                                                                                              |
| **Function**   | Arguments and parameters — the inputs the function operates on.               | The function receives these as its inputs. Outputs are routed through outgoing `flow>>` elements, unless overridden by a special function (e.g. `gen`). Passes through if no children.   |
| **Flow**       | The type of elements being carried.                                           | A type filter — only matching-type tokens pass through, or all if empty.                                                                                                                 |
| **Choice**     | The condition to evaluate.                                                    | A condition selector — tokens matching any child (by type, and by name if the child is named) are routed to the "yes" branch; all others go to "no". Routes all to "yes" if no children. |

---

## Execution Behaviour

| Element        | When a token arrives                                                                                                                                             | At a dead end             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| **Object**     | Upserts the token's children into its own — same-named children replace existing ones, new ones are appended.                                                    | Same.                     |
| **Collection** | Accumulates the token; it persists at this element.                                                                                                              | Token stays indefinitely. |
| **State**      | Accumulates the token; it persists at this element.                                                                                                              | Token stays indefinitely. |
| **Function**   | Receives the token as input, using its children as arguments. Output is routed through outgoing `flow>>` elements. Passes through unchanged if no children.      | Token is removed.         |
| **Flow**       | Passes the token through, subject to child-type filtering, or all if empty.                                                                                      | Token is removed.         |
| **Choice**     | Routes to the "yes" branch (or the first branch if none is labeled "yes") when a child condition matches; to "no" otherwise. Routes all to "yes" if no children. | Token is removed.         |

### Special functions

Function elements whose name matches one of the following identifiers have built-in execution behaviour.

| Name             | Behaviour                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `gen(children)`  | Produces a clone of its children on every tick, independent of incoming tokens.           |
| `round_robin()`  | Distributes incoming tokens across outgoing targets one by one in order.                  |
| `multiplier_N()` | Produces N independent copies of the incoming token, all forwarded to the same target.    |
| `duplicator()`   | Sends one copy of the incoming token to each outgoing target.                             |
| `deduplicator()` | Forwards a token only if its base name has not been seen yet this tick; drops duplicates. |
| `throttler_N()`  | Forwards the token only on every Nth tick; drops it on all others.                        |
| `connector()`    | Merges all tokens currently at this element into a single combined token.                 |
| `disconnector()` | Splits a combined token back into individual single-element tokens.                       |

---

## Relationship Types

Six types. Any element referenced in a relationship that has not been declared yet is created automatically as an **Object**.

| Syntax      | Name        | Meaning                                                     |
| ----------- | ----------- | ----------------------------------------------------------- |
| `a --> b`   | Association | A standard directed dependency.                             |
| `a ..> b`   | Dependency  | A loose or optional dependency, rendered dashed.            |
| `a --\|> b` | Inheritance | IS-A or extends.                                            |
| `a ..\|> b` | Realization | Implements a contract.                                      |
| `a o-- b`   | Aggregation | Has-a with weak ownership; the diamond is drawn on `a`.     |
| `a *-- b`   | Composition | Part-of with strong ownership; the diamond is drawn on `a`. |

All six types have mirror forms (`<--`, `<..`, `<|--`, `<|..`, `--o`, `--*`) that place the arrowhead or diamond on the opposite element. They are the same six types written from the other direction.

---

## Labels

A label attaches a word or quoted string to a relationship. It must sit between two arrow fragments:

```
a --label--> b
a --label--|> b
a o--label-- b
```

When the two fragments differ, the more specific one determines the relationship type — a decorated fragment like `--|>` takes precedence over a plain `--`. Using the same type on both sides is valid but redundant.

Labels must be a single identifier or a quoted string. No element wrappers are permitted inside a label.

---

## Flags

Elements accept one or more named flags, used for selector targeting:

```
knight:fine
knight:fine:current
```

---

## Directives

Lines beginning with `!` are directives. They configure rules and selectors and are not elements.

```
!rule     id=fn  function_name=.*
!selector name=functions  expression=fn  color=#ff6b35  mode=color
```

---

## Inline chains

Elements and relationships can be written on a single line:

```
A --> B --> C
A{child1 child2} --> B
gen(Item{}) --> queue[] --> handler()
```

---

## Comments

`#` begins a line comment. Everything after it on that line is ignored.

```
# full-line comment
A --> B  # inline comment
```

---

## Path references

Dot notation targets a nested element without redeclaring it:

```
system.frontend.pages --> system.backend.api
.child   # relative — resolves to a child of the current parent
```
