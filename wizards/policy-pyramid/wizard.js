/* CoSAI Wizards — AI Policy Pyramid.
 * Apache-2.0. Vanilla ES2019. No framework, no bundler, no network.
 *
 * Structure:
 *   1. config / state
 *   2. boot (fetch data.json, populate options, wire events)
 *   3. rendering (pyramid sections, entries, library, parent/child chips)
 *   4. actions (adopt, delete, custom add)
 *   5. persistence (localStorage + JSON import/export)
 *   6. PDF export
 */

(function () {
  'use strict';

  // ─── 1. config / state ───────────────────────────────────────────────────
  const LEVEL_ORDER = ['PRINCIPLE', 'POLICY', 'STANDARD', 'GUIDELINE', 'BASELINE'];

  let DATA = null;
  let STORAGE_KEY = null;
  let templateById = new Map();
  let levelMeta = new Map();
  let layerMeta = new Map();
  let driverMeta = new Map();

  /** @type {{entries: Entry[], collapsed: string[], libraryFilter: string, deleteConfirm: string|null}} */
  const state = emptyState();

  /**
   * @typedef Entry
   * @property {string} id           uuid for entry instance
   * @property {string} level        PRINCIPLE | POLICY | …
   * @property {string} title
   * @property {string} statement
   * @property {string} driverType
   * @property {string} driverSource
   * @property {string} primaryLayer
   * @property {boolean} mandatory
   * @property {string|null} ncpRef
   * @property {string|null} stigRef
   * @property {string[]} parentIds  template IDs that drive this entry
   * @property {string|null} templateId  source template id, if adopted from library; null for custom
   * @property {boolean} isCustom
   * @property {number} createdAt
   */

  function emptyState() {
    return {
      entries: [],
      collapsed: [...LEVEL_ORDER],
      libraryFilter: 'ALL',
      deleteConfirm: null,
    };
  }

  // ─── 2. boot ─────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    fetchData()
      .then((data) => {
        DATA = data;
        STORAGE_KEY = data.meta.storageKey;
        document.title = data.meta.title + ' — CoSAI Wizards';
        indexData();
        applyCopy();
        renderPyramidShell();
        populateModalOptions();
        wireEvents();
        loadFromStorage();
        renderAll();
      })
      .catch((err) => {
        console.error('policy-pyramid: failed to load data.json', err);
        const el = document.getElementById('boot-error');
        if (el) el.hidden = false;
      });
  });

  function fetchData() {
    return fetch('data.json', { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error('data.json HTTP ' + r.status);
      return r.json();
    });
  }

  function indexData() {
    templateById = new Map(DATA.templates.map((t) => [t.id, t]));
    levelMeta = new Map(DATA.levels.map((l) => [l.key, l]));
    layerMeta = new Map(DATA.layers.map((l) => [l.key, l]));
    driverMeta = new Map(DATA.drivers.map((d) => [d.key, d]));
  }

  function applyCopy() {
    const titleEl = document.querySelector('[data-title]');
    if (titleEl) titleEl.textContent = DATA.meta.title;
    const subEl = document.querySelector('[data-subtitle]');
    if (subEl) subEl.textContent = DATA.meta.subtitle;
    const badgeEl = document.querySelector('[data-badge]');
    if (badgeEl) badgeEl.textContent = DATA.meta.badge;
    const introEl = document.querySelector('[data-intro]');
    if (introEl) introEl.textContent = DATA.copy.intro;
    const emptyEl = document.querySelector('[data-empty]');
    if (emptyEl) emptyEl.textContent = DATA.copy.emptyState;
    const noteEl = document.getElementById('privacy-note');
    if (noteEl) noteEl.textContent = DATA.copy.privacy;
  }

  function renderPyramidShell() {
    const root = document.getElementById('pyramid-sections');
    root.innerHTML = '';
    LEVEL_ORDER.forEach((level) => {
      const meta = levelMeta.get(level);
      const tier = document.createElement('section');
      tier.className = 'tier';
      tier.setAttribute('data-level', level);
      tier.innerHTML = `
        <button class="tier__head" type="button" data-tier-toggle="${level}" aria-expanded="false">
          <span class="tier__chev" aria-hidden="true">▸</span>
          <span class="tier__label-block">
            <span class="tier__label">${esc(meta.label)}</span>
            <span class="tier__desc">${esc(meta.description)}</span>
          </span>
          <span class="tier__count" data-tier-count="${level}">0</span>
        </button>
        <div class="tier__body" data-tier-body="${level}" hidden>
          <p class="tier__guidance">${esc(meta.guidance)}</p>
          <div class="tier__cards" data-tier-cards="${level}"></div>
        </div>
      `;
      root.appendChild(tier);
    });
  }

  function populateModalOptions() {
    const lvl = document.getElementById('cust-level');
    lvl.innerHTML = LEVEL_ORDER.map(
      (k) => `<option value="${k}">${esc(levelMeta.get(k).label)}</option>`
    ).join('');
    lvl.value = 'POLICY';

    const drv = document.getElementById('cust-driver');
    drv.innerHTML = DATA.drivers
      .map((d) => `<option value="${d.key}">${esc(d.label)}</option>`)
      .join('');

    const lyr = document.getElementById('cust-layer');
    lyr.innerHTML = DATA.layers
      .map((l) => `<option value="${l.key}">${esc(l.label)}</option>`)
      .join('');

    const filters = document.getElementById('library-filters');
    filters.innerHTML =
      `<button class="drawer__filter is-active" type="button" data-lib-filter="ALL">All (${DATA.templates.length})</button>` +
      LEVEL_ORDER.map((k) => {
        const n = DATA.templates.filter((t) => t.level === k).length;
        return `<button class="drawer__filter" type="button" data-lib-filter="${k}">${esc(
          levelMeta.get(k).label
        )} (${n})</button>`;
      }).join('');
  }

  // ─── 3. event wiring ─────────────────────────────────────────────────────
  function wireEvents() {
    document.getElementById('btn-export').addEventListener('click', exportJSON);
    document.getElementById('btn-import').addEventListener('click', () =>
      document.getElementById('file-import').click()
    );
    document
      .getElementById('file-import')
      .addEventListener('change', importJSON);
    document.getElementById('btn-pdf').addEventListener('click', generatePDF);
    document.getElementById('btn-reset').addEventListener('click', () => {
      if (!confirm('Reset your pyramid? This cannot be undone.')) return;
      Object.assign(state, emptyState());
      saveToStorage();
      renderAll();
    });

    document.getElementById('btn-add-custom').addEventListener('click', openCustomModal);
    document.getElementById('btn-open-library').addEventListener('click', openLibrary);

    const emptyAdd = document.querySelector('[data-empty-add-custom]');
    if (emptyAdd) emptyAdd.addEventListener('click', openCustomModal);
    const emptyBrowse = document.querySelector('[data-empty-browse]');
    if (emptyBrowse) emptyBrowse.addEventListener('click', openLibrary);

    document.getElementById('btn-close-library').addEventListener('click', closeLibrary);
    document.getElementById('library-overlay').addEventListener('click', closeLibrary);

    document.getElementById('btn-close-custom').addEventListener('click', closeCustomModal);
    document.getElementById('btn-cancel-custom').addEventListener('click', closeCustomModal);
    document.getElementById('custom-overlay').addEventListener('click', closeCustomModal);
    document.getElementById('btn-save-custom').addEventListener('click', saveCustomEntry);
    document.getElementById('cust-body').addEventListener('input', (e) => {
      document.getElementById('cust-body-count').textContent = String(e.target.value.length);
    });

    document.getElementById('library-filters').addEventListener('click', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement) || !t.matches('[data-lib-filter]')) return;
      state.libraryFilter = t.getAttribute('data-lib-filter');
      renderLibrary();
    });

    document.addEventListener('click', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;

      const toggle = t.closest('[data-tier-toggle]');
      if (toggle) {
        const lvl = toggle.getAttribute('data-tier-toggle');
        toggleTier(lvl);
        return;
      }
      const adoptBtn = t.closest('[data-adopt]');
      if (adoptBtn) {
        adoptTemplate(adoptBtn.getAttribute('data-adopt'));
        return;
      }
      const delBtn = t.closest('[data-delete]');
      if (delBtn) {
        state.deleteConfirm = delBtn.getAttribute('data-delete');
        renderAll();
        return;
      }
      const delConfirm = t.closest('[data-delete-confirm]');
      if (delConfirm) {
        deleteEntry(delConfirm.getAttribute('data-delete-confirm'));
        return;
      }
      const delCancel = t.closest('[data-delete-cancel]');
      if (delCancel) {
        state.deleteConfirm = null;
        renderAll();
        return;
      }
      const scrollTo = t.closest('[data-scroll-to]');
      if (scrollTo) {
        scrollToEntry(scrollTo.getAttribute('data-scroll-to'));
        return;
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!document.getElementById('custom-modal').hidden) closeCustomModal();
        else if (!document.getElementById('library-drawer').hidden) closeLibrary();
        else if (state.deleteConfirm) {
          state.deleteConfirm = null;
          renderAll();
        }
      }
    });
  }

  // ─── 4. rendering ────────────────────────────────────────────────────────
  function renderAll() {
    renderToolbar();
    renderTiers();
    if (!document.getElementById('library-drawer').hidden) renderLibrary();
  }

  function renderToolbar() {
    const total = state.entries.length;
    const populatedLevels = LEVEL_ORDER.filter(
      (l) => state.entries.some((e) => e.level === l)
    ).length;
    const countEl = document.getElementById('entry-count');
    if (total === 0) {
      countEl.textContent = 'No governance entries yet';
    } else {
      countEl.textContent = `${total} entr${total === 1 ? 'y' : 'ies'} across ${populatedLevels} of 5 levels`;
    }
    document.getElementById('empty-state').hidden = total !== 0;
    document.getElementById('pyramid-sections').hidden = total === 0;
  }

  function renderTiers() {
    LEVEL_ORDER.forEach((level) => {
      const entries = state.entries
        .filter((e) => e.level === level)
        .sort((a, b) => a.title.localeCompare(b.title));
      const isOpen = !state.collapsed.includes(level);
      const head = document.querySelector(`[data-tier-toggle="${level}"]`);
      const body = document.querySelector(`[data-tier-body="${level}"]`);
      const count = document.querySelector(`[data-tier-count="${level}"]`);
      const cards = document.querySelector(`[data-tier-cards="${level}"]`);
      if (!head || !body || !count || !cards) return;
      head.setAttribute('aria-expanded', String(isOpen));
      head.querySelector('.tier__chev').textContent = isOpen ? '▾' : '▸';
      body.hidden = !isOpen;
      count.textContent = String(entries.length);

      if (entries.length === 0) {
        cards.innerHTML = `
          <p class="tier__empty">
            No ${esc(levelMeta.get(level).label.toLowerCase())} yet —
            <button type="button" data-empty-add="${level}">add from library</button>
          </p>
        `;
        const btn = cards.querySelector('[data-empty-add]');
        if (btn)
          btn.addEventListener('click', () => {
            state.libraryFilter = level;
            openLibrary();
          });
      } else {
        cards.innerHTML = entries.map(renderEntryCard).join('');
      }
    });
  }

  function renderEntryCard(entry) {
    const layer = layerMeta.get(entry.primaryLayer);
    const driver = driverMeta.get(entry.driverType);

    const parents = entry.parentIds
      .map((pid) => {
        const tmpl = templateById.get(pid);
        if (!tmpl) return null;
        const adoptedEntry = state.entries.find((e) => e.templateId === pid);
        return { id: pid, title: tmpl.title, level: tmpl.level, adoptedEntry };
      })
      .filter(Boolean);

    // Children: any *adopted* entry whose parentIds include this entry's templateId
    const childTemplateRef = entry.templateId;
    const children = childTemplateRef
      ? state.entries.filter((e) => e.parentIds.includes(childTemplateRef))
      : [];

    const isOrphaned =
      parents.length > 0 && parents.every((p) => !p.adoptedEntry);

    const confirming = state.deleteConfirm === entry.id;

    const chips = [
      `<span class="entry__chip entry__chip--layer l-${entry.primaryLayer}">${esc(layer ? layer.short : '?')}</span>`,
      `<span class="entry__chip entry__chip--driver d-${entry.driverType}">${esc(driver ? driver.label : entry.driverType)}</span>`,
    ];
    if (entry.mandatory)
      chips.push(`<span class="entry__chip entry__chip--required">Required</span>`);
    if (entry.ncpRef)
      chips.push(`<span class="entry__chip entry__chip--ncp">NCP ${esc(entry.ncpRef)}</span>`);
    if (entry.stigRef)
      chips.push(`<span class="entry__chip entry__chip--stig">STIG ${esc(entry.stigRef)}</span>`);

    const parentRow =
      parents.length > 0
        ? `<div class="entry__rels-row"><strong>Driven by:</strong>${parents
            .map((p) =>
              p.adoptedEntry
                ? `<button class="rel-chip l-${p.level}" type="button" data-scroll-to="${esc(
                    p.adoptedEntry.id
                  )}" title="Jump to this entry">↑ ${esc(p.title)}</button>`
                : `<span class="rel-chip rel-chip--missing l-${p.level}" title="Not yet in your pyramid">↑ ${esc(
                    p.title
                  )}</span>`
            )
            .join('')}</div>`
        : '';

    const childRow =
      children.length > 0
        ? `<div class="entry__rels-row"><strong>Drives:</strong>${children
            .map(
              (c) =>
                `<button class="rel-chip l-${c.level}" type="button" data-scroll-to="${esc(
                  c.id
                )}" title="Jump to this entry">↓ ${esc(c.title)}</button>`
            )
            .join('')}</div>`
        : '';

    const orphanWarn = isOrphaned
      ? `<span class="entry__orphan-warn" title="No parent entries found in your pyramid">Parent missing</span>`
      : '';

    const cascadeWarn =
      confirming && children.length > 0
        ? `<p class="entry__cascade-warn">Drives ${children.length} ${children.length === 1 ? 'entry' : 'entries'} below</p>`
        : '';

    const trailing = confirming
      ? `<div class="entry__delete-confirm">
            ${cascadeWarn}
            <div class="entry__delete-confirm-row">
              <button class="btn btn--sm btn--danger" type="button" data-delete-confirm="${esc(entry.id)}">Delete</button>
              <button class="btn btn--sm btn--ghost" type="button" data-delete-cancel="">Cancel</button>
            </div>
         </div>`
      : `<button class="entry__delete" type="button" data-delete="${esc(entry.id)}" aria-label="Delete entry">×</button>`;

    return `
      <div class="entry${isOrphaned ? ' is-orphaned' : ''}" id="entry-${esc(entry.id)}" data-entry-id="${esc(entry.id)}">
        <div class="entry__head">
          <div class="entry__title">${esc(entry.title)}${entry.isCustom ? '<span class="entry__custom-tag">Custom</span>' : ''}</div>
          ${trailing}
        </div>
        ${orphanWarn}
        <p class="entry__statement">${esc(entry.statement)}</p>
        <div class="entry__meta">${chips.join('')}</div>
        ${entry.driverSource ? `<p class="entry__source">${esc(entry.driverSource)}</p>` : ''}
        <div class="entry__rels">${parentRow}${childRow}</div>
      </div>
    `;
  }

  function renderLibrary() {
    const list = document.getElementById('library-list');
    const filter = state.libraryFilter;
    const adoptedTemplateIds = new Set(
      state.entries.map((e) => e.templateId).filter(Boolean)
    );
    const matches = DATA.templates.filter(
      (t) => filter === 'ALL' || t.level === filter
    );

    document.querySelectorAll('[data-lib-filter]').forEach((btn) => {
      btn.classList.toggle('is-active', btn.getAttribute('data-lib-filter') === filter);
    });

    if (matches.length === 0) {
      list.innerHTML = `<p class="tier__empty">No templates match this filter.</p>`;
      return;
    }
    list.innerHTML = matches.map((t) => {
      const adopted = adoptedTemplateIds.has(t.id);
      const parents = (t.parentIds || []).map((pid) => {
        const ptmpl = templateById.get(pid);
        if (!ptmpl) return null;
        return { id: pid, title: ptmpl.title, level: ptmpl.level, active: adoptedTemplateIds.has(pid) };
      }).filter(Boolean);
      const hasActiveParent = parents.some((p) => p.active);
      const cls = `lib-card${hasActiveParent && !adopted ? ' is-parent-active' : ''}`;

      const action = adopted
        ? `<span class="lib-card__adopted" title="Already in your pyramid">✓ Added</span>`
        : `<button class="btn btn--primary btn--sm" type="button" data-adopt="${esc(t.id)}">Adopt</button>`;

      const parentChips = parents.length
        ? `<div class="lib-card__parents">${parents
            .map((p) =>
              p.active
                ? `<span class="lib-card__parent-active rel-chip l-${p.level}" title="In your pyramid">✓ ${esc(p.title)}</span>`
                : `<span class="lib-card__parent-inactive rel-chip l-${p.level}" title="Not yet in your pyramid">↑ ${esc(p.title)}</span>`
            )
            .join('')}</div>`
        : '';

      return `
        <div class="${cls}">
          <div class="lib-card__head">
            <div style="flex:1;min-width:0">
              <div class="lib-card__pills">
                <span class="lib-card__level l-${t.level}">${esc(levelMeta.get(t.level).label.replace(/s$/, ''))}</span>
                ${t.mandatory ? '<span class="entry__chip entry__chip--required">Required</span>' : ''}
                ${hasActiveParent && !adopted ? '<span class="entry__chip" style="color:#15803d;background:#f0fdf4;border-color:#bbf7d0">Parent active</span>' : ''}
              </div>
              <div class="lib-card__title">${esc(t.title)}</div>
            </div>
            ${action}
          </div>
          <p class="lib-card__statement">${esc(t.statement)}</p>
          ${parentChips || `<p class="lib-card__source">${esc(t.driverSource)}</p>`}
        </div>
      `;
    }).join('');
  }

  // ─── 5. actions ──────────────────────────────────────────────────────────
  function toggleTier(level) {
    const idx = state.collapsed.indexOf(level);
    if (idx === -1) state.collapsed.push(level);
    else state.collapsed.splice(idx, 1);
    saveToStorage();
    renderTiers();
  }

  function openLibrary() {
    document.getElementById('library-drawer').hidden = false;
    document.getElementById('library-overlay').hidden = false;
    renderLibrary();
  }
  function closeLibrary() {
    document.getElementById('library-drawer').hidden = true;
    document.getElementById('library-overlay').hidden = true;
  }
  function openCustomModal() {
    document.getElementById('cust-title').value = '';
    document.getElementById('cust-source').value = '';
    document.getElementById('cust-body').value = '';
    document.getElementById('cust-body-count').textContent = '0';
    document.getElementById('cust-error').hidden = true;
    document.getElementById('custom-modal').hidden = false;
    document.getElementById('custom-overlay').hidden = false;
    setTimeout(() => document.getElementById('cust-title').focus(), 30);
  }
  function closeCustomModal() {
    document.getElementById('custom-modal').hidden = true;
    document.getElementById('custom-overlay').hidden = true;
  }

  function adoptTemplate(templateId) {
    const t = templateById.get(templateId);
    if (!t) return;
    if (state.entries.some((e) => e.templateId === templateId)) return; // already adopted
    const entry = {
      id: 'e_' + uid(),
      level: t.level,
      title: t.title,
      statement: t.statement,
      driverType: t.driverType,
      driverSource: t.driverSource,
      primaryLayer: t.primaryLayer,
      mandatory: !!t.mandatory,
      ncpRef: t.ncpRef || null,
      stigRef: t.stigRef || null,
      parentIds: Array.isArray(t.parentIds) ? t.parentIds.slice() : [],
      templateId: t.id,
      isCustom: false,
      createdAt: Date.now(),
    };
    state.entries.push(entry);
    if (state.collapsed.includes(t.level)) {
      state.collapsed.splice(state.collapsed.indexOf(t.level), 1);
    }
    saveToStorage();
    renderAll();
    setTimeout(() => scrollToEntry(entry.id, true), 50);
  }

  function deleteEntry(entryId) {
    const idx = state.entries.findIndex((e) => e.id === entryId);
    if (idx === -1) return;
    state.entries.splice(idx, 1);
    state.deleteConfirm = null;
    saveToStorage();
    renderAll();
  }

  function saveCustomEntry() {
    const title = document.getElementById('cust-title').value.trim();
    const body = document.getElementById('cust-body').value.trim();
    const errEl = document.getElementById('cust-error');
    if (!title) {
      errEl.textContent = 'Title is required.';
      errEl.hidden = false;
      return;
    }
    if (!body) {
      errEl.textContent = 'Statement / body is required.';
      errEl.hidden = false;
      return;
    }
    const entry = {
      id: 'e_' + uid(),
      level: document.getElementById('cust-level').value,
      title,
      statement: body,
      driverType: document.getElementById('cust-driver').value,
      driverSource: document.getElementById('cust-source').value.trim(),
      primaryLayer: document.getElementById('cust-layer').value,
      mandatory: false,
      ncpRef: null,
      stigRef: null,
      parentIds: [],
      templateId: null,
      isCustom: true,
      createdAt: Date.now(),
    };
    state.entries.push(entry);
    if (state.collapsed.includes(entry.level)) {
      state.collapsed.splice(state.collapsed.indexOf(entry.level), 1);
    }
    saveToStorage();
    closeCustomModal();
    renderAll();
    setTimeout(() => scrollToEntry(entry.id, true), 50);
  }

  function scrollToEntry(entryId, force) {
    const el = document.getElementById('entry-' + entryId);
    if (!el) return;
    // make sure parent tier is open
    const tier = el.closest('.tier');
    if (tier) {
      const lvl = tier.getAttribute('data-level');
      if (state.collapsed.includes(lvl)) {
        state.collapsed.splice(state.collapsed.indexOf(lvl), 1);
        renderTiers();
      }
    }
    el.scrollIntoView({ behavior: force ? 'auto' : 'smooth', block: 'center' });
    el.classList.add('is-flash');
    setTimeout(() => el.classList.remove('is-flash'), 1400);
  }

  // ─── 6. persistence ──────────────────────────────────────────────────────
  function saveToStorage() {
    if (!STORAGE_KEY) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: DATA.meta.version,
          entries: state.entries,
          collapsed: state.collapsed,
        })
      );
    } catch (e) {
      console.warn('policy-pyramid: unable to persist', e);
    }
  }

  function loadFromStorage() {
    if (!STORAGE_KEY) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (!obj || !Array.isArray(obj.entries)) return;
      state.entries = obj.entries.filter(isValidEntry);
      if (Array.isArray(obj.collapsed)) state.collapsed = obj.collapsed.slice();
    } catch (e) {
      console.warn('policy-pyramid: storage parse failed', e);
    }
  }

  function isValidEntry(e) {
    return (
      e &&
      typeof e.id === 'string' &&
      LEVEL_ORDER.includes(e.level) &&
      typeof e.title === 'string' &&
      typeof e.statement === 'string'
    );
  }

  function exportJSON() {
    const payload = {
      meta: {
        wizard: DATA.meta.id,
        version: DATA.meta.version,
        exportedAt: new Date().toISOString(),
      },
      entries: state.entries,
      collapsed: state.collapsed,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'policy-pyramid-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importJSON(ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result));
        if (!obj || !Array.isArray(obj.entries)) throw new Error('Invalid file');
        if (
          state.entries.length > 0 &&
          !confirm(
            `Replace your current pyramid (${state.entries.length} entries) with the imported one (${obj.entries.length} entries)?`
          )
        ) {
          ev.target.value = '';
          return;
        }
        state.entries = obj.entries.filter(isValidEntry);
        if (Array.isArray(obj.collapsed)) state.collapsed = obj.collapsed.slice();
        saveToStorage();
        renderAll();
      } catch (e) {
        alert('Could not import JSON: ' + (e instanceof Error ? e.message : 'unknown error'));
      } finally {
        ev.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  // ─── 7. PDF export ───────────────────────────────────────────────────────
  function generatePDF() {
    const jspdfNs =
      (typeof window !== 'undefined' && (window.jspdf || window.jsPDF)) || null;
    const Ctor = jspdfNs && (jspdfNs.jsPDF || jspdfNs);
    if (!Ctor) {
      alert('PDF library failed to load.');
      return;
    }
    const doc = new Ctor({ unit: 'pt', format: 'letter' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const margin = 48;
    let y = margin;

    function newPageIfNeeded(needed) {
      if (y + needed > H - margin) {
        doc.addPage();
        y = margin;
      }
    }
    function text(txt, opts) {
      const o = opts || {};
      doc.setFont('helvetica', o.bold ? 'bold' : 'normal');
      doc.setFontSize(o.size || 10);
      doc.setTextColor(o.color || '#0f172a');
      const lines = doc.splitTextToSize(String(txt || ''), o.width || W - 2 * margin);
      lines.forEach((ln) => {
        newPageIfNeeded((o.size || 10) + 2);
        doc.text(ln, o.x || margin, y);
        y += (o.size || 10) + 2;
      });
    }

    text(DATA.meta.title, { bold: true, size: 18 });
    y += 4;
    text(DATA.meta.subtitle, { size: 10, color: '#475569' });
    y += 2;
    text('Generated ' + new Date().toLocaleString(), {
      size: 9,
      color: '#94a3b8',
    });
    y += 12;

    text(`${state.entries.length} entries across ${LEVEL_ORDER.filter((l) => state.entries.some((e) => e.level === l)).length} of 5 levels`, { size: 10, color: '#334155' });
    y += 10;

    LEVEL_ORDER.forEach((level) => {
      const entries = state.entries
        .filter((e) => e.level === level)
        .sort((a, b) => a.title.localeCompare(b.title));
      if (entries.length === 0) return;
      newPageIfNeeded(40);
      y += 6;
      text(levelMeta.get(level).label.toUpperCase() + `  (${entries.length})`, {
        bold: true,
        size: 12,
        color: '#0f1f3d',
      });
      y += 2;
      doc.setDrawColor('#e2e8f0');
      doc.line(margin, y, W - margin, y);
      y += 8;

      entries.forEach((entry) => {
        newPageIfNeeded(60);
        text(entry.title + (entry.isCustom ? '  [Custom]' : ''), {
          bold: true,
          size: 11,
        });
        const layer = layerMeta.get(entry.primaryLayer);
        const driver = driverMeta.get(entry.driverType);
        text(
          `${layer ? layer.label : entry.primaryLayer}  ·  ${driver ? driver.label : entry.driverType}${entry.mandatory ? '  ·  REQUIRED' : ''}${entry.ncpRef ? '  ·  NCP ' + entry.ncpRef : ''}${entry.stigRef ? '  ·  STIG ' + entry.stigRef : ''}`,
          { size: 9, color: '#475569' }
        );
        text(entry.statement, { size: 10, color: '#0f172a' });
        if (entry.driverSource) {
          text('Source: ' + entry.driverSource, { size: 8, color: '#64748b' });
        }
        const parents = entry.parentIds
          .map((pid) => templateById.get(pid))
          .filter(Boolean);
        if (parents.length) {
          text(
            'Driven by: ' + parents.map((p) => p.title).join(' · '),
            { size: 8, color: '#64748b' }
          );
        }
        y += 6;
      });
    });

    doc.save(DATA.meta.pdfFilename || 'policy-pyramid.pdf');
  }

  // ─── helpers ─────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    }
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-6);
  }
})();
