// Shared wiring for the classic lead forms (offer landings, service
// landings, /contact): intercept native submit, POST the fields as JSON to
// /api/lead (→ Airtable), and swap the button to a success state in place.
//
// The audit questionnaire does NOT use this — its state machine posts to the
// same endpoint itself, fire-and-forget, because its next step (the Calendly
// booking) must never wait on the write.
//
// Options, both optional:
//   shape(data)   rewrite the field map before it is sent, for forms whose
//                 inputs don't map one-to-one onto Airtable columns
//   successLabel  what the button says once the write lands
export function wireLeadForm(form, meta, { shape, successLabel = 'Sent. We will be in touch.' } = {}) {
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const button = form.querySelector('[type="submit"]');
    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Sending…';

    let data = Object.fromEntries(new FormData(form).entries());
    delete data['form-name']; // legacy Netlify Forms key, meaningless now
    if (shape) data = shape(data);

    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...meta, ...data }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      form.reset();
      button.textContent = successLabel;
    } catch (err) {
      console.error('Lead POST failed', err);
      button.disabled = false;
      button.textContent = label;
      form.querySelector('[data-lead-error]')?.removeAttribute('hidden');
    }
  });
}
