import type { ViewState } from "./ViewState";

export interface DiagramTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];

  preferredView: ViewState["viewMode"];

  code: string;
}

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

export const ALL_REL_TYPES_TEMPLATE: DiagramTemplate = {
  id: "all-rel-types",
  name: "All Relationship Types",
  description:
    "Every arrow style — a thought becomes a tool: extends, depends, uses, implements, aggregates, composes",
  tags: ["reference", "relationships", "syntax"],
  preferredView: "basic",
  code: `Thought{}
Design{}
Code{}
Review{}
Build{}
Artefact{}

Thought --|> Design
Design --> Code
Code ..> Review
Review ..|> Design
Build o-- Code
Artefact *-- Build`,
};

export const ALL_ELEMENT_TYPES_TEMPLATE: DiagramTemplate = {
  id: "all-element-types",
  name: "All Element Types",
  description:
    "One of each: object, collection, function, state, choice, flow — a small story of a single act",
  tags: ["reference", "element-types", "syntax"],
  preferredView: "circular",
  code: `Object{
  "Things that hold structure"
  data
  identity
}
Archive[
  "Memory without judgment"
  entry
]
Act()
Resting||
Crossroads<>

Origin>> --> Object
Object --> Act()
Act() --> Resting||
Resting|| --> Crossroads<>
Crossroads<> --remember--> Archive
Crossroads<> --again--> Act()`,
};

export const WIDE_FANOUT_TEMPLATE: DiagramTemplate = {
  id: "wide-fanout",
  name: "Wide Fan-Out",
  description:
    "Hub connected to 20 leaves — a simple structure that looks distinct in every layout mode",
  tags: ["layout", "showcase"],
  preferredView: "circular",
  code: [
    "Hub{}",
    ...Array.from(
      { length: 20 },
      (_, i) => `Leaf${String(i + 1).padStart(2, "0")}{}`,
    ),
    "",
    ...Array.from(
      { length: 20 },
      (_, i) => `Hub --> Leaf${String(i + 1).padStart(2, "0")}`,
    ),
  ].join("\n"),
};

export const SELECTOR_SHOWCASE_TEMPLATES: DiagramTemplate[] = [
  {
    id: "selector-flags",
    name: "Flag-Based Selectors",
    description:
      "Elements tagged with :flag syntax, each selector preset colors its matching group",
    tags: ["selector", "flags", "showcase"],
    preferredView: "hierarchical",
    code: `!group  id=fine      color=#661144
!group  id=unlocked  color=#4caf50
!group  id=current   color=#2196f3
!group  id=locked    color=#9e9e9e

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
    name: "Group: Match by Element Type",
    description:
      "Groups that match by element type — functions, states, and deep elements highlighted",
    tags: ["group", "type-match"],
    preferredView: "hierarchical",
    code: `!group  id=functions      regex=.*\\(\\)      color=#ff6b35
!group  id=states         regex=.*\\|\\|      color=#4caf50
!group  id=deep_elements  regex=.*\\..*\\..*  color=#9c27b0

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
    name: "Group: Match by Name Pattern",
    description:
      "Groups using regex to highlight services, databases, and caches by name",
    tags: ["group", "name-pattern"],
    preferredView: "pipeline",
    code: `!group  id=services   regex=.*Service    color=#abc123
!group  id=databases  regex=.*DB\\{\\}     color=#ff9800
!group  id=caches     regex=Cache.*      color=#4caf50

UserService{}
OrderService{}
PaymentService{}
UserDB{ _database_ }
OrderDB{ _database_ }
CacheLayer{
  _cache_
  CacheA
  CacheB
}
MessageBus{ _event_ }

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
    name: "Group: Boolean Expressions",
    description:
      "Combining groups with compose= — & (AND), | (OR), - (AND NOT) operators",
    tags: ["group", "boolean-logic"],
    preferredView: "basic",
    code: `!group  id=backend          regex=.*Service              color=#2196f3
!group  id=storage          regex=.*DB\\{\\}               color=#ff9800
!group  id=external         regex=.*Gateway              color=#e91e63
!group  id=backend_or_store compose=backend|storage      color=#00bcd4
!group  id=backend_not_ext  compose=backend-external     color=#9e9e9e

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
    code: `gen_a(A)
gen_b(B)
gen_c(C)
gen_d(D)
connector()
merged[]

gen_a --> connector
gen_b --> connector
gen_c --> connector
gen_d --> connector
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

export const STRESS_TEMPLATES: DiagramTemplate[] = [
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

export const SOLID_SRP_TEMPLATES: DiagramTemplate[] = [
  {
    id: "solid-srp-bad",
    name: "Bad: God Class",
    description:
      "One class handles user creation, auth, email, reporting, and storage — any requirement change forces you to edit this single class, making it fragile and hard to test.",
    tags: ["solid", "srp", "bad", "anti-pattern", "principles", "oop"],
    preferredView: "circular",
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
    description:
      "Each class has exactly one reason to change. User lifecycle, email delivery, audit logging, and storage are separate concerns with clear boundaries.",
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

UserService --"on user change"--> EmailService
UserService --"audit events"--> AuditService
EmailService --"audit events"--> AuditService
StorageService --"audit events"--> AuditService`,
  },
];

