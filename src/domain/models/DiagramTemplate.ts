import type { ViewState } from "./ViewState";

export interface DiagramTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];

  preferredView: ViewState["viewMode"];

  code: string;
}

export const BUILT_IN_TEMPLATES: DiagramTemplate[] = [
  {
    id: "mvc",
    name: "MVC",
    description: "Model-View-Controller pattern",
    tags: ["architecture", "web", "pattern"],
    preferredView: "hierarchical",
    code: `Model{
  Database
  Schema
  Repository
}
Controller{
  Router
  Handler
  Middleware
}
View{
  Template
  Component
  Stylesheet
}

Model --> Controller
Controller --> View
View --> Controller
Controller --> Model`,
  },
  {
    id: "microservices",
    name: "Microservices",
    description: "API gateway with backend services and databases",
    tags: ["architecture", "cloud", "backend"],
    preferredView: "pipeline",
    code: `Client
APIGateway
UserService{
  Auth
  Profile
}
OrderService{
  Cart
  Checkout
}
NotificationService
UserDB
OrderDB
MessageBroker

Client --> APIGateway
APIGateway --> UserService
APIGateway --> OrderService
OrderService --> NotificationService
UserService --> UserDB
OrderService --> OrderDB
OrderService --> MessageBroker
NotificationService --> MessageBroker`,
  },
  {
    id: "event-driven",
    name: "Event-Driven",
    description: "Event bus with producers, consumers, and handlers",
    tags: ["architecture", "async", "messaging"],
    preferredView: "timeline",
    code: `Producer{
  ServiceA
  ServiceB
}
EventBus{
  Queue
  Router
  DeadLetter
}
Consumer{
  HandlerX
  HandlerY
  HandlerZ
}
Storage

Producer --> EventBus
EventBus --> Consumer
Consumer --> Storage
EventBus --> DeadLetter`,
  },
  {
    id: "layered",
    name: "Layered Architecture",
    description: "Classic n-tier separation of concerns",
    tags: ["architecture", "pattern", "enterprise"],
    preferredView: "hierarchical",
    code: `Presentation{
  WebUI
  MobileApp
  APIClient
}
Application{
  UseCases
  Services
  DTOs
}
Domain{
  Entities
  ValueObjects
  Repositories
}
Infrastructure{
  Database
  Cache
  ExternalAPIs
}

Presentation --> Application
Application --> Domain
Domain --> Infrastructure`,
  },
  {
    id: "data-pipeline",
    name: "Data Pipeline",
    description: "ETL pipeline from sources through transforms to sinks",
    tags: ["data", "etl", "pipeline", "analytics"],
    preferredView: "pipeline",
    code: `Sources{
  DatabaseSource
  APISource
  FileSource
}
Transform{
  Cleaner
  Normaliser
  Enricher
  Aggregator
}
Sinks{
  DataWarehouse
  AnalyticsDashboard
  ReportExport
}

Sources --> Transform
Transform --> Sinks`,
  },
  {
    id: "state-machine",
    name: "State Machine",
    description: "Finite state machine with transitions",
    tags: ["state", "workflow", "pattern"],
    preferredView: "timeline",
    code: `Idle[
  WaitingForInput
]
Processing[
  Validating
  Executing
  Retrying
]
Success[
  Completed
]
Failure[
  ErrorLogged
  RolledBack
]

Idle --> Processing
Processing --> Success
Processing --> Failure
Failure --> Idle
Success --> Idle`,
  },
  {
    id: "capstone-app",
    name: "Capstone App",
    description:
      "Generic full-stack capstone starter — rename blocks to match your project",
    tags: ["capstone", "fullstack", "starter", "web", "student"],
    preferredView: "hierarchical",
    code: `Frontend{
  UI{
    Pages
    Components
    Styles
  }
  Router
  StateManager
}
API{
  Auth{
    Login()
    Register()
    Refresh()
  }
  Core{
    Handlers
    Services
    Validators
  }
}
DB{
  Schema
  Migrations
  Queries
}
ExternalServices

Frontend --> API
API --> DB
API --> ExternalServices`,
  },
  {
    id: "user-journey",
    name: "User Journey",
    description:
      "User experience flow with decision points — run in Execute layout to animate",
    tags: ["ux", "user-flow", "business", "execution", "student"],
    preferredView: "timeline",
    code: `>Input>
Registration{
  FormInput
  Validation()
}
<AuthGate>
Onboarding{
  Welcome
  ProfileSetup
}
CoreAction{
  MainFeature
  SecondaryFeature
}
<OutcomeGate>
SuccessPath[
  Confirmed
]
ErrorPath[
  ErrorMessage
  RetryOption
]
Retention{
  Notification
  ReturnVisit
}

>Input> --> Registration
Registration --> <AuthGate>
<AuthGate> --success--> Onboarding
<AuthGate> --fail--> ErrorPath
Onboarding --> CoreAction
CoreAction --> <OutcomeGate>
<OutcomeGate> --ok--> SuccessPath
<OutcomeGate> --error--> ErrorPath
ErrorPath --> Registration
SuccessPath --> Retention
Retention --> CoreAction`,
  },
  {
    id: "feature-planning",
    name: "Feature Planning",
    description: "Scaffold for designing a new feature before writing code",
    tags: ["planning", "feature", "design", "ideation", "student"],
    preferredView: "hierarchical",
    code: `Problem{
  CurrentPainPoint
  AffectedUsers
}
ProposedSolution{
  UIChanges{
    NewScreens
    UpdatedComponents
  }
  BackendChanges{
    NewEndpoints()
    DataMigration
    BusinessLogic()
  }
  DataModel{
    NewEntities
    RelationshipChanges
  }
}
Impact{
  UserBenefit
  TechnicalDebt
  Dependencies
}
Risks

Problem --> ProposedSolution
ProposedSolution --> Impact
ProposedSolution --> Risks`,
  },
  {
    id: "database-schema",
    name: "Database Schema",
    description:
      "Entity relationships — enable class diagram mode for an ER diagram look",
    tags: ["database", "schema", "data", "er-diagram", "student"],
    preferredView: "hierarchical",
    code: `User{
  id
  email
  passwordHash
  createdAt
}
Session{
  id
  userId
  token
  expiresAt
}
Post{
  id
  authorId
  title
  content
  publishedAt
}
Profile{
  id
  userId
  displayName
  avatarUrl
}
Comment{
  id
  postId
  authorId
  body
  createdAt
}
Tag{
  id
  name
}
PostTag{
  postId
  tagId
}

User *-- Session
User *-- Profile
User *-- Post
Post *-- Comment
Post *-- PostTag
Tag *-- PostTag`,
  },
];

function generateStarDsl(spokeCount: number): string {
  const spokes = Array.from(
    { length: spokeCount },
    (_, i) => `Node${String(i + 1).padStart(3, "0")}`,
  );
  const rels = spokes.map((s) => `Hub --> ${s}`);
  return ["Hub", ...spokes, "", ...rels].join("\n");
}

function generateChainDsl(nodeCount: number): string {
  const nodes = Array.from(
    { length: nodeCount },
    (_, i) => `Step${String(i + 1).padStart(3, "0")}`,
  );
  const rels: string[] = [];
  for (let i = 0; i < nodes.length - 1; i++)
    rels.push(`${nodes[i]} --> ${nodes[i + 1]}`);

  for (let i = 0; i < nodes.length - 5; i += 10)
    rels.push(`${nodes[i]} ..> ${nodes[i + 5]}`);
  return [...nodes, "", ...rels].join("\n");
}

function generateClusterDsl(clusters: number, perCluster: number): string {
  const lines: string[] = [];
  const clusterNames: string[] = [];
  for (let c = 0; c < clusters; c++) {
    const name = `Cluster${String(c + 1).padStart(2, "0")}`;
    clusterNames.push(name);
    const children = Array.from(
      { length: perCluster },
      (_, i) => `  Node${String(c * perCluster + i + 1).padStart(3, "0")}`,
    );
    lines.push(`${name}{`, ...children, `}`);
  }
  lines.push("");
  for (let c = 0; c < clusterNames.length - 1; c++) {
    lines.push(`${clusterNames[c]} --> ${clusterNames[c + 1]}`);
    if (c + 2 < clusterNames.length)
      lines.push(`${clusterNames[c]} ..> ${clusterNames[c + 2]}`);
  }
  return lines.join("\n");
}

