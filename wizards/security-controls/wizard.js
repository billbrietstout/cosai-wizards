/* CoSAI Wizards — Security Controls Assessment engine.
 * Apache-2.0. Vanilla ES2019. No framework, no bundler, no network.
 *
 * Structure:
 *   1. config / state
 *   2. boot (fetch data.json, render everything)
 *   3. rendering (context · controls · owasp · live panel · results)
 *   4. interaction (phase nav, answer, persistence, export / import)
 *   5. scoring (layer, overall, gap tally)
 *   6. PDF export via /shared/vendor/jspdf.umd.min.js
 */

(function () {
  'use strict';

  // ─── 1. config / state ────────────────────────────────────────────────────
  const PHASE_COUNT = 7;
  const LAYER_IDS = ['l1', 'l2', 'l3', 'l4', 'l5'];
  let DATA = null;
  let STORAGE_KEY = null;

  const state = emptyState();

  function emptyState() {
    return {
      aitype: null,
      deployment: null,
      stage: null,
      datasensitivity: [],
      l1: {}, l2: {}, l3: {}, l4: {}, l5: {},
      owasp: {},
      completedPhases: [],
    };
  }

  function cloneState(s) {
    return JSON.parse(JSON.stringify(s));
  }

  // ─── 2. boot ──────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    fetchData()
      .then((data) => {
        DATA = data;
        STORAGE_KEY = data.meta.storageKey;
        document.title = data.meta.title + ' — CoSAI Wizards';
        populateTitles();
        renderContextFields();
        renderControls();
        renderOwasp();
        wireStateBar();
        loadFromStorage();
        updateLivePanel();
      })
      .catch((err) => {
        console.error('wizard: failed to load data.json', err);
        const el = document.getElementById('boot-error');
        if (el) el.hidden = false;
      });
  });

  function fetchData() {
    // Relative fetch works when served via HTTP. file:// may block — show error.
    return fetch('data.json', { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error('data.json HTTP ' + r.status);
      return r.json();
    });
  }

  function populateTitles() {
    setText('[data-title]', DATA.meta.title);
    setText('[data-subtitle]', DATA.meta.subtitle);
    setText('[data-badge]', DATA.meta.badge);
    LAYER_IDS.forEach((l, i) => {
      const phaseIdx = i + 2;
      const title = DATA.layers[l].title;
      const meta = DATA.layers[l].meta;
      const next = DATA.layers[l].next;
      const intro = DATA.layers[l].intro;
      setText(`#phase-title-${phaseIdx}`, title);
      setText(`#phase-meta-${phaseIdx}`, meta);
      setText(`#next-btn-${phaseIdx}`, next);
      setText(`#intro-${l}`, intro);
    });
  }

  function setText(selector, text) {
    const els = document.querySelectorAll(selector);
    els.forEach((el) => {
      el.textContent = text;
    });
  }

  // ─── 3. rendering ─────────────────────────────────────────────────────────
  function renderContextFields() {
    const host = document.getElementById('context-fields');
    if (!host) return;
    host.innerHTML = DATA.context.fields
      .map((field) => {
        const opts = field.options
          .map((o) => {
            const handler = field.multiple ? 'multiSelect' : 'select';
            return `
              <button type="button"
                      class="btn-opt"
                      role="${field.multiple ? 'checkbox' : 'radio'}"
                      aria-checked="false"
                      data-group="${field.key}"
                      data-value="${o.value}"
                      data-handler="${handler}">${o.label}</button>`;
          })
          .join('');
        return `
          <div class="form-row">
            <label class="form-label" id="lbl-${field.key}">${field.label}</label>
            <div class="btn-group" role="${field.multiple ? 'group' : 'radiogroup'}"
                 aria-labelledby="lbl-${field.key}" data-group="${field.key}">${opts}</div>
          </div>`;
      })
      .join('');
    const intro = document.getElementById('context-intro');
    if (intro) intro.textContent = DATA.context.intro;
  }

  function phaseLabel(p) {
    return { training: 'Train', deployment: 'Deploy', maintenance: 'Maintain', continuous: 'Continuous' }[p] || p;
  }

  function renderControls() {
    LAYER_IDS.forEach((layer) => {
      const host = document.getElementById('ctrls-' + layer);
      if (!host) return;
      host.innerHTML = DATA.controls[layer]
        .map((c) => {
          const aml = c.aml
            ? c.aml.split(',').map((a) => `<span class="badge-aml">${escapeHtml(a.trim())}</span>`).join('')
            : '';
          const phases = c.phases.map((p) => `<span class="badge-phase ${p}">${phaseLabel(p)}</span>`).join('');
          return `
            <div class="ctrl-card" id="card-${c.id}">
              <div class="ctrl-label">${escapeHtml(c.label)}</div>
              <div class="ctrl-why">${escapeHtml(c.why)}</div>
              <div class="ctrl-badges">
                <span class="badge-aicm">${escapeHtml(c.aicm)}</span>${phases}${aml}
              </div>
              <div class="ctrl-answers"
                   role="radiogroup"
                   aria-labelledby="card-${c.id}-label">
                <span class="sr-only" id="card-${c.id}-label">${escapeHtml(c.label)}</span>
                ${answerButton(layer, c.id, 'yes', 'Implemented', '✅')}
                ${answerButton(layer, c.id, 'partial', 'Partial', '⚠️')}
                ${answerButton(layer, c.id, 'no', 'Not done', '❌')}
                ${answerButton(layer, c.id, 'na', 'N/A', '—')}
              </div>
            </div>`;
        })
        .join('');
    });
  }

  function answerButton(layer, ctrlId, val, label, icon) {
    return `<button type="button"
                    class="ans-btn"
                    role="radio"
                    aria-checked="false"
                    data-layer="${layer}"
                    data-ctrl="${ctrlId}"
                    data-value="${val}">
              <span aria-hidden="true">${icon}</span> ${label}
            </button>`;
  }

  function renderOwasp() {
    const host = document.getElementById('owasp-grid');
    if (!host) return;
    host.innerHTML = DATA.owasp
      .map((r) => {
        const aml = r.aml.length
          ? `<div class="owasp-aml-row">${r.aml.map((a) => `<span class="badge-aml">${escapeHtml(a)}</span>`).join('')}</div>`
          : '';
        return `
          <div class="owasp-item" id="oi-${r.id}">
            <div class="owasp-code">${escapeHtml(r.id)}</div>
            <div class="owasp-name">${escapeHtml(r.name)}</div>
            <div class="owasp-desc">${escapeHtml(r.desc)}</div>
            ${aml}
            <div class="owasp-ans-row" role="radiogroup" aria-labelledby="oi-${r.id}-lbl">
              <span class="sr-only" id="oi-${r.id}-lbl">${escapeHtml(r.name)}</span>
              ${owaspAnsBtn(r.id, 'yes', 'Addressed')}
              ${owaspAnsBtn(r.id, 'partial', 'Partial')}
              ${owaspAnsBtn(r.id, 'no', 'Open')}
            </div>
          </div>`;
      })
      .join('');

    const mini = document.getElementById('owasp-mini-grid');
    if (mini) {
      mini.innerHTML = DATA.owasp
        .map((r) => `<div class="owasp-mini-cell" id="omini-${r.id}" title="${escapeHtml(r.id + ': ' + r.name)}">${r.id.replace('LLM', '')}</div>`)
        .join('');
    }
  }

  function owaspAnsBtn(id, val, label) {
    return `<button type="button"
                    class="owasp-ans"
                    role="radio"
                    aria-checked="false"
                    data-owasp="${id}"
                    data-value="${val}">${label}</button>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
  }

  // ─── 4. interaction ───────────────────────────────────────────────────────
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-handler],[data-layer][data-ctrl],[data-owasp],[data-phase-toggle],[data-phase-complete],[data-owasp-toggle]');
    if (!t) return;

    if (t.matches('[data-handler]')) {
      const group = t.dataset.group;
      const value = t.dataset.value;
      if (t.dataset.handler === 'select') doSelect(group, value, t);
      else doMultiSelect(group, value, t);
      return;
    }

    if (t.matches('[data-layer][data-ctrl]')) {
      const { layer, ctrl, value } = t.dataset;
      doAnswer(layer, ctrl, value, t);
      return;
    }

    if (t.matches('[data-owasp]')) {
      doOwaspAnswer(t.dataset.owasp, t.dataset.value, t);
      return;
    }

    if (t.matches('[data-phase-toggle]')) {
      togglePhase(+t.dataset.phaseToggle);
      return;
    }

    if (t.matches('[data-phase-complete]')) {
      completePhase(+t.dataset.phaseComplete, +t.dataset.phaseNext);
      return;
    }

    if (t.matches('[data-owasp-toggle]')) {
      toggleOwasp();
    }
  });

  // Space / Enter on custom radios
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== ' ' && ev.key !== 'Enter') return;
    const t = ev.target;
    if (t.matches('[data-handler],[data-layer][data-ctrl],[data-owasp]')) {
      ev.preventDefault();
      t.click();
    }
  });

  function doSelect(key, val, btn) {
    const group = document.querySelector(`.btn-group[data-group="${key}"]`);
    if (group) {
      group.querySelectorAll('.btn-opt').forEach((b) => {
        b.classList.remove('sel');
        b.setAttribute('aria-checked', 'false');
      });
    }
    btn.classList.add('sel');
    btn.setAttribute('aria-checked', 'true');
    state[key] = val;
    persist();
    updateLivePanel();
  }

  function doMultiSelect(key, val, btn) {
    if (!Array.isArray(state[key])) state[key] = [];
    const on = !btn.classList.contains('sel');
    btn.classList.toggle('sel', on);
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
    if (on) {
      if (!state[key].includes(val)) state[key].push(val);
    } else {
      state[key] = state[key].filter((v) => v !== val);
    }
    persist();
    updateLivePanel();
  }

  function doAnswer(layer, ctrlId, val, btn) {
    state[layer][ctrlId] = val;
    const card = document.getElementById('card-' + ctrlId);
    if (card) {
      card.classList.remove('answered-yes', 'answered-partial', 'answered-no', 'answered-na');
      card.classList.add('answered-' + val);
    }
    const btns = btn.closest('.ctrl-answers').querySelectorAll('.ans-btn');
    btns.forEach((b) => {
      b.classList.remove('sel-yes', 'sel-partial', 'sel-no', 'sel-na');
      b.setAttribute('aria-checked', 'false');
    });
    btn.classList.add('sel-' + val);
    btn.setAttribute('aria-checked', 'true');
    persist();
    updateLivePanel();
    maybeRefreshResults();
  }

  function doOwaspAnswer(id, val, btn) {
    state.owasp[id] = val;
    const item = document.getElementById('oi-' + id);
    if (item) {
      item.classList.remove('oi-yes', 'oi-partial', 'oi-no');
      item.classList.add('oi-' + val);
    }
    const btns = btn.closest('.owasp-ans-row').querySelectorAll('.owasp-ans');
    btns.forEach((b) => {
      b.classList.remove('sel-yes', 'sel-partial', 'sel-no');
      b.setAttribute('aria-checked', 'false');
    });
    btn.classList.add('sel-' + val);
    btn.setAttribute('aria-checked', 'true');
    const cell = document.getElementById('omini-' + id);
    if (cell) {
      cell.classList.remove('oc-yes', 'oc-partial', 'oc-no');
      cell.classList.add('oc-' + val);
    }
    updateOwaspCoverageLabel();
    persist();
    updateLivePanel();
    maybeRefreshResults();
  }

  /** Rebuild results HTML if the report was already shown (answers changed afterward). */
  function maybeRefreshResults() {
    if (state.completedPhases.includes(PHASE_COUNT - 1) || state.completedPhases.includes(PHASE_COUNT)) {
      renderResults();
    }
  }

  function togglePhase(n) {
    const body = document.getElementById('phase-body-' + n);
    if (!body) return;
    const chev = document.getElementById('phase-chev-' + n);
    const isOpen = body.classList.contains('open');
    for (let i = 1; i <= PHASE_COUNT; i++) {
      const b = document.getElementById('phase-body-' + i);
      const c = document.getElementById('phase-chev-' + i);
      const num = document.getElementById('phase-num-' + i);
      if (b) b.classList.remove('open');
      if (c) c.classList.remove('open');
      if (num && !state.completedPhases.includes(i)) num.classList.remove('active');
      const header = document.getElementById('phase-header-' + i);
      if (header) header.setAttribute('aria-expanded', 'false');
    }
    if (!isOpen) {
      body.classList.add('open');
      if (chev) chev.classList.add('open');
      const num = document.getElementById('phase-num-' + n);
      if (num && !state.completedPhases.includes(n)) num.classList.add('active');
      const header = document.getElementById('phase-header-' + n);
      if (header) header.setAttribute('aria-expanded', 'true');
    }
  }

  function toggleOwasp() {
    const body = document.getElementById('owasp-body');
    if (body) {
      const now = body.classList.toggle('open');
      const header = document.getElementById('owasp-header');
      if (header) header.setAttribute('aria-expanded', now ? 'true' : 'false');
    }
  }

  function completePhase(current, next) {
    if (!state.completedPhases.includes(current)) state.completedPhases.push(current);
    const num = document.getElementById('phase-num-' + current);
    if (num) {
      num.classList.remove('active');
      num.classList.add('done');
    }
    const body = document.getElementById('phase-body-' + current);
    const chev = document.getElementById('phase-chev-' + current);
    if (body) body.classList.remove('open');
    if (chev) chev.classList.remove('open');
    if (next <= PHASE_COUNT) {
      const nb = document.getElementById('phase-body-' + next);
      const nc = document.getElementById('phase-chev-' + next);
      const nn = document.getElementById('phase-num-' + next);
      if (nb) {
        nb.classList.add('open');
        nb.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (nc) nc.classList.add('open');
      if (nn) nn.classList.add('active');
    }
    if (next === PHASE_COUNT) renderResults();
    persist();
    updateLivePanel();
  }

  function updateOwaspCoverageLabel() {
    const yes = Object.values(state.owasp).filter((v) => v === 'yes').length;
    const partial = Object.values(state.owasp).filter((v) => v === 'partial').length;
    const el = document.getElementById('owasp-coverage-label');
    if (el) el.textContent = `${yes} addressed · ${partial} partial`;
  }

  // Persistence ------------------------------------------------------------
  function persist() {
    try {
      if (!STORAGE_KEY) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* quota or disabled storage — silent */
    }
  }

  function loadFromStorage() {
    try {
      if (!STORAGE_KEY) return;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      hydrate(parsed);
    } catch (e) {
      console.warn('wizard: failed to restore state', e);
    }
  }

  function hydrate(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return;
    Object.assign(state, emptyState(), snapshot);
    if (!Array.isArray(state.completedPhases)) state.completedPhases = [];
    if (!Array.isArray(state.datasensitivity)) state.datasensitivity = [];

    // Re-apply context selections.
    DATA.context.fields.forEach((field) => {
      const val = state[field.key];
      const group = document.querySelector(`.btn-group[data-group="${field.key}"]`);
      if (!group) return;
      group.querySelectorAll('.btn-opt').forEach((b) => {
        const v = b.dataset.value;
        const selected = field.multiple ? Array.isArray(val) && val.includes(v) : val === v;
        b.classList.toggle('sel', selected);
        b.setAttribute('aria-checked', selected ? 'true' : 'false');
      });
    });

    // Re-apply control answers.
    LAYER_IDS.forEach((layer) => {
      Object.entries(state[layer] || {}).forEach(([ctrlId, val]) => {
        const card = document.getElementById('card-' + ctrlId);
        if (!card) return;
        card.classList.add('answered-' + val);
        const btns = card.querySelectorAll('.ans-btn');
        btns.forEach((b) => {
          if (b.dataset.value === val) {
            b.classList.add('sel-' + val);
            b.setAttribute('aria-checked', 'true');
          }
        });
      });
    });

    // Re-apply OWASP answers.
    Object.entries(state.owasp || {}).forEach(([id, val]) => {
      const item = document.getElementById('oi-' + id);
      if (item) item.classList.add('oi-' + val);
      const cell = document.getElementById('omini-' + id);
      if (cell) cell.classList.add('oc-' + val);
      const btns = document.querySelectorAll(`.owasp-ans[data-owasp="${id}"]`);
      btns.forEach((b) => {
        if (b.dataset.value === val) {
          b.classList.add('sel-' + val);
          b.setAttribute('aria-checked', 'true');
        }
      });
    });

    // Mark completed phases.
    state.completedPhases.forEach((i) => {
      const num = document.getElementById('phase-num-' + i);
      if (num) {
        num.classList.remove('active');
        num.classList.add('done');
      }
    });

    updateOwaspCoverageLabel();
    if (state.completedPhases.includes(PHASE_COUNT - 1) || state.completedPhases.includes(PHASE_COUNT)) {
      renderResults();
    }
  }

  function wireStateBar() {
    const exportBtn = document.getElementById('btn-export');
    const importBtn = document.getElementById('btn-import');
    const importFile = document.getElementById('file-import');
    const resetBtn = document.getElementById('btn-reset');

    if (exportBtn) exportBtn.addEventListener('click', exportJson);
    if (importBtn) importBtn.addEventListener('click', () => importFile && importFile.click());
    if (importFile) importFile.addEventListener('change', onImportFile);
    if (resetBtn) resetBtn.addEventListener('click', resetState);
  }

  function exportJson() {
    const payload = {
      wizard: DATA.meta.id,
      version: DATA.meta.version,
      exportedAt: new Date().toISOString(),
      state: cloneState(state),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = DATA.meta.id + '-state.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function onImportFile(ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(reader.result);
        const snap = obj && obj.state ? obj.state : obj;
        hydrate(snap);
        persist();
        updateLivePanel();
      } catch (err) {
        alert('Import failed: ' + err.message);
      } finally {
        ev.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  function resetState() {
    if (!confirm('Clear all answers and start over?')) return;
    Object.assign(state, emptyState());
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* noop */ }
    // reset DOM
    document.querySelectorAll('.btn-opt').forEach((b) => {
      b.classList.remove('sel');
      b.setAttribute('aria-checked', 'false');
    });
    document.querySelectorAll('.ans-btn').forEach((b) => {
      b.classList.remove('sel-yes', 'sel-partial', 'sel-no', 'sel-na');
      b.setAttribute('aria-checked', 'false');
    });
    document.querySelectorAll('.owasp-ans').forEach((b) => {
      b.classList.remove('sel-yes', 'sel-partial', 'sel-no');
      b.setAttribute('aria-checked', 'false');
    });
    document.querySelectorAll('.ctrl-card').forEach((c) =>
      c.classList.remove('answered-yes', 'answered-partial', 'answered-no', 'answered-na')
    );
    document.querySelectorAll('.owasp-item').forEach((c) =>
      c.classList.remove('oi-yes', 'oi-partial', 'oi-no')
    );
    document.querySelectorAll('.owasp-mini-cell').forEach((c) =>
      c.classList.remove('oc-yes', 'oc-partial', 'oc-no')
    );
    for (let i = 1; i <= PHASE_COUNT; i++) {
      const num = document.getElementById('phase-num-' + i);
      if (num) num.classList.remove('done', 'active');
    }
    const first = document.getElementById('phase-num-1');
    if (first) first.classList.add('active');
    const resultsEl = document.getElementById('results-content');
    if (resultsEl) {
      resultsEl.innerHTML = '<p class="results-empty">Complete all five layers to generate your security posture report.</p>';
    }
    updateOwaspCoverageLabel();
    updateLivePanel();
  }

  // ─── 5. scoring ───────────────────────────────────────────────────────────
  function calcLayerScore(layer) {
    const answers = state[layer];
    let points = 0, max = 0;
    for (const val of Object.values(answers)) {
      if (val === 'na') continue;
      max++;
      if (val === 'yes') points += DATA.scoring.yesWeight;
      else if (val === 'partial') points += DATA.scoring.partialWeight;
    }
    return { points, max, pct: max > 0 ? Math.round((points / max) * 100) : null };
  }

  function calcOverallScore() {
    let totalPts = 0, totalMax = 0;
    LAYER_IDS.forEach((l) => {
      const s = calcLayerScore(l);
      totalPts += s.points;
      totalMax += s.max;
    });
    for (const val of Object.values(state.owasp)) {
      totalMax++;
      if (val === 'yes') totalPts += DATA.scoring.yesWeight;
      else if (val === 'partial') totalPts += DATA.scoring.partialWeight;
    }
    return totalMax > 0 ? Math.round((totalPts / totalMax) * 100) : null;
  }

  function countGaps() {
    let gaps = 0;
    LAYER_IDS.forEach((l) => {
      for (const val of Object.values(state[l])) if (val === 'no') gaps++;
    });
    for (const val of Object.values(state.owasp)) if (val === 'no') gaps++;
    return gaps;
  }

  // Live panel -------------------------------------------------------------
  function updateLivePanel() {
    const circumference = 2 * Math.PI * 32;
    const overall = calcOverallScore();
    const ringFg = document.getElementById('ring-fg');
    const ringVal = document.getElementById('ring-val');
    const interp = document.getElementById('score-interp');
    const strong = DATA.scoring.strongThreshold;
    const gapsThresh = DATA.scoring.gapsThreshold;

    if (overall !== null) {
      const offset = circumference * (1 - overall / 100);
      if (ringFg) ringFg.style.strokeDashoffset = offset;
      if (ringVal) ringVal.textContent = overall + '%';
      const color = overall >= strong ? '#4ade80' : overall >= gapsThresh ? '#fbbf24' : '#f87171';
      if (ringFg) ringFg.style.stroke = color;
      if (interp) {
        interp.textContent = overall >= strong ? 'Strong posture' : overall >= gapsThresh ? 'Gaps identified' : 'Action needed';
        interp.className = 'score-interp ' + (overall >= strong ? 'good' : overall >= gapsThresh ? 'warn' : 'alert');
      }
    } else {
      if (ringFg) ringFg.style.strokeDashoffset = circumference;
      if (ringVal) ringVal.textContent = '—';
      if (interp) { interp.textContent = 'Not started'; interp.className = 'score-interp'; }
    }

    LAYER_IDS.forEach((l) => {
      const s = calcLayerScore(l);
      const bar = document.getElementById('bar-' + l);
      const pct = document.getElementById('pct-' + l);
      if (bar && pct) {
        if (s.pct !== null) {
          bar.style.width = s.pct + '%';
          pct.textContent = s.pct + '%';
        } else {
          bar.style.width = '0%';
          pct.textContent = '—';
        }
      }
    });

    const gaps = countGaps();
    const gapsEl = document.getElementById('gaps-num');
    if (gapsEl) {
      gapsEl.textContent = gaps;
      gapsEl.className = 'gaps-num' + (gaps === 0 ? ' ok' : '');
    }
  }

  // Results ----------------------------------------------------------------
  function renderResults() {
    const host = document.getElementById('results-content');
    if (!host) return;
    const overall = calcOverallScore() || 0;
    const gaps = countGaps();
    const owaspYes = Object.values(state.owasp).filter((v) => v === 'yes').length;
    const overallColor = overall >= DATA.scoring.strongThreshold ? 'green' : overall >= DATA.scoring.gapsThreshold ? 'amber' : 'red';

    const layerRows = LAYER_IDS.map((l) => {
      const s = calcLayerScore(l);
      const m = DATA.layers[l];
      const pct = s.pct || 0;
      const scoreColor = pct >= DATA.scoring.strongThreshold ? '#15803d' : pct >= DATA.scoring.gapsThreshold ? '#a16207' : '#b91c1c';
      return `
        <div class="layer-result-row">
          <div class="layer-result-badge" style="background:${m.bg};color:${m.color}">L${l[1]}</div>
          <div class="layer-result-info">
            <div class="layer-result-name">${escapeHtml(m.name)}</div>
            <div class="layer-result-sub">AICM: ${escapeHtml(m.aicm)}</div>
            <div class="layer-result-bar-track">
              <div class="layer-result-bar-fill" style="width:${pct}%;background:${scoreColor}"></div>
            </div>
          </div>
          <div class="layer-result-score" style="color:${scoreColor}">${s.pct !== null ? s.pct + '%' : '—'}</div>
        </div>`;
    }).join('');

    const gapItems = [];
    LAYER_IDS.forEach((layer) => {
      DATA.controls[layer].forEach((ctrl) => {
        const val = state[layer][ctrl.id];
        if (val === 'no') gapItems.push({ label: ctrl.label, layer: layer.toUpperCase(), severity: 'critical' });
        else if (val === 'partial') gapItems.push({ label: ctrl.label, layer: layer.toUpperCase(), severity: 'warn' });
      });
    });
    DATA.owasp.forEach((r) => {
      const val = state.owasp[r.id];
      if (val === 'no') gapItems.push({ label: r.name + ' (' + r.id + ')', layer: 'L3 OWASP', severity: 'critical' });
      else if (val === 'partial') gapItems.push({ label: r.name + ' (' + r.id + ')', layer: 'L3 OWASP', severity: 'warn' });
    });

    const gapsHtml = gapItems.length === 0
      ? '<p class="gaps-clear">✅ No gaps identified across all layers.</p>'
      : gapItems
          .map((g) => `
            <div class="gap-item ${g.severity === 'warn' ? 'warn' : ''}">
              <div class="gap-item-title">${escapeHtml(g.label)}</div>
              <div class="gap-item-layer">${escapeHtml(g.layer)}</div>
            </div>`)
          .join('');

    const owaspResultsHtml = DATA.owasp
      .map((r) => {
        const val = state.owasp[r.id];
        const cls = val ? 'oi-' + val : 'oi-none';
        const statusText = val === 'yes' ? '✅ Addressed' : val === 'partial' ? '⚠️ Partial' : val === 'no' ? '❌ Open' : '— Not assessed';
        const statusCls = val === 'yes' ? 's-yes' : val === 'partial' ? 's-partial' : val === 'no' ? 's-no' : 's-none';
        return `
          <div class="owasp-result-item ${cls}">
            <div class="ori-code">${escapeHtml(r.id)}</div>
            <div class="ori-name">${escapeHtml(r.name)}</div>
            <div class="ori-status ${statusCls}">${statusText}</div>
          </div>`;
      })
      .join('');

    host.innerHTML = `
      <section class="results-section" aria-labelledby="results-head">
        <h3 id="results-head" class="sr-only">Security posture results</h3>
        <div class="results-grid">
          <div class="results-stat">
            <div class="results-stat-val ${overallColor}">${overall}%</div>
            <div class="results-stat-label">Overall Security Score</div>
          </div>
          <div class="results-stat">
            <div class="results-stat-val ${gaps === 0 ? 'green' : 'red'}">${gaps}</div>
            <div class="results-stat-label">Critical Gaps</div>
          </div>
          <div class="results-stat">
            <div class="results-stat-val ${owaspYes >= 7 ? 'green' : owaspYes >= 4 ? 'amber' : 'red'}">${owaspYes}/${DATA.owasp.length}</div>
            <div class="results-stat-label">OWASP LLM Addressed</div>
          </div>
        </div>

        <h4 class="results-subhead">Layer Breakdown</h4>
        <div class="layer-results">${layerRows}</div>

        <h4 class="results-subhead">OWASP LLM Top 10 Coverage</h4>
        <div class="owasp-results"><div class="owasp-result-grid">${owaspResultsHtml}</div></div>

        ${gapItems.length > 0 ? `
          <h4 class="results-subhead">
            Priority Gaps${gapItems.filter((g) => g.severity === 'critical').length > 0 ? ' — ' + gapItems.filter((g) => g.severity === 'critical').length + ' critical' : ''}
          </h4>
          <div class="gaps-section">${gapsHtml}</div>` : ''}

        <button class="pdf-btn" type="button" id="btn-pdf">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
          </svg>
          Download PDF Report
        </button>
        <button class="pdf-btn pdf-btn--ghost" type="button" onclick="window.print()">
          Print / Save as PDF via browser
        </button>

        <div class="disclaimer">
          <strong>Privacy notice:</strong> This assessment runs entirely in your browser. No data is transmitted to any server. Results exist only in this session or in your browser's localStorage — use Export JSON to retain a copy.
          <br /><br />
          <strong>About this tool:</strong> Controls derived from ${DATA.meta.sources.join(', ')}. This is a self-assessment tool — findings should be validated with qualified security professionals.
        </div>
      </section>`;

    const pdfBtn = document.getElementById('btn-pdf');
    if (pdfBtn) pdfBtn.onclick = function () { generatePDF(); };
  }

  // ─── 6. PDF export ────────────────────────────────────────────────────────
  function pdfSafe(str) {
    return String(str)
      .replace(/≤/g, '<=')
      .replace(/≥/g, '>=')
      .replace(/[–—]/g, '-')
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/…/g, '...')
      // eslint-disable-next-line no-control-regex
      .replace(/[^\x00-\x7F]/g, '?');
  }

  function generatePDF() {
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF !== 'function') {
      alert('PDF library did not load. Try the browser print option instead.');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const navy = [15, 31, 61];
    const blue = [45, 91, 227];
    const white = [255, 255, 255];
    const green = [22, 163, 74];
    const amber = [217, 119, 6];
    const red = [220, 38, 38];
    const slate = [100, 116, 139];
    const lightgray = [241, 245, 249];

    const W = 210, H = 297, M = 18;
    let y = 0;

    doc.setFillColor(navy[0], navy[1], navy[2]);
    doc.rect(0, 0, W, 36, 'F');
    doc.setFillColor(blue[0], blue[1], blue[2]);
    doc.rect(0, 36, W, 3, 'F');

    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(pdfSafe(DATA.meta.title), M, 14);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(pdfSafe(DATA.meta.subtitle), M, 21);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    const now = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text('Generated: ' + now, M, 28);
    doc.text(pdfSafe(DATA.meta.badge), W - M, 14, { align: 'right' });

    y = 50;

    const ctxLines = [
      state.aitype ? 'AI Type: ' + state.aitype : null,
      state.deployment ? 'Deployment: ' + state.deployment : null,
      state.stage ? 'Stage: ' + state.stage : null,
      state.datasensitivity && state.datasensitivity.length ? 'Data sensitivity: ' + state.datasensitivity.join(', ') : null,
    ].filter(Boolean);

    if (ctxLines.length) {
      doc.setFillColor(lightgray[0], lightgray[1], lightgray[2]);
      doc.roundedRect(M, y, W - M * 2, 8 + ctxLines.length * 5, 2, 2, 'F');
      doc.setFontSize(8);
      doc.setTextColor(slate[0], slate[1], slate[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('ASSESSMENT CONTEXT', M + 4, y + 5);
      doc.setFont('helvetica', 'normal');
      ctxLines.forEach((l, i) => doc.text(pdfSafe(l), M + 4, y + 10 + i * 5));
      y += 12 + ctxLines.length * 5;
    }

    y += 6;

    const overall = calcOverallScore() || 0;
    const gaps = countGaps();
    const owaspYes = Object.values(state.owasp).filter((v) => v === 'yes').length;
    const scoreColor = overall >= DATA.scoring.strongThreshold ? green : overall >= DATA.scoring.gapsThreshold ? amber : red;

    doc.setFillColor(lightgray[0], lightgray[1], lightgray[2]);
    doc.roundedRect(M, y, W - M * 2, 28, 3, 3, 'F');
    doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    doc.circle(M + 16, y + 14, 10, 'F');
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(overall + '%', M + 16, y + 15, { align: 'center' });

    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.setFontSize(12);
    doc.text('Overall Security Score', M + 30, y + 9);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(slate[0], slate[1], slate[2]);
    const interp = overall >= DATA.scoring.strongThreshold
      ? 'Strong security posture'
      : overall >= DATA.scoring.gapsThreshold
        ? 'Gaps identified - action required'
        : 'Critical gaps - immediate action needed';
    doc.text(interp, M + 30, y + 15);
    doc.setFontSize(8);
    doc.text(gaps + ' critical gap' + (gaps !== 1 ? 's' : '') + '   ·   OWASP LLM: ' + owaspYes + '/' + DATA.owasp.length + ' addressed', M + 30, y + 21);
    y += 36;

    // Layer scores
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text('Layer Security Scores', M, y);
    y += 6;

    const layerData = LAYER_IDS.map((l) => {
      const s = calcLayerScore(l);
      const m = DATA.layers[l];
      const pct = s.pct || 0;
      return {
        layer: 'L' + l[1].toUpperCase(),
        name: m.name,
        pct, max: s.max, points: s.points,
        color: pct >= DATA.scoring.strongThreshold ? green : pct >= DATA.scoring.gapsThreshold ? amber : red,
      };
    });

    doc.setFontSize(8);
    layerData.forEach((row) => {
      doc.setFillColor(lightgray[0], lightgray[1], lightgray[2]);
      doc.roundedRect(M, y, W - M * 2, 13, 2, 2, 'F');
      doc.setFillColor(row.color[0], row.color[1], row.color[2]);
      doc.roundedRect(M + 2, y + 2.5, 16, 8, 1, 1, 'F');
      doc.setTextColor(white[0], white[1], white[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(row.layer, M + 10, y + 7.5, { align: 'center' });
      doc.setTextColor(navy[0], navy[1], navy[2]);
      doc.setFont('helvetica', 'normal');
      doc.text(pdfSafe(row.name), M + 22, y + 7.5);
      doc.setTextColor(row.color[0], row.color[1], row.color[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(row.pct + '%', W - M - 4, y + 7.5, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(slate[0], slate[1], slate[2]);
      doc.text(Math.round(row.points) + '/' + row.max, W - M - 4, y + 11.5, { align: 'right' });
      const barX = M + 52, barW = W - M * 2 - 52 - 34;
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(barX, y + 5, barW, 3.5, 1, 1, 'F');
      if (row.pct > 0) {
        doc.setFillColor(row.color[0], row.color[1], row.color[2]);
        doc.roundedRect(barX, y + 5, barW * (row.pct / 100), 3.5, 1, 1, 'F');
      }
      y += 15;
    });

    y += 4;

    // OWASP LLM summary
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text('OWASP LLM Top 10 Coverage', M, y);
    y += 6;

    const colW = (W - M * 2 - 4) / 2;
    const rowH = 11;
    doc.setFontSize(7.5);
    DATA.owasp.forEach((r, i) => {
      const col = i < 5 ? 0 : 1;
      const rowIdx = i < 5 ? i : i - 5;
      const cx = M + col * (colW + 4);
      const cy = y + rowIdx * rowH;
      const val = state.owasp[r.id];
      const bg = val === 'yes' ? [240, 253, 244] : val === 'partial' ? [255, 251, 235] : val === 'no' ? [254, 242, 242] : [248, 250, 252];
      const border = val === 'yes' ? [134, 239, 172] : val === 'partial' ? [252, 211, 77] : val === 'no' ? [252, 165, 165] : [226, 232, 240];
      const statusLabel = val === 'yes' ? 'Addressed' : val === 'partial' ? 'Partial' : val === 'no' ? 'Open' : '-';
      const statusColor = val === 'yes' ? green : val === 'partial' ? amber : val === 'no' ? red : slate;
      doc.setFillColor(bg[0], bg[1], bg[2]);
      doc.setDrawColor(border[0], border[1], border[2]);
      doc.roundedRect(cx, cy, colW, rowH - 1, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.text(r.id, cx + 3, cy + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(navy[0], navy[1], navy[2]);
      doc.text(pdfSafe(r.name), cx + 3, cy + 8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.text(statusLabel, cx + colW - 3, cy + 8.5, { align: 'right' });
    });
    y += 5 * rowH + 4;

    // Gaps
    const critGaps = [], warnGaps = [];
    LAYER_IDS.forEach((layer) => {
      DATA.controls[layer].forEach((ctrl) => {
        const val = state[layer][ctrl.id];
        if (val === 'no') critGaps.push({ label: ctrl.label, layer: layer.toUpperCase() });
        else if (val === 'partial') warnGaps.push({ label: ctrl.label, layer: layer.toUpperCase() });
      });
    });
    DATA.owasp.forEach((r) => {
      const val = state.owasp[r.id];
      if (val === 'no') critGaps.push({ label: r.id + ': ' + r.name, layer: 'L3 OWASP' });
      else if (val === 'partial') warnGaps.push({ label: r.id + ': ' + r.name, layer: 'L3 OWASP' });
    });

    if (y + 20 > H - 20) { doc.addPage(); y = 20; }

    if (critGaps.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(navy[0], navy[1], navy[2]);
      doc.text('Critical Gaps (' + critGaps.length + ')', M, y);
      y += 6;
      critGaps.forEach((g) => {
        if (y + 10 > H - 20) { doc.addPage(); y = 20; }
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(252, 165, 165);
        doc.roundedRect(M, y, W - M * 2, 9, 1, 1, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(red[0], red[1], red[2]);
        doc.text('x', M + 3, y + 6);
        doc.setTextColor(navy[0], navy[1], navy[2]);
        doc.text(pdfSafe(g.label), M + 8, y + 6);
        doc.setTextColor(slate[0], slate[1], slate[2]);
        doc.text(g.layer, W - M - 4, y + 6, { align: 'right' });
        y += 11;
      });
      y += 4;
    }

    if (warnGaps.length > 0) {
      if (y + 14 > H - 20) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(navy[0], navy[1], navy[2]);
      doc.text('Partial Implementation (' + warnGaps.length + ')', M, y);
      y += 6;
      warnGaps.forEach((g) => {
        if (y + 10 > H - 20) { doc.addPage(); y = 20; }
        doc.setFillColor(255, 251, 235);
        doc.setDrawColor(252, 211, 77);
        doc.roundedRect(M, y, W - M * 2, 9, 1, 1, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(amber[0], amber[1], amber[2]);
        doc.text('!', M + 3, y + 6);
        doc.setTextColor(navy[0], navy[1], navy[2]);
        doc.text(pdfSafe(g.label), M + 8, y + 6);
        doc.setTextColor(slate[0], slate[1], slate[2]);
        doc.text(g.layer, W - M - 4, y + 6, { align: 'right' });
        y += 11;
      });
    }

    doc.setFillColor(navy[0], navy[1], navy[2]);
    doc.rect(0, H - 16, W, 16, 'F');
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(pdfSafe(DATA.meta.title + ' · Controls derived from ' + DATA.meta.sources.join(', ')), M, H - 8);
    doc.text('Self-assessment only - validate findings with qualified security professionals', W - M, H - 8, { align: 'right' });

    doc.save(DATA.meta.pdfFilename);
  }
})();
