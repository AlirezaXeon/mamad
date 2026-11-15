let cache;

async function fetchWithFallback(apiUrl, fallbackUrl) {
  try {
    const res = await fetch(apiUrl, { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) ? data.length > 0 : (data && Object.keys(data).length > 0)) {
        return data;
      }
    }
  } catch {}
  return fetch(fallbackUrl).then(r => r.json());
}

export async function load(forceReload = false) {
  if (!cache || forceReload) {
    const [site, projects] = await Promise.all([
      fetchWithFallback('/api/site', 'data/site.json'),
      fetchWithFallback('/api/projects', 'data/projects.json')
    ]);
    cache = { site, projects };
  }
  return cache;
}

let oc;
export const loadOrder = () => (oc ||= fetch('data/order.json').then(r => r.json()));