export const ICON_SHOWCASE_TEMPLATE: DiagramTemplate = {
  id: "icon-showcase",
  name: "Icon Showcase",
  description:
    "All available icons — use _iconname_ syntax to display icons on elements",
  tags: ["icons", "reference", "showcase"],
  preferredView: "circular",
  code: `TechIcons{
  _database_
  _server_
  _cloud_
  _network_
  _router_
  _cpu_
  _storage_
  _cache_
  _queue_
  _api_
  _web_
  _auth_
  _workflow_
  _event_
  _layers_
}
SecurityIcons{
  _lock_
  _key_
  _shield_
  _globe_
  _eye_
  _compass_
}
PeopleIcons{
  _user_
  _users_
  _phone_
  _mail_
  _heart_
  _star_
}
FileIcons{
  _file_
  _folder_
  _log_
  _chart_
  _ledger_
  _blueprint_
}
UIIcons{
  _settings_
  _search_
  _clock_
  _calendar_
  _info_
  _warning_
  _check_
  _x_
  _zap_
  _timer_
  _diagram_
  _frame_
}
CombatIcons{
  _sword_
  _axe_
  _bow_
  _dagger_
  _spear_
  _hammer_
  _pickaxe_
  _blade_
  _baton_
  _chisel_
  _whetstone_
}
DefenseIcons{
  _helm_
  _knight_
  _fortress_
  _wall_
  _gauntlet_
  _boots_
  _cape_
  _mask_
  _cage_
  _chain_
}
MagicIcons{
  _flame_
  _storm_
  _rune_
  _potion_
  _beacon_
  _gem_
  _prism_
  _tome_
  _scroll_
  _feather_
  _seal_
}
WorldIcons{
  _anchor_
  _map_
  _telescope_
  _target_
  _flag_
  _crown_
  _medal_
  _scales_
  _hourglass_
  _arrow_
  _megaphone_
  _ghost_
}
CraftIcons{
  _anvil_
  _wrench_
  _saw_
  _drill_
  _ruler_
  _forge_
  _kiln_
  _bellows_
  _lathe_
  _mold_
  _grinder_
  _stencil_
  _pin_
  _wire_
  _tally_
  _level_
  _chalk_
}
MiscIcons{
  _lyre_
  _strings_
  _wheel_
  _ram_
  _mirror_
  _broom_
  _clay_
  _needle_
  _dye_
  _cabinet_
  _coin_
  _wings_
  _treasure_
  _lens_
}`,
};

export const EDGE_CASE_TEMPLATES: DiagramTemplate[] = [
  {
    id: "edge-deep-nesting",
    name: "Deep Nesting",
    description:
      "Six levels of nested elements — tests hierarchical layout depth",
    tags: ["edge-case", "nesting", "hierarchy"],
    preferredView: "hierarchical",
    code: `Root{
  Level2{
    Level3{
      Level4{
        Level5{
          Level6{
            DeepLeaf
          }
          SiblingLeaf
        }
        Level5B{
          AnotherLeaf
        }
      }
    }
  }
  Branch{
    BranchChild
  }
}`,
  },
  {
    id: "edge-all-rel-types",
    name: "All Relationship Types",
    description: "One diagram using all six relationship arrow styles",
    tags: ["edge-case", "relationships", "syntax"],
    preferredView: "basic",
    code: `Alpha{}
Beta{}
Gamma{}
Delta{}
Epsilon{}
Zeta{}

Alpha --> Beta
Beta ..> Gamma
Gamma --|> Delta
Delta ..|> Epsilon
Epsilon o-- Alpha
Zeta *-- Alpha`,
  },
  {
    id: "edge-all-element-types",
    name: "All Element Types",
    description:
      "One of each element type: object, collection, function, state, choice, flow",
    tags: ["edge-case", "element-types", "syntax"],
    preferredView: "circular",
    code: `obj{} >> coll[] --> fn() --> st|| --> ch<> --> obj`,
  },
  {
    id: "edge-cycle",
    name: "Cyclic Dependencies",
    description:
      "Three services with a dependency cycle plus cross-cuts — tests cycle rendering",
    tags: ["edge-case", "cycle", "dependencies"],
    preferredView: "basic",
    code: `ServiceA{
  HandlerA
  CacheA
}
ServiceB{
  HandlerB
  CacheB
}
ServiceC{
  HandlerC
  CacheC
}
SharedDB

ServiceA --> ServiceB
ServiceB --> ServiceC
ServiceC --> ServiceA
ServiceA ..> ServiceC
ServiceB ..> SharedDB
ServiceC ..> SharedDB`,
  },
  {
    id: "edge-wide-fanout",
    name: "Wide Fan-Out",
    description:
      "Hub element connected to 20 leaf nodes — tests flat large fan-out layout",
    tags: ["edge-case", "fan-out", "performance"],
    preferredView: "circular",
    code: [
      "Hub{}",
      ...Array.from(
        { length: 20 },
        (_, i) => `Leaf${String(i + 1).padStart(2, "0")}[]`,
      ),
      "",
      ...Array.from(
        { length: 20 },
        (_, i) => `Hub --> Leaf${String(i + 1).padStart(2, "0")}`,
      ),
    ].join("\n"),
  },
  {
    id: "edge-mutual-nesting",
    name: "Mutual Nesting",
    description:
      "a contains b, b contains a — tests circular parent-child with a partial relationship on one line",
    tags: ["edge-case", "circular", "nesting"],
    preferredView: "basic",
    code: `a[b]--b{a}`,
  },
  {
    id: "edge-26-isolated",
    name: "26 Isolated Nodes",
    description:
      "All keyboard-row letters as disconnected flat elements — tests layout of many unrelated nodes",
    tags: ["edge-case", "isolated", "performance"],
    preferredView: "circular",
    code: `q w e r t y u i o p a s d f g h j k l z x c v b n m`,
  },
  {
    id: "edge-broken-chain",
    name: "Broken Inline Chain",
    description:
      "Two chains and trailing islands on one line — the space between i and o silently breaks the chain into q→…→i and o→…→f, then g–m are isolated",
    tags: ["edge-case", "chain", "parsing"],
    preferredView: "pipeline",
    code: `q --> w --> e --> r --> t --> y --> u --> i o --> p --> a --> s --> d --> f g h j k l z x c v b n m`,
  },
  {
    id: "edge-diamond",
    name: "Diamond Dependency",
    description:
      "Classic diamond: A → B, A → C, B → D, C → D — tests multi-path convergence",
    tags: ["edge-case", "diamond", "convergence"],
    preferredView: "hierarchical",
    code: `Root{}
Left{
  LeftDetail
}
Right{
  RightDetail
}
Merged{}

Root --> Left
Root --> Right
Left --> Merged
Right --> Merged
Left ..> Right`,
  },
];

