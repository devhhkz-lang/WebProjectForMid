/* Foodly — registration, login and password reset */
(() => {
  const { R } = Validation;
  const next = () => {
    const n = App.params().get('next');
    // only allow redirects to local pages
    return n && /^[\w.-]+\.html(\?.*)?$/.test(n) ? n : 'index.html';
  };

  // already logged in → go home
  if (App.user() && document.querySelector('#register-form, #login-form')) {
    location.replace('index.html');
    return;
  }

  /* ----- register ----- */
  const reg = document.getElementById('register-form');
  if (reg) {
    let photo = '';
    const preview = document.getElementById('photo-preview');
    const photoInput = reg.elements.photo;

    photoInput.addEventListener('change', async () => {
      const file = photoInput.files[0];
      const err = App.imageFileError(file);
      if (err) {
        Validation.setError(photoInput, err);
        photoInput.value = '';
        photo = '';
        preview.textContent = '👤';
        return;
      }
      Validation.clearError(photoInput);
      if (!file) return;
      photo = await App.readImage(file, 200);
      preview.innerHTML = `<img src="${photo}" alt="">`;
    });

    Validation.attach(reg, {
      firstName: [R.required('Please enter your first name'), R.minLength(2, 'First name is too short'), R.name()],
      lastName: [R.required('Please enter your last name'), R.minLength(2, 'Last name is too short'), R.name()],
      email: [
        R.required('Email is required'),
        R.email(),
        R.custom((v) => (DB.users.byEmail(v) ? 'An account with this email already exists' : '')),
      ],
      phone: [R.optional(R.phone())],
      dob: [R.birthDate()],
      password: [R.required('Password is required'), R.minLength(8, 'Password must be at least 8 characters'), R.password()],
      confirm: [R.required('Please confirm your password'), R.match('password')],
    }, (v) => {
      const user = DB.users.add({
        firstName: v.firstName.trim(), lastName: v.lastName.trim(), email: v.email,
        phone: v.phone.trim(), dob: v.dob, photo, password: v.password,
      });
      DB.session.set(user.id);
      DB.cart.mergeGuest(user.id);
      location.href = next();
    });
  }

  /* ----- login ----- */
  const login = document.getElementById('login-form');
  if (login) {
    Validation.attach(login, {
      email: [R.required('Please enter your email'), R.email()],
      password: [R.required('Please enter your password')],
    }, (v, form) => {
      const user = DB.users.byEmail(v.email);
      if (!user) {
        Validation.setError(form.elements.email, 'No account found with this email');
        form.elements.email.focus();
        return;
      }
      if (!DB.users.checkPassword(user, v.password)) {
        Validation.setError(form.elements.password, 'Incorrect password. Please try again');
        form.elements.password.focus();
        return;
      }
      DB.session.set(user.id);
      DB.cart.mergeGuest(user.id);
      location.href = next();
    });

    document.querySelectorAll('[data-fill]').forEach((b) =>
      b.addEventListener('click', () => {
        const [e, p] = b.dataset.fill.split('|');
        login.elements.email.value = e;
        login.elements.password.value = p;
      }));
  }

  /* ----- forgot password ----- */
  const forgot = document.getElementById('forgot-form');
  if (forgot) {
    Validation.attach(forgot, {
      email: [R.required('Please enter your email'), R.email()],
    }, (v) => {
      // demo: no email is actually sent
      Validation.showFormAlert(forgot, 'If an account exists for ' + v.email + ', a reset link has been sent (demo).', 'success');
    });
  }
})();
