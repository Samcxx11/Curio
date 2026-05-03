# Curio — AI-Powered News Verification Platform

> **Verify before you share.** Curio uses machine learning to detect fake news, analyze source credibility, and help users make informed decisions about the content they consume and share.

---

## What is Curio?

Curio is a full-stack web application that combats misinformation by automatically analyzing news articles for credibility. Every article in the feed is assigned a **validity score** based on cross-source consistency, sentiment bias, and author credibility — powered by a custom-trained ML model. Users can register, browse verified news, bookmark articles, and interact with **Curio AI**, an intelligent chatbot that summarizes articles and answers fact-checking questions in real time.

---

## Features

- **ML-Powered Fake News Detection** — Custom trained model assigns credibility scores to news articles
- **AI Chatbot** — Powered by Groq (Llama 3), summarizes articles and answers questions about credibility
- **Google OAuth + Email Auth** — Secure login via Google or email/password with JWT sessions
- **News Feed with Validity Scores** — Browse articles with color-coded credibility ratings
- **One-Click Summarize** — Every news card has a ✨ Summarize button that instantly asks the AI
- **PostgreSQL Database** — Production-ready relational database with Sequelize ORM
- **Responsive UI** — Clean, modern design with GSAP animations

---

## Project Structure

```
Curio/
├── FrontEnd/
│   ├── public/
│   │   ├── index.html          # Main SPA page
│   │   ├── css/
│   │   │   ├── tokens.css      # Design tokens & variables
│   │   │   ├── nav.css         # Navigation styles
│   │   │   ├── hero.css        # Hero section
│   │   │   ├── sections.css    # News cards, modals
│   │   │   ├── footer.css      # Footer & login modal
│   │   │   └── responsive.css  # Mobile responsiveness
│   │   └── js/
│   │       ├── api.js          # All API calls, auth, news rendering
│   │       ├── login.js        # Login/register modal logic
│   │       ├── nav.js          # Navigation & scroll behavior
│   │       └── animations.js   # GSAP animations & chatbot UI
│   └── server/
│       ├── index.js            # Express app entry point
│       ├── config/
│       │   ├── db.js           # Sequelize PostgreSQL connection
│       │   └── passport.js     # Google OAuth strategy
│       ├── models/
│       │   └── User.js         # Sequelize User model
│       ├── routes/
│       │   ├── auth.js         # Register, login, Google OAuth
│       │   ├── news.js         # News feed & categories
│       │   └── chat.js         # AI chatbot (Groq API)
│       └── middleware/
│           └── auth.js         # JWT verification middleware
├── BackEnd/                    # Additional backend services
├── Detection/                  # Fake news detection pipeline
└── ML model/                   # Trained ML model & notebooks
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, Vanilla JS, GSAP |
| Backend | Node.js, Express.js |
| Database | PostgreSQL + Sequelize ORM |
| Authentication | Passport.js, Google OAuth 2.0, JWT |
| AI Chatbot | Groq API (Llama 3.1 8B) |
| ML Model | Python, Jupyter Notebook |

---

## Getting Started

### Prerequisites

- Node.js v18+
- PostgreSQL 15+
- A Groq API key (free at [console.groq.com](https://console.groq.com))
- A Google OAuth client (for Google sign-in)

### 1. Clone the repository

```bash
git clone https://github.com/riya19verma/Curio.git
cd Curio/FrontEnd
```

### 2. Install dependencies

```bash
cd server
npm install
```

### 3. Set up PostgreSQL

```bash
# Make sure PostgreSQL is running
createdb curio
```

### 4. Configure environment variables

Create a `server/.env` file:

```env
PORT=5000
DATABASE_URL=postgres://your_username@localhost:5432/curio

JWT_SECRET=your_long_random_secret
SESSION_SECRET=another_long_random_secret

# Google OAuth (https://console.cloud.google.com)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

CLIENT_URL=http://localhost:5000

# Groq AI (https://console.groq.com) — free tier
GROQ_API_KEY=gsk_your_groq_api_key
```

### 5. Run the server

```bash
npm run dev
```

Open **http://localhost:5000** in your browser. Sequelize will automatically create the database tables on first run.

---

## ML Model

The fake news detection model lives in the `ML model/` and `Detection/` directories. It is trained on labeled news datasets and evaluates articles based on:

- **Cross-source consistency** — Does the story appear in multiple credible sources?
- **Sentiment bias** — Is the language emotionally charged or neutral?
- **Author credibility** — Is the author/publication known and reputable?

Each article receives a **validity score from 0–100** which is displayed on the news card.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register with email & password |
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| GET | `/api/auth/status` | Check OAuth configuration |
| GET | `/api/news` | Get news feed |
| GET | `/api/news/categories` | Get news categories |
| POST | `/api/chat` | Send message to AI chatbot |
| GET | `/api/health` | Server health check |

---

## Environment Variables Reference

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `SESSION_SECRET` | Secret for express-session |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | OAuth redirect URI |
| `CLIENT_URL` | Frontend URL (must match server port) |
| `GROQ_API_KEY` | Groq API key for AI chatbot |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

<div align="center">
  Built with ❤️ to fight misinformation
</div>
