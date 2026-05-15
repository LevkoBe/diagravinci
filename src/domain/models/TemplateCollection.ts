import {
  ALL_ELEMENT_TYPES_TEMPLATE,
  ALL_REL_TYPES_TEMPLATE,
  APP_ARCH_TEMPLATES,
  BEHAVIORAL_PATTERN_TEMPLATES,
  BUSINESS_PROCESS_TEMPLATES,
  CREATIONAL_PATTERN_TEMPLATES,
  EXECUTION_TEMPLATES,
  ICON_SHOWCASE_TEMPLATE,
  PLANNING_ROADMAP_TEMPLATES,
  SELECTOR_SHOWCASE_TEMPLATES,
  SOLID_DIP_TEMPLATES,
  SOLID_ISP_TEMPLATES,
  SOLID_LSP_TEMPLATES,
  SOLID_OCP_TEMPLATES,
  SOLID_SRP_TEMPLATES,
  STRESS_TEMPLATES,
  STRUCTURAL_PATTERN_TEMPLATES,
  SYSTEM_ARCH_TEMPLATES,
  USER_CUSTOMER_TEMPLATES,
  WIDE_FANOUT_TEMPLATE,
  type DiagramTemplate,
} from "./DiagramTemplate";

export interface TemplateCollection {
  id: string;
  name: string;
  isBuiltIn: boolean;
  templates: DiagramTemplate[];
  collections?: TemplateCollection[];
}

export const SOLID_SRP_COLLECTION_ID = "__solid_srp__";
export const SOLID_SRP_COLLECTION: TemplateCollection = {
  id: SOLID_SRP_COLLECTION_ID,
  name: "S — Single Responsibility",
  isBuiltIn: true,
  templates: SOLID_SRP_TEMPLATES,
};

export const SOLID_OCP_COLLECTION_ID = "__solid_ocp__";
export const SOLID_OCP_COLLECTION: TemplateCollection = {
  id: SOLID_OCP_COLLECTION_ID,
  name: "O — Open/Closed",
  isBuiltIn: true,
  templates: SOLID_OCP_TEMPLATES,
};

export const SOLID_LSP_COLLECTION_ID = "__solid_lsp__";
export const SOLID_LSP_COLLECTION: TemplateCollection = {
  id: SOLID_LSP_COLLECTION_ID,
  name: "L — Liskov Substitution",
  isBuiltIn: true,
  templates: SOLID_LSP_TEMPLATES,
};

export const SOLID_ISP_COLLECTION_ID = "__solid_isp__";
export const SOLID_ISP_COLLECTION: TemplateCollection = {
  id: SOLID_ISP_COLLECTION_ID,
  name: "I — Interface Segregation",
  isBuiltIn: true,
  templates: SOLID_ISP_TEMPLATES,
};

export const SOLID_DIP_COLLECTION_ID = "__solid_dip__";
export const SOLID_DIP_COLLECTION: TemplateCollection = {
  id: SOLID_DIP_COLLECTION_ID,
  name: "D — Dependency Inversion",
  isBuiltIn: true,
  templates: SOLID_DIP_TEMPLATES,
};

export const SOLID_COLLECTION_ID = "__solid__";
export const SOLID_COLLECTION: TemplateCollection = {
  id: SOLID_COLLECTION_ID,
  name: "SOLID Principles",
  isBuiltIn: true,
  templates: [],
  collections: [
    SOLID_SRP_COLLECTION,
    SOLID_OCP_COLLECTION,
    SOLID_LSP_COLLECTION,
    SOLID_ISP_COLLECTION,
    SOLID_DIP_COLLECTION,
  ],
};

export const CREATIONAL_PATTERNS_COLLECTION_ID = "__creational_patterns__";
export const CREATIONAL_PATTERNS_COLLECTION: TemplateCollection = {
  id: CREATIONAL_PATTERNS_COLLECTION_ID,
  name: "Creational",
  isBuiltIn: true,
  templates: CREATIONAL_PATTERN_TEMPLATES,
};

export const STRUCTURAL_PATTERNS_COLLECTION_ID = "__structural_patterns__";
export const STRUCTURAL_PATTERNS_COLLECTION: TemplateCollection = {
  id: STRUCTURAL_PATTERNS_COLLECTION_ID,
  name: "Structural",
  isBuiltIn: true,
  templates: STRUCTURAL_PATTERN_TEMPLATES,
};

export const BEHAVIORAL_PATTERNS_COLLECTION_ID = "__behavioral_patterns__";
export const BEHAVIORAL_PATTERNS_COLLECTION: TemplateCollection = {
  id: BEHAVIORAL_PATTERNS_COLLECTION_ID,
  name: "Behavioral",
  isBuiltIn: true,
  templates: BEHAVIORAL_PATTERN_TEMPLATES,
};

export const DESIGN_PATTERNS_COLLECTION_ID = "__design_patterns__";
export const DESIGN_PATTERNS_COLLECTION: TemplateCollection = {
  id: DESIGN_PATTERNS_COLLECTION_ID,
  name: "Design Patterns (GoF)",
  isBuiltIn: true,
  templates: [],
  collections: [
    CREATIONAL_PATTERNS_COLLECTION,
    STRUCTURAL_PATTERNS_COLLECTION,
    BEHAVIORAL_PATTERNS_COLLECTION,
  ],
};

