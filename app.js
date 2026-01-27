// ===== State =====
let token = localStorage.getItem("token") || null;
let categories = [];
let transactions = [];
let budget = { id: "1", amount: "0" };
let currentDisplayMonth = new Date().getMonth(); // 0-11
let currentDisplayYear = new Date().getFullYear();

// ===== DOM Elements =====
const landingSection = document.getElementById("landing-section");
const loginSection = document.getElementById("login-section");
const mainSection = document.getElementById("main-section");
const goLoginBtn = document.getElementById("go-login-btn");
const backToLandingBtn = document.getElementById("back-to-landing");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");
const welcomeMsg = document.getElementById("welcome-msg");

const btnAddTransaction = document.getElementById("btn-add-transaction");
const btnManageCategory = document.getElementById("btn-manage-category");
const transactionList = document.getElementById("transaction-list");
const transactionListTitle = document.getElementById("transaction-list-title");

const totalIncome = document.getElementById("total-income");
const totalExpense = document.getElementById("total-expense");

const budgetSection = document.getElementById("budget-section");
const budgetRemaining = document.getElementById("budget-remaining");
const budgetProgressBar = document.getElementById("budget-progress-bar");
const totalBudget = document.getElementById("total-budget");
const budgetPercent = document.getElementById("budget-percent");

const prevMonthBtn = document.getElementById("prev-month-btn");
const nextMonthBtn = document.getElementById("next-month-btn");

// ===== Health Monitoring DOM Elements =====
const tabAccountingBtn = document.getElementById("tab-accounting");
const tabHealthBtn = document.getElementById("tab-health");
const tabAccountingContent = document.getElementById("tab-accounting-content");
const tabHealthContent = document.getElementById("tab-health-content");

const bloodSugarForm = document.getElementById("blood-sugar-form");
const bloodSugarTime = document.getElementById("blood-sugar-time");
const bloodSugarValue = document.getElementById("blood-sugar-value");
const bloodSugarLocation = document.getElementById("blood-sugar-location");
const bloodSugarNote = document.getElementById("blood-sugar-note");

const bloodPressureForm = document.getElementById("blood-pressure-form");
const bloodPressureTime = document.getElementById("blood-pressure-time");
const bloodPressureSys = document.getElementById("blood-pressure-sys");
const bloodPressureDia = document.getElementById("blood-pressure-dia");
const heartRate = document.getElementById("heart-rate");
const bloodPressureNote = document.getElementById("blood-pressure-note");

