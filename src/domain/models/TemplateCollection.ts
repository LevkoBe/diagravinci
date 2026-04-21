import {
  BUILT_IN_TEMPLATES,
  COMPLEX_TEMPLATES,
  type DiagramTemplate,
} from "./DiagramTemplate";

export interface TemplateCollection {
  id: string;
  name: string;
  isBuiltIn: boolean;
  templates: DiagramTemplate[];
}

export const BUILT_IN_COLLECTION_ID = "__built_in__";

export const BUILT_IN_COLLECTION: TemplateCollection = {
  id: BUILT_IN_COLLECTION_ID,
  name: "Built-in Templates",
  isBuiltIn: true,
  templates: [...BUILT_IN_TEMPLATES, ...COMPLEX_TEMPLATES],
};
