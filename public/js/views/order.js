import { h, app, fa, toEn, num } from '../utils.js';
import { load, loadOrder } from '../store.js';
import { openModal } from '../components/modal.js';
import { choices } from '../components/choice.js';
import { helpButton } from '../components/help.js';
import { icon, svg } from '../components/icons.js';
import { submitOrder } from '../api.js';

const DRAFT = 'orderDraft', STEPS = 5;
const blank = () => ({ services: [], propertyType: '', propertyState: '', city: '', area: '', rooms: '', styles: [], budget: '', timeline: '', notes: '', refs: '', name: '', phone: '', contactMethod: 'call', contactTime: 'any', telegramId: '', website: '' });
let state = blank(), step = 0;
try { const d = JSON.parse(sessionStorage.getItem(DRAFT)); if (d) { state = { ...blank(), ...d.state }; step = d.step || 0; } } catch {}
const save = () => { try { sessionStorage.setItem(DRAFT, JSON.stringify({ state, step })); } catch {} };
const set = (k, v) => { state[k] = v; save(); };
const lab = (list, id) => (list.find(o => o.id === id) || {}).label || '';
const phoneOk = p => /^(\+98|0098|98|0)?9\d{9}$/.test(toEn(p).replace(/[\s-]/g, ''));

// ---------- ورود: اول راهنما، بعد فرم ----------
export async function order() {
  const [{ site }, cfg] = await Promise.all([load(), loadOrder()]);
  document.title = 'ثبت سفارش | ' + site.name;
  if (sessionStorage.getItem('orderGuide')) return draw(cfg, site);
  app.replaceChildren();
  guide(cfg, () => draw(cfg, site));
}

function guide(cfg, done) {
  const g = cfg.guide;
  let ok = false, dlg;
  const box = h('input', { type: 'checkbox', id: 'g-ok' });
  const go = h('button', { class: 'btn primary', type: 'button', disabled: 'true', onclick: () => { ok = true; sessionStorage.setItem('orderGuide', '1'); dlg.close(); done(); } }, g.cta);
  box.addEventListener('change', () => { go.disabled = !box.checked; });
  dlg = openModal({
    title: g.title,
    onclose: () => { if (!ok) location.hash = '/'; },
    content: h('div', {},
      h('p', { class: 'lead' }, g.intro),
      h('ol', { class: 'guide' }, g.points.map((t, i) => h('li', {}, h('b', {}, fa(i + 1)), h('span', {}, t)))),
      h('label', { class: 'check', for: 'g-ok' }, box, h('span', {}, g.confirm)),
      go),
  });
}

// ---------- ساختار فرم ----------
const title = (t, s) => [h('h2', { class: 'st' }, t), s && h('p', { class: 'ss' }, s)];
const field = (label, control, help, hint) => h('div', { class: 'field' },
  h('div', { class: 'lbl' }, h('span', {}, label), help), hint && h('p', { class: 'hint' }, hint), control);
const text = (k, o = {}) => h('input', { class: 'in' + (o.ltr ? ' ltr' : ''), value: state[k], autocomplete: o.ac || 'off', placeholder: o.ph || '', inputmode: o.mode, dir: o.ltr ? 'ltr' : null, oninput: e => set(k, e.target.value) });

const sServices = cfg => h('div', {}, title('چه خدماتی نیاز دارید؟', 'یک یا چند مورد را انتخاب کنید.'),
  field('', choices({ options: cfg.services, multi: true, value: state.services, variant: 'cards', onchange: v => set('services', v),
    render: o => [icon(o.id), h('b', {}, o.label), h('small', {}, o.desc)] }), helpButton(cfg.helps.services)));

const sProperty = cfg => {
  const area = h('input', { class: 'in', value: state.area, inputmode: 'decimal', autocomplete: 'off', placeholder: 'مثلاً ۱۲۰', 'aria-label': 'متراژ', oninput: e => set('area', e.target.value) });
  const use = v => { area.value = fa(v); set('area', String(v)); };
  return h('div', {}, title('مشخصات ملک', 'اطلاعات تقریبی هم کافی است.'),
    field('نوع ملک', choices({ options: cfg.propertyTypes, value: state.propertyType, onchange: v => set('propertyType', v) })),
    field('متراژ', h('div', { class: 'with-unit' }, area, h('span', { class: 'unit' }, 'متر مربع')), helpButton(cfg.helps.area, { onUse: use }),
      'بلد نیستید اندازه بگیرید؟ روی «؟» بزنید.'),
    field('شهر', text('city', { ph: 'مثلاً اردبیل', ac: 'address-level2' })),
    field('وضعیت ملک (اختیاری)', choices({ options: cfg.propertyStates, value: state.propertyState, optional: true, onchange: v => set('propertyState', v) })),
    field('تعداد اتاق خواب (اختیاری)', choices({ options: cfg.rooms, value: state.rooms, optional: true, onchange: v => set('rooms', v) })));
};

