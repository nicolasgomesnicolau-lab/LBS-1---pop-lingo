# 🎬 Pop Lingo — Aprenda Inglês com Filmes, Música e IA

Foco em **memorizar palavras e traduções** através de contexto real. O app funciona em ciclo: você encontra uma palavra nova nos filmes ou músicas → traduz → salva na sua biblioteca → revisa no **Study** até fixar.

> **Live app:** [https://lbs-1-pop-lingo.onrender.com](https://lbs-1-pop-lingo.onrender.com)

---

## How It Works

### 📚 Study (Núcleo)
Sua **biblioteca de palavras salvas** fica aqui. Você revisa as traduções, marca se acertou ou errou, e acompanha seu progresso diário. É onde a memorização acontece.

### 🎥 Movies
Assista clipes de filmes/séries com legendas sincronizadas. Toque em qualquer palavra para ver a tradução. **Salve na biblioteca** com um clique — a palavra vai direto pro Study. Ative o modo **Just Heard** para testar se você entendeu o que ouviu antes de ler.

### 🎵 Music
Busque músicas no YouTube, toque com legendas em karaokê geradas por IA. Mesma lógica: toque numa palavra → traduz → salva na biblioteca → aparece no Study.

### 💬 Chat
Tire dúvidas em português sobre palavras, frases ou gramática inglesa. A IA responde em português direto, sem firulas.

---

## APIs & Services Used

| Service | Usage | Endpoint / Key |
|---|---|---|
| **YouTube Data API v3** | Search videos & fetch metadata | `YT_API_KEY` |
| **yt-search** (fallback) | Search YouTube when API quota is exceeded | — |
| **OpenRouter** | AI translation & chat (via free models) | `OPENROUTER_KEY` |
| **Jarvis Karaoke API** | AI-powered karaoke transcription from audio | `KARAOKE_NGROK` + `KARAOKE_API_KEY` |
| **Supabase** | Authentication (JWT) & database for movies and user vocab | `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` |
| **Render** | Web hosting | [render.com](https://render.com) |

---

## Supabase Setup

This app uses Supabase for authentication (JWT login) and shared data storage (movies + user vocabulary).

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the script from [`supabase-init.sql`](./supabase-init.sql) to create the required tables
3. In **Auth > Settings**, disable **"Confirm email"** so users can sign up without email verification
4. Copy your project URL and anon key to `.env`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_PUBLISHABLE_KEY=your-anon-key
   ```

## Running with Docker

> ⚠️ The `.env` file with API keys is **not committed** to the repository. You must provide your own credentials.

### Prerequisites
- [Docker](https://docker.com)
- A **Jarvis API** instance for karaoke transcription ([repo](https://github.com/nicolasgomesnicolau-lab/LBS-1---API-JARVIS-for-POP-LINGO))

### Quick Start

1. **Clone the repo:**
   ```bash
   git clone https://github.com/nicolasgomesnicolau-lab/LBS-1---pop-lingo.git
   cd LBS-1---pop-lingo
   ```

2. **Create your `.env` file** (copy from `.env.example` and fill in the keys)

3. **Build and run:**
   ```bash
   docker build -t pop-lingo .
   docker run -p 8000:8000 --env-file .env pop-lingo
   ```

4. Open **http://localhost:8000** in your browser.

---

## Project Structure

```
├── server.js           # HTTP server: API routes + static files
├── supabase.js         # Supabase client (auth + database)
├── dict.js             # Built-in English→Portuguese dictionary
├── dockerfile          # Docker build config
├── index.html          # Main SPA entry point
├── supabase-init.sql   # SQL script to initialize Supabase tables
├── css/
│   ├── index.css       # Global styles
│   └── components.css  # Reusable UI components
├── js/
│   ├── app.js          # App shell: tabs, router, UI helpers
│   ├── auth.js         # Login/signup via Supabase JWT
│   ├── ai.js           # Translation client (calls server /api/translate)
│   ├── movies.js       # Movies tab: list, player, admin, server sync
│   ├── music.js        # Music tab: search, YouTube player, karaoke
│   ├── store.js        # Data layer (localStorage + Supabase sync)
│   └── chat.js         # Chat tab: messages, AI conversation
├── data/
│   ├── movies.json     # Local fallback for movie data
│   └── karaoke_cache/  # Cached Jarvis transcriptions (gitignored)
└── .env.example        # Template for environment variables
```

---

## Data Persistence

- **Movies & Vocab** are stored in **Supabase** (`movies_data` and `vocab_data` tables). Movies are visible to everyone; vocab is per-user (requires login).
- **`data/movies.json`** is kept as a local fallback (synced from Supabase when available).
- **`data/karaoke_cache/`** is gitignored. Transcriptions are regenerated on demand and cached server-side.
- **User playlists, music history, and settings** are stored in `localStorage`.
- **Auth sessions** use Supabase JWT tokens stored in `localStorage`.

---

## License

MIT
