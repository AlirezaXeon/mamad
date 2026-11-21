// ارسال سفارش به Worker (/api/order)
export async function submitOrder(data) {
  const r = await fetch('/api/order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'ثبت سفارش انجام نشد.'), { status: r.status });
  return j;
}

// آپلود فوری یک عکس (بدون تغییر اندازه یا فرمت) با نوار پیشرفت و امکان لغو
export function uploadOrderPhoto(sid, file, { onProgress, onXhr } = {}) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', `/api/order/file?sid=${encodeURIComponent(sid)}`);
    x.setRequestHeader('content-type', file.type || 'application/octet-stream');
    x.setRequestHeader('x-file-name', encodeURIComponent(file.name));
    x.upload.onprogress = e => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
    x.onload = () => {
      let j = {}; try { j = JSON.parse(x.responseText); } catch {}
      if (x.status >= 200 && x.status < 300) resolve(j);
      else reject(new Error(j.error || 'ارسال عکس انجام نشد.'));
    };
    x.onerror = () => reject(new Error('اتصال برقرار نشد.'));
    x.onabort = () => reject(Object.assign(new Error('لغو شد.'), { aborted: true }));
    onXhr?.(x);
    x.send(file);
  });
}

export const deleteOrderPhoto = (sid, id) =>
  fetch(`/api/order/file?sid=${encodeURIComponent(sid)}&id=${encodeURIComponent(id)}`, { method: 'DELETE', keepalive: true }).catch(() => {});
