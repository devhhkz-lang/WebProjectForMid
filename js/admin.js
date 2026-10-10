/* Foodly — admin panel: dashboard, users, dishes (CRUD), orders */
(() => {
  const { R } = Validation;
  const me = App.requireAdmin();
  if (!me) return;
  const E = App.esc;
  const TABS = ['dashboard', 'users', 'dishes', 'orders', 'settings'];

  /* ---------- tabs ---------- */
  const show = () => {
    const tab = TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard';
    TABS.forEach((t) => document.getElementById('tab-' + t).classList.toggle('active', t === tab));
    document.querySelectorAll('[data-tab]').forEach((a) => {
      a.classList.toggle('active', a.dataset.tab === tab);
      if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    render[tab]();
  };
  window.addEventListener('hashchange', show);
  document.getElementById('admin-logout').addEventListener('click', () => { DB.session.clear(); location.href = 'index.html'; });

  const table = (id, head, rows, empty) => {
    document.getElementById(id).innerHTML = rows.length
      ? `<thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody>`
      : `<tbody><tr><td class="no-label" style="text-align:center;color:var(--muted);padding:32px">${empty}</td></tr></tbody>`;
  };
  const td = (label, html, cls = '') => `<td data-label="${label}" class="${cls}">${html}</td>`;

  const orderRow = (o, withStatus) => `<tr>
    ${td('Order', `<b>#${o.id}</b>`)}
    ${td('Customer', E(o.userName))}
    ${td('Items', o.items.reduce((s, i) => s + i.qty, 0))}
    ${td('Total', App.fmt(o.total))}
    ${td('Date', App.fmtDate(o.createdAt))}
    ${td('Status', withStatus
      ? `<select data-status="${o.id}" aria-label="Status of order ${o.id}">${DB.STATUSES.map((s) => `<option${s === o.status ? ' selected' : ''}>${s}</option>`).join('')}</select>`
      : App.statusBadge(o.status))}
    ${withStatus ? td('', `<button class="btn btn-secondary btn-sm" data-view="${o.id}">Details</button>`, 'no-label') : ''}
  </tr>`;

  /* ---------- dashboard ---------- */
  const renderDashboard = () => {
    const users = DB.users.all(), orders = DB.orders.all(), dishes = DB.dishes.all();
    const revenue = orders.filter((o) => o.status !== 'Cancelled').reduce((s, o) => s + o.total, 0);
    document.getElementById('stats').innerHTML = [
      ['Users', users.length], ['Orders', orders.length], ['Dishes', dishes.length], ['Revenue', App.fmt(revenue)],
    ].map(([l, n]) => `<div class="stat"><div class="n">${n}</div><div class="l">${l}</div></div>`).join('');

    const max = Math.max(1, ...DB.STATUSES.map((s) => orders.filter((o) => o.status === s).length));
    document.getElementById('status-bars').innerHTML = DB.STATUSES.map((s) => {
      const n = orders.filter((o) => o.status === s).length;
      return `<div class="bar-row"><span>${s}</span><div class="bar"><span style="width:${(n / max) * 100}%"></span></div><b>${n}</b></div>`;
    }).join('');

    const sold = {};
    orders.filter((o) => o.status !== 'Cancelled').forEach((o) => o.items.forEach((i) => { sold[i.name] = (sold[i.name] || 0) + i.qty; }));
    const top = Object.entries(sold).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topMax = Math.max(1, ...top.map((t) => t[1]));
    document.getElementById('top-dishes').innerHTML = top.length
      ? top.map(([n, q]) => `<div class="bar-row" style="grid-template-columns:130px 1fr 30px"><span>${E(n)}</span><div class="bar"><span style="width:${(q / topMax) * 100}%"></span></div><b>${q}</b></div>`).join('')
      : '<p class="muted">No sales yet.</p>';

    table('latest-orders', ['Order', 'Customer', 'Items', 'Total', 'Date', 'Status'], orders.slice(0, 5).map((o) => orderRow(o, false)), 'No orders yet');
  };

  /* ---------- users ---------- */
  const renderUsers = () => {
    const q = document.getElementById('user-search').value.trim().toLowerCase();
    const rows = DB.users.all()
      .filter((u) => !q || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q))
      .map((u) => `<tr>
        ${td('User', `<div class="cell-user">${App.avatar(u, 'avatar-sm')}<div><b>${E(u.firstName)} ${E(u.lastName)}</b><br><span class="muted small">${E(u.email)}</span></div></div>`)}
        ${td('Phone', E(u.phone || '—'))}
        ${td('Role', `<span class="badge badge-${u.role}">${u.role}</span>`)}
        ${td('Orders', DB.orders.byUser(u.id).length)}
        ${td('Joined', App.fmtDay(u.createdAt))}
        ${td('', u.id === me.id ? '<span class="muted small">You</span>' : `<button class="btn btn-danger btn-sm" data-del-user="${u.id}">Delete</button>`, 'no-label')}
      </tr>`);
    table('users-table', ['User', 'Phone', 'Role', 'Orders', 'Joined', ''], rows, 'No users found');
  };
  document.getElementById('user-search').addEventListener('input', renderUsers);
  document.getElementById('users-table').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-del-user]');
    if (b && (await App.confirm('The user account will be deleted. Their past orders stay in the system.'))) {
      DB.users.remove(b.dataset.delUser);
      App.toast('User deleted');
      renderUsers();
    }
  });

  /* ---------- dishes CRUD ---------- */
  const renderDishes = () => {
    const q = document.getElementById('dish-search').value.trim().toLowerCase();
    const rows = DB.dishes.all()
      .filter((d) => !q || `${d.name} ${d.category}`.toLowerCase().includes(q))
      .map((d) => `<tr>
        ${td('Photo', `<img class="thumb" src="${E(d.image)}" alt="">`)}
        ${td('Name', `<b>${E(d.name)}</b>`)}
        ${td('Category', E(d.category))}
        ${td('Price', App.fmt(d.price))}
        ${td('Rating', `<span class="stars">★</span> ${Number(d.rating).toFixed(1)}`)}
        ${td('', `<div class="actions"><button class="btn btn-secondary btn-sm" data-edit="${d.id}">Edit</button><button class="btn btn-danger btn-sm" data-del="${d.id}">Delete</button></div>`, 'no-label')}
      </tr>`);
    table('dishes-table', ['Photo', 'Name', 'Category', 'Price', 'Rating', ''], rows, 'No dishes found');
  };
  document.getElementById('dish-search').addEventListener('input', renderDishes);

  const dialog = document.getElementById('dish-dialog');
  const form = document.getElementById('dish-form');
  let editingId = null;
  let newImage = null;

  const validator = Validation.attach(form, {
    name: [R.required('Dish name is required'), R.minLength(2, 'Name is too short'), R.maxLength(60, 'Name is too long (max 60)')],
    category: [R.required('Category is required'), R.minLength(3, 'Category is too short')],
    price: [R.required('Price is required'), R.numberBetween(1, 1000000, 'Price must be a positive number')],
    rating: [R.required('Rating is required'), R.numberBetween(0, 5, 'Rating must be between 0 and 5')],
    time: [R.required('Cooking time is required'), R.integerBetween(1, 180, 'Time must be 1–180 minutes')],
    description: [R.required('Description is required'), R.minLength(10, 'Description must be at least 10 characters')],
    ingredients: [R.required('Add at least one ingredient')],
  }, (v) => {
    const data = {
      name: v.name.trim(), category: v.category.trim(), price: Math.round(Number(v.price)),
      rating: Math.round(Number(v.rating) * 10) / 10, time: Number(v.time),
      description: v.description.trim(), ingredients: v.ingredients.split(',').map((s) => s.trim()).filter(Boolean),
    };
    if (editingId) {
      if (newImage) data.image = newImage;
      DB.dishes.update(editingId, data);
      App.toast('Dish updated');
    } else {
      data.image = newImage || 'images/dishes/default.svg';
      DB.dishes.add(data);
      App.toast('Dish added');
    }
    dialog.close();
    renderDishes();
  });

  form.elements.image.addEventListener('change', async () => {
    const file = form.elements.image.files[0];
    const err = App.imageFileError(file);
    newImage = null;
    if (err) { Validation.setError(form.elements.image, err); form.elements.image.value = ''; return; }
    Validation.clearError(form.elements.image);
    if (file) newImage = await App.readImage(file, 600);
  });

  const openDish = (dish) => {
    editingId = dish ? dish.id : null;
    newImage = null;
    validator.reset();
    form.reset();
    document.getElementById('dish-title').textContent = dish ? 'Edit dish' : 'Add dish';
    document.getElementById('cat-list').innerHTML = DB.dishes.categories().map((c) => `<option value="${E(c)}">`).join('');
    if (dish) {
      Object.entries({ name: dish.name, category: dish.category, price: dish.price, rating: dish.rating, time: dish.time,
        description: dish.description, ingredients: dish.ingredients.join(', ') })
        .forEach(([k, val]) => { form.elements[k].value = val; });
    }
    dialog.showModal();
  };
  document.getElementById('add-dish').addEventListener('click', () => openDish(null));
  document.getElementById('dish-cancel').addEventListener('click', () => dialog.close());
  document.getElementById('dishes-table').addEventListener('click', async (e) => {
    const ed = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-del]');
    if (ed) openDish(DB.dishes.get(ed.dataset.edit));
    if (del) {
      const d = DB.dishes.get(del.dataset.del);
      if (await App.confirm(`"${d.name}" will be removed from the menu.`)) {
        DB.dishes.remove(d.id);
        App.toast('Dish deleted');
        renderDishes();
      }
    }
  });

  /* ---------- orders ---------- */
  const statusFilter = document.getElementById('order-status');
  statusFilter.innerHTML = '<option value="">All statuses</option>' + DB.STATUSES.map((s) => `<option>${s}</option>`).join('');
  const renderOrders = () => {
    const q = document.getElementById('order-search').value.trim().toLowerCase().replace('#', '');
    const st = statusFilter.value;
    const rows = DB.orders.all()
      .filter((o) => (!st || o.status === st) && (!q || String(o.id).includes(q) || o.userName.toLowerCase().includes(q)))
      .map((o) => orderRow(o, true));
    table('orders-table', ['Order', 'Customer', 'Items', 'Total', 'Date', 'Status', ''], rows, 'No orders found');
  };
  document.getElementById('order-search').addEventListener('input', renderOrders);
  statusFilter.addEventListener('change', renderOrders);

  const ordersTable = document.getElementById('orders-table');
  ordersTable.addEventListener('change', (e) => {
    if (!e.target.dataset.status) return;
    DB.orders.setStatus(e.target.dataset.status, e.target.value);
    App.toast(`Order #${e.target.dataset.status} → ${e.target.value}`);
  });
  const od = document.getElementById('order-dialog');
  ordersTable.addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (!b) return;
    const o = DB.orders.get(b.dataset.view);
    document.getElementById('order-detail').innerHTML = `
      <h3 id="order-title">Order #${o.id} ${App.statusBadge(o.status)}</h3>
      <p class="muted small">${E(o.userName)} · ${E(o.phone)} · ${App.fmtDate(o.createdAt)}</p>
      ${o.items.map((i) => `<div class="mini-line"><span>${i.qty} × ${E(i.name)}</span><span>${App.fmt(i.price * i.qty)}</span></div>`).join('')}
      <div class="sum-row"><span>Delivery</span><span>${o.delivery ? App.fmt(o.delivery) : 'Free'}</span></div>
      ${o.discount ? `<div class="sum-row"><span>Discount</span><span>−${App.fmt(o.discount)}</span></div>` : ''}
      <div class="sum-row total"><span>Total</span><span>${App.fmt(o.total)}</span></div>
      <p class="small" style="margin-top:12px">📍 ${E(o.address)}<br>🕒 ${App.fmtDay(o.deliveryDate)}, ${E(o.deliveryTime)}<br>💳 ${E(o.payment)}${o.comment ? `<br>💬 ${E(o.comment)}` : ''}</p>`;
    od.showModal();
  });
  document.getElementById('order-close').addEventListener('click', () => od.close());

  /* ---------- settings ---------- */
  document.getElementById('set-fee').textContent = App.fmt(DB.DELIVERY_FEE);
  document.getElementById('set-free').textContent = App.fmt(DB.FREE_DELIVERY_FROM);
  document.getElementById('reset-data').addEventListener('click', async () => {
    if (await App.confirm('All dishes, users and orders will be reset to the demo data.', 'Reset')) {
      DB.reset();
      location.href = 'login.html';
    }
  });

  const render = { dashboard: renderDashboard, users: renderUsers, dishes: renderDishes, orders: renderOrders, settings: () => {} };
  show();
})();
