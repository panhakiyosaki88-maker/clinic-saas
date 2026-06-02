# Module 10 — Billing System

Invoices with line items, payments (Cash / Bank Transfer / KHQR), and printable
invoice & receipt documents.

## What this module delivers
- **Schema** (`supabase/migrations/0010_billing.sql`):
  - `invoices` (auto `INV######`, status, subtotal/discount/tax/total/amount_paid/balance, soft delete),
    `invoice_items` (**generated `line_total`**), `payments` (auto `RCP######`, method, reference).
  - **Triggers** keep everything consistent: line items → `subtotal`; payments → `amount_paid`;
    a BEFORE trigger derives `total`, `balance` and `status` (unpaid → partially_paid → paid).
  - RLS gated by `billing.read` / `billing.write`.
- **Data layer**: validations, queries (list, detail with items+payments, patient invoices,
  outstanding).
- **Actions**: create invoice (header + items, atomic), record payment (won't exceed balance),
  void. Creating one appends an `invoice` patient-timeline event.
- **UI**: invoice list (status-coloured), invoice form (item repeater + discount/tax with a **live
  total**), printable **invoice** + **receipt** documents, record-payment form. Patient profile gets
  an invoices section + **Create invoice**; dashboard gains an **Outstanding invoices** card.

## Money flow
```
invoice_items ─(trigger)→ invoices.subtotal
payments      ─(trigger)→ invoices.amount_paid
                 └→ total = subtotal − discount + tax ; balance = total − amount_paid
                 └→ status: unpaid | partially_paid | paid   (cancelled is sticky)
```

| Decision | Choice | Why |
|---|---|---|
| Totals | DB triggers, not app math | always correct regardless of where rows change |
| `line_total` | generated column | single source of truth per line |
| Payment methods | cash / bank_transfer / **khqr** | matches the target market (Cambodia) |
| Invoice/receipt PDF | browser print views | reuses the shared `PrintButton` print pattern |
| Void | sticky `cancelled` status | keeps the record + receipts for audit |

## Verifying locally
1. `supabase db reset` (applies 0001–0010).
2. **Billing → New invoice**: add line items, a discount/tax → totals compute live; save → `INV000001`.
3. Record a partial payment (e.g. KHQR) → status flips to *partially paid*, balance drops; pay the
   rest → *paid*. Payments can't exceed the balance.
4. **Invoice PDF** and **Receipt** print cleanly; the dashboard shows outstanding totals.

## Follow-ups
- **KHQR**: generate a real Bakong QR / verify payment via webhook (currently the method + reference
  are recorded manually).
- Pull invoice lines from prescriptions / pharmacy dispenses and consultation fees automatically.
- Revenue-over-time + tax reports (Reports module).
