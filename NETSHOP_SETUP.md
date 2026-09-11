# 🚀 Guia de Integração Netshop

Documentação completa para integrar e testar o Netshop na Laynani Store.

---

## 1️⃣ Configuração no Supabase

### Adicione a chave da API do Netshop:

**Settings → Edge Functions → Secrets:**

```env
NETSHOP_API_KEY=ns_live_sk_p8ZDed4C_p4SiahrNETFDNsQh6cDAnkWMKG3Hied7aJBUQAhj
```

Ou no `.env.local` do seu projeto:

```env
NETSHOP_API_KEY=ns_live_sk_p8ZDed4C_p4SiahrNETFDNsQh6cDAnkWMKG3Hied7aJBUQAhj
```

---

## 2️⃣ Como Funciona o Netshop

### Fluxo de Pagamento Automático:

1. **Cliente seleciona "Netshop"** no checkout
2. **Sistema cria um pedido** com status `processing`
3. **Função Supabase invoca Netshop API** para criar sessão de pagamento
4. **Cliente é redirecionado** para página segura do Netshop
5. **Múltiplas opções de pagamento disponíveis**:
   - Cartão de crédito
   - Cartão de débito
   - E-wallet
   - Transferência bancária
   - Outros métodos locais
6. **Webhook automático** processa confirmação de pagamento
7. **Pedido status muda para `paid`** automaticamente
8. **Notificação WhatsApp** enviada ao cliente

### Vantagens:

✅ **Pagamento automático** - sem necessidade de comprovante  
✅ **Múltiplas opções** - cliente escolhe seu método preferido  
✅ **Seguro** - certificação PCI-DSS  
✅ **Rápido** - confirmação instantânea  
✅ **Confiável** - Netshop é gateway certificado em Moçambique  

---

## 3️⃣ Configuração de Webhooks

### Netshop Dashboard:

1. Acesse: https://dashboard.netshop.co.mz
2. Vá para: **Settings → Webhooks**
3. Clique em: **Add Webhook**
4. Configure:
   ```
   URL: https://[seu-dominio]/functions/v1/handle-netshop-webhook
   Events: payment.completed, payment.failed, payment.success
   API Key: ns_live_sk_p8ZDed4C_p4SiahrNETFDNsQh6cDAnkWMKG3Hied7aJBUQAhj
   ```
5. Clique em: **Save**

---

## 4️⃣ Estrutura de Dados

### Tabela de Pedidos (atualizada):

```sql
ALTER TABLE orders ADD COLUMN netshop_payment_id TEXT;
```

### Campos de Resposta do Netshop:

```json
{
  "success": true,
  "payment_id": "np_1234567890",
  "payment_url": "https://pay.netshop.co.mz/session/np_1234567890",
  "amount": 1500,
  "currency": "MZN",
  "reference": "order_id_xyz",
  "status": "pending"
}
```

---

## 5️⃣ Testar Localmente

### Com Modo de Desenvolvimento (se disponível):

```bash
# Use a chave de teste do Netshop
NETSHOP_API_KEY=ns_test_sk_xxx...
```

### Fluxo de Teste:

1. **Abra a loja** em `http://localhost:5173`
2. **Adicione produtos ao carrinho**
3. **Vá para checkout**
4. **Selecione "Netshop"**
5. **Clique em "Pagar com Netshop"**
6. **Na página do Netshop, clique em "Testar com Cartão de Teste"**
7. **Use dados fictícios**:
   - Número: `4111 1111 1111 1111`
   - Validade: `12/26`
   - CVC: `123`
8. **Clique em "Confirmar Pagamento"**
9. ✅ **Pagamento confirmado!**
10. **Verifique no Admin** se o pedido aparece com status **"paid"**

---

## 6️⃣ Logs e Troubleshooting

### Verificar Webhooks Recebidos:

**Netshop Dashboard → Webhooks → Logs:**

- Procure pelo `reference` (order_id)
- Verifique status da resposta (200 = sucesso)
- Veja detalhes do evento

### Verificar Logs do Supabase:

**Supabase → Functions → handle-netshop-webhook → Logs:**

- Procure por "Processing Netshop webhook event"
- Verifique se o pedido foi atualizado
- Procure por erros com "Error updating order"

### Problemas Comuns:

#### "payment_url is undefined"
- Verifique se a API key está correta
- Confirme se a conta Netshop está ativa
- Teste novamente com os dados certos

#### Webhook não recebe eventos
- Confirme a URL do webhook está publicada corretamente
- Verifique firewall/CORS
- Teste manualmente: Netshop Dashboard → Webhooks → Send Test

#### Pedido não muda de status
- Verifique logs do Supabase
- Confirme que o `order_id` está no `reference`
- Verifique se `SUPABASE_SERVICE_ROLE_KEY` está configurada

---

## 7️⃣ Monitoramento em Produção

### Variáveis de Ambiente Necessárias:

```env
# Produção
NETSHOP_API_KEY=ns_live_sk_p8ZDed4C_p4SiahrNETFDNsQh6cDAnkWMKG3Hied7aJBUQAhj
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_chave_secreta
```

### Dashboard de Monitoramento:

**Netshop Dashboard:**
- Transações → Filtrar por "Laynani Store"
- Reconciliação → Verificar totais
- Relatórios → Gráficos de vendas

**Supabase:**
- Functions → handle-netshop-webhook → Invocations
- Database → orders → Filtrar por `payment_method = 'netshop'`

### Alertas Recomendados:

1. **Email se webhook falhar** 2x consecutivas
2. **Notificação se pagamento falhar**
3. **Reconciliação diária** de valores

---

## 8️⃣ Fluxo Completo (Visual)

```
Cliente              Loja                 Supabase             Netshop
   │                 │                       │                    │
   │─── Seleciona ───>│                       │                    │
   │   "Netshop"      │                       │                    │
   │                 │─ invoke function ─────>│                    │
   │                 │                       │                    │
   │                 │                       │─ criar sessão ────>│
   │                 │                       │                    │
   │                 │<─ retorna URL ────────│<─ payment_url ────│
   │<─ redireciona ───│                       │                    │
   │                 │                       │                    │
   │─── paga ───────────────────────────────────────────────────>│
   │                 │                       │                    │
   │                 │                       │<─ webhook event ───│
   │                 │                       │                    │
   │                 │<─ atualiza pedido ────│                    │
   │                 │   status = "paid"     │                    │
   │                 │                       │                    │
   │<─ success page ──│                       │                    │
   │                 │                       │                    │
```

---

## 9️⃣ Comparação: Stripe vs Netshop

| Recurso | Stripe | Netshop |
|---------|--------|---------|
| **Automatismo** | ❌ Requer comprovante (manual) | ✅ Automático |
| **Métodos** | 2 (Cartão, PayPal) | 5+ (Cartão, e-wallet, Banco, etc) |
| **Localização** | 🌍 Global | 🇲🇿 Otimizado para Moçambique |
| **Taxa** | 2-3% | 1.5-2% (mais barato) |
| **Suporte** | US/Global | Suporte Local |
| **Documentação** | Melhor | Boa |

---

## 🔟 Próximos Passos

- [ ] Testar pagamento com Netshop
- [ ] Configurar webhooks em produção
- [ ] Treinar suporte em processos Netshop
- [ ] Monitorar primeiras transações
- [ ] Otimizar taxa de conversão

---

**Dúvidas? Contacte suporte Netshop:**
- Email: support@netshop.co.mz
- WhatsApp: +258 XXX XXX XXX
- Dashboard: https://dashboard.netshop.co.mz
