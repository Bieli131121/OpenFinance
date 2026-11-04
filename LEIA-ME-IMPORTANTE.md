# ⚠️ ATUALIZAÇÃO — correções de segurança/consistência + leitura de boleto por foto

## Migrations novas (rodar no SQL Editor do Supabase, nesta ordem, depois da 0004)
5. `supabase/migrations/0005_security_and_transactional_balance.sql`
6. `supabase/migrations/0006_payable_bills.sql`

Ambas podem ser executadas mais de uma vez sem dano. A 0005 também **remove categorias duplicadas**
já existentes (reapontando transações/orçamentos para a categoria que fica) antes de criar a regra de unicidade.
O `0002_seed_categories.sql` foi reescrito para ser idempotente.

## O que mudou
1. **Banco**: RLS ligado em `sync_logs`, `transaction_subcategories` e `app_encryption_keys`; `audit_logs` e
   `rate_limit_log` sem UPDATE/DELETE para o usuário; funções `encrypt_of_token`/`decrypt_of_token` só para
   `service_role`; categorias únicas por (usuário, nome, tipo).
2. **Next**: `allowedOrigins: ['*']` removido (reativa a proteção CSRF das Server Actions); Next 14.2.35
   (última 14.x); cabeçalhos de segurança. Domínios extras: variável `SERVER_ACTIONS_ALLOWED_ORIGINS`.
3. **Datas**: todos os filtros de mês têm limite superior; cálculo de mês no fuso de Brasília (`src/lib/date.ts`);
   parcelas sem `setMonth` (31/01 → 28/02 → 31/03); financiamentos entram no patrimônio e no card de dívidas.
4. **Saldo/fatura transacionais**: funções SQL (`create_transaction_with_balance`, `update_…`, `delete_…`,
   `pay_invoice`, `pay_bill`) com lock da conta — antes eram várias chamadas soltas.
5. **App**: `error.tsx`/`global-error.tsx`/`not-found.tsx`, menu mobile, página raiz (`/` → dashboard),
   página `/open-finance` (status; o fluxo de conexão real continua dependendo de um provider).
6. **NOVO — Boletos** (`/boletos`): foto ou linha digitável → vencimento, valor e categoria → você confere → salva.
   Vira conta a pagar (calendário, alertas, fluxo de caixa) e "Marcar como pago" lança a despesa e baixa o saldo.

## Para a leitura por FOTO funcionar
Defina `ANTHROPIC_API_KEY` no servidor (Vercel → Settings → Environment Variables). A imagem é enviada à API da
Anthropic só para a leitura e **não é armazenada**. Sem a chave, a tela continua aceitando a linha digitável colada.
O valor e o vencimento do código de barras (dígitos verificadores válidos) têm prioridade sobre o que a IA leu da foto.

## Testes
`npm test` (parser de boleto, datas, parcelas, categorias) e `npm run typecheck`.

---

# ⚠️ LEIA ISSO PRIMEIRO — Pacote Consolidado Final

Este zip substitui TODOS os pacotes de fase anteriores (fase2 a fase12).
Ele já tem tudo mesclado corretamente e o build foi **testado e validado**
aqui antes de te enviar — não é mais preciso ir aplicando fase por fase.

## Por que isso existe

Durante as fases anteriores, alguns pacotes intermediários acabaram não
sendo copiados pra sua pasta local (Fases 6, 7 e 11 principalmente), o que
causou os erros de "Module not found" que você viu. Esse pacote resolve
isso de uma vez: é o estado final e completo do projeto, com todas as 12
fases + a correção de tipagem do `server.ts` que tinha ficado pra trás lá
do começo.

## Como instalar (substitui a pasta inteira)

1. **Feche o VS Code / qualquer editor** com a pasta do projeto aberta
2. Apague a pasta antiga do projeto (ou renomeie, por segurança):
   ```powershell
   Rename-Item "C:\Users\Eluana\Desktop\openfinance-hub\openfinance-hub" "openfinance-hub-OLD"
   ```
3. Extraia este zip para o lugar da pasta antiga:
   ```powershell
   Expand-Archive -Path "C:\Users\Eluana\Downloads\openfinance-hub-FINAL.zip" -DestinationPath "C:\Users\Eluana\Desktop\openfinance-hub\openfinance-hub" -Force
   ```
4. **Copie de volta o seu `.env.local`** da pasta antiga (ele tem suas
   credenciais reais do Supabase, não veio nesse zip por segurança):
   ```powershell
   Copy-Item "C:\Users\Eluana\Desktop\openfinance-hub-OLD\.env.local" "C:\Users\Eluana\Desktop\openfinance-hub\openfinance-hub\.env.local"
   ```
5. Entre na pasta e reinstale as dependências do zero:
   ```powershell
   cd C:\Users\Eluana\Desktop\openfinance-hub\openfinance-hub
   Remove-Item -Recurse -Force node_modules, .next -ErrorAction SilentlyContinue
   npm install
   ```

## Migrations do banco — rode TODAS, em ordem, se ainda não rodou

No SQL Editor do Supabase, na ordem exata:
1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_seed_categories.sql`
3. `supabase/migrations/0003_security_hardening.sql`
4. `supabase/migrations/0004_installment_purchases.sql`

Se você já rodou alguma antes, pode pular — rodar de novo só vai dar erro
de "já existe" (inofensivo), mas o mais seguro é conferir no Table Editor
quais tabelas/colunas já existem antes de rodar de novo.

## Subir pro Git e fazer deploy

```powershell
git add .
git commit -m "Consolidacao final: fases 1-12 mescladas e build validado"
git push
vercel --prod
```

## O que já foi validado por mim antes de mandar

✅ `npm install` completo sem erros
✅ `npm run build` completo, as 24 rotas compilando (incluindo `/api/*`)
✅ Nenhum "Module not found"
✅ Nenhum erro de tipagem TypeScript

O que eu **não** consigo validar sem suas credenciais reais: se as
migrations rodam sem erro no seu banco Supabase específico, e se o app
funciona corretamente em runtime (login, criar dados, etc.) — isso só
dá pra confirmar testando de verdade depois do deploy.
