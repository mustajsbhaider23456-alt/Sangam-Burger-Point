const loginPanel = document.getElementById("loginPanel");
const dashboard = document.getElementById("dashboard");
const logoutBtn = document.getElementById("logoutBtn");
const loginMessage = document.getElementById("loginMessage");
const dashboardMessage = document.getElementById("dashboardMessage");
const ordersList = document.getElementById("ordersList");
const statuses = ["New", "Preparing", "Out for Delivery", "Delivered", "Cancelled"];
const escapeHtml = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = n => Number(n).toLocaleString("en-PK");
function setLoggedIn(value) {
  loginPanel.hidden = value; dashboard.hidden = !value; logoutBtn.hidden = !value;
}
async function checkLogin() {
  try { const r = await fetch("/api/admin/me"); const d = await r.json(); setLoggedIn(d.isAdmin); if (d.isAdmin) loadOrders(); }
  catch { setLoggedIn(false); }
}
document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault(); loginMessage.textContent = "Logging in…";
  try {
    const r = await fetch("/api/admin/login", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:document.getElementById("password").value})});
    const d = await r.json(); if (!r.ok) throw new Error(d.error || "Login failed");
    document.getElementById("password").value = ""; loginMessage.textContent = ""; setLoggedIn(true); loadOrders();
  } catch(err) { loginMessage.textContent = err.message; loginMessage.className = "message error"; }
});
async function loadOrders() {
  dashboardMessage.textContent = "Loading orders…";
  try {
    const r = await fetch("/api/admin/orders");
    const d = await r.json(); if (!r.ok) throw new Error(d.error || "Could not load orders");
    dashboardMessage.textContent = `${d.length} order(s)`;
    if (!d.length) { ordersList.innerHTML = '<div class="panel">ابھی کوئی آرڈر موجود نہیں۔</div>'; return; }
    ordersList.innerHTML = d.map(o => `
      <article class="order-card">
        <div class="order-meta"><h3>${escapeHtml(o.id)}</h3><span class="status-label">${escapeHtml(o.status)}</span></div>
        <p class="muted">${escapeHtml(new Date(o.createdAt).toLocaleString())}</p>
        <p><strong>Customer:</strong> ${escapeHtml(o.name)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(o.phone)}</p>
        <p><strong>Address:</strong> ${escapeHtml(o.address)}</p>
        <p><strong>Items:</strong> ${o.items.map(i => `${escapeHtml(i.name)} × ${i.qty} (Rs. ${money(i.subtotal)})`).join(", ")}</p>
        <p><strong>Total:</strong> <span class="price">Rs. ${money(o.total)}</span></p>
        <p><strong>Notes:</strong> ${escapeHtml(o.notes || "None")}</p>
        <label for="status-${escapeHtml(o.id)}">Update order status</label>
        <select class="status-select" id="status-${escapeHtml(o.id)}" data-status="${escapeHtml(o.id)}">
          ${statuses.map(s => `<option value="${s}" ${s===o.status?"selected":""}>${s}</option>`).join("")}
        </select>
        <p class="message" id="msg-${escapeHtml(o.id)}"></p>
      </article>`).join("");
  } catch(err) {
    dashboardMessage.textContent = err.message; dashboardMessage.className = "message error";
    if (err.message.includes("لاگ")) setLoggedIn(false);
  }
}
ordersList.addEventListener("change", async e => {
  const select = e.target.closest("[data-status]"); if (!select) return;
  const id = select.dataset.status; const msg = document.getElementById("msg-" + id);
  try {
    const r = await fetch("/api/admin/orders/" + encodeURIComponent(id), {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:select.value})});
    const d = await r.json(); if (!r.ok) throw new Error(d.error || "Update failed");
    msg.textContent = "Status updated."; msg.className = "message success";
    setTimeout(loadOrders, 500);
  } catch(err) { msg.textContent = err.message; msg.className = "message error"; }
});
document.getElementById("refreshBtn").addEventListener("click", loadOrders);
logoutBtn.addEventListener("click", async () => {
  await fetch("/api/admin/logout", {method:"POST"}); setLoggedIn(false);
});
checkLogin();
