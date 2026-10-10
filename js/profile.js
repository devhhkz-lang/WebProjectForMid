/* Foodly — user profile: info, edit dialog, order history */
(() => {
  const { R } = Validation;
  let u = App.requireAuth();
  if (!u) return;

  const card = document.getElementById('profile-card');
  const list = document.getElementById('orders-list');
  const dialog = document.getElementById('edit-dialog');
  const form = document.getElementById('edit-form');
  let newPhoto = null;

  const renderCard = () => {
    u = DB.users.byId(u.id);
    card.innerHTML = `
      <div class="profile-head">
        ${App.avatar(u, 'avatar-lg')}
        <div class="info">
          <h1>${App.esc(u.firstName)} ${App.esc(u.lastName)}</h1>
          <span class="badge badge-${u.role}">${u.role === 'admin' ? 'Administrator' : 'Customer'}</span>
          <dl class="info-list">
            <div><dt>Email</dt><dd>${App.esc(u.email)}</dd></div>
            <div><dt>Phone</dt><dd>${App.esc(u.phone || '—')}</dd></div>
            <div><dt>Date of birth</dt><dd>${u.dob ? App.fmtDay(u.dob) : '—'}</dd></div>
            <div><dt>Member since</dt><dd>${App.fmtDay(u.createdAt)}</dd></div>
          </dl>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary" type="button" id="edit-btn">Edit profile</button>
          <button class="btn btn-ghost" type="button" id="logout">Logout</button>
        </div>
      </div>`;
    document.getElementById('edit-btn').addEventListener('click', openEdit);
    document.getElementById('logout').addEventListener('click', () => { DB.session.clear(); location.href = 'index.html'; });
  };

  const renderOrders = () => {
    const orders = DB.orders.byUser(u.id);
    if (!orders.length) {
      list.innerHTML = `<div class="empty"><div class="big">🧾</div><h3>No orders yet</h3><p>Your orders will appear here.</p><a class="btn btn-primary" href="menu.html">Order something</a></div>`;
      return;
    }
    list.innerHTML = orders.map((o) => `
      <details class="order" ${App.params().get('id') == o.id ? 'open' : ''}>
        <summary>
          <b>#${o.id}</b>
          <span>${o.items.reduce((s, i) => s + i.qty, 0)} items · ${App.esc(o.items[0].name)}${o.items.length > 1 ? ` +${o.items.length - 1} more` : ''}</span>
          <span class="muted small">${App.fmtDay(o.createdAt)}</span>
          ${App.statusBadge(o.status)}
        </summary>
        <div class="order-body">
          ${o.items.map((i) => `<div class="mini-line"><span>${i.qty} × ${App.esc(i.name)}</span><span>${App.fmt(i.price * i.qty)}</span></div>`).join('')}
          <div class="sum-row"><span>Delivery</span><span>${o.delivery ? App.fmt(o.delivery) : 'Free'}</span></div>
          ${o.discount ? `<div class="sum-row"><span>Discount</span><span class="green">−${App.fmt(o.discount)}</span></div>` : ''}
          <div class="sum-row total"><span>Total</span><span>${App.fmt(o.total)}</span></div>
          <p class="small muted" style="margin:10px 0 0">📍 ${App.esc(o.address)} · 🕒 ${App.fmtDay(o.deliveryDate)}, ${o.deliveryTime === 'ASAP' ? 'ASAP' : App.esc(o.deliveryTime)} · 💳 ${App.esc(o.payment)}
            ${o.comment ? `<br>💬 ${App.esc(o.comment)}` : ''}</p>
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
            <button class="btn btn-secondary btn-sm" type="button" data-repeat="${o.id}">Order again</button>
            ${o.status === 'Pending' ? `<button class="btn btn-danger btn-sm" type="button" data-cancel="${o.id}">Cancel order</button>` : ''}
          </div>
        </div>
      </details>`).join('');
  };

  list.addEventListener('click', async (e) => {
    const rep = e.target.closest('[data-repeat]');
    const can = e.target.closest('[data-cancel]');
    if (rep) {
      const o = DB.orders.get(rep.dataset.repeat);
      o.items.forEach((i) => { if (DB.dishes.get(i.dishId)) DB.cart.add(i.dishId, i.qty); });
      location.href = 'cart.html';
    }
    if (can && (await App.confirm('This order will be cancelled.', 'Cancel order'))) {
      DB.orders.setStatus(can.dataset.cancel, 'Cancelled');
      App.toast('Order cancelled');
      renderOrders();
    }
  });

  /* ----- edit dialog ----- */
  const validator = Validation.attach(form, {
    firstName: [R.required('First name is required'), R.minLength(2, 'First name is too short'), R.name()],
    lastName: [R.required('Last name is required'), R.minLength(2, 'Last name is too short'), R.name()],
    phone: [R.optional(R.phone())],
    dob: [R.birthDate()],
    password: [R.optional(R.minLength(8, 'Password must be at least 8 characters')), R.optional(R.password())],
    confirm: [R.custom((v, all) => (all.password && v !== all.password ? 'Passwords do not match' : ''))],
  }, (v) => {
    const patch = { firstName: v.firstName.trim(), lastName: v.lastName.trim(), phone: v.phone.trim(), dob: v.dob };
    if (newPhoto) patch.photo = newPhoto;
    if (v.password) patch.password = v.password;
    DB.users.update(u.id, patch);
    dialog.close();
    App.toast('Profile updated');
    location.reload();
  });

  form.elements.photo.addEventListener('change', async () => {
    const file = form.elements.photo.files[0];
    const err = App.imageFileError(file);
    newPhoto = null;
    if (err) { Validation.setError(form.elements.photo, err); form.elements.photo.value = ''; return; }
    Validation.clearError(form.elements.photo);
    if (file) newPhoto = await App.readImage(file, 200);
  });

  function openEdit() {
    validator.reset();
    newPhoto = null;
    form.reset();
    form.elements.firstName.value = u.firstName;
    form.elements.lastName.value = u.lastName;
    form.elements.phone.value = u.phone || '';
    form.elements.dob.value = u.dob || '';
    dialog.showModal();
  }
  document.getElementById('edit-cancel').addEventListener('click', () => dialog.close());

  renderCard();
  renderOrders();
})();
