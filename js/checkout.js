/* Foodly — checkout: delivery form, payment, order creation */
(() => {
  const { R } = Validation;
  const u = App.requireAuth();
  if (!u) return;

  const items = DB.cart.detailed();
  if (!items.length) { location.replace('cart.html'); return; }

  const code = DB.promo.get();
  const t = DB.totals(items, code);

  document.getElementById('summary').innerHTML = `
    <h2>Your order</h2>
    ${items.map((i) => `<div class="mini-line"><span>${i.qty} × ${App.esc(i.name)}</span><span>${App.fmt(i.price * i.qty)}</span></div>`).join('')}
    <div style="margin-top:10px">
      <div class="sum-row"><span>Subtotal</span><span>${App.fmt(t.subtotal)}</span></div>
      <div class="sum-row"><span>Delivery</span><span class="${t.delivery ? '' : 'green'}">${t.delivery ? App.fmt(t.delivery) : 'Free'}</span></div>
      ${t.discount ? `<div class="sum-row"><span>Promo ${App.esc(code)}</span><span class="green">−${App.fmt(t.discount)}</span></div>` : ''}
      <div class="sum-row total"><span>Total</span><span>${App.fmt(t.total)}</span></div>
    </div>
    <a class="btn btn-ghost btn-block" href="cart.html">← Edit cart</a>`;

  const form = document.getElementById('checkout-form');
  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  form.elements.name.value = `${u.firstName} ${u.lastName}`;
  form.elements.phone.value = u.phone || '';
  form.elements.date.value = today;
  form.elements.date.min = today;

  const slots = ['ASAP'];
  for (let h = 10; h <= 22; h++) { slots.push(`${pad(h)}:00`); if (h < 22) slots.push(`${pad(h)}:30`); }
  form.elements.time.innerHTML = slots.map((s) => `<option value="${s}">${s === 'ASAP' ? 'As soon as possible (30–45 min)' : s}</option>`).join('');

  // payment switch
  const cardBox = document.getElementById('card-fields');
  const isCard = (all) => all.payment === 'card';
  form.querySelectorAll('input[name="payment"]').forEach((r) =>
    r.addEventListener('change', () => { cardBox.hidden = form.elements.payment.value !== 'card'; }));

  // input formatting for card fields
  form.elements.cardNumber.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
  });
  form.elements.cardExpiry.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
    e.target.value = v;
  });
  form.elements.cardCvv.addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3); });

  const slotInPast = (all) => {
    if (all.date !== today || all.time === 'ASAP') return '';
    const [h, m] = all.time.split(':').map(Number);
    const slot = new Date(); slot.setHours(h, m, 0, 0);
    return slot.getTime() < Date.now() + 20 * 60000 ? 'Please choose a time at least 20 minutes from now' : '';
  };

  Validation.attach(form, {
    name: [R.required('Please enter your name'), R.minLength(2, 'Name is too short'), R.name()],
    phone: [R.required('Phone number is required'), R.phone()],
    address: [R.required('Delivery address is required'), R.minLength(8, 'Please enter a full address (street, building)')],
    date: [R.required('Choose a delivery date'), R.dateNotPast('Delivery date cannot be in the past')],
    time: [R.custom((v, all) => (!v ? 'Choose a delivery time' : all.date !== today && v === 'ASAP' ? 'Pick an exact time for a future date' : slotInPast(all)))],
    cardNumber: [R.when(isCard, R.cardNumber())],
    cardExpiry: [R.when(isCard, R.cardExpiry())],
    cardCvv: [R.when(isCard, R.cvv())],
    comment: [R.maxLength(300, 'Comment is too long (max 300 characters)')],
  }, (v) => {
    const fresh = DB.cart.detailed();
    if (!fresh.length) { location.href = 'cart.html'; return; }
    const tt = DB.totals(fresh, DB.promo.get());
    const order = DB.orders.add({
      userId: u.id,
      userName: `${u.firstName} ${u.lastName}`,
      items: fresh.map((i) => ({ dishId: i.dishId, name: i.name, price: i.price, qty: i.qty, image: i.image })),
      subtotal: tt.subtotal, delivery: tt.delivery, discount: tt.discount, total: tt.total,
      address: v.address.trim(), phone: v.phone.trim(),
      deliveryDate: v.date, deliveryTime: v.time,
      payment: v.payment === 'card' ? 'card •••• ' + v.cardNumber.replace(/\s/g, '').slice(-4) : 'cash',
      comment: v.comment.trim(),
    });
    DB.cart.clear();
    DB.promo.clear();
    location.href = 'success.html?id=' + order.id;
  });
})();
