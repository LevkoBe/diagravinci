import {
  APP_ARCH_TEMPLATES,
  BEHAVIORAL_PATTERN_TEMPLATES,
  BUILT_IN_TEMPLATES,
  COMPLEX_TEMPLATES,
  CREATIONAL_PATTERN_TEMPLATES,
  EDGE_CASE_TEMPLATES,
  EXECUTION_TEMPLATES,
  ICON_SHOWCASE_TEMPLATE,
  RADIAL_TEMPLATES,
  SELECTOR_SHOWCASE_TEMPLATES,
  SOLID_SRP_TEMPLATES,
  SOLID_OCP_TEMPLATES,
  SOLID_LSP_TEMPLATES,
  SOLID_ISP_TEMPLATES,
  SOLID_DIP_TEMPLATES,
  STRESS_TEMPLATES,
  STRUCTURAL_PATTERN_TEMPLATES,
  SYSTEM_ARCH_TEMPLATES,
  TEACHING_TEMPLATES,
  type DiagramTemplate,
} from "./DiagramTemplate";

export interface TemplateCollection {
  id: string;
  name: string;
  isBuiltIn: boolean;
  templates: DiagramTemplate[];
  collections?: TemplateCollection[];
}

export const BUILT_IN_COLLECTION_ID = "__built_in__";
export const BUILT_IN_COLLECTION: TemplateCollection = {
  id: BUILT_IN_COLLECTION_ID,
  name: "Built-in Templates",
  isBuiltIn: true,
  templates: [...BUILT_IN_TEMPLATES, ...COMPLEX_TEMPLATES],
};

export const TEACHING_COLLECTION_ID = "__teaching__";
export const TEACHING_COLLECTION: TemplateCollection = {
  id: TEACHING_COLLECTION_ID,
  name: "Software Engineering Teaching",
  isBuiltIn: true,
  templates: TEACHING_TEMPLATES,
};

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

export const STRESS_COLLECTION_ID = "__stress__";
export const STRESS_COLLECTION: TemplateCollection = {
  id: STRESS_COLLECTION_ID,
  name: "Stress Tests",
  isBuiltIn: true,
  templates: STRESS_TEMPLATES,
};

export const EDGE_CASES_COLLECTION_ID = "__edge_cases__";
export const EDGE_CASES_COLLECTION: TemplateCollection = {
  id: EDGE_CASES_COLLECTION_ID,
  name: "Edge Cases",
  isBuiltIn: true,
  templates: [ICON_SHOWCASE_TEMPLATE, ...EDGE_CASE_TEMPLATES],
};

export const SELECTOR_SHOWCASE_COLLECTION_ID = "__selector_showcase__";
export const SELECTOR_SHOWCASE_COLLECTION: TemplateCollection = {
  id: SELECTOR_SHOWCASE_COLLECTION_ID,
  name: "Selector Showcase",
  isBuiltIn: true,
  templates: SELECTOR_SHOWCASE_TEMPLATES,
};

export const EXECUTION_COLLECTION_ID = "__execution__";
export const EXECUTION_COLLECTION: TemplateCollection = {
  id: EXECUTION_COLLECTION_ID,
  name: "Execution",
  isBuiltIn: true,
  templates: EXECUTION_TEMPLATES,
};

export const RADIAL_COLLECTION_ID = "__radial__";
export const RADIAL_COLLECTION: TemplateCollection = {
  id: RADIAL_COLLECTION_ID,
  name: "Radial",
  isBuiltIn: true,
  templates: RADIAL_TEMPLATES,
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

export const ARCH_STYLES_COLLECTION_ID = "__arch_styles__";
export const ARCH_STYLES_COLLECTION: TemplateCollection = {
  id: ARCH_STYLES_COLLECTION_ID,
  name: "Architecture Styles",
  isBuiltIn: true,
  templates: [],
  collections: [APP_ARCH_COLLECTION, SYSTEM_ARCH_COLLECTION],
};

export const ARCHITECTURE_COLLECTION_ID = "__architecture__";
export const ARCHITECTURE_COLLECTION: TemplateCollection = {
  id: ARCHITECTURE_COLLECTION_ID,
  name: "Architecture",
  isBuiltIn: true,
  templates: [],
  collections: [
    BUILT_IN_COLLECTION,
    TEACHING_COLLECTION,
    SOLID_COLLECTION,
    DESIGN_PATTERNS_COLLECTION,
    ARCH_STYLES_COLLECTION,
  ],
};

export const DEVELOPER_TOOLS_COLLECTION_ID = "__developer_tools__";
export const DEVELOPER_TOOLS_COLLECTION: TemplateCollection = {
  id: DEVELOPER_TOOLS_COLLECTION_ID,
  name: "Developer Tools",
  isBuiltIn: true,
  templates: [],
  collections: [EDGE_CASES_COLLECTION, STRESS_COLLECTION],
};

export const SHOWCASES_COLLECTION_ID = "__showcases__";
export const SHOWCASES_COLLECTION: TemplateCollection = {
  id: SHOWCASES_COLLECTION_ID,
  name: "Showcases",
  isBuiltIn: true,
  templates: [],
  collections: [
    EXECUTION_COLLECTION,
    SELECTOR_SHOWCASE_COLLECTION,
    RADIAL_COLLECTION,
  ],
};