export const SOLID_OCP_TEMPLATES: DiagramTemplate[] = [
  {
    id: "solid-ocp-bad",
    name: "Bad: Closed for Extension",
    description:
      "Adding a new notification channel (e.g. Slack) requires editing NotificationSender — modifying existing, working code and risking regressions in email and SMS.",
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
    description:
      "Adding Slack notifications means creating a new SlackNotification class — existing code is never touched.",
    tags: ["solid", "ocp", "good", "principles", "oop"],
    preferredView: "hierarchical",
    code: `!group  id=interface        regex=^Notification\\{\\}$  color=#451c82
!group  id=implementations  regex=.+Notification\\{\\}  color=#7b47c7

Notification{
  send()
}
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
    description:
      "Penguin extends Bird but throws an exception from fly() — any code that uses Bird cannot safely substitute a Penguin without special-casing it.",
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
    description:
      "FlyingBird and Penguin split the hierarchy cleanly — every subtype can be substituted for its declared base without surprises.",
    tags: ["solid", "lsp", "good", "principles", "oop"],
    preferredView: "hierarchical",
    code: `!group  id=interface  color=#451c82
!group  id=impl       color=#7b47c7

Animal:interface{
  eat()
  layEggs()
}
FlyingBird:interface{
  eat()
  layEggs()
  fly()
}
Sparrow:impl{
  fly()
  eat()
  layEggs()
}
Eagle:impl{
  fly()
  eat()
  layEggs()
}
Penguin:impl{
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
    description:
      "BasicPrinter is forced to stub scan(), fax(), and staple() it cannot support — clients who only need print() still depend on the entire bloated contract.",
    tags: ["solid", "isp", "bad", "anti-pattern", "principles", "oop"],
    preferredView: "hierarchical",
    code: `IDevice{
  print()
  scan()
  fax()
  staple()
}
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
    description:
      "Each device implements only the narrow interfaces it actually supports — clients depend on exactly what they need, nothing more.",
    tags: ["solid", "isp", "good", "principles", "oop"],
    preferredView: "hierarchical",
    code: `!group  id=interface  color=#451c82
!group  id=impl       color=#7b47c7

Printable:interface{
  print()
}
Scannable:interface{
  scan()
}
Faxable:interface{
  fax()
}
MultifunctionPrinter:impl{
  print()
  scan()
  fax()
}
BasicPrinter:impl{
  print()
}
Scanner:impl{
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
    description:
      "OrderProcessor is hardwired to EmailNotifier — switching to SMS or adding push notifications forces changes inside high-level business logic.",
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
    description:
      "OrderProcessor depends only on the Notifier interface — notification channels can be swapped or multiplied without touching business logic.",
    tags: ["solid", "dip", "good", "principles", "oop"],
    preferredView: "hierarchical",
    code: `!group  id=interface  color=#451c82
!group  id=impl       color=#7b47c7

OrderProcessor{
  notifier
  processOrder()
}
Notifier:interface{
  send()
}
EmailNotifier:impl{
  send()
}
SMSNotifier:impl{
  send()
}
PushNotifier:impl{
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
    description:
      "Ensures a class has only one instance and provides global access to it",
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
    description:
      "Defines an interface for creating objects, letting subclasses decide which class to instantiate",
    tags: ["design-pattern", "creational", "gof"],
    preferredView: "hierarchical",
    code: `!group  id=interface  color=#451c82
!group  id=impl       color=#7b47c7

Creator:interface{
  createProduct()
  operation()
}
ConcreteCreatorA:impl{
  createProduct()
}
ConcreteCreatorB:impl{
  createProduct()
}
Product:interface{
  use()
}
ConcreteProductA:impl{
  use()
}
ConcreteProductB:impl{
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
    description:
      "Produces families of related objects without specifying their concrete classes",
    tags: ["design-pattern", "creational", "gof"],
    preferredView: "hierarchical",
    code: `!group  id=interface  color=#451c82
!group  id=impl       color=#7b47c7

GUIFactory:interface{
  createButton()
  createCheckbox()
}
WindowsFactory:impl{
  createButton()
  createCheckbox()
}
MacFactory:impl{
  createButton()
  createCheckbox()
}
Button:interface{
  render()
}
WindowsButton:impl{
  render()
}
MacButton:impl{
  render()
}
Checkbox:interface{
  render()
}
WindowsCheckbox:impl{
  render()
}
MacCheckbox:impl{
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
    description:
      "Constructs complex objects step by step, separating construction from representation",
    tags: ["design-pattern", "creational", "gof"],
    preferredView: "hierarchical",
    code: `!group  id=interface  color=#451c82
!group  id=impl       color=#7b47c7

Director{
  builder
  construct()
}
Builder:interface{
  buildPartA()
  buildPartB()
  buildPartC()
  getResult()
}
ConcreteBuilder:impl{
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
    code: `!group  id=interface  color=#451c82
!group  id=impl       color=#7b47c7

Prototype:interface{
  clone()
}
ConcretePrototypeA:impl{
  field1
  field2
  clone()
}
ConcretePrototypeB:impl{
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
    description:
      "Makes incompatible interfaces work together by wrapping one with a compatible interface",
    tags: ["design-pattern", "structural", "gof"],
    preferredView: "hierarchical",
    code: `!group  id=interface  color=#451c82
!group  id=impl       color=#7b47c7

Client
Target:interface{
  request()
}
Adapter:impl{
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
    description:
      "Decouples an abstraction from its implementation so both can vary independently",
    tags: ["design-pattern", "structural", "gof"],
    preferredView: "hierarchical",
    code: `!group  id=interface  color=#451c82
!group  id=impl       color=#7b47c7

Abstraction{
  impl
  operation()
}
RefinedAbstraction{
  operation()
  extra()
}
Implementor:interface{
  operationImpl()
}
ConcreteImplA:impl{
  operationImpl()
}
ConcreteImplB:impl{
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
    description:
      "Composes objects into tree structures to represent part-whole hierarchies",
    tags: ["design-pattern", "structural", "gof"],
    preferredView: "hierarchical",
    code: `!group  id=interface  color=#451c82
!group  id=impl       color=#7b47c7

Component:interface{
  operation()
  add()
  remove()
}
Leaf:impl{
  operation()
}
Composite:impl{
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
    description:
      "Attaches additional responsibilities to an object dynamically, wrapping the original",
    tags: ["design-pattern", "structural", "gof"],
    preferredView: "hierarchical",
    code: `!group  id=interface  color=#451c82
!group  id=impl       color=#7b47c7

Component:interface{
  operation()
}
ConcreteComponent:impl{
  operation()
}
BaseDecorator:impl{
  wrappee
  operation()
}
ConcreteDecoratorA:impl{
  addedState
  operation()
}
ConcreteDecoratorB:impl{
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
    code: `!group  id=interface  color=#451c82
!group  id=impl       color=#7b47c7

Client
Subject:interface{
  request()
}
RealSubject:impl{
  request()
}
Proxy:impl{
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
    description:
      "Shares intrinsic state between many fine-grained objects to reduce memory usage",
    tags: ["design-pattern", "structural", "gof"],
    preferredView: "hierarchical",
    code: `!group  id=interface  color=#451c82
!group  id=impl       color=#7b47c7

FlyweightFactory{
  cache
  getFlyweight()
}
Flyweight:interface{
  intrinsicState
  operation()
}
ConcreteFlyweight:impl{
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
    description:
      "Passes a request along a chain of handlers, each deciding to handle or forward it",
    tags: ["design-pattern", "behavioral", "gof"],
    preferredView: "pipeline",
    code: `!group  id=terminal  color=#4caf50

Request:terminal
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
BusinessHandler:terminal{
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
    description:
      "Encapsulates a request as an object, enabling undo/redo and request queuing",
    tags: ["design-pattern", "behavioral", "gof"],
    preferredView: "hierarchical",
    code: `!group  id=interface  color=#451c82
!group  id=impl       color=#7b47c7

Invoker{
  history
  setCommand()
  execute()
  undo()
}
Command:interface{
  execute()
  undo()
}
CopyCommand:impl{
  receiver
  execute()
  undo()
}
PasteCommand:impl{
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
    description:
      "Provides sequential access to a collection's elements without exposing its internals",
    tags: ["design-pattern", "behavioral", "gof"],
    preferredView: "hierarchical",
    code: `!group  id=interface  color=#451c82
!group  id=impl       color=#7b47c7

IterableCollection:interface{
  createIterator()
}
ConcreteCollection:impl{
  items
  createIterator()
}
Iterator:interface{
  getNext()
  hasMore()
  currentItem()
}
ConcreteIterator:impl{
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
    description:
      "Reduces chaotic dependencies between objects by routing communication through a mediator",
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
    description:
      "Captures and restores an object's internal state without violating encapsulation",
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
    description:
      "Notifies multiple dependents automatically when one object's state changes",
    tags: ["design-pattern", "behavioral", "gof"],
    preferredView: "radial",
    code: `!group  id=interface  color=#451c82
!group  id=impl       color=#7b47c7

EventEmitter{
  subscribers
  subscribe()
  unsubscribe()
  notify()
}
Subscriber:interface{
  update()
}
UserInterface:impl{
  update()
}
Logger:impl{
  update()
}
EmailService:impl{
  update()
}
Analytics:impl{
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
    description:
      "Allows an object to alter its behavior when its internal state changes",
    tags: ["design-pattern", "behavioral", "gof"],
    preferredView: "hierarchical",
    code: `!group  id=interface  color=#451c82
!group  id=impl       color=#7b47c7

Context{
  state
  setState()
  request()
}
State:interface{
  handle()
}
IdleState:impl{
  handle()
}
ProcessingState:impl{
  handle()
}
ErrorState:impl{
  handle()
}
CompletedState:impl{
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
    description:
      "Defines a family of algorithms, encapsulates each one, and makes them interchangeable",
    tags: ["design-pattern", "behavioral", "gof"],
    preferredView: "hierarchical",
    code: `!group  id=interface  color=#451c82
!group  id=impl       color=#7b47c7
!group  id=context    color=#ff9800

Context:context{
  strategy
  setStrategy()
  execute()
}
Strategy:interface{
  execute()
}
BubbleSort:impl{
  execute()
}
QuickSort:impl{
  execute()
}
MergeSort:impl{
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
    description:
      "Defines the skeleton of an algorithm in a base class, deferring steps to subclasses",
    tags: ["design-pattern", "behavioral", "gof"],
    preferredView: "hierarchical",
    code: `!group  id=interface  color=#451c82
!group  id=impl       color=#7b47c7

DataProcessor:interface{
  process()
  readData()
  parseData()
  analyzeData()
  sendReport()
}
CSVDataProcessor:impl{
  readData()
  parseData()
}
JSONDataProcessor:impl{
  readData()
  parseData()
}
XMLDataProcessor:impl{
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
    description:
      "Lets you add further operations to objects without modifying them",
    tags: ["design-pattern", "behavioral", "gof"],
    preferredView: "hierarchical",
    code: `!group  id=interface  color=#451c82
!group  id=impl       color=#7b47c7

Visitor:interface{
  visitCircle()
  visitRectangle()
  visitTriangle()
}
AreaCalculator:impl{
  visitCircle()
  visitRectangle()
  visitTriangle()
}
XMLExporter:impl{
  visitCircle()
  visitRectangle()
  visitTriangle()
}
Shape:interface{
  accept()
}
Circle:impl{
  accept()
}
Rectangle:impl{
  accept()
}
Triangle:impl{
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
    description:
      "Model-View-Presenter: View is passive, Presenter handles all UI logic and mediates with Model",
    tags: ["architecture", "ui", "mvp", "pattern"],
    preferredView: "hierarchical",
    code: `Model{
  DataSource
  BusinessLogic
  Repository
}
Presenter{
  handleUserAction()
  updateView()
  fetchData()
}
View{
  UserInterface
  UserEvents
  displayData()
  showError()
}

View --> Presenter
Presenter --> Model
Presenter --> View`,
  },
  {
    id: "arch-mvvm",
    name: "MVVM",
    description:
      "Model-View-ViewModel: two-way data binding eliminates direct View↔Model coupling",
    tags: ["architecture", "ui", "mvvm", "pattern"],
    preferredView: "hierarchical",
    code: `Model{
  DataSource
  BusinessLogic
  Repository
}
ViewModel{
  ObservableState
  Commands
  formatData()
  handleCommand()
}
View{
  UserInterface
  DataBinding
  UserInput
}

View --> ViewModel
ViewModel --> Model
ViewModel --> View`,
  },
  {
    id: "arch-hexagonal",
    name: "Hexagonal",
    description:
      "Ports & Adapters: core domain is isolated from all external systems via port interfaces",
    tags: ["architecture", "hexagonal", "ports-adapters", "ddd", "pattern"],
    preferredView: "circular",
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
  PostgresAdapter{ _database_ }
  RedisAdapter{ _cache_ }
  EmailAdapter{ _mail_ }
  S3Adapter{ _storage_ }
}

PrimaryAdapters ..> Domain
Domain ..> SecondaryAdapters`,
  },
  {
    id: "arch-clean",
    name: "Clean Architecture",
    description:
      "Concentric dependency rings — arrows always point inward; outer layers depend on inner layers, never the reverse",
    tags: ["architecture", "clean", "ddd", "pattern"],
    preferredView: "hierarchical",
    code: `!group  id=infra     color=#607d8b
!group  id=adapters  color=#2196f3
!group  id=app       color=#ff9800
!group  id=domain    color=#4caf50

Frameworks:infra{
  WebFramework
  Database
  ExternalAPIs
  UI
}
InterfaceAdapters:adapters{
  Controllers
  Presenters
  Gateways
}
UseCases:app{
  ApplicationLogic
  Interactors
  DTOs
}
Entities:domain{
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
    description:
      "Command Query Responsibility Segregation: separate models optimized for reads vs. writes",
    tags: ["architecture", "cqrs", "pattern", "event-driven"],
    preferredView: "pipeline",
    code: `Client
CommandSide{
  CommandHandler
  WriteModel
  WriteDB{ _database_ }
}
QuerySide{
  QueryHandler
  ReadModel
  ReadDB{ _database_ }
}
EventBus{ _event_ }
EventStore{ _storage_ }

Client --> CommandSide
Client --> QuerySide
CommandSide --> EventStore
EventStore --> EventBus
EventBus --> QuerySide`,
  },
  {
    id: "arch-event-sourcing",
    name: "Event Sourcing",
    description:
      "State is stored as a sequence of events — current state is rebuilt by replaying them",
    tags: ["architecture", "event-sourcing", "pattern", "event-driven"],
    preferredView: "timeline",
    code: `Command
CommandHandler{
  validate()
  applyLogic()
  emitEvent()
}
EventStore{
  _storage_
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
  {
    id: "arch-mvc",
    name: "MVC",
    description:
      "Model-View-Controller: Controller handles input, updates Model, and selects the View to render",
    tags: ["architecture", "ui", "mvc", "pattern"],
    preferredView: "hierarchical",
    code: `Model{
  Data
  BusinessRules
  State
  notify()
}
View{
  UserInterface
  render()
  getUserInput()
}
Controller{
  handleInput()
  updateModel()
  selectView()
}

Controller --> Model
Controller --> View
Model --> View`,
  },
  {
    id: "arch-layered",
    name: "Layered Architecture",
    description:
      "N-tier layering: each layer depends only on the layer directly below it; strict top-down coupling",
    tags: ["architecture", "layered", "n-tier", "pattern"],
    preferredView: "hierarchical",
    code: `!group  id=presentation  color=#2196f3
!group  id=application   color=#ff9800
!group  id=domain        color=#4caf50
!group  id=infra         color=#607d8b

PresentationLayer:presentation{
  UI
  Controllers
  ViewModels
}
ApplicationLayer:application{
  Services
  UseCases
  DTOs
}
DomainLayer:domain{
  Entities
  BusinessRules
  DomainServices
}
InfrastructureLayer:infra{
  Database{ _database_ }
  ExternalAPIs
  Repositories
  Messaging{ _event_ }
}

PresentationLayer --> ApplicationLayer
ApplicationLayer --> DomainLayer
DomainLayer --> InfrastructureLayer`,
  },
];

export const SYSTEM_ARCH_TEMPLATES: DiagramTemplate[] = [
  {
    id: "arch-monolith",
    name: "Monolith",
    description:
      "Single deployable unit containing all application concerns — simple to develop, harder to scale",
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
Database{
  _database_
}

MonolithicApp --> Database`,
  },
  {
    id: "arch-soa",
    name: "SOA",
    description:
      "Service-Oriented Architecture: coarse-grained services communicate via an enterprise service bus",
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
  UserDB{ _database_ }
}
OrderService{
  SOAP_Endpoint
  BusinessLogic
  OrderDB{ _database_ }
}
PaymentService{
  SOAP_Endpoint
  BusinessLogic
  PaymentDB{ _database_ }
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
    description:
      "Functions triggered on demand — no servers to manage, scales to zero automatically",
    tags: ["architecture", "serverless", "cloud", "faas"],
    preferredView: "radial",
    code: `APIGateway{ _api_ }
Functions{
  CreateUser()
  GetOrders()
  ProcessPayment()
  SendEmail()
  ResizeImage()
}
CloudServices{
  ObjectStorage{ _storage_ }
  ManagedDatabase{ _database_ }
  MessageQueue{ _queue_ }
  CDN{ _network_ }
  SecretManager{ _key_ }
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
    description:
      "Backend for Frontend: a dedicated backend per client type, each optimized for its consumer",
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

export const USER_CUSTOMER_TEMPLATES: DiagramTemplate[] = [
  {
    id: "product-user-journey",
    name: "User Journey",
    description:
      "Lifecycle stages a user passes through — from unaware to retained, with drop-off and re-entry paths",
    tags: ["product", "user", "journey", "lifecycle"],
    preferredView: "pipeline",
    code: `!group  id=goal  color=#4caf50
!group  id=risk  color=#f44336

Unaware||
Discovering||
Evaluating||
Onboarding||
Engaged||
Retained:goal||
Churned:risk||

Unaware|| --encounters--> Discovering||
Discovering|| --tries--> Evaluating||
Evaluating|| --signs_up--> Onboarding||
Onboarding|| --first_value--> Engaged||
Engaged|| --builds_habit--> Retained||
Engaged|| --drops_off--> Churned||
Retained|| --refers--> Unaware||`,
  },
  {
    id: "exec-onboarding-funnel",
    name: "Exec: User Onboarding Funnel",
    description:
      "Three user types flow through two gates — BounceRisk drops at signup, ChurnRisk churns after onboarding, Visitor reaches Active",
    tags: ["product", "execution", "user", "funnel", "onboarding"],
    preferredView: "timeline",
    code: `gen(
  Visitor{}
  BounceRisk{}
  ChurnRisk{}
)
LandingPage>>
SignupGate<BounceRisk{}>
Onboarding>>
EngagementCheck<ChurnRisk{}>
Active[]
Bounced[]
Churned[]

gen --> LandingPage
LandingPage --> SignupGate
SignupGate --yes--> Bounced
SignupGate --no--> Onboarding
Onboarding --> EngagementCheck
EngagementCheck --yes--> Churned
EngagementCheck --no--> Active`,
  },
  {
    id: "product-customer-funnel",
    name: "Customer Funnel",
    description:
      "Classic conversion funnel from first touch to advocacy — each stage is a condition the customer is in",
    tags: ["product", "marketing", "funnel", "conversion"],
    preferredView: "circular",
    code: `Awareness||
Interest||
Consideration||
Decision||
Retention||
Advocacy||

Awareness|| --> Interest||
Interest|| --> Consideration||
Consideration|| --> Decision||
Decision|| --> Retention||
Retention|| --> Advocacy||
Advocacy|| --word_of_mouth--> Awareness||`,
  },
  {
    id: "product-persona-map",
    name: "Persona Map",
    description:
      "Key user archetypes with their behaviours and primary needs — each persona connects to the outcome it optimises for",
    tags: ["product", "personas", "ux", "research"],
    preferredView: "pipeline",
    code: `PowerUser{
  daily_active
  keyboard_shortcuts()
  api_access()
  custom_workflows()
}
CasualUser{
  weekly_active
  templates()
  drag_drop()
}
Collaborator{
  sharing()
  commenting()
  team_spaces()
}
Admin{
  user_management()
  sso_setup()
  billing()
  audit_logs()
}

Speed||
Simplicity||
Teamwork||
Oversight||

PowerUser --> Speed||
CasualUser --> Simplicity||
Collaborator --> Teamwork||
Admin --> Oversight||
CasualUser ..> PowerUser
Collaborator --> CasualUser
Admin ..> Collaborator`,
  },
];

export const PLANNING_ROADMAP_TEMPLATES: DiagramTemplate[] = [
  {
    id: "exec-feature-pipeline",
    name: "Exec: Feature Delivery Pipeline",
    description:
      "Features go through QA before shipping; hotfixes are expedited straight to production via the review gate",
    tags: ["product", "execution", "pipeline", "delivery", "kanban"],
    preferredView: "timeline",
    code: `gen(
  Feature{}
  Hotfix{}
)
Backlog>>
Development>>
ReviewGate<Hotfix{}>
QATesting>>
Shipped[]
FastTracked[]

gen --> Backlog
Backlog --> Development
Development --> ReviewGate
ReviewGate --expedite--> FastTracked
ReviewGate --standard--> QATesting
QATesting --> Shipped`,
  },
  {
    id: "product-roadmap",
    name: "Feature Roadmap",
    description:
      "Now / Next / Later buckets group features by delivery horizon — dependencies link sequenced work",
    tags: ["product", "roadmap", "planning", "features"],
    preferredView: "pipeline",
    code: `!group  id=completed  color=#4caf50

Now{
  UserAuth:completed
  CoreEditor:completed
  BasicExport
}
Next{
  Collaboration
  AdvancedLayouts
  IntegrationAPI
}
Later{
  MobileApp
  EnterpriseSSO
  AIAssistant
}

Now --> Next
Next --> Later`,
  },
  {
    id: "product-okr-tree",
    name: "OKR Tree",
    description:
      "Annual mission cascades into objectives, each carrying measurable key results as children",
    tags: ["product", "okr", "goals", "planning"],
    preferredView: "circular",
    code: `AnnualMission

GrowAdoption{
  Reach_10k_MAU
  Trial_Conversion_5pct
  Churn_Below_2pct
}
ImproveExperience{
  NPS_Above_40
  Zero_P1_Bugs
  Load_Under_2s
}
DriveRevenue{
  MRR_50k
  Close_3_Enterprise
  Launch_Paid_Tier
}

AnnualMission --> GrowAdoption
AnnualMission --> ImproveExperience
AnnualMission --> DriveRevenue
GrowAdoption ..> ImproveExperience
ImproveExperience ..> DriveRevenue`,
  },
  {
    id: "product-story-map",
    name: "User Story Map",
    description:
      "Epics as top-level objects, each carrying its user stories as function children — dependency arrows show sequencing",
    tags: ["product", "stories", "backlog", "agile"],
    preferredView: "pipeline",
    code: `Authenticate{
  SignUpByEmail()
  LoginSocially()
  ResetPassword()
  Enable2FA()
}
Create{
  NewDiagram()
  UseTemplate()
  AddElements()
  UndoRedo()
}
Share{
  CopyShareLink()
  SetPermissions()
  ExportImage()
}
Collaborate{
  LeaveComment()
  RealtimeEditing()
  ViewHistory()
}

Authenticate --> Create
Create --> Share
Create --> Collaborate
Share --> Collaborate`,
  },
];

export const BUSINESS_PROCESS_TEMPLATES: DiagramTemplate[] = [
  {
    id: "exec-ticket-triage",
    name: "Exec: Support Ticket Triage",
    description:
      "Incoming tickets are classified at two gates — bugs go to the engineering queue, inquiries are resolved directly, feature requests land in the product backlog",
    tags: ["product", "execution", "support", "triage", "process"],
    preferredView: "timeline",
    code: `gen(
  BugReport{}
  FeatureRequest{}
  Inquiry{}
)
Inbox>>
Classify<BugReport{}>
CustomerSupport>>
QuickResolve<Inquiry{}>
BugQueue[]
Resolved[]
ProductBacklog[]

gen --> Inbox
Inbox --> Classify
Classify --yes--> BugQueue
Classify --no--> CustomerSupport
CustomerSupport --> QuickResolve
QuickResolve --yes--> Resolved
QuickResolve --no--> ProductBacklog`,
  },
  {
    id: "product-service-blueprint",
    name: "Service Blueprint",
    description:
      "Four horizontal lanes — customer actions, frontstage UI, backstage processes, and supporting systems — reveal where service breaks down",
    tags: ["product", "service-design", "process", "ux"],
    preferredView: "pipeline",
    code: `CustomerActions{
  SearchProduct()
  SelectOption()
  Checkout()
  TrackOrder()
}
FrontstageInteractions{
  ProductListing
  ConfiguratorUI
  PaymentPage
  TrackingPage
}
BackstageProcesses{
  InventoryCheck()
  FraudDetection()
  OrderFulfillment()
  ShipmentUpdate()
}
SupportingSystems{
  InventoryDB
  PaymentGateway
  FulfillmentService
  NotificationService
}

CustomerActions --> FrontstageInteractions
FrontstageInteractions --> BackstageProcesses
BackstageProcesses --> SupportingSystems`,
  },
  {
    id: "product-decision-flow",
    name: "Opportunity Decision Flow",
    description:
      "Three gates — viable, desirable, feasible — route an opportunity to approval or a named holding state",
    tags: ["product", "decision", "prioritisation", "process"],
    preferredView: "hierarchical",
    code: `Opportunity

Viable<>
Desirable<>
Feasible<>

Approved{
  LaunchPlan()
  Stakeholders
  Timeline
}
Deprioritised||
Backlogged||
Deferred||

Opportunity --> Viable
Viable --yes--> Desirable
Viable --no--> Deprioritised||
Desirable --yes--> Feasible
Desirable --no--> Backlogged||
Feasible --yes--> Approved
Feasible --no--> Deferred||`,
  },
];

export const DIAGRAVINCI_TEMPLATES: DiagramTemplate[] = [
  {
    id: "dv-diagram-use-cases",
    name: "Diagram Use Cases",
    description:
      "Why diagrams matter — four arms (Communicate, Understand, Document, Design) each unfolding into real scenarios and the DigraVinci feature that answers them",
    tags: ["diagravinci", "overview", "use-cases", "snowflake"],
    preferredView: "radial",
    code: `# Radial layout recommended — center: Diagrams
# Ring 1: why   Ring 2: when   Ring 3: DigraVinci answer

!group  id=communicate  regex=Communicate|team_alignment|stakeholder_pitch|PR_review|incident_postmortem|cross_team_handoff|named_sessions|audience_views|git_diffable_dg|session_chapters|live_link_sharing  color=#22c55e
!group  id=understand   regex=Understand|architecture_map|onboarding|debugging|code_review|dependency_tracing|canvas|filter_and_dim|execution_engine|fold_to_depth|highlight_flows  color=#f97316
!group  id=document     regex=Document|living_docs|API_contracts|version_history|design_decisions|runbooks|PNG_export|dg_syntax|visual_diff|dg_in_pr|template_snapshots            color=#f472b6
!group  id=design       regex=Design|system_design|data_modeling|user_flows|API_design|event_modeling|AI_generation|class_diagram_mode|flow_animation|AI_gap_finder|token_simulation  color=#fbbf24

!session  id=overview  label=Overview    groups=communicate:color,understand:color,document:color,design:color
!session  id=comm      label=Communicate groups=communicate:dim
!session  id=und       label=Understand  groups=understand:dim
!session  id=doc       label=Document    groups=document:dim
!session  id=des       label=Design      groups=design:dim

Diagrams{}

# Ring 1 — why diagrams
Communicate{}
Understand{}
Document{}
Design{}

# Ring 2 — specific scenarios
team_alignment||
stakeholder_pitch||
PR_review||
incident_postmortem||
cross_team_handoff||

architecture_map||
onboarding||
debugging||
code_review||
dependency_tracing||

living_docs||
API_contracts||
version_history||
design_decisions||
runbooks||

system_design||
data_modeling||
user_flows||
API_design||
event_modeling||

# Ring 3 — DigraVinci answers
named_sessions{}
audience_views{}
git_diffable_dg{}
session_chapters{}
live_link_sharing{}

canvas{}
filter_and_dim{}
execution_engine{}
fold_to_depth{}
highlight_flows{}

PNG_export{}
dg_syntax{}
visual_diff{}
dg_in_pr{}
template_snapshots{}

AI_generation{}
class_diagram_mode{}
flow_animation{}
AI_gap_finder{}
token_simulation{}

# Relationships
Diagrams --> Communicate
Diagrams --> Understand
Diagrams --> Document
Diagrams --> Design

Communicate --> team_alignment
Communicate --> stakeholder_pitch
Communicate --> PR_review
Communicate --> incident_postmortem
Communicate --> cross_team_handoff

Understand --> architecture_map
Understand --> onboarding
Understand --> debugging
Understand --> code_review
Understand --> dependency_tracing

Document --> living_docs
Document --> API_contracts
Document --> version_history
Document --> design_decisions
Document --> runbooks

Design --> system_design
Design --> data_modeling
Design --> user_flows
Design --> API_design
Design --> event_modeling

team_alignment --> named_sessions
stakeholder_pitch --> audience_views
PR_review --> git_diffable_dg
incident_postmortem --> session_chapters
cross_team_handoff --> live_link_sharing

architecture_map --> canvas
onboarding --> filter_and_dim
debugging --> execution_engine
code_review --> fold_to_depth
dependency_tracing --> highlight_flows

living_docs --> PNG_export
API_contracts --> dg_syntax
version_history --> visual_diff
design_decisions --> dg_in_pr
runbooks --> template_snapshots

system_design --> AI_generation
data_modeling --> class_diagram_mode
user_flows --> flow_animation
API_design --> AI_gap_finder
event_modeling --> token_simulation`,
  },
  {
    id: "dv-diagravinci-features",
    name: "DigraVinci Features",
    description:
      "Four input modes (Canvas, Code, AI, Templates) each branching into feature areas and concrete capabilities — a complete feature map of the tool",
    tags: ["diagravinci", "features", "overview", "snowflake"],
    preferredView: "radial",
    code: `# Radial layout recommended — center: DigraVinci
# Ring 1: input modes   Ring 2: features per mode   Ring 3: specific capabilities

!group  id=canvas     regex=Canvas|spatial_editing|nesting_hierarchy|class_mode|visual_diff_view|drag_connect_nest|arrange|fold_depth|schema_view|diff_highlights|direct_manipulation  color=#6366f1
!group  id=code       regex=Code|six_element_types|labeled_relationships|selectors_and_sessions|nesting_and_scope|flags_and_tags|six_types|named_edges|audience_sessions|dot_notation_refs|flag_targeting  color=#22c55e
!group  id=ai         regex=AI|describe_to_diagram|targeted_additions|AI_analysis|AI_consistency_check|diagram_explanation|natural_language|grow_existing|gap_finder|architecture_review|plain_english_tour  color=#f472b6
!group  id=templates  regex=Templates|architecture_patterns|saved_diagrams|blank_start|collection_browsing|snapshot_compare|patterns|prior_baseline|instant_structure|curated_libraries|version_diff          color=#fbbf24

!session  id=overview  label=Overview   groups=canvas:color,code:color,ai:color,templates:color
!session  id=canvas_s  label=Canvas     groups=canvas:dim
!session  id=code_s    label=Code       groups=code:dim
!session  id=ai_s      label=AI         groups=ai:dim
!session  id=tmpl_s    label=Templates  groups=templates:dim

DigraVinci{}

# Ring 1 — input modes
Canvas{}
Code{}
AI{}
Templates{}

# Ring 2 — Canvas
spatial_editing{}
nesting_hierarchy{}
class_mode{}
visual_diff_view{}
drag_connect_nest{}

# Ring 2 — Code
six_element_types{}
labeled_relationships{}
selectors_and_sessions{}
nesting_and_scope{}
flags_and_tags{}

# Ring 2 — AI
describe_to_diagram{}
targeted_additions{}
AI_analysis{}
AI_consistency_check{}
diagram_explanation{}

# Ring 2 — Templates
architecture_patterns{}
saved_diagrams{}
blank_start{}
collection_browsing{}
snapshot_compare{}

# Ring 3 — Canvas specifics
arrange{}
fold_depth{}
schema_view{}
diff_highlights{}
direct_manipulation{}

# Ring 3 — Code specifics
six_types{}
named_edges{}
audience_sessions{}
dot_notation_refs{}
flag_targeting{}

# Ring 3 — AI specifics
natural_language{}
grow_existing{}
gap_finder{}
architecture_review{}
plain_english_tour{}

# Ring 3 — Template specifics
patterns{}
prior_baseline{}
instant_structure{}
curated_libraries{}
version_diff{}

# Relationships
DigraVinci --> Canvas
DigraVinci --> Code
DigraVinci --> AI
DigraVinci --> Templates

Canvas --> spatial_editing
Canvas --> nesting_hierarchy
Canvas --> class_mode
Canvas --> visual_diff_view
Canvas --> drag_connect_nest

Code --> six_element_types
Code --> labeled_relationships
Code --> selectors_and_sessions
Code --> nesting_and_scope
Code --> flags_and_tags

AI --> describe_to_diagram
AI --> targeted_additions
AI --> AI_analysis
AI --> AI_consistency_check
AI --> diagram_explanation

Templates --> architecture_patterns
Templates --> saved_diagrams
Templates --> blank_start
Templates --> collection_browsing
Templates --> snapshot_compare

spatial_editing --> arrange
nesting_hierarchy --> fold_depth
class_mode --> schema_view
visual_diff_view --> diff_highlights
drag_connect_nest --> direct_manipulation

six_element_types --> six_types
labeled_relationships --> named_edges
selectors_and_sessions --> audience_sessions
nesting_and_scope --> dot_notation_refs
flags_and_tags --> flag_targeting

describe_to_diagram --> natural_language
targeted_additions --> grow_existing
AI_analysis --> gap_finder
AI_consistency_check --> architecture_review
diagram_explanation --> plain_english_tour

architecture_patterns --> patterns
saved_diagrams --> prior_baseline
blank_start --> instant_structure
collection_browsing --> curated_libraries
snapshot_compare --> version_diff`,
  },
  {
    id: "dv-framework-cycle",
    name: "Framework: Sketch → Deepen → Showcase → Evolve",
    description:
      "The four-stage DigraVinci workflow — each stage with its tools and sub-features; sessions highlight one stage at a time",
    tags: ["diagravinci", "framework", "workflow"],
    preferredView: "circular",
    code: `# Circular layout recommended
# Sessions walk one stage at a time; Evolve → Sketch closes the loop
# Fold to depth 2 for overview; unfold specific nodes for detail

!group  id=sketch_stage    regex=.*Sketch    color=#6366f1
!group  id=deepen_stage    regex=.*Deepen    color=#22c55e
!group  id=showcase_stage  regex=.*Showcase  color=#f97316
!group  id=evolve_stage    regex=.*Evolve    color=#f472b6

!session  id=overview    label=Overview   groups=sketch_stage:color,deepen_stage:color,showcase_stage:color,evolve_stage:color
!session  id=sketch_s    label=Sketch     groups=sketch_stage:color
!session  id=deepen_s    label=Deepen     groups=deepen_stage:color
!session  id=showcase_s  label=Showcase   groups=showcase_stage:color
!session  id=evolve_s    label=Evolve     groups=evolve_stage:color

Sketch{
  Canvas{
    drag_connect_nest{}
    class_diagram_mode{}
  }
  Code{
    six_element_types{
      Object{}
      Collection[]
      State||
      Function()
      Flow>>
      Choice<>
    }
    six_relationship_types{
      association{}
      data_flow{}
      inheritance{}
      realization{}
      aggregation{}
      composition{}
    }
    labels{}
    nesting{}
    dot_notation{}
    flags{}
  }
  AI{
    describe_to_diagram{}
    targeted_additions{}
  }
  Templates{
    Layered_Architecture{}
    Microservices{}
    Capstone_App{}
    User_Journey{}
    saved_diagrams{}
  }
}

Deepen{
  completeness{
    subsystems_and_services{}
    interfaces_and_abstractions{}
    lifecycle_stages||
    pipeline_boundaries>>
    decision_points<>
  }
  relationships{
    label_every_edge{}
    structural_dependency{}
    data_and_exec_flow{}
    ownership_relationships{}
    dependency_direction{}
  }
  navigation{
    fold_to_depth{}
    selective_unfold{}
    dot_notation{}
  }
  AI_deepening{
    suggest_missing{}
    suggest_connections{}
    evaluate_consistency{}
  }
}

Showcase{
  filter{
    selectors{
      by_name{}
      by_type{}
      by_level{}
      by_flag{}
    }
    modes{
      color_mode{}
      dim_mode{}
      hide_mode{}
      stacked{}
    }
    sessions{
      named_presets{}
      audience_views{}
      one_click_switch{}
    }
  }
  navigate{
    labeled_edge_narration{}
    edge_step_through{}
    keyboard_shortcuts{}
  }
  animate{
    token_simulation{}
    execution_behaviors{
      objects_upsert{}
      collections_accumulate{}
      functions_route{}
      choices_branch{}
    }
    special_functions{
      gen()
      round_robin()
      duplicator()
      throttler()
    }
  }
  export{
    PNG_export{}
    live_link{}
    AI_on_demand{}
  }
}

Evolve{
  Templates{
    save_snapshot{}
    load_snapshot{}
    future_variant{}
  }
  Canvas{
    add_remove_elements{}
    visual_diff{}
  }
  Code{
    intent_flags{}
    sessions_for_changes{}
    git_backed_dg{}
    pr_reviewable{}
  }
  AI{
    suggest_new_features{}
    identify_gaps{}
    describe_future_state{}
  }
}

Sketch --> Deepen
Deepen --> Showcase
Showcase --> Evolve
Evolve --> Sketch`,
  },
  {
    id: "dv-architecture-core",
    name: "Architecture: Core Sync Flow",
    description:
      "The bidirectional sync between CodeEditor and VisualCanvas — CD flow (code → model) and VIS flow (canvas → code) highlighted by session",
    tags: ["diagravinci", "architecture", "internals"],
    preferredView: "circular",
    code: `!group  id=cd_flow  color=#22c55e  regex=(gen_code|syncFromCode|tokenize|parse|diagramSlice|render)..$
!group  id=vis_flow  color=#f97316  regex=(gen_vis|syncFromVis|generate|diagramSlice|output)..$
!group  id=selection_default color=#3773d5
!session  id=default   label=Default    groups=cd_flow:color,vis_flow:color,selection_default:color
!session  id=cd_view   label="CD Flow"  groups=cd_flow:dim,vis_flow:color,selection_default:color
!session  id=vis_view  label="VIS Flow" groups=vis_flow:dim,cd_flow:color,selection_default:color

PresentationLayer{
  CodeEditor{
    MonacoEditor{
      output()
      gen_code(
        change{}
      )
    }
    Store{
      uiSlice{
        updateUI()
      }
      diagramSlice{
        updateDiagram()
        route<
          code{}
        >
      }
    }
    SyncManager{
      Parser{
        parse(
          code{}
        )
        anon_5>
          DiagramModel{
            elements{}
            relationships{}
            metadata{}
          }
        >
      }
      Lexer{
        tokenize(
          code{}
        )
        anon_2>
          token[]
        >
      }
      CodeGenerator{
        generate(
          model{}
        )
        anon_8>
          code{}
        >
      }
      Store{}
      syncFromCode(
        tokenize()
        parse()
        anon_5>>
        anon_2>>
      )
      syncFromVis(
        generate()
        anon_9>
          code{}
        >
      )
    }
  }
  VisualCanvas{
    Store{}
    SyncManager{}
    DiagramLayerRenderer{
      _gen_vis(
        event{}
      )
    }
    KonvaCanvas{
      render()
    }
  }
}
ApplicationLayer{
  Store{}
  SyncManager{}
}
DomainLayer{
  DiagramModel{}
  ViewState{
    positionedElements{}
    positionedRelationships{}
  }
}
InfrastructureLayer{
  Lexer{}
  Parser{}
  CodeGenerator{}
}

PresentationLayer.CodeEditor.SyncManager.Parser.parse ..> PresentationLayer.CodeEditor.SyncManager.Parser.anon_5
PresentationLayer.CodeEditor.SyncManager.Parser.anon_5 ..> _
PresentationLayer.CodeEditor.SyncManager.Lexer.tokenize ..> PresentationLayer.CodeEditor.SyncManager.Lexer.anon_2
PresentationLayer.CodeEditor.SyncManager.Lexer.anon_2 ..> _
PresentationLayer.CodeEditor.SyncManager.CodeGenerator.generate ..> PresentationLayer.CodeEditor.SyncManager.CodeGenerator.anon_8
PresentationLayer.CodeEditor.SyncManager.CodeGenerator.anon_8 ..> _
PresentationLayer.CodeEditor.SyncManager.syncFromCode.parse ..> PresentationLayer.CodeEditor.SyncManager.syncFromCode.anon_5
PresentationLayer.CodeEditor.SyncManager.syncFromCode.anon_5 ..> anon_2
PresentationLayer.CodeEditor.SyncManager.syncFromCode.anon_2 ..> _
PresentationLayer.CodeEditor.SyncManager.syncFromVis.generate ..> PresentationLayer.CodeEditor.SyncManager.syncFromVis.anon_9
PresentationLayer.CodeEditor.SyncManager.syncFromVis.anon_9 ..> _
InfrastructureLayer.Lexer.tokenize ..> InfrastructureLayer.Lexer.anon_2
InfrastructureLayer.Lexer.anon_2 ..> _
InfrastructureLayer.Parser.parse ..> InfrastructureLayer.Parser.anon_5
InfrastructureLayer.Parser.anon_5 ..> _
InfrastructureLayer.CodeGenerator.generate ..> InfrastructureLayer.CodeGenerator.anon_8
InfrastructureLayer.CodeGenerator.anon_8 ..> _
Store.diagramSlice --> DiagramModel
Store.diagramSlice --> ViewState
ApplicationLayer.SyncManager --> DiagramModel
ApplicationLayer.SyncManager --> ViewState
ApplicationLayer.SyncManager.syncFromCode ..> ApplicationLayer.Store.diagramSlice.updateDiagram
ApplicationLayer.Store.diagramSlice.updateDiagram ..> ApplicationLayer.Store.diagramSlice.route
ApplicationLayer.Store.diagramSlice.route --code..> PresentationLayer.CodeEditor.MonacoEditor.output
ApplicationLayer.Store.diagramSlice.route --model..> PresentationLayer.VisualCanvas.KonvaCanvas.render
PresentationLayer.VisualCanvas.DiagramLayerRenderer._gen_vis ..> ApplicationLayer.SyncManager.syncFromVis
ApplicationLayer.SyncManager.syncFromCode.tokenize ..> ApplicationLayer.SyncManager.syncFromCode.anon_2
ApplicationLayer.SyncManager.syncFromCode.anon_2 ..> ApplicationLayer.SyncManager.syncFromCode.parse
ApplicationLayer.SyncManager.syncFromCode.parse ..> ApplicationLayer.SyncManager.syncFromCode.anon_5
ApplicationLayer.SyncManager.syncFromVis.generate ..> ApplicationLayer.SyncManager.syncFromVis.anon_9
ApplicationLayer.SyncManager.syncFromVis ..> ApplicationLayer.Store.diagramSlice.updateDiagram
PresentationLayer.CodeEditor.MonacoEditor.gen_code ..> ApplicationLayer.SyncManager.syncFromCode`,
  },
  //   {
  //     id: "dv-architecture-current",
  //     name: "Architecture: Full System",
  //     description:
  //       "Complete DigraVinci architecture — all flows (CD, VIS, AI, Execution, Filter, Persistence, Tab sync) with sessions for each; abstractions session hides layout implementations",
  //     tags: ["diagravinci", "architecture", "internals", "full"],
  //     preferredView: "circular",
  //     code: `!rule  id=cd  all_name=gen_code|syncFromCode|tokenize|parse|diagramSlice|render
  // !rule  id=vis  all_name=gen_vis|syncFromVis|generate|diagramSlice|output
  // !rule  id=ai  all_name=AIPanel|AIOrchestrator|PromptBuilder|GeminiService|ResponseValidator|syncFromAI
  // !rule  id=exec  all_name=ExecutionEngine|tick|TokenScheduler|spawnTokens|advanceTokens|executionSlice|ExecuteLayout
  // !rule  id=persist  all_name=diagramSlice|filterSlice|IndexedDB|LocalStorage
  // !rule  id=filter_fl  all_name=SelectorModal|filterSlice|FilterResolver|SelectorEvaluator
  // !rule  id=tab  all_name=TabSyncManager|broadcast|onMessage|diagramSlice
  // !rule  id=layout_impls  all_name=HierarchicalLayout|CircularLayout|RadialLayout|TimelineLayout|PipelineLayout|ExecuteLayout|ForceDirectedLayout|ManualLayout
  // !rule  id=layout_inh  all_name=HierarchicalLayout|CircularLayout|RadialLayout|TimelineLayout|PipelineLayout|ExecuteLayout|ForceDirectedLayout|ManualLayout|BaseLayout
  // !rule  id=deep  all_level=4-10
  // !selector  name=CD_Flow  color=#22c55e  expression=cd
  // !selector  name=VIS_Flow  color=#f97316  expression=vis
  // !selector  name=AI_Flow  color=#f472b6  expression=ai
  // !selector  name=Exec_Flow  color=#fbbf24  expression=exec
  // !selector  name=Persistence  color=#a78bfa  expression=persist
  // !selector  name=Filter_Flow  color=#34d399  expression=filter_fl
  // !selector  name=Tab_Flow  color=#60a5fa  expression=tab
  // !selector  name=Layout_Impls  color=#fb923c  expression=layout_impls
  // !selector  name=No_Layout_Impls  color=#888888  expression=-layout_inh
  // !selector  name=Overview  color=#888888  expression=-deep
  // !selector  name=Selection_default  color=#3773d5
  // !session  id=default  label=Default  groups=cd_flow:color,vis_flow:color,selection_default:color
  // !session  id=cd_view  label="CD Flow"  groups=cd_flow:dim,vis_flow:color,selection_default:color
  // !session  id=vis_view  label="VIS Flow"  groups=vis_flow:dim,cd_flow:color,selection_default:color
  // !session  id=ai_view  label="AI Flow"  groups=ai_flow:color
  // !session  id=exec_view  label=Execution  groups=exec_flow:color
  // !session  id=all_flows  label="All Flows"  groups=cd_flow:color,vis_flow:color,ai_flow:color,exec_flow:color,persistence:color,filter_flow:color,tab_flow:color
  // !session  id=abstractions  label=Abstractions  groups=no_layout_impls:hide,overview:dim

  // PresentationLayer{
  //   CodeEditor{
  //     MonacoEditor{
  //       output()
  //       gen_code(
  //         change{}
  //       )
  //     }
  //     Store{
  //       uiSlice{
  //         updateUI()
  //         interactionMode||
  //         selectedElementIds[]
  //         renderStyle||
  //         relLineStyle||
  //         classDiagramMode||
  //       }
  //       diagramSlice{
  //         updateDiagram()
  //         route<
  //           code{}
  //         >
  //       }
  //       filterSlice{
  //         selectors[]
  //         foldLevel||
  //         manuallyFolded[]
  //         manuallyUnfolded[]
  //       }
  //       historySlice{
  //         past[]
  //         future[]
  //       }
  //       diffSlice{
  //         active||
  //         addedIds[]
  //         removedIds[]
  //       }
  //       executionSlice{
  //         status||
  //         tickCount{}
  //         instances[]
  //         tickIntervalMs{}
  //       }
  //       themeSlice{
  //         theme||
  //       }
  //     }
  //     SyncManager{
  //       Parser{
  //         parse(
  //           code{}
  //         )
  //         anon_5>
  //           DiagramModel{
  //             elements{}
  //             relationships{}
  //             metadata{}
  //           }
  //         >
  //       }
  //       Lexer{
  //         tokenize(
  //           code{}
  //         )
  //         anon_2>
  //           token[]
  //         >
  //       }
  //       CodeGenerator{
  //         generate(
  //           model{}
  //         )
  //         anon_8>
  //           code{}
  //         >
  //       }
  //       Store{}
  //       syncFromCode(
  //         tokenize()
  //         parse()
  //         anon_5>>
  //         anon_2>>
  //       )
  //       syncFromVis(
  //         generate()
  //         anon_9>
  //           code{}
  //         >
  //       )
  //       syncFromAI()
  //     }
  //   }
  //   VisualCanvas{
  //     Store{}
  //     SyncManager{}
  //     DiagramLayerRenderer{
  //       _gen_vis(
  //         event{}
  //       )
  //     }
  //     KonvaCanvas{
  //       render()
  //     }
  //   }
  //   ToolBar{}
  //   AIPanel{
  //     ApiKeySetup{}
  //   }
  //   SelectorModal{
  //     SelectorEditor{}
  //   }
  //   TemplatePanel{}
  //   PropertiesPanel{}
  //   SelectedPanel{}
  //   AppSettingsPanel{}
  //   CanvasControls{}
  //   HelpModal{}
  //   hooks{
  //     useUndoRedo()
  //     useKeyboardShortcuts()
  //     useExecution()
  //   }
  // }
  // ApplicationLayer{
  //   SyncManager{}
  //   Store{}
  //   AIOrchestrator{
  //     generateDiagram()
  //     analyzeBugs()
  //     getSuggestions()
  //   }
  //   TabSyncManager{
  //     broadcast()
  //     onMessage()
  //   }
  //   ExecutionEngine{
  //     tick()
  //     reset()
  //     TokenScheduler{
  //       spawnTokens()
  //       advanceTokens()
  //     }
  //     SpecialFunctions{
  //       gen()
  //       round_robin()
  //       multiplier()
  //       duplicator()
  //       deduplicator()
  //       connector()
  //       disconnector()
  //       throttler()
  //     }
  //   }
  //   ForceSimulationService{}
  // }
  // DomainLayer{
  //   DiagramModel{}
  //   ViewState{
  //     positionedElements{}
  //     positionedRelationships{}
  //   }
  //   Element{
  //     id{}
  //     name{}
  //     type||
  //     children[]
  //     properties[]
  //   }
  //   Relationship{
  //     source{}
  //     target{}
  //     type||
  //     label{}
  //   }
  //   Selector{
  //     rules[]
  //     combiners[]
  //     mode||
  //   }
  //   DiagramTemplate{}
  //   TemplateCollection{}
  //   Layouts{
  //     LayoutAlgorithm{}
  //     LayoutRegistry{}
  //     LayoutUtils{}
  //     BaseLayout{}
  //     HierarchicalLayout{}
  //     CircularLayout{}
  //     RadialLayout{}
  //     TimelineLayout{}
  //     PipelineLayout{}
  //     ExecuteLayout{}
  //     ForceDirectedLayout{}
  //     ManualLayout{}
  //   }
  //   Sync{
  //     FilterResolver{
  //       resolve()
  //     }
  //     ModelDiffer{
  //       computeDiff()
  //     }
  //     ViewStateMerger{
  //       merge()
  //     }
  //   }
  //   SelectorEvaluator{
  //     evaluate()
  //     matchByName()
  //     matchByPath()
  //     matchByLevel()
  //   }
  //   SelectorPresets{}
  //   ValidationRules{}
  // }
  // InfrastructureLayer{
  //   Lexer{}
  //   Parser{}
  //   CodeGenerator{}
  //   AIServices{
  //     GeminiService{
  //       generate()
  //       analyzeCode()
  //     }
  //     PromptBuilder{
  //       buildGeneratePrompt()
  //       buildAnalysisPrompt()
  //     }
  //     ResponseValidator{
  //       validate()
  //       extractCode()
  //     }
  //     apiKeyStorage{}
  //   }
  //   Persistence{
  //     IndexedDB{}
  //     LocalStorage{}
  //     ExportSvg{}
  //     CollectionRepository{}
  //     CollectionZip{}
  //   }
  // }

  // PresentationLayer.CodeEditor.SyncManager.Parser.parse ..> PresentationLayer.CodeEditor.SyncManager.Parser.anon_5
  // PresentationLayer.CodeEditor.SyncManager.Parser.anon_5 ..> _
  // PresentationLayer.CodeEditor.SyncManager.Lexer.tokenize ..> PresentationLayer.CodeEditor.SyncManager.Lexer.anon_2
  // PresentationLayer.CodeEditor.SyncManager.Lexer.anon_2 ..> _
  // PresentationLayer.CodeEditor.SyncManager.CodeGenerator.generate ..> PresentationLayer.CodeEditor.SyncManager.CodeGenerator.anon_8
  // PresentationLayer.CodeEditor.SyncManager.CodeGenerator.anon_8 ..> _
  // PresentationLayer.CodeEditor.SyncManager.syncFromCode.parse ..> PresentationLayer.CodeEditor.SyncManager.syncFromCode.anon_5
  // PresentationLayer.CodeEditor.SyncManager.syncFromCode.anon_5 ..> anon_2
  // PresentationLayer.CodeEditor.SyncManager.syncFromCode.anon_2 ..> _
  // PresentationLayer.CodeEditor.SyncManager.syncFromVis.generate ..> PresentationLayer.CodeEditor.SyncManager.syncFromVis.anon_9
  // PresentationLayer.CodeEditor.SyncManager.syncFromVis.anon_9 ..> _
  // ApplicationLayer.SyncManager.syncFromCode.parse ..> ApplicationLayer.SyncManager.syncFromCode.anon_5
  // ApplicationLayer.SyncManager.syncFromCode.anon_2 ..> _
  // ApplicationLayer.SyncManager.syncFromVis.generate ..> ApplicationLayer.SyncManager.syncFromVis.anon_9
  // ApplicationLayer.SyncManager.syncFromVis.anon_9 ..> _
  // InfrastructureLayer.Lexer.tokenize ..> InfrastructureLayer.Lexer.anon_2
  // InfrastructureLayer.Lexer.anon_2 ..> _
  // InfrastructureLayer.Parser.parse ..> InfrastructureLayer.Parser.anon_5
  // InfrastructureLayer.Parser.anon_5 ..> _
  // InfrastructureLayer.CodeGenerator.generate ..> InfrastructureLayer.CodeGenerator.anon_8
  // InfrastructureLayer.CodeGenerator.anon_8 ..> _
  // Store.diagramSlice --> DiagramModel
  // Store.diagramSlice --> ViewState
  // ApplicationLayer.SyncManager --> DiagramModel
  // ApplicationLayer.SyncManager --> ViewState
  // ApplicationLayer.SyncManager.syncFromCode ..> ApplicationLayer.Store.diagramSlice.updateDiagram
  // ApplicationLayer.Store.diagramSlice.updateDiagram ..> ApplicationLayer.Store.diagramSlice.route
  // ApplicationLayer.Store.diagramSlice.route --code..> PresentationLayer.CodeEditor.MonacoEditor.output
  // ApplicationLayer.Store.diagramSlice.route --model..> PresentationLayer.VisualCanvas.KonvaCanvas.render
  // PresentationLayer.VisualCanvas.DiagramLayerRenderer._gen_vis ..> ApplicationLayer.SyncManager.syncFromVis
  // ApplicationLayer.SyncManager.syncFromCode.tokenize ..> ApplicationLayer.SyncManager.syncFromCode.anon_2
  // ApplicationLayer.SyncManager.syncFromCode.anon_2 ..> ApplicationLayer.SyncManager.syncFromCode.parse
  // ApplicationLayer.SyncManager.syncFromVis ..> ApplicationLayer.Store.diagramSlice.updateDiagram
  // PresentationLayer.CodeEditor.MonacoEditor.gen_code ..> ApplicationLayer.SyncManager.syncFromCode
  // PresentationLayer.AIPanel ..> ApplicationLayer.AIOrchestrator.generateDiagram
  // ApplicationLayer.AIOrchestrator.generateDiagram ..> InfrastructureLayer.AIServices.PromptBuilder.buildGeneratePrompt
  // InfrastructureLayer.AIServices.PromptBuilder.buildGeneratePrompt ..> InfrastructureLayer.AIServices.GeminiService.generate
  // InfrastructureLayer.AIServices.GeminiService.generate ..> InfrastructureLayer.AIServices.ResponseValidator.validate
  // InfrastructureLayer.AIServices.ResponseValidator.validate ..> ApplicationLayer.SyncManager.syncFromAI
  // ApplicationLayer.SyncManager.syncFromAI ..> ApplicationLayer.Store.diagramSlice.updateDiagram
  // PresentationLayer.ToolBar --play--> ApplicationLayer.ExecutionEngine
  // ApplicationLayer.ExecutionEngine.tick ..> ApplicationLayer.ExecutionEngine.TokenScheduler.spawnTokens
  // ApplicationLayer.ExecutionEngine.TokenScheduler.spawnTokens ..> ApplicationLayer.ExecutionEngine.TokenScheduler.advanceTokens
  // ApplicationLayer.ExecutionEngine.TokenScheduler.advanceTokens ..> ApplicationLayer.Store.executionSlice.instances
  // ApplicationLayer.Store.executionSlice.instances ..> DomainLayer.Layouts.ExecuteLayout
  // DomainLayer.Layouts.ExecuteLayout ..> PresentationLayer.VisualCanvas
  // PresentationLayer.SelectorModal --apply--> ApplicationLayer.Store.filterSlice
  // ApplicationLayer.Store.filterSlice ..> DomainLayer.Sync.FilterResolver.resolve
  // DomainLayer.Sync.FilterResolver.resolve ..> DomainLayer.SelectorEvaluator.evaluate
  // DomainLayer.Sync.FilterResolver.resolve ..> PresentationLayer.VisualCanvas
  // ApplicationLayer.TabSyncManager.broadcast ..> ApplicationLayer.Store.diagramSlice
  // ApplicationLayer.Store.diagramSlice ..> ApplicationLayer.TabSyncManager.onMessage
  // ApplicationLayer.Store.diagramSlice --save--> InfrastructureLayer.Persistence.IndexedDB
  // InfrastructureLayer.Persistence.IndexedDB --load--> ApplicationLayer.Store.diagramSlice
  // ApplicationLayer.Store.filterSlice --save--> InfrastructureLayer.Persistence.LocalStorage
  // DomainLayer.Layouts.HierarchicalLayout --|> DomainLayer.Layouts.BaseLayout
  // DomainLayer.Layouts.CircularLayout --|> DomainLayer.Layouts.BaseLayout
  // DomainLayer.Layouts.RadialLayout --|> DomainLayer.Layouts.BaseLayout
  // DomainLayer.Layouts.TimelineLayout --|> DomainLayer.Layouts.BaseLayout
  // DomainLayer.Layouts.PipelineLayout --|> DomainLayer.Layouts.BaseLayout
  // DomainLayer.Layouts.ExecuteLayout --|> DomainLayer.Layouts.BaseLayout
  // DomainLayer.Layouts.ForceDirectedLayout --|> DomainLayer.Layouts.BaseLayout
  // DomainLayer.Layouts.ManualLayout --|> DomainLayer.Layouts.BaseLayout`,
  //   },
];

export const BUILT_IN_TEMPLATES: DiagramTemplate[] = [
  ICON_SHOWCASE_TEMPLATE,
  ALL_REL_TYPES_TEMPLATE,
  ALL_ELEMENT_TYPES_TEMPLATE,
  WIDE_FANOUT_TEMPLATE,
  ...SELECTOR_SHOWCASE_TEMPLATES,
  ...EXECUTION_TEMPLATES,
  ...STRESS_TEMPLATES,
  ...SOLID_SRP_TEMPLATES,
  ...SOLID_OCP_TEMPLATES,
  ...SOLID_LSP_TEMPLATES,
  ...SOLID_ISP_TEMPLATES,
  ...SOLID_DIP_TEMPLATES,
  ...CREATIONAL_PATTERN_TEMPLATES,
  ...STRUCTURAL_PATTERN_TEMPLATES,
  ...BEHAVIORAL_PATTERN_TEMPLATES,
  ...APP_ARCH_TEMPLATES,
  ...SYSTEM_ARCH_TEMPLATES,
  ...USER_CUSTOMER_TEMPLATES,
  ...PLANNING_ROADMAP_TEMPLATES,
  ...BUSINESS_PROCESS_TEMPLATES,
  ...DIAGRAVINCI_TEMPLATES,
];
