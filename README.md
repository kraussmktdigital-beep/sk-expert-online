[README.md](https://github.com/user-attachments/files/32453924/README.md)
# SK EXPERT — Inteligência Tributária Nacional

Versão com mapa nacional real e base territorial oficial do IBGE.

## O que esta versão adiciona

- Mapa real navegável com Leaflet + OpenStreetMap.
- Busca de qualquer município do Brasil.
- Base territorial oficial do IBGE carregada pelo endpoint `/api/municipios`.
- UFs e Grandes Regiões.
- Regiões Geográficas Imediatas e Intermediárias para cada município.
- Geocodificação sob demanda para localizar o município no mapa.
- Mantém a pesquisa online da Reforma Tributária via OpenAI.

## Base territorial

A fonte é a Divisão Territorial Brasileira / Malha Municipal do IBGE, referência 2025.
O IBGE informa 5.569 municípios, além do Distrito Federal e do Distrito Estadual de Fernando de Noronha; a malha também contempla Regiões Geográficas Imediatas, Regiões Geográficas Intermediárias, UFs, Grandes Regiões e País.

## Render

Build Command:
`npm install`

Start Command:
`npm start`

Variáveis:
- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-5.6-luna`

## Observação

Os dados territoriais oficiais são carregados em tempo de execução a partir do IBGE. Assim, o projeto não precisa armazenar uma cópia pesada da malha geográfica dentro do GitHub.
