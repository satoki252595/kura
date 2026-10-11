const K = window.Kura;
const $ = (id) => document.getElementById(id);

const OPACITY = [1, 0.7, 0.45, 0.3, 0.2];
const fromUrl = K.planFromSearch(location.search);
let plan = fromUrl || K.loadPlan() || structuredClone(K.DEFAULT_PLAN);
let showAll = false;
let ready = false;
let sentence = "";

function money(raw) {
  const digits = String(raw).replace(/[^\d]/g, "");
  if (!digits) return 0;
  return Math.min(Number(digits), 1e15);
}

function paintMoney(input, value) {
  if (document.activeElement === input) return;
  input.value = value.toLocaleString("ja-JP");
}

function chart(points) {
  const w = 640;
  const h = 260;
  const left = 58;
  const right = 8;
  const top = 16;
  const bottom = 28;
  const max = Math.max(...points.map((p) => p.base), 1);
  const x = (i) => left + (points.length === 1 ? 0 : (i / (points.length - 1)) * (w - left - right));
  const y = (v) => top + (1 - v / max) * (h - top - bottom);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.base).toFixed(1)}`).join("");
  const area = `${line}L${x(points.length - 1).toFixed(1)},${y(0).toFixed(1)}L${x(0).toFixed(1)},${y(0).toFixed(1)}Z`;
  const ticks = 4;
  let grid = "";
  for (let i = 0; i <= ticks; i++) {
    const value = (max / ticks) * i;
    const yy = y(value);
    grid += `<line x1="${left}" y1="${yy.toFixed(1)}" x2="${w - right}" y2="${yy.toFixed(1)}" stroke="#2c2d28" />`;
    grid += `<text x="${left - 8}" y="${(yy + 4).toFixed(1)}" fill="#6f6b63" font-size="12" text-anchor="end">${K.formatAxis(value)}</text>`;
  }
  const labelEvery = points.length > 16 ? 10 : 5;
  let labels = "";
  points.forEach((p, i) => {
    if (i !== 0 && i !== points.length - 1 && p.year % labelEvery !== 0) return;
    labels += `<text x="${x(i).toFixed(1)}" y="${h - 6}" fill="#6f6b63" font-size="12" text-anchor="middle">${p.year === 0 ? "いま" : p.year}</text>`;
  });
  const end = points[points.length - 1];
  return `${grid}<path d="${area}" fill="#f3f0e8" fill-opacity="0.08"></path><path d="${line}" fill="none" stroke="#f3f0e8" stroke-width="2.25"></path><circle cx="${x(points.length - 1).toFixed(1)}" cy="${y(end.base).toFixed(1)}" r="3.5" fill="#f3f0e8"></circle>${labels}`;
}

function renderSleeves() {
  const list = $("sleeves");
  if (list.childElementCount) return;
  K.SLEEVES.forEach((sleeve, index) => {
    const li = document.createElement("li");
    li.className = "sleeve";
    li.innerHTML = `
      <div class="sleeve-top">
        <div>
          <p>${sleeve.name}</p>
          <p class="sub">${sleeve.note}</p>
        </div>
        <label><span class="sr"></span>
          <input class="pct" inputmode="decimal" aria-label="${sleeve.name}の利回り" data-return="${sleeve.id}" />%
        </label>
      </div>
      <div class="sleeve-slider">
        <input type="range" min="0" max="100" step="1" aria-label="${sleeve.name}の割合" data-weight="${sleeve.id}" />
        <p class="weight" data-weight-label="${sleeve.id}"></p>
      </div>`;
    li.style.setProperty("--i", String(index));
    list.appendChild(li);
  });
  list.querySelectorAll("[data-return]").forEach((input) => {
    input.addEventListener("change", () => {
      const id = input.getAttribute("data-return");
      const parsed = Number(input.value.replace("−", "-"));
      const safe = Number.isFinite(parsed) ? Math.min(20, Math.max(-10, parsed)) : 0;
      plan = { ...plan, returns: { ...plan.returns, [id]: safe / 100 } };
      render();
    });
  });
  list.querySelectorAll("[data-weight]").forEach((input) => {
    input.addEventListener("input", () => {
      const id = input.getAttribute("data-weight");
      plan = { ...plan, weights: K.rebalance(plan.weights, id, Number(input.value)) };
      render();
    });
  });
}

function renderPresets() {
  const host = $("presets");
  if (host.childElementCount) return;
  K.PRESETS.forEach((preset) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.preset = preset.id;
    button.innerHTML = `${preset.name}<small>${preset.detail}</small>`;
    button.addEventListener("click", () => {
      plan = K.planFromPreset(preset);
      render();
    });
    host.appendChild(button);
  });
}

function render() {
  const view = K.project(plan);
  const final = view.base.final;
  const last = view.points[view.points.length - 1];
  $("years-label").textContent = String(plan.years);
  $("hero").textContent = K.formatReading(final.balance);
  $("yen").textContent = K.formatYen(final.balance);
  $("delta").textContent = `いまより ${K.formatSignedReading(final.balance - plan.initial)} · 利回り ${K.formatPercent(view.annual)} · ランニングコスト ${K.formatPercent(view.runningCost, view.runningCost === 0 ? 0 : 1)}`;
  const warn = $("warn");
  if (view.base.depletedYear !== null) {
    warn.hidden = false;
    warn.textContent = `${view.base.depletedYear}年目に、この出金は資産を上回ります。`;
  } else warn.hidden = true;
  $("chart").innerHTML = chart(view.points);
  $("range").textContent = `揺れの範囲 ${K.formatReading(last.low)} – ${K.formatReading(last.high)}`;
  $("stat-in").textContent = K.formatReading(final.deposited);
  $("stat-out").textContent = K.formatReading(final.withdrawn);
  const gain = $("stat-gain");
  gain.textContent = K.formatSignedReading(final.gain);
  gain.className = final.gain < 0 ? "neg" : "";
  const short = $("shortfall");
  if (final.shortfall > 1) {
    short.hidden = false;
    short.textContent = `出せなかった額の累計 ${K.formatReading(final.shortfall)}`;
  } else short.hidden = true;
  const gap = final.balance - view.cash.final.balance;
  const gapEl = $("gap");
  if (Math.abs(gap) >= 10000) {
    gapEl.hidden = false;
    gapEl.textContent = `同じ入出金で預金だけだと${K.formatReading(view.cash.final.balance)}。置き方による差は${K.formatSignedReading(gap)}。`;
  } else gapEl.hidden = true;

  const rows = showAll
    ? view.base.points
    : view.base.points.filter((p) => p.year === 0 || p.year === plan.years || p.year % 5 === 0);
  $("rows").innerHTML = rows
    .map(
      (p) => `<tr><th>${p.year === 0 ? "いま" : p.year}</th><td>${K.formatReading(p.balance)}</td><td class="${p.gain < 0 ? "neg" : ""}">${K.formatSignedReading(p.gain)}</td></tr>`,
    )
    .join("");
  $("toggle-years").textContent = showAll ? "5年ごとに戻す" : "すべての年を見る";

  const active = K.matchingPreset(plan);
  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset.preset === active ? "true" : "false");
  });

  paintMoney($("initial"), plan.initial);
  paintMoney($("deposit"), plan.monthlyDeposit);
  paintMoney($("withdraw"), plan.monthlyWithdrawal);
  const net = $("net");
  if (plan.monthlyDeposit > 0 && plan.monthlyWithdrawal > 0) {
    net.hidden = false;
    net.textContent = `差し引き 毎月 ${K.formatSignedReading(plan.monthlyDeposit - plan.monthlyWithdrawal)}`;
  } else net.hidden = true;

  $("years-value").textContent = String(plan.years);
  if (document.activeElement !== $("years")) $("years").value = String(plan.years);
  $("yield").textContent = K.formatPercent(view.annual);
  const manual = plan.manualReturn !== null;
  $("manual-toggle").textContent = manual ? "置き場所から計算" : "数字を直接入れる";
  $("manual").hidden = !manual;
  $("yield-note").textContent = manual
    ? `置き場所から計算すると ${K.formatPercent(view.blended)}。いまの試算はこの数字を使います。`
    : "下の置き場所と、それぞれの利回りから計算しています。利回りは目安で、書き換えられます。";
  if (manual && document.activeElement !== $("manual")) {
    $("manual").value = String(Math.min(15, Math.max(-5, plan.manualReturn * 100)));
  }

  $("vol").textContent = `揺れの目安 ${K.formatPercent(view.vol)}`;
  $("bar").innerHTML = K.SLEEVES.map(
    (sleeve, index) =>
      `<i style="width:${plan.weights[sleeve.id]}%;opacity:${OPACITY[index]}"></i>`,
  ).join("");
  document.querySelectorAll("[data-weight]").forEach((input) => {
    const id = input.getAttribute("data-weight");
    if (document.activeElement !== input) input.value = String(plan.weights[id]);
  });
  document.querySelectorAll("[data-weight-label]").forEach((node) => {
    const id = node.getAttribute("data-weight-label");
    node.textContent = `${plan.weights[id]}%`;
  });
  document.querySelectorAll("[data-return]").forEach((input) => {
    if (document.activeElement === input) return;
    input.value = (plan.returns[input.getAttribute("data-return")] * 100).toFixed(1);
  });

  if (ready) {
    K.savePlan(plan);
    const next = `${location.pathname}?${K.planToSearch(plan)}`;
    history.replaceState(null, "", next);
  }
  sentence = K.shareSentence(plan, view);
  document.title = `${K.formatReading(final.balance)} — KURA`;
  $("dock-num").textContent = K.formatReading(final.balance);
  $("dock-years").textContent = `${plan.years}年`;
  const card = $("share-card");
  if (card) K.paintShareCard(card.getContext("2d"), plan, view);
}

function bind() {
  renderPresets();
  renderSleeves();
  const bindMoney = (id, key) => {
    $(id).addEventListener("input", () => {
      plan = { ...plan, [key]: money($(id).value) };
      render();
    });
  };
  bindMoney("initial", "initial");
  bindMoney("deposit", "monthlyDeposit");
  bindMoney("withdraw", "monthlyWithdrawal");
  $("years").addEventListener("input", () => {
    plan = { ...plan, years: Number($("years").value) };
    render();
  });
  $("manual").addEventListener("input", () => {
    plan = { ...plan, manualReturn: Number($("manual").value) / 100 };
    render();
  });
  $("manual-toggle").addEventListener("click", () => {
    const view = K.project(plan);
    plan = { ...plan, manualReturn: plan.manualReturn === null ? view.blended : null };
    render();
  });
  $("toggle-years").addEventListener("click", () => {
    showAll = !showAll;
    render();
  });
  $("reset").addEventListener("click", () => {
    plan = structuredClone(K.DEFAULT_PLAN);
    render();
  });
  const post = async () => {
    const note = $("share-note");
    try {
      const result = await K.sharePaintedCard($("share-card"), plan, K.project(plan), location.href);
      if (result === "copied") {
        note.hidden = false;
        note.textContent = "画像をコピーしました。投稿画面に貼ってください。";
      } else if (result === "downloaded") {
        note.hidden = false;
        note.textContent = "画像を保存しました。投稿に添付してください。";
      } else note.hidden = true;
    } catch {
      note.hidden = false;
      note.textContent = "共有を中断しました。";
    }
  };
  $("share-x").addEventListener("click", post);
  $("dock-share").addEventListener("click", post);
  $("copy").addEventListener("click", async () => {
    const text = `${sentence}\n${location.href}`;
    try {
      await navigator.clipboard.writeText(text);
      $("copy").textContent = "コピーしました";
      setTimeout(() => {
        $("copy").textContent = "文とリンクをコピー";
      }, 1600);
    } catch {
      window.prompt("この文をコピーしてください", text);
    }
  });
  ready = true;
  render();
}

bind();
