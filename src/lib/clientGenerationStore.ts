const CLIENT_GENERATIONS_KEY = "demogenie:client-generations";

export type ClientGenerationRow = Record<string, unknown> & {
  slug: string;
  created_at?: string;
};

export function getClientGenerationRows(): ClientGenerationRow[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CLIENT_GENERATIONS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getClientGenerationBySlug(slug: string): ClientGenerationRow | null {
  return getClientGenerationRows().find((row) => row.slug === slug) ?? null;
}

export function saveClientGenerationRow(row: ClientGenerationRow) {
  if (typeof window === "undefined") return;
  const rows = getClientGenerationRows().filter((item) => item.slug !== row.slug);
  rows.unshift({ ...row, created_at: row.created_at ?? new Date().toISOString() });
  window.localStorage.setItem(CLIENT_GENERATIONS_KEY, JSON.stringify(rows.slice(0, 25)));
}

export function mergeClientGenerationRows(rows: ClientGenerationRow[]): ClientGenerationRow[] {
  const bySlug = new Map<string, ClientGenerationRow>();
  rows.forEach((row) => bySlug.set(row.slug, row));
  getClientGenerationRows().forEach((row) => bySlug.set(row.slug, row));
  return Array.from(bySlug.values()).sort(
    (a, b) =>
      new Date((b.created_at as string | undefined) ?? 0).getTime() -
      new Date((a.created_at as string | undefined) ?? 0).getTime(),
  );
}
