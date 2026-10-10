/* Foodly — order confirmation */
(() => {
  const u = App.requireAuth();
  if (!u) return;
  const root = document.getElementById('success-root');
  const order = DB.orders.get(App.params().get('id'));

  if (!order || (order.userId !== u.id && u.role !== 'admin')) {
    root.innerHTML = `<div class="empty" style="margin:48px 0"><div class="big">🧾</div><h2>Order not found</h2>
      <p>We couldn't find this order in your account.</p><a class="btn btn-primary" href="profile.html#orders">View my orders</a></div>`;
    return;
  }

  const when = order.deliveryTime === 'ASAP' ? 'ASAP (30–45 min)' : order.deliveryTime;
  root.innerHTML = `
    <section class="success-card" aria-live="polite">
      <div class="success-icon" aria-hidden="true">✓</div>
      <h1 style="font-size:2rem">Success!</h1>
      <p class="muted">Your order is confirmed. We're already preparing it.</p>
      <dl>
        <dt>Order ID</dt><dd>#${order.id}</dd>
        <dt>Date</dt><dd>${App.fmtDay(order.deliveryDate)}</dd>
        <dt>Time</dt><dd>${App.esc(when)}</dd>
        <dt>Address</dt><dd>${App.esc(order.address)}</dd>
        <dt>Payment</dt><dd>${App.esc(order.payment)}</dd>
        <dt>Total</dt><dd>${App.fmt(order.total)}</dd>
        <dt>Status</dt><dd>${App.statusBadge(order.status)}</dd>
      </dl>
      <div class="success-actions">
        <a class="btn btn-primary" href="profile.html#orders">View my orders</a>
        <a class="btn btn-secondary" href="menu.html">Order more</a>
      </div>
    </section>`;
})();
