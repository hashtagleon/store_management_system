// ===== FIREBASE CONFIG =====
// <i class='ph ph-download-simple'></i> Firebase console থেকে আপনার config এখানে paste করুন
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  remove,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBjreDZZvFtJbl4JkfWASTQjFb2JAJ77MI",
  authDomain: "bksp-store.firebaseapp.com",
  databaseURL:
    "https://bksp-store-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bksp-store",
  storageBucket: "bksp-store.firebasestorage.app",
  messagingSenderId: "280314720011",
  appId: "1:280314720011:web:de4389867d5e692ce17c0e",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const DB_ROOT = "bksp_store"; // Firebase-এর root key

// ===== DATA STORE =====
let products = [];
let transactions = [];
let activityLog = [];

// Hide the loading overlay
function hideLoader() {
  const loader = document.getElementById("firebaseLoader");
  if (loader) loader.style.display = "none";
}

// ===== ROLE SYSTEM =====
let currentRole = null; // 'admin' | 'viewer'

// Password verified by char-code array (no plain text stored)
function _verifyPwd(s) {
  const _c = [50, 53, 48, 55]; // char codes: '2','5','0','7'
  if (s.length !== _c.length) return false;
  return [...s].every((ch, i) => ch.charCodeAt(0) === _c[i]);
}

function enterAsViewer() {
  currentRole = "viewer";
  sessionStorage.setItem("_sx", "viewer");
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("appContent").style.display = "block";
  applyRoleUI();
  init();
}

function showAdminLoginForm() {
  document.getElementById("adminLoginSection").style.display = "block";
  document.getElementById("adminLoginToggleSection").style.display = "none";
  setTimeout(() => {
    const inp = document.getElementById("loginPasswordInput");
    if (inp) inp.focus();
  }, 100);
}

function doLogin() {
  const inp = document.getElementById("loginPasswordInput");
  const errEl = document.getElementById("loginError");
  const input = inp ? inp.value : "";
  if (_verifyPwd(input)) {
    currentRole = "admin";
    sessionStorage.setItem("_sx", "admin");
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("appContent").style.display = "block";
    errEl.style.display = "none";
    applyRoleUI();
    init();
  } else {
    if (errEl) errEl.style.display = "block";
    if (inp) {
      inp.value = "";
      inp.classList.add("shake");
      setTimeout(() => inp.classList.remove("shake"), 500);
      inp.focus();
    }
  }
}

function applyRoleUI() {
  const isAdmin = currentRole === "admin";
  // Role badge
  const badge = document.getElementById("roleBadge");
  const viewerBar = document.getElementById("viewerInfoBar");
  if (badge) {
    badge.innerHTML = isAdmin ? "<i class='ph ph-lock-key'></i> Super Admin" : "<i class='ph ph-eye'></i> View Only";
    badge.className = isAdmin
      ? "role-badge role-admin"
      : "role-badge role-viewer";
  }
  if (viewerBar) viewerBar.style.display = isAdmin ? "none" : "flex";

  // Admin-only header buttons
  document.querySelectorAll("[data-admin-only]").forEach((el) => {
    el.style.display = isAdmin ? "" : "none";
  });

  // Admin-only tabs
  document.querySelectorAll("[data-admin-tab]").forEach((el) => {
    el.style.display = isAdmin ? "" : "none";
  });

  // Switch to stock tab if current tab is admin-only and user is viewer
  if (!isAdmin) {
    const activeTab = document.querySelector(".tab.active");
    if (activeTab && activeTab.dataset.adminTab) {
      switchTab("stock", document.querySelector(".tab"));
    }
  }
}

function logoutToViewer() {
  currentRole = "viewer";
  sessionStorage.setItem("_sx", "viewer");
  applyRoleUI();
  showToast("<i class='ph ph-eye'></i> Viewer মোডে ফিরে এসেছেন।", "info");
}

// ===== INIT (Firebase real-time listener) =====
function init() {
  // Show loader only now (after login)
  const loader = document.getElementById("firebaseLoader");
  if (loader) loader.style.display = "flex";

  const dataRef = ref(db, DB_ROOT);
  onValue(
    dataRef,
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        products = data.products || [];
        transactions = data.transactions || [];
        activityLog = data.activityLog || [];
      } else {
        products = [];
        transactions = [];
        activityLog = [];
      }
      renderAll();
      renderActivityLog();
      setTodayDates();
      updateCategoryFilter();
      hideLoader();
    },
    (error) => {
      console.error("Firebase read error:", error);
      hideLoader();
      showToast("<i class='ph ph-x-circle'></i> Firebase সংযোগে সমস্যা হয়েছে।", "error");
      renderAll();
      renderActivityLog();
      setTodayDates();
      updateCategoryFilter();
    },
  );
}

function setTodayDates() {
  const today = new Date().toISOString().split("T")[0];
  ["issueDate", "receiveDate"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = today;
  });
}

// ===== STORAGE (Firebase) =====
function saveData() {
  const payload = { products, transactions, activityLog };
  set(ref(db, DB_ROOT), payload)
    .then(() => updateLastSaved())
    .catch((err) => console.error("Firebase save error:", err));
}

function loadData() {
  // Not used anymore — Firebase uses real-time listener in init()
}

// ===== ACTIVITY LOG =====
function logActivity(action, details) {
  if (currentRole !== "admin") return;
  activityLog.push({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    action,
    details,
  });
  // Keep only last 500 entries
  if (activityLog.length > 500) activityLog = activityLog.slice(-500);
}

const ACTION_META = {
  add_product: { icon: "<i class='ph ph-plus'></i>", label: "পণ্য যোগ", cls: "al-add" },
  edit_product: { icon: "<i class='ph ph-pencil-simple'></i>", label: "পণ্য এডিট", cls: "al-edit" },
  delete_product: { icon: "<i class='ph ph-trash'></i>", label: "পণ্য মুছে ফেলা", cls: "al-delete" },
  stock_reduce: { icon: "<i class='ph ph-trend-down'></i>", label: "স্টক কমানো", cls: "al-reduce" },
  issue: { icon: "<i class='ph ph-upload-simple'></i>", label: "ইস্যু", cls: "al-issue" },
  receive: { icon: "<i class='ph ph-download-simple'></i>", label: "মাল গ্রহণ", cls: "al-receive" },
  reset: { icon: "<i class='ph ph-arrows-clockwise'></i>", label: "রিসেট", cls: "al-reset" },
  csv_import: { icon: "<i class='ph ph-clipboard-text'></i>", label: "CSV আমদানি", cls: "al-import" },
};

function renderActivityLog(list) {
  list = list || activityLog;
  const tbody = document.getElementById("activityLogBody");
  if (!tbody) return;
  const sorted = [...list].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
  );
  if (!sorted.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state"><span class="emoji"><i class='ph ph-scroll'></i></span>কোনো কার্যক্রম লগ নেই।</div></td></tr>`;
    return;
  }
  tbody.innerHTML = sorted
    .map((entry, i) => {
      const meta = ACTION_META[entry.action] || {
        icon: "•",
        label: entry.action,
        cls: "",
      };
      return `<tr>
      <td>${sorted.length - i}</td>
      <td>${formatDateTime(entry.timestamp)}</td>
      <td><span class="al-badge ${meta.cls}">${meta.icon} ${meta.label}</span></td>
      <td>${entry.details}</td>
    </tr>`;
    })
    .join("");
}

