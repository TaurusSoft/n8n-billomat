# n8n-nodes-billomat

An [n8n](https://n8n.io) community node for [Billomat](https://www.billomat.com), the German
invoicing and accounting service. It covers the document side of the Billomat REST API —
clients, invoices, estimates, credit notes, articles, suppliers and incoming invoices —
plus a trigger node for Billomat webhooks.

[Installation](#installation) · [Credentials](#credentials) · [Billomat node](#billomat-node) ·
[Billomat Trigger](#billomat-trigger) · [Working with the API](#working-with-the-api) ·
[Development](#development)

## Installation

### From the n8n UI (self-hosted)

1. Open **Settings → Community Nodes**.
2. Choose **Install**.
3. Enter `n8n-nodes-billomat` and confirm that you understand the risks of installing
   community nodes.

### Manually

```bash
npm install n8n-nodes-billomat
```

Restart n8n afterwards. See the
[n8n docs on community nodes](https://docs.n8n.io/integrations/community-nodes/installation/)
for the other installation routes.

## Credentials

Billomat authenticates with a personal API key belonging to a Billomat user.

1. In Billomat, open **Settings → Employees**, pick the user the automation should act as,
   and enable API access. Billomat generates a personal API key.
2. In n8n, create new **Billomat API** credentials and fill in:

| Field          | Required | Notes                                                                            |
| -------------- | -------- | -------------------------------------------------------------------------------- |
| **Billomat ID** | yes      | The subdomain of your account. For `https://mycompany.billomat.net` enter `mycompany`. Pasting the full URL works too. |
| **API Key**    | yes      | The personal API key from step 1                                                  |
| **App ID**     | no       | ID of a registered app, see below                                                 |
| **App Secret** | no       | Secret of that app                                                                |

The node calls `GET /api/users/myself` to verify the credentials when you press **Test**.

### Rate limits and the App ID

Billomat counts API calls in 15-minute windows. Without a registered app the limit is
**300 requests per account per window**, shared across *every* unregistered integration
touching that account — another tool can use up your budget.

Registering an app under **Settings → Administration → Apps** in Billomat raises the limit
to the quota of your plan. Fill the resulting **App ID** and **App Secret** into the
credentials and the node sends them as `X-AppId` / `X-AppSecret` so Billomat can attribute
the calls. Leave both empty and the headers are omitted entirely.

The node surfaces Billomat's `429` response with its original message, which tells you how
many seconds are left in the current window.

## Billomat node

The node follows the usual **Resource → Operation** pattern.

| Resource | Endpoint | Operations |
| --- | --- | --- |
| Article | `/api/articles` | Create, Delete, Get, Get Many, Update |
| Client | `/api/clients` | Create, Delete, Get, Get Many, Get Own Account, Update |
| Contact | `/api/contacts` | Create, Delete, Get, Get Many, Update |
| Credit Note | `/api/credit-notes` | Cancel, Complete, Create, Delete, Get, Get Many, Get PDF, Send Email, Uncancel, Update |
| Estimate | `/api/offers` | Cancel, Clear, Complete, Create, Delete, Get, Get Many, Get PDF, Lose, Send Email, Uncancel, Unclear, Update, Win |
| Incoming Invoice | `/api/incomings` | Create, Delete, Get, Get Many, Get PDF, Update |
| Invoice | `/api/invoices` | Cancel, Complete, Create, Delete, Get, Get Many, Get PDF, Send Email, Uncancel, Update |
| Invoice Comment | `/api/invoice-comments` | Create, Delete, Get, Get Many |
| Invoice Item | `/api/invoice-items` | Create, Delete, Get, Get Many, Update |
| Invoice Payment | `/api/invoice-payments` | Create, Delete, Get, Get Many |
| Recurring Invoice | `/api/recurrings` | Create, Delete, Get, Get Many, Update |
| Recurring Item | `/api/recurring-items` | Create, Delete, Get, Get Many, Update |
| Supplier | `/api/suppliers` | Create, Delete, Get, Get Many, Update |

The node is also available to AI agents as a tool.

### The invoice lifecycle

Billomat invoices, estimates and credit notes are created as **drafts**. A draft has no
document number and no PDF yet, and it is the only state in which it can still be edited.

```
Create  ──▶  DRAFT  ──Complete──▶  OPEN / OVERDUE / PAID
                                        │
                                        ├── Send Email
                                        ├── Get PDF
                                        └── Cancel ⇄ Uncancel
```

So a typical "bill a customer" chain is **Create → Complete → Send Email**. Trying to fetch
the PDF of a draft returns an error saying the document has to be completed first.

Estimates add **Win**, **Lose**, **Clear** and **Unclear** on top of that.

### Line items

Invoices, estimates, credit notes and recurring invoices take their positions through the
**Line Items** section of the *Create* operation — the items are sent together with the
document in a single request.

To change positions afterwards, use the separate **Invoice Item** / **Recurring Item**
resources. Billomat does not accept item changes through the document itself.

### Get Many, filters and paging

Every *Get Many* operation has the usual **Return All** / **Limit** pair. With *Return All*
the node walks Billomat's paging (1000 records per request) until it has everything.

The **Filters** section exposes the filters Billomat documents for that endpoint, plus
**Order By**, which takes Billomat's own syntax:

```
date DESC, invoice_number ASC
```

Some resources can only be listed scoped to a parent — contacts need a client, invoice items
and comments need an invoice, recurring items need a recurring. Those inputs are marked
required in the UI because Billomat rejects the request without them.

### PDFs and attachments

*Get PDF* puts the document into a binary field (default `data`) so you can pass it straight
into a Send Email, Google Drive or Write File node.

*Send Email* sends Billomat's own rendered PDF. Use the **Attachments** option to add further
files: it takes a comma-separated list of *input* binary field names, for example
`data, drawing`.

Incoming invoices work the other way round: their **Input Binary Field** option takes a PDF
or image from the incoming item and stores it on the incoming invoice.

## Billomat Trigger

> **Billomat has no API for registering webhooks.** They are configured by hand in the
> Billomat UI, so the trigger node cannot set itself up automatically.

Setup:

1. Add the **Billomat Trigger** node and copy its **Production URL**.
2. In Billomat, open **Settings → Webhooks** and create a webhook with that URL.
3. Set the **format to JSON**. The node cannot read the XML format — Billomat's XML is not
   parsed by n8n and the node will tell you so rather than fail silently.
4. Optionally set a user name and password there. If you do, switch the node's
   **Authentication** to *Basic Auth* and enter the same values in **Billomat Webhook Auth**
   credentials; requests without them are then rejected.
5. Activate the workflow. Test URLs only exist while the canvas is listening, so the URL you
   store in Billomat should be the production one.

### Events

Pick the events to react to under **Events** — all 83 events Billomat documents are listed,
for example `invoice.create`, `invoice.status`, `invoice_payment.create` or `client.update`.
Leave the field empty to accept every event.

Billomat stores **one URL per event**, so a single account can only point a given event at
one workflow. If you need to fan out, trigger once and branch inside n8n.

### Output

By default the node flattens Billomat's envelope:

```json
{
  "event": "invoice.create",
  "resource": "invoice",
  "data": { "id": "1", "invoice_number": "RE123", "...": "..." }
}
```

Set the **Raw Body** option to get the unmodified payload instead, and **Include Headers** to
add the request headers (they carry `x-billomat-webhook-request-id`, which orders events that
were triggered together).

### Retries

Billomat expects a `2xx` response within 10 seconds. On failure it retries after a minute,
an hour and six hours, and then **disables the webhook** and emails the account owner. Events
that do not match your selection are therefore still acknowledged with `200`, they just do
not start the workflow.

## Working with the API

A few Billomat characteristics that show up in the node's output:

- **Numbers arrive as strings.** Billomat's JSON is a conversion of its XML, so `total_gross`
  comes back as `"107.1"`, not `107.1`. Values are passed through unchanged rather than
  guessed at — converting `number_length` or a zero-padded invoice number to a number would
  corrupt it. Cast explicitly where you need to calculate, e.g. `{{ Number($json.total_gross) }}`.
- **Empty fields become `null`.** An unset XML element arrives as an empty object; the node
  turns those into `null` so `{{ $json.contact_id }}` behaves the way you would expect.
- **Lists are flattened.** A *Get Many* returns one n8n item per record, not Billomat's
  `{"clients": {"client": [...]}}` envelope. A single hit is still returned as one item.
- **Dates are sent as dates.** n8n date pickers produce full timestamps; the node trims them
  to `YYYY-MM-DD`, which is what every date field in these resources expects.
- **Booleans and multi-selects are translated.** Toggles become Billomat's `0`/`1` and
  multi-selects become its comma-separated lists.
- **Deleting** a client or supplier only works while no documents reference it. Deleting an
  invoice removes its PDFs, items and comments with it.

Errors come back with Billomat's own message (`Ressource not found`, validation messages and
so on) rather than a bare HTTP status.

## Compatibility

- n8n `1.x` and later
- Node.js `>= 22`

## Development

```bash
npm install      # install dependencies
npm run dev      # start n8n with this node loaded and hot reloading
npm test         # run the test suite
npm run lint     # lint with n8n's community node rules
npm run lint:fix # fix what can be fixed automatically
npm run build    # compile to dist/
```

Layout:

```
credentials/
  BillomatApi.credentials.ts            API key + optional app credentials
  BillomatWebhookAuthApi.credentials.ts basic auth for the trigger
nodes/
  Billomat/
    Billomat.node.ts                    the execute() router
    GenericFunctions.ts                 HTTP, paging, envelope unwrapping
    Resources.ts                        resource → endpoint and JSON key map
    descriptions/                       the UI properties, per resource
  BillomatTrigger/
    BillomatTrigger.node.ts             static webhook + event filter
    events.ts                           the documented event list
test/                                   vitest suite
```

Adding a resource generally means: an entry in `Resources.ts`, a description file, wiring it
into `descriptions/index.ts` and the node's property list, and an option in the **Resource**
dropdown. The `execute()` router handles the standard CRUD operations generically, so most
resources need no changes there at all.

`test/Billomat.node.test.ts` contains structural checks that fail if a resource, operation or
`displayOptions` reference does not line up — they catch most wiring mistakes before n8n does.

## Resources

- [Billomat API documentation](https://www.billomat.com/en/api/)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE)
