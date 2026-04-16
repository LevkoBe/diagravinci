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
View{
  Template
  Component
  Stylesheet
}
Controller{
  Router
  Handler
  Middleware
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
