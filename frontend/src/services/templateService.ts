import type { SimulationTemplate, TemplateCategory, TemplateStatus } from '../types/template';
import { SIMULATION_TEMPLATES } from './templateData';

// ─── Template Service ─────────────────────────────────────────────────────────

/** Returns all templates. */
export function getAllTemplates(): SimulationTemplate[] {
  return [...SIMULATION_TEMPLATES];
}

/** Returns a single template by its ID, or undefined if not found. */
export function getTemplateById(id: string): SimulationTemplate | undefined {
  return SIMULATION_TEMPLATES.find((t) => t.id === id);
}

/** Returns a single template by its URL slug, or undefined if not found. */
export function getTemplateBySlug(slug: string): SimulationTemplate | undefined {
  return SIMULATION_TEMPLATES.find((t) => t.slug === slug);
}

/** Robust template resolver that matches by slug, ID, or platform name. */
export function resolveTemplate(identifier?: string): SimulationTemplate | undefined {
  if (!identifier) return undefined;
  const clean = identifier.toLowerCase().trim();
  return SIMULATION_TEMPLATES.find(
    (t) =>
      t.slug.toLowerCase() === clean ||
      t.id.toLowerCase() === clean ||
      t.platform.toLowerCase() === clean ||
      t.slug.toLowerCase().includes(clean) ||
      clean.includes(t.platform.toLowerCase())
  );
}

/** Full-text search across name, description, and platform. */
export function searchTemplates(query: string): SimulationTemplate[] {
  const q = query.toLowerCase().trim();
  if (!q) return [...SIMULATION_TEMPLATES];
  return SIMULATION_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.platform.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q),
  );
}

/** Filter templates by category, status, or both. Pass undefined to skip a filter. */
export function filterTemplates(opts: {
  category?: TemplateCategory;
  status?: TemplateStatus;
}): SimulationTemplate[] {
  return SIMULATION_TEMPLATES.filter((t) => {
    if (opts.category && t.category !== opts.category) return false;
    if (opts.status   && t.status   !== opts.status)   return false;
    return true;
  });
}
