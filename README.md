# NCD-India Platform — Feasibility Prototype v3.0

Patient-Level Microsimulation with Distributional Cost-Effectiveness Analysis (DCEA) for Equity-Informed Evaluation of NCD Interventions in India.

**ICMR Intermediate Grant Application — March 2026**

## Quick Deploy to Vercel (5 minutes)

### Step 1: Push to GitHub

```bash
cd ncd-india-deploy
git init
git add .
git commit -m "NCD-India prototype v3.0"
gh repo create ncd-india --public --source=. --push
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Select the `ncd-india` repository
4. Vercel auto-detects Vite — just click **"Deploy"**
5. Your prototype is live at `ncd-india-<username>.vercel.app`

Every future `git push` auto-deploys.

## Alternative: GitHub Pages

```bash
npm run build
npx gh-pages -d dist
```

Then enable GitHub Pages in repo Settings → Pages → Source: gh-pages branch.

## Local Development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`

## What This Prototype Demonstrates

- **3 Disease Modules**: CVD, Diabetes, CKD with cross-disease interactions
- **Custom Intervention Input**: Any user-defined NCD intervention
- **DCEA Equity Layer**: 9 HEAT measures, HEIP, concentration curves
- **District Planning**: 5 MP districts with readiness scoring
- **Logistics Estimation**: Drug supply, workforce gaps, cost breakdown
- **3 Demonstrator Analyses**: CVD treatment, DM escalation, tobacco tax
- **PSA**: Probabilistic sensitivity analysis with uncertainty
- **Validation**: Simulated vs GBD/NFHS-5 calibration
- **14 Interactive Tabs** covering every deliverable in the proposal
