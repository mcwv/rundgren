export type PresetData = Record<string, any>;

const key = (appId: string) => `swarm-presets:${appId}`;
const readAll = (appId: string) => JSON.parse(localStorage.getItem(key(appId)) || "{}") as Record<string, PresetData>;
const writeAll = (appId: string, obj: Record<string, PresetData>) => localStorage.setItem(key(appId), JSON.stringify(obj));

export function listPresets(appId: string): { id: string; data: PresetData }[] {
  const all = readAll(appId);
  return Object.keys(all).map(id => ({ id, data: all[id] }));
}

// save
export function savePreset(appId: string, name: string, data: PresetData) {
  const all = readAll(appId);
  all[name] = data;
  writeAll(appId, all);
}

export function loadPreset(appId: string, name: string): PresetData | null {
  const all = readAll(appId);
  return all[name] ?? null;
}

export function deletePreset(appId: string, name: string) {
  const all = readAll(appId);
  delete all[name];
  writeAll(appId, all);
}

export function exportPresets(appId: string) {
  const blob = new Blob([JSON.stringify(readAll(appId), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${appId}-presets.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// import
export async function importPresets(appId: string, file: File) {
  const text = await file.text();
  const incoming = JSON.parse(text);
  if (typeof incoming !== "object" || Array.isArray(incoming)) throw new Error("Invalid presets file");
  const merged = { ...readAll(appId), ...incoming };
  writeAll(appId, merged);
}

// share
export function makeShareLink(appId: string, name: string, data: PresetData): string {
  const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ n: name, d: data }))));
  const url = new URL(location.href);
  url.searchParams.set("preset", payload);
  return url.toString();
}

// url load
export function tryLoadPresetFromURL(): { name: string; data: PresetData } | null {
  const p = new URL(location.href).searchParams.get("preset");
  if (!p) return null;
  try {
    const { n, d } = JSON.parse(decodeURIComponent(escape(atob(p)))) as any;
    if (!n || !d) return null;
    return { name: String(n), data: d as PresetData };
  } catch { return null; }
}
