// --------------------
// Menu burger (réel)
// --------------------
const toggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

if (toggle && navLinks) {
  toggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}

// --------------------
// FORMULAIRE: champs "Autre" + toast après envoyer
// --------------------
const dabForm = document.getElementById("dabForm");
if (dabForm) {
  const opAutreRadio = document.getElementById("opAutre");
  const opAutreBox = document.getElementById("opAutreBox");
  const opAutreTxt = document.getElementById("opAutreTxt");

  const incAutreCheck = document.getElementById("incAutre");
  const incAutreBox = document.getElementById("incAutreBox");
  const incAutreTxt = document.getElementById("incAutreTxt");

  const toast = document.getElementById("formToast");
  const toastClose = document.getElementById("toastClose");

  function updateOpAutre() {
    const isAutre = opAutreRadio && opAutreRadio.checked;
    if (!opAutreBox) return;
    opAutreBox.classList.toggle("hidden", !isAutre);
    if (opAutreTxt) opAutreTxt.required = !!isAutre;
    if (!isAutre && opAutreTxt) opAutreTxt.value = "";
  }

  function updateIncAutre() {
    const isAutre = incAutreCheck && incAutreCheck.checked;
    if (!incAutreBox) return;
    incAutreBox.classList.toggle("hidden", !isAutre);
    if (incAutreTxt) incAutreTxt.required = !!isAutre;
    if (!isAutre && incAutreTxt) incAutreTxt.value = "";
  }

  dabForm.addEventListener("change", () => {
    updateOpAutre();
    updateIncAutre();
  });

  dabForm.addEventListener("reset", () => {
    setTimeout(() => {
      updateOpAutre();
      updateIncAutre();
      if (toast) toast.classList.add("hidden");
    }, 0);
  });

  dabForm.addEventListener("submit", (e) => {
    // Empêche l'envoi réel (pas de back-end)
    e.preventDefault();

    // Affiche le message "données non stockées"
    if (toast) toast.classList.remove("hidden");

    // Option : scroll vers le haut si besoin
    // window.scrollTo({ top: 0, behavior: "smooth" });
  });

  if (toastClose && toast) {
    toastClose.addEventListener("click", () => toast.classList.add("hidden"));
  }

  // Init
  updateOpAutre();
  updateIncAutre();
}

// --------------------
// ATM (uniquement si la page ATM est présente)
// --------------------
const currencySelect = document.getElementById("atmCurrency");

