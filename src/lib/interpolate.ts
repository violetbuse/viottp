const VAR_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

export function buildVariableMap(
  globals: { key: string; value: string; enabled: boolean }[],
  envVars: { key: string; value: string; enabled: boolean }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const v of globals) if (v.enabled) map.set(v.key, v.value);
  for (const v of envVars) if (v.enabled) map.set(v.key, v.value);
  return map;
}

export function resolveVariables(text: string, vars: Map<string, string>): string {
  if (!text) return text;
  return text.replace(VAR_PATTERN, (match, name) => {
    return vars.has(name) ? (vars.get(name) as string) : match;
  });
}

export function findUnresolvedVariables(text: string, vars: Map<string, string>): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const match of text.matchAll(VAR_PATTERN)) {
    const name = match[1];
    if (!vars.has(name)) found.add(name);
  }
  return Array.from(found);
}

export function findUnresolvedVariablesMany(
  texts: (string | null | undefined)[],
  vars: Map<string, string>,
): string[] {
  const found = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    for (const name of findUnresolvedVariables(text, vars)) found.add(name);
  }
  return Array.from(found);
}
