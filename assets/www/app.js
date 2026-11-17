/* Infantino-Fit — application de suivi musculation (hors ligne) */
'use strict';

/* ---------- utilitaires ---------- */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const AND = window.Android || null;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const num = v => { if (v === '' || v == null) return null; const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };
const fmt = (n, d = 1) => n == null || n === '' ? '' : (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toString().replace('.', ',');
const fmtInt = n => Math.round(n).toLocaleString('fr-BE');
const pad = n => String(n).padStart(2, '0');
const mmss = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + pad(s % 60); };
const hms = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600); return h ? h + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60) : mmss(s); };
const dayKey = ts => { const d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const today = () => dayKey(Date.now());
const fdate = (ts, o) => new Date(ts).toLocaleDateString('fr-BE', o || { weekday: 'short', day: 'numeric', month: 'short' });
const parseTime = (v, asMin) => {
  if (v === '' || v == null) return null; v = String(v).trim().replace(',', '.');
  if (v.includes(':')) { const [m, s] = v.split(':'); return (parseInt(m) || 0) * 60 + (parseInt(s) || 0); }
  const n = parseFloat(v); if (isNaN(n)) return null; return asMin ? Math.round(n * 60) : Math.round(n);
};
const repLow = r => { const m = String(r || '').match(/\d+/); return m ? parseInt(m[0]) : null; };
const e1rm = (w, r) => (w && r) ? w * (1 + Math.min(r, 15) / 30) : 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hidden'), 2200); }
window.toast = toast;

/* ---------- libellés ---------- */
const MUS = { chest: 'Pectoraux', lats: 'Dorsaux', 'middle back': 'Milieu du dos', 'lower back': 'Lombaires', traps: 'Trapèzes', shoulders: 'Épaules', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Avant-bras', abdominals: 'Abdos', quadriceps: 'Quadriceps', hamstrings: 'Ischios', glutes: 'Fessiers', calves: 'Mollets', adductors: 'Adducteurs', abductors: 'Abducteurs', neck: 'Cou' };
const GROUPS = [
  ['chest', 'Pectoraux', ['chest']], ['back', 'Dos', ['lats', 'middle back', 'lower back', 'traps']], ['shoulders', 'Épaules', ['shoulders']],
  ['biceps', 'Biceps', ['biceps']], ['triceps', 'Triceps', ['triceps']], ['forearms', 'Avant-bras', ['forearms']], ['abs', 'Abdos', ['abdominals']],
  ['quads', 'Quadriceps', ['quadriceps']], ['hams', 'Ischios', ['hamstrings']], ['glutes', 'Fessiers', ['glutes', 'adductors', 'abductors']], ['calves', 'Mollets', ['calves']]
];
const EQ = { barbell: 'Barre', dumbbell: 'Haltères', cable: 'Poulie', machine: 'Machine', 'body only': 'Poids du corps', kettlebells: 'Kettlebell', bands: 'Élastiques', 'e-z curl bar': 'Barre EZ', 'medicine ball': 'Médecine-ball', 'exercise ball': 'Swiss ball', 'foam roll': 'Rouleau', other: 'Autre' };
const LVL = { beginner: 'Débutant', intermediate: 'Intermédiaire', expert: 'Expert' };
const MODES = { wr: 'Poids + reps', r: 'Reps (poids du corps)', ar: 'Assisté (kg d\'assistance) + reps', t: 'Durée', td: 'Cardio (durée + distance)' };
const STYPE = { n: '', w: 'É', d: 'D', f: 'F' };
const STYPE_L = { n: 'Normale', w: 'Échauffement', d: 'Dégressive', f: 'Jusqu\'à l\'échec' };
const COLORS = ['#e3242f', '#2f8cff', '#19b36b', '#f5a623', '#a259ff', '#ff5fa2', '#14c4d6', '#9aa3b2'];
const MEAS = [['weight', 'Poids', 'kg'], ['fat', 'Masse grasse', '%'], ['waist', 'Tour de taille', 'cm'], ['chest', 'Poitrine', 'cm'], ['arm', 'Bras', 'cm'], ['thigh', 'Cuisse', 'cm'], ['hips', 'Hanches', 'cm'], ['calf', 'Mollet', 'cm']];
const WD = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

/* ---------- base d'exercices ---------- */
const DBMAP = {};
(window.EXDB || []).forEach(e => { DBMAP[e.id] = e; e._s = norm((e.fr || '') + ' ' + e.en); });
function ex(id) {
  if (DBMAP[id]) return DBMAP[id];
  const c = (S.customEx || []).find(c => c.id === id);
  if (c) return c;
  return { id, en: id, fr: 'Exercice inconnu', pm: [], sm: [], n: 0, ins: [] };
}
const exName = e => e.fr || e.en;
function defMode(e) {
  if (e.mode) return e.mode;
  if (e.cat === 'cardio') return 'td';
  if (/plank/i.test(e.en || '')) return 't';
  if (e.eq === 'body only') return 'r';
  return 'wr';
}
function exImg(e, size, still) {
  if (e.img) return `<div class="exi ${size}"><img src="${e.img}" alt=""></div>`;
  if (!e.n) return `<div class="exi ${size}"><div class="ph">🏋️</div></div>`;
  const a = `img/${e.id}/0.webp`, b = `img/${e.id}/1.webp`;
  if (still || e.n < 2) return `<div class="exi ${size}"><img loading="lazy" src="${a}" alt=""></div>`;
  return `<div class="exi ${size}"><img src="${a}" alt=""><img class="b" src="${b}" alt=""></div>`;
}

/* ---------- état & sauvegarde ---------- */
let S;
function defaults() {
  return {
    v: 1, created: Date.now(),
    settings: { rest: 90, sound: true, vibrate: true, keepOn: true, days: [1, 2, 3, 4, 5], goal: 5 },
    templates: [], rotation: [], customEx: [], workouts: [], body: [], active: null
  };
}
function buildDefaultTemplates() {
  return (window.DEFAULT_PROGRAM || []).map(p => ({
    id: uid(), name: p.name, color: p.color, notes: p.notes || '',
    exercises: p.ex.map(x => {
      const e = ex(x.id); const mode = x.mode || defMode(e);
      const sets = []; for (let i = 0; i < x.sets; i++) sets.push({ type: 'n', w: x.w == null ? null : x.w, r: x.r || '', t: x.t || null, d: null });
      return { exId: x.id, mode, rest: x.rest == null ? 90 : x.rest, notes: x.notes || '', sets };
    })
  }));
}
function migrate(o) {
  const d = defaults();
  o = Object.assign(d, o || {});
  o.settings = Object.assign(defaults().settings, o.settings || {});
  ['templates', 'rotation', 'customEx', 'workouts', 'body'].forEach(k => { if (!Array.isArray(o[k])) o[k] = []; });
  o.rotation = o.rotation.filter(id => o.templates.some(t => t.id === id));
  return o;
}
function load() {
  let raw = '';
  try { if (AND) raw = AND.loadData(); } catch (e) { }
  if (!raw) try { raw = localStorage.getItem('infantinofit') || ''; } catch (e) { }
  if (raw) { try { S = migrate(JSON.parse(raw)); return; } catch (e) { } }
  S = defaults();
  S.templates = buildDefaultTemplates();
  S.rotation = S.templates.map(t => t.id);
  saveNow();
}
let saveT;
function save() { clearTimeout(saveT); saveT = setTimeout(saveNow, 350); }
function saveNow() {
  clearTimeout(saveT);
  const j = JSON.stringify(S);
  try { localStorage.setItem('infantinofit', j); } catch (e) { }
  try { if (AND) AND.saveData(j); } catch (e) { }
}

/* ---------- navigation ---------- */
let stack = [{ name: 'home', p: {} }];
const curV = () => stack[stack.length - 1];
function nav(name, p) { curV().scroll = $('#view').scrollTop; stack.push({ name, p: p || {} }); render(true); }
function back() { if (stack.length > 1) { stack.pop(); render(false); return true; } return false; }
function tab(name) { stack = [{ name, p: {} }]; render(true); }
function setHeader(title, o) {
  o = o || {};
  const b = stack.length > 1 ? '<button class="back" data-a="back">‹</button>' : '<img class="logo" src="logo.png" alt="">';
  $('#top').innerHTML = `${b}<h1>${esc(title)}</h1>${o.right || ''}`;
}
function render(resetScroll) {
  const v = curV();
  $('#view').oninput = null; $('#view').onchange = null;
  const html = SCREENS[v.name](v.p);
  $('#view').innerHTML = html;
  $('#view').scrollTop = resetScroll ? 0 : (v.scroll || 0);
  const tabName = stack[0].name;
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tabName));
  if (AFTER[v.name]) AFTER[v.name](v.p);
  updateActiveBar();
}
function rerender() { const sc = $('#view').scrollTop; render(false); $('#view').scrollTop = sc; }
window.handleBack = function () {
  if (!$('#sheet').classList.contains('hidden')) { closeSheet(); return true; }
  if (back()) return true;
  if (stack[0].name !== 'home') { tab('home'); return true; }
  return false;
};

/* ---------- feuille modale ---------- */
let sheetOnClose = null;
function openSheet(html, onClose) {
  const s = $('#sheet');
  s.innerHTML = `<div class="panel"><div class="grip"></div>${html}</div>`;
  s.classList.remove('hidden'); sheetOnClose = onClose || null;
}
function closeSheet() { $('#sheet').classList.add('hidden'); $('#sheet').innerHTML = ''; const f = sheetOnClose; sheetOnClose = null; if (f) f(); }
$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });
function confirmBox(title, text, okLabel, onOk, danger) {
  openSheet(`<h2>${esc(title)}</h2><p class="muted">${esc(text)}</p>
    <div class="row" style="margin-top:16px"><button class="btn ghost grow" data-a="closeSheet">Annuler</button>
    <button class="btn ${danger ? 'red' : 'green'} grow" id="cOk">${esc(okLabel)}</button></div>`);
  $('#cOk').onclick = () => { closeSheet(); onOk(); };
}

/* ---------- planning & rotation ---------- */
function rotationTpls() { return S.rotation.map(id => S.templates.find(t => t.id === id)).filter(Boolean); }
function nextTemplate() {
  const rot = rotationTpls(); if (!rot.length) return null;
  const last = S.workouts.slice().sort((a, b) => b.start - a.start).find(w => S.rotation.includes(w.tplId));
  if (!last) return rot[0];
  const i = rot.findIndex(t => t.id === last.tplId);
  return rot[(i + 1) % rot.length];
}
function workoutsByDay() { const m = {}; S.workouts.forEach(w => { const k = dayKey(w.start); (m[k] = m[k] || []).push(w); }); return m; }
function isPlanDay(d) { return S.settings.days.includes(d.getDay()); }
/* projette la rotation sur les jours d'entraînement à venir */
function projectedPlan(daysAhead) {
  const res = {}; const rot = rotationTpls(); if (!rot.length) return res;
  let t = nextTemplate(); let i = rot.indexOf(t);
  const byDay = workoutsByDay();
  const d = new Date(); d.setHours(12, 0, 0, 0);
  for (let k = 0; k < daysAhead; k++) {
    const key = dayKey(d);
    if (isPlanDay(d) && !(k === 0 && byDay[key])) { res[key] = rot[i % rot.length]; i++; }
    d.setDate(d.getDate() + 1);
  }
  return res;
}

