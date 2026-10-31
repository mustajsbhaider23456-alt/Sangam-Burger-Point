const fallbackImages = {
  zinger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=80",
  chicken: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=700&q=80",
  chshawarma: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=700&q=80",
  zshawarma: "https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&w=700&q=80",
  "fries-small": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=700&q=80",
  "fries-large": "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=700&q=80",
  drink: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=700&q=80"
};
let products = [];
let cart = {};

const money = n => Number(n).toLocaleString("en-PK");
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

async function initMenu() {
  const grid = document.getElementById("menuGrid");
  try {
    const res = await fetch("/api/menu");
    if (!res.ok) throw new Error("Menu load failed");
    products = await res.json();
    grid.innerHTML = products.map(p => `
      <article class="food-card">
        <img class="food-image" src="${fallbackImages[p.id] || ""}" alt="${escapeHtml(p.name)}" loading="lazy">
        <div class="food-info"><h3>${escapeHtml(p.name)}</h3>
        <p>Freshly prepared, full of flavour.</p>
        <div class="food-bottom"><span class="price">Rs. ${money(p.price)}</span>
        <button class="btn" type="button" data-add="${p.id}">+ Add</button></div></div>
      </article>`).join("");
  } catch {
    grid.textContent = "Menu load نہیں ہو سکا۔ صفحہ دوبارہ کھولیں۔";
  }
}
document.getElementById("menuGrid").addEventListener("click", e => {
  const button = e.target.closest("[data-add]");
  if (!button) return;
  const id = button.dataset.add;
  cart[id] = (cart[id] || 0) + 1;
  renderCart();
});
function renderCart() {
  const box = document.getElementById("cartItems");
  const items = products.filter(p => cart[p.id] > 0);
  if (!items.length) box.innerHTML = "Your cart is empty.";
  else box.innerHTML = items.map(p => `
    <div class="cart-row">
      <div>${escapeHtml(p.name)}<small>Rs. ${money(p.price)} each</small></div>
      <div class="qty-controls">
        <button type="button" aria-label="Decrease ${escapeHtml(p.name)}" data-change="-1" data-id="${p.id}">−</button>
        <span>${cart[p.id]}</span>
        <button type="button" aria-label="Increase ${escapeHtml(p.name)}" data-change="1" data-id="${p.id}">+</button>
      </div>
      <button type="button" class="remove" data-remove="${p.id}">Remove</button>
    </div>`).join("");
  document.getElementById("cartTotal").textContent = money(items.reduce((s,p) => s + p.price * cart[p.id], 0));
}
document.getElementById("cartItems").addEventListener("click", e => {
  const change = e.target.closest("[data-change]");
  const remove = e.target.closest("[data-remove]");
  if (change) {
    const id = change.dataset.id;
    cart[id] = (cart[id] || 0) + Number(change.dataset.change);
    if (cart[id] <= 0) delete cart[id];
  } else if (remove) delete cart[remove.dataset.remove];
  else return;
  renderCart();
});
document.getElementById("checkoutForm").addEventListener("submit", async e => {
  e.preventDefault();
  const message = document.getElementById("message");
  message.className = "message";
  const items = products.filter(p => cart[p.id] > 0).map(p => ({id:p.id, qty:cart[p.id]}));
  if (!items.length) { message.textContent = "پہلے کارٹ میں آئٹمز شامل کریں۔"; return; }
  const payload = {
    name: document.getElementById("customerName").value.trim(),
    phone: document.getElementById("customerPhone").value.trim(),
    address: document.getElementById("customerAddress").value.trim(),
    notes: document.getElementById("customerNotes").value.trim(),
    items
  };
  const button = e.target.querySelector("button[type=submit]");
  button.disabled = true; button.textContent = "Please wait…";
  try {
    const res = await fetch("/api/orders", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "آرڈر محفوظ نہیں ہو سکا۔");
    const order = data.order;
    const lines = [
      "🍔 *Sangam Burger Point — New Order*",
      `Order ID: ${order.id}`,
      `Name: ${order.name}`,
      `Phone: ${order.phone}`,
      `Address: ${order.address}`,
      "",
      "*Items:*",
      ...order.items.map(i => `• ${i.name} x ${i.qty} = Rs. ${i.subtotal}`),
      "",
      `*Total: Rs. ${order.total}*`,
      `Notes: ${order.notes || "None"}`
    ];
    const number = String(data.whatsappNumber || "").replace(/\D/g, "");
    message.textContent = "آرڈر سرور پر محفوظ ہوگیا۔ WhatsApp کھلے گا؛ آرڈر مکمل بھیجنے کے لیے وہاں Send دبائیں۔";
    if (!number || number.length < 10) {
      message.textContent += " دکان کا WhatsApp نمبر .env فائل میں درست درج نہیں کیا گیا؛ مالک سے رابطہ کریں۔";
      return;
    }
    const url = `https://wa.me/${number}?text=${encodeURIComponent(lines.join("\n"))}`;
    window.location.href = url;
    cart = {};
    renderCart();
    e.target.reset();
  } catch (err) {
    message.textContent = err.message || "نیٹ ورک کی خرابی۔ دوبارہ کوشش کریں۔";
    message.className = "message error";
  } finally {
    button.disabled = false; button.textContent = "Place Order on WhatsApp";
  }
});
initMenu();