if (currencySelect) {
  const ATM = {
    EUR: {
      label: "EUR (€)",
      locale: "fr-FR",
      currency: "EUR",
      minor: 100,
      // Plafond 1500€ => 150000 cents
      dailyLimitMinor: 150000,
      denomsMinor: [
        50000, 20000, 10000, 5000, 2000, 1000, 500,
        200, 100, 50, 20, 10, 5, 2, 1
      ],
      example: "130.70",
      maxMinor: 200000
    },
    USD: {
      label: "USD ($)",
      locale: "en-US",
      currency: "USD",
      minor: 100,
      dailyLimitMinor: 200000, // limite démo
      denomsMinor: [10000, 5000, 2000, 1000, 500, 100, 25, 10, 5, 1],
      example: "87.36",
      maxMinor: 200000
    },
    GBP: {
      label: "GBP (£)",
      locale: "en-GB",
      currency: "GBP",
      minor: 100,
      dailyLimitMinor: 200000,
      denomsMinor: [5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1],
      example: "56.89",
      maxMinor: 200000
    },
    JPY: {
      label: "JPY (¥)",
      locale: "ja-JP",
      currency: "JPY",
      minor: 1,
      dailyLimitMinor: 2000000,
      denomsMinor: [10000, 5000, 2000, 1000, 500, 100, 50, 10, 5, 1],
      example: "18670",
      maxMinor: 2000000
    }
  };

  const denomsChips = document.getElementById("denomsChips");
  const forceDP = document.getElementById("atmForceDP");

  const screenCurrency = document.getElementById("screenCurrency");
  const screenAmount = document.getElementById("screenAmount");
  const screenHint = document.getElementById("screenHint");
  const statusEl = document.getElementById("atmStatus");
  const receipt = document.getElementById("atmReceipt");

  const btnEnter = document.getElementById("btnEnter");
  const btnClear = document.getElementById("btnClear");
  const btnExample = document.getElementById("btnExample");
  const keypadKeys = document.querySelectorAll(".key");

  let enabledDenoms = new Set();
  let current = "EUR";
  let amountStr = "";

  function fmtMoney(code, minorAmount) {
    const cfg = ATM[code];
    const major = minorAmount / cfg.minor;

    const nf = new Intl.NumberFormat(cfg.locale, {
      style: "currency",
      currency: cfg.currency,
      maximumFractionDigits: cfg.minor === 1 ? 0 : 2,
      minimumFractionDigits: cfg.minor === 1 ? 0 : 2
    });

    return nf.format(major);
  }

  function setStatus(text, kind = "ok") {
    statusEl.textContent = text;
    statusEl.style.color = kind === "error" ? "#dc2626" : "";
  }

  function sanitizeAmountString(s, code) {
    const cfg = ATM[code];
    if (cfg.minor === 1) return s.replace(/[^\d]/g, "");

    let out = s.replace(/[^\d.]/g, "");
    const firstDot = out.indexOf(".");
    if (firstDot !== -1) {
      out = out.slice(0, firstDot + 1) + out.slice(firstDot + 1).replace(/\./g, "");
      const parts = out.split(".");
      if (parts[1]?.length > 2) out = parts[0] + "." + parts[1].slice(0, 2);
    }
    return out;
  }

  function amountToMinor(s, code) {
    const cfg = ATM[code];

    if (cfg.minor === 1) {
      const n = Number(s || "0");
      return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
    }

    const clean = s || "0";
    const [intPart, decPartRaw = ""] = clean.split(".");
    const decPart = (decPartRaw + "00").slice(0, 2);

    const cents = Number(intPart || "0") * 100 + Number(decPart || "0");
    return Number.isFinite(cents) ? Math.max(0, cents) : 0;
  }

  function updateScreen() {
    screenCurrency.textContent = ATM[current].label;
    const minor = amountToMinor(amountStr, current);
    screenAmount.textContent = fmtMoney(current, minor);
  }

  function renderDenoms(code) {
    const cfg = ATM[code];
    enabledDenoms = new Set(cfg.denomsMinor);

    denomsChips.innerHTML = cfg.denomsMinor.map((d) => {
      const on = enabledDenoms.has(d);
      const label = fmtMoney(code, d);
      const mini = (cfg.minor === 1)
        ? (d >= 1000 ? "billet" : "pièce")
        : (d >= 500 ? "billet" : "pièce");

      return `
        <button type="button" class="chip-btn" data-denom="${d}" aria-pressed="${on}">
          ${label}<span class="chip-mini">${mini}</span>
        </button>
      `;
    }).join("");

    denomsChips.querySelectorAll(".chip-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const v = Number(btn.getAttribute("data-denom"));
        const isOn = btn.getAttribute("aria-pressed") === "true";
        if (isOn) enabledDenoms.delete(v);
        else enabledDenoms.add(v);
        btn.setAttribute("aria-pressed", String(!isOn));
      });
    });
  }

  function greedy(amountMinor, denomsDesc) {
    const counts = new Map();
    let remaining = amountMinor;
    for (const d of denomsDesc) counts.set(d, 0);

    for (const d of denomsDesc) {
      const n = Math.floor(remaining / d);
      if (n > 0) {
        counts.set(d, n);
        remaining -= n * d;
      }
    }
    return { ok: remaining === 0, counts, remaining };
  }

  function dpMinUnits(amountMinor, denomsAsc) {
    const INF = 1e9;
    const dp = new Array(amountMinor + 1).fill(INF);
    const prev = new Array(amountMinor + 1).fill(null);
    dp[0] = 0;

    for (let x = 1; x <= amountMinor; x++) {
      for (const d of denomsAsc) {
        if (x - d >= 0 && dp[x - d] + 1 < dp[x]) {
          dp[x] = dp[x - d] + 1;
          prev[x] = { from: x - d, denom: d };
        }
      }
    }

    if (dp[amountMinor] >= INF) return { ok: false };

    const counts = new Map();
    for (const d of denomsAsc) counts.set(d, 0);

    let cur = amountMinor;
    while (cur > 0) {
      const step = prev[cur];
      if (!step) break;
      counts.set(step.denom, (counts.get(step.denom) || 0) + 1);
      cur = step.from;
    }

    return { ok: true, counts, total: dp[amountMinor] };
  }

  function receiptHtml(code, amountMinor, counts, note) {
    const cfg = ATM[code];
    const entries = Array.from(counts.entries())
      .filter(([, n]) => n > 0)
      .sort(([a], [b]) => b - a);

    const total = entries.reduce((s, [, n]) => s + n, 0);

    const lines = entries.map(([d, n]) => `
      <div class="receipt-grid">
        <div>${n} × ${fmtMoney(code, d)}</div>
        <div></div>
      </div>
    `).join("");

    return `
      <div class="receipt-title">TICKET</div>
      <div class="receipt-grid"><div>Devise</div><div><strong>${cfg.label}</strong></div></div>
      <div class="receipt-grid"><div>Montant</div><div><strong>${fmtMoney(code, amountMinor)}</strong></div></div>
      <div class="receipt-grid"><div>Unités</div><div><strong>${total}</strong></div></div>
      <div class="receipt-sep"></div>
      ${lines || `<div class="receipt-line muted">Aucune combinaison</div>`}
      <div class="receipt-sep"></div>
      <div class="receipt-line muted">${note}</div>
    `;
  }

  function clearAll() {
    amountStr = "";
    setStatus("READY");
    screenHint.textContent = "Saisis un montant puis valide.";
    receipt.innerHTML = `<div class="receipt-title">TICKET</div><div class="receipt-text muted">En attente…</div>`;
    updateScreen();
  }

  function pressKey(k) {
    const cfg = ATM[current];

    if (k === "dot") {
      if (cfg.minor === 1) return;
      if (amountStr.includes(".")) return;
      amountStr = amountStr.length ? (amountStr + ".") : "0.";
    } else if (k === "back") {
      amountStr = amountStr.slice(0, -1);
    } else {
      amountStr += String(k);
    }

    amountStr = sanitizeAmountString(amountStr, current);
    updateScreen();
  }

  function enter() {
    const cfg = ATM[current];
    const amountMinor = amountToMinor(amountStr, current);

    if (amountMinor <= 0) {
      setStatus("ERROR", "error");
      screenHint.textContent = "Montant invalide.";
      return;
    }

    // ✅ Plafond respecté (surtout EUR=800€)
    if (cfg.dailyLimitMinor && amountMinor > cfg.dailyLimitMinor) {
      setStatus("REFUSÉ", "error");
      screenHint.textContent = "Plafond dépassé.";
      receipt.innerHTML = receiptHtml(current, amountMinor, new Map(), `Plafond: ${fmtMoney(current, cfg.dailyLimitMinor)}.`);
      return;
    }

    if (amountMinor > cfg.maxMinor) {
      setStatus("ERROR", "error");
      screenHint.textContent = "Montant trop élevé pour cette démonstration.";
      return;
    }

    const denoms = Array.from(enabledDenoms).filter(d => d > 0).sort((a, b) => a - b);
    if (denoms.length === 0) {
      setStatus("ERROR", "error");
      screenHint.textContent = "Aucune coupure sélectionnée.";
      return;
    }

    const denomsDesc = denoms.slice().sort((a, b) => b - a);
    const useDP = !!forceDP.checked;

    if (useDP) {
      const dp = dpMinUnits(amountMinor, denoms);
      if (!dp.ok) {
        setStatus("REFUSÉ", "error");
        screenHint.textContent = "Impossible avec ces coupures.";
        receipt.innerHTML = receiptHtml(current, amountMinor, new Map(), "Opération refusée.");
        return;
      }
      setStatus("OK");
      screenHint.textContent = "Opération validée.";
      receipt.innerHTML = receiptHtml(current, amountMinor, dp.counts, "Calcul garanti (DP).");
      return;
    }

    const g = greedy(amountMinor, denomsDesc);
    if (g.ok) {
      setStatus("OK");
      screenHint.textContent = "Opération validée.";
      receipt.innerHTML = receiptHtml(current, amountMinor, g.counts, "Calcul rapide.");
      return;
    }

    const dp = dpMinUnits(amountMinor, denoms);
    if (!dp.ok) {
      setStatus("REFUSÉ", "error");
      screenHint.textContent = "Impossible avec ces coupures.";
      receipt.innerHTML = receiptHtml(current, amountMinor, new Map(), "Opération refusée.");
      return;
    }

    setStatus("OK");
    screenHint.textContent = "Opération validée.";
    receipt.innerHTML = receiptHtml(current, amountMinor, dp.counts, "Calcul garanti utilisé.");
  }

  function setCurrency(code) {
    current = code;
    renderDenoms(code);
    amountStr = sanitizeAmountString(amountStr, code);
    updateScreen();
    setStatus("READY");
  }

  currencySelect.addEventListener("change", () => setCurrency(currencySelect.value));

  keypadKeys.forEach(btn => {
    btn.addEventListener("click", () => pressKey(btn.dataset.key));
  });

  btnClear?.addEventListener("click", clearAll);
  btnEnter?.addEventListener("click", enter);
  btnExample?.addEventListener("click", () => {
    amountStr = sanitizeAmountString(ATM[current].example, current);
    updateScreen();
    setStatus("READY");
    screenHint.textContent = "Exemple chargé.";
  });

  window.addEventListener("keydown", (e) => {
    const k = e.key;
    if (k >= "0" && k <= "9") pressKey(k);
    else if (k === "." || k === ",") pressKey("dot");
    else if (k === "Backspace") pressKey("back");
    else if (k === "Enter") enter();
    else if (k === "Escape") clearAll();
  });

  setCurrency(currencySelect.value);
  clearAll();
}