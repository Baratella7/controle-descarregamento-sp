# Controle de Descarregamento — SP

Sistema web para conferência de descarga de carga com destino a São Paulo (SAO/SP). Compara os volumes previstos por CT-e com os volumes lidos na descarga e aponta faltas, excessos e conflitos.

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

Requer Node.js (ou Bun).

```sh
npm install
npm run dev
```

Testes das regras de cálculo:

```sh
npx vitest run
```

## Tecnologias

React 19, TanStack Start, Vite, Tailwind CSS v4, SheetJS (leitura de planilhas).
