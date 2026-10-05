# Marketing: anúncios no Facebook e Instagram

## Fluxo
1. Admin > **Marketing & Patrocínio** > **Nova Campanha** (escolha o produto, plataforma e orçamento).
2. Na linha da campanha clique no ícone **📣 Anúncio**: o sistema gera título, texto, imagem e o link com UTMs que abre directamente a página do produto.
3. Clique em **Publicar no Gestor de Anúncios da Meta**, crie o anúncio (Facebook + Instagram) e cole texto, título e link. Botão: *Comprar agora*.
4. Atualize o "Gasto" da campanha no painel para acompanhar o orçamento.

## Configuração (uma vez)
- No Gestor de Eventos da Meta crie um **Pixel** e copie o ID.
- No Vercel (Settings > Environment Variables) defina `VITE_META_PIXEL_ID` e, se quiser, `VITE_SITE_URL`. Faça novo deploy.
- Eventos enviados: `PageView`, `ViewContent` e `AddToCart` (moeda MZN). Os UTMs/`fbclid` ficam guardados no navegador (`laynani_attribution`).

## Verificar
- Extensão *Meta Pixel Helper* (Chrome) para confirmar os eventos.
- *Depurador de Partilhas* da Meta (developers.facebook.com/tools/debug) com o link de um produto: deve mostrar nome, foto e preço (vem de `api/product-og.ts`).

## Próximos passos sugeridos
- Evento `InitiateCheckout` e `Purchase` (página de pedido concluído) para otimizar anúncios por vendas.
- Gravar `utm_*` no pedido para ver vendas por campanha no painel.
- Aviso de cookies/consentimento, se aplicável ao seu público.
