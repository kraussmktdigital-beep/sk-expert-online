# SK EXPERT — versão online com pesquisa de Reforma Tributária em tempo real

Esta versão mantém o painel HTML original e adiciona uma camada de IA no servidor para pesquisar a web em tempo real sobre Reforma Tributária, IBS, CBS, regulamentação, cronogramas e impactos práticos.

A chave da API fica somente no servidor (`OPENAI_API_KEY`) e nunca é enviada para o navegador.

## Rodar localmente

Node.js 20+.

```bash
npm start
```

Abra `http://localhost:3000`.

Configure antes a variável `OPENAI_API_KEY`. O modelo padrão é `gpt-5.6-luna`, mas pode ser trocado em `OPENAI_MODEL`.

## API

`POST /api/reforma-tributaria/pesquisar`

Exemplo de corpo:

```json
{"query":"O que mudou recentemente na Reforma Tributária em relação ao IBS e à CBS?"}
```

O retorno contém a resposta gerada, horário da pesquisa e as fontes URL encontradas pela busca web.

## Deploy online

O projeto inclui `render.yaml`. Em uma hospedagem Node.js, configure:

- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-5.6-luna`

Depois use `npm start` como comando de inicialização.

## Observação

O painel original usa uma base comercial estática de cidades/índices embutida no HTML. A nova pesquisa online é um módulo adicional: ela consulta a web no momento em que o usuário clica em “PESQUISAR AGORA” ou “ATUALIZAR”.