/* ---------- statistiques ---------- */
function setVolume(s, mode) { return (mode === 'wr' && s.w && s.r) ? s.w * s.r : 0; }
function woVolume(w) { let v = 0; w.exercises.forEach(x => x.sets.forEach(s => { if (s.done !== false) v += setVolume(s, x.mode); })); return v; }
function woSets(w) { let n = 0; w.exercises.forEach(x => x.sets.forEach(s => { if (s.done !== false && s.type !== 'w') n++; })); return n; }
function exHistory(exId, beforeTs) {
  const out = [];
  S.workouts.forEach(w => {
    if (beforeTs && w.start >= beforeTs) return;
    w.exercises.forEach(x => { if (x.exId === exId) out.push({ w, x }); });
  });
  return out.sort((a, b) => b.w.start - a.w.start);
}
function prevSets(exId, beforeTs) { const h = exHistory(exId, beforeTs); return h.length ? h[0].x.sets : null; }
function exRecords(exId, beforeTs) {
  const r = { maxW: 0, best1rm: 0, bestVol: 0, maxR: 0, maxT: 0, maxD: 0, sessions: 0, bestSet: null };
  exHistory(exId, beforeTs).forEach(({ x }) => {
    r.sessions++; let vol = 0;
    x.sets.forEach(s => {
      if (s.type === 'w') return;
      if (x.mode === 'wr') {
        if ((s.w || 0) > r.maxW) r.maxW = s.w;
        const o = e1rm(s.w, s.r); if (o > r.best1rm) { r.best1rm = o; r.bestSet = s; }
        vol += setVolume(s, 'wr');
      }
      if ((s.r || 0) > r.maxR) r.maxR = s.r;
      if ((s.t || 0) > r.maxT) r.maxT = s.t;
      if ((s.d || 0) > r.maxD) r.maxD = s.d;
    });
    if (vol > r.bestVol) r.bestVol = vol;
  });
  return r;
}
function weekStart(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return d.getTime(); }
function setStr(s, mode) {
  if (!s) return '—';
  if (mode === 'wr') return (s.w != null ? fmt(s.w, 2) + ' kg' : '?') + ' × ' + (s.r != null ? s.r : '?');
  if (mode === 'ar') return '-' + (s.w != null ? fmt(s.w, 2) : '?') + ' kg × ' + (s.r != null ? s.r : '?');
  if (mode === 'r') return (s.r != null ? s.r : '?') + ' reps';
  if (mode === 't') return s.t != null ? mmss(s.t) : '—';
  if (mode === 'td') return (s.t != null ? (s.t >= 60 ? Math.round(s.t / 60) + ' min' : mmss(s.t)) : '') + (s.d ? ' · ' + fmt(s.d, 2) + ' km' : '');
  return '';
}

/* ======================= ÉCRANS ======================= */
const SCREENS = {}, AFTER = {};

/* ---------- Accueil ---------- */
SCREENS.home = () => {
  setHeader('Infantino-Fit');
  const nt = nextTemplate();
  const byDay = workoutsByDay();
  const plan = projectedPlan(8);
  const tk = today();
  const doneToday = byDay[tk];
  const planToday = isPlanDay(new Date());
  let heroLbl = planToday && !doneToday ? 'Séance du jour' : doneToday ? 'Bravo, séance faite aujourd\'hui 💪' : 'Jour de repos — prochaine séance';
  let h = '';
  if (S.active) {
    h += `<div class="card hero"><div class="lbl">Séance en cours</div><h2>${esc(S.active.name)}</h2>
      <p class="muted small">Commencée à ${new Date(S.active.start).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })} · <span class="woclock">${hms((Date.now() - S.active.start) / 1000)}</span></p>
      <button class="btn red block" data-a="openActive">Reprendre la séance</button></div>`;
  } else if (nt) {
    h += `<div class="card hero"><div class="lbl">${heroLbl}</div><h2>${esc(nt.name)}</h2>
      <p class="muted small">${nt.exercises.map(x => esc(exName(ex(x.exId)))).join(' · ')}</p>
      <button class="btn red block" data-a="startTpl" data-id="${nt.id}">▶ Démarrer</button></div>`;
  }
  // semaine
  const ws = weekStart(Date.now()); let cnt = 0;
  let wk = '<div class="week">';
  for (let i = 0; i < 7; i++) {
    const d = new Date(ws); d.setDate(d.getDate() + i); const k = dayKey(d);
    const done = !!byDay[k]; if (done) cnt++;
    const cls = [done ? 'done' : '', !done && plan[k] ? 'plan' : '', k === tk ? 'today' : ''].join(' ');
    wk += `<div class="d ${cls}">${WD[d.getDay()]}<b>${d.getDate()}</b></div>`;
  }
  wk += '</div>';
  h += `<div class="sec">Cette semaine <span class="tiny">${cnt} / ${S.settings.goal} séances</span></div><div class="card">${wk}
    <div class="hbar" style="margin-top:12px"><div class="b"><i style="width:${Math.min(100, cnt / S.settings.goal * 100)}%;background:var(--green)"></i></div><div class="v">${Math.round(Math.min(100, cnt / S.settings.goal * 100))}%</div></div></div>`;
  // stats
  const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
  const mW = S.workouts.filter(w => w.start >= month.getTime());
  const wkVol = S.workouts.filter(w => w.start >= ws).reduce((a, w) => a + woVolume(w), 0);
  h += `<div class="stats"><div class="stat"><b>${S.workouts.length}</b><span>séances au total</span></div>
    <div class="stat"><b>${mW.length}</b><span>ce mois-ci</span></div>
    <div class="stat"><b>${wkVol >= 1000 ? fmt(wkVol / 1000, 1) + ' t' : fmtInt(wkVol) + ' kg'}</b><span>volume semaine</span></div></div>`;
  // démarrage rapide
  h += `<div class="sec">Démarrer une séance <button data-a="tab" data-t="programs">Gérer</button></div>`;
  S.templates.forEach(t => {
    h += `<div class="list-item" data-a="startTpl" data-id="${t.id}"><span class="dot" style="background:${t.color}"></span>
      <div class="grow"><b>${esc(t.name)}</b><div class="tiny">${t.exercises.length} exercices · ${t.exercises.reduce((a, x) => a + x.sets.length, 0)} séries</div></div><span class="muted">▶</span></div>`;
  });
  h += `<button class="btn ghost block" style="margin-top:8px" data-a="startEmpty">+ Séance libre (vide)</button>`;
  // dernière séance
  const last = S.workouts.slice().sort((a, b) => b.start - a.start)[0];
  if (last) {
    h += `<div class="sec">Dernière séance</div>` + woCard(last);
  }
  return h;
};
function woCard(w) {
  const t = S.templates.find(t => t.id === w.tplId);
  return `<div class="list-item" data-a="viewWo" data-id="${w.id}"><span class="dot" style="background:${t ? t.color : '#9aa3b2'}"></span>
    <div class="grow"><b>${esc(w.name)}</b><div class="tiny">${fdate(w.start, { weekday: 'long', day: 'numeric', month: 'long' })} · ${hms(((w.end || w.start) - w.start) / 1000)} · ${woSets(w)} séries · ${fmtInt(woVolume(w))} kg</div></div><span class="muted">›</span></div>`;
}

/* ---------- Programmes ---------- */
SCREENS.programs = () => {
  setHeader('Programmes', { right: '<button class="btn sm red" data-a="newTpl">+ Nouveau</button>' });
  let h = '<p class="muted small">Tes modèles de séance. Touche un programme pour le modifier (exercices, séries, poids, reps, repos).</p>';
  if (!S.templates.length) h += '<div class="empty">Aucun programme.<br><br><button class="btn red" data-a="newTpl">Créer un programme</button></div>';
  S.templates.forEach(t => {
    const inRot = S.rotation.includes(t.id);
    h += `<div class="card tpl" style="border-color:${t.color}"><div class="row"><b class="grow" style="font-size:16px">${esc(t.name)}</b>
      ${inRot ? `<span class="tag">Rotation n°${S.rotation.indexOf(t.id) + 1}</span>` : ''}</div>
      <div class="names">${t.exercises.map(x => esc(exName(ex(x.exId))) + ' <span class="tiny">' + x.sets.length + 'x' + esc(x.sets[0] ? (x.sets[0].r || (x.sets[0].t ? mmss(x.sets[0].t) : '')) : '') + '</span>').join('<br>') || '<i>Vide</i>'}</div>
      <div class="row"><button class="btn red grow" data-a="startTpl" data-id="${t.id}">▶ Démarrer</button>
      <button class="btn grow" data-a="editTpl" data-id="${t.id}">✏️ Modifier</button>
      <button class="btn" data-a="tplMenu" data-id="${t.id}">⋯</button></div></div>`;
  });
  h += `<button class="btn ghost block" data-a="nav" data-v="library" style="margin-top:6px">📚 Bibliothèque d'exercices (${(window.EXDB || []).length + S.customEx.length})</button>`;
  return h;
};

/* ---------- Édition d'un programme ---------- */
SCREENS.tplEdit = p => {
  const t = S.templates.find(t => t.id === p.id);
  if (!t) { setHeader('Programme'); return '<div class="empty">Programme introuvable</div>'; }
  setHeader('Modifier', { right: `<button class="btn sm" data-a="tplMenu" data-id="${t.id}">⋯</button>` });
  let h = `<div class="field"><label>Nom du programme</label><input data-tf="name" value="${esc(t.name)}"></div>
    <div class="field"><label>Couleur</label><div class="row">${COLORS.map(c => `<button data-a="tplColor" data-c="${c}" style="width:32px;height:32px;border-radius:50%;background:${c};${c === t.color ? 'outline:3px solid #fff' : ''}"></button>`).join('')}</div></div>
    <div class="field"><label>Notes (échauffement, consignes…)</label><textarea data-tf="notes">${esc(t.notes)}</textarea></div>`;
  t.exercises.forEach((x, i) => { h += tplExCard(x, i); });
  h += `<button class="btn red block" data-a="addEx" data-ctx="tpl" style="margin-top:6px">+ Ajouter des exercices</button>
    <button class="btn green block" data-a="startTpl" data-id="${t.id}" style="margin-top:10px">▶ Démarrer cette séance</button>`;
  return h;
};
function tplExCard(x, i) {
  const e = ex(x.exId);
  let rows = '';
  const hdr = x.mode === 'wr' ? '<th>kg</th><th>Reps</th>' : x.mode === 'ar' ? '<th>Assist. kg</th><th>Reps</th>' : x.mode === 'r' ? '<th>Reps</th>' : x.mode === 't' ? '<th>Durée (m:ss)</th>' : '<th>Min</th><th>km</th>';
  x.sets.forEach((s, j) => {
    let cells = '';
    if (x.mode === 'wr' || x.mode === 'ar') cells = `<td><input inputmode="decimal" data-ts="w" data-i="${i}" data-j="${j}" value="${fmt(s.w, 2)}" placeholder="kg"></td><td><input data-ts="r" data-i="${i}" data-j="${j}" value="${esc(s.r)}" placeholder="8-10"></td>`;
    else if (x.mode === 'r') cells = `<td><input data-ts="r" data-i="${i}" data-j="${j}" value="${esc(s.r)}" placeholder="10"></td>`;
    else if (x.mode === 't') cells = `<td><input data-ts="t" data-i="${i}" data-j="${j}" value="${s.t != null ? mmss(s.t) : ''}" placeholder="0:45"></td>`;
    else cells = `<td><input inputmode="decimal" data-ts="tm" data-i="${i}" data-j="${j}" value="${s.t != null ? fmt(s.t / 60, 1) : ''}" placeholder="15"></td><td><input inputmode="decimal" data-ts="d" data-i="${i}" data-j="${j}" value="${fmt(s.d, 2)}" placeholder="km"></td>`;
    rows += `<tr><td><button class="sn ${s.type}" data-a="tplSetType" data-i="${i}" data-j="${j}">${STYPE[s.type] || (x.sets.slice(0, j + 1).filter(z => z.type !== 'w').length)}</button></td>${cells}
      <td><button class="ck" data-a="tplDelSet" data-i="${i}" data-j="${j}">✕</button></td></tr>`;
  });
  return `<div class="exc"><div class="hd">${'<span data-a="exInfo" data-id="' + e.id + '">' + exImg(e, 's') + '</span>'}
    <div class="grow"><div class="nm">${esc(exName(e))}</div><div class="en">${esc(MODES[x.mode])} · repos ${x.rest ? mmss(x.rest) : 'aucun'}</div></div>
    <button class="btn sm" data-a="exMenu" data-ctx="tpl" data-i="${i}">⋯</button></div>
    <div class="note2"><input data-tn="${i}" value="${esc(x.notes)}" placeholder="Note (ex : prise serrée, à fond dans la 4e…)"></div>
    <table class="sets"><tr><th>Série</th>${hdr}<th></th></tr>${rows}</table>
    <div class="foot"><button class="btn sm" data-a="tplAddSet" data-i="${i}">+ Ajouter une série</button></div></div>`;
}
AFTER.tplEdit = p => {
  const t = S.templates.find(t => t.id === p.id); if (!t) return;
  $('#view').oninput = ev => {
    const el = ev.target;
    if (el.dataset.tf) { t[el.dataset.tf] = el.value; save(); return; }
    if (el.dataset.tn != null) { t.exercises[+el.dataset.tn].notes = el.value; save(); return; }
    if (el.dataset.ts) {
      const s = t.exercises[+el.dataset.i].sets[+el.dataset.j]; const f = el.dataset.ts;
      if (f === 'w') s.w = num(el.value); else if (f === 'r') s.r = el.value.trim();
      else if (f === 't') s.t = parseTime(el.value, false); else if (f === 'tm') s.t = parseTime(el.value, true); else if (f === 'd') s.d = num(el.value);
      save();
    }
  };
};

