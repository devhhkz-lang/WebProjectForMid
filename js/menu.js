/* Foodly — menu: search, category chips, price filter, sorting */
(() => {
  const all = DB.dishes.all();
  const p = App.params();
  const state = { q: p.get('q') || '', cat: p.get('cat') || 'All', price: 'all', sort: 'popular' };

  const form = document.getElementById('filters');
  const chips = document.getElementById('chips');
  const list = document.getElementById('dishes');
  const count = document.getElementById('count');

  const inPrice = (d) =>
    state.price === 'all' || (state.price === 'low' && d.price < 2500) ||
    (state.price === 'mid' && d.price >= 2500 && d.price <= 4000) || (state.price === 'high' && d.price > 4000);

  const sorters = {
    popular: (a, b) => b.rating - a.rating,
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    time: (a, b) => a.time - b.time,
  };

  const renderChips = () => {
    const cats = ['All', ...DB.dishes.categories()];
    if (!cats.includes(state.cat)) state.cat = 'All';
    chips.innerHTML = cats.map((c) =>
      `<button type="button" class="chip${c === state.cat ? ' active' : ''}" data-cat="${App.esc(c)}" aria-pressed="${c === state.cat}">${App.esc(c)}</button>`).join('');
  };

  const render = () => {
    const q = state.q.trim().toLowerCase();
    const result = all
      .filter((d) => state.cat === 'All' || d.category === state.cat)
      .filter(inPrice)
      .filter((d) => !q || (d.name + ' ' + d.category + ' ' + d.description + ' ' + d.ingredients.join(' ')).toLowerCase().includes(q))
      .sort(sorters[state.sort]);

    count.textContent = `${result.length} dish${result.length === 1 ? '' : 'es'} found`;
    list.innerHTML = result.length
      ? result.map(App.dishCard).join('')
      : `<div class="empty" style="grid-column:1/-1"><div class="big">🔍</div><h3>Nothing found</h3>
         <p>Try another search or clear the filters.</p><button class="btn btn-primary" type="button" id="empty-reset">Clear filters</button></div>`;
    renderChips();
  };

  const reset = () => {
    Object.assign(state, { q: '', cat: 'All', price: 'all', sort: 'popular' });
    form.elements.q.value = '';
    form.elements.price.value = 'all';
    form.elements.sort.value = 'popular';
    render();
  };

  form.elements.q.value = state.q;
  form.addEventListener('submit', (e) => { e.preventDefault(); state.q = form.elements.q.value; render(); });
  form.elements.q.addEventListener('input', () => { state.q = form.elements.q.value; render(); });
  form.elements.price.addEventListener('change', () => { state.price = form.elements.price.value; render(); });
  form.elements.sort.addEventListener('change', () => { state.sort = form.elements.sort.value; render(); });
  document.getElementById('reset').addEventListener('click', reset);
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (b) { state.cat = b.dataset.cat; render(); }
  });
  list.addEventListener('click', (e) => { if (e.target.id === 'empty-reset') reset(); });

  render();
})();
