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
    name: "Atom: Match by Element Type",
    description:
      "Atoms that select by element type — functions, states, and deep elements highlighted",
    tags: ["selector", "atoms", "type-match"],
    preferredView: "hierarchical",
    code: `!atom  id=fn  function_name=.*
!atom  id=st  state_name=.*
!atom  id=deep  all_level=3-4

!selector  name=functions  combiner=fn  color=#ff6b35  mode=color
!selector  name=states  combiner=st  color=#4caf50  mode=color
!selector  name=deep_elements  combiner=deep  color=#9c27b0  mode=color

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
    name: "Atom: Match by Name Pattern",
    description:
      "Atoms using regex to highlight services, databases, and caches by name",
    tags: ["selector", "atoms", "name-pattern"],
    preferredView: "pipeline",
    code: `!atom  id=svc  all_name=.*Service
!atom  id=db   object_name=.*DB
!atom  id=cch  all_name=Cache.*

!selector  name=services   combiner=svc  color=#2196f3  mode=color
!selector  name=databases  combiner=db   color=#ff9800  mode=color
!selector  name=caches     combiner=cch  color=#4caf50  mode=color

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
    name: "Atom: Boolean Combiners",
    description:
      "Combining atoms with + (OR), & (AND), - (NOT) operators to build compound selectors",
    tags: ["selector", "atoms", "boolean-logic"],
    preferredView: "basic",
    code: `!atom  id=backend   all_name=.*Service
!atom  id=storage   object_name=.*DB
!atom  id=external  all_name=.*Gateway.*

!selector  name=backend          combiner=backend            color=#2196f3  mode=color
!selector  name=storage          combiner=storage            color=#ff9800  mode=color
!selector  name=external         combiner=external           color=#e91e63  mode=color
!selector  name=backend_or_store combiner=backend+storage    color=#00bcd4  mode=dim
!selector  name=not_external     combiner=-external          color=#9e9e9e  mode=dim

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
    name: "Disconnector — strip relationships",
    description:
      "Generator produces connected pairs; disconnector strips the relationship before forwarding the bare elements",
    tags: ["execution", "disconnector"],
    preferredView: "timeline",
    code: `gen(
  X{}
  Y{}
)
disconnector()
out[]

gen --> disconnector
disconnector --> out`,
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