export const APP_ARCH_COLLECTION_ID = "__app_arch__";
export const APP_ARCH_COLLECTION: TemplateCollection = {
  id: APP_ARCH_COLLECTION_ID,
  name: "Application Architecture",
  isBuiltIn: true,
  templates: APP_ARCH_TEMPLATES,
};

export const SYSTEM_ARCH_COLLECTION_ID = "__system_arch__";
export const SYSTEM_ARCH_COLLECTION: TemplateCollection = {
  id: SYSTEM_ARCH_COLLECTION_ID,
  name: "System Architecture",
  isBuiltIn: true,
  templates: SYSTEM_ARCH_TEMPLATES,
};

export const ARCHITECTURE_COLLECTION_ID = "__architecture__";
export const ARCHITECTURE_COLLECTION: TemplateCollection = {
  id: ARCHITECTURE_COLLECTION_ID,
  name: "Architecture",
  isBuiltIn: true,
  templates: [],
  collections: [
    SOLID_COLLECTION,
    DESIGN_PATTERNS_COLLECTION,
    APP_ARCH_COLLECTION,
    SYSTEM_ARCH_COLLECTION,
  ],
};

export const STRESS_COLLECTION_ID = "__stress__";
export const STRESS_COLLECTION: TemplateCollection = {
  id: STRESS_COLLECTION_ID,
  name: "Stress Tests",
  isBuiltIn: true,
  templates: STRESS_TEMPLATES,
};

export const DEVELOPER_TESTING_COLLECTION_ID = "__developer_testing__";
export const DEVELOPER_TESTING_COLLECTION: TemplateCollection = {
  id: DEVELOPER_TESTING_COLLECTION_ID,
  name: "Developer Testing",
  isBuiltIn: true,
  templates: [],
  collections: [STRESS_COLLECTION],
};

export const EXECUTION_COLLECTION_ID = "__execution__";
export const EXECUTION_COLLECTION: TemplateCollection = {
  id: EXECUTION_COLLECTION_ID,
  name: "Execution",
  isBuiltIn: true,
  templates: EXECUTION_TEMPLATES,
};

export const SELECTOR_COLLECTION_ID = "__selectors__";
export const SELECTOR_COLLECTION: TemplateCollection = {
  id: SELECTOR_COLLECTION_ID,
  name: "Selectors",
  isBuiltIn: true,
  templates: SELECTOR_SHOWCASE_TEMPLATES,
};

export const LAYOUT_EXAMPLES_COLLECTION_ID = "__layout_examples__";
export const LAYOUT_EXAMPLES_COLLECTION: TemplateCollection = {
  id: LAYOUT_EXAMPLES_COLLECTION_ID,
  name: "Layout Examples",
  isBuiltIn: true,
  templates: [WIDE_FANOUT_TEMPLATE],
};

export const EXPLORATION_SHOWCASES_COLLECTION_ID = "__exploration_showcases__";
export const EXPLORATION_SHOWCASES_COLLECTION: TemplateCollection = {
  id: EXPLORATION_SHOWCASES_COLLECTION_ID,
  name: "Exploration & Showcases",
  isBuiltIn: true,
  templates: [
    ICON_SHOWCASE_TEMPLATE,
    ALL_REL_TYPES_TEMPLATE,
    ALL_ELEMENT_TYPES_TEMPLATE,
  ],
  collections: [
    EXECUTION_COLLECTION,
    SELECTOR_COLLECTION,
    LAYOUT_EXAMPLES_COLLECTION,
  ],
};

export const USER_CUSTOMER_COLLECTION_ID = "__user_customer__";
export const USER_CUSTOMER_COLLECTION: TemplateCollection = {
  id: USER_CUSTOMER_COLLECTION_ID,
  name: "User & Customer",
  isBuiltIn: true,
  templates: USER_CUSTOMER_TEMPLATES,
};

export const PLANNING_ROADMAP_COLLECTION_ID = "__planning_roadmap__";
export const PLANNING_ROADMAP_COLLECTION: TemplateCollection = {
  id: PLANNING_ROADMAP_COLLECTION_ID,
  name: "Planning & Roadmap",
  isBuiltIn: true,
  templates: PLANNING_ROADMAP_TEMPLATES,
};

export const BUSINESS_PROCESS_COLLECTION_ID = "__business_process__";
export const BUSINESS_PROCESS_COLLECTION: TemplateCollection = {
  id: BUSINESS_PROCESS_COLLECTION_ID,
  name: "Business Process",
  isBuiltIn: true,
  templates: BUSINESS_PROCESS_TEMPLATES,
};

export const PRODUCT_PROCESS_COLLECTION_ID = "__product_process__";
export const PRODUCT_PROCESS_COLLECTION: TemplateCollection = {
  id: PRODUCT_PROCESS_COLLECTION_ID,
  name: "Product & Process",
  isBuiltIn: true,
  templates: [],
  collections: [
    USER_CUSTOMER_COLLECTION,
    PLANNING_ROADMAP_COLLECTION,
    BUSINESS_PROCESS_COLLECTION,
  ],
};
