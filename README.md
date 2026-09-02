# OpenFinance Hub — Fase 1 (fundação)

Scaffold inicial do hub financeiro pessoal com arquitetura preparada para Open Finance Brasil.

## O que está pronto nesta fase
- **Banco de dados completo** (`supabase/migrations/0001_init.sql`): todas as entidades do
  escopo (contas, cartões, transações, orçamentos, metas, dívidas, financiamentos,
  investimentos, patrimônio, notificações, auditoria) com Row Level Security por usuário.
- **Camada OpenFinanceProvider** (`src/lib/open-finance/`): interface trocável de provider
  + implementação mock para modo demo. Plugar um provider real (Pluggy, Belvo, etc.) é só
  criar uma classe em `providers/` e registrar em `index.ts` — nada mais no app muda.
- **Auth com Supabase** (login por e-mail/senha).
- **Shell do app**: sidebar com os 16 módulos do menu, layout responsivo, dashboard com
  cards de resumo (patrimônio, saldo, receitas, despesas, investimentos, dívidas, fatura).
- **Aviso honesto**: se `OPEN_FINANCE_PROVIDER` não estiver configurado, o dashboard mostra
  claramente que a integração não está ativa — nunca simula uma conexão bancária real.

## Como rodar

```bash
npm install
cp .env.example .env.local
# preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
# rode a migration no seu projeto Supabase:
#   supabase db push   (ou cole o SQL direto no SQL editor do Supabase)
npm run dev
```

Acesse `http://localhost:3000/login`.

## Próximas fases (ainda não implementadas)

| Fase | Conteúdo |
|---|---|
| 2 | Contas, cartões, central de transações + categorização automática/regras |
| 3 | Orçamentos, metas, dívidas, financiamentos (com simulador de amortização) |
| 4 | Investimentos, patrimônio consolidado, previsão de fluxo de caixa |
| 5 | Insights automáticos, alertas, detecção de gastos anormais, calendário, relatórios (PDF/CSV/Excel) |
| 6 | Modo privacidade, dashboard personalizável, dados demo completos, LGPD (exportar/excluir dados), hardening de segurança, revisão final |

Peça a próxima fase quando quiser continuar — a arquitetura de dados e a camada Open Finance
já foram desenhadas para suportar tudo isso sem retrabalho.