export const SELECTOR_SHOWCASE_TEMPLATES: DiagramTemplate[] = [
  {
    id: "selector-flags",
    name: "Flag-Based Selectors",
    description:
      "Elements tagged with :flag syntax, each selector preset colors its matching group",
    tags: ["selector", "flags", "showcase"],
    preferredView: "hierarchical",
    code: `!selector  name=fine  color=#661144  mode=color
!selector  name=unlocked  color=#4caf50  mode=color
!selector  name=current  color=#2196f3  mode=color
!selector  name=locked  color=#9e9e9e  mode=color

knight:fine{
  longsword()
  shield{}
}
queen:current{
  crown()
  scepter{}
}
rook:unlocked{
  tower{}
}
pawn:locked{
  armor{}
}
bishop:locked{
  staff()
}

knight --> queen
queen --> rook
rook --> pawn
bishop --> pawn`,
  },
  {
    id: "selector-atoms-type",
    name: "Rule: Match by Element Type",
    description:
      "Rules that select by element type — functions, states, and deep elements highlighted",
    tags: ["selector", "rules", "type-match"],
    preferredView: "hierarchical",
    code: `!rule  id=fn  function_name=.*
!rule  id=st  state_name=.*
!rule  id=deep  all_level=3-4

!selector  name=functions  expression=fn  color=#ff6b35  mode=color
!selector  name=states  expression=st  color=#4caf50  mode=color
!selector  name=deep_elements  expression=deep  color=#9c27b0  mode=color

Pipeline{
  transform()
  validate()
  Active||
  Idle||
  Stage{
    step1()
    step2()
    Pending||
    Done||
  }
}

transform --> validate
validate --> Active
Active --> Idle
Idle --> transform`,
  },
  {
    id: "selector-atoms-name",
    name: "Rule: Match by Name Pattern",
    description:
      "Rules using regex to highlight services, databases, and caches by name",
    tags: ["selector", "rules", "name-pattern"],
    preferredView: "pipeline",
    code: `!rule  id=svc  all_name=.*Service
!rule  id=db   object_name=.*DB
!rule  id=cch  all_name=Cache.*

!selector  name=services   expression=svc  color=#2196f3  mode=color
!selector  name=databases  expression=db   color=#ff9800  mode=color
!selector  name=caches     expression=cch  color=#4caf50  mode=color

UserService{}
OrderService{}
PaymentService{}
UserDB{}
OrderDB{}
CacheLayer{
  CacheA
  CacheB
}
MessageBus{}

UserService --> UserDB
OrderService --> OrderDB
PaymentService --> UserDB
UserService --> CacheLayer
OrderService --> CacheLayer
UserService --> MessageBus
OrderService --> MessageBus`,
  },
  {
    id: "selector-atoms-combine",
    name: "Rule: Boolean Expressions",
    description:
      "Combining rules with | (OR), & (AND), - (NOT) operators to build compound selectors",
    tags: ["selector", "rules", "boolean-logic"],
    preferredView: "basic",
    code: `!rule  id=backend   all_name=.*Service
!rule  id=storage   object_name=.*DB
!rule  id=external  all_name=.*Gateway.*

!selector  name=backend          expression=backend            color=#2196f3  mode=color
!selector  name=storage          expression=storage            color=#ff9800  mode=color
!selector  name=external         expression=external           color=#e91e63  mode=color
!selector  name=backend_or_store expression="backend | storage"  color=#00bcd4  mode=dim
!selector  name=not_external     expression=-external           color=#9e9e9e  mode=dim

AuthService{}
UserService{}
UserDB{}
SessionCache[]
PaymentGateway{}
EmailGateway{}
APIGateway{}

AuthService --> UserDB
UserService --> SessionCache
AuthService --> PaymentGateway
UserService --> EmailGateway
APIGateway --> AuthService
APIGateway --> UserService`,
  },
];

export const EXECUTION_TEMPLATES: DiagramTemplate[] = [
  {
    id: "exec-linear-pipeline",
    name: "Linear Pipeline",
    description:
      "Generator spawns typed items, flows through queue → state machine → choice → output or error",
    tags: ["execution", "pipeline", "branching"],
    preferredView: "timeline",
    code: `gen(
  a{}
  b[]
  c()
)
q[]
s||
ch<>
o{
  a{
    prev_content
  }
}
e[]

gen --> q
q --> s
s --> ch
ch --yes--> o
ch --no--> e`,
  },
  {
    id: "exec-generator-filter",
    name: "Generator with Filter",
    description:
      "Generator spawns items, choice gate filters to transform or skip path",
    tags: ["execution", "filter", "branching"],
    preferredView: "timeline",
    code: `gen(
  Good_Item{}
  Faulty_Itm{}
)
filter<Item{}>
transform()
store[]
skip[]

gen --> filter
filter --pass--> transform
filter --reject--> skip
transform --> store`,
  },
  {
    id: "exec-round-robin",
    name: "Round Robin",
    description:
      "Generator feeds a round_robin distributor that cycles tokens across three workers",
    tags: ["execution", "round-robin", "load-balancing"],
    preferredView: "timeline",
    code: `gen(
  Request{}
)
round_robin()
worker1[]
worker2[]
worker3[]

gen --> round_robin
round_robin --> worker1
round_robin --> worker2
round_robin --> worker3`,
  },
  {
    id: "exec-decision-tree",
    name: "Binary Decision Tree",
    description:
      "Generator feeds a root choice node that splits into two branches, each routing yes/no to leaf sinks",
    tags: ["execution", "decision-tree", "branching"],
    preferredView: "timeline",
    code: `gen(
  obj{}
)
root<>
branch1<s||>
branch2<o{}>
leaf1{}
leaf2{}
leaf3{}
leaf4{}

gen --> root
root --yes--> branch1
root --no--> branch2
branch1 --yes--> leaf1
branch1 --no--> leaf2
branch2 --yes--> leaf3
branch2 --no--> leaf4`,
  },
  {
    id: "exec-connector",
    name: "Connector — merge multiple streams",
    description:
      "Two generators each produce their own element; connector merges all arrivals into one token with a loop relationship between them",
    tags: ["execution", "connector"],
    preferredView: "timeline",
    code: `gen_a(
  A{}
)
gen_b(
  B{}
)
connector()
merged[]

gen_a --> connector
gen_b --> connector
connector --> merged`,
  },
  {
    id: "exec-disconnector",
    name: "Disconnector — triangle splitter",
    description:
      "Generator produces triangles (3 mutually-connected nodes x, y, z); disconnector splits each triangle into independent nodes forwarded to the output collection",
    tags: ["execution", "disconnector"],
    preferredView: "timeline",
    code: `gen(x--y y--z z--x) -->
disconnector() -->
out[]`,
  },
  {
    id: "exec-multiplier-duplicator",
    name: "Multiplier & Duplicator",
    description:
      "multiplier_3 sends 3 independent copies to one target; duplicator broadcasts one token to all outgoing branches",
    tags: ["execution", "multiplier", "duplicator"],
    preferredView: "timeline",
    code: `gen(
  Packet{}
)
multiplier_3()
copies[]
source2()
duplicator()
branch_a[]
branch_b[]

gen --> multiplier_3
multiplier_3 --> copies
gen --> source2
source2 --> duplicator
duplicator --> branch_a
duplicator --> branch_b`,
  },
  {
    id: "exec-deduplicator-throttler",
    name: "Deduplicator & Throttler",
    description:
      "multiplier_4 fans into 4 copies; deduplicator passes only the first same-named token per tick; throttler_3 forwards every 3rd tick",
    tags: ["execution", "deduplicator", "throttler"],
    preferredView: "timeline",
    code: `gen(Packet{})

gen -->
  multiplier_4() -->
  pipe[] -->
  deduplicator() -->
  unique[]
gen -->
  throttler_3() -->
  sparse[]
`,
  },
];

