/* Foodly — dish details page */
(() => {
  const { R } = Validation;
  const root = document.getElementById('dish-root');
  const dish = DB.dishes.get(App.params().get('id'));

  if (!dish) {
    document.title = 'Dish not found — Foodly';
    root.innerHTML = `<div class="empty" style="margin:48px 0"><div class="big">😕</div><h2>Dish not found</h2>
      <p>This dish may have been removed from the menu.</p><a class="btn btn-primary" href="menu.html">Back to menu</a></div>`;
    return;
  }

  document.title = `${dish.name} — Foodly`;
  const related = DB.dishes.all().filter((d) => d.category === dish.category && d.id !== dish.id).slice(0, 4);

  root.innerHTML = `
    <nav class="crumbs" aria-label="Breadcrumb"><a href="menu.html">Menu</a> › <a href="menu.html?cat=${encodeURIComponent(dish.category)}">${App.esc(dish.category)}</a> › ${App.esc(dish.name)}</nav>
    <div class="dish-detail">
      <div class="dish-photo"><img src="${App.esc(dish.image)}" alt="${App.esc(dish.name)}"></div>
      <div class="dish-info">
        <span class="tag">${App.esc(dish.category)}</span>
        <h1>${App.esc(dish.name)}</h1>
        <div class="meta"><span class="stars">${App.stars(dish.rating)}</span><span>${Number(dish.rating).toFixed(1)}</span></div>
        <p style="margin-top:14px">${App.esc(dish.description)}</p>
        <div class="facts"><span>⏱ <b>${dish.time} min</b></span><span>🚚 Free from <b>${App.fmt(DB.FREE_DELIVERY_FROM)}</b></span></div>
        <h4>Ingredients</h4>
        <ul class="features-list">${dish.ingredients.map((i) => `<li>${App.esc(i)}</li>`).join('')}</ul>
        <div class="buy-box">
          <div><div class="muted small">Price</div><strong class="price">${App.fmt(dish.price)}</strong></div>
          <form class="buy-form" id="buy-form" novalidate>
            <div class="field">
              <div class="stepper">
                <button type="button" data-step="-1" aria-label="Decrease quantity">−</button>
                <input name="qty" type="number" value="1" aria-label="Quantity" inputmode="numeric">
                <button type="button" data-step="1" aria-label="Increase quantity">+</button>
              </div>
              <span class="error" role="alert"></span>
            </div>
            <button class="btn btn-primary btn-lg" type="submit">Add to cart</button>
          </form>
        </div>
      </div>
    </div>
    ${related.length ? `<section class="section" style="padding-top:8px"><div class="section-head"><h2>More ${App.esc(dish.category)}</h2></div><div class="grid grid-cards">${related.map(App.dishCard).join('')}</div></section>` : ''}`;

  const form = document.getElementById('buy-form');
  const qty = form.elements.qty;
  form.querySelectorAll('[data-step]').forEach((b) =>
    b.addEventListener('click', () => {
      qty.value = Math.min(20, Math.max(1, (parseInt(qty.value, 10) || 0) + Number(b.dataset.step)));
      Validation.clearError(qty);
    }));

  Validation.attach(form, {
    qty: [R.required('Enter a quantity'), R.integerBetween(1, 20, 'Quantity must be a whole number from 1 to 20')],
  }, (v) => {
    const n = Number(v.qty);
    DB.cart.add(dish.id, n);
    App.toast(`${n > 1 ? n + ' × ' : ''}${dish.name} added to cart`);
  });
})();
