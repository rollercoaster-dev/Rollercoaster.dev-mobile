/* wireframe.js — navigation, modals, theme switching, basic interactivity */

(function () {
  "use strict";

  // --- State ---
  const screenStack = ["welcome"];
  let activeTab = "goals";
  let populated = false;
  let currentColorMode = "light";

  // Theme class mapping (from design-tokens package)
  const themeClasses = {
    dark: "ob-dark-theme",
    highContrast: "ob-high-contrast-theme",
    largeText: "ob-large-text-theme",
    dyslexia: "ob-dyslexia-friendly-theme",
    lowVision: "ob-low-vision-theme",
    autismFriendly: "ob-autism-friendly-theme",
    lowInfo: "ob-low-info-theme",
  };

  // Demo data
  const goals = [
    {
      id: 1,
      title: "Learn to cook pasta from scratch",
      desc: "Master 3 pasta dishes without a recipe.",
      steps: [
        { title: "Buy ingredients", done: true },
        { title: "Watch technique video", done: true },
        { title: "Make basic dough", done: false },
        { title: "Try aglio e olio", done: false },
        { title: "Cook for a friend", done: false },
      ],
    },
    {
      id: 2,
      title: "Build a raised garden bed",
      desc: "Construct and plant a 4x8 raised bed.",
      steps: [
        { title: "Research wood types", done: true },
        { title: "Buy lumber and screws", done: false },
        { title: "Assemble frame", done: false },
      ],
    },
    {
      id: 3,
      title: "Read 3 books this month",
      desc: "",
      steps: [
        { title: "Finish current book", done: true },
        { title: "Pick second book", done: true },
        { title: "Read second book", done: false },
        { title: "Pick and read third book", done: false },
      ],
    },
  ];

  const badges = [
    { title: "Fixed my bike", date: "Jan 28, 2026" },
    { title: "Finished online course", date: "Jan 15, 2026" },
    { title: "Organized my desk", date: "Jan 5, 2026" },
    { title: "Ran a 5K", date: "Dec 20, 2025" },
  ];

  // --- DOM helpers ---
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];
  const frame = () => $(".mobile-frame");

  // --- Screen navigation ---
  function showScreen(id) {
    $$(".screen").forEach((s) => s.classList.remove("active"));
    const screen = $(`#screen-${id}`);
    if (screen) screen.classList.add("active");
    updateHeader(id);
  }

  function navigateTo(id) {
    screenStack.push(id);
    showScreen(id);
  }

  function navigateBack() {
    if (screenStack.length > 1) {
      screenStack.pop();
      showScreen(screenStack[screenStack.length - 1]);
    }
  }

  const headerTitles = {
    welcome: "Welcome",
    "goals-empty": "Goals",
    "goals-populated": "Goals",
    "badges-empty": "Badges",
    "badges-populated": "Badges",
    "goal-detail": "Goal",
    "badge-detail": "Badge",
    settings: "Settings",
  };

  const topLevelScreens = [
    "welcome",
    "goals-empty",
    "goals-populated",
    "badges-empty",
    "badges-populated",
  ];

  function updateHeader(id) {
    const title = headerTitles[id] || "Goals";
    $(".header-title").textContent = title;
    const back = $(".header-back");
    if (topLevelScreens.includes(id)) {
      back.classList.remove("visible");
    } else {
      back.classList.add("visible");
    }
    const gear = $(".header-settings");
    gear.style.visibility = id === "welcome" ? "hidden" : "visible";
  }

  // --- Tab switching ---
  function switchTab(tab) {
    activeTab = tab;
    $$(".tab-bar button").forEach((b) =>
      b.classList.toggle("active", b.dataset.tab === tab),
    );
    if (tab === "goals") {
      const id = populated ? "goals-populated" : "goals-empty";
      screenStack.length = 0;
      screenStack.push(id);
      showScreen(id);
    } else {
      const id = populated ? "badges-populated" : "badges-empty";
      screenStack.length = 0;
      screenStack.push(id);
      showScreen(id);
    }
  }

  // --- Modal management ---
  function openModal(id) {
    const modal = $(`#modal-${id}`);
    if (modal) modal.classList.add("active");
  }

  function closeModal(id) {
    const modal = $(`#modal-${id}`);
    if (modal) modal.classList.remove("active");
  }

  function closeAllModals() {
    $$(".modal-overlay").forEach((m) => m.classList.remove("active"));
  }

  // --- Theme switching ---
  function setColorMode(mode) {
    currentColorMode = mode;
    if (mode === "dark") {
      frame().classList.add(themeClasses.dark);
    } else {
      frame().classList.remove(themeClasses.dark);
    }
    $$(".color-mode-toggle button").forEach((b) => {
      b.classList.toggle("active", b.dataset.mode === mode);
    });
  }

  function setVariant(variant) {
    // Remove all variant classes (but not dark — handled separately)
    Object.entries(themeClasses).forEach(([key, cls]) => {
      if (key !== "dark") frame().classList.remove(cls);
    });
    // Re-add dark if needed
    if (currentColorMode === "dark") {
      frame().classList.add(themeClasses.dark);
    }
    // Add the selected variant class
    if (variant !== "default" && themeClasses[variant]) {
      frame().classList.add(themeClasses[variant]);
    }
    $$(".theme-swatch").forEach((s) => {
      s.classList.toggle("active", s.dataset.variant === variant);
    });
  }

  function setDensity(density) {
    frame().dataset.density = density;
    $$(".density-toggle button").forEach((b) => {
      b.classList.toggle("active", b.dataset.density === density);
    });
  }

  // --- Goal detail rendering ---
  let currentGoal = null;

  function renderGoalDetail(goal) {
    currentGoal = goal;
    $("#goal-detail-title").textContent = goal.title;
    $("#goal-detail-desc").textContent = goal.desc || "";
    $("#goal-detail-desc").style.display = goal.desc ? "block" : "none";
    renderSteps(goal);
    navigateTo("goal-detail");
  }

  function renderSteps(goal) {
    const list = $("#step-list");
    list.innerHTML = "";
    goal.steps.forEach((step, i) => {
      const li = document.createElement("li");
      li.className = "step-item";
      li.innerHTML = `
        <div class="step-checkbox ${step.done ? "checked" : ""}" data-index="${i}">${step.done ? "\u2713" : ""}</div>
        <span class="step-title">${step.title}</span>
      `;
      list.appendChild(li);
    });
    updateProgress(goal);
  }

  function updateProgress(goal) {
    const done = goal.steps.filter((s) => s.done).length;
    const total = goal.steps.length;
    $("#progress-text").textContent =
      total > 0 ? `${done}/${total} steps` : "No steps yet";
  }

  function toggleStep(index) {
    if (!currentGoal) return;
    currentGoal.steps[index].done = !currentGoal.steps[index].done;
    renderSteps(currentGoal);
  }

  // --- Add step inline ---
  function showAddStep() {
    const input = $("#add-step-input");
    input.classList.add("visible");
    input.value = "";
    input.focus();
  }

  function addStep(title) {
    if (!currentGoal || !title.trim()) return;
    currentGoal.steps.push({ title: title.trim(), done: false });
    renderSteps(currentGoal);
    const input = $("#add-step-input");
    input.value = "";
    input.focus();
  }

  // --- Populate goals list ---
  function renderGoalsList() {
    const list = $("#goals-list");
    list.innerHTML = "";
    goals.forEach((goal) => {
      const done = goal.steps.filter((s) => s.done).length;
      const total = goal.steps.length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      const div = document.createElement("div");
      const title = document.createElement("div");
      const subtitle = document.createElement("div");
      const progress = document.createElement("div");
      const progressFill = document.createElement("div");
      div.className = "card";
      title.className = "card-title";
      title.textContent = goal.title;
      subtitle.className = "card-subtitle";
      subtitle.textContent = `${done}/${total} steps`;
      progress.className = "card-progress";
      progressFill.className = "card-progress-fill";
      progressFill.style.width = `${pct}%`;
      progress.appendChild(progressFill);
      div.appendChild(title);
      div.appendChild(subtitle);
      div.appendChild(progress);
      div.addEventListener("click", () => renderGoalDetail(goal));
      list.appendChild(div);
    });
  }

  function renderBadgesList() {
    const grid = $("#badges-grid");
    grid.innerHTML = "";
    badges.forEach((badge) => {
      const div = document.createElement("div");
      div.className = "badge-card";
      div.innerHTML = `
        <div class="badge-placeholder">\u2605</div>
        <div class="badge-card-title">${badge.title}</div>
        <div class="badge-card-date">${badge.date}</div>
      `;
      div.addEventListener("click", () => {
        $("#badge-detail-name").textContent = badge.title;
        $("#badge-detail-earned").textContent = badge.date;
        navigateTo("badge-detail");
      });
      grid.appendChild(div);
    });
  }

  // --- Demo data toggle ---
  function toggleDemoData() {
    populated = !populated;
    $("#demo-toggle").textContent = populated ? "Show Empty" : "Show Populated";
    if (populated) {
      renderGoalsList();
      renderBadgesList();
    }
    switchTab(activeTab);
  }

  // --- Init ---
  function init() {
    // Back button
    $(".header-back").addEventListener("click", navigateBack);

    // Settings gear
    $(".header-settings").addEventListener("click", () =>
      navigateTo("settings"),
    );

    // Tab buttons
    $$(".tab-bar button").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    // Welcome -> Home
    $("#btn-get-started").addEventListener("click", () => {
      switchTab("goals");
    });

    // Color mode toggle
    $$(".color-mode-toggle button").forEach((btn) => {
      btn.addEventListener("click", () => setColorMode(btn.dataset.mode));
    });

    // Theme swatch selection
    $$(".theme-swatch").forEach((swatch) => {
      swatch.addEventListener("click", () =>
        setVariant(swatch.dataset.variant),
      );
    });

    // Density toggle
    $$(".density-toggle button").forEach((btn) => {
      btn.addEventListener("click", () => setDensity(btn.dataset.density));
    });

    // New Goal button (empty state)
    $("#btn-new-goal-empty").addEventListener("click", () =>
      openModal("new-goal"),
    );
    // New Goal button (populated state)
    $("#btn-new-goal").addEventListener("click", () => openModal("new-goal"));

    // New Goal modal — Create
    $("#btn-create-goal").addEventListener("click", () => {
      const title = $("#new-goal-title").value.trim();
      if (!title) return;
      const newGoal = {
        id: goals.length + 1,
        title,
        desc: $("#new-goal-desc").value.trim(),
        steps: [],
      };
      goals.push(newGoal);
      populated = true;
      $("#demo-toggle").textContent = "Show Empty";
      renderGoalsList();
      renderBadgesList();
      closeModal("new-goal");
      $("#new-goal-title").value = "";
      $("#new-goal-desc").value = "";
      switchTab("goals");
      renderGoalDetail(newGoal);
    });

    // Toggle description on new goal modal
    $("#toggle-desc").addEventListener("click", () => {
      const field = $("#desc-field");
      field.style.display = field.style.display === "none" ? "block" : "none";
    });

    // Add Step button on goal detail
    $("#btn-add-step").addEventListener("click", showAddStep);

    // Add step input — Enter to add
    $("#add-step-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        addStep(e.target.value);
      }
    });
    // Click away to hide
    $("#add-step-input").addEventListener("blur", () => {
      setTimeout(() => $("#add-step-input").classList.remove("visible"), 200);
    });

    // Step checkbox toggle (delegated)
    $("#step-list").addEventListener("click", (e) => {
      const checkbox = e.target.closest(".step-checkbox");
      if (checkbox) toggleStep(parseInt(checkbox.dataset.index));
    });

    // Add Evidence button on goal detail
    $("#btn-add-evidence").addEventListener("click", () =>
      openModal("evidence-picker"),
    );

    // Evidence picker options
    $$("#modal-evidence-picker .option-item").forEach((item) => {
      item.addEventListener("click", () => {
        closeModal("evidence-picker");
        const type = item.dataset.type;
        $$(".evidence-capture-type").forEach(
          (el) => (el.style.display = "none"),
        );
        const typeEl = $(`#evidence-capture-${type}`);
        if (typeEl) typeEl.style.display = "block";
        openModal("evidence-capture");
      });
    });

    // Evidence capture — Attach button
    $("#btn-attach-evidence").addEventListener("click", () => {
      closeModal("evidence-capture");
    });

    // Evidence viewer open (delegated from evidence thumbnails)
    document.addEventListener("click", (e) => {
      if (e.target.closest(".evidence-thumb")) {
        openModal("evidence-viewer");
      }
    });

    // Complete Goal button
    $("#btn-complete-goal").addEventListener("click", () =>
      openModal("goal-completion"),
    );

    // Goal completion — confirm
    $("#btn-confirm-complete").addEventListener("click", () => {
      closeModal("goal-completion");
      openModal("badge-earned");
    });

    // Goal completion — not yet
    $("#btn-not-yet").addEventListener("click", () =>
      closeModal("goal-completion"),
    );

    // Badge earned — View Badge
    $("#btn-view-badge").addEventListener("click", () => {
      closeModal("badge-earned");
      if (currentGoal) {
        $("#badge-detail-name").textContent = currentGoal.title;
        $("#badge-detail-earned").textContent = new Date().toLocaleDateString(
          "en-US",
          { month: "short", day: "numeric", year: "numeric" },
        );
      }
      navigateTo("badge-detail");
    });

    // Badge earned — Done
    $("#btn-badge-done").addEventListener("click", () => {
      closeModal("badge-earned");
    });

    // Collapsed completed section toggle
    $("#collapsed-toggle").addEventListener("click", () => {
      const content = $("#collapsed-content");
      content.classList.toggle("open");
      const btn = $("#collapsed-toggle");
      btn.textContent = content.classList.contains("open")
        ? "\u25BE 4 completed"
        : "\u25B8 4 completed";
    });

    // Close modals on backdrop click
    $$(".modal-overlay").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeAllModals();
      });
    });

    // Close buttons inside modals
    $$(".modal-close").forEach((btn) => {
      btn.addEventListener("click", () => closeAllModals());
    });

    // Demo data toggle button
    $("#demo-toggle").addEventListener("click", toggleDemoData);

    // Show welcome on load
    showScreen("welcome");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
