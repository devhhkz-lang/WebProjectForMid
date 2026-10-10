/* Foodly — shared UI: header, footer, toasts, helpers. Loaded on every page. */
const App = (() => {
  const page = document.body.dataset.page || '';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Math.round(n).toLocaleString('en-US').replace(/,/g, ' ') + ' ₸';
  const stars = (r) => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));
  const pad = (n) => String(n).padStart(2, '0');
  const fmtDate = (iso) => {
    const d = new Date(iso);
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const fmtDay = (iso) => {
    const d = new Date(iso);
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  };
  const params = () => new URLSearchParams(location.search);
  const user = () => {
    const id = DB.session.get();
    return id ? DB.users.byId(id) : null;
  };
  const initials = (u) => ((u.firstName[0] || '') + (u.lastName[0] || '')).toUpperCase();
  const avatar = (u, cls = '') =>
    u.photo
      ? `<span class="avatar ${cls}"><img src="${esc(u.photo)}" alt=""></span>`
      : `<span class="avatar ${cls}" aria-hidden="true">${esc(initials(u))}</span>`;
  const statusBadge = (s) => `<span class="badge badge-${esc(s.toLowerCase())}">${esc(s)}</span>`;

  /* ---------- guards ---------- */
  const currentFile = () => (location.pathname.split('/').pop() || 'index.html') + location.search;
  const requireAuth = () => {
    const u = user();
    if (!u) location.replace('login.html?next=' + encodeURIComponent(currentFile()));
    return u;
  };
  const requireAdmin = () => {
    const u = requireAuth();
    if (u && u.role !== 'admin') {
      location.replace('index.html');
      return null;
    }
    return u;
  };

  /* ---------- toast ---------- */
  const toast = (message, type = 'success') => {
    let box = document.getElementById('toasts');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toasts';
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.textContent = message;
    box.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
  };

  const confirmDialog = (message, okLabel = 'Delete') =>
    new Promise((resolve) => {
      const d = document.createElement('dialog');
      d.className = 'dialog dialog-sm';
      d.innerHTML = `<form method="dialog"><h3>Are you sure?</h3><p class="muted">${esc(message)}</p>
        <div class="dialog-actions"><button class="btn btn-secondary" value="no">Cancel</button>
        <button class="btn btn-danger" value="yes">${esc(okLabel)}</button></div></form>`;
      document.body.appendChild(d);
      d.addEventListener('close', () => { resolve(d.returnValue === 'yes'); d.remove(); });
      d.showModal();
    });

  /* ---------- images ---------- */
  const readImage = (file, size = 400) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('read'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('image'));
        img.onload = () => {
          const k = Math.min(1, size / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * k);
          c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  const imageFileError = (file) => {
    if (!file || !file.size) return '';
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return 'Please choose a PNG, JPG, WEBP or GIF image';
    if (file.size > 3 * 1024 * 1024) return 'The image must be smaller than 3 MB';
    return '';
  };

  /* ---------- cards ---------- */
  const dishCard = (d) => `
    <article class="card dish-card">
      <a class="card-img" href="dish.html?id=${d.id}" tabindex="-1" aria-hidden="true"><img src="${esc(d.image)}" alt="" loading="lazy"></a>
      <div class="card-body">
        <span class="tag">${esc(d.category)}</span>
        <h3 class="card-title"><a href="dish.html?id=${d.id}">${esc(d.name)}</a></h3>
        <div class="meta"><span class="stars" aria-label="Rating ${d.rating}">${stars(d.rating)}</span><span>${Number(d.rating).toFixed(1)}</span><span class="dot">•</span><span>${d.time} min</span></div>
        <p class="card-desc">${esc(d.description)}</p>
        <div class="price-row"><strong class="price">${fmt(d.price)}</strong></div>
        <div class="card-actions">
          <a class="btn btn-secondary btn-sm" href="dish.html?id=${d.id}">View details</a>
          <button class="btn btn-primary btn-sm" type="button" data-add="${d.id}">Add to cart</button>
        </div>
      </div>
    </article>`;

  /* ---------- header / footer ---------- */
  const renderHeader = () => {
    const u = user();
    const activeKey = { dish: 'menu', cart: 'cart', checkout: 'cart', success: 'cart' }[page] || page;
    const link = (href, label, key) =>
      `<a href="${href}" class="nav-link${activeKey === key ? ' active' : ''}"${activeKey === key ? ' aria-current="page"' : ''}>${label}</a>`;
    const links = [
      link('index.html', 'Home', 'home'),
      link('menu.html', 'Menu', 'menu'),
      link('about.html', 'About', 'about'),
      u ? link('profile.html', 'Profile', 'profile') : '',
      u && u.role === 'admin' ? link('admin.html', 'Admin', 'admin') : '',
    ].join('');
    const auth = u
      ? `<a class="user-chip" href="profile.html" title="My profile">${avatar(u, 'avatar-sm')}<span>Hi, ${esc(u.firstName)}</span></a>
         <button class="btn btn-secondary btn-sm" type="button" id="logout-btn">Logout</button>`
      : `<a class="btn btn-secondary btn-sm" href="login.html">Log in</a>
         <a class="btn btn-primary btn-sm" href="register.html">Sign up</a>`;
    document.getElementById('site-header').innerHTML = `
      <header class="site-header">
        <div class="container nav">
          <a class="brand" href="index.html" aria-label="Foodly — home"><img src="images/logo.svg" alt="" width="36" height="36"><span>Foodly</span></a>
          <nav class="nav-menu" id="nav-menu" aria-label="Main">
            <div class="nav-links">${links}</div>
            <div class="nav-auth">${auth}</div>
          </nav>
          <div class="nav-tools">
            <a class="cart-btn${activeKey === 'cart' ? ' active' : ''}" href="cart.html" aria-label="Cart">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6L5 3H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></svg>
              <span class="cart-count" id="cart-count" hidden>0</span>
            </a>
            <button class="burger" type="button" id="burger" aria-label="Open menu" aria-expanded="false" aria-controls="nav-menu"><span></span><span></span><span></span></button>
          </div>
        </div>
      </header>`;
    const burger = document.getElementById('burger');
    const menu = document.getElementById('nav-menu');
    burger.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
      burger.classList.toggle('open', open);
    });
    const out = document.getElementById('logout-btn');
    if (out) out.addEventListener('click', () => { DB.session.clear(); location.href = 'index.html'; });
  };

  const renderFooter = () => {
    document.getElementById('site-footer').innerHTML = `
      <footer class="site-footer">
        <div class="container footer-grid">
          <div>
            <a class="brand" href="index.html"><img src="images/logo.svg" alt="" width="32" height="32"><span>Foodly</span></a>
            <p class="muted small">Your favourite food, delivered in 30 minutes across Almaty.</p>
          </div>
          <nav aria-label="Footer">
            <h4>Foodly</h4>
            <ul class="footer-links">
              <li><a href="about.html">About</a></li>
              <li><a href="about.html#contact">Contact</a></li>
              <li><a href="about.html#privacy">Privacy</a></li>
              <li><a href="about.html#terms">Terms</a></li>
            </ul>
          </nav>
          <nav aria-label="Social">
            <h4>Follow us</h4>
            <ul class="footer-links">
              <li><a href="https://instagram.com" target="_blank" rel="noopener">Instagram</a></li>
              <li><a href="https://facebook.com" target="_blank" rel="noopener">Facebook</a></li>
              <li><a href="https://t.me" target="_blank" rel="noopener">Telegram</a></li>
            </ul>
          </nav>
        </div>
        <div class="container footer-bottom">© 2026 Foodly — Student Project</div>
      </footer>`;
  };

  const updateCartBadge = () => {
    const el = document.getElementById('cart-count');
    if (!el) return;
    const n = DB.cart.count();
    el.textContent = n > 99 ? '99+' : n;
    el.hidden = n === 0;
  };

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-add]');
    if (!b) return;
    const dish = DB.dishes.get(b.dataset.add);
    if (!dish) return;
    const qty = Number(b.dataset.qty || 1);
    DB.cart.add(dish.id, qty);
    toast(`${qty > 1 ? qty + ' × ' : ''}${dish.name} added to cart`);
  });
  document.addEventListener('cart:changed', updateCartBadge);
  window.addEventListener('storage', updateCartBadge);

  renderHeader();
  renderFooter();
  updateCartBadge();

  return { esc, fmt, stars, fmtDate, fmtDay, params, user, initials, avatar, statusBadge, requireAuth, requireAdmin,
    toast, confirm: confirmDialog, readImage, imageFileError, dishCard, updateCartBadge };
})();
