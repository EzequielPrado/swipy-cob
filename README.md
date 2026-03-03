# 🚀 Swipy Cob - Automação de Cobrança White-label

Sistema completo para gestão de cobranças via Pix (Woovi), assinaturas recorrentes e automação de notificações via WhatsApp (Meta API).

## 🛠️ Tech Stack
- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **UI Components:** Shadcn/ui + Lucide Icons
- **Backend/DB:** Supabase (Auth, Database, Edge Functions)
- **Pagamentos:** Woovi (OpenPix)
- **Notificações:** WhatsApp Business API (Meta)

## ⚙️ Variáveis de Ambiente Necessárias (Supabase Secrets)

Configure as seguintes **Secrets** no painel do Supabase:

| Variável | Descrição |
| :--- | :--- |
| `WOOVI_API_KEY` | Sua AppID da Woovi (OpenPix) |
| `WHATSAPP_ACCESS_TOKEN` | Token de acesso da Meta para WhatsApp |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do número de telefone no painel Meta |
| `SMTP_HOSTNAME` | Host do servidor de e-mail |
| `SMTP_PORT` | Porta (465 para SSL, 587 para TLS) |
| `SMTP_USERNAME` | Usuário do SMTP |
| `SMTP_PASSWORD` | Senha do SMTP |

## ⏰ Agendamento Automático (Cron)

Para automatizar o sistema, execute o seguinte SQL no editor do Supabase (substituindo o token pelo seu `service_role` key):

```sql
-- Geração de Assinaturas (09:00 BRT / 12:00 UTC)
select cron.schedule('processar-assinaturas-diarias', '0 12 * * *', $$
  select net.http_post(
    url:='https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/process-recurring-charges',
    headers:='{"Authorization": "Bearer SEU_TOKEN"}'::jsonb
  );
$$);

-- Disparo da Régua de Cobrança (10:00 BRT / 13:00 UTC)
select cron.schedule('disparar-regua-cobranca', '0 13 * * *', $$
  select net.http_post(
    url:='https://mxkorxmazthagjaqwrfk.supabase.co/functions/v1/process-billing-schedule',
    headers:='{"Authorization": "Bearer SEU_TOKEN"}'::jsonb
  );
$$);
```

## 🛡️ Segurança (RLS)
Todas as tabelas possuem **Row Level Security** ativado. Os usuários só podem ver seus próprios clientes e cobranças, exceto os perfis marcados como `is_admin = true`, que possuem visão global.

## 🎨 White-label
O sistema permite que cada lojista configure sua própria logo e cor principal na aba **Personalização**. Esses dados são refletidos automaticamente na tela de checkout pública (`/pagar/:id`).