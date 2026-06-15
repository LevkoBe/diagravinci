import type { TemplateCollection } from "../domain/models/TemplateCollection";
import {
  ARCHITECTURE_COLLECTION,
  ARCHITECTURE_COLLECTION_ID,
  DEVELOPER_TESTING_COLLECTION_ID,
  EXPLORATION_SHOWCASES_COLLECTION,
  EXPLORATION_SHOWCASES_COLLECTION_ID,
  SOLID_COLLECTION_ID,
  SOLID_SRP_COLLECTION_ID,
  SOLID_OCP_COLLECTION_ID,
  SOLID_LSP_COLLECTION_ID,
  SOLID_ISP_COLLECTION_ID,
  SOLID_DIP_COLLECTION_ID,
  DESIGN_PATTERNS_COLLECTION_ID,
  CREATIONAL_PATTERNS_COLLECTION_ID,
  STRUCTURAL_PATTERNS_COLLECTION_ID,
  BEHAVIORAL_PATTERNS_COLLECTION_ID,
  APP_ARCH_COLLECTION_ID,
  SYSTEM_ARCH_COLLECTION_ID,
  STRESS_COLLECTION_ID,
  SELECTOR_COLLECTION_ID,
  EXECUTION_COLLECTION_ID,
  PRODUCT_PROCESS_COLLECTION,
  PRODUCT_PROCESS_COLLECTION_ID,
  USER_CUSTOMER_COLLECTION_ID,
  PLANNING_ROADMAP_COLLECTION_ID,
  BUSINESS_PROCESS_COLLECTION_ID,
  DIAGRAVINCI_COLLECTION,
  DIAGRAVINCI_COLLECTION_ID,
} from "../domain/models/TemplateCollection";
import type { DiagramTemplate } from "../domain/models/DiagramTemplate";

const STORAGE_KEY = "diagravinci_collections";

const BUILT_IN_IDS = new Set([
  ARCHITECTURE_COLLECTION_ID,
  DEVELOPER_TESTING_COLLECTION_ID,
  EXPLORATION_SHOWCASES_COLLECTION_ID,
  SOLID_COLLECTION_ID,
  SOLID_SRP_COLLECTION_ID,
  SOLID_OCP_COLLECTION_ID,
  SOLID_LSP_COLLECTION_ID,
  SOLID_ISP_COLLECTION_ID,
  SOLID_DIP_COLLECTION_ID,
  DESIGN_PATTERNS_COLLECTION_ID,
  CREATIONAL_PATTERNS_COLLECTION_ID,
  STRUCTURAL_PATTERNS_COLLECTION_ID,
  BEHAVIORAL_PATTERNS_COLLECTION_ID,
  APP_ARCH_COLLECTION_ID,
  SYSTEM_ARCH_COLLECTION_ID,
  STRESS_COLLECTION_ID,
  SELECTOR_COLLECTION_ID,
  EXECUTION_COLLECTION_ID,
  PRODUCT_PROCESS_COLLECTION_ID,
  USER_CUSTOMER_COLLECTION_ID,
  PLANNING_ROADMAP_COLLECTION_ID,
  BUSINESS_PROCESS_COLLECTION_ID,
  DIAGRAVINCI_COLLECTION_ID,
]);

function loadUserCollections(): TemplateCollection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TemplateCollection[];
  } catch {
    return [];
  }
}

function saveUserCollections(collections: TemplateCollection[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
  } catch {
    // quota exceeded
  }
}

function findInTree(
  collections: TemplateCollection[],
  id: string,
): TemplateCollection | null {
  for (const col of collections) {
    if (col.id === id) return col;
    if (col.collections) {
      const found = findInTree(col.collections, id);
      if (found) return found;
    }
  }
  return null;
}

function removeFromTree(
  collections: TemplateCollection[],
  id: string,
): TemplateCollection[] {
  return collections
    .filter((c) => c.id !== id)
    .map((c) =>
      c.collections
        ? { ...c, collections: removeFromTree(c.collections, id) }
        : c,
    );
}

export const CollectionRepository = {
  getAll(): TemplateCollection[] {
    return [
      ARCHITECTURE_COLLECTION,
      PRODUCT_PROCESS_COLLECTION,
      // DEVELOPER_TESTING_COLLECTION,
      EXPLORATION_SHOWCASES_COLLECTION,
      DIAGRAVINCI_COLLECTION,
      ...loadUserCollections(),
    ];
  },

  create(name: string, parentId?: string): TemplateCollection {
    const collections = loadUserCollections();
    const newCollection: TemplateCollection = {
      id: crypto.randomUUID(),
      name,
      isBuiltIn: false,
      templates: [],
      collections: [],
    };
    if (parentId) {
      const parent = findInTree(collections, parentId);
      if (parent) {
        parent.collections = parent.collections ?? [];
        parent.collections.push(newCollection);
        saveUserCollections(collections);
        return newCollection;
      }
    }
    collections.push(newCollection);
    saveUserCollections(collections);
    return newCollection;
  },

  delete(id: string): void {
    if (BUILT_IN_IDS.has(id)) return;
    saveUserCollections(removeFromTree(loadUserCollections(), id));
  },

  addTemplate(collectionId: string, template: DiagramTemplate): void {
    if (BUILT_IN_IDS.has(collectionId)) return;
    const collections = loadUserCollections();
    const col = findInTree(collections, collectionId);
    if (!col) return;
    col.templates.push(template);
    saveUserCollections(collections);
  },

  removeTemplate(collectionId: string, templateId: string): void {
    if (BUILT_IN_IDS.has(collectionId)) return;
    const collections = loadUserCollections();
    const col = findInTree(collections, collectionId);
    if (!col) return;
    col.templates = col.templates.filter((t) => t.id !== templateId);
    saveUserCollections(collections);
  },

  upsert(collection: TemplateCollection): void {
    if (collection.isBuiltIn) return;
    const collections = loadUserCollections();
    const idx = collections.findIndex((c) => c.id === collection.id);
    if (idx >= 0) {
      collections[idx] = collection;
    } else {
      collections.push(collection);
    }
    saveUserCollections(collections);
  },

  getBuiltIn(): TemplateCollection {
    return ARCHITECTURE_COLLECTION;
  },
};