export const RADIAL_TEMPLATES: DiagramTemplate[] = [
  {
    id: "radial-solar-system",
    name: "Solar System",
    description:
      "Star at center, planets in inner ring, moons in outer ring — natural radial hierarchy",
    tags: ["radial", "hierarchy", "showcase"],
    preferredView: "radial",
    code: `Sun
Mercury
Venus
Earth{
  Moon
}
Mars{
  Phobos
  Deimos
}
Jupiter{
  Io
  Europa
  Ganymede
  Callisto
}
Saturn{
  Titan
  Enceladus
}

Sun-->Mercury
Sun-->Venus
Sun-->Earth
Sun-->Mars
Sun-->Jupiter
Sun-->Saturn`,
  },
  {
    id: "radial-org-chart",
    name: "Org Chart",
    description:
      "CEO at center with VP direct reports in the first ring and their teams in the outer ring",
    tags: ["radial", "organization", "hierarchy"],
    preferredView: "radial",
    code: `CEO
CTO{
  Frontend
  Backend
  Infrastructure
}
CFO{
  Accounting
  FPnA
}
CMO{
  Growth
  Brand
  Content
}
CPO{
  Product
  Design
  Research
}

CEO-->CTO
CEO-->CFO
CEO-->CMO
CEO-->CPO`,
  },
  {
    id: "radial-api-gateway",
    name: "API Gateway Hub",
    description:
      "Central gateway routing to service rings with their sub-components",
    tags: ["radial", "architecture", "microservices"],
    preferredView: "radial",
    code: `APIGateway
AuthService{
  TokenStore
  SessionManager
}
UserService{
  Profile
  Preferences
}
OrderService{
  Cart
  Checkout
  Fulfillment
}
NotificationService{
  Email
  Push
  SMS
}
AnalyticsService{
  Tracker
  Reporter
}

APIGateway-->AuthService
APIGateway-->UserService
APIGateway-->OrderService
APIGateway-->NotificationService
APIGateway-->AnalyticsService`,
  },
  {
    id: "radial-tech-radar",
    name: "Technology Radar",
    description:
      "Engineering disciplines at the hub with specific technologies radiating outward",
    tags: ["radial", "technology", "engineering"],
    preferredView: "radial",
    code: `Engineering
Frontend{
  React
  TypeScript
  Vite
  TailwindCSS
}
Backend{
  Node
  Go
  PostgreSQL
  Redis
}
Infrastructure{
  Docker
  Kubernetes
  Terraform
  Grafana
}
Mobile{
  Swift
  Kotlin
  ReactNative
}

Engineering-->Frontend
Engineering-->Backend
Engineering-->Infrastructure
Engineering-->Mobile`,
  },
];

export const STRESS_TEMPLATES: DiagramTemplate[] = [
  {
    id: "stress-star",
    name: "Stress: Star Network (200 nodes)",
    description:
      "1 hub connected to 200 spoke nodes — tests flat large-scale rendering and lazy connection culling",
    tags: ["stress", "performance", "test"],
    preferredView: "circular",
    code: generateStarDsl(200),
  },
  {
    id: "stress-chain",
    name: "Stress: Linear Chain (300 nodes)",
    description:
      "300 nodes in a sequential chain with skip connections — tests viewport culling along a wide diagram",
    tags: ["stress", "performance", "test"],
    preferredView: "pipeline",
    code: generateChainDsl(300),
  },
  {
    id: "stress-clusters",
    name: "Stress: Clustered Groups (12×20 = 240 nodes)",
    description:
      "12 clusters of 20 nodes each, with inter-cluster edges — tests hierarchical culling and connection density",
    tags: ["stress", "performance", "test"],
    preferredView: "hierarchical",
    code: generateClusterDsl(12, 20),
  },
];

export const COMPLEX_TEMPLATES: DiagramTemplate[] = [
  {
    id: "cloud-infrastructure",
    name: "Cloud Infrastructure",
    description:
      "Multi-tier cloud deployment with load balancing, app servers, and data layer",
    tags: ["architecture", "cloud", "infrastructure", "devops"],
    preferredView: "hierarchical",
    code: `Internet
LoadBalancer{
  PrimaryLB
  SecondaryLB
}
WebTier{
  WebServer1
  WebServer2
  WebServer3
}
AppTier{
  AppServer1{
    AuthService
    UserService
  }
  AppServer2{
    OrderService
    PaymentService
  }
  AppServer3{
    NotificationService
    SearchService
  }
}
DataTier{
  PrimaryDB{
    UserData
    OrderData
  }
  ReplicaDB
  CacheLayer{
    SessionCache
    QueryCache
  }
}
ExternalServices{
  PaymentGateway
  EmailProvider
  CDN
}

Internet --> LoadBalancer
LoadBalancer --> WebTier
WebTier --> AppTier
AppTier --> DataTier
AppTier --> ExternalServices`,
  },

  {
    id: "cicd-pipeline",
    name: "CI/CD Release Pipeline",
    description:
      "Continuous delivery pipeline with parallel test and security tracks",
    tags: ["devops", "cicd", "automation", "release"],
    preferredView: "timeline",
    code: `CodeCommit{
  PullRequest
  CodeReview
  MergeApproval
}
Build{
  Compile
  UnitTests
  LintCheck
}
IntegrationTests{
  APITests
  E2ETests
  ContractTests
}
SecurityScan{
  SAST
  DependencyScan
  ContainerScan
}
StagingDeploy{
  BuildImage
  PushRegistry
  DeployStaging
}
StagingValidation{
  SmokeTests
  PerformanceTests
  UAT
}
ProductionDeploy{
  BlueGreenSwitch
  CanaryRelease
  HealthCheck
}
Observability{
  Monitoring
  Alerting
  LogAggregation
}

CodeCommit --> Build
Build --> IntegrationTests
Build --> SecurityScan
IntegrationTests --> StagingDeploy
SecurityScan --> StagingDeploy
StagingDeploy --> StagingValidation
StagingValidation --> ProductionDeploy
ProductionDeploy --> Observability`,
  },

  {
    id: "analytics-platform",
    name: "Analytics Data Platform",
    description:
      "End-to-end data platform from ingestion through transformation to BI consumption",
    tags: ["data", "analytics", "etl", "platform", "bigdata"],
    preferredView: "pipeline",
    code: `RawSources{
  TransactionalDB{
    OrdersTable
    UsersTable
    ProductsTable
  }
  EventStreams{
    ClickEvents
    APIEvents
    AppEvents
  }
  ThirdParty{
    CRMExport
    MarketingData
    ExternalFeeds
  }
}
Ingestion{
  BatchIngestion{
    DBConnector
    FileLoader
    ScheduledJobs
  }
  StreamIngestion{
    KafkaConsumer
    KinesisReader
    WebhookReceiver
  }
}
Processing{
  DataLake{
    RawZone
    CleanedZone
    CuratedZone
  }
  Transformations{
    Deduplication
    Enrichment
    Aggregation
    Normalisation
  }
}
Serving{
  DataWarehouse{
    FactTables
    DimensionTables
    Materialised
  }
  SearchIndex
  MLFeatureStore{
    OnlineStore
    OfflineStore
  }
}
Consumption{
  BITools{
    ExecutiveDashboard
    OperationalReports
    AdHocQueries
  }
  MLPlatform{
    ModelTraining
    ModelServing
    ExperimentTracking
  }
  CustomerFacing{
    Recommendations
    PersonalisedEmails
    RealtimeAlerts
  }
}

RawSources --> Ingestion
Ingestion --> Processing
Processing --> Serving
Serving --> Consumption`,
  },
];

