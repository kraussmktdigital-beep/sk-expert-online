import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = __dirname;
const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-luna';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function buildPrompt(query) {
  return `Você é o módulo de pesquisa em tempo real do SK EXPERT, uma plataforma brasileira de inteligência tributária.\n\n` +
`Pesquise na web agora sobre Reforma Tributária brasileira e responda em português do Brasil. Priorize fontes oficiais e legislação vigente, especialmente gov.br, Receita Federal, Planalto, Câmara dos Deputados, Senado Federal e CONFAZ, mas use também fontes jornalísticas e técnicas confiáveis quando ajudarem a contextualizar fatos recentes.\n\n` +
`Consulta do usuário: ${query}\n\n` +
`Data/hora atual do servidor: ${new Date().toISOString()}\n\n` +
`Regras: confirme datas e vigência quando encontradas; diferencie norma publicada de proposta, projeto, consulta pública ou notícia; não invente números, alíquotas, datas ou obrigações; destaque incertezas. Entregue um resumo objetivo, impactos práticos para empresas e pontos de atenção. Inclua referências no texto quando a busca fornecer citações.`;
}

function extractSources(response) {
  const found = new Map();

  for (const item of response?.output || []) {
    if (item?.type !== 'message') continue;

    for (const content of item.content || []) {
      for (const ann of content.annotations || []) {
        if (ann?.type === 'url_citation' && ann.url) {
          found.set(ann.url, {
            title: ann.title || ann.url,
            url: ann.url
          });
        }
      }
    }
  }

  return [...found.values()].slice(0, 10);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;

    if (size > 64 * 1024) {
      throw new Error('Payload muito grande.');
    }

    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf8');
}

async function searchReforma(query) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',

    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },

    body: JSON.stringify({
      model: MODEL,

      tools: [
        {
          type: 'web_search',
          search_context_size: 'medium'
        }
      ],

      reasoning: {
        effort: 'low'
      },

      max_output_tokens: 6000,

      input: buildPrompt(query)
    })
  });

  const raw = await response.text();

  let data;

  try {
    data = JSON.parse(raw);
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      `OpenAI respondeu HTTP ${response.status}`;

    const err = new Error(message);
    err.status = response.status;

    throw err;
  }

  return data;
}

async function serveStatic(req, res) {
  let pathname = decodeURIComponent(
    new URL(req.url, 'http://localhost').pathname
  );

  if (pathname === '/') {
    pathname = '/index.html';
  }

  const safe = path
    .normalize(pathname)
    .replace(/^([.][.][/\\])+/, '');

  const file = path.join(PUBLIC_DIR, safe);

  try {
    const stat = await fs.stat(file);

    if (!stat.isFile()) {
      throw new Error('not file');
    }

    const ext = path.extname(file).toLowerCase();

    res.writeHead(200, {
      'Content-Type':
        MIME[ext] || 'application/octet-stream',

      'Cache-Control':
        ext === '.html'
          ? 'no-cache'
          : 'public, max-age=3600'
    });

    res.end(await fs.readFile(file));
  } catch {
    const index = await fs.readFile(
      path.join(PUBLIC_DIR, 'index.html')
    );

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    });

    res.end(index);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(
      req.url,
      `http://${req.headers.host || 'localhost'}`
    );

    // STATUS DA API
    if (
      req.method === 'GET' &&
      url.pathname === '/api/health'
    ) {
      return sendJson(res, 200, {
        ok: true,
        configured: Boolean(process.env.OPENAI_API_KEY),
        model: MODEL,
        time: new Date().toISOString()
      });
    }

    // PESQUISA ONLINE DA REFORMA TRIBUTÁRIA
    if (
      req.method === 'POST' &&
      url.pathname ===
        '/api/reforma-tributaria/pesquisar'
    ) {
      if (!process.env.OPENAI_API_KEY) {
        return sendJson(res, 503, {
          error:
            'OPENAI_API_KEY não configurada no servidor. Copie .env.example para .env e informe sua chave.'
        });
      }

      const raw = await readBody(req);

      let body;

      try {
        body = JSON.parse(raw);
      } catch {
        return sendJson(res, 400, {
          error: 'JSON inválido.'
        });
      }

      const query = String(
        body?.query || ''
      ).trim();

      if (!query) {
        return sendJson(res, 400, {
          error: 'Informe uma pesquisa.'
        });
      }

      if (query.length > 600) {
        return sendJson(res, 400, {
          error:
            'A pesquisa deve ter no máximo 600 caracteres.'
        });
      }

      let data;

      try {
        data = await searchReforma(query);

      } catch (firstError) {
        const msg = String(
          firstError?.message || ''
        );

        if (
          firstError?.status === 429 ||
          /Rate limit|rate limit|tokens per min|TPM/i.test(
            msg
          )
        ) {
          await new Promise(resolve =>
            setTimeout(resolve, 1200)
          );

          data = await searchReforma(query);
        } else {
          throw firstError;
        }
      }

      return sendJson(res, 200, {
        ok: true,

        answer:
          data?.output_text ||
          'Não foi possível gerar uma resposta textual.',

        sources: extractSources(data),

        searchedAt:
          new Date().toISOString(),

        model: MODEL
      });
    }

    return await serveStatic(req, res);

  } catch (error) {
    console.error(error);

    return sendJson(res, 500, {
      error:
        error?.message ||
        'Erro interno do servidor.'
    });
  }
});

server.listen(PORT, () => {
  console.log(
    `SK EXPERT online em http://localhost:${PORT}`
  );
});
