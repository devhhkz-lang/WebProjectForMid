/* Foodly — data layer.
   A tiny "database" on top of localStorage so the whole project works without a server.
   Replace the bodies of these functions with fetch() calls to plug in a real backend. */
const DB = (() => {
  const K = {
    users: 'foodly_users',
    dishes: 'foodly_dishes',
    orders: 'foodly_orders',
    session: 'foodly_session',
    seeded: 'foodly_seeded_v1',
    promo: 'foodly_promo',
    messages: 'foodly_messages',
  };

  const FREE_DELIVERY_FROM = 8000;
  const DELIVERY_FEE = 590;
  const PROMOS = { WELCOME10: 0.1 };
  const STATUSES = ['Pending', 'Preparing', 'Delivering', 'Delivered', 'Cancelled'];

  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  // Demo-grade password hash (cyrb53). A real backend must use bcrypt/argon2.
  const cyrb53 = (str, seed = 0) => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  };
  const hashPassword = (email, password) => 'h' + cyrb53(email.toLowerCase() + '::' + password);

  const nextId = (list) => list.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;

  /* ---------- seed data ---------- */
  const SEED_DISHES = [
    { id: 1, name: 'Classic Cheeseburger', category: 'Burgers', price: 2490, rating: 4.7, time: 20, image: 'images/dishes/cheeseburger.jpeg',
      description: 'Juicy beef patty, melted cheddar, pickles and our signature sauce in a toasted brioche bun.',
      ingredients: ['Beef patty 150 g', 'Cheddar', 'Pickles', 'Brioche bun', 'Signature sauce'] },
    { id: 2, name: 'Double Bacon Burger', category: 'Burgers', price: 3490, rating: 4.8, time: 25, image: 'images/dishes/bacon-burger.jpeg',
      description: 'Two beef patties, crispy bacon, caramelised onion and smoky BBQ sauce. Not for the faint-hearted.',
      ingredients: ['2 beef patties', 'Crispy bacon', 'Caramelised onion', 'BBQ sauce', 'Cheddar'] },
    { id: 3, name: 'Margherita Pizza', category: 'Pizza', price: 3990, rating: 4.6, time: 30, image: 'images/dishes/margherita.jpeg',
      description: 'Stone-baked 30 cm pizza with San Marzano tomato sauce, fior di latte and fresh basil.',
      ingredients: ['Tomato sauce', 'Mozzarella', 'Fresh basil', 'Olive oil', 'Thin dough'] },
    { id: 4, name: 'Pepperoni Pizza', category: 'Pizza', price: 4490, rating: 4.9, time: 30, image: 'images/dishes/pepperoni.jpeg',
      description: 'Our bestseller: generous pepperoni, mozzarella and a drizzle of hot honey.',
      ingredients: ['Pepperoni', 'Mozzarella', 'Tomato sauce', 'Hot honey', 'Oregano'] },
    { id: 5, name: 'Salmon Nigiri Set', category: 'Sushi', price: 6990, rating: 4.8, time: 35, image: 'images/dishes/salmon-set.jpeg',
      description: 'Eight pieces of hand-pressed nigiri with fresh Norwegian salmon, served with wasabi and ginger.',
      ingredients: ['Norwegian salmon', 'Sushi rice', 'Wasabi', 'Pickled ginger', 'Soy sauce'] },
    { id: 6, name: 'Philadelphia Roll', category: 'Sushi', price: 4990, rating: 4.5, time: 35, image: 'images/dishes/philadelphia.jpeg',
      description: 'Classic roll with salmon, cream cheese and cucumber. Eight pieces.',
      ingredients: ['Salmon', 'Cream cheese', 'Cucumber', 'Nori', 'Sushi rice'] },
    { id: 7, name: 'Caesar Salad', category: 'Salads', price: 2990, rating: 4.4, time: 15, image: 'images/dishes/caesar.jpeg',
      description: 'Crisp romaine, grilled chicken, parmesan and garlic croutons with creamy Caesar dressing.',
      ingredients: ['Romaine lettuce', 'Grilled chicken', 'Parmesan', 'Croutons', 'Caesar dressing'] },
    { id: 8, name: 'Greek Salad', category: 'Salads', price: 2490, rating: 4.3, time: 15, image: 'images/dishes/greek.jpeg',
      description: 'Tomatoes, cucumber, olives and feta with oregano and extra virgin olive oil.',
      ingredients: ['Tomatoes', 'Cucumber', 'Feta', 'Kalamata olives', 'Olive oil'] },
    { id: 9, name: 'New York Cheesecake', category: 'Desserts', price: 1890, rating: 4.7, time: 10, image: 'images/dishes/cheesecake.jpeg',
      description: 'Creamy baked cheesecake on a buttery biscuit base with wild berry sauce.',
      ingredients: ['Cream cheese', 'Biscuit base', 'Berry sauce', 'Vanilla'] },
    { id: 10, name: 'Chocolate Fondant', category: 'Desserts', price: 2190, rating: 4.9, time: 15, image: 'images/dishes/fondant.jpeg',
      description: 'Warm chocolate cake with a molten centre, served with vanilla ice cream.',
      ingredients: ['Dark chocolate', 'Butter', 'Eggs', 'Vanilla ice cream'] },
    { id: 11, name: 'Fresh Lemonade', category: 'Drinks', price: 990, rating: 4.2, time: 5, image: 'images/dishes/lemonade.jpeg',
      description: 'House-made lemonade with fresh mint and plenty of ice. 0.5 l.',
      ingredients: ['Lemon', 'Mint', 'Sparkling water', 'Cane sugar'] },
    { id: 12, name: 'Caramel Latte', category: 'Drinks', price: 1290, rating: 4.5, time: 8, image: 'images/dishes/latte.jpeg',
      description: 'Double espresso, steamed milk and salted caramel. 0.35 l.',
      ingredients: ['Espresso', 'Milk', 'Salted caramel'] },
  ];

  const seed = () => {
    if (localStorage.getItem(K.seeded)) return;
    const now = Date.now();
    const users = [
      { id: 1, firstName: 'Admin', lastName: 'Foodly', email: 'admin@foodly.kz', phone: '+7 777 000 00 01', dob: '',
        photo: '', role: 'admin', password: hashPassword('admin@foodly.kz', 'Admin123'), createdAt: new Date(now - 30 * 864e5).toISOString() },
      { id: 2, firstName: 'Demo', lastName: 'User', email: 'demo@foodly.kz', phone: '+7 777 000 00 02', dob: '2004-05-12',
        photo: '', role: 'user', password: hashPassword('demo@foodly.kz', 'Demo1234'), createdAt: new Date(now - 14 * 864e5).toISOString() },
    ];
    const line = (id, qty) => {
      const d = SEED_DISHES.find((x) => x.id === id);
      return { dishId: d.id, name: d.name, price: d.price, qty, image: d.image };
    };
    const mk = (id, userId, name, items, status, daysAgo, address) => {
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      const delivery = subtotal >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE;
      return { id, userId, userName: name, items, subtotal, delivery, discount: 0, total: subtotal + delivery,
        address, phone: '+7 777 000 00 02', deliveryDate: new Date(now - daysAgo * 864e5).toISOString().slice(0, 10),
        deliveryTime: 'ASAP', payment: 'cash', comment: '', status, createdAt: new Date(now - daysAgo * 864e5).toISOString() };
    };
    const orders = [
      mk(10450, 2, 'Demo User', [line(4, 1), line(11, 2)], 'Delivered', 6, 'Abay Ave 150, apt 12, Almaty'),
      mk(10451, 2, 'Demo User', [line(1, 2), line(12, 1), line(9, 1)], 'Preparing', 0, 'Abay Ave 150, apt 12, Almaty'),
    ];
    write(K.users, users);
    write(K.dishes, SEED_DISHES);
    write(K.orders, orders);
    localStorage.setItem(K.seeded, '1');
  };

  /* ---------- users & session ---------- */
  const users = {
    all: () => read(K.users, []),
    byId: (id) => users.all().find((u) => u.id === Number(id)) || null,
    byEmail: (email) => users.all().find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase()) || null,
    add(data) {
      const list = users.all();
      const user = { ...data, id: nextId(list), email: data.email.trim().toLowerCase(),
        password: hashPassword(data.email, data.password), role: data.role || 'user', createdAt: new Date().toISOString() };
      list.push(user);
      write(K.users, list);
      return user;
    },
    update(id, patch) {
      const list = users.all();
      const i = list.findIndex((u) => u.id === Number(id));
      if (i < 0) return null;
      if (patch.password) patch = { ...patch, password: hashPassword(list[i].email, patch.password) };
      list[i] = { ...list[i], ...patch };
      write(K.users, list);
      return list[i];
    },
    remove: (id) => write(K.users, users.all().filter((u) => u.id !== Number(id))),
    checkPassword: (user, password) => user.password === hashPassword(user.email, password),
  };

  const session = {
    get: () => Number(localStorage.getItem(K.session)) || null,
    set: (id) => localStorage.setItem(K.session, String(id)),
    clear: () => localStorage.removeItem(K.session),
  };

  /* ---------- dishes (CRUD) ---------- */
  const dishes = {
    all: () => read(K.dishes, []),
    get: (id) => dishes.all().find((d) => d.id === Number(id)) || null,
    categories: () => [...new Set(dishes.all().map((d) => d.category))],
    add(data) {
      const list = dishes.all();
      const dish = { ...data, id: nextId(list) };
      list.push(dish);
      write(K.dishes, list);
      return dish;
    },
    update(id, patch) {
      const list = dishes.all();
      const i = list.findIndex((d) => d.id === Number(id));
      if (i < 0) return null;
      list[i] = { ...list[i], ...patch };
      write(K.dishes, list);
      return list[i];
    },
    remove: (id) => write(K.dishes, dishes.all().filter((d) => d.id !== Number(id))),
  };

  /* ---------- cart (one per user, plus a guest cart) ---------- */
  const cartKey = (uid) => 'foodly_cart_' + (uid === undefined ? session.get() || 'guest' : uid || 'guest');
  const cart = {
    raw: (uid) => read(cartKey(uid), []),
    save(items, uid) {
      write(cartKey(uid), items);
      document.dispatchEvent(new CustomEvent('cart:changed'));
    },
    add(dishId, qty = 1) {
      const items = cart.raw();
      const line = items.find((i) => i.dishId === Number(dishId));
      if (line) line.qty = Math.min(99, line.qty + qty);
      else items.push({ dishId: Number(dishId), qty });
      cart.save(items);
    },
    setQty(dishId, qty) {
      const items = cart.raw().map((i) => (i.dishId === Number(dishId) ? { ...i, qty } : i));
      cart.save(items.filter((i) => i.qty > 0));
    },
    remove: (dishId) => cart.save(cart.raw().filter((i) => i.dishId !== Number(dishId))),
    clear: () => cart.save([]),
    // lines joined with current dish data (dishes deleted by admin are dropped)
    detailed() {
      return cart.raw()
        .map((i) => {
          const d = dishes.get(i.dishId);
          return d ? { dishId: d.id, name: d.name, price: d.price, image: d.image, category: d.category, qty: i.qty } : null;
        })
        .filter(Boolean);
    },
    count: () => cart.detailed().reduce((s, i) => s + i.qty, 0),
    // move the guest cart into the user's cart after login / sign-up
    mergeGuest(uid) {
      const guest = cart.raw(0);
      if (!guest.length) return;
      const mine = cart.raw(uid);
      guest.forEach((g) => {
        const line = mine.find((i) => i.dishId === g.dishId);
        if (line) line.qty = Math.min(99, line.qty + g.qty);
        else mine.push(g);
      });
      write(cartKey(uid), mine);
      write(cartKey(0), []);
    },
  };

  const promo = {
    get: () => localStorage.getItem(K.promo) || '',
    set: (code) => localStorage.setItem(K.promo, code),
    clear: () => localStorage.removeItem(K.promo),
    valid: (code) => Object.prototype.hasOwnProperty.call(PROMOS, String(code).trim().toUpperCase()),
  };

  const totals = (items, code) => {
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const delivery = subtotal === 0 ? 0 : subtotal >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE;
    const rate = code && PROMOS[code] ? PROMOS[code] : 0;
    const discount = Math.round(subtotal * rate);
    return { subtotal, delivery, discount, total: subtotal - discount + delivery };
  };

  /* ---------- orders ---------- */
  const orders = {
    all: () => read(K.orders, []).sort((a, b) => b.id - a.id),
    byUser: (uid) => orders.all().filter((o) => o.userId === Number(uid)),
    get: (id) => orders.all().find((o) => o.id === Number(id)) || null,
    add(data) {
      const list = read(K.orders, []);
      const id = Math.max(10449, ...list.map((o) => o.id)) + 1;
      const order = { ...data, id, status: 'Pending', createdAt: new Date().toISOString() };
      list.push(order);
      write(K.orders, list);
      return order;
    },
    setStatus(id, status) {
      const list = read(K.orders, []);
      const o = list.find((x) => x.id === Number(id));
      if (o) o.status = status;
      write(K.orders, list);
    },
  };

  const messages = {
    add(m) {
      const list = read(K.messages, []);
      list.push({ ...m, createdAt: new Date().toISOString() });
      write(K.messages, list);
    },
  };

  const reset = () => {
    Object.keys(localStorage).filter((k) => k.startsWith('foodly_')).forEach((k) => localStorage.removeItem(k));
    seed();
  };

  seed();

  return { users, session, dishes, cart, promo, totals, orders, messages, reset, STATUSES, DELIVERY_FEE, FREE_DELIVERY_FROM };
})();
