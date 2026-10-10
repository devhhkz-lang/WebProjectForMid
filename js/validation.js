/* Foodly — form validation helpers.
   Usage: Validation.attach(form, { fieldName: [rule, rule, ...] }, (values) => { ... }) */
const Validation = (() => {
  // A rule is (value, allValues) => 'error message' | ''
  const R = {
    required: (msg = 'This field is required') => (v) => (String(v ?? '').trim() ? '' : msg),
    minLength: (n, msg) => (v) => (String(v).trim().length >= n ? '' : msg || `Must be at least ${n} characters`),
    maxLength: (n, msg) => (v) => (String(v).trim().length <= n ? '' : msg || `Must be at most ${n} characters`),
    email: (msg = 'Please enter a valid email address') => (v) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()) ? '' : msg,
    name: (msg = 'Use letters only (no digits or symbols)') => (v) =>
      /^[A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі'’ -]+$/.test(String(v).trim()) ? '' : msg,
    phone: (msg = 'Enter a valid phone, e.g. +7 777 123 45 67') => (v) =>
      /^(\+7|8)[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/.test(String(v).trim()) ? '' : msg,
    password: (msg = 'Use at least one letter and one digit') => (v) =>
      /[A-Za-z]/.test(v) && /\d/.test(v) ? '' : msg,
    match: (other, msg = 'Passwords do not match') => (v, all) => (v === all[other] ? '' : msg),
    integerBetween: (min, max, msg) => (v) => {
      const n = Number(v);
      return Number.isInteger(n) && n >= min && n <= max ? '' : msg || `Enter a whole number from ${min} to ${max}`;
    },
    numberBetween: (min, max, msg) => (v) => {
      const n = Number(v);
      return v !== '' && !Number.isNaN(n) && n >= min && n <= max ? '' : msg || `Enter a number from ${min} to ${max}`;
    },
    dateNotPast: (msg = 'The date cannot be in the past') => (v) => {
      if (!v) return '';
      const local = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
      return v >= local ? '' : msg;
    },
    birthDate: (msg = 'Enter a valid date of birth') => (v) => {
      if (!v) return '';
      const d = new Date(v);
      const now = new Date();
      return !Number.isNaN(d.getTime()) && d < now && d.getFullYear() >= 1920 ? '' : msg;
    },
    cardNumber: (msg = 'Card number must have 16 digits') => (v) => (/^\d{16}$/.test(String(v).replace(/\s/g, '')) ? '' : msg),
    cardExpiry: (msg = 'Use MM/YY and a future date') => (v) => {
      const m = /^(\d{2})\/(\d{2})$/.exec(String(v).trim());
      if (!m) return msg;
      const month = Number(m[1]);
      const year = 2000 + Number(m[2]);
      if (month < 1 || month > 12) return msg;
      const now = new Date();
      return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1) ? '' : 'This card has expired';
    },
    cvv: (msg = 'CVV must be 3 digits') => (v) => (/^\d{3}$/.test(String(v).trim()) ? '' : msg),
    // run a rule only if the field is not empty
    optional: (rule) => (v, all) => (String(v ?? '').trim() === '' ? '' : rule(v, all)),
    // run a rule only when the condition holds
    when: (cond, rule) => (v, all) => (cond(all) ? rule(v, all) : ''),
    custom: (fn) => fn,
  };

  const fieldOf = (input) => input.closest('.field') || input.parentElement;

  const setError = (input, message) => {
    const field = fieldOf(input);
    field.classList.add('invalid');
    field.classList.remove('valid');
    let box = field.querySelector('.error');
    if (!box) {
      box = document.createElement('span');
      box.className = 'error';
      box.setAttribute('role', 'alert');
      field.appendChild(box);
    }
    box.textContent = '⚠ ' + message;
    input.setAttribute('aria-invalid', 'true');
  };

  const clearError = (input, markValid = false) => {
    const field = fieldOf(input);
    field.classList.remove('invalid');
    field.classList.toggle('valid', markValid && input.value !== '');
    const box = field.querySelector('.error');
    if (box) box.textContent = '';
    input.removeAttribute('aria-invalid');
  };

  const values = (form) => {
    const out = {};
    new FormData(form).forEach((v, k) => {
      if (!(v instanceof File)) out[k] = typeof v === 'string' ? v : '';
    });
    return out;
  };

  const check = (form, schema, name, all) => {
    const input = form.elements[name];
    if (!input || input instanceof RadioNodeList) return true;
    const value = all[name] ?? '';
    for (const rule of schema[name]) {
      const msg = rule(value, all);
      if (msg) {
        setError(input, msg);
        return false;
      }
    }
    clearError(input, true);
    return true;
  };

  const showFormAlert = (form, message, type = 'error') => {
    let box = form.querySelector('.form-alert');
    if (!box) {
      box = document.createElement('div');
      box.className = 'form-alert';
      box.setAttribute('role', 'alert');
      form.prepend(box);
    }
    box.className = 'form-alert ' + (message ? type : '');
    box.textContent = message || '';
  };

  const attach = (form, schema, onValid) => {
    form.setAttribute('novalidate', '');
    const touched = new Set();

    const revalidate = (name) => {
      const all = values(form);
      check(form, schema, name, all);
      // dependent fields (e.g. confirm password) follow their source
      Object.keys(schema).forEach((other) => {
        if (other !== name && touched.has(other)) check(form, schema, other, all);
      });
    };

    Object.keys(schema).forEach((name) => {
      const input = form.elements[name];
      if (!input) return;
      const els = input instanceof RadioNodeList ? [...input] : [input];
      els.forEach((el) => {
        el.addEventListener('blur', () => { touched.add(name); revalidate(name); });
        el.addEventListener('input', () => { if (touched.has(name)) revalidate(name); });
        el.addEventListener('change', () => { if (touched.has(name)) revalidate(name); });
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      showFormAlert(form, '');
      const all = values(form);
      let firstBad = null;
      Object.keys(schema).forEach((name) => {
        touched.add(name);
        if (!check(form, schema, name, all) && !firstBad) firstBad = form.elements[name];
      });
      if (firstBad) {
        firstBad.focus();
        return;
      }
      onValid(all, form);
    });

    return { reset() { touched.clear(); form.querySelectorAll('.field').forEach((f) => f.classList.remove('invalid', 'valid')); form.querySelectorAll('.error').forEach((b) => (b.textContent = '')); showFormAlert(form, ''); } };
  };

  return { R, attach, setError, clearError, showFormAlert, values };
})();
