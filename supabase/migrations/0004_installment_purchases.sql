-- Migration 0004: agrupamento de compras parceladas no cartão.
-- As colunas installment_number/installment_total já existem desde a
-- migration 0001; falta um identificador comum para agrupar as N parcelas
-- de UMA MESMA compra (ex: "Notebook 12x" gera 12 linhas em transactions,
-- todas com o mesmo installment_group_id).

alter table transactions
  add column if not exists installment_group_id uuid;

create index if not exists idx_transactions_installment_group on transactions(installment_group_id);
