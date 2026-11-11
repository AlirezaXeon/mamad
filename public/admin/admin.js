(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ST = { new: ['جدید', '#8FB39E'], review: ['در حال بررسی', '#E0C27A'], contacted: ['تماس گرفته شد', '#7FB2D9'], contract: ['قرارداد شد', '#A3D9A0'], archived: ['بایگانی', '#8D978F'] };
  let pass = sessionStorage.getItem('adm') || '', cfg, orders = [];

  const lab = (list, id) => (list.find(o => o.id === id) || {}).label || id || '—';
  const labs = (list, ids) => (ids || []).map(i => lab(list, i)).join('، ') || '—';
  const when = s => new Date(String(s).replace(' ', 'T') + 'Z').toLocaleString('fa-IR');
  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800); };

  async function api(path, opt = {}) {
    const r = await fetch(path, { ...opt, headers: { ...(opt.body && { 'content-type': 'application/json' }), authorization: 'Bearer ' + encodeURIComponent(pass) } });
    if (r.status === 401) { logout(); throw new Error('رمز اشتباه است'); }
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'خطا');
    return j;
  }

  function logout() { pass = ''; sessionStorage.removeItem('adm'); $('#panel').hidden = true; $('#login').hidden = false; }

  async function refresh(openId) {
    const p = new URLSearchParams();
    if ($('#status').value) p.set('status', $('#status').value);
    if ($('#q').value.trim()) p.set('q', $('#q').value.trim());
    orders = (await api('/api/admin/orders?' + p)).orders;
    $('#count').textContent = `(${orders.length})`;
    $('#list').innerHTML = orders.length ? orders.map(card).join('') : '<p class="empty">سفارشی پیدا نشد.</p>';
    if (openId) { const d = $(`.o[data-id="${openId}"]`); if (d) d.open = true; }
  }

  const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  function card(o) {
    const [t, c] = ST[o.status] || ST.new, wa = '98' + o.phone.slice(1);
    const prop = [lab(cfg.propertyTypes, o.property_type), o.property_state && lab(cfg.propertyStates, o.property_state), o.city, o.area && o.area + ' متر'].filter(Boolean).map(esc).join('، ');
    return `<details class="o" data-id="${o.id}">
      <summary><span class="dot" style="background:${c}"></span><b>${esc(o.name)}</b><span class="code">${esc(o.code)}</span><span class="st" style="color:${c}">${t}</span><small>${when(o.created_at)}</small></summary>
      <div class="act"><a href="tel:${esc(o.phone)}">تماس</a><a href="https://wa.me/${wa}" target="_blank" rel="noopener">واتساپ</a>${o.telegram_id ? `<a href="https://t.me/${esc(o.telegram_id)}" target="_blank" rel="noopener">تلگرام</a>` : ''}</div>
      <dl>
        ${row('موبایل', `<bdi dir="ltr">${esc(o.phone)}</bdi>`)}
        ${row('ترجیح تماس', `${esc(lab(cfg.contactMethods, o.contact_method))} | ${esc(lab(cfg.contactTimes, o.contact_time || 'any'))}${o.telegram_id ? ` | @${esc(o.telegram_id)}` : ''}`)}
        ${row('خدمات', esc(labs(cfg.services, o.services)))}
        ${row('ملک', prop || '—')}
        ${row('اتاق خواب', esc(lab(cfg.rooms, o.rooms)))}
        ${row('سبک', esc(labs(cfg.styles, o.styles)))}
        ${row('بودجه', esc(lab(cfg.budgets, o.budget)))}
        ${row('زمان شروع', esc(lab(cfg.timelines, o.timeline)))}
        ${o.notes ? row('توضیحات', esc(o.notes)) : ''}
        ${o.refs ? row('نمونه‌ها', esc(o.refs)) : ''}
      </dl>
      <div class="edit">
        <select class="in" data-f="status">${Object.entries(ST).map(([k, [n]]) => `<option value="${k}"${k === o.status ? ' selected' : ''}>${n}</option>`).join('')}</select>
        <textarea class="in" data-f="note" placeholder="یادداشت داخلی (فقط برای شما)">${esc(o.admin_note)}</textarea>
        <button class="btn primary" type="button" data-save="${o.id}">ذخیره</button>
      </div></details>`;
  }

  $('#list').addEventListener('click', async e => {
    const id = e.target.dataset.save;
    if (!id) return;
    const box = e.target.closest('.o');
    try {
      await api('/api/admin/orders/' + id, { method: 'PATCH', body: JSON.stringify({ status: box.querySelector('[data-f=status]').value, admin_note: box.querySelector('[data-f=note]').value }) });
      toast('ذخیره شد');
      await refresh(id);
    } catch (err) { toast(err.message); }
  });

  $('#csv').onclick = () => {
    const head = ['کد', 'تاریخ', 'وضعیت', 'نام', 'موبایل', 'خدمات', 'نوع ملک', 'شهر', 'متراژ', 'سبک', 'بودجه', 'زمان شروع', 'توضیحات'];
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = orders.map(o => [o.code, when(o.created_at), ST[o.status]?.[0], o.name, o.phone, labs(cfg.services, o.services), lab(cfg.propertyTypes, o.property_type), o.city, o.area, labs(cfg.styles, o.styles), lab(cfg.budgets, o.budget), lab(cfg.timelines, o.timeline), o.notes].map(q).join(','));
    const url = URL.createObjectURL(new Blob(['\ufeff' + [head.map(q).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' }));
    Object.assign(document.createElement('a'), { href: url, download: 'orders.csv' }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  async function enter() {
    $('#login').hidden = true; $('#panel').hidden = false;
    try { await refresh(); } catch (e) { $('#loginErr').textContent = e.message; }
  }

  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    pass = $('#pass').value; sessionStorage.setItem('adm', pass); $('#loginErr').textContent = '';
    await enter();
  });
  $('#refresh').onclick = () => refresh().catch(e => toast(e.message));
  $('#logout').onclick = logout;
  $('#status').onchange = () => refresh().catch(e => toast(e.message));
  let t; $('#q').oninput = () => { clearTimeout(t); t = setTimeout(() => refresh().catch(() => {}), 300); };

  fetch('../data/order.json').then(r => r.json()).then(c => {
    cfg = c;
    $('#status').innerHTML = '<option value="">همه وضعیت‌ها</option>' + Object.entries(ST).map(([k, [n]]) => `<option value="${k}">${n}</option>`).join('');
    pass ? enter() : ($('#login').hidden = false);
  });
})();