function filterActivityLog() {
  const dateVal = document.getElementById("alFilterDate")?.value;
  const typeVal = document.getElementById("alFilterType")?.value;
  let list = activityLog;
  if (dateVal) list = list.filter((e) => e.timestamp.startsWith(dateVal));
  if (typeVal) list = list.filter((e) => e.action === typeVal);
  renderActivityLog(list);
}

// ===== BULK CSV IMPORT =====
let _csvPreviewData = [];

function downloadCSVTemplate() {
  const csv =
    "\uFEFF" +
    [
      "পণ্যের নাম,ক্যাটাগরি,একক,প্রারম্ভিক স্টক,ন্যূনতম স্টক",
      "কলম,স্টেশনারি,পিস,100,10",
      "সাদা কাগজ (A4),স্টেশনারি,রিম,50,5",
      "মার্কার,স্টেশনারি,পিস,30,5",
    ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "product_import_template.csv";
  a.click();
  showToast("<i class='ph ph-clipboard-text'></i> Template CSV ডাউনলোড হচ্ছে!", "success");
}

function importCSVFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2)
        return showToast("<i class='ph ph-x-circle'></i> CSV ফাইলে কোনো ডেটা নেই।", "error");
      // Strip BOM if present
      const header = lines[0].replace(/^\uFEFF/, "");
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i]
          .split(",")
          .map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols.length < 3 || !cols[0]) continue;
        rows.push({
          name: cols[0] || "",
          category: cols[1] || "সাধারণ",
          unit: cols[2] || "পিস",
          stock: parseInt(cols[3]) || 0,
          minStock: parseInt(cols[4]) || 10,
        });
      }
      if (!rows.length)
        return showToast("<i class='ph ph-x-circle'></i> কোনো বৈধ পণ্য পাওয়া যায়নি।", "error");
      _csvPreviewData = rows;
      previewCSVData(rows);
    } catch (err) {
      showToast("<i class='ph ph-x-circle'></i> CSV পড়তে পারেনি। ফাইল চেক করুন।", "error");
    }
    event.target.value = "";
  };
  reader.readAsText(file, "utf-8");
}

function previewCSVData(rows) {
  const tbody = document.getElementById("csvPreviewBody");
  const countEl = document.getElementById("csvPreviewCount");
  const dupEl = document.getElementById("csvDupWarning");
  if (!tbody) return;
  const existing = new Set(products.map((p) => p.name.toLowerCase()));
  const dups = rows.filter((r) => existing.has(r.name.toLowerCase()));
  if (countEl) countEl.textContent = rows.length;
  if (dupEl) {
    if (dups.length) {
      dupEl.textContent = `<i class='ph ph-warning'></i> ${dups.length}টি পণ্য ইতিমধ্যে আছে, সেগুলো skip হবে: ${dups.map((d) => d.name).join(", ")}`;
      dupEl.style.display = "block";
    } else {
      dupEl.style.display = "none";
    }
  }
  tbody.innerHTML = rows
    .map((r, i) => {
      const isDup = existing.has(r.name.toLowerCase());
      return `<tr class="${isDup ? "csv-dup-row" : ""}">
      <td>${i + 1}</td>
      <td>${r.name}${isDup ? ' <span style="color:#f87171;font-size:0.75rem">(ডুপ্লিকেট)</span>' : ""}</td>
      <td>${r.category}</td>
      <td>${r.unit}</td>
      <td>${r.stock}</td>
      <td>${r.minStock}</td>
    </tr>`;
    })
    .join("");
  openModal("csvPreviewModal");
}

function confirmCSVImport() {
  if (!_csvPreviewData.length) return;
  const existing = new Set(products.map((p) => p.name.toLowerCase()));
  const newRows = _csvPreviewData.filter(
    (r) => !existing.has(r.name.toLowerCase()),
  );
  if (!newRows.length) {
    showToast("<i class='ph ph-x-circle'></i> সব পণ্য ইতিমধ্যে আছে, কিছু import হয়নি।", "error");
    closeModal("csvPreviewModal");
    return;
  }
  const now = new Date().toISOString().slice(0, 16);
  let nextId = products.length ? Math.max(...products.map((p) => p.id)) + 1 : 1;
  newRows.forEach((r) => {
    products.push({
      id: nextId++,
      name: r.name,
      category: r.category,
      unit: r.unit,
      stock: r.stock,
      minStock: r.minStock,
      lastIn: r.stock > 0 ? now : null,
      lastIssue: null,
      lastIssueTo: null,
      createdAt: now,
    });
    if (r.stock > 0) {
      transactions.push({
        id: Date.now() + nextId,
        type: "in",
        productId: nextId - 1,
        productName: r.name,
        unit: r.unit,
        qty: r.stock,
        person: "CSV আমদানি",
        dept: "",
        note: "Bulk Import",
        date: now,
      });
    }
  });
  logActivity(
    "csv_import",
    `CSV থেকে ${newRows.length}টি পণ্য আমদানি করা হয়েছে`,
  );
  saveData();
  renderAll();
  updateCategoryFilter();
  closeModal("csvPreviewModal");
  closeModal("exportModal");
  _csvPreviewData = [];
  showToast(`<i class='ph ph-check-circle'></i> ${newRows.length}টি পণ্য সফলভাবে আমদানি হয়েছে!`, "success");
}

function resetAllData() {
  const passInput = document.getElementById("resetPassword");
  const errEl = document.getElementById("resetPassError");
  if (!passInput || !_verifyPwd(passInput.value)) {
    if (errEl) errEl.style.display = "block";
    if (passInput) {
      passInput.focus();
      passInput.select();
    }
    return;
  }
  // Delete everything from Firebase
  logActivity(
    "reset",
    "\u09b8\u09ae\u09b8\u09cd\u09a4 \u09a1\u09c7\u099f\u09be \u09b0\u09bf\u09b8\u09c7\u099f \u0995\u09b0\u09be \u09b9\u09af\u09bc\u09c7\u099b\u09c7",
  );
  remove(ref(db, DB_ROOT))
    .then(() => {
      products = [];
      transactions = [];
      activityLog = [];
      closeModal("resetModal");
      if (passInput) passInput.value = "";
      if (errEl) errEl.style.display = "none";
      renderAll();
      renderActivityLog();
      updateCategoryFilter();
      showToast(
        "<i class='ph ph-check-circle'></i> সব ডেটা মুছে ফেলা হয়েছে। নতুন রেজিস্টার শুরু হয়েছে।",
        "success",
      );
    })
    .catch((err) => {
      console.error("Firebase reset error:", err);
      showToast("<i class='ph ph-x-circle'></i> রিসেট করতে পারেনি।", "error");
    });
}

function openModal(id) {
  document.getElementById(id).classList.add("open");
  if (id === "resetModal") {
    const p = document.getElementById("resetPassword");
    const e = document.getElementById("resetPassError");
    if (p) {
      p.value = "";
      setTimeout(() => p.focus(), 200);
    }
    if (e) e.style.display = "none";
  }
}

