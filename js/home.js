/* Foodly — home page */
(() => {
  const EMOJI = { Burgers: '🍔', Pizza: '🍕', Sushi: '🍣', Salads: '🥗', Desserts: '🍰', Drinks: '🥤' };
  const dishes = DB.dishes.all();

  document.getElementById('categories').innerHTML = DB.dishes.categories().map((c) =>
    `<a class="cat-tile" href="menu.html?cat=${encodeURIComponent(c)}"><span class="emoji" aria-hidden="true">${EMOJI[c] || '🍽️'}</span>${App.esc(c)}</a>`).join('');

  const top = [...dishes].sort((a, b) => b.rating - a.rating).slice(0, 4);
  document.getElementById('popular').innerHTML = top.map(App.dishCard).join('');

  document.getElementById('hero-search').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = e.target.elements.q.value.trim();
    location.href = 'menu.html' + (q ? '?q=' + encodeURIComponent(q) : '');
  });

  // user information strip for logged-in users
  const u = App.user();
  if (u) {
    const mine = DB.orders.byUser(u.id);
    const active = mine.find((o) => ['Pending', 'Preparing', 'Delivering'].includes(o.status));
    document.getElementById('welcome').innerHTML = `
      <div class="welcome">
        ${App.avatar(u)}
        <div class="grow"><b>Welcome back, ${App.esc(u.firstName)}!</b><br>
          <span class="muted small">${active ? `Your order #${active.id} is ${App.esc(active.status.toLowerCase())}` : `You have ${mine.length} order${mine.length === 1 ? '' : 's'} so far`}</span></div>
        <a class="btn btn-secondary btn-sm" href="profile.html#orders">My orders</a>
      </div>`;
  }
})();
