// ارسال سفارش به Worker (/api/order)
export async function submitOrder(data) {
  const r = await fetch('/api/order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'ثبت سفارش انجام نشد.'), { status: r.status });
  return j;
}

// آپلود یک عکس همانطور که هست (بدون تغییر اندازه یا فرمت)
export async function uploadOrderPhoto(code, token, file) {
  const r = await fetch(`/api/order/file?code=${encodeURIComponent(code)}&t=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'content-type': file.type || 'application/octet-stream', 'x-file-name': encodeURIComponent(file.name) },
    body: file
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'ارسال عکس انجام نشد.');
  return j;
}
