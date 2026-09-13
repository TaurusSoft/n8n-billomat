# Changelog

## 0.1.0

Initial release.

- **Billomat node** covering clients, contacts, articles, suppliers, invoices (with items,
  payments and comments), estimates, credit notes, recurring invoices (with items) and
  incoming invoices.
- Document lifecycle operations: complete, cancel, uncancel, win, lose, clear, unclear.
- PDF download into a binary field and sending documents by email, including attachments
  taken from input binary fields.
- Automatic paging for Get Many, Billomat error messages surfaced verbatim, and
  normalisation of Billomat's XML-derived JSON envelope.
- **Billomat Trigger node** for Billomat webhooks, with an event filter over all 83
  documented events and optional basic auth.
- **Billomat API credentials** with optional App ID / App Secret for the raised rate limit.
