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
| **Function**   | Arguments and parameters — the inputs the function operates on. When a child is itself a **function**, it represents a subroutine call rather than an argument. | The function receives non-function children as inputs. If function children are present with internal relationships, execution entering this function is transparently routed through those children in the declared order, then exits to this function's own outgoing targets. Non-function children remain as arguments. Passes through if no children. |
| **Flow**       | The output type — what the flow carries out.                                  | A payload override — the incoming token is replaced with clones of the children; passes through unchanged if empty.                                                                      |
| **Choice**     | The condition to evaluate.                                                    | A condition selector — tokens matching any child (by type, and by name if the child is named) are routed to the "yes" branch; all others go to "no". Routes all to "yes" if no children. |

---

## Execution Behaviour

| Element        | When a token arrives                                                                                                                                             | At a dead end             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| **Object**     | Upserts the token's children into its own — same-named children replace existing ones, new ones are appended.                                                    | Same.                     |
| **Collection** | Accumulates the token; it persists at this element.                                                                                                              | Token stays indefinitely. |
| **State**      | Accumulates the token; it persists at this element.                                                                                                              | Token stays indefinitely. |
| **Function**   | Receives the token as input, using its children as arguments. Output is routed through outgoing `flow>>` elements. Passes through unchanged if no children.      | Token is removed.         |
| **Flow**       | Replaces the token's payload with clones of its children; passes through unchanged if empty.                                                                     | Token is removed.         |
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
| `a ..> b`   | Flow        | A data or execution flow between elements, rendered dashed. |
| `a --\|> b` | Inheritance | IS-A or extends.                                            |
| `a ..\|> b` | Realization | Implements a contract.                                      |
| `a o-- b`   | Aggregation | Has-a with weak ownership; the diamond is drawn on `a`.     |
| `a *-- b`   | Composition | Part-of with strong ownership; the diamond is drawn on `a`. |

All six types have mirror forms (`<--`, `<..`, `<|--`, `<|..`, `--o`, `--*`) that place the arrowhead or diamond on the opposite element. They are the same six types written from the other direction.

**Convention:** use `-->` for structural or ownership relationships (has-a, depends-on, implements) and `..>` for data or execution flows (code change path, visual sync, execution routing).

---

## ERD Quantifiers

Any relationship can carry optional cardinality markers — a source quantifier before the arrow and a target quantifier after it. Both are rendered as small labels near the respective endpoint on the canvas.

```
a 1-->1 b       # one-to-one directed
a 1-->* b       # one-to-many directed
a 1--N b        # one-to-many plain line  (N = "many")
a N--N b        # many-to-many plain line
a 1-->1 b       # works with any relationship type
```

Supported quantifier values:

| Value | Where | Notes |
|-------|-------|-------|
| Digit sequence (`1`, `10`, …) | source or target | Unambiguous — digits can never be element names |
| `N` | source or target | Treated as a quantifier only when it appears immediately adjacent to a relationship token; use a different name for an element you want to call `N` |
| `*` | **target only** | A standalone `*` before `--` conflicts with the `*--` composition token and is not supported as a source quantifier |

Quantifiers are **independent of the relationship type** — the label and the arrow style are unchanged; the quantifier is additive.

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

Elements accept one or more named flags, used for group targeting:

```
knight:fine
knight:fine:current
```

A flag whose slugified form matches a group id causes that element to always be included in the group, regardless of the group's expression.

---

## Directives

Lines beginning with `!` are directives. They configure groups and sessions. Directive key-value pairs are whitespace-separated. Any value that contains spaces must be wrapped in double quotes; quotes are consumed and the interior is treated as a single token.

```
!group   id=services  rule='.*Service'{}  color=#2196f3
!group   id=shallow   rule=$services&$level=2-4  color=#ff9800  label="Shallow services"
!session id=focused   label="Focused View"  groups=services:color,shallow:dim
```

### Groups

A group pairs a match expression with a display color. The `id` is used to reference the group from sessions and from other group expressions via `$id`.

| Key      | Required | Description                                                    |
| -------- | -------- | -------------------------------------------------------------- |
| `id=`    | yes      | Unique identifier (slugified: spaces → `_`)                    |
| `rule=`  | yes      | Group expression (see below). Quote if it contains spaces.     |
| `color=` | no       | Hex color used in `color` mode (default `#888888`)             |
| `label=` | no       | Display name shown in the UI (defaults to `id`)                |

