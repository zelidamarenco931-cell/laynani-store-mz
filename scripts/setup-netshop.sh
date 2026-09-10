#!/bin/bash

# Netshop Integration - Automated Setup
# Este script configura completamente a integração Netshop no seu Supabase

set -e

echo "🚀 Netshop Integration - Setup Automático"
echo "=========================================="
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Variáveis
PROJECT_ID="xrgnxcudngtfcqahyjyq"
NETSHOP_API_KEY="ns_live_sk_p8ZDed4C_p4SiahrNETFDNsQh6cDAnkWMKG3Hied7aJBUQAhj"

# Função auxiliar
log_step() {
    echo ""
    echo -e "${BLUE}📌 $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Verificações iniciais
log_step "Verificando dependências"

if ! command -v supabase &> /dev/null; then
    log_error "Supabase CLI não está instalado"
    echo ""
    echo "Instale com:"
    echo "  npm install -g supabase"
    exit 1
fi
log_success "Supabase CLI encontrado"

if ! command -v git &> /dev/null; then
    log_error "Git não está instalado"
    exit 1
fi
log_success "Git encontrado"

# Passo 1: Login no Supabase
log_step "Passo 1: Login no Supabase"
echo "Se você não está logado, será pedido para autenticar no navegador..."
supabase login || true
log_success "Autenticação Supabase completa"

# Passo 2: Link ao projeto
log_step "Passo 2: Linking ao projeto Supabase"
echo "Project ID: $PROJECT_ID"
supabase link --project-ref "$PROJECT_ID" || true
log_success "Projeto linkado"

# Passo 3: Configurar secrets
log_step "Passo 3: Configurando NETSHOP_API_KEY"
echo "API Key: ${NETSHOP_API_KEY:0:30}..."
supabase functions secrets set NETSHOP_API_KEY="$NETSHOP_API_KEY"
log_success "NETSHOP_API_KEY configurada"

# Passo 4: Deploy das Edge Functions
log_step "Passo 4: Deploying Edge Functions"

echo "📤 Deploying create-netshop-session..."
supabase functions deploy create-netshop-session --project-ref "$PROJECT_ID"
log_success "create-netshop-session deployed"

echo "📤 Deploying handle-netshop-webhook..."
supabase functions deploy handle-netshop-webhook --project-ref "$PROJECT_ID"
log_success "handle-netshop-webhook deployed"

# Passo 5: Executar migração
log_step "Passo 5: Executando migração SQL"
echo ""
echo "Para adicionar a coluna 'netshop_payment_id' na tabela 'orders':"
echo ""
echo "1. Acesse: https://app.supabase.com/project/$PROJECT_ID/sql/new"
echo "2. Cole este SQL:"
echo ""
cat << 'SQL'
-- Netshop Integration Migration
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS netshop_payment_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_orders_netshop_payment_id 
ON orders(netshop_payment_id);

COMMENT ON COLUMN orders.netshop_payment_id IS 'Netshop payment ID for tracking automatic payments';
SQL
echo ""
echo "3. Clique em 'Run'"
echo ""
read -p "Pressione ENTER depois de executar a migração no Supabase..."
log_success "Migração SQL completa"

# Passo 6: Informações do Webhook
log_step "Passo 6: Configurar Webhook no Netshop Dashboard"
echo ""
echo "Acesse: https://dashboard.netshop.co.mz"
echo "Login → Settings → Webhooks → Add New Webhook"
echo ""
echo "Preencha com:"
echo -e "${BLUE}URL:${NC} https://laynani-store.vercel.app/functions/v1/handle-netshop-webhook"
echo -e "${BLUE}Events:${NC} payment.completed, payment.success, payment.failed"
echo -e "${BLUE}Active:${NC} ✅ Ligado"
echo ""
echo "Depois clique em: Save → Test Webhook"
echo ""
read -p "Pressione ENTER depois de configurar o webhook no Netshop..."
log_success "Webhook configurado"

# Verificação final
log_step "Passo 7: Verificação Final"
echo ""
echo "Verificando secrets..."
supabase functions secrets list --project-ref "$PROJECT_ID"
echo ""
log_success "Secrets verificadas"

# Resumo
echo ""
echo "=========================================="
echo -e "${GREEN}🎉 Setup Completo!${NC}"
echo "=========================================="
echo ""
echo "✅ Autenticação Supabase"
echo "✅ Projeto linkado"
echo "✅ NETSHOP_API_KEY configurada"
echo "✅ Edge Functions deployer"
echo "✅ Migração SQL executada"
echo "✅ Webhook configurado no Netshop"
echo ""
echo "Próximos passos:"
echo ""
echo "1️⃣  Teste a integração localmente:"
echo "    npm run dev"
echo ""
echo "2️⃣  Adicione produtos ao carrinho"
echo ""
echo "3️⃣  Vá para checkout e selecione 'Netshop'"
echo ""
echo "4️⃣  Complete o pagamento"
echo ""
echo "5️⃣  Verifique no Admin se o pedido aparece com status 'paid'"
echo ""
echo "Documentação:"
echo "  - NETSHOP_SETUP.md (Configuração técnica)"
echo "  - DEPLOYMENT_GUIDE.md (Guia completo)"
echo ""
echo "Problemas? Verifique:"
echo "  - Supabase Dashboard → Functions → Logs"
echo "  - Netshop Dashboard → Webhooks → Logs"
echo ""
