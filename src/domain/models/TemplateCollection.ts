import {
  BUILT_IN_TEMPLATES,
  COMPLEX_TEMPLATES,
  EDGE_CASE_TEMPLATES,
  EXECUTION_TEMPLATES,
  ICON_SHOWCASE_TEMPLATE,
  RADIAL_TEMPLATES,
  SELECTOR_SHOWCASE_TEMPLATES,
  STRESS_TEMPLATES,
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

export const TEACHING_COLLECTION_ID = "__teaching__";

export const TEACHING_COLLECTION: TemplateCollection = {
  id: TEACHING_COLLECTION_ID,
  name: "Software Engineering Teaching",
  isBuiltIn: true,
  templates: TEACHING_TEMPLATES,
};

export const ARCHITECTURE_COLLECTION_ID = "__architecture__";
export const ARCHITECTURE_COLLECTION: TemplateCollection = {
  id: ARCHITECTURE_COLLECTION_ID,
  name: "Architecture",
  isBuiltIn: true,
  templates: [],
  collections: [BUILT_IN_COLLECTION, TEACHING_COLLECTION],
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
  collections: [EXECUTION_COLLECTION, SELECTOR_SHOWCASE_COLLECTION, RADIAL_COLLECTION],
};
