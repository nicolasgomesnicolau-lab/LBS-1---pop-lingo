# Pop Lingo

Aprenda inglês com filmes, músicas e IA.  
**→ [https://lbs-1-pop-lingo.onrender.com](https://lbs-1-pop-lingo.onrender.com)**

---

## Segurança

Tudo que o app faz pra proteger seus dados.

### Headers HTTP

Toda resposta do servidor envia esses headers:

| Header | Valor |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline' https://www.youtube.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-src https://www.youtube.com; img-src 'self' https://img.youtube.com data:; connect-src 'self' https://openrouter.ai; frame-ancestors 'self'; form-action 'self'` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` |
| `Cross-Origin-Embedder-Policy` | `require-corp` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Access-Control-Allow-Origin` | `https://lbs-1-pop-lingo.onrender.com` |
| `Access-Control-Allow-Methods` | `GET, POST, OPTIONS` |
| `Access-Control-Allow-Headers` | `Content-Type` |

**+** CSP adicional só em páginas HTML (`server.js:1016`).

### CSP — o que cada diretiva faz

| Diretiva | Permite | Por quê |
|---|---|---|
| `default-src 'self'` | Só o próprio domínio | Fallback de segurança |
| `script-src` | `'self'`, `'unsafe-inline'`, YouTube | SPA precisa de inline; YouTube pra player de vídeo |
| `style-src` | `'self'`, `'unsafe-inline'`, Google Fonts | Inline pra UI dinâmica |
| `font-src` | `'self'`, Google Fonts | Fonte do Google |
| `frame-src` | YouTube | Só YouTube pode ser iframe |
| `img-src` | `'self'`, YouTube, `data:` | Thumbnails e avatares |
| `connect-src` | `'self'`, OpenRouter | API de IA |
| `frame-ancestors` | `'self'` | Ninguém coloca o app num iframe |
| `form-action` | `'self'` | Formulário só pro mesmo domínio |

### XSS (Cross-Site Scripting)

Toda entrada do usuário passa por `escapeHtml()` antes de ir pro DOM:

```js
function escapeHtml(str) {
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
```

Usa o **próprio navegador** pra escapar — sem regex, sem blacklist, sem risco de bypass.

Essa função existe em **7 arquivos** diferentes e é usada em **dezenas de pontos**:

| Arquivo | O que protege |
|---|---|
| `js/app.js` | Toast de notificação |
| `js/chat.js` | Mensagens do usuário, respostas da IA, botões de sugestão, palavras salvas |
| `js/music.js` | Títulos, artistas, videoId, karaokê, erros, buscas |
| `js/movies.js` | Nomes de série, títulos de clipe, legendas, admin panel |
| `js/study.js` | Flashcards, palavras, traduções, feedback |
| `js/vocab.js` | Palavras e traduções na biblioteca |
| `js/profile.js` | Nomes no leaderboard |

### Sanitização extra

Além do `escapeHtml()`, cada feature tem camadas adicionais:

- **YouTube videoId** (`music.js:249`): `str.replace(/[^a-zA-Z0-9_-]/g, '')` — só caracteres seguros no iframe
- **Legendas** (`movies.js:344`): `word.replace(/[^a-zA-Z'-]/g, '')` — whitelist no clique de palavra
- **Karaokê** (`music.js:271`): `str.replace(/[^\w\s',!?.%-]/g, '')` — filtra caracteres especiais
- **Dicionário** (`server.js:870`): Extração de `<script>` por `indexOf` em vez de regex (evita ReDoS e bypass)
- **Texto de busca** (`ai.js:5`): `str.replace(/[^a-zA-ZÀ-ÿ']/g, '')` — só letras na query de tradução

### CORS

Único origem permitida, hardcoded, sem reflection:

```js
res.setHeader('Access-Control-Allow-Origin', 'https://lbs-1-pop-lingo.onrender.com');
```

Sem `req.headers.origin`, sem wildcard. Métodos: `GET, POST, OPTIONS`. Headers: `Content-Type`.

### Autenticação

- **Supabase JWT** — login com email/senha ou anônimo
- Token armazenado em `localStorage` com a chave `lbs_auth_session`
- CSP impede qualquer script externo de ler o `localStorage`
- Rota `/api/auth/me` verifica o token em toda requisição
- **Row-Level Security** no Supabase — cada usuário só vê os próprios dados (vocab, achievements, tracking, playlist)

Tabelas com RLS ativo: `vocab_data`, `achievements_data`, `tracking_data`, `playlist_data`.  
Tabela sem RLS (pública): `movies_data`.

### Admin

Sessão admin com token aleatório de 32 caracteres, armazenado em memória (`Map`). Senha via variável de ambiente.

### Como as chaves de API são protegidas

Todas as chaves ficam em **variáveis de ambiente**, nunca no código fonte:

```env
OPENROUTER_KEY → chamadas de IA (server-side)
YT_API_KEY     → YouTube Data API (server-side)
KARAOKE_API_KEY → transcrição de áudio (server-side)
ADMIN_PASSWORD  → painel admin (server-side)
SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY → banco e auth
```

Nenhuma chave é exposta ao cliente. As chamadas pra YouTube, OpenRouter e Jarvis saem do servidor, não do navegador.

### Docker

```dockerfile
FROM node:24-alpine    # Alpine = imagem mínima, menos vulnerabilidades
USER node              # Roda como usuário não-root
EXPOSE 8000            # Só uma porta exposta
```

`.dockerignore` exclui `.env`, `node_modules`, `data` — nada vaza pra imagem.

### MIME types

Servidor usa um mapa de extensões → MIME types. Qualquer extensão desconhecida cai pra `application/octet-stream`. Combinado com `X-Content-Type-Options: nosniff`, o browser não tenta adivinhar o tipo do arquivo.

### Validação de requisições

Toda rota valida `method` + `pathname` antes de processar. Inputs críticos têm validação extra:

- `/search`: query não pode ser vazia
- `/api/chat`: `messages` precisa ser array
- `/api/auth/signup`: email e senha obrigatórios
- `/api/spotify-playlist`: URL precisa conter `spotify.com/playlist/`

### Scanners automáticos (CI/CD)

Quatro workflows no GitHub Actions:

| Scanner | O que analisa | Quando roda |
|---|---|---|
| **CodeQL** | Código JS — busca vulnerabilidades estáticas (XSS, injeção, etc) | Push/PR na main |
| **Semgrep** | Padrões OWASP Top 10, CWE, secrets vazados | Push na main |
| **ZAP Baseline** | Scan dinâmico contra o site ao vivo no Render | Push na main + manual |
| **npm audit** | Dependências com falhas conhecidas (nível high+) | Push na main |

Dependência overrided no `package.json`: `minimatch ^3.1.2` (CVE em versões anteriores).

### Path traversal

O servidor usa `path.join()` pra montar caminhos de arquivo, que normaliza `../` tentativas. Qualquer path que saia do diretório do projeto é barrado.

---

**Projeto:** Node.js puro (sem Express), Docker, Supabase, YouTube Data API
