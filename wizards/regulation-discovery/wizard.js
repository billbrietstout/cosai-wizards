/* CoSAI Wizards — Regulation Discovery Wizard.
 * Apache-2.0. Vanilla ES2019. No framework, no bundler, no network.
 *
 * Structure:
 *   1. config / state
 *   2. boot (fetch data.json, populate options, wire events)
 *   3. rendering (options, chips, summary, results)
 *   4. step navigation + validation
 *   5. rules engine (regulation applicability, scoring, controls)
 *   6. persistence (localStorage + JSON import/export)
 *   7. PDF export
 */

(function () {
  'use strict';

  // ─── 1. config / state ───────────────────────────────────────────────────
  const STEP_COUNT = 4;
  const STEP_LABELS = ['Scope', 'System', 'Impact', 'Results'];

  let DATA = null;
  let STORAGE_KEY = null;

  const state = emptyState();
  let lastResult = null;

  function emptyState() {
    return {
      step: 1,
      maxStep: 1,
      inputs: {
        verticals: ['GENERAL'],
        deployment: '',
        euNotApplicable: false,
        euEstablished: false,
        euExclusion: 'none',

        assetType: '',
        description: '',
        businessFunction: '',
        euEntity: '',
        operatingModel: '',
        autonomyLevel: '',

        decisionsAffectingPeople: false,
        interactsWithEndUsers: false,
        dataTypes: [],
        euResidentsData: '',
        euTransparencyTypes: [],
        expectedRiskLevel: '',
        vulnerablePopulations: false,
      },
    };
  }

  // ─── 2. boot ─────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    fetchData()
      .then((data) => {
        DATA = data;
        STORAGE_KEY = data.meta.storageKey;
        document.title = data.meta.title + ' — CoSAI Wizards';
        populateOptions();
        populateCopy();
        wireEvents();
        loadFromStorage();
        render();
      })
      .catch((err) => {
        console.error('wizard: failed to load data.json', err);
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

  // ─── 3. rendering ────────────────────────────────────────────────────────
  function populateCopy() {
    setText('[data-title]', DATA.meta.title);
    setText('[data-subtitle]', DATA.meta.subtitle);
    setText('[data-badge]', DATA.meta.badge);
    setText('#intro-text', DATA.copy.intro);
    setText('#privacy-note', DATA.copy.privacy);
  }

  function populateOptions() {
    // Verticals (chips)
    renderChipGrid(
      document.getElementById('verticals-chips'),
      DATA.verticals,
      'verticals'
    );

    // Data types (chips)
    renderChipGrid(
      document.getElementById('data-types-chips'),
      DATA.dataTypes,
      'dataTypes'
    );

    // Transparency types (chips)
    renderChipGrid(
      document.getElementById('transparency-chips'),
      DATA.euTransparencyTypes,
      'euTransparencyTypes'
    );

    // Selects
    fillSelect('deployment', DATA.deployments);
    fillSelect('asset-type', DATA.assetTypes);
    fillSelect('business-function', DATA.businessFunctions);
    fillSelect('operating-model', DATA.operatingModels);
    fillSelect('autonomy-level', DATA.autonomyLevels);
    fillSelect('expected-risk-level', DATA.riskLevels);

    // EU-specific selects
    const exclSel = document.getElementById('eu-exclusion');
    exclSel.innerHTML = '';
    DATA.euExclusions.forEach((o) => {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      exclSel.appendChild(opt);
    });

    const entSel = document.getElementById('eu-entity');
    entSel.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '— Select —';
    entSel.appendChild(placeholder);
    const notApp = document.createElement('option');
    notApp.value = 'NOT_APPLICABLE';
    notApp.textContent = 'Not applicable (outside EU scope)';
    entSel.appendChild(notApp);
    DATA.euEntityTypes.forEach((o) => {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      entSel.appendChild(opt);
    });
  }

  function fillSelect(id, options) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '— Select —';
    sel.appendChild(placeholder);
    options.forEach((o) => {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      sel.appendChild(opt);
    });
  }

  function renderChipGrid(host, options, stateKey) {
    host.innerHTML = '';
    options.forEach((o) => {
      const label = document.createElement('label');
      label.className = 'chip';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = o.value;
      cb.dataset.chipKey = stateKey;
      const span = document.createElement('span');
      span.textContent = o.label;
      label.appendChild(cb);
      label.appendChild(span);
      host.appendChild(label);
    });
  }

  function setText(selector, text) {
    document.querySelectorAll(selector).forEach((el) => {
      el.textContent = text;
    });
  }

  // ─── 4. event wiring + navigation ────────────────────────────────────────
  function wireEvents() {
    // Step rail bars
    document.querySelectorAll('.step-bar').forEach((b) => {
      b.addEventListener('click', () => {
        const target = parseInt(b.dataset.step, 10);
        if (target <= state.maxStep) goToStep(target);
      });
    });

    // Nav buttons
    document.getElementById('btn-back').addEventListener('click', () => {
      goToStep(Math.max(1, state.step - 1));
    });
    document.getElementById('btn-next').addEventListener('click', () => {
      const missing = missingForStep(state.step);
      if (missing.length) {
        showValidation(missing, 'Please complete before continuing:');
        return;
      }
      hideValidation();
      const next = Math.min(STEP_COUNT, state.step + 1);
      if (next > state.maxStep) state.maxStep = next;
      goToStep(next);
      render();
    });

    // State bar actions
    document.getElementById('btn-export').addEventListener('click', exportJson);
    document.getElementById('btn-import').addEventListener('click', () => {
      document.getElementById('file-import').click();
    });
    document.getElementById('file-import').addEventListener('change', importJson);
    document.getElementById('btn-reset').addEventListener('click', resetAll);

    // Validation dismiss
    document.getElementById('validation-close').addEventListener('click', () => {
      document.getElementById('validation-box').hidden = true;
    });

    document.addEventListener('input', hideValidation);
    document.addEventListener('change', hideValidation);

    // Step 1 inputs
    document.getElementById('deployment').addEventListener('change', (e) => {
      state.inputs.deployment = e.target.value;
      persist();
    });
    document.getElementById('eu-not-applicable').addEventListener('change', (e) => {
      state.inputs.euNotApplicable = e.target.checked;
      if (e.target.checked) {
        state.inputs.euEstablished = false;
        state.inputs.euExclusion = '';
        state.inputs.euEntity = 'NOT_APPLICABLE';
        state.inputs.euTransparencyTypes = [];
        reflectInputs();
      }
      render();
      persist();
    });
    document.getElementById('eu-established').addEventListener('change', (e) => {
      state.inputs.euEstablished = e.target.checked;
      persist();
    });
    document.getElementById('eu-exclusion').addEventListener('change', (e) => {
      state.inputs.euExclusion = e.target.value;
      persist();
    });

    // Step 2 inputs
    document.getElementById('asset-type').addEventListener('change', (e) => {
      state.inputs.assetType = e.target.value;
      persist();
    });
    const descEl = document.getElementById('description');
    descEl.addEventListener('input', (e) => {
      state.inputs.description = (e.target.value || '').slice(0, 200);
      e.target.value = state.inputs.description;
      document.getElementById('desc-count').textContent = state.inputs.description.length;
      persist();
    });
    document.getElementById('business-function').addEventListener('change', (e) => {
      state.inputs.businessFunction = e.target.value;
      persist();
    });
    document.getElementById('eu-entity').addEventListener('change', (e) => {
      state.inputs.euEntity = e.target.value;
      persist();
    });
    document.getElementById('operating-model').addEventListener('change', (e) => {
      state.inputs.operatingModel = e.target.value;
      persist();
    });
    document.getElementById('autonomy-level').addEventListener('change', (e) => {
      state.inputs.autonomyLevel = e.target.value;
      persist();
    });

    // Step 3 inputs
    document.getElementById('decisions-affecting-people').addEventListener('change', (e) => {
      state.inputs.decisionsAffectingPeople = e.target.checked;
      persist();
    });
    document.getElementById('interacts-with-end-users').addEventListener('change', (e) => {
      state.inputs.interactsWithEndUsers = e.target.checked;
      persist();
    });
    document.getElementById('eu-residents-data').addEventListener('change', (e) => {
      state.inputs.euResidentsData = e.target.value;
      persist();
    });
    document.getElementById('expected-risk-level').addEventListener('change', (e) => {
      state.inputs.expectedRiskLevel = e.target.value;
      persist();
    });
    document.getElementById('vulnerable-populations').addEventListener('change', (e) => {
      state.inputs.vulnerablePopulations = e.target.checked;
      persist();
    });

    // Chip checkboxes (delegated)
    document.addEventListener('change', (e) => {
      const key = e.target && e.target.dataset && e.target.dataset.chipKey;
      if (!key) return;
      const current = state.inputs[key];
      if (!Array.isArray(current)) return;
      const val = e.target.value;
      if (e.target.checked) {
        if (!current.includes(val)) current.push(val);
      } else {
        const idx = current.indexOf(val);
        if (idx >= 0) current.splice(idx, 1);
      }
      hideValidation();
      persist();
    });

    // Run + PDF
    document.getElementById('btn-run').addEventListener('click', runDiscovery);
    document.getElementById('btn-pdf').addEventListener('click', generatePDF);

    // Tooltips — simple title-attr fallback (hover + focus-friendly)
    document.querySelectorAll('.tooltip').forEach((t) => {
      const tip = t.dataset.tip;
      if (tip) {
        t.setAttribute('title', tip);
        t.setAttribute('aria-label', tip);
        t.setAttribute('tabindex', '0');
      }
    });
  }

  function goToStep(n) {
    state.step = n;
    hideValidation();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function render() {
    // Show / hide step sections
    for (let i = 1; i <= STEP_COUNT; i += 1) {
      const sec = document.getElementById('step-' + i);
      if (sec) sec.hidden = state.step !== i;
    }

    // Step rail
    document.querySelectorAll('.step-bar').forEach((b) => {
      const s = parseInt(b.dataset.step, 10);
      b.classList.toggle('step-bar--active', s === state.step);
      b.classList.toggle('step-bar--reached', s <= state.maxStep && s !== state.step);
      b.disabled = s > state.maxStep;
    });
    setText('#step-label', `Step ${state.step} of ${STEP_COUNT} — ${STEP_LABELS[state.step - 1]}`);

    // Back button
    document.getElementById('btn-back').disabled = state.step === 1;

    // Next button: hide on last step
    const nextBtn = document.getElementById('btn-next');
    nextBtn.hidden = state.step === STEP_COUNT;

    // EU-dependent field groups
    const disabled = state.inputs.euNotApplicable;
    document.querySelectorAll('.eu-ai-fields').forEach((el) => {
      el.classList.toggle('is-disabled', disabled);
      el.querySelectorAll('input, select, textarea, button').forEach((control) => {
        control.disabled = disabled;
      });
    });

    // Summary when on step 4
    if (state.step === STEP_COUNT) renderSummary();
  }

  function reflectInputs() {
    // Push state.inputs back into form controls after state changes (used on load + eu-not-applicable)
    const i = state.inputs;

    setCheckboxGroup('verticals', i.verticals);
    setCheckboxGroup('dataTypes', i.dataTypes);
    setCheckboxGroup('euTransparencyTypes', i.euTransparencyTypes);

    setSelect('deployment', i.deployment);
    setCheck('eu-not-applicable', i.euNotApplicable);
    setCheck('eu-established', i.euEstablished);
    setSelect('eu-exclusion', i.euExclusion);

    setSelect('asset-type', i.assetType);
    const descEl = document.getElementById('description');
    if (descEl) {
      descEl.value = i.description || '';
      document.getElementById('desc-count').textContent = (i.description || '').length;
    }
    setSelect('business-function', i.businessFunction);
    setSelect('eu-entity', i.euEntity);
    setSelect('operating-model', i.operatingModel);
    setSelect('autonomy-level', i.autonomyLevel);

    setCheck('decisions-affecting-people', i.decisionsAffectingPeople);
    setCheck('interacts-with-end-users', i.interactsWithEndUsers);
    setSelect('eu-residents-data', i.euResidentsData);
    setSelect('expected-risk-level', i.expectedRiskLevel);
    setCheck('vulnerable-populations', i.vulnerablePopulations);
  }

  function setCheckboxGroup(key, values) {
    document.querySelectorAll('input[data-chip-key="' + key + '"]').forEach((cb) => {
      cb.checked = Array.isArray(values) && values.includes(cb.value);
    });
  }
  function setSelect(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
  }
  function setCheck(id, v) {
    const el = document.getElementById(id);
    if (el) el.checked = !!v;
  }

  function renderSummary() {
    const i = state.inputs;
    const grid = document.getElementById('summary-grid');
    const rows = [
      ['Verticals', (i.verticals || []).map(labelFromList(DATA.verticals)).join(', ') || '—'],
      ['Deployment', labelFromList(DATA.deployments)(i.deployment) || '—'],
      ['System type', labelFromList(DATA.assetTypes)(i.assetType) || '—'],
      ['Business function', labelFromList(DATA.businessFunctions)(i.businessFunction) || '—'],
      ['Operating model', labelFromList(DATA.operatingModels)(i.operatingModel) || '—'],
      ['Autonomy', labelFromList(DATA.autonomyLevels)(i.autonomyLevel) || '—'],
      ['Data types', (i.dataTypes || []).map(labelFromList(DATA.dataTypes)).join(', ') || '—'],
      ['EU residents data', i.euResidentsData || (i.euNotApplicable ? 'N/A (EU not applicable)' : '—')],
      ['Expected risk', labelFromList(DATA.riskLevels)(i.expectedRiskLevel) || '—'],
    ];
    grid.innerHTML = rows
      .map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`)
      .join('');
  }

  function labelFromList(list) {
    return (val) => {
      if (!val) return '';
      const hit = list.find((x) => x.value === val);
      return hit ? hit.label : val;
    };
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // ─── 5. rules engine ─────────────────────────────────────────────────────

  const EU_HIGH_RISK_VERTICALS = [
    'HEALTHCARE', 'FINANCIAL_SERVICES', 'INSURANCE', 'HR_EMPLOYMENT',
    'EDUCATION', 'LAW_ENFORCEMENT', 'CRITICAL_INFRA',
  ];

  function deriveFlags(i) {
    const inEUScope = !i.euNotApplicable && (
      i.deployment === 'EU_MARKET' ||
      i.deployment === 'GLOBAL' ||
      i.euEstablished ||
      i.euResidentsData === 'Yes'
    );
    const excluded = !i.euNotApplicable && i.euExclusion && i.euExclusion !== 'none' && i.euExclusion !== '';
    const highRiskVertical = (i.verticals || []).some((v) => EU_HIGH_RISK_VERTICALS.includes(v));
    const highRiskContext = i.decisionsAffectingPeople || i.vulnerablePopulations || (highRiskVertical && i.decisionsAffectingPeople);
    const processesEUResidentData = i.euResidentsData === 'Yes' || i.euResidentsData === 'Unknown';
    const sensitiveData = (i.dataTypes || []).some((d) => ['PII', 'HEALTH', 'FINANCIAL', 'BIOMETRIC', 'EMPLOYMENT', 'CHILDREN'].includes(d));
    const childData = (i.dataTypes || []).includes('CHILDREN');
    const usesTransparency = (i.euTransparencyTypes || []).length > 0;
    const isLLM = i.assetType === 'APPLICATION' || i.assetType === 'AGENT' || i.assetType === 'MODEL';
    const isAgent = i.assetType === 'AGENT' || i.autonomyLevel === 'L4' || i.autonomyLevel === 'L5';
    const isGPAIProvider = i.euEntity === 'PROVIDER' && (i.assetType === 'MODEL');
    const deploysInUS = i.deployment === 'US_ONLY' || i.deployment === 'GLOBAL';
    const deploysInUK = i.deployment === 'UK_ONLY' || i.deployment === 'GLOBAL';
    const saasLike = i.operatingModel === 'AI_SAAS' || i.operatingModel === 'AI_PAAS' || i.operatingModel === 'AGENT_PAAS';

    return {
      inEUScope, excluded, highRiskVertical, highRiskContext,
      processesEUResidentData, sensitiveData, childData, usesTransparency,
      isLLM, isAgent, isGPAIProvider, deploysInUS, deploysInUK, saasLike,
    };
  }

  // applicability : 'MANDATORY' | 'LIKELY' | 'RECOMMENDED' | null
  const RULES = {
    EU_AI_ACT_HIGH_RISK: (i, f) => {
      if (!f.inEUScope || f.excluded) return null;
      if (f.highRiskContext && f.highRiskVertical) return 'MANDATORY';
      if (f.highRiskContext || f.highRiskVertical) return 'LIKELY';
      return null;
    },
    EU_AI_ACT_ART50: (i, f) => {
      if (!f.inEUScope || f.excluded) return null;
      if (f.usesTransparency || i.interactsWithEndUsers) return 'MANDATORY';
      return null;
    },
    EU_AI_ACT_GPAI: (i, f) => {
      if (!f.inEUScope || f.excluded) return null;
      if (f.isGPAIProvider) return 'MANDATORY';
      if (i.assetType === 'MODEL' && i.operatingModel !== 'AI_SAAS') return 'LIKELY';
      return null;
    },
    GDPR: (i, f) => {
      if (i.euResidentsData === 'Yes' && f.sensitiveData) return 'MANDATORY';
      if (i.euResidentsData === 'Yes') return 'MANDATORY';
      if (i.euResidentsData === 'Unknown' && (f.inEUScope || f.sensitiveData)) return 'LIKELY';
      return null;
    },
    UK_GDPR: (i, f) => {
      if (f.deploysInUK && f.sensitiveData) return 'LIKELY';
      if (f.deploysInUK) return 'RECOMMENDED';
      return null;
    },
    NIST_AI_RMF: () => 'RECOMMENDED',
    ISO_42001: () => 'RECOMMENDED',
    COSAI_SRF: () => 'RECOMMENDED',
    CSA_AICM: () => 'RECOMMENDED',
    OWASP_LLM_TOP10: (i, f) => (f.isLLM ? 'RECOMMENDED' : null),
    MITRE_ATLAS: () => 'RECOMMENDED',
    SR_11_7: (i, f) => {
      if (!f.deploysInUS) return null;
      if ((i.verticals || []).includes('FINANCIAL_SERVICES') || (i.verticals || []).includes('INSURANCE')) {
        if (i.decisionsAffectingPeople) return 'MANDATORY';
        return 'LIKELY';
      }
      return null;
    },
    NYDFS_PART_500: (i, f) => {
      if ((i.verticals || []).includes('FINANCIAL_SERVICES') && f.deploysInUS) return 'LIKELY';
      return null;
    },
    FDA_AI_ML: (i) => {
      if ((i.verticals || []).includes('HEALTHCARE') && i.businessFunction === 'HEALTHCARE') {
        return i.expectedRiskLevel === 'CRITICAL' || i.expectedRiskLevel === 'HIGH' ? 'MANDATORY' : 'LIKELY';
      }
      return null;
    },
    HIPAA: (i, f) => {
      const hasHealth = (i.dataTypes || []).includes('HEALTH');
      if (hasHealth && f.deploysInUS) return 'MANDATORY';
      if (hasHealth) return 'LIKELY';
      if ((i.verticals || []).includes('HEALTHCARE') && f.deploysInUS) return 'LIKELY';
      return null;
    },
    PCI_DSS: (i) => {
      const hasFinancial = (i.dataTypes || []).includes('FINANCIAL');
      if (hasFinancial && (i.verticals || []).includes('FINANCIAL_SERVICES')) return 'LIKELY';
      if (hasFinancial || (i.verticals || []).includes('RETAIL_ECOM')) return 'RECOMMENDED';
      return null;
    },
    ISO_27001: (i, f) => (f.sensitiveData || f.saasLike ? 'RECOMMENDED' : 'RECOMMENDED'),
    SOC2: (i, f) => (f.saasLike ? 'LIKELY' : null),
    COLORADO_AI_ACT: (i, f) => {
      if (!f.deploysInUS) return null;
      if (i.decisionsAffectingPeople && f.highRiskVertical) return 'LIKELY';
      return null;
    },
    UK_ATRS: (i, f) => {
      if (!f.deploysInUK) return null;
      if ((i.verticals || []).includes('PUBLIC_SECTOR')) return 'LIKELY';
      return null;
    },
  };

  function classifyRegulations(i) {
    const f = deriveFlags(i);
    const out = [];
    DATA.regulations.forEach((reg) => {
      const rule = RULES[reg.code];
      const applicability = rule ? rule(i, f) : 'RECOMMENDED';
      if (applicability) {
        out.push(Object.assign({}, reg, { applicability }));
      }
    });
    return { regulations: out, flags: f };
  }

  function computeRiskScore(i, f) {
    const w = DATA.scoring.weights;
    let score = DATA.scoring.base;
    if (f.highRiskVertical) score += w.verticalHighRisk;
    if (i.decisionsAffectingPeople) score += w.decisionsAffectingPeople;
    if (i.vulnerablePopulations) score += w.vulnerablePopulations;
    if (i.autonomyLevel === 'L4' || i.autonomyLevel === 'L5') score += w.autonomyL4L5;
    if (f.sensitiveData) score += w.sensitiveData;
    if (f.childData) score += w.sensitiveDataChildren;
    if (f.inEUScope) score += w.euScope;
    if (i.expectedRiskLevel === 'CRITICAL') score += w.expectedCritical;
    else if (i.expectedRiskLevel === 'HIGH') score += w.expectedHigh;
    else if (i.expectedRiskLevel === 'MEDIUM') score += w.expectedMedium;
    if (f.isGPAIProvider) score += w.gpai;
    return Math.min(100, Math.max(0, Math.round(score)));
  }

  function maturityFor(score) {
    for (const t of DATA.scoring.maturityThresholds) {
      if (score <= t.max) return t.level;
    }
    return 5;
  }

  function aggregateControls(regulations) {
    const byCode = {};
    regulations.forEach((reg) => {
      const weight = reg.applicability === 'MANDATORY' ? 3 : reg.applicability === 'LIKELY' ? 2 : 1;
      (reg.controls || []).forEach((code) => {
        if (!byCode[code]) byCode[code] = { code, weight: 0, sources: new Set() };
        byCode[code].weight += weight;
        byCode[code].sources.add(reg.code);
      });
    });
    const items = Object.values(byCode).map((c) => {
      const tmpl = DATA.controlTemplates[c.code] || { title: c.code, layer: 'L3' };
      return {
        code: c.code,
        title: tmpl.title,
        layer: tmpl.layer,
        weight: c.weight,
        sources: Array.from(c.sources),
      };
    });
    items.sort((a, b) => b.weight - a.weight);
    // Group by layer
    const layers = { L1: [], L2: [], L3: [], L4: [], L5: [] };
    items.forEach((it) => {
      if (!layers[it.layer]) layers[it.layer] = [];
      layers[it.layer].push(it);
    });
    // Cap each layer to top 4
    Object.keys(layers).forEach((k) => {
      layers[k] = layers[k].slice(0, 4);
    });
    return layers;
  }

  function runDiscovery() {
    const i = state.inputs;
    const missing = missingForAllSteps();

    if (missing.length) {
      showValidation(missing, 'Please complete before running:');
      return;
    }
    hideValidation();

    const { regulations, flags } = classifyRegulations(i);
    const riskScore = computeRiskScore(i, flags);
    const maturity = maturityFor(riskScore);
    const controlsByLayer = aggregateControls(regulations);

    const mandatory = regulations.filter((r) => r.applicability === 'MANDATORY');
    const likely = regulations.filter((r) => r.applicability === 'LIKELY');
    const recommended = regulations.filter((r) => r.applicability === 'RECOMMENDED');

    lastResult = { regulations, mandatory, likely, recommended, riskScore, maturity, controlsByLayer, inputs: cloneState(i) };

    renderResults(lastResult);
    document.getElementById('btn-pdf').disabled = false;
  }

  function missingForStep(step) {
    const i = state.inputs;
    if (step === 1) {
      const missing = [];
      if (!i.deployment) missing.push('Deployment');
      return missing;
    }
    if (step === 2) {
      const missing = [];
      if (!i.assetType) missing.push('AI system type');
      if (!i.businessFunction) missing.push('Business function');
      if (!i.operatingModel) missing.push('Operating model');
      if (!i.autonomyLevel) missing.push('Autonomy level');
      return missing;
    }
    if (step === 3) {
      const missing = [];
      if (!i.euResidentsData) missing.push('EU residents data');
      if (!i.expectedRiskLevel) missing.push('Expected risk level');
      return missing;
    }
    return [];
  }

  function missingForAllSteps() {
    return [1, 2, 3].reduce((items, step) => items.concat(missingForStep(step)), []);
  }

  function showValidation(items, title) {
    const box = document.getElementById('validation-box');
    const heading = document.getElementById('validation-title');
    const list = document.getElementById('validation-list');
    if (heading && title) heading.textContent = title;
    list.innerHTML = items.map((x) => `<li>${escapeHtml(x)}</li>`).join('');
    box.hidden = false;
  }
  function hideValidation() {
    const box = document.getElementById('validation-box');
    const list = document.getElementById('validation-list');
    if (box) box.hidden = true;
    if (list) list.innerHTML = '';
  }

  function renderResults(result) {
    const res = document.getElementById('results');
    res.hidden = false;

    setText('#risk-score', String(result.riskScore) + '/100');
    setText('#risk-interp', riskInterpretation(result.riskScore));
    setText('#maturity-level', 'M' + result.maturity);
    setText('#reg-count', String(result.regulations.length));
    setText('#mandatory-count', String(result.mandatory.length));
    setText('#likely-count', String(result.likely.length));

    const list = document.getElementById('reg-list');
    const order = ['MANDATORY', 'LIKELY', 'RECOMMENDED'];
    const sorted = result.regulations.slice().sort((a, b) => order.indexOf(a.applicability) - order.indexOf(b.applicability));
    list.innerHTML = sorted.map((r) => regHtml(r)).join('');

    const host = document.getElementById('layer-controls');
    host.innerHTML = ['L1', 'L2', 'L3', 'L4', 'L5']
      .map((layer) => {
        const items = result.controlsByLayer[layer] || [];
        if (!items.length) return '';
        const layerMeta = DATA.layers[layer];
        return `
          <div class="layer-block" data-layer="${layer}">
            <p class="layer-block__title">${layer} · ${escapeHtml(layerMeta.name)}</p>
            <ul>${items.map((c) => `<li>${escapeHtml(c.title)} <span class="reg-juris">(${c.sources.length} source${c.sources.length === 1 ? '' : 's'})</span></li>`).join('')}</ul>
          </div>`;
      })
      .join('');
  }

  function regHtml(r) {
    const pillClass =
      r.applicability === 'MANDATORY' ? 'pill--mandatory'
      : r.applicability === 'LIKELY' ? 'pill--likely'
      : 'pill--recommended';
    const citations = (r.citations || []).map(escapeHtml).join(' · ');
    const layerLabel = DATA.layers[r.primarySRFLayer]
      ? `${r.primarySRFLayer} · ${DATA.layers[r.primarySRFLayer].name}`
      : r.primarySRFLayer;
    return `
      <li class="reg-item">
        <div class="reg-head">
          <span class="pill ${pillClass}">${r.applicability}</span>
          <span class="reg-name">${escapeHtml(r.name)}</span>
          <span class="reg-juris">${escapeHtml(r.jurisdiction)}</span>
          <span class="pill pill--layer">${escapeHtml(layerLabel)}</span>
        </div>
        <p class="reg-why">${escapeHtml(r.why)}</p>
        ${citations ? `<div class="reg-citations">${citations}</div>` : ''}
      </li>`;
  }

  function riskInterpretation(score) {
    if (score >= 80) return 'Critical — expect strict regulatory oversight';
    if (score >= 60) return 'High — likely high-risk classification';
    if (score >= 40) return 'Medium — moderate oversight required';
    if (score >= 20) return 'Low — minimal obligations likely';
    return 'Very low — baseline hygiene only';
  }

  // ─── 6. persistence ──────────────────────────────────────────────────────
  function persist() {
    if (!STORAGE_KEY) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        step: state.step, maxStep: state.maxStep, inputs: state.inputs,
      }));
    } catch (e) {
      // quota or disabled storage — ignore
    }
  }

  function loadFromStorage() {
    if (!STORAGE_KEY) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { reflectInputs(); return; }
      const parsed = JSON.parse(raw);
      if (parsed && parsed.inputs) {
        state.inputs = Object.assign(emptyState().inputs, parsed.inputs);
        state.step = Math.max(1, Math.min(STEP_COUNT, parsed.step || 1));
        state.maxStep = Math.max(state.step, parsed.maxStep || 1);
      }
    } catch (e) {
      // corrupt — start fresh
    }
    reflectInputs();
  }

  function exportJson() {
    const blob = new Blob(
      [JSON.stringify({ version: DATA.meta.version, inputs: state.inputs }, null, 2)],
      { type: 'application/json' }
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (DATA.meta.id || 'regulation-discovery') + '-inputs.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }

  function importJson(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        if (parsed && parsed.inputs) {
          state.inputs = Object.assign(emptyState().inputs, parsed.inputs);
          reflectInputs();
          persist();
          render();
        }
      } catch (err) {
        alert('Could not parse that JSON file.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  function resetAll() {
    if (!confirm('Reset all answers?')) return;
    Object.assign(state, emptyState());
    try { if (STORAGE_KEY) localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    reflectInputs();
    render();
    document.getElementById('results').hidden = true;
    document.getElementById('btn-pdf').disabled = true;
    lastResult = null;
  }

  function cloneState(s) { return JSON.parse(JSON.stringify(s)); }

  // ─── 7. PDF export ───────────────────────────────────────────────────────
  function pdfSafe(str) {
    return String(str == null ? '' : str)
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
    if (!lastResult) {
      alert('Run discovery first.');
      return;
    }
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF !== 'function') {
      alert('PDF library did not load. Try the browser print option instead.');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const navy = [15, 31, 61];
    const blue = [45, 91, 227];
    const white = [255, 255, 255];
    const slate600 = [71, 85, 105];
    const slate500 = [100, 116, 139];
    const slate800 = [30, 41, 59];
    const red = [185, 28, 28];
    const amber = [161, 98, 7];

    const W = 210, H = 297, M = 18;
    let y = 0;

    // Header band
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

    // Summary line
    const i = lastResult.inputs;
    const summaryLines = [
      'Verticals: ' + ((i.verticals || []).map(labelFromList(DATA.verticals)).join(', ') || '-'),
      'Deployment: ' + (labelFromList(DATA.deployments)(i.deployment) || '-'),
      'System: ' + (labelFromList(DATA.assetTypes)(i.assetType) || '-') + ' / ' + (labelFromList(DATA.businessFunctions)(i.businessFunction) || '-'),
      'Autonomy: ' + (labelFromList(DATA.autonomyLevels)(i.autonomyLevel) || '-'),
      'Data types: ' + ((i.dataTypes || []).map(labelFromList(DATA.dataTypes)).join(', ') || '-'),
    ];
    doc.setTextColor(slate800[0], slate800[1], slate800[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Your inputs', M, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(slate600[0], slate600[1], slate600[2]);
    summaryLines.forEach((l) => {
      const wrapped = doc.splitTextToSize(pdfSafe(l), W - 2 * M);
      wrapped.forEach((w) => { doc.text(w, M, y); y += 4; });
    });
    y += 4;

    // Scorecard
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(M, y, W - 2 * M, 22, 2, 2, 'FD');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(slate800[0], slate800[1], slate800[2]);
    doc.text('Risk score: ' + lastResult.riskScore + '/100', M + 4, y + 8);
    doc.text('Est. maturity: M' + lastResult.maturity, M + 70, y + 8);
    doc.text('Applicable regulations: ' + lastResult.regulations.length, M + 130, y + 8);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(pdfSafe(riskInterpretation(lastResult.riskScore)), M + 4, y + 15);
    doc.text('Mandatory: ' + lastResult.mandatory.length + ' · Likely: ' + lastResult.likely.length + ' · Recommended: ' + lastResult.recommended.length, M + 70, y + 15);
    y += 28;

    // Regulations list
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(slate800[0], slate800[1], slate800[2]);
    doc.text('Applicable regulations', M, y);
    y += 6;

    const order = ['MANDATORY', 'LIKELY', 'RECOMMENDED'];
    const sorted = lastResult.regulations.slice().sort((a, b) => order.indexOf(a.applicability) - order.indexOf(b.applicability));
    sorted.forEach((r) => {
      if (y > H - 30) { doc.addPage(); y = M; }
      const color = r.applicability === 'MANDATORY' ? red : r.applicability === 'LIKELY' ? amber : slate500;
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(M, y - 3, 2, 10, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(slate800[0], slate800[1], slate800[2]);
      doc.text(pdfSafe(r.applicability + ' · ' + r.name + ' (' + r.jurisdiction + ')'), M + 5, y + 2);
      y += 6;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(slate600[0], slate600[1], slate600[2]);
      const whyWrapped = doc.splitTextToSize(pdfSafe(r.why), W - 2 * M - 6);
      whyWrapped.forEach((w) => {
        if (y > H - 20) { doc.addPage(); y = M; }
        doc.text(w, M + 5, y);
        y += 3.6;
      });
      if (r.citations && r.citations.length) {
        doc.setTextColor(slate500[0], slate500[1], slate500[2]);
        doc.text(pdfSafe('Cites: ' + r.citations.join(' · ')), M + 5, y);
        y += 4;
      }
      y += 3;
    });

    // Controls by layer
    if (y > H - 50) { doc.addPage(); y = M; }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(slate800[0], slate800[1], slate800[2]);
    doc.text('Top controls by CoSAI AI SRF layer', M, y);
    y += 6;

    ['L1', 'L2', 'L3', 'L4', 'L5'].forEach((layer) => {
      const items = lastResult.controlsByLayer[layer] || [];
      if (!items.length) return;
      if (y > H - 20) { doc.addPage(); y = M; }
      const layerMeta = DATA.layers[layer];
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(slate800[0], slate800[1], slate800[2]);
      doc.text(pdfSafe(layer + ' - ' + layerMeta.name), M, y);
      y += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(slate600[0], slate600[1], slate600[2]);
      items.forEach((c) => {
        if (y > H - 20) { doc.addPage(); y = M; }
        doc.text(pdfSafe('- ' + c.title), M + 4, y);
        y += 4;
      });
      y += 2;
    });

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(pdfSafe(DATA.meta.title + ' - ' + DATA.meta.sources.join(' · ')), M, H - 8);

    doc.save(DATA.meta.pdfFilename);
  }
})();