Group mode is **not** set in the directive — it is controlled via `!session` or the UI toggle.

### Group expression syntax

A group expression is a boolean combination of **element patterns**. No spaces are allowed inside an expression (use `$id` references to split complex rules across multiple groups).

**Element pattern** — `name type children`, all three optional, no spaces between them:

| Part | Forms | Meaning |
| ---- | ----- | ------- |
| name | bare identifier | literal match against the element's name (last path segment) |
| name | `'regex'` (single-quoted) | regex match against the name |
| name | `?` | any name |
| name | omitted | any name |
| type | `{}` `[]` `()` `\|\|` `<>` `>>` | object / collection / function / state / choice / flow |
| type | `?` | any type |
| type | omitted | defaults to object |
| children | patterns inside the wrapper | all listed children must be present (AND); omit for no constraint |

A bare identifier with no wrapper (`user`) is shorthand for `user{}`.

**`?` wildcards one position** — the name or the type, never both at once. Two adjacent `?` tokens (`??`) are simply name-wildcard followed by type-wildcard:

| Pattern   | Matches |
| --------- | ------- |
| `?{}`     | any-name object |
| `user?`   | element named `user` of any type |
| `??`      | any name, any type |
| `x{??}`   | object `x` with at least one child of any name and type |

**Boolean operators** — evaluated left to right, precedence `-` > `&` > `/`:

| Operator | Meaning | Precedence |
| -------- | ------- | ---------- |
| `-x`     | NOT x   | highest    |
| `x&y`    | AND     |            |
| `x/y`    | OR      | lowest     |

No parentheses — use `$id` references to group sub-expressions:

```
!group id=svc      rule='.*Service'{}
!group id=shallow  rule=$svc&$level=2-4
```

**Built-in references:**

| Token          | Meaning |
| -------------- | ------- |
| `$id`          | resolves to the expression of the group with that id |
| `$level=N`     | matches elements at nesting depth N (1 = root) |
| `$level=N-M`   | matches elements at depth N through M inclusive |

**Examples:**

```
!group id=services    rule='.*Service'{}            color=#2196f3
!group id=repos       rule='.*Repository'{}         color=#9c27b0
!group id=data_layer  rule=$services/$repos         color=#ff9800
!group id=top_svc     rule=$services&$level=1-2     color=#4caf50
!group id=containers  rule=?{??}                    color=#607d8b
!group id=not_fn      rule=-{}                      color=#888888
```

### Mode semantics

| Mode    | Effect on matching elements | Effect on non-matching elements |
| ------- | --------------------------- | ------------------------------- |
| `color` | colored with `color=`        | unchanged                       |
| `dim`   | unchanged (prominent)        | dimmed                          |
| `hide`  | unchanged (visible)          | hidden                          |
| `off`   | no effect                    | no effect                       |

`dim` and `hide` use *inverse* matching: the expression identifies what to **keep**, and everything else is dimmed or hidden. Multiple active groups are composited — a path hidden by one group and colored by another ends up hidden.

### Sessions

A session defines a named preset that assigns a mode to each group at once. Group ids in the `groups=` value are the slugified group ids. No spaces are allowed around commas.

| Key       | Required | Description                                         |
| --------- | -------- | --------------------------------------------------- |
| `id=`     | yes      | Unique identifier for the session                   |
| `label=`  | no       | Display name (quote if it contains spaces)          |
| `groups=` | no       | Comma-separated `groupId:mode` pairs                |

```
!session id=dev    label="Dev View"    groups=services:color,containers:dim
!session id=clean  label="Clean View"  groups=not_fn:hide
```

**Backward compatibility:** old `!rule` and `!selector` directives are accepted and silently migrated to `!group` at parse time. The first save after loading an old file rewrites them in the new syntax. Old `selectors=` in `!session` is accepted as an alias for `groups=`.

---

## Inline chains

Elements and relationships can be written on a single line:

```
A --> B --> C
A{child1 child2} --> B
gen(Item{}) --> queue[] --> handler()
```

Functions inside functions declare subroutine execution order. The outer function is transparent during execution — the token routes through its function children instead:

```
gen(x)..>a()..>b(c..>d) c() d() e() b..>e
# Token path: gen → a → c → d → e
# b is transparent; c and d are its subroutines; e is b's outgoing target
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