const sStyle = cfg => h('div', {}, title('سبک و بودجه', 'سلیقه شما مسیر طراحی را مشخص می‌کند.'),
  field('سبک طراحی (حداکثر ۲ مورد)', choices({ options: cfg.styles, multi: true, max: 2, exclusive: 'unsure', value: state.styles, variant: 'cards', onchange: v => set('styles', v),
    render: o => [h('b', {}, o.label), h('small', {}, o.desc), o.palette.length ? h('span', { class: 'pal' }, o.palette.map(c => h('i', { style: `background:${c}` }))) : null] }), helpButton(cfg.helps.style)),
  field('بودجه تقریبی پروژه', choices({ options: cfg.budgets, value: state.budget, onchange: v => set('budget', v) }), helpButton(cfg.helps.budget)),
  field('زمان شروع', choices({ options: cfg.timelines, value: state.timeline, onchange: v => set('timeline', v) })));

const sDetails = () => h('div', {}, title('توضیحات بیشتر', 'همه این بخش اختیاری است.'),
  field('خواسته‌ها و نکات مهم', h('textarea', { class: 'in', maxlength: '1000', placeholder: 'مثلاً تعداد اعضای خانواده، فضاهای موردنیاز، رنگ‌های موردعلاقه…', oninput: e => set('notes', e.target.value) }, state.notes)),
  field('لینک نمونه‌های موردعلاقه', text('refs', { ph: 'پینترست، اینستاگرام و…', ltr: true, mode: 'url' })),
  h('p', { class: 'tip' }, 'نقشه و عکس ملک را بعد از ثبت سفارش، با ذکر کد پیگیری، در تلگرام یا واتساپ برایمان بفرستید.'));

const row = (label, val, to, redraw) => val ? h('div', {}, h('dt', {}, label), h('dd', {}, val), h('button', { type: 'button', onclick: () => { step = to; save(); redraw(); scrollTo(0, 0); } }, 'ویرایش')) : null;

