alter table transactions add column if not exists installment_group_id uuid;
create index if not exists idx_transactions_installment_group on transactions(installment_group_id);
