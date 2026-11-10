# Controle de Descarregamento SP

Desenvolvido e mantido por **Baratella Dev**.

Sistema web para conferência de descarga de carga com destino a São Paulo (SAO/SP). Compara os volumes previstos por CT-e com os volumes lidos na descarga e aponta faltas, excessos e conflitos.

O objetivo é conferir todo volume de carga com destino a São Paulo na descarga.

## O que o sistema faz

- **Importar Planilha**: lê arquivos `.xlsx`, `.xls` ou `.csv` (padrão até 25 MB / 200.000 linhas, ajustável até 1.000.000) e reconhece as colunas automaticamente (CT-e, Trecho, Manifesto/MAN, volumes previstos e lidos).
- **Destino pelo Trecho**: o destino é o último segmento do trecho (ex.: `CPQ/SAO` → `SAO`).
- **Origem pelo Manifesto**: a origem é o prefixo inicial do manifesto (ex.: `SJ001372E` → `SJ`, `CP…` → Campinas).
- **Dashboard**: CT-es únicos, completos, incompletos, volumes previstos, lidos, faltantes e percentual de conferência.
- **Conferência**: tabela de CT-es com manifesto, origem e situação.
- **Divergências**: CT-es incompletos, sem leitura, com leitura excedente ou com leituras conflitantes.
- **Auditoria**: resolução manual de conflitos e duplicatas.
- **Por Carreta**: filtro por origem/manifesto, comparativo, gráfico e exportações.
- **Exportações** em Excel/CSV com proteção contra injeção de fórmulas.

## Privacidade

A planilha é processada **somente no navegador**. Os dados operacionais ficam na memória da página e não são enviados nem salvos. Ao recarregar a página é preciso importar novamente. Apenas configurações (destinos equivalentes a SP, nomes de origens) ficam no navegador.

## Como usar

1. Abra **Importar Planilha** e selecione o arquivo.
2. Confira o mapeamento das colunas e clique em **Analisar descarregamento**.
3. Veja os resultados no **Dashboard**, **Conferência** e **Divergências**.
4. Use o filtro de origem ou a página **Por Carreta** para analisar cada carreta.
5. Resolva conflitos em **Auditoria** e exporte os relatórios.

## Rodando localmente

Requer Node.js 22.12+ (ou 24+) e Bun para instalar as versões fixadas em `bun.lock`.

```sh
bun install --frozen-lockfile
npm run dev
```

O servidor de desenvolvimento atende em `http://localhost:8080`.

Verificações:

```sh
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## Build e execução em produção

A configuração usa diretamente os plugins oficiais do Vite, React, TanStack Start,
Tailwind CSS e Nitro. O build padrão gera um servidor Node.js independente:

```sh
npm run build
node .output/server/index.mjs
```

O servidor usa a porta 3000 por padrão, configurável pela variável `PORT`.
Para outras hospedagens, configure um preset compatível do Nitro pela variável
`NITRO_PRESET` ao compilar (por exemplo, `cloudflare-module` para Cloudflare Workers).
Os arquivos gerados são específicos do preset e devem ser publicados conforme a
hospedagem escolhida.

## Publicação na Vercel

Importe este repositório na Vercel usando Node.js 24.x e a raiz do projeto.
O arquivo `vercel.json` configura a instalação com o lockfile do Bun e o build
com o preset `vercel` do Nitro, que gera a Build Output API em `.vercel/output`.
Mantenha o Output Directory sem substituição manual e não use `dist` como uma
pasta de site estático: a aplicação utiliza TanStack Start com SSR.

Para verificar esse build localmente:

```sh
NITRO_PRESET=vercel npm run build
```

A importação e a análise dos arquivos continuam ocorrendo somente no navegador.
A verificação de lint exige zero erros e zero avisos.

## Tecnologias

React 19, TanStack Start, Vite, Tailwind CSS v4, SheetJS (leitura de planilhas).