export const TEACHING_TEMPLATES: DiagramTemplate[] = [
  {
    id: "teach-observer",
    name: "Observer Pattern",
    description:
      "Behavioral pattern: Subject notifies registered Observers on state change",
    tags: ["design-patterns", "oop", "behavioral", "teaching"],
    preferredView: "hierarchical",
    code: `Subject{
  state
  observers[]
  attach()
  detach()
  notify()
}
ConcreteSubject{
  concreteState
  getState()
  setState()
}
Observer{
  update()
}
ConcreteObserverA{
  observerState
  update()
}
ConcreteObserverB{
  observerState
  update()
}

ConcreteSubject --|> Subject
ConcreteObserverA ..|> Observer
ConcreteObserverB ..|> Observer
Observer --o Subject`,
  },
  {
    id: "teach-strategy",
    name: "Strategy Pattern",
    description:
      "Behavioral pattern: Context delegates behavior to interchangeable Strategy objects",
    tags: ["design-patterns", "oop", "behavioral", "teaching"],
    preferredView: "hierarchical",
    code: `Context{
  strategy
  setStrategy()
  executeStrategy()
}
Strategy{
  execute()
}
ConcreteStrategyA{
  execute()
}
ConcreteStrategyB{
  execute()
}
ConcreteStrategyC{
  execute()
}

Strategy --o Context
ConcreteStrategyA ..|> Strategy
ConcreteStrategyB ..|> Strategy
ConcreteStrategyC ..|> Strategy`,
  },
  {
    id: "teach-http-lifecycle",
    name: "HTTP Request Lifecycle",
    description:
      "Full request path from client through load balancer, middleware, and service layers to database",
    tags: ["web", "http", "architecture", "teaching"],
    preferredView: "pipeline",
    code: `Client
DNS
LoadBalancer
WebServer{
  TLSTermination
  RequestParser
  MiddlewareChain{
    AuthMiddleware()
    CorsMiddleware()
    RateLimiter()
    Logger()
  }
}
AppServer{
  Router
  Controller{
    InputValidator()
    Handler()
    ResponseFormatter()
  }
  ServiceLayer{
    BusinessLogic()
    CacheLayer{
      RedisCache
    }
    DataLayer{
      Repository()
      Database
    }
  }
}

Client --> DNS
DNS --> LoadBalancer
LoadBalancer --> WebServer
WebServer --> AppServer
AppServer --> Client`,
  },
  {
    id: "teach-auth-flow",
    name: "Authentication Flow",
    description:
      "JWT-based auth with token validation, role check, and error paths — run in Execute to animate",
    tags: ["security", "auth", "teaching", "execution"],
    preferredView: "timeline",
    code: `>Request>
<TokenPresent>
TokenValidator{
  JWTParser()
  SignatureCheck()
  ExpiryCheck()
}
<TokenValid>
RoleChecker{
  RoleLoader()
  PolicyEngine()
}
<HasPermission>
Resource{
  ReadHandler()
  WriteHandler()
}
ErrorResponse[
  Unauthorized
  Forbidden
  ExpiredToken
]
>Response>

>Request> --> <TokenPresent>
<TokenPresent> --yes--> TokenValidator
<TokenPresent> --no--> ErrorResponse
TokenValidator --> <TokenValid>
<TokenValid> --valid--> RoleChecker
<TokenValid> --invalid--> ErrorResponse
RoleChecker --> <HasPermission>
<HasPermission> --yes--> Resource
<HasPermission> --no--> ErrorResponse
Resource --> >Response>
ErrorResponse --> >Response>`,
  },
  {
    id: "teach-producer-consumer",
    name: "Producer-Consumer",
    description:
      "Concurrent message passing with bounded buffer and round-robin consumers — run in Execute",
    tags: ["concurrency", "patterns", "teaching", "execution"],
    preferredView: "timeline",
    code: `gen(
  Message{}
)
BoundedBuffer[]
round_robin()
Consumer1()
Consumer2()
Consumer3()
Processed{}

gen --> BoundedBuffer
BoundedBuffer --> round_robin
round_robin --> Consumer1
round_robin --> Consumer2
round_robin --> Consumer3
Consumer1 --> Processed
Consumer2 --> Processed
Consumer3 --> Processed`,
  },
  {
    id: "teach-arch-evolution",
    name: "Monolith to Microservices",
    description:
      "Both architectures in one diagram — selector highlights the contrast; use to teach trade-offs",
    tags: ["architecture", "microservices", "teaching", "comparison"],
    preferredView: "hierarchical",
    code: `!atom id=mono name=Monolith
!selector name=MonolithView mode=color color=#a78bfa combiner=mono

Monolith{
  UI
  BusinessLogic{
    UserModule
    OrderModule
    NotificationModule
    ReportingModule
  }
  DataAccess{
    UserRepo
    OrderRepo
  }
  Database
}

APIGateway
UserService{
  UserAPI
  UserDB
}
OrderService{
  OrderAPI
  OrderDB
}
NotificationService
MessageBroker

APIGateway --> UserService
APIGateway --> OrderService
OrderService --> NotificationService
OrderService --> MessageBroker
NotificationService --> MessageBroker`,
  },
];

export const SOLID_SRP_TEMPLATES: DiagramTemplate[] = [
  {
    id: "solid-srp-bad",
    name: "Bad: God Class",
    description: "One class handles user creation, auth, email, reporting, and storage — any requirement change forces you to edit this single class, making it fragile and hard to test.",
    tags: ["solid", "srp", "bad", "anti-pattern", "principles", "oop"],
    preferredView: "hierarchical",
    code: `UserManager{
  createUser()
  validateEmail()
  hashPassword()
  sendWelcomeEmail()
  generateMonthlyReport()
  logActivity()
  backupUserDataToS3()
}`,
  },
  {
    id: "solid-srp-good",
    name: "Good: Focused Services",
    description: "Each class has exactly one reason to change. User lifecycle, email delivery, audit logging, and storage are separate concerns with clear boundaries.",
    tags: ["solid", "srp", "good", "principles", "oop"],
    preferredView: "hierarchical",
    code: `UserService{
  createUser()
  updateProfile()
  deleteUser()
}
EmailService{
  sendWelcomeEmail()
  sendPasswordReset()
  sendNotification()
}
AuditService{
  logActivity()
  getAuditTrail()
}
StorageService{
  backupData()
  restoreData()
}

UserService --> AuditService
EmailService --> AuditService`,
  },
];

export const SOLID_OCP_TEMPLATES: DiagramTemplate[] = [
  {
    id: "solid-ocp-bad",
    name: "Bad: Closed for Extension",
    description: "Adding a new notification channel (e.g. Slack) requires editing NotificationSender — modifying existing, working code and risking regressions in email and SMS.",
    tags: ["solid", "ocp", "bad", "anti-pattern", "principles", "oop"],
    preferredView: "hierarchical",
    code: `NotificationSender{
  send()
  if_email_useSmtp()
  if_sms_useTwilio()
  if_push_useFirebase()
  add_new_type_EDIT_HERE()
}
SmtpClient
TwilioGateway
FirebaseClient

NotificationSender ..> SmtpClient
NotificationSender ..> TwilioGateway
NotificationSender ..> FirebaseClient`,
  },
  {
    id: "solid-ocp-good",
    name: "Good: Open for Extension",
    description: "Adding Slack notifications means creating a new SlackNotification class — existing code is never touched.",
    tags: ["solid", "ocp", "good", "principles", "oop"],
    preferredView: "hierarchical",
    code: `Notification[
  send()
]
EmailNotification{
  recipient
  send()
}
SMSNotification{
  phone
  send()
}
PushNotification{
  deviceToken
  send()
}
SlackNotification{
  channel
  send()
}

EmailNotification ..|> Notification
SMSNotification ..|> Notification
PushNotification ..|> Notification
SlackNotification ..|> Notification`,
  },
];

export const SOLID_LSP_TEMPLATES: DiagramTemplate[] = [
  {
    id: "solid-lsp-bad",
    name: "Bad: Broken Substitution",
    description: "Penguin extends Bird but throws an exception from fly() — any code that uses Bird cannot safely substitute a Penguin without special-casing it.",
    tags: ["solid", "lsp", "bad", "anti-pattern", "principles", "oop"],
    preferredView: "hierarchical",
    code: `Bird{
  fly()
  eat()
  layEggs()
}
Sparrow{
  fly()
  eat()
  layEggs()
}
Penguin{
  fly_ThrowsException()
  eat()
  layEggs()
  swim()
}

Sparrow --|> Bird
Penguin --|> Bird`,
  },
  {
    id: "solid-lsp-good",
    name: "Good: Proper Hierarchy",
    description: "FlyingBird and Penguin split the hierarchy cleanly — every subtype can be substituted for its declared base without surprises.",
    tags: ["solid", "lsp", "good", "principles", "oop"],
    preferredView: "hierarchical",
    code: `Animal{
  eat()
  layEggs()
}
FlyingBird{
  eat()
  layEggs()
  fly()
}
Sparrow{
  fly()
  eat()
  layEggs()
}
Eagle{
  fly()
  eat()
  layEggs()
}
Penguin{
  eat()
  layEggs()
  swim()
}

FlyingBird --|> Animal
Penguin --|> Animal
Sparrow --|> FlyingBird
Eagle --|> FlyingBird`,
  },
];

