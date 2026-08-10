const PSGC_BASE = "https://psgc.gitlab.io/api";

const CACHE_TTL = 1000 * 60 * 60 * 24 * 7;

function readCache(key) {
  try {
    const raw = localStorage.getItem(`psgc:${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.at > CACHE_TTL) {
      localStorage.removeItem(`psgc:${key}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(`psgc:${key}`, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // Storage full/unavailable — fetch still works without cache.
  }
}

async function fetchPsgc(path) {
  const cacheKey = path.replace(/[^a-z0-9]+/gi, "_");
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${PSGC_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Location API error (${res.status})`);
  }
  const data = await res.json();
  writeCache(cacheKey, data);
  return data;
}

export function getRegions() {
  return fetchPsgc("/regions/");
}

export function getProvinces(regionCode) {
  return fetchPsgc(`/regions/${regionCode}/provinces/`);
}

export function getCities(provinceCode) {
  return fetchPsgc(`/provinces/${provinceCode}/cities-municipalities/`);
}

export function getRegionCities(regionCode) {
  return fetchPsgc(`/regions/${regionCode}/cities-municipalities/`);
}

export function getBarangays(cityCode) {
  return fetchPsgc(`/cities-municipalities/${cityCode}/barangays/`);
}

export function codeOf(items, name) {
  if (!name) return "";
  const normalized = String(name).trim().toLowerCase().replace(/^city of\s+/i, "").replace(/^city\s+/i, "");
  const match = (items || []).find((item) => {
    const candidate = String(item.name).trim().toLowerCase().replace(/^city of\s+/i, "").replace(/^city\s+/i, "");
    return candidate === normalized;
  });
  return match?.code || "";
}

export function nameOf(items, code) {
  return (items || []).find((item) => item.code === code)?.name || "";
}
