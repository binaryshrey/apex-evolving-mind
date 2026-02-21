

# APEX : Autonomous Population of Evolving eXperts
### A self-evolving trading strategy system powered by Airia AI

![Banner](https://raw.githubusercontent.com/binaryshrey/apex-evolving-mind/refs/heads/main/public/webbanner.png)

</div>

---

## 🧬 What is APEX?

APEX is a real-time **evolutionary AI system** that manages a population of 40 autonomous trading strategy agents. Every generation cycle, Airia AI scores each agent, culls the weakest, breeds the strongest, and writes plain-English post-mortems — all in under 20 seconds.

Think of it as **survival of the fittest, but for trading algorithms.**




## ✨ Key Features

- 🔁 **Evolutionary Cycles** — Click a button to trigger a full generation: score → cull → breed → mutate
- 🧠 **Airia-Powered Intelligence** — Every evolution decision, post-mortem, and genome mutation is driven by live Airia API calls
- 🌍 **Environmental Awareness** — Paste any market headline and watch the regime shift in real time
- 🎛️ **Behavioral Override** — Override a trade recommendation and watch the agent genome update to reflect your style
- 📊 **Live Radar Charts** — Behavioral genome visualized as an animated 5-axis radar
- 📜 **Evolution Log** — A live-scrolling feed of every birth, death, and override event
- 📈 **Generation History** — Fitness trends, lineage trees, and extinct agent post-mortems across all generations


## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│                     APEX Frontend                      │
│   React 18 + TypeScript + TailwindCSS + shadcn/ui      │
│   Zustand (state) · Recharts (radar + line charts)     │
└─────────────────────┬──────────────────────────────────┘
                      │ API Routes (Next.js 14)
         ┌────────────┼────────────────┐
         ▼            ▼                ▼
   /run-generation  /override      /environment
         │            │                │
         └────────────┼────────────────┘
                      ▼
              ┌───────────────┐
              │   Airia API   │  ← The brain
              └───────────────┘
                      │
              ┌───────────────┐
              │  state.json   │  ← Local persistence
              └───────────────┘
```

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Frontend** | React 18 + TypeScript |
| **Styling** | TailwindCSS + shadcn/ui |
| **Charts** | Recharts (RadarChart, LineChart) |
| **State** | Zustand |
| **AI Orchestration** | Airia API |
| **Storage** | Local JSON (no DB needed) |
| **Fonts** | Syne (headings) · Space Mono (data) |

---

## 📁 Project Structure

```
apex/
├── app/
│   ├── page.tsx                  # Main dashboard
│   ├── history/page.tsx          # Generation history
│   └── api/
│       ├── run-generation/route.ts   # 🔑 Core evolution endpoint
│       ├── override/route.ts         # Behavioral genome update
│       ├── environment/route.ts      # Market regime classification
│       └── state/route.ts            # Full state read
├── components/
│   ├── AgentCard.tsx             # 40-card agent grid
│   ├── EvolutionLog.tsx          # Sliding log feed
│   ├── BehavioralRadar.tsx       # 5-axis genome radar
│   ├── EnvironmentPanel.tsx      # Headline → regime
│   ├── GenerationButton.tsx      # Hero CTA
│   └── OverrideModal.tsx         # Trade override dialog
├── data/
│   └── state.json                # Seed data (40 agents, gen 3)
├── lib/
│   ├── airia.ts                  # Airia API client
│   ├── store.ts                  # Zustand store
│   └── seed.ts                   # Seed data generator
└── types/
    └── index.ts                  # All TypeScript interfaces
```

---

## 🧬 Agent Anatomy

Each agent carries a **genome** that encodes its trading personality:

```json
{
  "id": "agent_001",
  "name": "Momentum Alpha",
  "generation": 3,
  "status": "active",
  "fitness_score": 74.2,
  "genome": {
    "entry_logic": "RSI crossover + volume confirmation",
    "exit_logic": "trailing stop 2.5%",
    "risk_tolerance": 0.65,
    "position_sizing": "Kelly criterion",
    "indicator_weights": { "RSI": 0.4, "MACD": 0.3, "volume": 0.3 },
    "momentum_bias": 0.7,
    "drawdown_sensitivity": 0.4
  },
  "performance": {
    "sharpe_ratio": 1.42,
    "max_drawdown": -8.3,
    "win_rate": 0.61,
    "total_return": 14.2
  },
  "parent_ids": ["agent_019", "agent_007"],
  "born_generation": 2,
  "trade_count": 47
}
```

---

## 🤖 Airia Integration

APEX makes **3 types of live Airia calls**:

### 1. `POST /api/run-generation`
Sends top 5 agents → Airia scores, culls 2, breeds 1 child with a new creative name and blended genome.

### 2. `POST /api/override`
User describes what they would have done differently → Airia updates the **Behavioral Genome** to reflect the new preference pattern.

### 3. `POST /api/environment`
Market headline pasted in → Airia classifies regime (`risk-on` / `risk-off` / `choppy`) and returns the full **Environmental State Vector**.

---

## 🚀 Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/your-username/apex.git
cd apex

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
```

Add your credentials to `.env.local`:
```env
AIRIA_API_KEY=your_airia_api_key_here
AIRIA_BASE_URL=https://api.airia.com/v1
```

```bash
# 4. Run the development server
npm run dev

# 5. Open http://localhost:3000
```