export const SOLID_ISP_TEMPLATES: DiagramTemplate[] = [
  {
    id: "solid-isp-bad",
    name: "Bad: Fat Interface",
    description: "BasicPrinter is forced to stub scan(), fax(), and staple() it cannot support — clients who only need print() still depend on the entire bloated contract.",
    tags: ["solid", "isp", "bad", "anti-pattern", "principles", "oop"],
    preferredView: "hierarchical",
    code: `IDevice[
  print()
  scan()
  fax()
  staple()
]
BasicPrinter{
  print()
  scan_NotSupported()
  fax_NotSupported()
  staple_NotSupported()
}
AllInOnePrinter{
  print()
  scan()
  fax()
  staple()
}

BasicPrinter ..|> IDevice
AllInOnePrinter ..|> IDevice`,
  },
  {
    id: "solid-isp-good",
    name: "Good: Role Interfaces",
    description: "Each device implements only the narrow interfaces it actually supports — clients depend on exactly what they need, nothing more.",
    tags: ["solid", "isp", "good", "principles", "oop"],
    preferredView: "hierarchical",
    code: `Printable[
  print()
]
Scannable[
  scan()
]
Faxable[
  fax()
]
MultifunctionPrinter{
  print()
  scan()
  fax()
}
BasicPrinter{
  print()
}
Scanner{
  scan()
}

MultifunctionPrinter ..|> Printable
MultifunctionPrinter ..|> Scannable
MultifunctionPrinter ..|> Faxable
BasicPrinter ..|> Printable
Scanner ..|> Scannable`,
  },
];

export const SOLID_DIP_TEMPLATES: DiagramTemplate[] = [
  {
    id: "solid-dip-bad",
    name: "Bad: Concrete Dependency",
    description: "OrderProcessor is hardwired to EmailNotifier — switching to SMS or adding push notifications forces changes inside high-level business logic.",
    tags: ["solid", "dip", "bad", "anti-pattern", "principles", "oop"],
    preferredView: "hierarchical",
    code: `OrderProcessor{
  emailNotifier
  processOrder()
  sendEmailConfirmation()
}
EmailNotifier{
  smtpServer
  sendEmail()
  formatMessage()
}

OrderProcessor --> EmailNotifier`,
  },
  {
    id: "solid-dip-good",
    name: "Good: Depend on Abstraction",
    description: "OrderProcessor depends only on the Notifier interface — notification channels can be swapped or multiplied without touching business logic.",
    tags: ["solid", "dip", "good", "principles", "oop"],
    preferredView: "hierarchical",
    code: `OrderProcessor{
  notifier
  processOrder()
}
Notifier[
  send()
]
EmailNotifier{
  send()
}
SMSNotifier{
  send()
}
PushNotifier{
  send()
}

OrderProcessor --> Notifier
EmailNotifier ..|> Notifier
SMSNotifier ..|> Notifier
PushNotifier ..|> Notifier`,
  },
];

export const CREATIONAL_PATTERN_TEMPLATES: DiagramTemplate[] = [
  {
    id: "gof-singleton",
    name: "Singleton",
    description: "Ensures a class has only one instance and provides global access to it",
    tags: ["design-pattern", "creational", "gof"],
    preferredView: "hierarchical",
    code: `Singleton{
  instance
  getInstance()
  businessLogic()
}
Client1
Client2
Client3

Client1 ..> Singleton
Client2 ..> Singleton
Client3 ..> Singleton`,
  },
  {
    id: "gof-factory-method",
    name: "Factory Method",
    description: "Defines an interface for creating objects, letting subclasses decide which class to instantiate",
    tags: ["design-pattern", "creational", "gof"],
    preferredView: "hierarchical",
    code: `Creator[
  createProduct()
  operation()
]
ConcreteCreatorA{
  createProduct()
}
ConcreteCreatorB{
  createProduct()
}
Product[
  use()
]
ConcreteProductA{
  use()
}
ConcreteProductB{
  use()
}

ConcreteCreatorA ..|> Creator
ConcreteCreatorB ..|> Creator
ConcreteProductA ..|> Product
ConcreteProductB ..|> Product
ConcreteCreatorA ..> ConcreteProductA
ConcreteCreatorB ..> ConcreteProductB`,
  },
  {
    id: "gof-abstract-factory",
    name: "Abstract Factory",
    description: "Produces families of related objects without specifying their concrete classes",
    tags: ["design-pattern", "creational", "gof"],
    preferredView: "hierarchical",
    code: `GUIFactory[
  createButton()
  createCheckbox()
]
WindowsFactory{
  createButton()
  createCheckbox()
}
MacFactory{
  createButton()
  createCheckbox()
}
Button[
  render()
]
WindowsButton{
  render()
}
MacButton{
  render()
}
Checkbox[
  render()
]
WindowsCheckbox{
  render()
}
MacCheckbox{
  render()
}

WindowsFactory ..|> GUIFactory
MacFactory ..|> GUIFactory
WindowsFactory ..> WindowsButton
WindowsFactory ..> WindowsCheckbox
MacFactory ..> MacButton
MacFactory ..> MacCheckbox
WindowsButton ..|> Button
MacButton ..|> Button
WindowsCheckbox ..|> Checkbox
MacCheckbox ..|> Checkbox`,
  },
  {
    id: "gof-builder",
    name: "Builder",
    description: "Constructs complex objects step by step, separating construction from representation",
    tags: ["design-pattern", "creational", "gof"],
    preferredView: "hierarchical",
    code: `Director{
  builder
  construct()
}
Builder[
  buildPartA()
  buildPartB()
  buildPartC()
  getResult()
]
ConcreteBuilder{
  buildPartA()
  buildPartB()
  buildPartC()
  getResult()
}
Product{
  partA
  partB
  partC
}

Director o-- Builder
ConcreteBuilder ..|> Builder
ConcreteBuilder ..> Product`,
  },
  {
    id: "gof-prototype",
    name: "Prototype",
    description: "Creates new objects by cloning an existing prototype",
    tags: ["design-pattern", "creational", "gof"],
    preferredView: "hierarchical",
    code: `Prototype[
  clone()
]
ConcretePrototypeA{
  field1
  field2
  clone()
}
ConcretePrototypeB{
  field1
  field2
  clone()
}
Client{
  prototype
  makeACopy()
}

ConcretePrototypeA ..|> Prototype
ConcretePrototypeB ..|> Prototype
Client --> Prototype`,
  },
];