const sContact = (cfg, redraw) => {
  const prop = [lab(cfg.propertyTypes, state.propertyType), state.city, state.area && fa(num(state.area)) + ' متر'].filter(Boolean).join('، ');
  return h('div', {}, title('اطلاعات تماس', 'برای هماهنگی سفارش با شما تماس می‌گیریم.'),
    field('نام و نام خانوادگی', text('name', { ac: 'name', ph: 'مثلاً علی رضایی' })),
    field('شماره موبایل', text('phone', { ac: 'tel', ph: '09123456789', ltr: true, mode: 'tel' }), helpButton(cfg.helps.contact)),
    field('ترجیح می‌دهید از چه راهی تماس بگیریم؟', choices({ options: cfg.contactMethods, value: state.contactMethod, onchange: v => set('contactMethod', v || 'call') })),
    field('بهترین زمان تماس', choices({ options: cfg.contactTimes, value: state.contactTime, onchange: v => set('contactTime', v || 'any') })),
    field('آی‌دی تلگرام (اختیاری)', text('telegramId', { ph: 'username', ltr: true })),
    h('input', { class: 'hp', name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true', oninput: e => set('website', e.target.value) }),
    h('h3', { class: 'sum-t' }, 'خلاصه سفارش'),
    h('dl', { class: 'sum' },
      row('خدمات', state.services.map(i => lab(cfg.services, i)).join('، '), 0, redraw),
      row('ملک', prop, 1, redraw),
      row('سبک', state.styles.map(i => lab(cfg.styles, i)).join('، '), 2, redraw),
      row('بودجه', lab(cfg.budgets, state.budget), 2, redraw),
      row('زمان شروع', lab(cfg.timelines, state.timeline), 2, redraw)));
};

const STEP_VIEWS = [sServices, sProperty, sStyle, sDetails, sContact];

function validate(i) {
  if (i === 0 && !state.services.length) return 'حداقل یک خدمت را انتخاب کنید.';
  if (i === 1) {
    if (!state.propertyType) return 'نوع ملک را انتخاب کنید.';
    const a = num(state.area);
    if (!(a >= 5 && a <= 10000)) return 'متراژ را به متر مربع وارد کنید (بین ۵ تا ۱۰٬۰۰۰).';
  }
  if (i === 2) {
    if (!state.styles.length) return 'حداقل یک سبک را انتخاب کنید (یا «هنوز نمی‌دانم»).';
    if (!state.budget) return 'بودجه تقریبی را انتخاب کنید.';
    if (!state.timeline) return 'زمان شروع را انتخاب کنید.';
  }
  if (i === 4) {
    if (state.name.trim().length < 2) return 'نام خود را وارد کنید.';
    if (!phoneOk(state.phone)) return 'شماره موبایل معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹).';
  }
  return '';
}

function draw(cfg, site) {
  const redraw = () => draw(cfg, site);
  const last = step === STEPS - 1;
  const err = h('p', { class: 'o-err', role: 'alert' });
  const go = d => { step += d; save(); redraw(); scrollTo(0, 0); };
  const next = h('button', { class: 'btn primary', type: 'button' }, last ? 'ثبت نهایی سفارش' : 'ادامه');
  next.addEventListener('click', () => {
    const msg = validate(step);
    err.textContent = msg;
    if (msg) { err.classList.remove('shake'); void err.offsetWidth; err.classList.add('shake'); return; }
    last ? send(next, err, site) : go(1);
  });
  app.replaceChildren(h('section', { class: 'order' },
    h('header', { class: 'o-head' },
      h('h1', { class: 'o-title' }, 'ثبت سفارش'),
      h('p', { class: 'o-meta' }, h('span', {}, `مرحله ${fa(step + 1)} از ${fa(STEPS)}`), h('span', {}, cfg.steps[step])),
      h('div', { class: 'o-steps', 'aria-hidden': 'true' }, cfg.steps.map((_, i) => h('i', { class: i < step ? 'done' : i === step ? 'cur' : '' })))),
    h('div', { class: 'step' }, STEP_VIEWS[step](cfg, redraw)),
    h('div', { class: 'o-bar' }, h('div', {}, err,
      h('div', { class: 'o-btns' },
        h('button', { class: 'btn', type: 'button', onclick: () => step ? go(-1) : (location.hash = '/') }, step ? 'قبلی' : 'انصراف'), next)))));
}

async function send(btn, err, site) {
  btn.disabled = true; btn.textContent = 'در حال ثبت…';
  try {
    const d = await submitOrder({ ...state, phone: toEn(state.phone).replace(/[\s-]/g, ''), area: num(state.area) });
    try { sessionStorage.removeItem(DRAFT); } catch {}
    state = blank(); step = 0;
    done(d.code, site);
  } catch (e) {
    err.textContent = e.status ? e.message : 'اتصال برقرار نشد. اینترنت را بررسی کنید و دوباره تلاش کنید.';
    btn.disabled = false; btn.textContent = 'ثبت نهایی سفارش';
  }
}

// ---------- صفحه موفقیت ----------
function done(code, site) {
  const oc = site.orderContact || {};
  const copy = h('button', { class: 'code', type: 'button', 'aria-label': 'کپی کد پیگیری', onclick: () => {
    navigator.clipboard?.writeText(code).then(() => { copy.dataset.ok = '1'; setTimeout(() => delete copy.dataset.ok, 1400); });
  } }, code);
  scrollTo(0, 0);
  app.replaceChildren(h('section', { class: 'order done' },
    svg('<svg class="ok" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M15 27l8 8 14-16"/></svg>'),
    h('h1', {}, 'سفارش شما ثبت شد'),
    h('p', { class: 'lead' }, 'کد پیگیری شما (برای کپی لمس کنید):'),
    copy,
    h('ol', { class: 'guide next-steps' },
      ['ما در اولین فرصت با شماره‌ای که وارد کردید تماس می‌گیریم.',
       'نقشه، عکس ملک و نمونه‌های موردعلاقه را (اگر دارید) با ذکر کد پیگیری برایمان بفرستید.',
       'بعد از گفتگو، قیمت و زمان‌بندی نهایی را هماهنگ می‌کنیم.'].map((t, i) => h('li', {}, h('b', {}, fa(i + 1)), h('span', {}, t)))),
    h('div', { class: 'done-btns' },
      oc.telegram && h('a', { class: 'btn primary', href: `https://t.me/${oc.telegram}`, target: '_blank', rel: 'noopener' }, 'ارسال نقشه و عکس در تلگرام'),
      oc.whatsapp && h('a', { class: 'btn', href: `https://wa.me/${oc.whatsapp}`, target: '_blank', rel: 'noopener' }, 'ارسال در واتساپ'),
      h('a', { class: 'btn', href: '#/' }, 'بازگشت به نمونه‌کارها'))));
}