// ===== API Helper =====
async function api(endpoint, options = {}) {
  const url = `${CONFIG.API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "請求失敗");
  }

  return data;
}

// ===== Auth =====
async function login(username, password) {
  const data = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  token = data.token;
  localStorage.setItem("token", token);
  return data;
}

function logout() {
  token = null;
  localStorage.removeItem("token");
  showLanding();
}

async function validateToken() {
  if (!token) return false;
  try {
    await api("/api/categories");
    return true;
  } catch (error) {
    token = null;
    localStorage.removeItem("token");
    return false;
  }
}

// ===== Navigation =====
function showLanding() {
  landingSection.classList.remove("hidden");
  loginSection.classList.add("hidden");
  mainSection.classList.add("hidden");
}

function showLogin() {
  landingSection.classList.add("hidden");
  loginSection.classList.remove("hidden");
  mainSection.classList.add("hidden");
}

function showMain() {
  landingSection.classList.add("hidden");
  loginSection.classList.add("hidden");
  mainSection.classList.remove("hidden");
  loadData();
}

// ===== Data Loading =====
async function loadData() {
  try {
    await Promise.all([loadCategories(), loadTransactions(), loadBudget()]);
  } catch (error) {
    if (error.message.includes("token") || error.message.includes("未授權")) {
      logout();
    }
  }
}

async function loadCategories() {
  const data = await api("/api/categories");
  categories = data.data || [];
}

async function loadTransactions() {
  const data = await api("/api/transactions");
  transactions = data.data || [];
  renderTransactions();
  updateSummary();
}

async function loadBudget() {
  const data = await api("/api/budget");
  budget = data.data || { id: "1", amount: "0" };
  updateSummary();
}

// ===== Render Functions =====
function renderTransactions() {
  // 先篩選出當月的交易
  const monthlyTransactions = transactions.filter((txn) => {
    const txnDate = new Date(txn.date);
    return (
      txnDate.getMonth() === currentDisplayMonth &&
      txnDate.getFullYear() === currentDisplayYear
    );
  });

  if (monthlyTransactions.length === 0) {
    transactionList.innerHTML = `<div style="text-align:center; padding:20px; color:#9ca095;">
      🍃 這個月空空的，還沒有紀錄喔！
    </div>`;
    return;
  }

  // 按 ID 排序（新的在前），如果 ID 相同才按日期
  const sorted = [...monthlyTransactions].sort((a, b) => {
    // 嘗試將 ID 轉為數字比較（處理 txn-timestamp 格式）
    const getIdNum = (id) => {
      const match = id.match(/(\d+)$/);
      return match ? Number(match[1]) : 0;
    };
    const idDiff = getIdNum(b.id) - getIdNum(a.id);
    if (idDiff !== 0) return idDiff;

    // ID 無法比較時，按日期排序
    return new Date(b.date) - new Date(a.date);
  });

  transactionList.innerHTML = sorted
    .map(
      (txn) => `
      <div class="transaction-item">
        <div class="left">
          <div class="category-icon" style="background-color: ${
            txn.category_color_hex || "#9E9E9E"
          }">
            ${txn.category_name.charAt(0)}
          </div>
          <div class="info">
            <span class="note">${txn.note || txn.category_name}</span>
            <span class="meta">${txn.date} · ${txn.category_name}</span>
          </div>
        </div>
        <div class="right">
          <span class="amount ${txn.type}">
            ${txn.type === "income" ? "+" : "-"}${Number(
        txn.amount
      ).toLocaleString()}
          </span>
          <button class="edit-btn" onclick="window.editTransaction('${
            txn.id
          }')">✎</button>
          <button class="delete-btn" onclick="window.deleteTransaction('${
            txn.id
          }')">✕</button>
        </div>
      </div>
    `
    )
    .join("");
}

function updateSummary() {
  // 更新標題為當前顯示的月份
  transactionListTitle.textContent = `${currentDisplayMonth + 1}月收支`;

  const monthlyTransactions = transactions.filter((txn) => {
    const txnDate = new Date(txn.date);
    return (
      txnDate.getMonth() === currentDisplayMonth &&
      txnDate.getFullYear() === currentDisplayYear
    );
  });

  const income = monthlyTransactions
    .filter((txn) => txn.type === "income")
    .reduce((sum, txn) => sum + Number(txn.amount), 0);

  const expense = monthlyTransactions
    .filter((txn) => txn.type === "expense")
    .reduce((sum, txn) => sum + Number(txn.amount), 0);

  totalIncome.textContent = income.toLocaleString();
  totalExpense.textContent = expense.toLocaleString();

  // Update Budget UI
  const budgetAmount = Number(budget.amount);
  const remaining = budgetAmount - expense;
  const percent =
    budgetAmount > 0 ? Math.round((remaining / budgetAmount) * 100) : 0;

  budgetRemaining.textContent = `$${remaining.toLocaleString()}`;
  totalBudget.textContent = `$${budgetAmount.toLocaleString()}`;
  budgetPercent.textContent = `${percent}%`;

  // Progress Bar
  let progressWidth = budgetAmount > 0 ? (remaining / budgetAmount) * 100 : 0;
  progressWidth = Math.max(0, Math.min(100, progressWidth)); // Clamp between 0-100
  budgetProgressBar.style.width = `${progressWidth}%`;

  // Colors
  budgetProgressBar.className = "progress-bar-fill"; // reset
  if (percent < 20) {
    budgetProgressBar.classList.add("danger");
  } else if (percent < 50) {
    budgetProgressBar.classList.add("warning");
  }
}

// ===== SweetAlert Flows =====

// 設定預算彈窗
async function openBudgetModal() {
  const { value: amount } = await Swal.fire({
    title: "設定每月總預算",
    input: "number",
    inputLabel: "請輸入金額",
    inputValue: budget.amount,
    showCancelButton: true,
    confirmButtonText: "儲存",
    cancelButtonText: "取消",
    confirmButtonColor: "#5abf98",
    inputValidator: (value) => {
      if (!value || Number(value) < 0) {
        return "請輸入有效的金額！";
      }
    },
  });

  if (amount) {
    Swal.fire({
      title: "儲存中...",
      text: "正在更新預算",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      await api("/api/budget", {
        method: "PUT",
        body: JSON.stringify({ amount }),
      });
      await loadBudget();
      Swal.fire("成功", "預算已更新！", "success");
    } catch (error) {
      Swal.fire("失敗", error.message, "error");
    }
  }
}

// 新增交易彈窗
async function openAddTransactionModal() {
  // 準備類別選項 HTML
  const categoryOptions = categories
    .map((cat) => `<option value="${cat.id}">${cat.name}</option>`)
    .join("");

  const today = new Date().toISOString().split("T")[0];

  const { value: formValues } = await Swal.fire({
    title: "記一筆",
    html: `
      <form id="swal-txn-form" class="swal-form">
        <div class="form-group">
          <label>項目名稱</label>
          <input type="text" id="swal-note" class="swal2-input" placeholder="例如：午餐、搭公車、買卡片" required autofocus>
        </div>
        <div class="form-group">
          <label>類別</label>
          <select id="swal-category" class="swal2-select">
            ${categoryOptions}
          </select>
        </div>
        <div class="form-group">
          <label>金額</label>
          <input type="number" id="swal-amount" class="swal2-input" placeholder="多少錢？" min="1" required>
        </div>
        <div class="form-group">
          <label>收支</label>
          <select id="swal-type" class="swal2-select">
            <option value="expense">支出</option>
            <option value="income">收入</option>
          </select>
        </div>
        <div class="form-group">
          <label>日期</label>
          <input type="date" id="swal-date" class="swal2-input" value="${today}" required>
        </div>
      </form>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "記帳！",
    cancelButtonText: "算了",
    confirmButtonColor: "#5abf98",
    preConfirm: () => {
      return {
        date: document.getElementById("swal-date").value,
        type: document.getElementById("swal-type").value,
        category_id: document.getElementById("swal-category").value,
        amount: document.getElementById("swal-amount").value,
        note: document.getElementById("swal-note").value,
      };
    },
  });

  if (formValues) {
    if (!formValues.amount)
      return Swal.fire("哎呀！", "金額沒填喔！", "warning");

    // 顯示 loading
    Swal.fire({
      title: "處理中...",
      text: "正在儲存記帳資料",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      await createTransaction(formValues);
      Swal.fire("成功！", "記帳完成！", "success");
    } catch (error) {
      Swal.fire("失敗", error.message, "error");
    }
  }
}

