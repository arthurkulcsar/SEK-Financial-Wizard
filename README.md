# SEK Financial Assistant

Aplicativo web de chat com IA para consulta de dados financeiros da SEK.

## Stack
- Next.js 14 (App Router)
- React 18
- TypeScript
- Anthropic API (Claude Sonnet 4)

## Variáveis de ambiente (configurar no Vercel)

- `ANTHROPIC_API_KEY` — sua chave da API Anthropic (formato `sk-ant-...`)
- `APP_PASSWORD` — senha que o time vai usar para acessar o app

## Desenvolvimento local (opcional)

```bash
npm install
# crie um .env.local com as variáveis acima
npm run dev
```

## Deploy no Vercel

1. Suba este repositório no GitHub
2. Vá em vercel.com → Add New Project → importe o repo
3. Em Environment Variables, adicione `ANTHROPIC_API_KEY` e `APP_PASSWORD`
4. Clique em Deploy

## Atualização dos dados financeiros

Os dados ficam em `src/data/financial.json`. Para atualizar:

1. Substitua o arquivo com a nova versão
2. Faça commit no GitHub
3. Vercel faz redeploy automático em ~1 minuto

## Estrutura do projeto

```
src/
├── app/
│   ├── api/chat/route.ts   # Backend: chama API Anthropic
│   ├── globals.css         # Estilos globais
│   ├── layout.tsx          # Layout root
│   └── page.tsx            # Tela principal (login + chat)
└── data/
    └── financial.json      # Dados financeiros extraídos da planilha
```