// ===== RENDER =====
function renderAll() {
  renderStock();
  renderTransactions();
  renderProductDropdowns();
  updateStats();
  updateLowStockBanner();
}

function updateStats() {
  const low = products.filter(
    (p) => p.stock <= p.minStock && p.stock > 0,
  ).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;
  document.getElementById("totalItems").textContent = products.length;
  document.getElementById("inStock").textContent = products.filter(
    (p) => p.stock > 0,
  ).length;
  document.getElementById("lowStockCount").textContent = low + outOfStock;
  document.getElementById("totalTransactions").textContent =
    transactions.length;
}

function stockStatus(p) {
  if (p.stock === 0) return { label: "<i class='ph ph-x-circle'></i> শেষ", cls: "badge-danger" };
  if (p.stock <= p.minStock) return { label: "<i class='ph ph-warning'></i> কম", cls: "badge-warning" };
  return { label: "<i class='ph ph-check-circle'></i> ভালো", cls: "badge-success" };
}

function renderStock(list) {
  list = list || products;
  const tbody = document.getElementById("stockTableBody");
  const isAdmin = currentRole === "admin";
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="${isAdmin ? 10 : 9}"><div class="empty-state"><span class="emoji"><i class='ph ph-mailbox'></i></span>কোনো পণ্য নেই।${isAdmin ? ' "+ নতুন পণ্য" বাটনে ক্লিক করে পণ্য যোগ করুন।' : ""}</div></td></tr>`;
    return;
  }
  tbody.innerHTML = list
    .map((p, idx) => {
      const st = stockStatus(p);
      const stockCls =
        p.stock === 0
          ? "stock-low"
          : p.stock <= p.minStock
            ? "stock-warn"
            : "stock-ok";
      const actionCell = isAdmin
        ? `<td class="action-cell">
                <button class="btn btn-sm btn-success" onclick="quickReceive(${p.id})" title="স্টক গ্রহণ">+IN</button>
                <button class="btn btn-sm btn-danger" onclick="quickIssue(${p.id})" title="ইস্যু করুন">ISSUE</button>
                <button class="btn btn-sm btn-edit" onclick="editProduct(${p.id})" title="এডিট করুন"><i class='ph ph-pencil-simple'></i></button>
                <button class="btn btn-sm btn-ledger" onclick="openLedger(${p.id})" title="ইতিহাস দেখুন"><i class='ph ph-clipboard-text'></i></button>
                <button class="btn btn-sm btn-delete" onclick="deleteProduct(${p.id})" title="স্টক কমান"><i class='ph ph-trend-down'></i></button>
                <button class="btn btn-sm btn-full-delete" onclick="fullDeleteProduct(${p.id})" title="সম্পূর্ণ মুছুন"><i class='ph ph-trash'></i></button>
            </td>`
        : `<td class="action-cell">
                <button class="btn btn-sm btn-ledger" onclick="openLedger(${p.id})" title="ইতিহাস দেখুন"><i class='ph ph-clipboard-text'></i> ইতিহাস</button>
            </td>`;
      return `<tr>
            <td>${idx + 1}</td>
            <td><strong>${p.name}</strong></td>
            <td>${p.category}</td>
            <td>${p.unit}</td>
            <td><span class="stock-num ${stockCls}">${p.stock}</span></td>
            <td>${p.minStock}</td>
            <td>${p.lastIn ? formatDate(p.lastIn) : "—"}</td>
            <td>${p.lastIssueTo ? `<span title="${p.lastIssue}">${p.lastIssueTo}</span>` : "—"}</td>
            <td><span class="badge ${st.cls}">${st.label}</span></td>
            ${actionCell}
        </tr>`;
    })
    .join("");
}

function renderTransactions(list) {
  list = list || transactions;
  const tbody = document.getElementById("transTableBody");
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><span class="emoji"><i class='ph ph-clipboard-text'></i></span>কোনো লেনদেন নেই</div></td></tr>`;
    return;
  }
  const sorted = [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
  tbody.innerHTML = sorted
    .map(
      (t, i) => `<tr>
        <td>${sorted.length - i}</td>
        <td>${formatDateTime(t.date)}</td>
        <td><span class="badge badge-${t.type}">${t.type === "in" ? "<i class='ph ph-download-simple'></i> IN" : "<i class='ph ph-upload-simple'></i> ISSUE"}</span></td>
        <td>${t.productName}</td>
        <td><strong>${t.qty} ${t.unit}</strong></td>
        <td>${t.person || "—"}</td>
        <td>${t.dept || "—"}</td>
        <td>${t.note || "—"}</td>
    </tr>`,
    )
    .join("");
}

function renderProductDropdowns() {
  const issueEl = document.getElementById("issueProduct");
  const receiveEl = document.getElementById("receiveProduct");
  const opts = products
    .map(
      (p) =>
        `<option value="${p.id}">${p.name} (স্টক: ${p.stock} ${p.unit})</option>`,
    )
    .join("");
  issueEl.innerHTML = `<option value="">-- পণ্য বেছে নিন --</option>` + opts;
  receiveEl.innerHTML = `<option value="">-- পণ্য বেছে নিন --</option>` + opts;
}

function updateCategoryFilter() {
  const cats = [...new Set(products.map((p) => p.category))].sort();
  const sel = document.getElementById("filterCategory");
  sel.innerHTML =
    `<option value="">সব ক্যাটাগরি</option>` +
    cats.map((c) => `<option>${c}</option>`).join("");
  const catList = document.getElementById("categoryList");
  if (catList)
    catList.innerHTML = cats.map((c) => `<option value="${c}">`).join("");
}

// ===== FILTER =====
function filterStock() {
  const s = document.getElementById("searchStock").value.toLowerCase();
  const cat = document.getElementById("filterCategory").value;
  const filtered = products.filter((p) => {
    const matchSearch =
      !s ||
      p.name.toLowerCase().includes(s) ||
      p.category.toLowerCase().includes(s);
    const matchCat = !cat || p.category === cat;
    return matchSearch && matchCat;
  });
  renderStock(filtered);
}

function filterTransactions() {
  const s = document.getElementById("searchTrans").value.toLowerCase();
  const type = document.getElementById("filterTransType").value;
  const date = document.getElementById("filterDate").value;
  const filtered = transactions.filter((t) => {
    const matchSearch =
      !s ||
      t.productName.toLowerCase().includes(s) ||
      (t.person && t.person.toLowerCase().includes(s));
    const matchType = !type || t.type === type;
    const matchDate = !date || t.date.startsWith(date);
    return matchSearch && matchType && matchDate;
  });
  renderTransactions(filtered);
}

// ===== ISSUE =====
function updateIssueStock() {
  const id = +document.getElementById("issueProduct").value;
  const p = products.find((x) => x.id === id);
  document.getElementById("issueCurrentStock").value = p
    ? `${p.stock} ${p.unit}`
    : "";
}