// 管理類別彈窗
async function openManageCategoryModal() {
  const categoryListHtml = categories
    .map(
      (cat) => `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding:8px; background:#f9f9f9; border-radius:8px;">
        <div style="display:flex; align-items:center; gap:8px; cursor:pointer; flex:1;" onclick="window.editCategory('${
          cat.id
        }', '${cat.name}', '${cat.color_hex}')">
          <span style="width:12px; height:12px; border-radius:50%; background:${
            cat.color_hex
          }"></span>
          <span>${cat.name}</span>
          <span style="font-size:0.8em; color:#999;">(點擊編輯)</span>
        </div>
        ${
          cat.id !== "1"
            ? `<button onclick="window.deleteCategory('${cat.id}')" style="border:none; background:none; color:red; cursor:pointer; padding:4px 8px;">✕</button>`
            : ""
        }
      </div>
    `
    )
    .join("");

  const { value: newCat } = await Swal.fire({
    title: "管理類別",
    html: `
      <div style="text-align:left; margin-bottom:16px;">
        <label style="font-weight:bold;">新增類別</label>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <input id="swal-cat-name" class="swal2-input" placeholder="名稱" style="margin:0 !important;">
          <input id="swal-cat-color" type="color" value="#5abf98" style="height:46px; width:60px; padding:0; border:none; background:none;">
        </div>
      </div>
      <hr style="border:0; border-top:1px dashed #ccc; margin:16px 0;">
      <div style="text-align:left; max-height:200px; overflow-y:auto;">
        <label style="font-weight:bold; margin-bottom:8px; display:block;">現有類別 (點擊可編輯)</label>
        ${categoryListHtml}
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "新增類別",
    cancelButtonText: "關閉",
    confirmButtonColor: "#5abf98",
    preConfirm: () => {
      const name = document.getElementById("swal-cat-name").value;
      const color = document.getElementById("swal-cat-color").value;
      if (!name) return null;
      return { name, color_hex: color };
    },
  });

  if (newCat) {
    Swal.fire({
      title: "新增中...",
      text: "正在建立類別",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      await api("/api/categories", {
        method: "POST",
        body: JSON.stringify(newCat),
      });
      await loadCategories();
      Swal.fire("成功", "類別已新增！", "success").then(() =>
        openManageCategoryModal()
      );
    } catch (error) {
      Swal.fire("失敗", error.message, "error");
    }
  }
}

// 編輯類別
window.editCategory = async function (id, currentName, currentColor) {
  const { value: updatedCat } = await Swal.fire({
    title: "編輯類別",
    html: `
      <div style="text-align:left;">
        <div style="margin-bottom:16px;">
          <label>類別名稱</label>
          <input id="edit-cat-name" class="swal2-input" value="${currentName}" placeholder="名稱">
        </div>
        <div>
          <label>代表色</label>
          <input id="edit-cat-color" type="color" value="${currentColor}" style="width:100%; height:50px; padding:0; border:none;">
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "儲存",
    cancelButtonText: "取消",
    confirmButtonColor: "#5abf98",
    preConfirm: () => {
      return {
        name: document.getElementById("edit-cat-name").value,
        color_hex: document.getElementById("edit-cat-color").value,
      };
    },
  });

  if (updatedCat) {
    Swal.fire({
      title: "更新中...",
      text: "正在儲存變更",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      await api(`/api/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify(updatedCat),
      });
      await loadCategories();
      // 編輯完後重新打開管理列表，方便繼續操作
      Swal.fire("成功", "類別已更新！", "success").then(() =>
        openManageCategoryModal()
      );
    } catch (error) {
      Swal.fire("失敗", error.message, "error");
    }
  }
};

// ===== CRUD Operations =====
async function createTransaction(payload) {
  await api("/api/transactions", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      id: `txn-${Date.now()}`,
      amount: Number(payload.amount),
    }),
  });
  await loadTransactions();
}

// 編輯交易
window.editTransaction = async function (id) {
  const txn = transactions.find((t) => t.id === id);
  if (!txn) return;

  const categoryOptions = categories
    .map(
      (cat) =>
        `<option value="${cat.id}" ${
          cat.id === txn.category_id ? "selected" : ""
        }>${cat.name}</option>`
    )
    .join("");

  const { value: formValues } = await Swal.fire({
    title: "編輯記帳",
    html: `
      <form id="swal-txn-form" class="swal-form">
        <div class="form-group">
          <label>項目名稱</label>
          <input type="text" id="swal-note" class="swal2-input" placeholder="例如：午餐、搭公車、買卡片" value="${
            txn.note || ""
          }" required autofocus>
        </div>
        <div class="form-group">
          <label>類別</label>
          <select id="swal-category" class="swal2-select">
            ${categoryOptions}
          </select>
        </div>
        <div class="form-group">
          <label>金額</label>
          <input type="number" id="swal-amount" class="swal2-input" placeholder="多少錢？" min="1" value="${
            txn.amount
          }" required>
        </div>
        <div class="form-group">
          <label>收支</label>
          <select id="swal-type" class="swal2-select">
            <option value="expense" ${
              txn.type === "expense" ? "selected" : ""
            }>支出</option>
            <option value="income" ${
              txn.type === "income" ? "selected" : ""
            }>收入</option>
          </select>
        </div>
        <div class="form-group">
          <label>日期</label>
          <input type="date" id="swal-date" class="swal2-input" value="${
            txn.date
          }" required>
        </div>
      </form>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "儲存",
    cancelButtonText: "取消",
    confirmButtonColor: "#5abf98",
    preConfirm: () => {
      return {
        date: document.getElementById("swal-date").value,
        type: document.getElementById("swal-type").value,
        category_id: document.getElementById("swal-category").value,
        amount: document.getElementById("swal-amount").value,
        note: document.getElementById("swal-note").value,
      };
    },
  });

  if (formValues) {
    if (!formValues.amount)
      return Swal.fire("哎呀！", "金額沒填喔！", "warning");

    // 顯示 loading
    Swal.fire({
      title: "更新中...",
      text: "正在儲存變更",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      await api(`/api/transactions/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...formValues,
          amount: Number(formValues.amount),
        }),
      });
      await loadTransactions();
      Swal.fire("成功！", "記帳已更新！", "success");
    } catch (error) {
      Swal.fire("失敗", error.message, "error");
    }
  }
};

// 把刪除函式掛載到 window 以便在 innerHTML onclick 中呼叫
window.deleteTransaction = async function (id) {
  const result = await Swal.fire({
    title: "確定要刪除嗎？",
    text: "這筆紀錄會消失在時空縫隙中喔！",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ff7675",
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
  });

  if (result.isConfirmed) {
    try {
      await api(`/api/transactions/${id}`, { method: "DELETE" });
      await loadTransactions();
      Swal.fire("已刪除！", "紀錄已移除。", "success");
    } catch (error) {
      Swal.fire("失敗", error.message, "error");
    }
  }
};

window.deleteCategory = async function (id) {
  const result = await Swal.fire({
    title: "刪除類別？",
    text: "該類別無法復原喔！",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ff7675",
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
  });

  if (result.isConfirmed) {
    try {
      await api(`/api/categories/${id}`, { method: "DELETE" });
      await loadCategories();
      Swal.fire("已刪除！", "類別已移除。", "success");
    } catch (error) {
      Swal.fire("失敗", error.message, "error");
    }
  }
};

// ===== Event Listeners =====
goLoginBtn.addEventListener("click", showLogin);
backToLandingBtn.addEventListener("click", showLanding);

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    await login(username, password);
    showMain();
  } catch (error) {
    loginError.textContent = error.message;
  }
});

logoutBtn.addEventListener("click", logout);
btnAddTransaction.addEventListener("click", openAddTransactionModal);
btnManageCategory.addEventListener("click", openManageCategoryModal);
budgetSection.addEventListener("click", openBudgetModal);

// 月份導航
function goToPreviousMonth() {
  currentDisplayMonth--;
  if (currentDisplayMonth < 0) {
    currentDisplayMonth = 11;
    currentDisplayYear--;
  }
  renderTransactions();
  updateSummary();
}

function goToNextMonth() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthLimit = new Date(today);
  nextMonthLimit.setMonth(nextMonthLimit.getMonth() + 1);
  
  const nextMonth = new Date(currentDisplayYear, currentDisplayMonth + 1, 1);
  
  // 防止選擇未來的月份（超過當月）
  if (nextMonth >= nextMonthLimit) {
    return;
  }
  
  currentDisplayMonth++;
  if (currentDisplayMonth > 11) {
    currentDisplayMonth = 0;
    currentDisplayYear++;
  }
  renderTransactions();
  updateSummary();
}

prevMonthBtn.addEventListener("click", goToPreviousMonth);
nextMonthBtn.addEventListener("click", goToNextMonth);

// ===== Tab Navigation =====
function switchTab(tabName) {
  // 隱藏所有分頁內容
  const allTabContents = document.querySelectorAll(".tab-content");
  allTabContents.forEach(content => content.classList.remove("active"));

  // 移除所有分頁按鈕的active
  const allTabBtns = document.querySelectorAll(".tab-btn");
  allTabBtns.forEach(btn => btn.classList.remove("active"));

  // 顯示選定的分頁
  if (tabName === "accounting") {
    tabAccountingContent.classList.add("active");
    tabAccountingBtn.classList.add("active");
  } else if (tabName === "health") {
    tabHealthContent.classList.add("active");
    tabHealthBtn.classList.add("active");
    initializeHealthForm(); // 初始化時間
  }
}

tabAccountingBtn.addEventListener("click", () => switchTab("accounting"));
tabHealthBtn.addEventListener("click", () => switchTab("health"));

// ===== Health Monitoring Functions =====
function getFormattedDateTime() {
  const now = new Date();
  // 轉換為本地時間格式 (datetime-local 格式：YYYY-MM-DDTHH:mm)
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const date = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  
  return `${year}-${month}-${date}T${hours}:${minutes}`;
}

function initializeHealthForm() {
  // 設定目前時間到表單
  const currentDateTime = getFormattedDateTime();
  bloodSugarTime.value = currentDateTime;
  bloodPressureTime.value = currentDateTime;
}

// 血糖提交
bloodSugarForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const data = {
    type: "blood_sugar",
    date_time: bloodSugarTime.value,
    value: Number(bloodSugarValue.value),
    location: bloodSugarLocation.value,
    note: bloodSugarNote.value || "",
  };

  try {
    await submitHealthData(data);
    Swal.fire({
      title: "成功！",
      text: "血糖數據已保存",
      icon: "success",
      timer: 1500,
      showConfirmButton: false,
    });
    bloodSugarForm.reset();
    initializeHealthForm(); // 重設時間
  } catch (error) {
    Swal.fire("失敗", error.message, "error");
  }
});

// 血壓提交
bloodPressureForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const data = {
    type: "blood_pressure",
    date_time: bloodPressureTime.value,
    systolic: Number(bloodPressureSys.value),
    diastolic: Number(bloodPressureDia.value),
    heart_rate: heartRate.value ? Number(heartRate.value) : null,
    note: bloodPressureNote.value || "",
  };

  try {
    await submitHealthData(data);
    Swal.fire({
      title: "成功！",
      text: "血壓/心率數據已保存",
      icon: "success",
      timer: 1500,
      showConfirmButton: false,
    });
    bloodPressureForm.reset();
    initializeHealthForm(); // 重設時間
  } catch (error) {
    Swal.fire("失敗", error.message, "error");
  }
});

// 提交健康監測數據到後端
async function submitHealthData(data) {
  const result = await api("/api/health", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return result;
}

// ===== Initialize =====
async function init() {
  if (token) {
    const isValid = await validateToken();
    if (isValid) {
      showMain();
    } else {
      showLanding();
    }
  } else {
    showLanding();
  }
}

init();
