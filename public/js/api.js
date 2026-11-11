// ارسال سفارش به Worker (/api/order)
export async function submitOrder(data) {
  const r = await fetch('/api/order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'ثبت سفارش انجام نشد.'), { status: r.status });
  return j;
}