function submitIssue(e) {
  e.preventDefault();
  const id = +document.getElementById("issueProduct").value;
  const qty = +document.getElementById("issueQty").value;
  const name = document.getElementById("issueToName").value.trim();
  const dept = document.getElementById("issueDept").value.trim();
  const purpose = document.getElementById("issuePurpose").value.trim();
  const note = document.getElementById("issueNote").value.trim();
  const date = document.getElementById("issueDate").value;

  const p = products.find((x) => x.id === id);
  if (!p) return showToast("পণ্য খুঁজে পাওয়া যায়নি।", "error");
  if (qty > p.stock)
    return showToast(
      `পর্যাপ্ত স্টক নেই! বর্তমান স্টক: ${p.stock} ${p.unit}`,
      "error",
    );
  if (qty <= 0) return showToast("পরিমাণ সঠিক নয়।", "error");

  p.stock -= qty;
  p.lastIssue = new Date().toISOString();
  p.lastIssueTo = name;

  transactions.push({
    id: Date.now(),
    type: "issue",
    productId: p.id,
    productName: p.name,
    unit: p.unit,
    qty,
    person: name,
    dept: dept + (purpose ? ` / ${purpose}` : ""),
    note,
    date: date + "T" + new Date().toTimeString().slice(0, 5),
  });

  logActivity(
    "issue",
    `${p.name} — ${qty} ${p.unit} ইস্যু → ${name}${dept ? " (" + dept + ")" : ""}`,
  );
  saveData();
  renderAll();
  e.target.reset();
  setTodayDates();
  showTxnConfirm(
    "<i class='ph ph-upload-simple'></i> ইস্যু সম্পন্ন!",
    `<strong>${qty} ${p.unit}</strong> <em>${p.name}</em><br/>প্রাপক: <strong>${name}</strong>${dept ? "<br/>বিভাগ: " + dept : ""}${purpose ? " / " + purpose : ""}<br/>তারিখ: ${date}<br/>অবশিষ্ট স্টক: <strong>${p.stock} ${p.unit}</strong>`,
    "issue",
  );
}

// ===== RECEIVE =====
function submitReceive(e) {
  e.preventDefault();
  const id = +document.getElementById("receiveProduct").value;
  const qty = +document.getElementById("receiveQty").value;
  const supplier = document.getElementById("receiveSupplier").value.trim();
  const invoice = document.getElementById("receiveInvoice").value.trim();
  const note = document.getElementById("receiveNote").value.trim();
  const date = document.getElementById("receiveDate").value;

  const p = products.find((x) => x.id === id);
  if (!p) return showToast("পণ্য খুঁজে পাওয়া যায়নি।", "error");
  if (qty <= 0) return showToast("পরিমাণ সঠিক নয়।", "error");

  p.stock += qty;
  p.lastIn = new Date().toISOString();

  transactions.push({
    id: Date.now(),
    type: "in",
    productId: p.id,
    productName: p.name,
    unit: p.unit,
    qty,
    person: supplier,
    dept: invoice ? `Invoice: ${invoice}` : "",
    note,
    date: date + "T" + new Date().toTimeString().slice(0, 5),
  });

  logActivity(
    "receive",
    `${p.name} — ${qty} ${p.unit} গ্রহণ${supplier ? " (সরবরাহকারী: " + supplier + ")" : ""}`,
  );
  saveData();
  renderAll();
  e.target.reset();
  setTodayDates();
  showTxnConfirm(
    "<i class='ph ph-download-simple'></i> মাল গ্রহণ সম্পন্ন!",
    `<strong>${qty} ${p.unit}</strong> <em>${p.name}</em> গ্রহণ করা হয়েছে।${supplier ? "<br/>সরবরাহকারী: <strong>" + supplier + "</strong>" : ""}${invoice ? "<br/>ইনভয়েস: " + invoice : ""}<br/>তারিখ: ${date}<br/>মোট স্টক: <strong>${p.stock} ${p.unit}</strong>`,
    "in",
  );
}

// ===== TXN CONFIRM =====
function showTxnConfirm(title, body, type) {
  document.getElementById("txnConfirmIcon").innerHTML =
    type === "in" ? "<i class='ph ph-download-simple'></i>" : "<i class='ph ph-upload-simple'></i>";
  document.getElementById("txnConfirmTitle").innerHTML = title;
  document.getElementById("txnConfirmBody").innerHTML = body;
  document.getElementById("txnConfirmModal").classList.add("open");
}

function txnConfirmOK() {
  document.getElementById("txnConfirmModal").classList.remove("open");
  switchTab("stock", document.querySelectorAll(".tab")[0]);
}

// ===== QUICK ACTIONS =====
function quickReceive(id) {
  switchTab("receive", document.querySelectorAll(".tab")[3]);
  document.getElementById("receiveProduct").value = id;
  document.getElementById("receiveQty").focus();
}

function quickIssue(id) {
  switchTab("issue", document.querySelectorAll(".tab")[2]);
  document.getElementById("issueProduct").value = id;
  updateIssueStock();
  document.getElementById("issueToName").focus();
}

// ===== DELETE STOCK (PARTIAL) =====
let _deleteTargetId = null;

function deleteProduct(id) {
  const p = products.find((x) => x.id === id);
  if (!p) return;
  _deleteTargetId = id;
  document.getElementById("deleteProductName").value = p.name;
  document.getElementById("deleteCurrentStock").value = `${p.stock} ${p.unit}`;
  document.getElementById("deleteQty").value = "";
  document.getElementById("deleteQty").max = p.stock;
  document.getElementById("deleteReason").value = "";
  const passEl = document.getElementById("deleteStockPassword");
  const errEl = document.getElementById("deletePassError");
  if (passEl) passEl.value = "";
  if (errEl) errEl.style.display = "none";
  openModal("deleteStockModal");
  setTimeout(() => document.getElementById("deleteQty").focus(), 200);
}

function confirmPartialDelete() {
  const p = products.find((x) => x.id === _deleteTargetId);
  if (!p) return;
  const qty = +document.getElementById("deleteQty").value;
  const reason = document.getElementById("deleteReason").value.trim();
  const passInput = document.getElementById("deleteStockPassword");
  const errEl = document.getElementById("deletePassError");

  if (!qty || qty <= 0) return showToast("সঠিক পরিমাণ লিখুন।", "error");
  if (qty > p.stock)
    return showToast(
      `পরিমাণ বর্তমান স্টক (${p.stock} ${p.unit}) এর বেশি হতে পারবে না।`,
      "error",
    );

  if (!passInput || passInput.value !== "2507") {
    if (errEl) errEl.style.display = "block";
    if (passInput) {
      passInput.focus();
      passInput.select();
    }
    return;
  }

  p.stock -= qty;

  transactions.push({
    id: Date.now(),
    type: "issue",
    productId: p.id,
    productName: p.name,
    unit: p.unit,
    qty,
    person: "স্টক সমন্বয়",
    dept: reason || "ম্যানুয়াল কমানো",
    note: reason,
    date: new Date().toISOString().slice(0, 16),
  });

  logActivity(
    "stock_reduce",
    `${p.name} — ${qty} ${p.unit} কমানো হয়েছে (কারণ: ${reason || "ম্যানুয়াল সমন্বয়"})`,
  );
  saveData();
  renderAll();
  closeModal("deleteStockModal");
  showToast(`<i class='ph ph-check-circle'></i> "${p.name}" থেকে ${qty} ${p.unit} কমানো হয়েছে।`, "success");
}

