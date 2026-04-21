import { strFromU8, strToU8, unzip, zipSync } from "fflate";
import type { TemplateCollection } from "../domain/models/TemplateCollection";
import type { DiagramTemplate } from "../domain/models/DiagramTemplate";

interface ManifestEntry {
  id: string;
  name: string;
  description: string;
  tags: string[];
  preferredView: DiagramTemplate["preferredView"];
  file: string;
}

interface Manifest {
  id: string;
  name: string;
  templates: ManifestEntry[];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function uniqueFilename(base: string, used: Set<string>, ext = ".dg"): string {
  let candidate = `${base}${ext}`;
  let i = 1;
  while (used.has(candidate)) {
    candidate = `${base}-${i}${ext}`;
    i++;
  }
  used.add(candidate);
  return candidate;
}

export function exportCollectionToZip(collection: TemplateCollection): Blob {
  const files: Record<string, Uint8Array> = {};
  const usedFilenames = new Set<string>();

  const manifestEntries: ManifestEntry[] = collection.templates.map((t) => {
    const filename = uniqueFilename(slugify(t.name) || t.id, usedFilenames);
    files[filename] = strToU8(t.code);
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      tags: t.tags,
      preferredView: t.preferredView,
      file: filename,
    };
  });

  const manifest: Manifest = {
    id: collection.id,
    name: collection.name,
    templates: manifestEntries,
  };
  files["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));

  const zipped = zipSync(files);
  return new Blob([zipped.buffer as ArrayBuffer], { type: "application/zip" });
}

export function downloadCollectionZip(collection: TemplateCollection): void {
  const blob = exportCollectionToZip(collection);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(collection.name) || "collection"}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importCollectionFromZip(
  file: File,
): Promise<TemplateCollection> {
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);

  return new Promise((resolve, reject) => {
    unzip(data, (err, files) => {
      if (err) {
        reject(new Error(`Failed to read zip: ${err.message}`));
        return;
      }

      const manifestFile = files["manifest.json"];
      if (!manifestFile) {
        reject(new Error("Invalid collection zip: missing manifest.json"));
        return;
      }

      let manifest: Manifest;
      try {
        manifest = JSON.parse(strFromU8(manifestFile)) as Manifest;
      } catch {
        reject(new Error("Invalid collection zip: manifest.json is malformed"));
        return;
      }

      const templates: DiagramTemplate[] = [];
      for (const entry of manifest.templates) {
        const dgFile = files[entry.file];
        if (!dgFile) {
          reject(
            new Error(
              `Invalid collection zip: missing file "${entry.file}" for template "${entry.name}"`,
            ),
          );
          return;
        }
        templates.push({
          id: entry.id,
          name: entry.name,
          description: entry.description,
          tags: entry.tags,
          preferredView: entry.preferredView,
          code: strFromU8(dgFile),
        });
      }

      resolve({
        id: manifest.id,
        name: manifest.name,
        isBuiltIn: false,
        templates,
      });
    });
  });
}