export const STRUCTURAL_PATTERN_TEMPLATES: DiagramTemplate[] = [
  {
    id: "gof-adapter",
    name: "Adapter",
    description: "Makes incompatible interfaces work together by wrapping one with a compatible interface",
    tags: ["design-pattern", "structural", "gof"],
    preferredView: "hierarchical",
    code: `Client
Target[
  request()
]
Adapter{
  adaptee
  request()
}
Adaptee{
  specificRequest()
}

Client ..> Target
Adapter ..|> Target
Adapter o-- Adaptee`,
  },
  {
    id: "gof-bridge",
    name: "Bridge",
    description: "Decouples an abstraction from its implementation so both can vary independently",
    tags: ["design-pattern", "structural", "gof"],
    preferredView: "hierarchical",
    code: `Abstraction{
  impl
  operation()
}
RefinedAbstraction{
  operation()
  extra()
}
Implementor[
  operationImpl()
]
ConcreteImplA{
  operationImpl()
}
ConcreteImplB{
  operationImpl()
}

RefinedAbstraction --|> Abstraction
Abstraction o-- Implementor
ConcreteImplA ..|> Implementor
ConcreteImplB ..|> Implementor`,
  },
  {
    id: "gof-composite",
    name: "Composite",
    description: "Composes objects into tree structures to represent part-whole hierarchies",
    tags: ["design-pattern", "structural", "gof"],
    preferredView: "hierarchical",
    code: `Component[
  operation()
  add()
  remove()
]
Leaf{
  operation()
}
Composite{
  children
  operation()
  add()
  remove()
}

Leaf ..|> Component
Composite ..|> Component
Composite o-- Component`,
  },
  {
    id: "gof-decorator",
    name: "Decorator",
    description: "Attaches additional responsibilities to an object dynamically, wrapping the original",
    tags: ["design-pattern", "structural", "gof"],
    preferredView: "hierarchical",
    code: `Component[
  operation()
]
ConcreteComponent{
  operation()
}
BaseDecorator{
  wrappee
  operation()
}
ConcreteDecoratorA{
  addedState
  operation()
}
ConcreteDecoratorB{
  operation()
  extraBehavior()
}

ConcreteComponent ..|> Component
BaseDecorator ..|> Component
ConcreteDecoratorA --|> BaseDecorator
ConcreteDecoratorB --|> BaseDecorator
BaseDecorator o-- Component`,
  },
  {
    id: "gof-facade",
    name: "Facade",
    description: "Provides a simplified interface to a complex subsystem",
    tags: ["design-pattern", "structural", "gof"],
    preferredView: "hierarchical",
    code: `Client
Facade{
  operation1()
  operation2()
}
SubsystemA{
  operationA1()
  operationA2()
}
SubsystemB{
  operationB1()
  operationB2()
}
SubsystemC{
  operationC1()
}

Client ..> Facade
Facade --> SubsystemA
Facade --> SubsystemB
Facade --> SubsystemC`,
  },
  {
    id: "gof-proxy",
    name: "Proxy",
    description: "Provides a surrogate that controls access to another object",
    tags: ["design-pattern", "structural", "gof"],
    preferredView: "hierarchical",
    code: `Client
Subject[
  request()
]
RealSubject{
  request()
}
Proxy{
  realSubject
  request()
  checkAccess()
  logCall()
}

Client ..> Subject
RealSubject ..|> Subject
Proxy ..|> Subject
Proxy o-- RealSubject`,
  },
  {
    id: "gof-flyweight",
    name: "Flyweight",
    description: "Shares intrinsic state between many fine-grained objects to reduce memory usage",
    tags: ["design-pattern", "structural", "gof"],
    preferredView: "hierarchical",
    code: `FlyweightFactory{
  cache
  getFlyweight()
}
Flyweight[
  intrinsicState
  operation()
]
ConcreteFlyweight{
  intrinsicState
  operation()
}
Client{
  extrinsicState
  flyweights
}

FlyweightFactory o-- ConcreteFlyweight
ConcreteFlyweight ..|> Flyweight
Client ..> FlyweightFactory
Client ..> ConcreteFlyweight`,
  },
];

export const BEHAVIORAL_PATTERN_TEMPLATES: DiagramTemplate[] = [
  {
    id: "gof-chain-of-responsibility",
    name: "Chain of Responsibility",
    description: "Passes a request along a chain of handlers, each deciding to handle or forward it",
    tags: ["design-pattern", "behavioral", "gof"],
    preferredView: "pipeline",
    code: `Request
AuthHandler{
  handle()
  setNext()
}
LoggingHandler{
  handle()
  setNext()
}
RateLimitHandler{
  handle()
  setNext()
}
BusinessHandler{
  processRequest()
}

Request --> AuthHandler
AuthHandler --> LoggingHandler
LoggingHandler --> RateLimitHandler
RateLimitHandler --> BusinessHandler`,
  },
  {
    id: "gof-command",
    name: "Command",
    description: "Encapsulates a request as an object, enabling undo/redo and request queuing",
    tags: ["design-pattern", "behavioral", "gof"],
    preferredView: "hierarchical",
    code: `Invoker{
  history
  setCommand()
  execute()
  undo()
}
Command[
  execute()
  undo()
]
CopyCommand{
  receiver
  execute()
  undo()
}
PasteCommand{
  receiver
  execute()
  undo()
}
Editor{
  selection
  clipboard
  copy()
  paste()
}

Invoker o-- Command
CopyCommand ..|> Command
PasteCommand ..|> Command
CopyCommand --> Editor
PasteCommand --> Editor`,
  },
  {
    id: "gof-iterator",
    name: "Iterator",
    description: "Provides sequential access to a collection's elements without exposing its internals",
    tags: ["design-pattern", "behavioral", "gof"],
    preferredView: "hierarchical",
    code: `IterableCollection[
  createIterator()
]
ConcreteCollection{
  items
  createIterator()
}
Iterator[
  getNext()
  hasMore()
  currentItem()
]
ConcreteIterator{
  collection
  position
  getNext()
  hasMore()
}
Client

Client ..> IterableCollection
Client ..> Iterator
ConcreteCollection ..|> IterableCollection
ConcreteIterator ..|> Iterator
ConcreteCollection ..> ConcreteIterator`,
  },
  {
    id: "gof-mediator",
    name: "Mediator",
    description: "Reduces chaotic dependencies between objects by routing communication through a mediator",
    tags: ["design-pattern", "behavioral", "gof"],
    preferredView: "radial",
    code: `Mediator{
  componentA
  componentB
  componentC
  notify()
}
ComponentA{
  mediator
  doA()
}
ComponentB{
  mediator
  doB()
}
ComponentC{
  mediator
  doC()
}

Mediator o-- ComponentA
Mediator o-- ComponentB
Mediator o-- ComponentC
ComponentA --> Mediator
ComponentB --> Mediator
ComponentC --> Mediator`,
  },
  {
    id: "gof-memento",
    name: "Memento",
    description: "Captures and restores an object's internal state without violating encapsulation",
    tags: ["design-pattern", "behavioral", "gof"],
    preferredView: "hierarchical",
    code: `Originator{
  state
  save()
  restore()
}
Memento{
  state
  getState()
}
Caretaker{
  originator
  history
  doSomething()
  undo()
}

Originator ..> Memento
Caretaker --> Originator
Caretaker o-- Memento`,
  },
  {
    id: "gof-observer",
    name: "Observer",
    description: "Notifies multiple dependents automatically when one object's state changes",
    tags: ["design-pattern", "behavioral", "gof"],
    preferredView: "radial",
    code: `EventEmitter{
  subscribers
  subscribe()
  unsubscribe()
  notify()
}
Subscriber[
  update()
]
UserInterface{
  update()
}
Logger{
  update()
}
EmailService{
  update()
}
Analytics{
  update()
}

EventEmitter o-- Subscriber
UserInterface ..|> Subscriber
Logger ..|> Subscriber
EmailService ..|> Subscriber
Analytics ..|> Subscriber`,
  },
  {
    id: "gof-state",
    name: "State",
    description: "Allows an object to alter its behavior when its internal state changes",
    tags: ["design-pattern", "behavioral", "gof"],
    preferredView: "hierarchical",
    code: `Context{
  state
  setState()
  request()
}
State[
  handle()
]
IdleState{
  handle()
}
ProcessingState{
  handle()
}
ErrorState{
  handle()
}
CompletedState{
  handle()
}

Context --> State
IdleState ..|> State
ProcessingState ..|> State
ErrorState ..|> State
CompletedState ..|> State`,
  },
  {
    id: "gof-strategy",
    name: "Strategy",
    description: "Defines a family of algorithms, encapsulates each one, and makes them interchangeable",
    tags: ["design-pattern", "behavioral", "gof"],
    preferredView: "hierarchical",
    code: `Context{
  strategy
  setStrategy()
  execute()
}
Strategy[
  execute()
]
BubbleSort{
  execute()
}
QuickSort{
  execute()
}
MergeSort{
  execute()
}

Context --> Strategy
BubbleSort ..|> Strategy
QuickSort ..|> Strategy
MergeSort ..|> Strategy`,
  },
  {
    id: "gof-template-method",
    name: "Template Method",
    description: "Defines the skeleton of an algorithm in a base class, deferring steps to subclasses",
    tags: ["design-pattern", "behavioral", "gof"],
    preferredView: "hierarchical",
    code: `DataProcessor[
  process()
  readData()
  parseData()
  analyzeData()
  sendReport()
]
CSVDataProcessor{
  readData()
  parseData()
}
JSONDataProcessor{
  readData()
  parseData()
}
XMLDataProcessor{
  readData()
  parseData()
  sendReport()
}

CSVDataProcessor ..|> DataProcessor
JSONDataProcessor ..|> DataProcessor
XMLDataProcessor ..|> DataProcessor`,
  },
  {
    id: "gof-visitor",
    name: "Visitor",
    description: "Lets you add further operations to objects without modifying them",
    tags: ["design-pattern", "behavioral", "gof"],
    preferredView: "hierarchical",
    code: `Visitor[
  visitCircle()
  visitRectangle()
  visitTriangle()
]
AreaCalculator{
  visitCircle()
  visitRectangle()
  visitTriangle()
}
XMLExporter{
  visitCircle()
  visitRectangle()
  visitTriangle()
}
Shape[
  accept()
]
Circle{
  accept()
}
Rectangle{
  accept()
}
Triangle{
  accept()
}

AreaCalculator ..|> Visitor
XMLExporter ..|> Visitor
Circle ..|> Shape
Rectangle ..|> Shape
Triangle ..|> Shape
Circle --> Visitor
Rectangle --> Visitor
Triangle --> Visitor`,
  },
];

