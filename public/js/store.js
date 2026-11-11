let cache;
export async function load() {
  if (!cache) {
    const [site, projects] = await Promise.all(
      ['data/site.json', 'data/projects.json'].map(u => fetch(u).then(r => r.json()))
    );
    cache = { site, projects };
  }
  return cache;
}
let oc;
export const loadOrder = () => (oc ||= fetch('data/order.json').then(r => r.json()));
