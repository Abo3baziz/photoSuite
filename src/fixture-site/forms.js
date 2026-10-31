/* Validation-error fixture: deterministic, triggered by invalid submits. */
(function initForms() {
  const form = document.getElementById('signup');
  const errors = document.getElementById('validation-errors');
  if (!(form instanceof HTMLFormElement)) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const messages = [];
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    if (email instanceof HTMLInputElement && !/.+@.+\..+/.test(email.value))
      messages.push('Enter a valid email address.');
    if (password instanceof HTMLInputElement && password.value.length < 8)
      messages.push('Password must be at least 8 characters.');
    if (errors) errors.textContent = messages.join(' ');
  });
})();
