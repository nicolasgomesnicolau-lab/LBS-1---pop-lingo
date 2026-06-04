```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🎬 Pop Lingo — Aprenda inglês com filmes, música e IA  ║
║   🔗 https://lbs-1-pop-lingo.onrender.com                ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

---

```
╔══════════════════════════════════════════════════════════╗
║                     🛡️ SEGURANÇA                        ║
╚══════════════════════════════════════════════════════════╝
```

Tudo que o app faz pra proteger seus dados, do servidor ao navegador.

---

### 📋 Headers HTTP

Toda resposta do servidor vem com instruções pro navegador. São **11 headers** que bloqueiam ataques antes mesmo deles acontecerem.

```
┌─────────────────────────────────────────────────────────┐
│ 🔒 Content-Security-Policy                              │
│    Só carrega o que veio do próprio site + YouTube +     │
│    OpenRouter + Google Fonts. Bloqueia o resto.          │
│    `frame-ancestors 'self'` → ninguém coloca o app num   │
│    iframe (fim do clickjacking).                         │
│    `form-action 'self'` → formulário só pro próprio site │
├─────────────────────────────────────────────────────────┤
│ 🔒 X-Content-Type-Options: nosniff                      │
│    Browser não adivinha o tipo do arquivo. Se baixar     │
│    .txt, renderiza como .txt, nunca como .html.          │
├─────────────────────────────────────────────────────────┤
│ 🔒 X-Frame-Options: DENY                                │
│    Ninguém coloca o app dentro de um iframe.             │
│    Protege contra clickjacking.                          │
├─────────────────────────────────────────────────────────┤
│ 🔒 Strict-Transport-Security: max-age=31536000           │
│    HTTPS obrigatório por 1 ano. Uma vez HTTPS, sempre    │
│    HTTPS.                                                │
├─────────────────────────────────────────────────────────┤
│ 🔒 Permissions-Policy                                    │
│    Câmera, microfone, geolocalização: tudo desligado.    │
│    FLoC (rastreamento do Chrome) também.                 │
├─────────────────────────────────────────────────────────┤
│ 🔒 Cross-Origin-Embedder-Policy: require-corp            │
│    Só carrega recurso cross-origin que autorizar         │
│    explicitamente.                                       │
├─────────────────────────────────────────────────────────┤
│ 🔒 Cross-Origin-Opener-Policy: same-origin               │
│    Isola a aba do navegador. Nenhum site externo         │
│    consegue mexer nela.                                  │
├─────────────────────────────────────────────────────────┤
│ 🔒 Referrer-Policy: strict-origin-when-cross-origin      │
│    Quando você clica num link, só manda o domínio de     │
│    onde veio, nunca o caminho completo.                  │
├─────────────────────────────────────────────────────────┤
│ 🔒 Access-Control-Allow-Origin                           │
│    CORS travado no domínio do Render. Sem wildcard,      │
│    sem `req.headers.origin`. Só esse domínio pode        │
│    consumir a API.                                       │
│    Métodos: só GET, POST, OPTIONS.                       │
│    Headers: só Content-Type.                             │
└─────────────────────────────────────────────────────────┘
```

> 📍 O CSP é aplicado em **todas as respostas** (headers globais no `server.js:188`) e **reforçado** nas páginas HTML (`server.js:1016`). Cobre até YouTube, OpenRouter e Google Fonts — tudo documentado, nada aberto.

---

### 🧪 XSS (Cross-Site Scripting)

Quando alguém tenta injetar `<script>` malicioso pelo input, o app **desarma o texto** antes de mostrar.

```js
function escapeHtml(str) {
  var d = document.createElement('div');
  d.textContent = str;   // 1. Joga como texto puro
  return d.innerHTML;     // 2. Lê de volta já escapado
}
```

Usa o **próprio navegador** pra sanitizar — sem regex, sem blacklist, sem bypass.

```
📁 Onde essa proteção está ativa:

  app.js     → toast de notificação
  chat.js    → mensagens, respostas da IA, sugestões, palavras salvas
  music.js   → títulos, artistas, videoId no iframe, karaokê
  movies.js  → legendas, clipes, painel admin
  study.js   → flashcards, palavras, traduções
  vocab.js   → biblioteca de palavras
  profile.js → leaderboard
