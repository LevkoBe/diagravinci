export function buildDiagramPrompt(naturalLanguage: string): string {
  return `
You are an expert diagram code generator for Diagravinci. Generate ONLY the diagram code in our DSL format based on the user's natural language description. Do not include any explanations, markdown, or extra text—output only the raw code.

DSL Syntax Reference:

Core Syntax:
- Format: name-wrapper-contents (e.g., player{username password})
- Name: Optional unique identifier (enables reuse and cross-references; if omitted, treated as anonymous).
- Wrapper: Defines element type:
  - {}: Object (default; use for classes, entities, components, e.g., player{prop1 prop2 method1() method2()}).
  - []: State (use for state machines, lifecycle stages, collections, e.g., game[battle pause menu]).
  - (): Function (use for operations, methods, processes, e.g., calculate() validate() process()).
  - >> or ><: Flow (use for data flow, pipelines, I/O; e.g., >input> process() >output>).
  - <>: Choice/Branch (use for conditional paths, decisions; e.g., checkAge() <adult minor>).
- Contents: Nested elements or properties, separated by whitespace.
- Spacing: Any whitespace acts as separator; no semicolons or commas needed.
- Nesting: Elements can be deeply nested to show containment (e.g., system{module1{component1{} component2{}} module2{}}).
- Comments: # for single-line or inline comments (e.g., object # inline comment).

Relationships:
- Connect elements with arrows and optional labels (no colons for labels).
- Types:
  - -->: Dependency/association (e.g., source --> target).
  - --|>: Inheritance/extension (e.g., parent --|> child).
  - ..|>: Implementation (e.g., class ..|> interface).
  - *--: Composition (e.g., whole *-- part).
  - o--: Aggregation (e.g., container o-- item).
- With labels: Use --label-- or integrated (e.g., user --places--> order, order *--contains-- item).
- For state transitions: state1[] --event--> state2[].
- Chain relationships: player-->world--|>item--*player--o item.

Key Principles:
- Name uniqueness: Same name refers to the same element (for cross-references).
- Wrapper determines type: Defaults to object if no wrapper.
- Minimal syntax: Omit unnecessary parts for simplicity.
- Composability: Freely mix types (e.g., objects with states, functions, flows).

Examples:

1. Simple Object with Properties:
player{username password}

2. Nested Elements:
game{player{username password} world{location}}

3. States and Transitions:
unauthenticated[] --login--> active[]
active[] --timeout--> expired[]

4. Flow Chain:
>credentials> authenticate() >token> validateToken() <valid invalid>
valid --> >success> grantAccess()
invalid --> >failure> rejectAccess()

5. Relationships:
user o--has-- session
player --|> character
whole *-- part

6. Combined Authentication System:
# Authentication system
user{username password}
session[unauthenticated[] active[] expired[]]
unauthenticated[] --login--> active[]
active[] --timeout--> expired[]
user() >credentials> authenticate() >token> validateToken() <valid invalid>
valid --> >success> grantAccess()
invalid --> >failure> rejectAccess()
user o--has-- session

7. Multiplayer Game Snippet:
player{username rank stats inventory}
match{players[player] map mode duration}
gameSession{state events[] score}
match o--includes-- player
match *--creates-- gameSession
player o--has-- character
accountCreation[setPreferences() setUsername()]
matchmaking[selectMode() setPreferences() match]
accountCreation[] --account_ready--> matchmaking[]

8. CI/CD Pipeline Snippet:
codeRepository{branches[] commits[] pullRequests[]}
buildJob{id status artifact logs[]}
codeRepository --triggers--> buildJob
buildJob *--produces-- artifact
queued[waitingForRunner()]
building[compileCode() createArtifact()]
queued[] --start_build--> building[]

Ensure the code is valid, concise, and directly represents the description. If ambiguous, make reasonable assumptions based on common diagram patterns (e.g., use objects for entities, states for lifecycles, flows for processes).

User description: "${naturalLanguage}"

Output ONLY the code:
`.trim();
}

export function buildContextAwareDiagramPrompt(
  naturalLanguage: string,
  currentCode: string,
): string {
  return `
You are an expert diagram code generator for Diagravinci. The user has an existing diagram and wants to modify or extend it. Generate the updated diagram code in our DSL format. Do not include any explanations, markdown, or extra text—output only the raw code.

DSL Syntax Reference:

Core Syntax:
- Format: name-wrapper-contents (e.g., player{username password})
- Wrapper: {}: Object, []: State, (): Function, >> or ><: Flow, <>: Choice/Branch
- Relationships: -->, --|>, ..|>, *--, o-- (with optional --label--)
- Nesting: system{module{component{}}}
- Comments: # for inline or single-line

Current diagram code:
\`\`\`
${currentCode}
\`\`\`

User request: "${naturalLanguage}"

Modify or extend the existing diagram to satisfy the request. Preserve elements that are not affected by the request. Output ONLY the complete updated code:
`.trim();
}

export function buildBugAnalysisPrompt(code: string): string {
  return `
You are an expert in Diagravinci's diagram DSL. Analyze the following diagram code and identify all lexical and logical issues.

DSL Syntax Reference:
- Wrappers: {} Object, [] State, () Function, >>/><  Flow, <> Choice
- Relationships: --> ..> --|> ..|> *-- o-- with optional --label--
- Nesting: name{child1{} child2{}}
- Same name = same element (cross-references)
- Comments: #

Check for:
- Orphaned elements (defined but never connected, or referenced in relationships but never defined)
- Circular dependencies (A --> B --> A)
- Inconsistencies (same name used with different wrapper types)
- Unclosed or mismatched brackets/wrappers
- Invalid relationship syntax
- Dead-end flows or disconnected subgraphs
- Any other lexical or logical issues

Diagram code:
\`\`\`
${code}
\`\`\`

Return a concise structured list. Use these prefixes: [ORPHANED], [CIRCULAR], [INCONSISTENCY], [SYNTAX], [DEAD-END], [OTHER].
If no issues are found, respond with exactly: ✓ No issues found.
`.trim();
}

export function buildArchitectureSuggestionsPrompt(code: string): string {
  return `
You are a senior software architect reviewing a Diagravinci diagram.

DSL Syntax Reference:
- Wrappers: {} Object, [] State, () Function, >>/><  Flow, <> Choice
- Relationships: --> ..> --|> ..|> *-- o-- with optional --label--

Diagram code:
\`\`\`
${code}
\`\`\`

Provide a concise architectural review:
1. **Patterns identified** — name the architectural patterns you see (e.g., layered, MVC, event-driven, microservices, CQRS)
2. **Issues / anti-patterns** — coupling concerns, missing abstractions, god objects, etc.
3. **Suggestions** — specific, actionable improvements or alternative patterns better suited to the domain

Be direct and prioritise the most impactful observations.
`.trim();
}
