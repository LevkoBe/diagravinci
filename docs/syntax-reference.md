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

Lines beginning with `!` are directives. They configure rules, selectors, and sessions. Directive key-value pairs are whitespace-separated. Any value that contains spaces must be wrapped in double quotes; quotes are consumed and the interior is treated as a single token.

```
!rule     id=fn        all_name=.*
!selector name=myFn    expression=fn      color=#ff6b35
!selector name=complex expression="ruleA | ruleB"  color=#ff6b35
!session  id=focused   label="My View"   selectors=myFn:color,complex:hide
```

### Rules

Rules give a reusable id to a match pattern. The key determines what is matched and how:

| Key pattern        | Matches against   | Value is a…              |
| ------------------ | ----------------- | ------------------------ |
| `all_name=…`       | element name      | regex (last path segment)|
| `all_level=N` or `all_level=N-M` | nesting depth | integer or range |
| `all=…`            | full element path | regex                    |
| `{type}_name=…`    | name, only for elements of that type | regex |
| `{type}_level=…`   | level, only for elements of that type | integer or range |
| `{type}=…`         | full path, only for elements of that type | regex |

`{type}` is one of `object`, `state`, `collection`, `function`, `flow`, `choice`, or `all`.

```
!rule id=my_rule  all_name=Parser|Lexer
!rule id=deep     all_level=4-10
!rule id=subtree  all=^Domain\.Layouts
```

### Selectors

Selectors apply a visual effect to elements matched by a rule expression.

| Key          | Required | Description                                          |
| ------------ | -------- | ---------------------------------------------------- |
| `name=`      | yes      | Display label; also determines the selector's id (slugified) |
| `expression=`| yes      | Boolean formula over rule ids (see below)            |
| `color=`     | no       | Hex color used in `color` mode (default `#888888`)   |

Selector mode is **not** set here — it is controlled at runtime via `!session` directives or the UI toggle.

**Expression operators** — evaluated left to right with standard precedence:

| Operator | Meaning |
| -------- | ------- |
| `ruleId` | true if this element matches the rule |
| `-x`     | NOT x  |
| `x & y`  | AND    |
| `x \| y` or `x + y` | OR |
| `(…)`    | grouping |

**Mode semantics:**

| Mode    | Effect on matching elements | Effect on non-matching elements |
| ------- | --------------------------- | ------------------------------- |
| `color` | colored with `color=`        | unchanged                       |
| `dim`   | unchanged (prominent)        | dimmed                          |
| `hide`  | unchanged (visible)          | hidden                          |
| `off`   | no effect                    | no effect                       |

`dim` and `hide` use *inverse* matching: the expression identifies what to **keep**, and everything else is dimmed or hidden. Wrap compound expressions in quotes if they contain spaces:

```
!selector name=Focus_Infra  expression=infra_layer           color=#fdba74
!selector name=No_AI        expression="-(ai_app|ai_infra)"  color=#888888
```

### Sessions

A session defines a named preset that sets specific modes for a group of selectors at once. Selector ids in the `selectors=` value are the slugified selector names (spaces and non-alphanumeric characters replaced with `_`). No spaces are allowed around commas unless the whole value is quoted.

| Key         | Required | Description                                              |
| ----------- | -------- | -------------------------------------------------------- |
| `id=`       | yes      | Unique identifier for the session                        |
| `label=`    | no       | Display name (quote if it contains spaces)               |
| `selectors=`| no       | Comma-separated `selectorId:mode` pairs                  |

```
!session id=cd_view  label="Code Change Flow"  selectors=cd_flow:color,vis_flow:off
!session id=clean    label="Clean View"        selectors=no_embed:hide,no_ai:hide
```

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