```

**+ Camadas extras em cada feature:**

```
  🎵 MÚSICA (music.js:249)
     videoId é filtrado: só [a-zA-Z0-9_-] — nada de string maliciosa no iframe

  🎬 FILMES (movies.js:344)
     Palavra clicada na legenda: só [a-zA-Z'-] — bloqueia qualquer código

  🎤 KARAOKÊ (music.js:271)
     Texto da transcrição: só caracteres comuns, resto é cortado

  📖 DICIONÁRIO (server.js:870)
     Extrai <script> por indexOf (procura posição no texto),
     NÃO por regex — evita ReDoS e bypass de expressão regular

  🤖 IA (ai.js:5)
     Termo de busca: só letras acentuadas — nada de caracteres especiais
```

---

### 🌐 CORS

Uma única origem, hardcoded, sem reflection, sem wildcard.

```js
res.setHeader('Access-Control-Allow-Origin',
  'https://lbs-1-pop-lingo.onrender.com');
```

**Ou seja:** site externo nenhum consegue fazer requisições em nome do usuário. O CORS tranca a porta.

---

### 🗄️ Banco de Dados — Supabase (PostgreSQL)

```
┌─────────────────────────────────────────────────────────┐
│ 🔐 ROW-LEVEL SECURITY (RLS)                             │
│                                                          │
│  Cada tabela tem regras que o próprio banco impõe:       │
│                                                          │
│  📦 vocab_data       → só o dono vê                     │
│  🏆 achievements_data → só o dono vê                    │
│  📊 tracking_data    → só o dono vê                     │
│  🎵 playlist_data    → só o dono vê                     │
│  🎬 movies_data      → público (todo mundo vê os mesmos) │
│                                                          │
│  Mesmo que alguém tente acessar dado alheio pela API,    │
│  o banco rejeita. A regra está no Supabase, não no       │
│  código do app.                                          │
└─────────────────────────────────────────────────────────┘
```

---

### 🔑 Login

Autenticação via Supabase JWT — email/senha ou conta anônima.

```
  📝 Login → servidor valida → devolve token JWT
  💾 Token salvo no localStorage com chave "lbs_auth_session"
  🛡️ CSP bloqueia qualquer script externo de ler o localStorage
  ✅ Rota /api/auth/me verifica o token em toda requisição
```

---

### 🗝️ Chaves de API

Todas as chaves ficam em **variáveis de ambiente**, nunca no código fonte, nunca chegam no navegador.

```
  🤖 OPENROUTER_KEY    → chamadas de IA (servidor → OpenRouter)
  ▶️ YT_API_KEY        → YouTube Data API (servidor → Google)
  🎤 KARAOKE_API_KEY   → transcrição de áudio (servidor → Jarvis API)
  🔐 ADMIN_PASSWORD    → painel admin (só no servidor)
  🗄️ SUPABASE_URL      → conexão com banco (só no servidor)
```

Nenhuma requisição pra essas APIs sai do navegador. O servidor é o intermediário.

---

### 🐳 Docker

```dockerfile
FROM node:24-alpine    # Alpine = pacotes mínimos = menos vulnerabilidades
USER node              # Roda como usuário comum, não como root
EXPOSE 8000            # Só uma porta exposta pro mundo
```

`.dockerignore` exclui `.env`, `node_modules`, `data` — **nada vaza pra imagem**.

---

### 🕵️ Scanners Automáticos (CI/CD)

A cada `git push` na `main`, **4 robôs** varrem o código procurando falhas:

```
  ╔══════════════════════════════════════════════════════════╗
  ║                                                          ║
  ║   🔍 CodeQL     → varre o JS procurando vulnerabilidades ║
  ║   🔍 Semgrep    → caça padrões OWASP Top 10 + secrets   ║
  ║   🔍 ZAP        → ataca o site ao vivo (DAST real)      ║
  ║   🔍 npm audit  → checa dependências com falha conhecida ║
  ║                                                          ║
  ╚══════════════════════════════════════════════════════════╝
```

**Resultado:** o ZAP passa sem high alerts. CodeQL e Semgrep limpos. `minimatch` overrided no `package.json` por causa de CVE.

---

### 📂 Projeto

```
Node.js puro          → sem Express, sem body-parser, sem dependências pesadas
Docker Alpine         → imagem enxuta, non-root
Supabase + RLS        → banco com regra por linha
YouTube + OpenRouter  → APIs consumidas só pelo servidor
```

**[MIT License](LICENSE)**
