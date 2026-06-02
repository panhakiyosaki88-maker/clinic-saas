# Module 9 — Pharmacy Inventory

Medicine catalog with a stock ledger, batches/expiry, pricing, and alerts.

## What this module delivers
- **Schema** (`supabase/migrations/0009_pharmacy.sql`):
  - `medicines` — catalog (name, generic, SKU, category, unit), `reorder_level`, purchase/selling
    price, a **cached `stock_quantity`**, active flag, soft delete.
  - `inventory_transactions` — an **append-only ledger** with a signed `change`, reason
    (purchase/dispense/adjustment/expiry/return), `batch_number`, `expiry_date`, `unit_cost`.
  - A trigger keeps `medicines.stock_quantity` in sync with the ledger.
  - RLS gated by `pharmacy.read` / `pharmacy.write`.
- **Data layer**: validations, queries (catalog search, detail, transaction history,
  **low-stock** and **expiring-soon** alerts).
- **Actions**: CRUD medicine; `recordTransaction` derives the signed change from the reason
  (adjustment uses an explicit direction) and **blocks overdrawing stock**.
- **UI**: catalog with low-stock highlighting + an **alerts panel**, new/edit medicine, medicine
  detail with the record-movement form and full ledger. Dashboard gains an **Inventory alerts** card.

## Stock model
```
inventory_transactions (signed ledger)  ──trigger──▶  medicines.stock_quantity (cache)
purchase/return → +qty     dispense/expiry → −qty     adjustment → ±qty (direction)
```
- **Low stock**: `stock_quantity <= reorder_level` (active medicines).
- **Expiring soon**: purchase batches with `expiry_date` within 60 days.

| Decision | Choice | Why |
|---|---|---|
| Stock as a ledger + cache | append-only `inventory_transactions` + trigger | auditable history *and* fast current stock |
| Batch/expiry on transactions | per-purchase fields | matches the spec's 2-table model; powers expiry alerts |
| Overdraw guard | action checks before a removal | stock can't go negative through the UI |

## Verifying locally
1. `supabase db reset` (applies 0001–0009).
2. **Pharmacy → New medicine**; set a reorder level.
3. On the medicine page record a **Purchase** (with batch + expiry) → stock rises; **Dispense** →
   stock falls and is blocked if it would go negative.
4. Drop stock below reorder level → it appears under **Low stock** (catalog + dashboard); a batch
   expiring within 60 days appears under **Expiring soon**.

## Follow-ups
- Link prescription items / billing to `medicines` (auto-dispense + auto-price).
- Per-batch remaining quantity (FEFO) if precise batch depletion is needed.