export const APP_ARCH_TEMPLATES: DiagramTemplate[] = [
  {
    id: "arch-mvp",
    name: "MVP",
    description: "Model-View-Presenter: View is passive, Presenter handles all UI logic and mediates with Model",
    tags: ["architecture", "ui", "mvp", "pattern"],
    preferredView: "hierarchical",
    code: `Model{
  DataSource
  BusinessLogic
  Repository
}
View{
  UserInterface
  UserEvents
  displayData()
  showError()
}
Presenter{
  handleUserAction()
  updateView()
  fetchData()
}

View --> Presenter
Presenter --> Model
Presenter --> View`,
  },
  {
    id: "arch-mvvm",
    name: "MVVM",
    description: "Model-View-ViewModel: two-way data binding eliminates direct View↔Model coupling",
    tags: ["architecture", "ui", "mvvm", "pattern"],
    preferredView: "hierarchical",
    code: `Model{
  DataSource
  BusinessLogic
  Repository
}
View{
  UserInterface
  DataBinding
  UserInput
}
ViewModel{
  ObservableState
  Commands
  formatData()
  handleCommand()
}

View --> ViewModel
ViewModel --> Model
ViewModel --> View`,
  },
  {
    id: "arch-hexagonal",
    name: "Hexagonal",
    description: "Ports & Adapters: core domain is isolated from all external systems via port interfaces",
    tags: ["architecture", "hexagonal", "ports-adapters", "ddd", "pattern"],
    preferredView: "radial",
    code: `Domain{
  Entities
  UseCases
  Ports
}
PrimaryAdapters{
  RESTController
  GraphQLController
  CLIAdapter
  EventListener
}
SecondaryAdapters{
  PostgresAdapter
  RedisAdapter
  EmailAdapter
  S3Adapter
}

PrimaryAdapters ..> Domain
Domain ..> SecondaryAdapters`,
  },
  {
    id: "arch-clean",
    name: "Clean Architecture",
    description: "Concentric dependency rings — arrows always point inward; outer layers depend on inner layers, never the reverse",
    tags: ["architecture", "clean", "ddd", "pattern"],
    preferredView: "hierarchical",
    code: `Frameworks{
  WebFramework
  Database
  ExternalAPIs
  UI
}
InterfaceAdapters{
  Controllers
  Presenters
  Gateways
}
UseCases{
  ApplicationLogic
  Interactors
  DTOs
}
Entities{
  BusinessRules
  DomainObjects
  ValueObjects
}

Frameworks ..> InterfaceAdapters
InterfaceAdapters ..> UseCases
UseCases ..> Entities`,
  },
  {
    id: "arch-cqrs",
    name: "CQRS",
    description: "Command Query Responsibility Segregation: separate models optimized for reads vs. writes",
    tags: ["architecture", "cqrs", "pattern", "event-driven"],
    preferredView: "pipeline",
    code: `Client
CommandSide{
  CommandHandler
  WriteModel
  WriteDB
}
QuerySide{
  QueryHandler
  ReadModel
  ReadDB
}
EventBus
EventStore

Client --> CommandSide
Client --> QuerySide
CommandSide --> EventStore
EventStore --> EventBus
EventBus --> QuerySide`,
  },
  {
    id: "arch-event-sourcing",
    name: "Event Sourcing",
    description: "State is stored as a sequence of events — current state is rebuilt by replaying them",
    tags: ["architecture", "event-sourcing", "pattern", "event-driven"],
    preferredView: "timeline",
    code: `Command
CommandHandler{
  validate()
  applyLogic()
  emitEvent()
}
EventStore{
  OrderCreated
  ItemAdded
  OrderShipped
  OrderCancelled
}
Projection{
  currentState
  rebuild()
  handleEvent()
}
ReadModel

Command --> CommandHandler
CommandHandler --> EventStore
EventStore --> Projection
Projection --> ReadModel`,
  },
];

export const SYSTEM_ARCH_TEMPLATES: DiagramTemplate[] = [
  {
    id: "arch-monolith",
    name: "Monolith",
    description: "Single deployable unit containing all application concerns — simple to develop, harder to scale",
    tags: ["architecture", "monolith", "system", "deployment"],
    preferredView: "hierarchical",
    code: `MonolithicApp{
  PresentationLayer{
    WebController
    APIController
    ViewTemplates
  }
  BusinessLayer{
    UserService
    OrderService
    PaymentService
    NotificationService
  }
  DataLayer{
    UserRepository
    OrderRepository
    PaymentRepository
  }
}
Database

MonolithicApp --> Database`,
  },
  {
    id: "arch-soa",
    name: "SOA",
    description: "Service-Oriented Architecture: coarse-grained services communicate via an enterprise service bus",
    tags: ["architecture", "soa", "system", "enterprise"],
    preferredView: "pipeline",
    code: `Client
ESB{
  Router
  Transformer
  Orchestrator
  MessageBroker
}
UserService{
  SOAP_Endpoint
  BusinessLogic
  UserDB
}
OrderService{
  SOAP_Endpoint
  BusinessLogic
  OrderDB
}
PaymentService{
  SOAP_Endpoint
  BusinessLogic
  PaymentDB
}
ServiceRegistry

Client --> ESB
ESB --> UserService
ESB --> OrderService
ESB --> PaymentService
ServiceRegistry --> ESB`,
  },
  {
    id: "arch-serverless",
    name: "Serverless",
    description: "Functions triggered on demand — no servers to manage, scales to zero automatically",
    tags: ["architecture", "serverless", "cloud", "faas"],
    preferredView: "radial",
    code: `APIGateway
Functions{
  CreateUser()
  GetOrders()
  ProcessPayment()
  SendEmail()
  ResizeImage()
}
CloudServices{
  ObjectStorage
  ManagedDatabase
  MessageQueue
  CDN
  SecretManager
}
Triggers{
  HTTP
  ScheduledCron
  QueueMessage
  FileUpload
}

Triggers --> Functions
APIGateway --> Functions
Functions --> CloudServices`,
  },
  {
    id: "arch-bff",
    name: "BFF",
    description: "Backend for Frontend: a dedicated backend per client type, each optimized for its consumer",
    tags: ["architecture", "bff", "api", "frontend", "system"],
    preferredView: "hierarchical",
    code: `WebApp
MobileApp
TVApp
WebBFF{
  aggregateForWeb()
  webOptimizedData()
}
MobileBFF{
  aggregateForMobile()
  compressPayload()
}
TVBFF{
  aggregateForTV()
  streamingData()
}
UserService
OrderService
ProductService
MediaService

WebApp --> WebBFF
MobileApp --> MobileBFF
TVApp --> TVBFF
WebBFF --> UserService
WebBFF --> OrderService
MobileBFF --> UserService
MobileBFF --> ProductService
TVBFF --> ProductService
TVBFF --> MediaService`,
  },
];
