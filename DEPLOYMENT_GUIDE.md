# 🚀 Guia de Deployment - Integração Netshop

Instruções completas para colocar a integração Netshop em produção.

---

## 📋 Pré-Requisitos

- ✅ Conta Netshop ativa (https://netshop.co.mz)
- ✅ API Key Netshop: `ns_live_sk_p8ZDed4C_p4SiahrNETFDNsQh6cDAnkWMKG3Hied7aJBUQAhj`
- ✅ Projeto Supabase configurado
- ✅ Domínio em produção (ex: https://laynani-store.vercel.app)

---

## 🔧 Passo 1: Configurar Variáveis de Ambiente (Supabase)

### Acesse o Supabase Dashboard:

1. Vá para: **https://app.supabase.com**
2. Selecione seu projeto
3. Clique em: **Settings** → **Edge Functions**
4. Clique em: **Secrets**
5. Clique em: **New secret**

### Adicione a chave:

```
Name: NETSHOP_API_KEY
Value: ns_live_sk_p8ZDed4C_p4SiahrNETFDNsQh6cDAnkWMKG3Hied7aJBUQAhj
```

6. Clique em: **Save**

✅ **Concluído!** A chave está segura e pronta para usar.

---

## 🗄️ Passo 2: Executar Migração SQL

### No Supabase SQL Editor:

1. Vá para: **SQL Editor** (menu lateral esquerdo)
2. Clique em: **New Query**
3. Cole o seguinte SQL:

```sql
-- Netshop Integration Migration
-- Add netshop_payment_id column to orders table

BEGIN;

-- Add netshop_payment_id column if it doesn't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS netshop_payment_id TEXT UNIQUE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_netshop_payment_id 
ON orders(netshop_payment_id);

-- Add comment
COMMENT ON COLUMN orders.netshop_payment_id IS 'Netshop payment ID for tracking automatic payments';

COMMIT;
```

4. Clique em: **Run**
5. Verifique a mensagem: **Query executed successfully** ✅

---

## 🔗 Passo 3: Deploy das Edge Functions

### Opção A: Deploy via Supabase CLI (Recomendado)

```bash
# 1. Instale o CLI (se não tiver)
npm install -g supabase

# 2. Faça login
supabase login

# 3. Link seu projeto
supabase link --project-ref seu_project_id

# 4. Deploy as functions
supabase functions deploy create-netshop-session
supabase functions deploy handle-netshop-webhook
```

### Opção B: Deploy Manual (via Supabase Dashboard)

1. Vá para: **Functions** (menu lateral)
2. Clique em: **Create a new function**
3. Nome: `create-netshop-session`
4. Cole o conteúdo de: `supabase/functions/create-netshop-session/index.ts`
5. Clique em: **Deploy**
6. Repita para: `handle-netshop-webhook`

✅ **Concluído!** As functions estão vivas.

---

## 🪝 Passo 4: Configurar Webhooks no Netshop Dashboard

### Acesse o Netshop Dashboard:

1. Vá para: **https://dashboard.netshop.co.mz**
2. Faça login com sua conta
3. Clique em: **Settings** → **Webhooks**
4. Clique em: **Add New Webhook**

### Configure o Webhook:

```
URL: https://seu-dominio.com/functions/v1/handle-netshop-webhook
Events: payment.completed, payment.success, payment.failed
Active: ✅ Ligado
API Key: ns_live_sk_p8ZDed4C_p4SiahrNETFDNsQh6cDAnkWMKG3Hied7aJBUQAhj
```

**Exemplo de URL completa:**
```
https://laynani-store.vercel.app/functions/v1/handle-netshop-webhook
```

5. Clique em: **Save Webhook**
6. Clique em: **Test Webhook** (para verificar)
7. Verifique se recebeu resposta: `{"success": true}`

✅ **Concluído!** Webhook configurado.

---

## 🚀 Passo 5: Fazer Deploy da Aplicação

### Vercel (Se estiver usando):

```bash
# 1. Commit das mudanças
git add .
git commit -m "feat: Netshop integration ready for production"

# 2. Push para feature branch
git push origin feature/netshop-integration

# 3. Crie Pull Request no GitHub
# Vá para: https://github.com/zelidamarenco931-cell/laynani-store-mz
# Clique em: "New Pull Request"
# Selecione: feature/netshop-integration → main
# Preencha descrição
# Clique em: "Create Pull Request"

# 4. Vercel fará deploy automático
# Aguarde status: "All checks passed"

# 5. Faça Merge
# Clique em: "Merge pull request"

# 6. Vercel fará deploy em produção automaticamente
```

✅ **Concluído!** App em produção.

---

## ✅ Passo 6: Teste Completo em Produção

### A. Teste de Pagamento Bem-Sucedido:

1. Abra: **https://laynani-store.vercel.app**
2. Adicione produtos ao carrinho
3. Vá para: **Checkout**
4. Preencha dados de entrega
5. Selecione: **Netshop**
6. Clique em: **Pagar com Netshop**
7. Na página Netshop, clique em: **Pagar**
8. Use dados de teste:
   - Cartão: `4111 1111 1111 1111`
   - Validade: `12/26`
   - CVC: `123`
9. Clique em: **Confirmar Pagamento**
10. Verifique:
    - ✅ Redirecionado para página de sucesso
    - ✅ Pedido aparece no Admin com status **"paid"**
    - ✅ Notificação WhatsApp recebida

### B. Teste de Pagamento Falhado:

1. Repita passos 1-6
2. Use cartão inválido: `4000 0000 0000 0002`
3. Verifique:
    - ✅ Mensagem de erro no Netshop
    - ✅ Pedido no Admin com status **"failed"**
    - ✅ Nenhuma notificação enviada

### C. Teste de Webhook:

1. No Netshop Dashboard → **Webhooks** → **Logs**
2. Procure pelo teste que acabou de fazer
3. Verifique:
    - ✅ Status: `200 OK`
    - ✅ Response: `{"success": true}`

---

## 🐛 Troubleshooting Produção

### "Erro: Payment URL undefined"

**Solução:**
```bash
# 1. Verifique a API key no Supabase
Supabase → Settings → Edge Functions → Secrets
✓ Confirme que NETSHOP_API_KEY está presente

# 2. Teste a function manualmente
Supabase → Functions → create-netshop-session → Invocations
✓ Clique em "Invoke" e verifique logs

# 3. Verifique se a conta Netshop está ativa
Netshop Dashboard → Account Status
✓ Deve estar "Active"
```

### "Webhook não recebe eventos"

**Solução:**
```bash
# 1. Verifique a URL do webhook
Netshop Dashboard → Settings → Webhooks
✓ URL deve estar: https://seu-dominio.com/functions/v1/handle-netshop-webhook

# 2. Teste o webhook manualmente
Netshop Dashboard → Webhooks → [seu webhook] → Test
✓ Deve retornar: {"success": true}

# 3. Verifique logs do Supabase
Supabase → Functions → handle-netshop-webhook → Invocations
✓ Procure por "Processing Netshop webhook event"
```

### "Pedido não muda de status para 'paid'"

**Solução:**
```bash
# 1. Verifique logs do Supabase
Supabase → Functions → handle-netshop-webhook → Invocations
✓ Procure por erros com "Error updating order"

# 2. Verifique se a coluna existe
Supabase → Database → Tables → orders
✓ Deve ter coluna: netshop_payment_id

# 3. Execute a migração novamente
SQL Editor → Copie o SQL da migração → Run
✓ Deve retornar: Query executed successfully
```

---

## 📊 Monitoramento em Produção

### Dashboard Netshop:

1. Vá para: **https://dashboard.netshop.co.mz**
2. Clique em: **Transactions**
3. Filtre por: **Laynani Store**
4. Veja:
   - Total de transações
   - Valores pagos
   - Status de cada pagamento

### Dashboard Supabase:

1. Vá para: **Supabase Dashboard**
2. Clique em: **Database** → **orders**
3. Filtre por: `payment_method = 'netshop'`
4. Veja:
   - Pedidos com Netshop
   - Status dos pagamentos
   - `netshop_payment_id`

### Alertas Recomendados:

Adicione alertas para:
- ❌ Webhook falha 2x consecutivas
- ❌ Pagamento falha
- ✅ Grande valor de transação (>50.000 MZN)

---

## 🎉 Checklist Final

Antes de considerar pronto:

- [ ] API key adicionada no Supabase
- [ ] Migração SQL executada com sucesso
- [ ] Edge Functions deployer
- [ ] Webhook configurado no Netshop
- [ ] App deployer em produção
- [ ] Teste de pagamento bem-sucedido ✅
- [ ] Teste de pagamento falhado ✅
- [ ] Webhook recebendo eventos ✅
- [ ] Pedido muda para status "paid" ✅
- [ ] Notificação WhatsApp enviada ✅
- [ ] Documentação atualizada
- [ ] Suporte treinado

---

## 📞 Suporte Netshop

Caso tenha dúvidas ou problemas:

- **Email:** support@netshop.co.mz
- **Dashboard:** https://dashboard.netshop.co.mz
- **Documentação:** https://docs.netshop.co.mz

---

## 🔄 Rollback (Se necessário)

Se precisar voltar para Stripe:

```bash
# 1. Volte para branch anterior
git checkout main

# 2. Remova as funções Netshop
rm supabase/functions/create-netshop-session
rm supabase/functions/handle-netshop-webhook

# 3. Remova a coluna (opcional)
# Supabase → SQL Editor → ALTER TABLE orders DROP COLUMN netshop_payment_id;

# 4. Deploy novamente
git add .
git commit -m "chore: Rollback Netshop integration"
git push origin main
```

---

## ✨ Parabéns! 🎊

Sua loja agora tem **pagamento automático com Netshop**!

**Benefícios:**
- ✅ Pagamento automático (sem comprovante manual)
- ✅ Múltiplas opções de pagamento
- ✅ Confirmação instantânea
- ✅ Seguro e certificado
- ✅ Suporte local
- ✅ Taxa mais baixa que Stripe

---

**Próximo passo:** Monitore as primeiras transações e aproveite o aumento de conversão! 🚀
