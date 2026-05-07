# WealthWise India — User Guide

A comprehensive personal finance and investment management app built for Indian investors. Track your net worth, plan goals, optimize taxes, and get AI-powered financial insights — all in one place.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard & Financial Health](#dashboard--financial-health)
3. [Goal-Based Planning](#goal-based-planning)
4. [Asset Portfolio Management](#asset-portfolio-management)
5. [Cash Flow Projections](#cash-flow-projections)
6. [Retirement Planning](#retirement-planning)
7. [Tax Optimization](#tax-optimization)
8. [Mutual Fund Search](#mutual-fund-search)
9. [SIP & EMI Calculators](#sip--emi-calculators)
10. [AI Chat Assistant](#ai-chat-assistant)
11. [Data Import & Export](#data-import--export)
12. [Currency Converter](#currency-converter)

---

## Getting Started

1. **Sign Up / Log In** — Create an account using email/password or OAuth.
2. **Set Up Profile** — Enter your age, income, expenses, family status, and risk tolerance.
3. **Add Assets** — Enter your holdings (equity, debt, gold, real estate, liquid, international).
4. **Create Goals** — Define what you're saving for with timelines and target amounts.

Once set up, your Dashboard will show a real-time financial health score and personalized insights.

---

## Dashboard & Financial Health

### Financial Health Score (0–100)
A single number that summarizes your financial well-being, calculated from:

| Factor | Max Points |
|--------|-----------|
| Savings Rate (% of income saved) | 25 |
| Emergency Fund Adequacy | 20 |
| Goal Progress (on track / behind) | 25 |
| Portfolio Diversification | 15 |
| Profile Completeness | 15 |

**Score Ranges:**
- **75–100** (Green): Excellent — you're in great shape
- **50–74** (Amber): Needs Attention — some areas to improve
- **0–49** (Red): Action Required — critical gaps to address

### Key Insights Panel
Automatically generated alerts and tips:
- Low savings rate warnings
- Emergency fund gaps
- SIP shortfall to meet goals
- Portfolio drift / rebalancing alerts
- Concentration risk warnings (any single holding > 25%)

### Quick Stats
- Net Worth, Monthly Income, Monthly Expenses, Savings Rate, Total Goals

---

## Goal-Based Planning

### Creating Goals
Use quick templates or create custom goals for:
- 🎓 Education
- 🏠 Home Purchase
- 🚗 Vehicle
- 💍 Wedding
- ✈️ Travel
- 🛡️ Emergency Fund
- 💎 Wealth Building
- 🏖️ Retirement

Each goal includes: target amount, timeline (years), expected return, monthly SIP contribution.

### Goal Tracking (Key Feature)
The app tracks whether you're **Ahead**, **On Track**, **Behind**, or **At Risk** for each goal:

- **Inflation-Adjusted Targets** — Goals automatically inflate at 6% (general) or 10% (education) so you don't fall short in real terms.
- **Projected Value** — Shows what your current savings + SIP will grow to by the goal date.
- **SIP Gap Indicator** — Tells you exactly how much more per month you need to invest.
- **Liquid vs Illiquid Split** — By default, only liquid assets (equity, debt, liquid, international) count toward goal funding. Toggle a switch to include gold/real estate if you plan to sell them.

### Emergency Fund Monitor
- Shows current liquid reserves vs recommended (6 months of expenses)
- Status: Adequate / Low / Missing
- Calculates exact shortfall amount

---

## Asset Portfolio Management

### Portfolio Overview
- View all holdings by asset class (equity, debt, gold, real estate, liquid, international)
- Per-holding: instrument name, quantity, buy price, current value, unrealized P&L

### Portfolio Health Check (Key Feature)
- **Weighted Portfolio Return** — Blended expected return across all holdings
- **Risk Score** — Weighted average risk based on asset class
- **Drift Detection** — Compares your current allocation vs optimal (based on age/risk tolerance). Flags when drift > 5%.
- **Rebalancing Alerts** — Specific "increase equity by X%" or "reduce gold by Y%" suggestions
- **Concentration Risk** — Warns if any single holding exceeds 25% of portfolio

### Asset Allocation View
- Visual breakdown of portfolio by asset class
- Optimal allocation recommendations based on risk tolerance:
  - Aggressive (age < 35): 70% equity, 10% debt, 5% gold, 5% real estate, 5% liquid, 5% international
  - Moderate (age 35–50): 50% equity, 25% debt, 10% gold, 10% real estate, 5% liquid, 0% international
  - Conservative (age > 50): 30% equity, 40% debt, 15% gold, 10% real estate, 5% liquid, 0% international

---

## Cash Flow Projections

### 30-Year Forecast
Projects your income, expenses, savings, and net worth over 30 years with:
- **Three inflation scenarios**: Low (4%), Moderate (6%), High (8%)
- **Retirement age integration** — Income drops to zero at your planned retirement age
- **Goal milestones** — Large withdrawals shown at goal target dates
- **Year-by-year table** with income, expenses, savings, cumulative net worth

---

## Retirement Planning

### Corpus Calculator
- Estimates total corpus needed based on: current expenses, inflation, life expectancy, safe withdrawal rate (3.5%)
- Accounts for post-retirement portfolio returns (8%)
- Shows existing assets growing at expected returns

### SIP Requirement
- Calculates exact monthly SIP needed to build your retirement corpus
- Uses proper annuity formula: `monthly_sip = corpus_gap × r / ((1+r)^n - 1) × 1/(1+r)`
- Adjusts for existing investments growing over time

### What-If Scenarios
- Adjust retirement age, expected returns, inflation assumptions
- See how delaying retirement by 2 years or increasing SIP by ₹5K changes the outcome

---

## Tax Optimization (FY 2025–26)

### Old vs New Regime Comparison
Calculates tax under both regimes with the latest slabs:

**New Regime (FY 2025–26):**
| Income Slab | Rate |
|-------------|------|
| Up to ₹4L | 0% |
| ₹4L – ₹8L | 5% |
| ₹8L – ₹12L | 10% |
| ₹12L – ₹16L | 15% |
| ₹16L – ₹20L | 20% |
| ₹20L – ₹24L | 25% |
| Above ₹24L | 30% |

Standard deduction: ₹75,000 | Section 87A rebate: income ≤ ₹12L

**Old Regime:**
| Income Slab | Rate |
|-------------|------|
| Up to ₹2.5L | 0% |
| ₹2.5L – ₹5L | 5% |
| ₹5L – ₹10L | 20% |
| Above ₹10L | 30% |

Standard deduction: ₹50,000 | Section 87A rebate: income ≤ ₹5L

### Smart Tax Suggestions
- Recommends regime based on your deductions
- Shows savings potential using your **actual marginal tax rate** (not a generic 30%)
- Suggests optimal 80C, 80D, NPS, HRA deductions

---

## Mutual Fund Search

- Search AMFI database of Indian mutual funds
- View fund details: category, NAV, expense ratio, returns
- Compare funds side by side

---

## SIP & EMI Calculators

### SIP Calculator
- Input: monthly amount, expected return, duration
- Output: total invested, estimated returns, final corpus
- Visual growth chart

### EMI Calculator
- Input: loan amount, interest rate, tenure
- Output: monthly EMI, total interest, total payment
- Amortization schedule breakdown

---

## AI Chat Assistant

- Ask natural language questions about your finances
- Get personalized suggestions based on your actual portfolio and goals
- Examples: "Should I increase my SIP?", "Am I saving enough for retirement?", "Which fund is better for my risk profile?"

---

## Data Import & Export

### Import
- Upload portfolio data via CSV
- Bulk-add holdings from broker statements

### Export
- Download complete financial data as CSV
- Includes all holdings, goals, and transaction history

---

## Currency Converter

- Real-time exchange rates
- Useful for tracking international investments in INR terms

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | Hono (Node.js), tRPC (type-safe APIs), Zod validation |
| Database | PostgreSQL with Drizzle ORM |
| Auth | OAuth + Local email/password with secure session cookies |
| Deployment | Render.com (render.yaml) |

---

## Key Differentiators vs Other Apps

| Feature | WealthWise India | ET Money | Kuvera |
|---------|-----------------|----------|--------|
| Financial Health Score | ✅ | ❌ | ❌ |
| Inflation-Adjusted Goal Targets | ✅ | Partial | ❌ |
| Portfolio Drift & Rebalancing Alerts | ✅ | ❌ | Basic |
| Emergency Fund Monitor | ✅ | ❌ | ❌ |
| 30-Year Cash Flow Projection | ✅ | ❌ | ❌ |
| Old vs New Tax Regime Optimizer | ✅ | Basic | ❌ |
| Retirement SIP Calculator | ✅ | Basic | Basic |
| AI Chat for Financial Queries | ✅ | ❌ | ❌ |
| Concentration Risk Alerts | ✅ | ❌ | ❌ |
| Open Source / Self-Hostable | ✅ | ❌ | ❌ |

---

## Running Locally

```bash
# Install dependencies
npm install

# Set up database
npm run db:push

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build && npm start
```

---

*Built with ❤️ for Indian investors who want professional-grade financial planning without the fees.*