/* ---------- Bibliothèque ---------- */
const LIB = { q: '', g: 'all', eq: '' };
SCREENS.library = p => {
  const pick = p.pick;
  setHeader(pick ? (pick === 'replace' ? 'Remplacer par…' : 'Choisir des exercices') : 'Exercices', { right: '<button class="btn sm red" data-a="newCustom">+ Créer</button>' });
  const sel = p.sel || (p.sel = []);
  const chips = [['all', 'Tous'], ['mine', 'Mes exercices'], ...GROUPS.map(g => [g[0], g[1]]), ['cardio', 'Cardio'], ['stretch', 'Étirements']];
  let h = `<div class="search"><input id="libQ" placeholder="🔍 Rechercher (français ou anglais)…" value="${esc(LIB.q)}">
    <div class="chips">${chips.map(c => `<button class="chip ${LIB.g === c[0] ? 'on' : ''}" data-a="libG" data-g="${c[0]}">${c[1]}</button>`).join('')}</div>
    <select id="libEq"><option value="">Tout le matériel</option>${Object.entries(EQ).map(([k, v]) => `<option value="${k}" ${LIB.eq === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    <div id="libList"></div>`;
  if (pick && pick !== 'replace') h += `<div class="selcount ${sel.length ? '' : 'hidden'}" id="selBar"><button class="btn red block" data-a="libAdd">Ajouter <span id="selN">${sel.length}</span> exercice(s)</button></div>`;
  return h;
};
function libFilter() {
  const q = norm(LIB.q).split(/\s+/).filter(Boolean);
  const grp = GROUPS.find(g => g[0] === LIB.g);
  let list = (LIB.g === 'mine' ? [] : (window.EXDB || [])).concat(S.customEx.map(c => (c._s = norm(c.fr), c)));
  if (LIB.g === 'mine') list = S.customEx.slice();
  return list.filter(e => {
    if (q.length && !q.every(w => e._s.includes(w))) return false;
    if (LIB.eq && e.eq !== LIB.eq) return false;
    if (grp && !e.pm.some(m => grp[2].includes(m))) return false;
    if (LIB.g === 'cardio' && e.cat !== 'cardio') return false;
    if (LIB.g === 'stretch' && e.cat !== 'stretching') return false;
    return true;
  }).sort((a, b) => (b.img || b.custom ? 2 : b.fr ? 1 : 0) - (a.img || a.custom ? 2 : a.fr ? 1 : 0) || exName(a).localeCompare(exName(b), 'fr'));
}
function drawLib() {
  const p = curV().p; const sel = p.sel || [];
  const list = libFilter();
  const max = 150; const shown = list.slice(0, p.more ? 2000 : max);
  let h = shown.map(e => `<div class="exrow ${sel.includes(e.id) ? 'sel' : ''}" data-a="libPick" data-id="${e.id}">${exImg(e, 's', true)}
    <div class="grow"><div class="nm">${esc(exName(e))}</div><div class="sub">${e.fr && !e.custom ? esc(e.en) + ' · ' : ''}${esc(e.pm.map(m => MUS[m] || m).join(', '))}${e.eq ? ' · ' + esc(EQ[e.eq] || e.eq) : ''}</div></div>
    <button class="btn sm" data-a="exInfo" data-id="${e.id}">ⓘ</button></div>`).join('');
  if (!list.length) h = '<div class="empty">Aucun exercice trouvé.<br><br><button class="btn red" data-a="newCustom">Créer mon propre exercice</button></div>';
  if (list.length > shown.length) h += `<button class="btn ghost block" data-a="libMore">Afficher les ${list.length - shown.length} autres</button>`;
  $('#libList').innerHTML = `<p class="tiny">${list.length} exercice(s)</p>` + h;
}
AFTER.library = () => {
  drawLib();
  $('#libQ').oninput = e => { LIB.q = e.target.value; curV().p.more = false; drawLib(); };
  $('#libEq').onchange = e => { LIB.eq = e.target.value; drawLib(); };
  $('#view').oninput = null;
};

/* ---------- Fiche exercice ---------- */
let chartMetric = 'maxW';
SCREENS.exInfo = p => {
  const e = ex(p.id);
  setHeader(exName(e), { right: e.custom ? `<button class="btn sm" data-a="editCustom" data-id="${e.id}">✏️</button>` : '' });
  const r = exRecords(e.id);
  const hist = exHistory(e.id);
  const mode = hist.length ? hist[0].x.mode : defMode(e);
  let h = exImg(e, 'l');
  h += `<div style="margin-top:10px">${e.fr && !e.custom ? `<div class="muted small">${esc(e.en)}</div>` : ''}
    <div style="margin-top:6px">${e.pm.map(m => `<span class="tag" style="background:#3a1519;color:#fff">${esc(MUS[m] || m)}</span>`).join('')}${(e.sm || []).map(m => `<span class="tag">${esc(MUS[m] || m)}</span>`).join('')}
    ${e.eq ? `<span class="tag">🔧 ${esc(EQ[e.eq] || e.eq)}</span>` : ''}${e.lv ? `<span class="tag">${LVL[e.lv] || e.lv}</span>` : ''}</div></div>`;
  if (hist.length) {
    h += `<div class="sec">Records</div><div class="card">`;
    if (mode === 'wr') h += `<div class="kv"><span>Charge max</span><b>${fmt(r.maxW, 2)} kg</b></div><div class="kv"><span>1RM estimé</span><b>${fmt(r.best1rm, 1)} kg</b></div>
      <div class="kv"><span>Meilleure série</span><b>${setStr(r.bestSet, 'wr')}</b></div><div class="kv"><span>Meilleur volume (séance)</span><b>${fmtInt(r.bestVol)} kg</b></div>`;
    if (mode === 'r' || mode === 'ar') h += `<div class="kv"><span>Max de reps</span><b>${r.maxR}</b></div>`;
    if (mode === 't' || mode === 'td') h += `<div class="kv"><span>Durée max</span><b>${mmss(r.maxT)}</b></div>`;
    if (mode === 'td') h += `<div class="kv"><span>Distance max</span><b>${fmt(r.maxD, 2)} km</b></div>`;
    h += `<div class="kv"><span>Séances</span><b>${r.sessions}</b></div></div>`;
    h += `<div class="sec">Progression</div><div class="card">${exChartBlock(e.id, mode)}</div>`;
    h += `<div class="sec">Historique</div>`;
    hist.slice(0, 15).forEach(({ w, x }) => {
      h += `<div class="card" data-a="viewWo" data-id="${w.id}"><div class="row"><b class="grow">${fdate(w.start, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</b><span class="tiny">${esc(w.name)}</span></div>
        <div class="small muted" style="margin-top:6px;line-height:1.6">${x.sets.map((s, i) => `<span class="tag">${STYPE[s.type] || (i + 1)} · ${setStr(s, x.mode)}</span>`).join('')}</div></div>`;
    });
  } else h += '<div class="card muted small">Pas encore d\'historique pour cet exercice. Les records et courbes apparaîtront après ta première séance.</div>';
  if (e.ins && e.ins.length) h += `<div class="sec">Exécution ${e.custom ? '' : '<span class="tiny">(anglais)</span>'}</div><div class="card"><ol class="ins">${e.ins.map(i => `<li>${esc(i)}</li>`).join('')}</ol></div>`;
  return h;
};
function exChartBlock(exId, mode) {
  const metrics = mode === 'wr' ? [['maxW', 'Charge max'], ['1rm', '1RM estimé'], ['vol', 'Volume'], ['reps', 'Reps max']] : mode === 'td' || mode === 't' ? [['time', 'Durée'], ['dist', 'Distance']] : [['reps', 'Reps max'], ['tot', 'Reps totales']];
  if (!metrics.some(m => m[0] === chartMetric)) chartMetric = metrics[0][0];
  const pts = exHistory(exId).slice().reverse().map(({ w, x }) => {
    const ss = x.sets.filter(s => s.type !== 'w'); let y = 0;
    if (chartMetric === 'maxW') y = Math.max(0, ...ss.map(s => s.w || 0));
    else if (chartMetric === '1rm') y = Math.max(0, ...ss.map(s => e1rm(s.w, s.r)));
    else if (chartMetric === 'vol') y = ss.reduce((a, s) => a + setVolume(s, x.mode), 0);
    else if (chartMetric === 'reps') y = Math.max(0, ...ss.map(s => s.r || 0));
    else if (chartMetric === 'tot') y = ss.reduce((a, s) => a + (s.r || 0), 0);
    else if (chartMetric === 'time') y = Math.max(0, ...ss.map(s => s.t || 0)) / 60;
    else if (chartMetric === 'dist') y = Math.max(0, ...ss.map(s => s.d || 0));
    return { x: w.start, y };
  });
  return `<div class="chips">${metrics.map(m => `<button class="chip ${m[0] === chartMetric ? 'on' : ''}" data-a="metric" data-m="${m[0]}">${m[1]}</button>`).join('')}</div>${lineChart(pts)}`;
}

/* ---------- Exercice personnalisé ---------- */
SCREENS.customEx = p => {
  const c = p.id ? S.customEx.find(c => c.id === p.id) : null;
  const d = p.draft || (p.draft = c ? Object.assign({}, c) : { id: 'c_' + uid(), custom: true, fr: '', en: '', pm: ['chest'], sm: [], eq: 'machine', mode: 'wr', img: '', ins: [], n: 0 });
  setHeader(c ? 'Modifier l\'exercice' : 'Nouvel exercice');
  return `<div class="field"><label>Nom</label><input id="cxName" value="${esc(d.fr)}" placeholder="Ex : Presse pectoraux Technogym"></div>
    <div class="field"><label>Photo (prends la machine en photo)</label>
      <div class="row">${d.img ? `<div class="exi m"><img src="${d.img}"></div>` : '<div class="exi m"><div class="ph">📷</div></div>'}
      <label class="btn grow" style="margin:0">📷 Choisir une photo<input type="file" id="cxImg" accept="image/*" class="hidden"></label></div></div>
    <div class="grid2"><div class="field"><label>Muscle principal</label><select id="cxPm">${Object.entries(MUS).map(([k, v]) => `<option value="${k}" ${d.pm[0] === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    <div class="field"><label>Matériel</label><select id="cxEq">${Object.entries(EQ).map(([k, v]) => `<option value="${k}" ${d.eq === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div>
    <div class="field"><label>Type de saisie</label><select id="cxMode">${Object.entries(MODES).map(([k, v]) => `<option value="${k}" ${d.mode === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    <div class="field"><label>Consignes d'exécution (une par ligne)</label><textarea id="cxIns">${esc((d.ins || []).join('\n'))}</textarea></div>
    <button class="btn red block" data-a="saveCustom">Enregistrer</button>
    ${c ? '<button class="btn ghost block danger" style="margin-top:10px" data-a="delCustom">Supprimer cet exercice</button>' : ''}`;
};
AFTER.customEx = p => {
  const d = p.draft;
  const sync = () => { d.fr = $('#cxName').value.trim(); d.pm = [$('#cxPm').value]; d.eq = $('#cxEq').value; d.mode = $('#cxMode').value; d.ins = $('#cxIns').value.split('\n').map(s => s.trim()).filter(Boolean); };
  $('#view').oninput = sync; $('#view').onchange = sync;
  $('#cxImg').onchange = ev => {
    const f = ev.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const im = new Image();
      im.onload = () => {
        const sc = Math.min(1, 480 / Math.max(im.width, im.height));
        const cv = document.createElement('canvas'); cv.width = Math.round(im.width * sc); cv.height = Math.round(im.height * sc);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        sync(); d.img = cv.toDataURL('image/jpeg', 0.75); rerender();
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(f);
  };
};

/* ---------- Séance (en cours ou édition) ---------- */
function curWo() {
  const v = curV();
  if (v.name === 'workout') return S.active;
  if (v.name === 'woEdit') return S.workouts.find(w => w.id === v.p.id);
  return null;
}
SCREENS.workout = () => {
  const w = S.active;
  if (!w) { setHeader('Séance'); return '<div class="empty">Aucune séance en cours.</div>'; }
  setHeader(w.name, { right: '<button class="btn sm green" data-a="finishWo">Terminer</button>' });
  let h = `<div class="wohead"><div class="grow"><div class="clock woclock">${hms((Date.now() - w.start) / 1000)}</div><div class="tiny">${woSets(doneOnly(w))} séries · ${fmtInt(woVolume(doneOnly(w)))} kg</div></div>
    <button class="btn sm" data-a="quickTimer">⏱ Minuteur</button><button class="btn sm" data-a="woMenu">⋯</button></div>`;
  if (w.tnotes) h += `<div class="card small" style="color:var(--amber)">📝 ${esc(w.tnotes)}</div>`;
  h += woBody(w, true);
  return h;
};
SCREENS.woEdit = p => {
  const w = S.workouts.find(w => w.id === p.id);
  if (!w) { setHeader('Séance'); return '<div class="empty">Séance introuvable</div>'; }
  setHeader('Modifier la séance', { right: '<button class="btn sm green" data-a="back">OK</button>' });
  const d = new Date(w.start);
  let h = `<div class="field"><label>Nom</label><input data-wf="name" value="${esc(w.name)}"></div>
    <div class="grid2"><div class="field"><label>Date</label><input type="date" data-wf="date" value="${dayKey(w.start)}"></div>
    <div class="field"><label>Heure de début</label><input type="time" data-wf="time" value="${pad(d.getHours())}:${pad(d.getMinutes())}"></div></div>
    <div class="field"><label>Durée (minutes)</label><input inputmode="numeric" data-wf="dur" value="${Math.round(((w.end || w.start) - w.start) / 60000)}"></div>`;
  h += woBody(w, false);
  return h;
};
function doneOnly(w) { return { exercises: w.exercises.map(x => ({ mode: x.mode, sets: x.sets.filter(s => s.done) })) }; }
function woBody(w, live) {
  let h = '';
  w.exercises.forEach((x, i) => {
    const e = ex(x.exId);
    const prev = prevSets(x.exId, w.start) || [];
    const rec = exRecords(x.exId, w.start);
    const hdr = x.mode === 'wr' ? '<th>kg</th><th>Reps</th>' : x.mode === 'ar' ? '<th>Assist.</th><th>Reps</th>' : x.mode === 'r' ? '<th>Reps</th>' : x.mode === 't' ? '<th>Durée</th><th></th>' : '<th>Min</th><th>km</th><th></th>';
    let rows = ''; let n = 0;
    x.sets.forEach((s, j) => {
      if (s.type !== 'w') n++;
      const pv = prev[j];
      const phW = pv && pv.w != null ? fmt(pv.w, 2) : fmt(s.tw, 2);
      const phR = s.tr || (pv && pv.r != null ? pv.r : '');
      let cells = '';
      const dis = '';
      if (x.mode === 'wr' || x.mode === 'ar') cells = `<td><input inputmode="decimal" data-sf="w" data-i="${i}" data-j="${j}" value="${fmt(s.w, 2)}" placeholder="${esc(phW)}"${dis}></td><td><input inputmode="numeric" data-sf="r" data-i="${i}" data-j="${j}" value="${s.r == null ? '' : s.r}" placeholder="${esc(phR)}"></td>`;
      else if (x.mode === 'r') cells = `<td><input inputmode="numeric" data-sf="r" data-i="${i}" data-j="${j}" value="${s.r == null ? '' : s.r}" placeholder="${esc(phR)}"></td>`;
      else if (x.mode === 't') cells = `<td><input data-sf="t" data-i="${i}" data-j="${j}" value="${s.t != null ? mmss(s.t) : ''}" placeholder="${s.tt ? mmss(s.tt) : (pv && pv.t ? mmss(pv.t) : '0:30')}"></td><td>${live ? `<button class="go" data-a="workTimer" data-i="${i}" data-j="${j}">▶</button>` : ''}</td>`;
      else cells = `<td><input inputmode="decimal" data-sf="tm" data-i="${i}" data-j="${j}" value="${s.t != null ? fmt(s.t / 60, 1) : ''}" placeholder="${s.tt ? fmt(s.tt / 60, 1) : (pv && pv.t ? fmt(pv.t / 60, 1) : '')}"></td><td><input inputmode="decimal" data-sf="d" data-i="${i}" data-j="${j}" value="${fmt(s.d, 2)}" placeholder="${pv && pv.d ? fmt(pv.d, 2) : 'km'}"></td><td>${live ? `<button class="go" data-a="workTimer" data-i="${i}" data-j="${j}">▶</button>` : ''}</td>`;
      const isPR = s.done && x.mode === 'wr' && s.type !== 'w' && rec.sessions && s.w > rec.maxW;
      rows += `<tr class="${s.done ? 'done' : ''}" id="set-${i}-${j}"><td><button class="sn ${s.type}" data-a="setMenu" data-i="${i}" data-j="${j}">${STYPE[s.type] || n}</button></td>
        <td class="prev">${pv ? setStr(pv, x.mode) : '—'}${isPR ? '<div class="pr">🏆 PR</div>' : ''}</td>${cells}
        <td><button class="ck" data-a="checkSet" data-i="${i}" data-j="${j}">✓</button></td></tr>`;
    });
    h += `<div class="exc" id="ex-${i}"><div class="hd"><span data-a="exInfo" data-id="${e.id}">${exImg(e, 'm')}</span>
      <div class="grow" data-a="exInfo" data-id="${e.id}"><div class="nm">${esc(exName(e))}</div><div class="en">${esc(e.pm.map(m => MUS[m] || m).join(', '))}</div>
      ${live ? `<div class="restinfo">⏱ Repos ${x.rest ? mmss(x.rest) : 'aucun'}</div>` : ''}</div>
      <button class="btn sm" data-a="exMenu" data-ctx="wo" data-i="${i}">⋯</button></div>
      ${x.tnotes ? `<div class="note">📝 ${esc(x.tnotes)}</div>` : ''}
      <div class="note2"><input data-xn="${i}" value="${esc(x.notes || '')}" placeholder="Ajouter une note…"></div>
      <table class="sets"><tr><th>Série</th><th>Précédent</th>${hdr}<th>✓</th></tr>${rows}</table>
      <div class="foot"><button class="btn sm" data-a="woAddSet" data-i="${i}">+ Série</button></div></div>`;
  });
  h += `<button class="btn red block" data-a="addEx" data-ctx="wo" style="margin-top:6px">+ Ajouter des exercices</button>`;
  if (live) h += `<button class="btn ghost block danger" data-a="discardWo" style="margin-top:10px">Abandonner la séance</button>`;
  else h += `<button class="btn ghost block danger" data-a="delWo" data-id="${w.id}" style="margin-top:10px">Supprimer cette séance</button>`;
  return h;
}
function bindWoInputs() {
  $('#view').oninput = ev => {
    const w = curWo(); if (!w) return;
    const el = ev.target;
    if (el.dataset.xn != null) { w.exercises[+el.dataset.xn].notes = el.value; save(); return; }
    if (el.dataset.wf) {
      const f = el.dataset.wf, dur = (w.end || w.start) - w.start;
      if (f === 'name') w.name = el.value;
      else if (f === 'date' && el.value) { const d = new Date(w.start); const [y, m, dd] = el.value.split('-').map(Number); d.setFullYear(y, m - 1, dd); w.start = d.getTime(); w.end = w.start + dur; }
      else if (f === 'time' && el.value) { const d = new Date(w.start); const [hh, mm] = el.value.split(':').map(Number); d.setHours(hh, mm); w.start = d.getTime(); w.end = w.start + dur; }
      else if (f === 'dur') { const m = num(el.value); if (m != null) w.end = w.start + m * 60000; }
      save(); return;
    }
    if (!el.dataset.sf) return;
    const s = w.exercises[+el.dataset.i].sets[+el.dataset.j]; const f = el.dataset.sf;
    if (f === 'w') s.w = num(el.value); else if (f === 'r') s.r = num(el.value);
    else if (f === 't') s.t = parseTime(el.value, false); else if (f === 'tm') s.t = parseTime(el.value, true); else if (f === 'd') s.d = num(el.value);
    save();
  };
}
AFTER.workout = bindWoInputs;
AFTER.woEdit = bindWoInputs;

function startWorkout(tpl) {
  if (S.active) { toast('Une séance est déjà en cours'); nav('workout'); return; }
  const w = { id: uid(), tplId: tpl ? tpl.id : null, name: tpl ? tpl.name : 'Séance libre', start: Date.now(), tnotes: tpl ? tpl.notes : '', exercises: [] };
  if (tpl) tpl.exercises.forEach(x => w.exercises.push({
    exId: x.exId, mode: x.mode, rest: x.rest, tnotes: x.notes, notes: '',
    sets: x.sets.map(s => ({ type: s.type, tw: s.w, tr: s.r, tt: s.t, w: null, r: null, t: null, d: null, done: false }))
  }));
  S.active = w; saveNow();
  keepOn(true);
  stack = [{ name: 'home', p: {} }, { name: 'workout', p: {} }]; render(true);
}
function newWoExercise(exId) {
  const e = ex(exId); const mode = defMode(e);
  const pv = prevSets(exId);
  const n = pv ? pv.length : 3;
  const sets = []; for (let k = 0; k < n; k++) sets.push({ type: pv ? pv[k].type : 'n', w: null, r: null, t: null, d: null, done: false });
  return { exId, mode: pv ? (exHistory(exId)[0].x.mode) : mode, rest: S.settings.rest, notes: '', sets };
}
function checkSet(i, j, wo) {
  const w = wo || curWo(); if (!w) return; const x = w.exercises[i]; const s = x.sets[j];
  if (s.done) { s.done = false; save(); rerender(); return; }
  const pv = (prevSets(x.exId, w.start) || [])[j];
  if (x.mode === 'wr' || x.mode === 'ar') {
    if (s.w == null) s.w = pv && pv.w != null ? pv.w : (s.tw != null ? s.tw : null);
    if (s.r == null) s.r = pv && pv.r != null ? pv.r : repLow(s.tr);
  } else if (x.mode === 'r') { if (s.r == null) s.r = pv && pv.r != null ? pv.r : repLow(s.tr); }
  else { if (s.t == null) s.t = s.tt || (pv ? pv.t : null); if (x.mode === 'td' && s.d == null && pv) s.d = pv.d; }
  s.done = true; s.at = Date.now();
  save();
  if (w === S.active) {
    buzz(40);
    const lastOfAll = i === w.exercises.length - 1 && j === x.sets.length - 1;
    if (x.rest && !lastOfAll) startTimer('rest', x.rest, nextLabel(w, i, j));
  }
  rerender();
}
function nextLabel(w, i, j) {
  const x = w.exercises[i];
  if (j + 1 < x.sets.length) return 'Ensuite : ' + exName(ex(x.exId)) + ' — série ' + (j + 2);
  const nx = w.exercises[i + 1]; return nx ? 'Ensuite : ' + exName(ex(nx.exId)) : 'Dernier exercice';
}
function finishWorkout() {
  const w = S.active; if (!w) return;
  const anyDone = w.exercises.some(x => x.sets.some(s => s.done));
  const doFinish = () => {
    stopTimer();
    w.end = Date.now();
    const recs = w.exercises.map(x => ({ x, rec: exRecords(x.exId, w.start) }));
    w.exercises.forEach(x => { x.sets = x.sets.filter(s => s.done); });
    w.exercises = w.exercises.filter(x => x.sets.length);
    const prs = [];
    recs.forEach(({ x, rec }) => {
      if (x.mode !== 'wr' || !rec.sessions) return;
      const ss = x.sets.filter(s => s.type !== 'w');
      const mw = Math.max(0, ...ss.map(s => s.w || 0)); const o = Math.max(0, ...ss.map(s => e1rm(s.w, s.r)));
      if (mw > rec.maxW) prs.push(exName(ex(x.exId)) + ' : ' + fmt(mw, 2) + ' kg (charge max)');
      else if (o > rec.best1rm + 0.01) prs.push(exName(ex(x.exId)) + ' : 1RM estimé ' + fmt(o, 1) + ' kg');
    });
    const fw = JSON.parse(JSON.stringify(w));
    fw.exercises.forEach(x => x.sets.forEach(s => { delete s.done; delete s.tw; delete s.tr; delete s.tt; delete s.at; }));
    S.workouts.push(fw); S.active = null; saveNow(); keepOn(false);
    stack = [{ name: 'home', p: {} }]; render(true);
    showSummary(fw, prs);
  };
  if (!anyDone) { confirmBox('Aucune série validée', 'Aucune série n\'est cochée. La séance sera abandonnée.', 'Abandonner', () => { discardWorkout(true); }, true); return; }
  const left = w.exercises.reduce((a, x) => a + x.sets.filter(s => !s.done).length, 0);
  confirmBox('Terminer la séance ?', left ? `${left} série(s) non validée(s) seront ignorées.` : 'Toutes les séries sont validées. Bien joué !', 'Terminer', doFinish);
}
function showSummary(w, prs) {
  const t = S.templates.find(t => t.id === w.tplId);
  let h = `<h2>🎉 Séance terminée !</h2><div class="summary"><div class="grid3" style="text-align:center">
    <div class="stat"><b>${hms((w.end - w.start) / 1000)}</b><span>durée</span></div><div class="stat"><b>${woSets(w)}</b><span>séries</span></div>
    <div class="stat"><b>${fmtInt(woVolume(w))}</b><span>kg soulevés</span></div></div>
    ${prs.length ? `<div class="card"><h3>🏆 Nouveaux records</h3>${prs.map(p => `<div class="small" style="margin:4px 0">${esc(p)}</div>`).join('')}</div>` : ''}</div>`;
  if (t) h += `<div class="card"><b>Mettre à jour le programme ?</b><p class="small muted">Remplace les poids (et ajoute les nouveaux exercices/séries) de « ${esc(t.name)} » par ceux de cette séance pour la prochaine fois.</p>
    <button class="btn green block" id="updTpl">Mettre à jour le programme</button></div>`;
  h += `<div class="row"><button class="btn ghost grow" data-a="shareWo" data-id="${w.id}">Partager</button><button class="btn red grow" data-a="closeSheet">Fermer</button></div>`;
  openSheet(h);
  const b = $('#updTpl'); if (b) b.onclick = () => { updateTemplateFrom(t, w); b.textContent = 'Programme mis à jour ✔'; b.disabled = true; };
}
function updateTemplateFrom(t, w) {
  w.exercises.forEach((x, i) => {
    let tx = t.exercises.find((y, k) => y.exId === x.exId && !y._u);
    if (!tx) { tx = { exId: x.exId, mode: x.mode, rest: x.rest || S.settings.rest, notes: '', sets: [] }; t.exercises.push(tx); }
    tx._u = true;
    x.sets.forEach((s, j) => {
      if (!tx.sets[j]) tx.sets[j] = { type: s.type, w: null, r: s.r != null ? String(s.r) : '', t: null, d: null };
      const ts = tx.sets[j];
      if (s.w != null) ts.w = s.w; if (s.t != null) ts.t = s.t; if (s.d != null) ts.d = s.d;
      if (!ts.r && s.r != null) ts.r = String(s.r);
    });
  });
  t.exercises.forEach(x => delete x._u);
  saveNow();
}
function discardWorkout(silent) {
  const go = () => { stopTimer(); S.active = null; saveNow(); keepOn(false); stack = [{ name: 'home', p: {} }]; render(true); toast('Séance abandonnée'); };
  if (silent) go(); else confirmBox('Abandonner la séance ?', 'Toutes les données de cette séance seront perdues.', 'Abandonner', go, true);
}

/* ---------- Minuteur ---------- */
let T = null, tickI = null, pausedAt = 0;
function startTimer(kind, secs, label, ref) {
  T = { kind, end: Date.now() + secs * 1000, total: secs, label: label || '', ref: ref || null, ended: false };
  if (S.active) { S.active.timer = { kind, end: T.end, total: secs, label: T.label, ref: T.ref }; save(); }
  clearInterval(tickI); tickI = setInterval(tick, 250); tick();
}
function stopTimer() {
  T = null; clearInterval(tickI); const bar = $('#timerBar'); bar.classList.add('hidden'); bar.classList.remove('end'); bar.dataset.built = '';
  if (S.active) delete S.active.timer;
  try { AND && AND.cancelAlarm(); } catch (e) { }
  updateActiveBar();
}
function tick() {
  const bar = $('#timerBar');
  if (!T) { bar.classList.add('hidden'); return; }
  const left = (T.end - Date.now()) / 1000;
  if (left <= 0 && !T.ended) {
    T.ended = true; alertEnd();
    if (T.kind === 'work' && T.ref) {
      const w = S.active; const s = w && w.exercises[T.ref[0]] && w.exercises[T.ref[0]].sets[T.ref[1]];
      if (s && !s.done) { if (s.t == null) s.t = T.total; const r = T.ref; stopTimer(); checkSet(r[0], r[1], S.active); return; }
    }
    bar.classList.add('end');
    setTimeout(() => { if (T && T.ended) stopTimer(); }, 4000);
  }
  bar.classList.remove('hidden'); bar.classList.toggle('work', T.kind === 'work');
  const pct = Math.max(0, Math.min(100, left / T.total * 100));
  if (!bar.dataset.built) {
    bar.innerHTML = `<div class="row"><div class="grow"><div class="tiny" id="tKind" style="color:#cfe0ff"></div><div class="t" id="tT"></div></div>
    <button class="btn sm" data-a="tAdd" data-s="-15">−15</button><button class="btn sm" data-a="tAdd" data-s="15">+15</button><button class="btn sm red" data-a="tSkip">Passer</button></div>
    <div class="bar"><i id="tBar"></i></div><div class="tiny" id="tLbl" style="color:#9fb3d1"></div>`;
    bar.dataset.built = '1';
  }
  $('#tKind').textContent = (T.kind === 'work' ? 'EFFORT' : 'REPOS') + (T.ended ? ' — TERMINÉ !' : '');
  $('#tT').textContent = mmss(Math.max(0, Math.ceil(left)));
  $('#tBar').style.width = pct + '%';
  $('#tLbl').textContent = T.label;
}
function alertEnd() {
  if (S.settings.sound) { try { AND ? AND.beep() : webBeep(); } catch (e) { } }
  if (S.settings.vibrate) buzz(400);
}
function buzz(ms) { if (!S.settings.vibrate) return; try { if (AND) AND.vibrate(ms); else if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { } }
function webBeep() { try { const c = new (window.AudioContext || window.webkitAudioContext)(); const o = c.createOscillator(); o.frequency.value = 880; o.connect(c.destination); o.start(); setTimeout(() => { o.stop(); c.close(); }, 500); } catch (e) { } }
function keepOn(on) { try { AND && AND.keepScreenOn(!!(on && S.settings.keepOn)); } catch (e) { } }
window.onAppPause = () => {
  saveNow();
  if (T && !T.ended && AND) { try { AND.scheduleAlarm(T.end, T.kind === 'work' ? 'Effort terminé' : 'Repos terminé ⏱', T.label || 'Série suivante !'); } catch (e) { } }
};
window.onAppResume = () => {
  try { AND && AND.cancelAlarm(); } catch (e) { }
  if (T && !T.ended && Date.now() >= T.end) { T.ended = true; setTimeout(() => { if (T && T.ended) stopTimer(); }, 2500); }
  updateActiveBar();
};

/* ---------- barre "séance en cours" ---------- */
function updateActiveBar() {
  const b = $('#activeBar');
  if (!S.active || curV().name === 'workout' || T) { b.classList.add('hidden'); return; }
  b.classList.remove('hidden');
  b.innerHTML = `<span>🏋️</span><div class="grow">${esc(S.active.name)}<div class="tiny" style="color:#ffd6d8">Séance en cours · <span class="woclock">${hms((Date.now() - S.active.start) / 1000)}</span></div></div><span>Reprendre ›</span>`;
  b.onclick = () => nav('workout');
}
setInterval(() => { if (S && S.active) $$('.woclock').forEach(el => el.textContent = hms((Date.now() - S.active.start) / 1000)); }, 1000);

/* ---------- Historique & calendrier ---------- */
let calMonth = null;
SCREENS.history = () => {
  setHeader('Historique');
  if (!calMonth) { const d = new Date(); calMonth = new Date(d.getFullYear(), d.getMonth(), 1).getTime(); }
  const m = new Date(calMonth); const byDay = workoutsByDay(); const plan = projectedPlan(62); const tk = today();
  let h = `<div class="card"><div class="calnav"><button class="btn sm" data-a="calMove" data-d="-1">‹</button><b>${m.toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' })}</b><button class="btn sm" data-a="calMove" data-d="1">›</button></div><div class="cal">`;
  ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach(d => h += `<div class="h">${d}</div>`);
  const first = new Date(m); const off = (first.getDay() + 6) % 7; first.setDate(1 - off);
  for (let i = 0; i < 42; i++) {
    const d = new Date(first); d.setDate(first.getDate() + i); const k = dayKey(d);
    if (i >= 35 && d.getMonth() !== m.getMonth()) break;
    const ws = byDay[k];
    const cls = ['c', d.getMonth() !== m.getMonth() ? 'o' : '', ws ? 'done' : '', !ws && plan[k] ? 'plan' : '', k === tk ? 'today' : ''].join(' ');
    const st = ws ? `style="background:${(S.templates.find(t => t.id === ws[0].tplId) || {}).color || 'var(--green)'}"` : '';
    h += `<div class="${cls}" ${st} data-a="calDay" data-k="${k}">${d.getDate()}${!ws && plan[k] ? `<span class="tiny" style="font-size:9px">${esc((plan[k].name.match(/Jour\s*\d+/) || [plan[k].name.slice(0, 4)])[0].replace('Jour ', 'J'))}</span>` : ''}</div>`;
  }
  h += `</div><div class="tiny" style="margin-top:10px">■ couleur = séance faite · ⬚ pointillés = séance prévue (rotation ${S.settings.days.length} j/sem)</div></div>`;
  const list = S.workouts.slice().sort((a, b) => b.start - a.start);
  const inMonth = list.filter(w => new Date(w.start).getMonth() === m.getMonth() && new Date(w.start).getFullYear() === m.getFullYear());
  h += `<div class="sec">${inMonth.length} séance(s) ce mois <button data-a="addPastWo">+ Ajouter</button></div>`;
  h += inMonth.map(woCard).join('') || '<div class="empty">Aucune séance ce mois-ci.</div>';
  return h;
};
SCREENS.woView = p => {
  const w = S.workouts.find(w => w.id === p.id);
  if (!w) { setHeader('Séance'); return '<div class="empty">Séance supprimée.</div>'; }
  setHeader(w.name, { right: `<button class="btn sm" data-a="editWo" data-id="${w.id}">✏️</button>` });
  let h = `<p class="muted">${fdate(w.start, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} à ${new Date(w.start).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}</p>
    <div class="grid3" style="text-align:center"><div class="stat"><b>${hms(((w.end || w.start) - w.start) / 1000)}</b><span>durée</span></div><div class="stat"><b>${woSets(w)}</b><span>séries</span></div><div class="stat"><b>${fmtInt(woVolume(w))}</b><span>kg</span></div></div>`;
  w.exercises.forEach(x => {
    const e = ex(x.exId); let n = 0;
    h += `<div class="exc"><div class="hd" data-a="exInfo" data-id="${e.id}">${exImg(e, 's', true)}<div class="grow"><div class="nm">${esc(exName(e))}</div></div></div>
      ${x.notes ? `<div class="note">📝 ${esc(x.notes)}</div>` : ''}
      <table class="sets">${x.sets.map(s => { if (s.type !== 'w') n++; return `<tr><td style="width:40px"><span class="sn ${s.type}" style="display:inline-flex;align-items:center;justify-content:center">${STYPE[s.type] || n}</span></td><td style="text-align:left">${setStr(s, x.mode)}</td><td class="tiny">${x.mode === 'wr' && s.w && s.r ? '1RM ≈ ' + fmt(e1rm(s.w, s.r), 1) : ''}</td></tr>`; }).join('')}</table></div>`;
  });
  h += `<div class="row"><button class="btn grow" data-a="shareWo" data-id="${w.id}">Partager</button><button class="btn grow" data-a="redoWo" data-id="${w.id}">↻ Refaire cette séance</button></div>`;
  return h;
};

/* ---------- Progrès ---------- */
let bodyMetric = 'weight', progEx = null;
SCREENS.progress = () => {
  setHeader('Progrès');
  let h = '';
  // corps
  const body = S.body.slice().sort((a, b) => a.date.localeCompare(b.date));
  const lastB = body[body.length - 1];
  const mm = MEAS.find(m => m[0] === bodyMetric);
  h += `<div class="sec">Poids de corps & mensurations <button data-a="addBody">+ Mesure</button></div><div class="card">`;
  if (lastB) {
    const first = body.find(b => b[bodyMetric] != null);
    const lastV = body.slice().reverse().find(b => b[bodyMetric] != null);
    h += `<div class="row"><div class="grow"><div class="tiny">${mm[1]}</div><div class="big">${lastV ? fmt(lastV[bodyMetric], 1) + ' ' + mm[2] : '—'}</div></div>
      ${first && lastV && first !== lastV ? `<div class="tag" style="font-size:13px">${lastV[bodyMetric] - first[bodyMetric] > 0 ? '+' : ''}${fmt(lastV[bodyMetric] - first[bodyMetric], 1)} ${mm[2]} depuis ${fdate(first.date + 'T12:00', { day: 'numeric', month: 'short' })}</div>` : ''}</div>
      <div class="chips">${MEAS.map(m => `<button class="chip ${m[0] === bodyMetric ? 'on' : ''}" data-a="bodyM" data-m="${m[0]}">${m[1]}</button>`).join('')}</div>
      ${lineChart(body.filter(b => b[bodyMetric] != null).map(b => ({ x: new Date(b.date + 'T12:00').getTime(), y: b[bodyMetric] })), mm[2])}
      <button class="btn ghost block sm" data-a="bodyList" style="margin-top:8px">Voir toutes les mesures (${body.length})</button>`;
  } else h += '<p class="muted small">Ajoute ton poids et tes mensurations pour suivre ton évolution.</p><button class="btn red block" data-a="addBody">+ Première mesure</button>';
  h += '</div>';
  // exercices
  const doneEx = {}; S.workouts.forEach(w => w.exercises.forEach(x => { doneEx[x.exId] = (doneEx[x.exId] || 0) + 1; }));
  const exIds = Object.keys(doneEx).sort((a, b) => doneEx[b] - doneEx[a]);
  h += `<div class="sec">Progression par exercice</div><div class="card">`;
  if (exIds.length) {
    if (!progEx || !doneEx[progEx]) progEx = exIds[0];
    const hist = exHistory(progEx);
    h += `<select id="progSel">${exIds.map(id => `<option value="${esc(id)}" ${id === progEx ? 'selected' : ''}>${esc(exName(ex(id)))} (${doneEx[id]})</option>`).join('')}</select>
      <div style="margin-top:8px">${exChartBlock(progEx, hist[0].x.mode)}</div><button class="btn ghost block sm" data-a="exInfo" data-id="${esc(progEx)}">Records & historique ›</button>`;
  } else h += '<p class="muted small">Termine ta première séance pour voir tes courbes de progression.</p>';
  h += '</div>';
  // volume / semaine
  const weeks = []; const ws0 = weekStart(Date.now());
  for (let i = 11; i >= 0; i--) { const d = new Date(ws0); d.setDate(d.getDate() - 7 * i); weeks.push(d.getTime()); }
  const vol = weeks.map(() => 0), cnt = weeks.map(() => 0);
  S.workouts.forEach(w => { const k = weeks.indexOf(weekStart(w.start)); if (k >= 0) { vol[k] += woVolume(w); cnt[k]++; } });
  const lbls = weeks.map(t => { const d = new Date(t); return d.getDate() + '/' + (d.getMonth() + 1); });
  h += `<div class="sec">Séances par semaine</div><div class="card">${barChart(lbls, cnt, '', S.settings.goal)}</div>`;
  h += `<div class="sec">Volume par semaine (kg)</div><div class="card">${barChart(lbls, vol.map(v => Math.round(v)), '')}</div>`;
  // muscles 30 j
  const since = Date.now() - 30 * 864e5; const mg = {};
  S.workouts.filter(w => w.start >= since).forEach(w => w.exercises.forEach(x => {
    const e = ex(x.exId); const g = GROUPS.find(g => e.pm.some(m => g[2].includes(m))); const k = g ? g[1] : 'Autre';
    mg[k] = (mg[k] || 0) + x.sets.filter(s => s.type !== 'w').length;
  }));
  const mx = Math.max(1, ...Object.values(mg));
  h += `<div class="sec">Séries par muscle (30 jours)</div><div class="card">${Object.keys(mg).length ? Object.entries(mg).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="hbar"><div class="l">${esc(k)}</div><div class="b"><i style="width:${v / mx * 100}%"></i></div><div class="v">${v}</div></div>`).join('') : '<p class="muted small">Pas encore de données.</p>'}</div>`;
  return h;
};
AFTER.progress = () => { const s = $('#progSel'); if (s) s.onchange = () => { progEx = s.value; rerender(); }; $('#view').oninput = null; };

/* ---------- Réglages ---------- */
SCREENS.settings = () => {
  setHeader('Réglages');
  const st = S.settings;
  const sw = (k, l, d) => `<div class="row" style="padding:10px 0"><div class="grow">${l}${d ? `<div class="tiny">${d}</div>` : ''}</div><label class="switch"><input type="checkbox" data-set="${k}" ${st[k] ? 'checked' : ''}><span></span></label></div>`;
  let h = `<div class="sec">Planning</div><div class="card"><div class="small muted" style="margin-bottom:8px">Jours d'entraînement (${st.days.length} j/sem)</div>
    <div class="days">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button class="${st.days.includes(d) ? 'on' : ''}" data-a="toggleDay" data-d="${d}">${WD[d]}</button>`).join('')}</div>
    <div class="field"><label>Objectif de séances par semaine</label><div class="chips">${[3, 4, 5, 6].map(n => `<button class="chip ${st.goal === n ? 'on' : ''}" data-a="setGoal" data-n="${n}">${n} séances</button>`).join('')}</div></div>
    <div class="small muted" style="margin:10px 0 6px">Ordre de rotation (la séance suivante est proposée automatiquement)</div>`;
  rotationTpls().forEach((t, i) => {
    h += `<div class="list-item" style="background:var(--card2)"><b style="width:22px">${i + 1}</b><span class="dot" style="background:${t.color}"></span><div class="grow small">${esc(t.name)}</div>
      <button class="btn sm" data-a="rotMove" data-id="${t.id}" data-d="-1">↑</button><button class="btn sm" data-a="rotMove" data-id="${t.id}" data-d="1">↓</button><button class="btn sm" data-a="rotToggle" data-id="${t.id}">✕</button></div>`;
  });
  S.templates.filter(t => !S.rotation.includes(t.id)).forEach(t => {
    h += `<div class="list-item" style="background:transparent;border:1px dashed var(--line)"><span class="dot" style="background:${t.color}"></span><div class="grow small muted">${esc(t.name)}</div><button class="btn sm" data-a="rotToggle" data-id="${t.id}">+ Ajouter</button></div>`;
  });
  h += `</div><div class="sec">Minuteur</div><div class="card"><div class="field"><label>Repos par défaut (nouveaux exercices)</label>
    <div class="chips">${[45, 60, 90, 120, 150, 180].map(n => `<button class="chip ${st.rest === n ? 'on' : ''}" data-a="setRest" data-n="${n}">${mmss(n)}</button>`).join('')}</div></div>
    ${sw('sound', 'Son en fin de repos')}${sw('vibrate', 'Vibration')}${sw('keepOn', 'Garder l\'écran allumé pendant la séance')}</div>
    <div class="sec">Sauvegarde & export</div><div class="card">
    <button class="btn block" data-a="exportJson">💾 Sauvegarde complète (.json)</button>
    <p class="tiny" style="margin:6px 2px 12px">Tout : programmes, historique, mensurations, exercices perso. À garder pour changer de téléphone.</p>
    <button class="btn block" data-a="importJson">📂 Restaurer une sauvegarde</button>
    <div style="height:14px"></div>
    <button class="btn block" data-a="exportCsv">📊 Exporter l'historique (Excel / CSV)</button>
    <button class="btn block" data-a="exportBodyCsv" style="margin-top:8px">📏 Exporter les mensurations (CSV)</button></div>
    <div class="sec">Données</div><div class="card">
    <div class="kv"><span>Séances enregistrées</span><b>${S.workouts.length}</b></div><div class="kv"><span>Programmes</span><b>${S.templates.length}</b></div>
    <div class="kv"><span>Exercices perso</span><b>${S.customEx.length}</b></div><div class="kv"><span>Mesures corporelles</span><b>${S.body.length}</b></div>
    <button class="btn ghost block" style="margin-top:10px" data-a="restoreProgram">↺ Réinstaller le programme de départ (J1 à J5)</button></div>
    <div class="card tiny" style="text-align:center;line-height:1.6"><img src="logo.png" style="width:64px;border-radius:14px"><br><b style="color:var(--tx)">Infantino-Fit 1.0</b><br>
    Photos et descriptions d'exercices : Free Exercise DB (domaine public).<br>Toutes les données restent sur ton téléphone.</div>`;
  return h;
};
AFTER.settings = () => {
  $('#view').oninput = null;
  $('#view').onchange = ev => { const k = ev.target.dataset.set; if (k) { S.settings[k] = ev.target.checked; save(); } };
};

/* ---------- graphiques SVG ---------- */
function lineChart(pts, unit) {
  if (!pts.length) return '<p class="muted small">Pas encore de données.</p>';
  const W = 340, H = 170, L = 34, R = 10, Tp = 12, B = 22;
  const ys = pts.map(p => p.y); let mn = Math.min(...ys), mx = Math.max(...ys);
  if (mn === mx) { mn -= 1; mx += 1; } const pad_ = (mx - mn) * 0.1; mn -= pad_; mx += pad_; if (mn < 0 && Math.min(...ys) >= 0) mn = 0;
  const x0 = pts[0].x, x1 = pts[pts.length - 1].x;
  const X = x => pts.length === 1 ? (L + W - R) / 2 : L + (x - x0) / (x1 - x0 || 1) * (W - L - R);
  const Y = y => Tp + (1 - (y - mn) / (mx - mn)) * (H - Tp - B);
  let g = '';
  for (let k = 0; k <= 3; k++) { const v = mn + (mx - mn) * k / 3; const y = Y(v); g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="#2c313d" stroke-width="1"/><text x="${L - 4}" y="${y + 3}" text-anchor="end">${fmt(v, (mx - mn) < 6 ? 1 : 0)}</text>`; }
  const path = pts.map((p, i) => (i ? 'L' : 'M') + X(p.x).toFixed(1) + ',' + Y(p.y).toFixed(1)).join(' ');
  const area = path + ` L${X(x1).toFixed(1)},${H - B} L${X(x0).toFixed(1)},${H - B} Z`;
  const dots = pts.map(p => `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="3.2" fill="#ff4d57"/>`).join('');
  const lbl = t => fdate(t, { day: 'numeric', month: 'short' });
  const last = pts[pts.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3242f" stop-opacity=".35"/><stop offset="1" stop-color="#e3242f" stop-opacity="0"/></linearGradient></defs>
    ${g}<path d="${area}" fill="url(#ga)"/><path d="${path}" fill="none" stroke="#ff4d57" stroke-width="2.2" stroke-linejoin="round"/>${dots}
    <text x="${L}" y="${H - 6}">${lbl(x0)}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${lbl(x1)}</text></svg>
    <div class="tiny" style="text-align:right">Dernier : <b style="color:var(--tx)">${fmt(last.y, 1)} ${unit || ''}</b> · ${pts.length} point(s)</div>`;
}
function barChart(labels, vals, unit, goal) {
  const W = 340, H = 150, L = 6, B = 20, Tp = 14;
  const mx = Math.max(1, goal || 0, ...vals); const bw = (W - L * 2) / vals.length;
  let s = '';
  vals.forEach((v, i) => {
    const h = v / mx * (H - B - Tp); const x = L + i * bw + 3;
    s += `<rect x="${x}" y="${H - B - h}" width="${bw - 6}" height="${Math.max(h, v ? 2 : 0)}" rx="3" fill="${i === vals.length - 1 ? '#ff4d57' : '#4a2328'}"/>`;
    if (v) s += `<text x="${x + (bw - 6) / 2}" y="${H - B - h - 3}" text-anchor="middle" style="fill:#c9ced8">${v >= 1000 ? fmt(v / 1000, 1) + 'k' : v}</text>`;
    if (i % 2 === (vals.length - 1) % 2) s += `<text x="${x + (bw - 6) / 2}" y="${H - 5}" text-anchor="middle">${labels[i]}</text>`;
  });
  if (goal) { const y = H - B - goal / mx * (H - B - Tp); s += `<line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="#19b36b" stroke-dasharray="4 4"/><text x="${W - 2}" y="${y - 3}" text-anchor="end" style="fill:#19b36b">objectif</text>`; }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${s}</svg>`;
}

/* ---------- export / import ---------- */
function download(name, mime, content) {
  if (AND) { AND.exportFile(name, mime, content); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type: mime })); a.download = name; a.click();
}
function csvCell(v) { v = v == null ? '' : String(v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function exportCsv() {
  const rows = [['Date', 'Heure', 'Séance', 'Durée séance (min)', 'Exercice', 'Exercice (EN)', 'Série', 'Type', 'Poids (kg)', 'Reps', 'Durée (s)', 'Distance (km)', '1RM estimé', 'Volume (kg)', 'Note']];
  S.workouts.slice().sort((a, b) => a.start - b.start).forEach(w => {
    const d = new Date(w.start);
    w.exercises.forEach(x => {
      const e = ex(x.exId);
      x.sets.forEach((s, j) => rows.push([dayKey(w.start), pad(d.getHours()) + ':' + pad(d.getMinutes()), w.name, Math.round(((w.end || w.start) - w.start) / 60000), exName(e), e.en, j + 1, STYPE_L[s.type] || 'Normale',
        s.w != null ? (x.mode === 'ar' ? '-' : '') + fmt(s.w, 2) : '', s.r != null ? s.r : '', s.t != null ? s.t : '', s.d != null ? fmt(s.d, 2) : '', x.mode === 'wr' && s.w && s.r ? fmt(e1rm(s.w, s.r), 1) : '', x.mode === 'wr' && s.w && s.r ? fmt(s.w * s.r, 1) : '', x.notes || '']));
    });
  });
  download('infantino-fit-historique-' + today() + '.csv', 'text/csv', '﻿' + rows.map(r => r.map(csvCell).join(';')).join('\r\n'));
}
function exportBodyCsv() {
  const rows = [['Date', ...MEAS.map(m => m[1] + ' (' + m[2] + ')')]];
  S.body.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(b => rows.push([b.date, ...MEAS.map(m => b[m[0]] != null ? fmt(b[m[0]], 1) : '')]));
  download('infantino-fit-mensurations-' + today() + '.csv', 'text/csv', '﻿' + rows.map(r => r.map(csvCell).join(';')).join('\r\n'));
}
function exportJson() { saveNow(); download('infantino-fit-sauvegarde-' + today() + '.json', 'application/json', JSON.stringify({ app: 'infantino-fit', exported: new Date().toISOString(), data: S })); }
window.onImport = txt => {
  let o; try { o = JSON.parse(txt); } catch (e) { toast('Fichier illisible'); return; }
  const data = o && o.data ? o.data : o;
  if (!data || !Array.isArray(data.workouts) || !Array.isArray(data.templates)) { toast('Ce n\'est pas une sauvegarde Infantino-Fit'); return; }
  confirmBox('Restaurer la sauvegarde ?', `${data.workouts.length} séances, ${data.templates.length} programmes. Les données actuelles seront remplacées.`, 'Restaurer', () => {
    stopTimer(); S = migrate(data); saveNow(); stack = [{ name: 'home', p: {} }]; render(true); toast('Sauvegarde restaurée ✔');
  }, true);
};
$('#fileIn').onchange = ev => { const f = ev.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => window.onImport(r.result); r.readAsText(f); ev.target.value = ''; };

/* ---------- mesures corporelles ---------- */
function bodySheet(entry) {
  const b = entry || { id: uid(), date: today() };
  const lastB = S.body.slice().sort((a, c) => c.date.localeCompare(a.date))[0] || {};
  openSheet(`<h2>${entry ? 'Modifier la mesure' : 'Nouvelle mesure'}</h2><div class="field"><label>Date</label><input type="date" id="bDate" value="${b.date}"></div>
    <div class="grid2">${MEAS.map(m => `<div class="field"><label>${m[1]} (${m[2]})</label><input inputmode="decimal" data-bm="${m[0]}" value="${fmt(b[m[0]], 1)}" placeholder="${lastB[m[0]] != null ? fmt(lastB[m[0]], 1) : ''}"></div>`).join('')}</div>
    <div class="row"><button class="btn red grow" id="bSave">Enregistrer</button>${entry ? '<button class="btn ghost danger" id="bDel">Supprimer</button>' : ''}</div>`);
  $('#bSave').onclick = () => {
    b.date = $('#bDate').value || today();
    $$('[data-bm]').forEach(i => { const v = num(i.value); if (v == null) delete b[i.dataset.bm]; else b[i.dataset.bm] = v; });
    if (!MEAS.some(m => b[m[0]] != null)) { toast('Entre au moins une valeur'); return; }
    if (!entry) S.body.push(b); save(); closeSheet(); rerender(); toast('Mesure enregistrée');
  };
  if (entry) $('#bDel').onclick = () => { S.body = S.body.filter(x => x !== entry); save(); closeSheet(); rerender(); };
}

/* ======================= ACTIONS ======================= */
const ACT = {
  back: () => back(),
  tab: el => tab(el.dataset.t),
  nav: el => nav(el.dataset.v),
  closeSheet: () => closeSheet(),
  openActive: () => nav('workout'),
  startTpl: el => { const t = S.templates.find(t => t.id === el.dataset.id); if (t) startWorkout(t); },
  startEmpty: () => startWorkout(null),
  viewWo: el => nav('woView', { id: el.dataset.id }),
  editWo: el => nav('woEdit', { id: el.dataset.id }),
  redoWo: el => {
    const w = S.workouts.find(w => w.id === el.dataset.id); if (!w) return;
    const t = { id: w.tplId, name: w.name, notes: '', exercises: w.exercises.map(x => ({ exId: x.exId, mode: x.mode, rest: x.rest || S.settings.rest, notes: x.notes, sets: x.sets.map(s => ({ type: s.type, w: s.w, r: s.r != null ? String(s.r) : '', t: s.t, d: s.d })) })) };
    startWorkout(t);
  },
  delWo: el => confirmBox('Supprimer la séance ?', 'Cette action est définitive.', 'Supprimer', () => { S.workouts = S.workouts.filter(w => w.id !== el.dataset.id); saveNow(); stack = [{ name: 'history', p: {} }]; render(true); }, true),
  shareWo: el => {
    const w = S.workouts.find(w => w.id === el.dataset.id); if (!w) return;
    let t = `🏋️ ${w.name} — ${fdate(w.start, { weekday: 'long', day: 'numeric', month: 'long' })}\n⏱ ${hms((w.end - w.start) / 1000)} · ${woSets(w)} séries · ${fmtInt(woVolume(w))} kg\n\n`;
    w.exercises.forEach(x => { t += `• ${exName(ex(x.exId))}\n` + x.sets.map((s, i) => `   ${STYPE[s.type] || i + 1}. ${setStr(s, x.mode)}`).join('\n') + '\n'; });
    t += '\n— Infantino-Fit';
    if (AND) AND.shareText('Partager la séance', t); else { navigator.clipboard && navigator.clipboard.writeText(t); toast('Copié'); }
  },
  finishWo: () => finishWorkout(),
  discardWo: () => discardWorkout(false),
  woMenu: () => openSheet(`<h2>Séance</h2><div class="menu">
      <button data-a="renameWo">✏️ Renommer la séance</button>
      <button data-a="finishWo">✅ Terminer la séance</button>
      <button class="danger" data-a="discardWo">🗑 Abandonner la séance</button></div>`),
  renameWo: () => {
    openSheet(`<h2>Renommer</h2><input id="rn" value="${esc(S.active.name)}"><button class="btn red block" style="margin-top:12px" id="rnOk">OK</button>`);
    $('#rnOk').onclick = () => { S.active.name = $('#rn').value || S.active.name; save(); closeSheet(); rerender(); };
  },
  checkSet: el => { checkSet(+el.dataset.i, +el.dataset.j); },
  woAddSet: el => {
    const w = curWo(); const x = w.exercises[+el.dataset.i]; const l = x.sets[x.sets.length - 1];
    x.sets.push({ type: 'n', tw: l ? (l.w != null ? l.w : l.tw) : null, tr: l ? (l.tr || (l.r != null ? String(l.r) : '')) : '', tt: l ? (l.t || l.tt) : null, w: null, r: null, t: null, d: null, done: curV().name === 'woEdit' });
    save(); rerender();
  },
  setMenu: el => {
    const i = +el.dataset.i, j = +el.dataset.j; const w = curWo(); const s = w.exercises[i].sets[j];
    openSheet(`<h2>Série</h2><div class="menu">${Object.entries(STYPE_L).map(([k, v]) => `<button data-a="setType" data-i="${i}" data-j="${j}" data-t="${k}">${s.type === k ? '● ' : '○ '}${v}</button>`).join('')}
      <button class="danger" data-a="delSet" data-i="${i}" data-j="${j}">🗑 Supprimer la série</button></div>`);
  },
  setType: el => { const w = curWo(); w.exercises[+el.dataset.i].sets[+el.dataset.j].type = el.dataset.t; save(); closeSheet(); rerender(); },
  delSet: el => { const w = curWo(); w.exercises[+el.dataset.i].sets.splice(+el.dataset.j, 1); save(); closeSheet(); rerender(); },
  workTimer: el => {
    const w = S.active; const i = +el.dataset.i, j = +el.dataset.j; const x = w.exercises[i]; const s = x.sets[j];
    const secs = s.t || s.tt || ((prevSets(x.exId, w.start) || [])[j] || {}).t || 60;
    startTimer('work', secs, exName(ex(x.exId)) + ' — série ' + (j + 1), [i, j]);
  },
  quickTimer: () => openSheet(`<h2>Minuteur de repos</h2><div class="grid3">${[30, 45, 60, 90, 120, 150, 180, 240, 300].map(n => `<button class="btn" data-a="qt" data-s="${n}">${mmss(n)}</button>`).join('')}</div>`),
  qt: el => { closeSheet(); startTimer('rest', +el.dataset.s, 'Minuteur manuel'); },
  tAdd: el => { if (!T) return; T.end += (+el.dataset.s) * 1000; T.total = Math.max(1, T.total + (+el.dataset.s)); T.ended = false; $('#timerBar').classList.remove('end'); if (S.active && S.active.timer) { S.active.timer.end = T.end; save(); } tick(); },
  tSkip: () => { stopTimer(); updateActiveBar(); },

  // exercices (programme ou séance)
  addEx: el => { const sel = []; nav('library', { pick: el.dataset.ctx, sel }); },
  libG: el => { LIB.g = el.dataset.g; curV().p.more = false; $$('.chip[data-a=libG]').forEach(c => c.classList.toggle('on', c.dataset.g === LIB.g)); drawLib(); },
  libMore: () => { curV().p.more = true; drawLib(); },
  libPick: (el, ev) => {
    const p = curV().p; const id = el.dataset.id;
    if (!p.pick) { nav('exInfo', { id }); return; }
    if (p.pick === 'replace') {
      stack.pop(); const v = curV(); const id2 = id;
      if (p.ctx === 'tpl') { const t = S.templates.find(t => t.id === v.p.id); const x = t.exercises[p.i]; x.exId = id2; x.mode = defMode(ex(id2)); }
      else { const w = curWo(); const x = w.exercises[p.i]; x.exId = id2; x.mode = defMode(ex(id2)); }
      save(); render(false); return;
    }
    const k = p.sel.indexOf(id); if (k >= 0) p.sel.splice(k, 1); else p.sel.push(id);
    el.classList.toggle('sel', k < 0);
    $('#selN').textContent = p.sel.length; $('#selBar').classList.toggle('hidden', !p.sel.length);
  },
  libAdd: () => {
    const p = curV().p; stack.pop(); const v = curV();
    if (p.pick === 'tpl') {
      const t = S.templates.find(t => t.id === v.p.id);
      p.sel.forEach(id => { const e = ex(id); const mode = defMode(e); t.exercises.push({ exId: id, mode, rest: mode === 'td' ? 0 : S.settings.rest, notes: '', sets: [1, 2, 3].map(() => ({ type: 'n', w: null, r: mode === 't' || mode === 'td' ? '' : '10', t: mode === 'td' ? 900 : mode === 't' ? 45 : null, d: null })) }); });
    } else {
      const w = curWo(); p.sel.forEach(id => w.exercises.push(newWoExercise(id)));
    }
    save(); render(false);
    setTimeout(() => { const v2 = $('#view'); v2.scrollTop = v2.scrollHeight; }, 50);
  },
  exInfo: (el, ev) => { nav('exInfo', { id: el.dataset.id }); },
  metric: el => { chartMetric = el.dataset.m; rerender(); },
  exMenu: el => {
    const ctx = el.dataset.ctx, i = +el.dataset.i;
    const list = ctx === 'tpl' ? S.templates.find(t => t.id === curV().p.id).exercises : curWo().exercises;
    const x = list[i];
    openSheet(`<h2>${esc(exName(ex(x.exId)))}</h2><div class="menu">
      <button data-a="exReplace" data-ctx="${ctx}" data-i="${i}">🔁 Remplacer l'exercice</button>
      <button data-a="exRest" data-ctx="${ctx}" data-i="${i}">⏱ Temps de repos (${x.rest ? mmss(x.rest) : 'aucun'})</button>
      <button data-a="exMode" data-ctx="${ctx}" data-i="${i}">🔢 Type de saisie (${esc(MODES[x.mode])})</button>
      <button data-a="exMove" data-ctx="${ctx}" data-i="${i}" data-d="-1">⬆️ Monter</button>
      <button data-a="exMove" data-ctx="${ctx}" data-i="${i}" data-d="1">⬇️ Descendre</button>
      <button data-a="exInfoS" data-id="${x.exId}">ⓘ Fiche, records & courbes</button>
      <button class="danger" data-a="exDel" data-ctx="${ctx}" data-i="${i}">🗑 Retirer l'exercice</button></div>`);
  },
  exInfoS: el => { closeSheet(); nav('exInfo', { id: el.dataset.id }); },
  exReplace: el => { closeSheet(); nav('library', { pick: 'replace', ctx: el.dataset.ctx, i: +el.dataset.i, sel: [] }); },
  exRest: el => {
    const list = exList(el.dataset.ctx); const x = list[+el.dataset.i];
    openSheet(`<h2>Temps de repos</h2><div class="grid3">${[0, 30, 45, 60, 75, 90, 120, 150, 180].map(n => `<button class="btn ${x.rest === n ? 'red' : ''}" data-a="exRestSet" data-ctx="${el.dataset.ctx}" data-i="${el.dataset.i}" data-s="${n}">${n ? mmss(n) : 'Aucun'}</button>`).join('')}</div>
      <div class="field"><label>Autre (secondes)</label><div class="row"><input id="rsC" inputmode="numeric" value="${x.rest}"><button class="btn red" data-a="exRestSet" data-ctx="${el.dataset.ctx}" data-i="${el.dataset.i}" data-s="custom">OK</button></div></div>`);
  },
  exRestSet: el => { const x = exList(el.dataset.ctx)[+el.dataset.i]; x.rest = el.dataset.s === 'custom' ? (parseInt($('#rsC').value) || 0) : +el.dataset.s; save(); closeSheet(); rerender(); },
  exMode: el => {
    openSheet(`<h2>Type de saisie</h2><div class="menu">${Object.entries(MODES).map(([k, v]) => `<button data-a="exModeSet" data-ctx="${el.dataset.ctx}" data-i="${el.dataset.i}" data-m="${k}">${v}</button>`).join('')}</div>`);
  },
  exModeSet: el => { exList(el.dataset.ctx)[+el.dataset.i].mode = el.dataset.m; save(); closeSheet(); rerender(); },
  exMove: el => { const l = exList(el.dataset.ctx); const i = +el.dataset.i, j = i + (+el.dataset.d); if (j < 0 || j >= l.length) { closeSheet(); return; } [l[i], l[j]] = [l[j], l[i]]; save(); closeSheet(); rerender(); },
  exDel: el => { exList(el.dataset.ctx).splice(+el.dataset.i, 1); save(); closeSheet(); rerender(); },

  // programmes
  newTpl: () => { const t = { id: uid(), name: 'Nouveau programme', color: COLORS[S.templates.length % COLORS.length], notes: '', exercises: [] }; S.templates.push(t); S.rotation.push(t.id); save(); nav('tplEdit', { id: t.id }); },
  editTpl: el => nav('tplEdit', { id: el.dataset.id }),
  tplMenu: el => openSheet(`<h2>Programme</h2><div class="menu"><button data-a="editTplS" data-id="${el.dataset.id}">✏️ Modifier</button><button data-a="dupTpl" data-id="${el.dataset.id}">📄 Dupliquer</button>
      <button data-a="rotToggle" data-id="${el.dataset.id}">🔄 ${S.rotation.includes(el.dataset.id) ? 'Retirer de' : 'Ajouter à'} la rotation</button>
      <button class="danger" data-a="delTpl" data-id="${el.dataset.id}">🗑 Supprimer</button></div>`),
  editTplS: el => { closeSheet(); nav('tplEdit', { id: el.dataset.id }); },
  dupTpl: el => { const t = S.templates.find(t => t.id === el.dataset.id); const c = JSON.parse(JSON.stringify(t)); c.id = uid(); c.name += ' (copie)'; S.templates.push(c); save(); closeSheet(); rerender(); toast('Programme dupliqué'); },
  delTpl: el => { closeSheet(); confirmBox('Supprimer le programme ?', 'L\'historique des séances est conservé.', 'Supprimer', () => { S.templates = S.templates.filter(t => t.id !== el.dataset.id); S.rotation = S.rotation.filter(id => id !== el.dataset.id); saveNow(); if (curV().name === 'tplEdit') back(); else rerender(); }, true); },
  tplColor: el => { const t = S.templates.find(t => t.id === curV().p.id); t.color = el.dataset.c; save(); rerender(); },
  tplAddSet: el => { const t = S.templates.find(t => t.id === curV().p.id); const x = t.exercises[+el.dataset.i]; const l = x.sets[x.sets.length - 1]; x.sets.push(l ? Object.assign({}, l, { type: 'n' }) : { type: 'n', w: null, r: '10', t: null, d: null }); save(); rerender(); },
  tplDelSet: el => { const t = S.templates.find(t => t.id === curV().p.id); t.exercises[+el.dataset.i].sets.splice(+el.dataset.j, 1); save(); rerender(); },
  tplSetType: el => { const t = S.templates.find(t => t.id === curV().p.id); const s = t.exercises[+el.dataset.i].sets[+el.dataset.j]; const o = ['n', 'w', 'd', 'f']; s.type = o[(o.indexOf(s.type) + 1) % 4]; save(); rerender(); toast(STYPE_L[s.type]); },

  // exercices perso
  newCustom: () => nav('customEx', {}),
  editCustom: el => nav('customEx', { id: el.dataset.id }),
  saveCustom: () => {
    const p = curV().p; const d = p.draft;
    d.fr = $('#cxName').value.trim(); if (!d.fr) { toast('Donne un nom à l\'exercice'); return; }
    d.en = d.fr; d.custom = true; d.cat = d.mode === 'td' ? 'cardio' : 'strength';
    const i = S.customEx.findIndex(c => c.id === d.id); delete d._s;
    if (i >= 0) S.customEx[i] = d; else S.customEx.push(d);
    saveNow(); back(); toast('Exercice enregistré');
  },
  delCustom: () => { const d = curV().p.draft; confirmBox('Supprimer cet exercice ?', 'Il restera visible dans l\'historique.', 'Supprimer', () => { S.customEx = S.customEx.filter(c => c.id !== d.id); saveNow(); back(); if (curV().name === 'exInfo') back(); }, true); },

  // historique
  calMove: el => { const d = new Date(calMonth); d.setMonth(d.getMonth() + (+el.dataset.d)); calMonth = d.getTime(); rerender(); },
  calDay: el => {
    const k = el.dataset.k; const ws = workoutsByDay()[k]; const pl = projectedPlan(62)[k];
    if (ws && ws.length === 1) { nav('woView', { id: ws[0].id }); return; }
    let h = `<h2>${fdate(k + 'T12:00', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>`;
    if (ws) h += ws.map(woCard).join('');
    else if (pl) h += `<p class="muted">Séance prévue : <b style="color:var(--tx)">${esc(pl.name)}</b></p>${k === today() ? `<button class="btn red block" data-a="startTplS" data-id="${pl.id}">▶ Démarrer</button>` : ''}`;
    else h += '<p class="muted">Jour de repos.</p>';
    if (k <= today()) h += `<button class="btn ghost block" style="margin-top:10px" data-a="addPastWo" data-k="${k}">+ Ajouter une séance ce jour-là</button>`;
    openSheet(h);
  },
  startTplS: el => { closeSheet(); ACT.startTpl(el); },
  addPastWo: el => {
    closeSheet();
    const k = el.dataset.k || today();
    openSheet(`<h2>Ajouter une séance passée</h2><div class="field"><label>Date</label><input type="date" id="pwD" value="${k}"></div>
      <div class="field"><label>À partir du programme</label><select id="pwT"><option value="">Séance vide</option>${S.templates.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></div>
      <button class="btn red block" id="pwOk">Créer et remplir</button>`);
    $('#pwOk').onclick = () => {
      const t = S.templates.find(t => t.id === $('#pwT').value); const st = new Date(($('#pwD').value || today()) + 'T18:00').getTime();
      const w = { id: uid(), tplId: t ? t.id : null, name: t ? t.name : 'Séance', start: st, end: st + 3600000, exercises: [] };
      if (t) t.exercises.forEach(x => w.exercises.push({ exId: x.exId, mode: x.mode, rest: x.rest, notes: '', sets: x.sets.map(s => ({ type: s.type, w: s.w, r: repLow(s.r), t: s.t, d: s.d })) }));
      S.workouts.push(w); saveNow(); closeSheet(); nav('woEdit', { id: w.id });
    };
  },

  // corps
  addBody: () => bodySheet(null),
  bodyM: el => { bodyMetric = el.dataset.m; rerender(); },
  bodyList: () => {
    const l = S.body.slice().sort((a, b) => b.date.localeCompare(a.date));
    openSheet(`<h2>Mesures</h2>${l.map(b => `<div class="list-item" data-a="editBody" data-id="${b.id}"><div class="grow"><b>${fdate(b.date + 'T12:00', { day: 'numeric', month: 'short', year: 'numeric' })}</b>
      <div class="tiny">${MEAS.filter(m => b[m[0]] != null).map(m => m[1] + ' ' + fmt(b[m[0]], 1) + ' ' + m[2]).join(' · ')}</div></div><span>✏️</span></div>`).join('')}`);
  },
  editBody: el => { const b = S.body.find(b => b.id === el.dataset.id); closeSheet(); if (b) bodySheet(b); },

  // réglages
  toggleDay: el => { const d = +el.dataset.d; const a = S.settings.days; const i = a.indexOf(d); if (i >= 0) a.splice(i, 1); else a.push(d); save(); rerender(); },
  setGoal: el => { S.settings.goal = +el.dataset.n; save(); rerender(); },
  setRest: el => { S.settings.rest = +el.dataset.n; save(); rerender(); },
  rotMove: el => { const r = S.rotation; const i = r.indexOf(el.dataset.id), j = i + (+el.dataset.d); if (j < 0 || j >= r.length) return; [r[i], r[j]] = [r[j], r[i]]; save(); rerender(); },
  rotToggle: el => { const r = S.rotation; const i = r.indexOf(el.dataset.id); if (i >= 0) r.splice(i, 1); else r.push(el.dataset.id); save(); closeSheet(); rerender(); },
  exportJson: () => exportJson(),
  importJson: () => { if (AND) AND.importFile(); else $('#fileIn').click(); },
  exportCsv: () => { if (!S.workouts.length) { toast('Aucune séance à exporter'); return; } exportCsv(); },
  exportBodyCsv: () => { if (!S.body.length) { toast('Aucune mesure à exporter'); return; } exportBodyCsv(); },
  restoreProgram: () => confirmBox('Réinstaller le programme de départ ?', 'Les 5 séances J1 à J5 seront ajoutées à tes programmes (rien n\'est supprimé).', 'Ajouter', () => {
    const t = buildDefaultTemplates(); S.templates.push(...t); t.forEach(x => S.rotation.push(x.id)); saveNow(); rerender(); toast('Programme ajouté');
  })
};
function exList(ctx) { return ctx === 'tpl' ? S.templates.find(t => t.id === stack.slice().reverse().find(v => v.name === 'tplEdit').p.id).exercises : curWo().exercises; }

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-a]');
  if (el && ACT[el.dataset.a]) { ev.preventDefault(); ev.stopPropagation(); ACT[el.dataset.a](el, ev); return; }
  const tb = ev.target.closest('#tabs button'); if (tb) tab(tb.dataset.tab);
});

/* ---------- démarrage ---------- */
load();
if (S.active) {
  keepOn(true);
  const tm = S.active.timer;
  if (tm && tm.end > Date.now()) { T = { kind: tm.kind, end: tm.end, total: tm.total, label: tm.label, ref: tm.ref, ended: false }; tickI = setInterval(tick, 250); }
  else if (tm) delete S.active.timer;
}
render(true);
