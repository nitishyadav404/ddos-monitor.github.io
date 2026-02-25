# 🌐 DDoS Live Global Monitoring Website

> A world-class, real-time DDoS attack visualization platform combining the best features of Kaspersky Cybermap, Fortinet FortiGuard, Radware, and Check Point Threat Map.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react) ![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi) ![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss) ![Three.js](https://img.shields.io/badge/Three.js-WebGL-black?logo=three.js)

## ✨ Features

- 🌍 **3D Interactive Globe** — WebGL globe with animated attack arcs
- 🗺️ **Globe / Flat Map Toggle** — Switch between 3D and 2D Mercator views
- ⚡ **Live Attack Feed** — Real-time scrolling attack list with speed control knob
- 🔥 **Heat Map Overlay** — Geographic attack density visualization
- 📊 **Stats Dashboard** — Bar, Pie, and Line charts (attack types, top countries, 24h trend)
- 🏳️ **Country Detail Panels** — Click any country for deep-dive statistics
- 🎛️ **Speed Control Knob** — Control feed refresh rate (Slow/Medium/Fast/Real-Time)
- 📅 **24-Hour Counter** — Auto-resets at 00:00 GMT daily
- 🤖 **ML Attack Classification** — Logistic Regression + Random Forest model
- 🎭 **Demo Mode** — Offline-safe presentation mode
- 🎨 **Color / Mono Toggle** — Dark space theme with monochrome option
- 🔍 **Attack Type & Severity Filters** — Multi-select filter system
- 📱 **Fully Responsive** — Desktop, Laptop, Tablet, Mobile

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Globe | Globe.gl (Three.js) |
| Charts | Chart.js + react-chartjs-2 |
| Backend | FastAPI (Python 3.11+) |
| Realtime | WebSockets |
| Caching | Redis |
| Database | PostgreSQL |
| ML | scikit-learn (Random Forest) |
| GeoIP | MaxMind GeoLite2 |

## 📁 Project Structure

```
ddos-monitor/
├── frontend/          # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── Globe/          # 3D globe component
│   │   │   ├── AttackList/     # Live feed panel
│   │   │   ├── StatsPanel/     # Charts dashboard
│   │   │   ├── CountryPanel/   # Country rankings & details
│   │   │   ├── Controls/       # Filters, toggles, speed knob
│   │   │   └── Layout/         # Header, sidebar wrappers
│   │   ├── hooks/              # useWebSocket, useAttacks, useFilters
│   │   ├── store/              # Zustand state management
│   │   ├── utils/              # GeoIP helpers, formatters
│   │   └── data/               # Mock/demo data
│   └── package.json
├── backend/           # FastAPI Python server
│   ├── main.py             # App entry point
│   ├── routers/            # API route handlers
│   ├── services/           # Business logic
│   ├── models/             # DB models + ML models
│   ├── schemas/            # Pydantic schemas
│   └── requirements.txt
└── README.md
```

## 📜 License

MIT License — See [LICENSE](LICENSE) for details.
