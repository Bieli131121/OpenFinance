-- Categorias padrão do sistema (user_id nulo = visível para todos).
-- Idempotente: rodar de novo não duplica (antes, `on conflict do nothing` sem
-- índice único não protegia nada e cada execução criava categorias repetidas).
insert into transaction_categories (user_id, name, icon, kind)
select null, v.name, v.icon, v.kind
from (values
  ('Salário',          '💰', 'income'),
  ('Freelance',        '💼', 'income'),
  ('Investimentos',    '📈', 'income'),
  ('Outros (receita)', '➕', 'income'),
  ('Alimentação',      '🍽️', 'expense'),
  ('Mercado',          '🛒', 'expense'),
  ('Transporte',       '🚗', 'expense'),
  ('Moradia',          '🏠', 'expense'),
  ('Saúde',            '💊', 'expense'),
  ('Educação',         '📚', 'expense'),
  ('Lazer',            '🎮', 'expense'),
  ('Assinaturas',      '📺', 'expense'),
  ('Academia',         '🏋️', 'expense'),
  ('Vestuário',        '👕', 'expense'),
  ('Cartão',           '💳', 'expense'),
  ('Outros (despesa)', '➖', 'expense')
) as v(name, icon, kind)
where not exists (
  select 1 from transaction_categories c
  where c.user_id is null and lower(btrim(c.name)) = lower(btrim(v.name)) and c.kind = v.kind
);
