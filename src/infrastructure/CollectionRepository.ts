import type { TemplateCollection } from "../domain/models/TemplateCollection";
import {
  BUILT_IN_COLLECTION,
  BUILT_IN_COLLECTION_ID,
} from "../domain/models/TemplateCollection";
import type { DiagramTemplate } from "../domain/models/DiagramTemplate";

const STORAGE_KEY = "diagravinci_collections";

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
    // Silently ignore quota errors
  }
}

export const CollectionRepository = {
  getAll(): TemplateCollection[] {
    return [BUILT_IN_COLLECTION, ...loadUserCollections()];
  },

  create(name: string): TemplateCollection {
    const collections = loadUserCollections();
    const newCollection: TemplateCollection = {
      id: crypto.randomUUID(),
      name,
      isBuiltIn: false,
      templates: [],
    };
    collections.push(newCollection);
    saveUserCollections(collections);
    return newCollection;
  },

  delete(id: string): void {
    if (id === BUILT_IN_COLLECTION_ID) return;
    const collections = loadUserCollections().filter((c) => c.id !== id);
    saveUserCollections(collections);
  },

  addTemplate(collectionId: string, template: DiagramTemplate): void {
    if (collectionId === BUILT_IN_COLLECTION_ID) return;
    const collections = loadUserCollections();
    const col = collections.find((c) => c.id === collectionId);
    if (!col) return;
    col.templates.push(template);
    saveUserCollections(collections);
  },

  removeTemplate(collectionId: string, templateId: string): void {
    if (collectionId === BUILT_IN_COLLECTION_ID) return;
    const collections = loadUserCollections();
    const col = collections.find((c) => c.id === collectionId);
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
    return BUILT_IN_COLLECTION;
  },
};
