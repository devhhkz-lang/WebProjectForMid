/* Foodly — about page: contact form */
(() => {
  const { R } = Validation;
  const form = document.getElementById('contact-form');
  const u = App.user();
  if (u) { form.elements.cname.value = `${u.firstName} ${u.lastName}`; form.elements.cemail.value = u.email; }

  const v = Validation.attach(form, {
    cname: [R.required('Please enter your name'), R.minLength(2, 'Name is too short')],
    cemail: [R.required('Email is required'), R.email()],
    cmessage: [R.required('Please write a message'), R.minLength(10, 'Message must be at least 10 characters')],
  }, (vals) => {
    DB.messages.add({ name: vals.cname.trim(), email: vals.cemail.trim(), message: vals.cmessage.trim() });
    form.reset();
    v.reset();
    Validation.showFormAlert(form, 'Thank you! Your message has been sent.', 'success');
  });
})();
