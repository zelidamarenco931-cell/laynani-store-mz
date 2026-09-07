# 🔧 Guia de Configuração Stripe - Modo Teste

## 1️⃣ Cartões de Teste para Stripe

Quando está em **modo teste**, use estes cartões:

### ✅ Pagamento Bem-Sucedido
- **Número**: `4242 4242 4242 4242`
- **Validade**: Qualquer data futura (ex: `12/26`)
- **CVC**: Qualquer 3 dígitos (ex: `123`)
- **Nome**: Qualquer nome

### ❌ Pagamento Recusado
- **Número**: `4000 0000 0000 0002`
- **Validade**: Qualquer data futura
- **CVC**: Qualquer 3 dígitos

### 🔐 Autenticação 3D Secure (Requer Confirmação)
- **Número**: `4000 0025 0000 3155`
- **Validade**: Qualquer data futura
- **CVC**: Qualquer 3 dígitos

---

## 2️⃣ Configurar Webhook no Stripe Dashboard

### Passos:
1. Acesse: [Stripe Dashboard](https://dashboard.stripe.com)
2. **Developers** → **Webhooks**
3. Clique em **+ Add Endpoint**
4. Cole a URL da sua função Supabase:
   ```
   https://[seu-supabase-project].supabase.co/functions/v1/handle-stripe-webhook
   ```
5. Selecione os eventos:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.payment_failed`
6. Clique em **Add Endpoint**

### Copiar a Chave Secreta do Webhook
7. Clique no endpoint criado
8. Role para baixo até **Signing secret**
9. Clique em **Reveal** e copie a chave
10. Adicione no seu `.env.local` ou Supabase Secrets:
    ```
    STRIPE_WEBHOOK_SECRET=whsec_xxxxx...
    ```

---

## 3️⃣ Variáveis de Ambiente Necessárias

Adicione no Supabase (Settings → Edge Functions → Secrets):

```env
STRIPE_SECRET_KEY=sk_test_xxxxx...
STRIPE_WEBHOOK_SECRET=whsec_xxxxx...
```

Ou no `.env.local` do seu projeto:
```env
VITE_STRIPE_PUBLIC_KEY=pk_test_xxxxx...
STRIPE_SECRET_KEY=sk_test_xxxxx...
STRIPE_WEBHOOK_SECRET=whsec_xxxxx...
```

---

## 4️⃣ Testar Localmente com Stripe CLI

### Instalar Stripe CLI:
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
choco install stripe-cli

# Linux
curl https://files.stripe.com/stripe-cli/install.sh -s | bash
```

### Autenticar:
```bash
stripe login
```

### Escutar Webhooks Localmente:
```bash
stripe listen --forward-to localhost:3000/functions/v1/handle-stripe-webhook
```

Isso vai gerar uma chave como:
```
whsec_test_xxxxx...
```

Copie e use no seu `.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_test_xxxxx...
```

### Testar um Pagamento:
```bash
stripe trigger checkout.session.completed
```

---

## 5️⃣ Fluxo Completo de Teste

1. **Abra a loja** em `http://localhost:5173`
2. **Adicione produtos ao carrinho**
3. **Vá para checkout**
4. **Selecione "Cartão / PayPal"**
5. **Clique em "Pagar com Cartão"**
6. **Use o cartão de teste**: `4242 4242 4242 4242`
7. **Preencha dados fictícios**:
   - Validade: `12/26`
   - CVC: `123`
   - Nome: `Teste`
8. **Clique em "Pay"**
9. ✅ **Pagamento confirmado!**
10. **Verifique no Admin** se o pedido aparece com status **"paid"**

---

## 6️⃣ Troubleshooting

### "Cartão foi recusado"
- Use o cartão correto: `4242 4242 4242 4242`
- Verifique se está em **modo teste** (Stripe Dashboard → veja o toggle no canto superior)

### Webhook não funciona
- Verifique se o `STRIPE_WEBHOOK_SECRET` está configurado
- Verifique os logs: Stripe Dashboard → **Developers → Webhooks → Logs**
- Use Stripe CLI para testar localmente

### Pedido não aparece no admin após pagamento
- Verifique se o webhook foi recebido (Stripe Dashboard → Webhooks → Logs)
- Verifique os logs da função Supabase
- Confirme que o `order_id` está no metadata

---

## 7️⃣ Ir para Produção

Quando estiver pronto:

1. Mude as chaves para **modo produção**:
   - `sk_live_xxxxx...` (Stripe Secret Key)
   - `pk_live_xxxxx...` (Stripe Public Key)

2. Atualize o Webhook URL para produção:
   ```
   https://[seu-dominio]/functions/v1/handle-stripe-webhook
   ```

3. Remova os cartões de teste da documentação 🔐

---

## 📞 Chaves do Seu Projeto

Encontre suas chaves em:
- **Stripe Dashboard** → **Developers** → **API Keys**

Mantenha-as seguras e nunca as exponha no código do cliente! ✅
