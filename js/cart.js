/* Foodly — cart page */
(() => {
  const root = document.getElementById('cart-root');

  const render = () => {
    const items = DB.cart.detailed();
    if (!items.length) {
      root.innerHTML = `<div class="empty"><div class="big">🛒</div><h2>Your cart is empty</h2>
        <p>Add something delicious from the menu.</p><a class="btn btn-primary btn-lg" href="menu.html">Browse the menu</a></div>`;
      return;
    }

    const code = DB.promo.get();
    const t = DB.totals(items, code);
    const left = Math.max(0, DB.FREE_DELIVERY_FROM - t.subtotal);
    const pct = Math.min(100, Math.round((t.subtotal / DB.FREE_DELIVERY_FROM) * 100));

    root.innerHTML = `
      <div class="layout-2">
        <section class="panel" aria-label="Cart items">
          <div class="section-head" style="margin-bottom:6px"><h2 style="margin:0">${items.reduce((s, i) => s + i.qty, 0)} items</h2>
            <button class="btn btn-ghost btn-sm" type="button" id="clear">Clear cart</button></div>
          ${items.map((i) => `
            <div class="cart-line" data-id="${i.dishId}">
              <img src="${App.esc(i.image)}" alt="">
              <div><a class="name" href="dish.html?id=${i.dishId}">${App.esc(i.name)}</a><span class="muted small">${App.fmt(i.price)} each</span></div>
              <div class="stepper">
                <button type="button" data-act="dec" aria-label="Decrease quantity of ${App.esc(i.name)}">−</button>
                <input type="number" value="${i.qty}" min="1" max="99" data-act="set" aria-label="Quantity of ${App.esc(i.name)}">
                <button type="button" data-act="inc" aria-label="Increase quantity of ${App.esc(i.name)}">+</button>
              </div>
              <div class="line-total">${App.fmt(i.price * i.qty)}</div>
              <button class="icon-btn" type="button" data-act="del" aria-label="Remove ${App.esc(i.name)}">✕</button>
            </div>`).join('')}
        </section>
        <aside class="panel sticky" aria-label="Order summary">
          <h2>Summary</h2>
          ${left > 0
            ? `<p class="small muted" style="margin:0">Add <b>${App.fmt(left)}</b> more for free delivery</p>`
            : `<p class="small" style="margin:0;color:var(--green);font-weight:600">🎉 You get free delivery!</p>`}
          <div class="progress"><span style="width:${pct}%"></span></div>
          <div class="sum-row"><span>Subtotal</span><span>${App.fmt(t.subtotal)}</span></div>
          <div class="sum-row"><span>Delivery</span><span class="${t.delivery ? '' : 'green'}">${t.delivery ? App.fmt(t.delivery) : 'Free'}</span></div>
          ${t.discount ? `<div class="sum-row"><span>Promo ${App.esc(code)}</span><span class="green">−${App.fmt(t.discount)}</span></div>` : ''}
          <div class="sum-row total"><span>Total</span><span>${App.fmt(t.total)}</span></div>
          ${code
            ? `<div class="promo-applied"><span>✓ ${App.esc(code)} applied</span><button type="button" id="promo-remove" aria-label="Remove promo code">✕</button></div>`
            : `<form class="promo-form promo-wrap" id="promo-form" novalidate>
                 <div class="field"><input name="code" placeholder="Promo code" aria-label="Promo code" autocomplete="off"><span class="error" role="alert"></span></div>
                 <button class="btn btn-secondary" type="submit" style="align-self:flex-start">Apply</button>
               </form>`}
          <a class="btn btn-primary btn-lg btn-block" style="margin-top:14px" href="checkout.html" id="checkout">Go to checkout</a>
        </aside>
      </div>`;

    const form = document.getElementById('promo-form');
    if (form) {
      Validation.attach(form, {
        code: [
          Validation.R.required('Enter a promo code'),
          Validation.R.custom((v) => (DB.promo.valid(v) ? '' : 'This promo code is not valid')),
        ],
      }, (v) => {
        DB.promo.set(v.code.trim().toUpperCase());
        App.toast('Promo code applied');
        render();
      });
    }
  };

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act], #clear, #promo-remove');
    if (!b) return;
    if (b.id === 'clear') {
      App.confirm('Remove all items from your cart?', 'Clear cart').then((ok) => { if (ok) { DB.cart.clear(); render(); } });
      return;
    }
    if (b.id === 'promo-remove') { DB.promo.clear(); render(); return; }
    if (b.dataset.act === 'set') return;
    const row = b.closest('.cart-line');
    const id = Number(row.dataset.id);
    const line = DB.cart.raw().find((i) => i.dishId === id);
    if (b.dataset.act === 'inc') DB.cart.setQty(id, Math.min(99, line.qty + 1));
    if (b.dataset.act === 'dec') DB.cart.setQty(id, line.qty - 1);
    if (b.dataset.act === 'del') DB.cart.remove(id);
    render();
  });

  root.addEventListener('change', (e) => {
    if (e.target.dataset.act !== 'set') return;
    const id = Number(e.target.closest('.cart-line').dataset.id);
    const n = parseInt(e.target.value, 10);
    if (Number.isNaN(n) || n < 1) { App.toast('Quantity must be at least 1', 'error'); }
    else DB.cart.setQty(id, Math.min(99, n));
    render();
  });

  // guests must log in before checkout
  root.addEventListener('click', (e) => {
    if (e.target.id === 'checkout' && !App.user()) {
      e.preventDefault();
      location.href = 'login.html?next=checkout.html';
    }
  });

  render();
})();