// ===== ADD PRODUCT =====
function addProduct(e) {
  e.preventDefault();
  const name = document.getElementById("newProductName").value.trim();
  const category = document.getElementById("newProductCategory").value.trim();
  const unit = document.getElementById("newProductUnit").value.trim();
  const stock = +document.getElementById("newProductStock").value || 0;
  const minStock = +document.getElementById("newProductMinStock").value || 10;

  if (products.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    return showToast("এই নামে পণ্য ইতিমধ্যে আছে!", "error");
  }

  const newId = products.length
    ? Math.max(...products.map((p) => p.id)) + 1
    : 1;
  products.push({
    id: newId,
    name,
    category,
    unit,
    stock,
    minStock,
    lastIn: null,
    lastIssue: null,
    lastIssueTo: null,
    createdAt: new Date().toISOString(),
  });

  if (stock >= 0) {
    transactions.push({
      id: Date.now(),
      type: "in",
      productId: newId,
      productName: name,
      unit,
      qty: stock,
      person: "প্রারম্ভিক স্টক",
      dept: "",
      note: "নতুন পণ্য যোগ",
      date: new Date().toISOString().slice(0, 16),
    });
  }

  logActivity(
    "add_product",
    `"${name}" পণ্য যোগ করা হয়েছে (জমা: ${stock} ${unit}, ক্যাটাগরি: ${category})`,
  );
  saveData();
  renderAll();
  updateCategoryFilter();
  closeModal("addProductModal");
  e.target.reset();
  showToast(`<i class='ph ph-check-circle'></i> "${name}" সফলভাবে যোগ করা হয়েছে।`, "success");
}

// ===== EXPORT =====
function downloadCSV(csv, filename) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function exportStockCSV() {
  if (!products.length) return showToast("কোনো পণ্য নেই।", "error");
  const headers = [
    "#",
    "পণ্যের নাম",
    "ক্যাটাগরি",
    "একক",
    "বর্তমান স্টক",
    "ন্যূনতম স্টক",
    "অবস্থা",
  ];
  const rows = products.map((p, i) => {
    const st = p.stock === 0 ? "শেষ" : p.stock <= p.minStock ? "কম" : "ভালো";
    return [
      i + 1,
      `"${p.name}"`,
      `"${p.category}"`,
      p.unit,
      p.stock,
      p.minStock,
      st,
    ];
  });
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadCSV(
    csv,
    `stock_register_${new Date().toISOString().slice(0, 10)}.csv`,
  );
  closeModal("exportModal");
  showToast("<i class='ph ph-download-simple'></i> স্টক CSV ডাউনলোড হচ্ছে!", "success");
}

