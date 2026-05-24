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
    code: `!rule  id=root  all_level=1
!rule  id=impls  object_name=.+Notification
!selector  name=interface  color=#451c82  mode=color  expression="-impls & root"
!selector  name=implementations  color=#7b47c7  mode=color  expression=impls

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
    code: `!selector  name=interface  color=#451c82  mode=color
!selector  name=impl       color=#7b47c7  mode=color

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
    code: `!selector  name=interface  color=#451c82  mode=color
!selector  name=impl       color=#7b47c7  mode=color

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
    code: `!selector  name=interface  color=#451c82  mode=color
!selector  name=impl       color=#7b47c7  mode=color

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
    code: `!selector  name=interface  color=#451c82  mode=color
!selector  name=impl       color=#7b47c7  mode=color

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
    code: `!selector  name=interface  color=#451c82  mode=color
!selector  name=impl       color=#7b47c7  mode=color

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
    code: `!selector  name=interface  color=#451c82  mode=color
!selector  name=impl       color=#7b47c7  mode=color

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
    code: `!selector  name=interface  color=#451c82  mode=color
!selector  name=impl       color=#7b47c7  mode=color

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
    code: `!selector  name=interface  color=#451c82  mode=color
!selector  name=impl       color=#7b47c7  mode=color

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
    code: `!selector  name=interface  color=#451c82  mode=color
!selector  name=impl       color=#7b47c7  mode=color

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
    code: `!selector  name=interface  color=#451c82  mode=color
!selector  name=impl       color=#7b47c7  mode=color

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
    code: `!selector  name=interface  color=#451c82  mode=color
!selector  name=impl       color=#7b47c7  mode=color

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
    code: `!selector  name=interface  color=#451c82  mode=color
!selector  name=impl       color=#7b47c7  mode=color

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
    code: `!selector  name=interface  color=#451c82  mode=color
!selector  name=impl       color=#7b47c7  mode=color

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
    code: `!selector  name=terminal  color=#4caf50  mode=color

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
    code: `!selector  name=interface  color=#451c82  mode=color
!selector  name=impl       color=#7b47c7  mode=color

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
    code: `!selector  name=interface  color=#451c82  mode=color
!selector  name=impl       color=#7b47c7  mode=color

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
    code: `!selector  name=interface  color=#451c82  mode=color
!selector  name=impl       color=#7b47c7  mode=color

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
    code: `!selector  name=interface  color=#451c82  mode=color
!selector  name=impl       color=#7b47c7  mode=color

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
    code: `!selector  name=interface  color=#451c82  mode=color
!selector  name=impl       color=#7b47c7  mode=color
!selector  name=context    color=#ff9800  mode=color

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
    code: `!selector  name=interface  color=#451c82  mode=color
!selector  name=impl       color=#7b47c7  mode=color

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
    code: `!selector  name=interface  color=#451c82  mode=color
!selector  name=impl       color=#7b47c7  mode=color

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
    code: `!selector  name=infra    color=#607d8b  mode=color
!selector  name=adapters  color=#2196f3  mode=color
!selector  name=app       color=#ff9800  mode=color
!selector  name=domain    color=#4caf50  mode=color

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
    code: `!selector  name=presentation  color=#2196f3  mode=color
!selector  name=application   color=#ff9800  mode=color
!selector  name=domain        color=#4caf50  mode=color
!selector  name=infra         color=#607d8b  mode=color

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
    code: `!selector  name=goal  color=#4caf50  mode=color
!selector  name=risk  color=#f44336  mode=color

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
    code: `!selector  name=completed  color=#4caf50  mode=color

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
];
