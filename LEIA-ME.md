# OpenFinance Hub — pacote FINAL (build validado)

Este zip é o projeto completo. Substitui todos os pacotes anteriores.
Testado: npm install + npm run build passam limpos (24 rotas).

Inclui o fix do erro 504 MIDDLEWARE_INVOCATION_TIMEOUT: o middleware agora
tem timeout de 4s nas chamadas ao Supabase, então nunca mais trava a página.

## Instalar (cmd, na pasta onde está o projeto)

1. Extraia por cima da pasta do projeto (sobrescrevendo tudo)
2. Garanta o .env.local com suas 4 variáveis (URL, ANON_KEY, SERVICE_ROLE_KEY, OPEN_FINANCE_PROVIDER=mock)
3. npm install
4. git add .
5. git commit -m "Pacote final: fix middleware timeout"
6. git push
7. vercel --prod

## Migrations (rode no SQL Editor do Supabase, na ordem, só as que ainda não rodou)
0001_init.sql, 0002_seed_categories.sql, 0003_security_hardening.sql, 0004_installment_purchases.sql

## Variáveis de ambiente na Vercel (Settings > Environment Variables, Production)
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (tipo Config, mantendo o nome NEXT_PUBLIC_),
SUPABASE_SERVICE_ROLE_KEY, OPEN_FINANCE_PROVIDER=mock