function exportTransCSV() {
  const from = document.getElementById("exportFromDate").value;
  const to = document.getElementById("exportToDate").value;
  let list = [...transactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
  if (from) list = list.filter((t) => t.date >= from);
  if (to) list = list.filter((t) => t.date <= to + "T23:59");
  if (!list.length)
    return showToast("নির্বাচিত তারিখে কোনো লেনদেন নেই।", "error");
  const headers = [
    "#",
    "তারিখ",
    "ধরন",
    "পণ্যের নাম",
    "পরিমাণ",
    "একক",
    "প্রাপক/সরবরাহকারী",
    "বিভাগ/উদ্দেশ্য",
    "মন্তব্য",
  ];
  const rows = list.map((t, i) => [
    list.length - i,
    t.date.replace("T", " "),
    t.type === "in" ? "IN" : "ISSUE",
    `"${t.productName}"`,
    t.qty,
    t.unit,
    `"${t.person || ""}"`,
    `"${t.dept || ""}"`,
    `"${t.note || ""}"`,
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const suffix =
    from && to
      ? `_${from}_${to}`
      : from
        ? `_from_${from}`
        : to
          ? `_to_${to}`
          : "";
  downloadCSV(
    csv,
    `transactions${suffix}_${new Date().toISOString().slice(0, 10)}.csv`,
  );
  closeModal("exportModal");
  showToast(`<i class='ph ph-download-simple'></i> ${list.length}টি লেনদেন CSV ডাউনলোড হচ্ছে!`, "success");
}

function printStock() {
  const date = new Date().toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const rows = products
    .map((p, i) => {
      const st =
        p.stock === 0
          ? '<span style="color:#ef4444">শেষ</span>'
          : p.stock <= p.minStock
            ? '<span style="color:#f59e0b">কম</span>'
            : '<span style="color:#10b981">ভালো</span>';
      return `<tr><td>${i + 1}</td><td>${p.name}</td><td>${p.category}</td><td>${p.unit}</td><td><strong>${p.stock}</strong></td><td>${p.minStock}</td><td>${st}</td></tr>`;
    })
    .join("");
  openPrintWindow(
    `স্টক রেজিস্টার — ${date}`,
    `<table>
            <thead><tr><th>#</th><th>পণ্যের নাম</th><th>ক্যাটাগরি</th><th>একক</th><th>বর্তমান স্টক</th><th>ন্যূনতম স্টক</th><th>অবস্থা</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`,
  );
}

function printTransactions() {
  const from = document.getElementById("exportFromDate").value;
  const to = document.getElementById("exportToDate").value;
  let list = [...transactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
  if (from) list = list.filter((t) => t.date >= from);
  if (to) list = list.filter((t) => t.date <= to + "T23:59");
  if (!list.length)
    return showToast("নির্বাচিত তারিখে কোনো লেনদেন নেই।", "error");
  const date = new Date().toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const rows = list
    .map((t, i) => {
      const type =
        t.type === "in"
          ? '<span style="color:#10b981"><i class="ph ph-download-simple"></i> IN</span>'
          : '<span style="color:#ef4444"><i class="ph ph-upload-simple"></i> ISSUE</span>';
      return `<tr><td>${list.length - i}</td><td>${t.date.replace("T", " ")}</td><td>${type}</td><td>${t.productName}</td><td>${t.qty} ${t.unit}</td><td>${t.person || "—"}</td><td>${t.dept || "—"}</td><td>${t.note || "—"}</td></tr>`;
    })
    .join("");
  const rangeLabel = from || to ? ` (${from || "শুরু"} → ${to || "শেষ"})` : "";
  openPrintWindow(
    `লেনদেন ইতিহাস${rangeLabel} — ${date}`,
    `<table>
            <thead><tr><th>#</th><th>তারিখ</th><th>ধরন</th><th>পণ্য</th><th>পরিমাণ</th><th>প্রাপক</th><th>বিভাগ</th><th>মন্তব্য</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`,
  );
}

function openPrintWindow(title, tableHTML) {
  const win = window.open("", "_blank");
  win.document.write(`<!DOCTYPE html><html lang="bn"><head>
        <meta charset="UTF-8"/>
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet"/>
        <style>
            body { font-family: 'Hind Siliguri', sans-serif; padding: 24px; color: #111; }
            h2 { margin-bottom: 16px; font-size: 1.2rem; }
            table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
            th { background: #1e293b; color: #fff; padding: 10px 12px; text-align: left; }
            td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
            tr:nth-child(even) td { background: #f8fafc; }
            @media print { body { padding: 0; } }
        </style>
    </head><body>
        <h2>${title}</h2>
        ${tableHTML}
        <p style="margin-top:20px;font-size:0.75rem;color:#64748b;">মোট: ${tableHTML.match(/<tr>/g)?.length || 0} টি এন্ট্রি</p>
        <script>window.onload=()=>window.print();<\/script>
    </body></html>`);
  win.document.close();
  closeModal("exportModal");
}

// ===== TABS =====
function switchTab(name, el) {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((t) => t.classList.remove("active"));
  if (el) el.classList.add("active");
  const target = document.getElementById("tab-" + name);
  if (target) target.classList.add("active");
}

// ===== MODAL =====
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}

function closeModalOutside(e, id) {
  if (e.target === document.getElementById(id)) closeModal(id);
}

// ===== TOAST =====
let toastTimer;
function showToast(msg, type = "info") {
  const t = document.getElementById("toast");
  t.innerHTML = msg;
  t.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3500);
}

// ===== DATE FORMAT =====
function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("bn-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("bn-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ===== LOW STOCK BANNER =====
function updateLowStockBanner() {
  const lowItems = products.filter(
    (p) => p.stock === 0 || p.stock <= p.minStock,
  );
  const banner = document.getElementById("lowStockBanner");
  const text = document.getElementById("lowStockBannerText");
  if (!banner || !text) return;
  if (lowItems.length === 0) {
    banner.style.display = "none";
    return;
  }
  const outOfStock = lowItems.filter((p) => p.stock === 0);
  const lowStock = lowItems.filter((p) => p.stock > 0 && p.stock <= p.minStock);
  const parts = [];
  if (outOfStock.length)
    parts.push(
      `${outOfStock.length}টি পণ্যের স্টক শেষ (${outOfStock
        .map((p) => p.name)
        .slice(0, 3)
        .join(", ")}${outOfStock.length > 3 ? "..." : ""})`,
    );
  if (lowStock.length)
    parts.push(
      `${lowStock.length}টি পণ্যের স্টক কম (${lowStock
        .map((p) => p.name)
        .slice(0, 3)
        .join(", ")}${lowStock.length > 3 ? "..." : ""})`,
    );
  text.innerHTML = `<i class="ph ph-warning"></i> সতর্কতা: ` + parts.join(" | ");
  banner.style.display = "block";
}

// ===== EDIT PRODUCT =====
function editProduct(id) {
  const p = products.find((x) => x.id === id);
  if (!p) return;
  document.getElementById("editProductId").value = p.id;
  document.getElementById("editProductName").value = p.name;
  document.getElementById("editProductCategory").value = p.category;
  document.getElementById("editProductUnit").value = p.unit;
  document.getElementById("editProductMinStock").value = p.minStock;
  openModal("editProductModal");
  setTimeout(() => document.getElementById("editProductName").focus(), 200);
}

function saveEditProduct(e) {
  e.preventDefault();
  const id = +document.getElementById("editProductId").value;
  const p = products.find((x) => x.id === id);
  if (!p) return;
  const newName = document.getElementById("editProductName").value.trim();
  const newCat = document.getElementById("editProductCategory").value.trim();
  const newUnit = document.getElementById("editProductUnit").value.trim();
  const newMin = +document.getElementById("editProductMinStock").value || 0;
  if (
    products.some(
      (x) => x.id !== id && x.name.toLowerCase() === newName.toLowerCase(),
    )
  ) {
    return showToast("এই নামে অন্য পণ্য ইতিমধ্যে আছে!", "error");
  }
  const oldName = p.name;
  p.name = newName;
  p.category = newCat;
  p.unit = newUnit;
  p.minStock = newMin;
  if (oldName !== newName) {
    transactions.forEach((t) => {
      if (t.productId === id) t.productName = newName;
    });
  }
  logActivity(
    "edit_product",
    `"${oldName}"${oldName !== newName ? ' → "' + newName + '"' : ""} এডিট করা হয়েছে`,
  );
  saveData();
  renderAll();
  updateCategoryFilter();
  closeModal("editProductModal");
  showToast(`<i class='ph ph-check-circle'></i> "${newName}" সফলভাবে আপডেট হয়েছে।`, "success");
}

// ===== FULL PRODUCT DELETE =====
let _fullDeleteTargetId = null;

function fullDeleteProduct(id) {
  const p = products.find((x) => x.id === id);
  if (!p) return;
  _fullDeleteTargetId = id;
  document.getElementById("fullDeleteProductName").textContent =
    '"' + p.name + '"';
  const passEl = document.getElementById("fullDeletePassword");
  const errEl = document.getElementById("fullDeletePassError");
  if (passEl) passEl.value = "";
  if (errEl) errEl.style.display = "none";
  openModal("fullDeleteModal");
  setTimeout(() => passEl && passEl.focus(), 200);
}

function confirmFullDelete() {
  const p = products.find((x) => x.id === _fullDeleteTargetId);
  if (!p) return;
  const passInput = document.getElementById("fullDeletePassword");
  const errEl = document.getElementById("fullDeletePassError");
  if (!passInput || !_verifyPwd(passInput.value)) {
    if (errEl) errEl.style.display = "block";
    if (passInput) {
      passInput.focus();
      passInput.select();
    }
    return;
  }
  const name = p.name;
  products = products.filter((x) => x.id !== _fullDeleteTargetId);
  transactions = transactions.filter(
    (t) => t.productId !== _fullDeleteTargetId,
  );
  _fullDeleteTargetId = null;
  logActivity("delete_product", `"${name}" পণ্য সম্পূর্ণভাবে মুছে ফেলা হয়েছে`);
  saveData();
  renderAll();
  updateCategoryFilter();
  closeModal("fullDeleteModal");
  showToast(`<i class='ph ph-trash'></i> "${name}" সম্পূর্ণভাবে মুছে ফেলা হয়েছে।`, "success");
}

// ===== PRODUCT LEDGER =====
function openLedger(id) {
  const p = products.find((x) => x.id === id);
  if (!p) return;
  const pTxns = [...transactions.filter((t) => t.productId === id)].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
  document.getElementById("ledgerTitle").innerHTML =
    "<i class='ph ph-package'></i> " + p.name + " — ইতিহাস";
  document.getElementById("ledgerSubtitle").textContent =
    `ক্যাটাগরি: ${p.category} | একক: ${p.unit} | বর্তমান স্টক: ${p.stock}`;
  const totalIn = pTxns
    .filter((t) => t.type === "in")
    .reduce((s, t) => s + t.qty, 0);
  const totalIssue = pTxns
    .filter((t) => t.type === "issue")
    .reduce((s, t) => s + t.qty, 0);
  document.getElementById("ledgerSummary").innerHTML = `
        <div class="ledger-sum-grid">
            <div class="ledger-sum-card lsc-in"><div class="lsc-val">${totalIn} ${p.unit}</div><div class="lsc-label">মোট গ্রহণ (IN)</div></div>
            <div class="ledger-sum-card lsc-issue"><div class="lsc-val">${totalIssue} ${p.unit}</div><div class="lsc-label">মোট ইস্যু</div></div>
            <div class="ledger-sum-card lsc-stock"><div class="lsc-val">${p.stock} ${p.unit}</div><div class="lsc-label">বর্তমান স্টক</div></div>
            <div class="ledger-sum-card lsc-txn"><div class="lsc-val">${pTxns.length}</div><div class="lsc-label">মোট লেনদেন</div></div>
        </div>`;
  const empty = document.getElementById("ledgerEmpty");
  const tbody = document.getElementById("ledgerTableBody");
  if (!pTxns.length) {
    tbody.innerHTML = "";
    empty.style.display = "block";
  } else {
    empty.style.display = "none";
    tbody.innerHTML = pTxns
      .map(
        (t, i) => `<tr>
            <td>${pTxns.length - i}</td>
            <td>${formatDateTime(t.date)}</td>
            <td><span class="badge badge-${t.type}">${t.type === "in" ? "<i class='ph ph-download-simple'></i> IN" : "<i class='ph ph-upload-simple'></i> ISSUE"}</span></td>
            <td><strong>${t.qty} ${t.unit}</strong></td>
            <td>${t.person || "—"}</td>
            <td>${t.dept || "—"}</td>
            <td>${t.note || "—"}</td>
        </tr>`,
      )
      .join("");
  }
  openModal("ledgerModal");
}

// ===== DATE-RANGE REPORT =====
function generateReport() {
  const from = document.getElementById("reportFrom").value;
  const to = document.getElementById("reportTo").value;
  let list = [...transactions];
  if (from) list = list.filter((t) => t.date >= from);
  if (to) list = list.filter((t) => t.date <= to + "T23:59");
  const resultDiv = document.getElementById("reportResult");
  const emptyDiv = document.getElementById("reportEmpty");
  if (!list.length) {
    resultDiv.style.display = "none";
    emptyDiv.style.display = "block";
    return;
  }
  emptyDiv.style.display = "none";
  resultDiv.style.display = "block";
  const inList = list
    .filter((t) => t.type === "in")
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const issueList = list
    .filter((t) => t.type === "issue")
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalInQty = inList.reduce((s, t) => s + t.qty, 0);
  const totalIssueQty = issueList.reduce((s, t) => s + t.qty, 0);
  const uniqueProducts = new Set(list.map((t) => t.productName)).size;
  const rangeLabel =
    from && to
      ? `${from} থেকে ${to}`
      : from
        ? `${from} থেকে`
        : to
          ? `${to} পর্যন্ত`
          : "সকল সময়";
  document.getElementById("reportSummaryCards").innerHTML = `
        <div class="rpt-card rpt-in"><div class="rpt-val">${inList.length}</div><div class="rpt-label">মোট IN লেনদেন</div><div class="rpt-sub">${totalInQty} ইউনিট গ্রহণ</div></div>
        <div class="rpt-card rpt-issue"><div class="rpt-val">${issueList.length}</div><div class="rpt-label">মোট ISSUE লেনদেন</div><div class="rpt-sub">${totalIssueQty} ইউনিট ইস্যু</div></div>
        <div class="rpt-card rpt-prod"><div class="rpt-val">${uniqueProducts}</div><div class="rpt-label">পণ্যের সংখ্যা</div><div class="rpt-sub">${rangeLabel}</div></div>
        <div class="rpt-card rpt-total"><div class="rpt-val">${list.length}</div><div class="rpt-label">মোট লেনদেন</div><div class="rpt-sub">এই সময়কালে</div></div>`;
  document.getElementById("reportInBody").innerHTML = inList.length
    ? inList
        .map(
          (t, i) =>
            `<tr><td>${inList.length - i}</td><td>${formatDateTime(t.date)}</td><td>${t.productName}</td><td><strong>${t.qty} ${t.unit}</strong></td><td>${t.person || "—"}</td><td>${t.note || "—"}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="6"><div class="empty-state" style="padding:20px">এই সময়কালে কোনো মাল গ্রহণ নেই।</div></td></tr>`;
  document.getElementById("reportIssueBody").innerHTML = issueList.length
    ? issueList
        .map(
          (t, i) =>
            `<tr><td>${issueList.length - i}</td><td>${formatDateTime(t.date)}</td><td>${t.productName}</td><td><strong>${t.qty} ${t.unit}</strong></td><td>${t.person || "—"}</td><td>${t.dept || "—"}</td><td>${t.note || "—"}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="7"><div class="empty-state" style="padding:20px">এই সময়কালে কোনো ইস্যু নেই।</div></td></tr>`;
}

// ===== LAST SAVED TIMESTAMP =====
function updateLastSaved() {
  const el = document.getElementById("lastSavedLabel");
  if (!el) return;
  const now = new Date();
  el.innerHTML = `<i class='ph ph-floppy-disk'></i> সর্বশেষ সেভ: ${now.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}`;
}

// saveData already calls updateLastSaved() via .then() above

// ===== PDF EXPORT =====
function _pdfHeader(doc, title) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(99, 102, 241);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("BKSP Public School & College", pageW / 2, 10, { align: "center" });
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Store Management System", pageW / 2, 17, { align: "center" });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(title, pageW / 2, 24, { align: "center" });
  doc.setTextColor(30, 30, 30);
  return 32;
}

function exportStockPDF() {
  if (!products.length) return showToast("কোনো পণ্য নেই।", "error");
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape" });
    const date = new Date().toLocaleDateString("en-BD");
    const startY = _pdfHeader(doc, `Stock Register — ${date}`);
    const rows = products.map((p, i) => {
      const st = p.stock === 0 ? "EMPTY" : p.stock <= p.minStock ? "LOW" : "OK";
      return [i + 1, p.name, p.category, p.unit, p.stock, p.minStock, st];
    });
    doc.autoTable({
      head: [
        [
          "#",
          "Product Name",
          "Category",
          "Unit",
          "Current Stock",
          "Min Stock",
          "Status",
        ],
      ],
      body: rows,
      startY,
      styles: { font: "helvetica", fontSize: 9, cellPadding: 3 },
      headStyles: {
        fillColor: [99, 102, 241],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      didDrawCell: (data) => {
        if (data.column.index === 6 && data.section === "body") {
          const val = data.cell.raw;
          if (val === "EMPTY") data.cell.styles.textColor = [239, 68, 68];
          else if (val === "LOW") data.cell.styles.textColor = [245, 158, 11];
          else data.cell.styles.textColor = [16, 185, 129];
        }
      },
    });
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `Generated: ${new Date().toLocaleString()} | Total Items: ${products.length}`,
      14,
      doc.internal.pageSize.getHeight() - 8,
    );
    doc.save(`stock_register_${new Date().toISOString().slice(0, 10)}.pdf`);
    closeModal("exportModal");
    showToast("<i class='ph ph-file-pdf'></i> Stock PDF ডাউনলোড হচ্ছে!", "success");
  } catch (e) {
    showToast("PDF তৈরি করতে পারেনি। ইন্টারনেট সংযোগ চেক করুন।", "error");
    console.error(e);
  }
}

function exportTransPDF() {
  const from = document.getElementById("exportFromDate").value;
  const to = document.getElementById("exportToDate").value;
  let list = [...transactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
  if (from) list = list.filter((t) => t.date >= from);
  if (to) list = list.filter((t) => t.date <= to + "T23:59");
  if (!list.length)
    return showToast("নির্বাচিত তারিখে কোনো লেনদেন নেই।", "error");
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape" });
    const rangeLabel =
      from && to
        ? `${from} to ${to}`
        : from
          ? `From ${from}`
          : to
            ? `To ${to}`
            : "All Transactions";
    const startY = _pdfHeader(doc, `Transaction History — ${rangeLabel}`);
    const rows = list.map((t, i) => [
      list.length - i,
      t.date.replace("T", " "),
      t.type === "in" ? "IN" : "ISSUE",
      t.productName,
      `${t.qty} ${t.unit}`,
      t.person || "—",
      t.dept || "—",
      t.note || "—",
    ]);
    doc.autoTable({
      head: [
        [
          "#",
          "Date",
          "Type",
          "Product",
          "Qty",
          "Recipient/Supplier",
          "Dept/Purpose",
          "Note",
        ],
      ],
      body: rows,
      startY,
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2.5 },
      headStyles: {
        fillColor: [99, 102, 241],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      didDrawCell: (data) => {
        if (data.column.index === 2 && data.section === "body") {
          data.cell.styles.textColor =
            data.cell.raw === "IN" ? [16, 185, 129] : [239, 68, 68];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `Generated: ${new Date().toLocaleString()} | Total: ${list.length} entries`,
      14,
      doc.internal.pageSize.getHeight() - 8,
    );
    const suffix = from && to ? `_${from}_${to}` : "";
    doc.save(
      `transactions${suffix}_${new Date().toISOString().slice(0, 10)}.pdf`,
    );
    closeModal("exportModal");
    showToast(`<i class='ph ph-file-pdf'></i> ${list.length}টি Transaction PDF ডাউনলোড হচ্ছে!`, "success");
  } catch (e) {
    showToast("PDF তৈরি করতে পারেনি। ইন্টারনেট সংযোগ চেক করুন।", "error");
    console.error(e);
  }
}

// ===== BACKUP & RESTORE =====
function exportBackupJSON() {
  const backup = {
    version: 1,
    appName: "BKSP Store Management",
    exportedAt: new Date().toISOString(),
    products,
    transactions,
  };
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `bksp_store_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  closeModal("exportModal");
  showToast("<i class='ph ph-floppy-disk'></i> ব্যাকআপ ডাউনলোড হচ্ছে!", "success");
}

function importBackupJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.products || !data.transactions) {
        return showToast("<i class='ph ph-x-circle'></i> অবৈধ ব্যাকআপ ফাইল।", "error");
      }
      if (
        !confirm(
          `এই ব্যাকআপ লোড করলে বর্তমান সব ডেটা মুছে যাবে।\n\nExported: ${data.exportedAt ? new Date(data.exportedAt).toLocaleString() : "Unknown"}\nProducts: ${data.products.length}, Transactions: ${data.transactions.length}\n\nচালু রাখতে OK চাপুন।`,
        )
      ) {
        event.target.value = "";
        return;
      }
      products = data.products;
      transactions = data.transactions;
      // Write backup data to Firebase
      set(ref(db, DB_ROOT), { products, transactions })
        .then(() => {
          renderAll();
          updateCategoryFilter();
          updateLastSaved();
          closeModal("exportModal");
          showToast(
            `<i class='ph ph-check-circle'></i> ব্যাকআপ সফলভাবে লোড হয়েছে! ${products.length}টি পণ্য, ${transactions.length}টি লেনদেন।`,
            "success",
          );
        })
        .catch((err) =>
          showToast("<i class='ph ph-x-circle'></i> Firebase-এ ব্যাকআপ লোড করতে পারেনি।", "error"),
        );
    } catch (err) {
      showToast("<i class='ph ph-x-circle'></i> ফাইল পড়তে পারেনি। সঠিক JSON ফাইল দিন।", "error");
    }
    event.target.value = "";
  };
  reader.readAsText(file);
}

// ===== PWA INSTALL =====
let _pwaPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  _pwaPrompt = e;
  const btn = document.getElementById("pwaInstallBtn");
  if (btn) btn.style.display = "inline-flex";
});

function installPWA() {
  if (!_pwaPrompt) return;
  _pwaPrompt.prompt();
  _pwaPrompt.userChoice.then((result) => {
    if (result.outcome === "accepted") {
      showToast("<i class='ph ph-check-circle'></i> অ্যাপ ইনস্টল হচ্ছে!", "success");
      const btn = document.getElementById("pwaInstallBtn");
      if (btn) btn.style.display = "none";
    }
    _pwaPrompt = null;
  });
}

window.addEventListener("appinstalled", () => {
  showToast("<i class='ph ph-check-circle'></i> অ্যাপ সফলভাবে ইনস্টল হয়েছে!", "success");
  const btn = document.getElementById("pwaInstallBtn");
  if (btn) btn.style.display = "none";
});

// ===== START =====
window.addEventListener("DOMContentLoaded", () => {
  // Register Service Worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => console.log("SW registered:", reg.scope))
      .catch((err) => console.warn("SW registration failed:", err));
  }

  // Session persistence — restore role from sessionStorage
  const savedRole = sessionStorage.getItem("_sx");
  if (savedRole === "admin" || savedRole === "1") {
    currentRole = "admin";
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("appContent").style.display = "block";
    applyRoleUI();
    init();
    return;
  }
  if (savedRole === "viewer") {
    currentRole = "viewer";
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("appContent").style.display = "block";
    applyRoleUI();
    init();
    return;
  }
  // Fresh visit — show login screen
});

// ===== EXPOSE FUNCTIONS TO GLOBAL SCOPE (required for ES module) =====
Object.assign(window, {
  doLogin,
  enterAsViewer,
  showAdminLoginForm,
  logoutToViewer,
  init,
  openModal,
  closeModal,
  closeModalOutside,
  switchTab,
  filterStock,
  filterTransactions,
  updateIssueStock,
  submitIssue,
  submitReceive,
  txnConfirmOK,
  quickReceive,
  quickIssue,
  deleteProduct,
  confirmPartialDelete,
  addProduct,
  exportStockCSV,
  exportStockPDF,
  exportTransCSV,
  exportTransPDF,
  printStock,
  printTransactions,
  resetAllData,
  editProduct,
  saveEditProduct,
  fullDeleteProduct,
  confirmFullDelete,
  openLedger,
  generateReport,
  exportBackupJSON,
  importBackupJSON,
  installPWA,
  filterActivityLog,
  downloadCSVTemplate,
  importCSVFile,
  confirmCSVImport,
  showToast,
  formatDate,
  formatDateTime,
  updateLowStockBanner,
  updateLastSaved
});


