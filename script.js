(() => {
  "use strict";

  const MAX_GOALS = 5;

 
  const state = {
    goals: [],
    currentGoalId: null,
  };

 
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const MONTHS_LONG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  
  function formatRupiah(value) {
    const n = Math.round(Number(value) || 0);
    return "Rp" + group(n);
  }

  
  function group(n) {
    const abs = Math.abs(Math.round(Number(n) || 0)).toString();
    return abs.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  
  function parseDigits(str) {
    const digits = String(str || "").replace(/[^\d]/g, "");
    return digits ? parseInt(digits, 10) : 0;
  }

  function addDays(days) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return d;
  }

  function toISO(date) {
    const d = new Date(date);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }

  
  function formatDate(iso) {
    if (!iso) return "Tanpa tenggat";
    const [y, m, d] = iso.split("-").map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
  }

  
  function daysUntil(iso) {
    if (!iso) return null;
    const [y, m, d] = iso.split("-").map(Number);
    const target = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  let uid = 1;
  const nextId = () => "g" + uid++;

 
  function demoGoals() {
    uid = 1;
    return [
      {
        id: nextId(),
        name: "Laptop Baru",
        target: 5000000,
        saved: 3250000,
        deadline: toISO(addDays(96)),
        history: [
          { id: "h1", date: toISO(addDays(-118)), amount: 1500000, note: "Bonus proyek sampingan" },
          { id: "h2", date: toISO(addDays(-64)), amount: 1000000, note: "Sisihan gajian Juli" },
          { id: "h3", date: toISO(addDays(-19)), amount: 750000, note: "Sisa anggaran bulanan" },
        ],
      },
      {
        id: nextId(),
        name: "Liburan ke Bali",
        target: 2000000,
        saved: 800000,
        
        deadline: toISO(addDays(22)),
        history: [
          { id: "h4", date: toISO(addDays(-48)), amount: 500000, note: "Awal menyisihkan" },
          { id: "h5", date: toISO(addDays(-15)), amount: 300000, note: "Hasil jual barang bekas" },
        ],
      },
      {
        id: nextId(),
        name: "Dana Darurat",
        target: 1000000,
        saved: 200000,
        deadline: null,
        history: [
          { id: "h6", date: toISO(addDays(-12)), amount: 200000, note: "Langkah pertama" },
        ],
      },
    ];
  }

 
  function percentOf(goal) {
    if (!goal.target) return 0;
    return (goal.saved / goal.target) * 100;
  }

  function statusOf(goal) {
    if (goal.saved >= goal.target) return { label: "Tercapai", cls: "badge-done" };
    const days = daysUntil(goal.deadline);
    if (days !== null && days < 0) return { label: "Tenggat lewat", cls: "badge-due" };
    if (days !== null && days <= 30) return { label: "Mendekati tenggat", cls: "badge-due" };
    return { label: "Berjalan", cls: "badge-run" };
  }

  function deadlineText(goal) {
    const days = daysUntil(goal.deadline);
    if (days === null) return "Tanpa tenggat";
    if (days < 0) return `Lewat ${Math.abs(days)} hari`;
    if (days === 0) return "Hari ini";
    return `${days} hari lagi`;
  }

  function sortedHistory(goal) {
    return goal.history.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }

 
  const el = {
    viewDashboard: document.getElementById("view-dashboard"),
    viewDetail: document.getElementById("view-detail"),
    grid: document.getElementById("goal-grid"),
    empty: document.getElementById("empty-state"),
    subtitle: document.getElementById("dash-subtitle"),
    detailContent: document.getElementById("detail-content"),
    fab: document.getElementById("fab-new-goal"),
    modalProgress: document.getElementById("modal-progress"),
    modalGoal: document.getElementById("modal-goal"),
    formProgress: document.getElementById("form-progress"),
    formGoal: document.getElementById("form-goal"),
    progressAmount: document.getElementById("progress-amount"),
    progressNote: document.getElementById("progress-note"),
    progressError: document.getElementById("progress-error"),
    progressSub: document.getElementById("progress-sub"),
    goalName: document.getElementById("goal-name"),
    goalTarget: document.getElementById("goal-target"),
    goalDeadline: document.getElementById("goal-deadline"),
    goalNameError: document.getElementById("goal-name-error"),
    goalTargetError: document.getElementById("goal-target-error"),
    goalLimitError: document.getElementById("goal-limit-error"),
    toast: document.getElementById("toast"),
  };

  function progressBarHtml(goal) {
    const pct = percentOf(goal);
    const width = Math.min(100, Math.max(0, pct));
    return `
      <div class="progress"><div class="progress-fill" style="width:${width}%"></div></div>
      <div class="progress-meta">
        <span class="mono">${Math.round(pct)}%</span>
        <span>${deadlineText(goal)}</span>
      </div>`;
  }

  function renderDashboard() {
    const goals = state.goals;

    el.empty.hidden = goals.length > 0;
    el.grid.hidden = goals.length === 0;
    el.subtitle.textContent = goals.length
      ? `${goals.length} dari ${MAX_GOALS} target aktif · semua data hanya tersimpan selama halaman terbuka.`
      : "Belum ada target aktif.";

    if (!goals.length) return;

    el.grid.innerHTML = goals
      .map((goal) => {
        const status = statusOf(goal);
        return `
        <article class="goal-card" role="button" tabindex="0" data-action="open-goal" data-id="${goal.id}">
          <div class="card-thumb">
            <span class="card-thumb-label">Gambar target</span>
            <span class="badge badge-privacy" style="position:absolute;top:10px;right:10px">🔒 Hanya Anda</span>
          </div>
          <div class="card-body">
            <div class="card-top">
              <span class="card-name">${escapeHtml(goal.name)}</span>
              <span class="badge ${status.cls}">${status.label}</span>
            </div>
            <div class="card-amounts">
              <span class="card-saved">${formatRupiah(goal.saved)}</span>
              <span class="card-target">/ ${formatRupiah(goal.target)}</span>
            </div>
            ${progressBarHtml(goal)}
            <div class="card-foot">
              <span>Tenggat ${formatDate(goal.deadline)}</span>
              <span>${goal.history.length} catatan</span>
            </div>
          </div>
        </article>`;
      })
      .join("");
  }

 
  function renderDetail() {
    const goal = state.goals.find((g) => g.id === state.currentGoalId);
    if (!goal) {
      goDashboard();
      return;
    }

    const status = statusOf(goal);
    const remaining = Math.max(0, goal.target - goal.saved);
    const pct = Math.round(percentOf(goal));
    const history = sortedHistory(goal);

    el.detailContent.innerHTML = `
      <div class="detail-hero">
        <div class="detail-thumb">
          <span>Gambar target (placeholder)</span>
          <span class="badge badge-privacy">🔒 Hanya Anda</span>
        </div>
        <div class="detail-body">
          <div class="detail-title-row">
            <h1 class="detail-title">${escapeHtml(goal.name)}</h1>
            <span class="badge ${status.cls}">${status.label}</span>
          </div>

          <div class="detail-amount">
            <span class="saved">${formatRupiah(goal.saved)}</span>
            <span class="of">dari ${formatRupiah(goal.target)}</span>
          </div>

          <div class="progress"><div class="progress-fill" style="width:${Math.min(100, Math.max(0, percentOf(goal)))}%"></div></div>
          <div class="progress-meta">
            <span class="mono">${pct}% tercapai</span>
            <span>${remaining > 0 ? `Sisa ${formatRupiah(remaining)}` : "Target sudah tercapai"}</span>
          </div>

          <div class="detail-stats">
            <div>
              <div class="stat-label">Nominal target</div>
              <div class="stat-value">${formatRupiah(goal.target)}</div>
            </div>
            <div>
              <div class="stat-label">Tenggat</div>
              <div class="stat-value">${formatDate(goal.deadline)}</div>
            </div>
            <div>
              <div class="stat-label">Sisa waktu</div>
              <div class="stat-value">${deadlineText(goal)}</div>
            </div>
          </div>

          <div class="detail-actions">
            <button class="btn btn-primary" data-action="open-progress-modal">+ Tambah Progres</button>
          </div>
        </div>
      </div>

      <div class="section-title">
        <span>Riwayat progres</span>
        <span class="muted small">${history.length} catatan</span>
      </div>

      ${
        history.length
          ? `<ul class="history">${history
              .map(
                (h) => `
              <li class="history-item">
                <div>
                  <div class="history-note">${escapeHtml(h.note || "Tanpa catatan")}</div>
                  <div class="history-date">${formatDate(h.date)}</div>
                </div>
                <div class="history-amount">+${formatRupiah(h.amount)}</div>
              </li>`
              )
              .join("")}</ul>`
          : `<div class="history-empty">Belum ada progres. Mulai dari nominal kecil pun tidak apa-apa.</div>`
      }
    `;
  }

  function renderAll() {
    renderDashboard();
    if (state.currentGoalId) renderDetail();
  }

 
  function goDashboard() {
    state.currentGoalId = null;
    el.viewDetail.classList.remove("is-active");
    el.viewDashboard.classList.add("is-active");
    el.fab.hidden = false;
    renderDashboard();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openGoal(id) {
    state.currentGoalId = id;
    el.viewDashboard.classList.remove("is-active");
    el.viewDetail.classList.add("is-active");
    el.fab.hidden = true;
    renderDetail();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

 
  function openModal(node) {
    node.hidden = false;
    const firstInput = node.querySelector("input[type=text]");
    if (firstInput) setTimeout(() => firstInput.focus(), 60);
  }

  function closeModal(node) {
    node.hidden = true;
  }

  function closeAllModals() {
    closeModal(el.modalProgress);
    closeModal(el.modalGoal);
  }

  function showError(node, message) {
    node.textContent = message;
    node.hidden = false;
  }

  function clearErrors() {
    [el.progressError, el.goalNameError, el.goalTargetError, el.goalLimitError].forEach((n) => {
      n.hidden = true;
      n.textContent = "";
    });
  }

  let toastTimer = null;
  function showToast(message) {
    el.toast.textContent = message;
    el.toast.hidden = false;
    requestAnimationFrame(() => el.toast.classList.add("is-visible"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toast.classList.remove("is-visible");
      setTimeout(() => (el.toast.hidden = true), 250);
    }, 2200);
  }

 
  function bindThousandsInput(input) {
    input.addEventListener("input", () => {
      const value = parseDigits(input.value);
      input.value = value ? group(value) : "";
    });
  }

 
  function submitProgress(event) {
    event.preventDefault();
    clearErrors();

    const goal = state.goals.find((g) => g.id === state.currentGoalId);
    if (!goal) return;

    const amount = parseDigits(el.progressAmount.value);
    if (!el.progressAmount.value.trim() || amount <= 0) {
      showError(el.progressError, "Nominal harus diisi dan lebih dari 0.");
      el.progressAmount.focus();
      return;
    }

    const note = el.progressNote.value.trim();
    goal.saved += amount;
    goal.history.push({
      id: "h" + uid++,
      date: toISO(new Date()),
      amount,
      note,
    });

    el.formProgress.reset();
    closeModal(el.modalProgress);
    renderAll();

    const reached = goal.saved >= goal.target;
    showToast(reached ? `🎉 ${goal.name} tercapai!` : `${formatRupiah(amount)} ditambahkan ke ${goal.name}.`);
  }

 
  function openGoalModal() {
    if (state.goals.length >= MAX_GOALS) {
      showToast(`Maksimal ${MAX_GOALS} target aktif. Hapus salah satu dulu.`);
    }
    el.formGoal.reset();
    clearErrors();
    openModal(el.modalGoal);
  }

  function submitGoal(event) {
    event.preventDefault();
    clearErrors();

    const name = el.goalName.value.trim();
    const target = parseDigits(el.goalTarget.value);
    let ok = true;

    if (state.goals.length >= MAX_GOALS) {
      showError(el.goalLimitError, `Maksimal ${MAX_GOALS} target aktif. Hapus salah satu target untuk menambah yang baru.`);
      return;
    }
    if (!name) {
      showError(el.goalNameError, "Nama target wajib diisi.");
      ok = false;
    }
    if (target <= 0) {
      showError(el.goalTargetError, "Nominal target harus lebih dari 0.");
      ok = false;
    }
    if (!ok) return;

    const goal = {
      id: nextId(),
      name,
      target,
      saved: 0,
      deadline: el.goalDeadline.value || null,
      history: [],
    };
    state.goals.push(goal);

    el.formGoal.reset();
    closeModal(el.modalGoal);
    renderDashboard();
    showToast(`Target "${goal.name}" dibuat.`);
  }

 
  function clearAll() {
    state.goals = [];
    state.currentGoalId = null;
    el.viewDetail.classList.remove("is-active");
    el.viewDashboard.classList.add("is-active");
    closeAllModals();
    renderDashboard();
    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast("Semua target dihapus (mode demo).");
  }

  function restoreDemo() {
    state.goals = demoGoals();
    state.currentGoalId = null;
    renderDashboard();
    showToast("Data contoh dimuat kembali.");
  }

 
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-action]");
    if (!trigger) {
      
      if (event.target.classList.contains("modal-overlay")) closeModal(event.target);
      return;
    }

    switch (trigger.dataset.action) {
      case "open-goal":
        openGoal(trigger.dataset.id);
        break;
      case "open-progress-modal": {
        if (state.goals.length === 0) break;
        clearErrors();
        el.formProgress.reset();
        const goal = state.goals.find((g) => g.id === state.currentGoalId);
        el.progressSub.textContent = goal ? `Menyisihkan untuk "${goal.name}".` : "Menyisihkan untuk target ini.";
        openModal(el.modalProgress);
        break;
      }
      case "open-goal-modal":
        openGoalModal();
        break;
      case "close-modal":
        closeModal(trigger.closest(".modal-overlay"));
        break;
      case "go-dashboard":
        goDashboard();
        break;
      case "restore-demo":
        restoreDemo();
        break;
    }
  });

  document.getElementById("btn-reset").addEventListener("click", clearAll);

  
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest('[data-action="open-goal"]');
    if (!card) return;
    event.preventDefault();
    openGoal(card.dataset.id);
  });

  el.formProgress.addEventListener("submit", submitProgress);
  el.formGoal.addEventListener("submit", submitGoal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAllModals();
  });

  bindThousandsInput(el.progressAmount);
  bindThousandsInput(el.goalTarget);

 
  state.goals = demoGoals();
  renderDashboard();
})();
