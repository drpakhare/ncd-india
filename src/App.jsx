import { useState, useMemo, useCallback } from "react";
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell, ScatterChart, Scatter } from "recharts";

// ============================================================
// NCD-India v3: Full Platform Prototype — Enhanced with Diabetes/CKD + HEIP + HEAT + PSA + Validation
// Patient-Level Microsimulation + DCEA + Disease Modules + Advanced Equity Analysis
// ============================================================

// --- DISTRICT-LEVEL DATA (MP as demonstrator state) ---

const DISTRICTS = {
  "Indore": { state: "Madhya Pradesh", pop: 3276697, urbanPct: 0.73, htPrev: 0.26, dmPrev: 0.14, tobPrev: 0.21, hwc: 142, chc: 18, dh: 3, phcWithNcdKit: 68, physicians: 412, asha: 1850, pharmacies: 385, labFacilities: 52, hdi: 0.72, literacy: 0.82 },
  "Bhopal": { state: "Madhya Pradesh", pop: 2368145, urbanPct: 0.80, htPrev: 0.25, dmPrev: 0.13, tobPrev: 0.23, hwc: 118, chc: 12, dh: 4, phcWithNcdKit: 55, physicians: 380, asha: 1420, pharmacies: 310, labFacilities: 48, hdi: 0.70, literacy: 0.80 },
  "Mandla": { state: "Madhya Pradesh", pop: 1054905, urbanPct: 0.11, htPrev: 0.18, dmPrev: 0.06, tobPrev: 0.42, hwc: 62, chc: 8, dh: 1, phcWithNcdKit: 18, physicians: 45, asha: 890, pharmacies: 42, labFacilities: 8, hdi: 0.48, literacy: 0.58 },
  "Jabalpur": { state: "Madhya Pradesh", pop: 2463289, urbanPct: 0.52, htPrev: 0.23, dmPrev: 0.11, tobPrev: 0.28, hwc: 130, chc: 15, dh: 2, phcWithNcdKit: 48, physicians: 285, asha: 1680, pharmacies: 220, labFacilities: 35, hdi: 0.65, literacy: 0.76 },
  "Gwalior": { state: "Madhya Pradesh", pop: 2032036, urbanPct: 0.60, htPrev: 0.24, dmPrev: 0.12, tobPrev: 0.25, hwc: 105, chc: 14, dh: 2, phcWithNcdKit: 42, physicians: 260, asha: 1350, pharmacies: 195, labFacilities: 30, hdi: 0.66, literacy: 0.78 },
};

const STATES = {
  "Madhya Pradesh": { code: "MP", region: "Central", lifeExp: 66.7, cvdMort: 195, urbanPct: 0.28, htPrev: 0.22 },
  "Kerala": { code: "KL", region: "South", lifeExp: 78.4, cvdMort: 245, urbanPct: 0.48, htPrev: 0.33 },
  "Bihar": { code: "BR", region: "East", lifeExp: 64.4, cvdMort: 172, urbanPct: 0.12, htPrev: 0.19 },
  "Maharashtra": { code: "MH", region: "West", lifeExp: 73.1, cvdMort: 220, urbanPct: 0.45, htPrev: 0.27 },
  "Tamil Nadu": { code: "TN", region: "South", lifeExp: 73.8, cvdMort: 238, urbanPct: 0.49, htPrev: 0.30 },
};

const WEALTH_QUINTILES = ["Poorest (Q1)", "Poorer (Q2)", "Middle (Q3)", "Richer (Q4)", "Richest (Q5)"];

const NFHS_PARAMS = {
  // Hypertension prevalence by wealth quintile (NFHS-5, 2019-21)
  // Men 24.1%, Women 21.2% overall; gradient: lowest to highest quintile
  // Source: NFHS-5 factsheet + IJPH 2023
  hypertension_prev: [0.17, 0.20, 0.23, 0.26, 0.29],

  // Treatment access (% on BP medication among hypertensives)
  // Source: NFHS-5; Poorest 17.3% aware → Richest 41.8% aware; treatment lower
  treatment_access:  [0.10, 0.16, 0.25, 0.38, 0.45],

  // Diabetes prevalence (NFHS-5, age 15-49)
  // Overall 4.9%; Richest 32% higher than poorest
  // Source: Nature Scientific Reports 2023
  diabetes_prev:     [0.042, 0.058, 0.078, 0.102, 0.116],

  // Tobacco use by wealth quintile (NFHS-5)
  // Poorest highest, richest lowest; ST men 53.4%
  // Source: PMC 2023
  tobacco_use:       [0.38, 0.33, 0.27, 0.21, 0.14],

  // Obesity prevalence (BMI≥30) by wealth (NFHS-5)
  // Women: Q1 1.6% → Q5 12.6%; Men: Q1 1.2% → Q5 8%
  // Source: ScienceDirect 2023
  obesity_prev:      [0.014, 0.035, 0.065, 0.095, 0.103],

  // Mean SBP — derived from NFHS-5 BP measurement data
  mean_sbp:          [123, 125, 128, 131, 133],

  // Mean total cholesterol — approximate from Indian studies
  mean_chol:         [182, 188, 195, 202, 210],

  // Mean BMI by wealth (NFHS-5)
  // Source: ScienceDirect 2023
  mean_bmi:          [20.8, 22.1, 23.5, 25.0, 26.4],

  // Mean eGFR — approximated; lower in richer (more diabetes/hypertension)
  mean_gfr:          [96, 93, 89, 86, 83],

  // OOP spending as fraction of health cost by quintile
  // Source: NSSO 75th Round; PMC 2024
  oop_spending_pct:  [0.83, 0.80, 0.75, 0.70, 0.65],

  // Cost multiplier relative to middle quintile
  // Private healthcare more used by richer; NSSO 75th Round
  cost_multiplier:   [0.55, 0.70, 1.0, 1.35, 1.90],
};

// --- INTERVENTIONS LIBRARY ---

const INTERVENTIONS = {
  none: { name: "No Intervention (Status Quo)", type: "none", category: "—", coverage: 0, efficacy: 0, adherence: 0, costPerPerson: 0, targetRisk: "all", targetHypertensive: false, targetDiabetic: false, targetAge: [30, 69], targetSex: "All",
    description: "Current practice baseline",
    drugs: [], testsPerYear: 0, visitsPerYear: 0, needsPhysician: false, needsColdChain: false, needsLab: false, needsSmartphone: false },

  ihci: { name: "IHCI Protocol", type: "ihci", category: "CVD Treatment", coverage: 58, efficacy: 20, adherence: 41, costPerPerson: 2400, targetRisk: "all", targetHypertensive: true, targetDiabetic: false, targetAge: [30, 69], targetSex: "All",
    description: "Treat all detected hypertensives per IHCI protocol — amlodipine + telmisartan",
    drugs: [{name: "Amlodipine 5mg", dailyDose: 1, unitCost: 1.2, monthly: 36}, {name: "Telmisartan 40mg", dailyDose: 1, unitCost: 2.5, monthly: 75}],
    testsPerYear: 2, visitsPerYear: 4, needsPhysician: false, needsColdChain: false, needsLab: true, needsSmartphone: false,
    evidence: "SBP reduction: 15-16 mmHg (IHCI Punjab/Maharashtra, PMC 2022). CVD RRR: 20% per 10mmHg (Lancet meta-analysis, 2023). Adherence: 39-41% (India, ScienceDirect 2021). BP control: 59.8% at follow-up (Global Heart Journal, 2022). Drug cost: ₹480-800/yr generic (Nature, 2023)." },

  whoBestBuy: { name: "WHO Best Buy (≥20% risk)", type: "whoBestBuy", category: "CVD Treatment", coverage: 50, efficacy: 30, adherence: 42, costPerPerson: 5500, targetRisk: "high", targetHypertensive: false, targetDiabetic: false, targetAge: [40, 69], targetSex: "All",
    description: "Multi-drug therapy for individuals with ≥20% 10-year CVD risk — aspirin + statin + antihypertensive",
    drugs: [{name: "Aspirin 75mg", dailyDose: 1, unitCost: 0.5, monthly: 15}, {name: "Atorvastatin 20mg", dailyDose: 1, unitCost: 5.15, monthly: 155}, {name: "Amlodipine 5mg", dailyDose: 1, unitCost: 1.2, monthly: 36}],
    testsPerYear: 2, visitsPerYear: 4, needsPhysician: true, needsColdChain: false, needsLab: true, needsSmartphone: false,
    evidence: "Statin RRR: 20% per mmol/L LDL (CTT Collaboration, Lancet 2014). BP RRR: 20% per 10mmHg. Atorvastatin 20mg: ₹5.15/tab regulated (IJBCP 2021). Adherence: 42.3% (PMC 2021). Asian Indians: 1.68× higher statin plasma levels (PMC 2015)." },

  statinLower: { name: "Lower Statin Threshold (≥10%)", type: "statinLower", category: "CVD Treatment", coverage: 45, efficacy: 25, adherence: 42, costPerPerson: 4200, targetRisk: "medium", targetHypertensive: false, targetDiabetic: false, targetAge: [35, 69], targetSex: "All",
    description: "Initiate statins at ≥10% CVD risk instead of ≥20% — wider net, moderate intensity",
    drugs: [{name: "Atorvastatin 10mg", dailyDose: 1, unitCost: 2.8, monthly: 84}, {name: "Amlodipine 5mg", dailyDose: 1, unitCost: 1.2, monthly: 36}],
    testsPerYear: 2, visitsPerYear: 3, needsPhysician: true, needsColdChain: false, needsLab: true, needsSmartphone: false,
    evidence: "Statin benefit in low-risk: 11 vascular events prevented per 1000/5yr per mmol/L LDL (CTT 2012). Atorvastatin cost: ₹5.15/tab (IJBCP 2021). Primary prevention adherence lower than secondary (PMC 2021)." },

  polypill: { name: "Polypill (Secondary Prevention)", type: "polypill", category: "CVD Treatment", coverage: 55, efficacy: 33, adherence: 70, costPerPerson: 7200, targetRisk: "high", targetHypertensive: false, targetDiabetic: false, targetAge: [40, 75], targetSex: "All",
    description: "Fixed-dose combination (aspirin + statin + BP lowering) for secondary CVD prevention — WHO-endorsed, single pill improves adherence",
    drugs: [{name: "Polycap FDC (ASA+simva+atenolol+ramipril+HCTZ)", dailyDose: 1, unitCost: 20, monthly: 600}],
    testsPerYear: 1, visitsPerYear: 2, needsPhysician: false, needsColdChain: false, needsLab: true, needsSmartphone: false,
    evidence: "TIPS-3: 33% CVD reduction (primary prevention). PolyIran: 62% fatal stroke reduction. SBP: -7.4mmHg, LDL: -0.70mmol/L (Polycap, Lancet 2009). Manufacturing: $0.05/pill; India market: ~₹20/day. Adherence superior to separate pills (EHJ-QCCO 2022)." },

  sglt2: { name: "SGLT2i for Diabetics", type: "sglt2", category: "Diabetes Treatment", coverage: 35, efficacy: 38, adherence: 45, costPerPerson: 28000, targetRisk: "all", targetHypertensive: false, targetDiabetic: true, targetAge: [30, 69], targetSex: "All",
    description: "Add SGLT2 inhibitor (dapagliflozin) to metformin for cardio-renal protection",
    drugs: [{name: "Metformin 500mg", dailyDose: 2, unitCost: 1.2, monthly: 72}, {name: "Dapagliflozin 10mg", dailyDose: 1, unitCost: 55, monthly: 1650}],
    testsPerYear: 4, visitsPerYear: 4, needsPhysician: true, needsColdChain: false, needsLab: true, needsSmartphone: false,
    evidence: "EMPA-REG: 38% CV mortality reduction (HR 0.62, NEJM 2015). DAPA-CKD: 39% renal outcome reduction (HR 0.61, NEJM 2020). HbA1c: -0.6-0.8%. NNT 38 for all-cause mortality. Prescribing: only 3-8% eligible patients in India (Kidney Reports 2022)." },

  mhealth: { name: "mHealth Adherence Support", type: "mhealth", category: "Digital Health", coverage: 40, efficacy: 12, adherence: 72, costPerPerson: 800, targetRisk: "all", targetHypertensive: true, targetDiabetic: false, targetAge: [30, 69], targetSex: "All",
    description: "SMS/WhatsApp reminders + teleconsultation for treatment adherence",
    drugs: [],
    testsPerYear: 0, visitsPerYear: 1, needsPhysician: false, needsColdChain: false, needsLab: false, needsSmartphone: true,
    evidence: "SMS interventions improve BP control and adherence (MDPI 2023). Cost: INR 79-110/patient/yr for SMS (PubMed 2014). Scalable in low-resource settings. Effect sizes modest but population-level impact significant." },

  saltReduction: { name: "Population Salt Reduction", type: "saltReduction", category: "Population Policy", coverage: 70, efficacy: 10, adherence: 80, costPerPerson: 150, targetRisk: "all", targetHypertensive: false, targetDiabetic: false, targetAge: [18, 80], targetSex: "All",
    description: "Food industry reformulation + labelling + media campaign targeting 30% salt reduction",
    drugs: [],
    testsPerYear: 0, visitsPerYear: 0, needsPhysician: false, needsColdChain: false, needsLab: false, needsSmartphone: false,
    evidence: "Current Indian intake: 10.98 g/day (JAHA 2017). Target: 30% reduction. SBP reduction: 4-6 mmHg per 3g (Hypertension 2022). CVD mortality: 9-13% stroke reduction over 30yr (PubMed 2012). WHO Best Buy: most cost-effective population intervention." },

  chwLed: { name: "CHW-Led HT Management at HWC", type: "chwLed", category: "Service Delivery", coverage: 65, efficacy: 18, adherence: 70, costPerPerson: 2200, targetRisk: "all", targetHypertensive: true, targetDiabetic: false, targetAge: [30, 69], targetSex: "All",
    description: "ASHA/CHW-led BP measurement, protocol-based treatment initiation at HWC",
    drugs: [{name: "Amlodipine 5mg", dailyDose: 1, unitCost: 1.2, monthly: 36}],
    testsPerYear: 1, visitsPerYear: 6, needsPhysician: false, needsColdChain: false, needsLab: false, needsSmartphone: false,
    evidence: "CHW BP reduction: 5.0/2.1 mmHg vs control (PMC 2023). Medication adherence: 70.3% (PMC 2023). IHCI HWC performance: BP control 26%→58% (2019-2022), missed visits 61%→26% (BMC 2024). 38,000 ASHAs trained in Chhattisgarh (PMC 2024)." },

  tobaccoTax: { name: "Tobacco Tax +50%", type: "tobaccoTax", category: "Population Policy", coverage: 85, efficacy: 15, adherence: 90, costPerPerson: 0, targetRisk: "all", targetHypertensive: false, targetDiabetic: false, targetAge: [18, 80], targetSex: "All",
    description: "50% increase in effective tobacco tax — pro-poor health gain but regressive financial burden",
    drugs: [],
    testsPerYear: 0, visitsPerYear: 0, needsPhysician: false, needsColdChain: false, needsLab: false, needsSmartphone: false,
    evidence: "Price elasticity: cigarettes -0.44, bidis ~-1.0 (PMC 2009). Poorest 20% most responsive. 10% VAT increase → 6.5% dual-use decrease (PMC 2018). Annual tobacco deaths India: ~1 million (WHO). CVD risk benefit begins within months of cessation. WHO #1 Best Buy." },
};

const INTERVENTION_CATEGORIES = ["CVD Treatment", "Diabetes Treatment", "Digital Health", "Population Policy", "Service Delivery"];

// --- UTILITY FUNCTIONS ---

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xFFFFFFFF; return (s >>> 0) / 0xFFFFFFFF; };
}

function normalRandom(rng, mean, sd) {
  // Box-Muller transform with guards against edge cases
  let u1 = rng(), u2 = rng();
  // Clamp u1 away from 0 and 1 to prevent log(0) → -Inf → NaN
  u1 = Math.max(0.001, Math.min(0.999, u1));
  u2 = Math.max(0.001, Math.min(0.999, u2));
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const val = mean + sd * z;
  // Final NaN/Inf guard
  return isFinite(val) ? val : mean;
}

// --- DIABETES & CKD DISEASE MODULES ---

function initializeDiseaseState(person, rng) {
  // Diabetes initialization
  person.preDiabetic = person.glucose >= 100 && person.glucose < 126;
  person.diabetic = person.glucose >= 126 || person.diabetic;
  person.diabeticYears = person.diabetic ? Math.floor(rng() * 15) : 0;
  person.hba1c = person.diabetic ? 7.5 + normalRandom(rng, 0, 1.2) : 5.2;
  person.hasRetinopathy = person.diabetic && person.diabeticYears > 5 && rng() < 0.25;
  person.hasNeuropathy = person.diabetic && person.diabeticYears > 7 && rng() < 0.30;
  person.hasNephropathy = person.diabetic && person.diabeticYears > 10 && rng() < 0.20;

  // CKD initialization (GFR-based stages)
  const baseGFR = NFHS_PARAMS.mean_gfr[person.wealthQ];
  person.gfr = Math.max(5, Math.min(140, normalRandom(rng, baseGFR, 12)));
  person.ckdStage = person.gfr >= 60 ? 1 : person.gfr >= 45 ? 2 : person.gfr >= 30 ? 3 : person.gfr >= 15 ? 4 : 5;
  person.esrd = person.ckdStage === 5;
  person.onDialysis = person.esrd && (person.urban || rng() < 0.3); // Urban-rural divide
  person.gfrDeclinePerYear = person.diabetic ? -2.5 : -0.8; // Diabetes accelerates decline
}

function getCKDRiskMultiplier(ckdStage) {
  return ckdStage === 1 ? 1.0 : ckdStage === 2 ? 1.1 : ckdStage === 3 ? 1.5 : ckdStage === 4 ? 2.2 : 3.0;
}

// --- MICROSIMULATION ENGINE ---

function generatePopulation(n, stateOrDistrict, rng, isDistrict = false) {
  const params = isDistrict ? stateOrDistrict : STATES[stateOrDistrict];
  const pop = [];
  for (let i = 0; i < n; i++) {
    const wealthIdx = Math.min(4, Math.floor(rng() * 5));
    const casteIdx = Math.min(3, Math.floor(rng() * 4));
    const sex = rng() > 0.48 ? "M" : "F";
    const age = Math.floor(30 + rng() * 40);
    const urban = rng() < params.urbanPct;

    const sbp = normalRandom(rng, NFHS_PARAMS.mean_sbp[wealthIdx] + (sex === "M" ? 2 : -1) + (age - 45) * 0.4, 15);
    const chol = normalRandom(rng, NFHS_PARAMS.mean_chol[wealthIdx] + (age - 45) * 0.3, 28);
    const bmi = normalRandom(rng, NFHS_PARAMS.mean_bmi[wealthIdx] + (sex === "F" ? 1 : 0), 3.5);
    const glucose = normalRandom(rng, 95 + wealthIdx * 5 + (age - 45) * 0.3, 20);
    const tobPrevAdj = isDistrict ? (params.tobPrev / 0.27) : 1;
    const tobacco = rng() < NFHS_PARAMS.tobacco_use[wealthIdx] * (sex === "M" ? 1.8 : 0.3) * tobPrevAdj;
    const htAdj = isDistrict ? (params.htPrev / 0.22) : 1;
    const hypertensive = sbp >= 140 || rng() < NFHS_PARAMS.hypertension_prev[wealthIdx] * htAdj;
    const dmAdj = isDistrict ? (params.dmPrev / 0.11) : 1;
    const diabetic = glucose >= 126 || rng() < NFHS_PARAMS.diabetes_prev[wealthIdx] * dmAdj;
    const onTreatment = hypertensive && rng() < NFHS_PARAMS.treatment_access[wealthIdx];

    const cvdMortRef = isDistrict ? (params.htPrev / 0.22) * 195 : params.cvdMort;
    let cvdRisk10yr = 0.02 + (age - 40) * 0.003 + (sbp - 120) * 0.0008 + (chol - 180) * 0.0003
      + (tobacco ? 0.04 : 0) + (diabetic ? 0.035 : 0) + (sex === "M" ? 0.015 : 0);
    cvdRisk10yr *= cvdMortRef / 200;
    cvdRisk10yr = Math.max(0.005, Math.min(0.65, cvdRisk10yr));

    // Clamp all continuous variables to physiologically valid ranges
    const sbpC = Math.max(80, Math.min(220, Math.round(sbp)));
    const cholC = Math.max(100, Math.min(400, Math.round(chol)));
    const bmiC = Math.max(14, Math.min(50, parseFloat(bmi.toFixed(1))));
    const glucC = Math.max(50, Math.min(400, Math.round(glucose)));

    const person = { id: i, age, sex, wealthQ: wealthIdx, caste: casteIdx, urban, sbp: sbpC, chol: cholC, bmi: bmiC, glucose: glucC, tobacco, hypertensive, diabetic, onTreatment, cvdRisk10yr: parseFloat(cvdRisk10yr.toFixed(4)), alive: true, hadEvent: false, eventType: null, eventYear: null, qaly: 0, cost: 0, oopCost: 0, publicCost: 0, privateCost: 0, pmjayCost: 0 };

    initializeDiseaseState(person, rng);
    pop.push(person);
  }
  return pop;
}

function evaluateEligibility(person, intervention) {
  if (intervention.targetAge && (person.age < intervention.targetAge[0] || person.age > intervention.targetAge[1])) return false;
  if (intervention.targetSex && intervention.targetSex !== "All" && person.sex !== intervention.targetSex[0]) return false;
  if (intervention.targetRisk === "high" && person.cvdRisk10yr < 0.20) return false;
  if (intervention.targetRisk === "medium" && person.cvdRisk10yr < 0.10) return false;
  if (intervention.targetHypertensive && !person.hypertensive) return false;
  if (intervention.targetDiabetic && !person.diabetic) return false;
  if (intervention.needsSmartphone && !person.urban && person.wealthQ < 2) return false;
  return true;
}

function simulateCohort(population, intervention, years, rng) {
  const results = [];
  const pop = population.map(p => ({...p}));
  let treatedCount = 0;
  const N = pop.length;

  // Pre-generate common random numbers for each person × year
  // This ensures identical "fate" draws across baseline and intervention arms
  // (common random numbers variance reduction technique)
  const fate = new Array(N);
  for (let i = 0; i < N; i++) {
    fate[i] = new Array(years + 1);
    for (let y = 0; y <= years; y++) {
      fate[i][y] = {
        eventDraw: rng(), eventType1: rng(), eventType2: rng(),
        fatalDraw: rng(), bgDeathDraw: rng(), pmjayDraw: rng(), covDraw: rng(),
        sbpD: normalRandom(rng, 0.5, 1), glucD: normalRandom(rng, 0.3, 0.8),
        dialD: rng(), retD: rng(), neurD: rng(), nephD: rng(),
        hba1cD: normalRandom(rng, -0.1, 0.3),
      };
    }
  }

  for (let year = 0; year <= years; year++) {
    let alive = 0, events = 0, deaths = 0, totalQaly = 0, totalCost = 0, treated = 0;
    const eventsByWealth = [0,0,0,0,0], deathsByWealth = [0,0,0,0,0];
    const qalyByWealth = [0,0,0,0,0], costByWealth = [0,0,0,0,0], aliveByWealth = [0,0,0,0,0];

    for (let pi = 0; pi < N; pi++) {
      const p = pop[pi];
      const f = fate[pi][year];
      if (!p.alive) continue;
      alive++;
      aliveByWealth[p.wealthQ]++;

      if (year > 0) {
        p.age++;
        p.sbp += f.sbpD;
        p.glucose += f.glucD;

        // CKD progression
        if (p.diabetic) {
          p.gfr += p.gfrDeclinePerYear;
          p.ckdStage = p.gfr >= 60 ? 1 : p.gfr >= 45 ? 2 : p.gfr >= 30 ? 3 : p.gfr >= 15 ? 4 : 5;
          p.esrd = p.ckdStage === 5;
          p.onDialysis = p.esrd && (p.urban || f.dialD < 0.3);
        }

        // Diabetes progression
        if (p.diabetic) {
          p.diabeticYears++;
          p.hba1c = Math.max(5.2, p.hba1c + f.hba1cD);
          if (p.diabeticYears > 5 && !p.hasRetinopathy && f.retD < 0.02) p.hasRetinopathy = true;
          if (p.diabeticYears > 7 && !p.hasNeuropathy && f.neurD < 0.025) p.hasNeuropathy = true;
          if (p.diabeticYears > 10 && !p.hasNephropathy && f.nephD < 0.015) p.hasNephropathy = true;
        }
      }

      // Intervention effect determination
      let riskReduction = 1.0, additionalCost = 0, interventionTreated = false;
      if (intervention.type !== "none" && year > 0) {
        const eligible = evaluateEligibility(p, intervention);
        if (eligible) {
          const baseCov = intervention.coverage / 100;
          const covMult = p.urban ? 1.1 : 0.85;
          const effCov = Math.min(1, baseCov * covMult);
          if (f.covDraw < effCov) {
            const baseAdh = intervention.adherence / 100;
            const effAdh = Math.min(1, baseAdh * (0.80 + p.wealthQ * 0.05));
            riskReduction = 1.0 - (intervention.efficacy / 100) * effAdh;
            additionalCost = intervention.costPerPerson;
            interventionTreated = true; // Track separately — don't modify p.onTreatment (avoids cost double-count)
            treated++;
          }
        }
      }

      // CVD event risk
      let annualRisk = 1 - Math.pow(1 - p.cvdRisk10yr, 0.1);
      annualRisk *= riskReduction;
      if (p.diabetic) annualRisk *= 2.0;
      annualRisk *= getCKDRiskMultiplier(p.ckdStage);
      if (p.hadEvent) annualRisk *= 2.0;

      // Background mortality (SRS-calibrated)
      const bgMort = 0.003 + Math.pow((p.age - 30), 1.5) * 0.00004;

      // Event and death determination using common random numbers
      if (!p.hadEvent && f.eventDraw < annualRisk) {
        p.hadEvent = true;
        p.eventType = f.eventType1 < 0.55 ? "MI" : f.eventType2 < 0.65 ? "Stroke" : "HF";
        p.eventYear = year;
        events++;
        eventsByWealth[p.wealthQ]++;
        const eCost = p.eventType === "MI" ? 250000 : p.eventType === "Stroke" ? 180000 : 120000;
        const totalEventCost = eCost * NFHS_PARAMS.cost_multiplier[p.wealthQ];
        const oopShare = NFHS_PARAMS.oop_spending_pct[p.wealthQ];
        const pmjayShare = f.pmjayDraw < 0.4 ? 0.6 : 0;
        p.oopCost += totalEventCost * (oopShare - pmjayShare);
        p.pmjayCost += totalEventCost * pmjayShare;
        p.publicCost += totalEventCost * (1 - oopShare - pmjayShare);
        p.cost += totalEventCost;

        if (f.fatalDraw < (p.eventType === "MI" ? 0.12 : p.eventType === "Stroke" ? 0.18 : 0.08)) {
          p.alive = false; deaths++; deathsByWealth[p.wealthQ]++;
        }
      } else if (f.bgDeathDraw < bgMort) {
        p.alive = false; deaths++; deathsByWealth[p.wealthQ]++;
      }

      // QALY (GBD 2021 disability weights) with 3% annual discounting
      const discountFactor = Math.pow(1.03, -year);
      if (p.alive) {
        let qaly = 1.0;
        if (p.hadEvent) qaly -= (p.eventType === "Stroke" ? 0.32 : 0.15);
        if (p.diabetic) qaly -= 0.04;
        if (p.hasRetinopathy) qaly -= 0.06;
        if (p.hasNeuropathy) qaly -= 0.04;
        if (p.hasNephropathy || p.ckdStage >= 3) qaly -= 0.07;
        if (p.onDialysis) qaly -= 0.21;
        if (p.hypertensive && !p.onTreatment && !interventionTreated) qaly -= 0.03;
        qaly *= discountFactor; // Standard 3% annual discount rate
        p.qaly += qaly; totalQaly += qaly; qalyByWealth[p.wealthQ] += qaly;
      }

      // Annual costs (discounted at 3%)
      const annCost = ((p.onTreatment ? 2400 : 0) + (p.hadEvent && p.alive ? 18000 : 0) + additionalCost + (p.onDialysis ? 316000 : 0)) * discountFactor;
      p.cost += annCost; totalCost += annCost; costByWealth[p.wealthQ] += annCost;
    }
    treatedCount = treated;
    results.push({ year, alive, events, deaths, totalQaly, totalCost, treated, eventsByWealth, deathsByWealth, qalyByWealth, costByWealth, aliveByWealth });
  }
  return { results, population: pop, treatedCount };
}

// --- DCEA ENGINE ---

function computeDCEA(baseRes, intRes, equityWeights) {
  const lastYear = baseRes.results.length - 1;
  const make = (res) => Array(5).fill(null).map((_, q) => ({
    totalQaly: res.results.reduce((s, r) => s + r.qalyByWealth[q], 0),
    totalCost: res.results.reduce((s, r) => s + r.costByWealth[q], 0),
    events: res.results.reduce((s, r) => s + r.eventsByWealth[q], 0),
    deaths: res.results.reduce((s, r) => s + r.deathsByWealth[q], 0),
    alive: res.results[lastYear].aliveByWealth[q],
  }));
  const base = make(baseRes), int = make(intRes);
  // WTP threshold: ₹2,34,859 = 1× GDP per capita 2024-25 (HTAIn empirical: 1-1.52× GDP per capita, Value in Health 2025)
  const wtp = 234859;

  const incr = Array(5).fill(null).map((_, q) => {
    const dQ = int[q].totalQaly - base[q].totalQaly;
    const dC = int[q].totalCost - base[q].totalCost;
    const nhb = dQ - dC / wtp;
    const wNhb = nhb * equityWeights[q];
    const icer = dQ > 0.5 ? Math.round(dC / dQ) : (dQ <= 0 && dC > 0 ? "Dominated" : dQ <= 0 && dC <= 0 ? "Cost-Saving" : "Minimal");
    return { quintile: WEALTH_QUINTILES[q], dQaly: parseFloat(dQ.toFixed(1)), dCost: Math.round(dC), dEvents: int[q].events - base[q].events, dDeaths: int[q].deaths - base[q].deaths, nhb: parseFloat(nhb.toFixed(2)), equityWeight: equityWeights[q], weightedNhb: parseFloat(wNhb.toFixed(2)), icer };
  });

  const totDQ = incr.reduce((s, r) => s + r.dQaly, 0);
  const totDC = incr.reduce((s, r) => s + r.dCost, 0);
  const stdNHB = incr.reduce((s, r) => s + r.nhb, 0);
  const eqNHB = incr.reduce((s, r) => s + r.weightedNhb, 0);

  const ci = 2 * [0.2,0.4,0.6,0.8,1.0].reduce((s, p, i) => s + (p - 0.5) * (incr[i].nhb / (stdNHB || 1)), 0);

  const stdICER = totDQ > 0.5 ? Math.round(totDC / totDQ) : (totDQ <= 0 && totDC > 0 ? "Dominated" : totDQ <= 0 && totDC <= 0 ? "Cost-Saving" : "Minimal");
  return { incrementalByWealth: incr, totalDQaly: parseFloat(totDQ.toFixed(1)), totalDCost: Math.round(totDC), standardNHB: parseFloat(stdNHB.toFixed(2)), equityWeightedNHB: parseFloat(eqNHB.toFixed(2)), standardICER: stdICER, concentrationIndex: parseFloat(ci.toFixed(4)), ceaRecommendation: stdNHB > 0 ? "Cost-Effective" : "Not Cost-Effective", dceaRecommendation: eqNHB > 0 ? "Equity-Positive" : "Equity-Negative", diverges: (stdNHB > 0) !== (eqNHB > 0) };
}

function getEquityWeights(eps) {
  const rel = [0.3, 0.5, 0.8, 1.2, 2.2];
  const mean = rel.reduce((s, v) => s + v, 0) / 5;
  return rel.map(y => Math.pow(y / mean, -eps));
}

// --- HEAT MEASURES (9 equity measures) ---

function computeHEATMeasures(baseRes, intRes) {
  const lastYear = baseRes.results.length - 1;
  const make = (res, q) => ({
    qaly: res.results.reduce((s, r) => s + r.qalyByWealth[q], 0),
    n: res.results[lastYear].aliveByWealth[q] || 1,
  });

  const measures = {};

  // 1. Simple Difference (D)
  measures.difference = Array(5).fill(null).map((_, q) => {
    const base = make(baseRes, q);
    const int = make(intRes, q);
    return (int.qaly / int.n) - (base.qaly / base.n);
  });

  // 2. Ratio (R)
  measures.ratio = Array(5).fill(null).map((_, q) => {
    const base = make(baseRes, q);
    const int = make(intRes, q);
    return (int.qaly / int.n) / (base.qaly / base.n);
  });

  // 3. Population Attributable Risk (PAR) - events averted
  measures.par = Array(5).fill(null).map((_, q) => {
    return baseRes.results.reduce((s,r)=>s+r.eventsByWealth[q],0) - intRes.results.reduce((s,r)=>s+r.eventsByWealth[q],0);
  });

  // 4. Population Attributable Fraction (PAF)
  measures.paf = Array(5).fill(null).map((_, q) => {
    const baseEvents = baseRes.results.reduce((s,r)=>s+r.eventsByWealth[q],0) || 1;
    return (baseEvents - intRes.results.reduce((s,r)=>s+r.eventsByWealth[q],0)) / baseEvents;
  });

  // 5. Slope Index of Inequality (SII)
  const sii = (res) => {
    const means = Array(5).fill(null).map((_, q) => make(res, q).qaly / make(res, q).n);
    const x = [0.1, 0.3, 0.5, 0.7, 0.9];
    const slopes = means.map((m, i) => ({x: x[i], y: m}));
    const xMean = x.reduce((a,b)=>a+b)/5, yMean = means.reduce((a,b)=>a+b)/5;
    const slope = slopes.reduce((s,p)=>s+(p.x-xMean)*(p.y-yMean),0) / slopes.reduce((s,p)=>s+(p.x-xMean)*(p.x-xMean),0);
    return slope;
  };
  measures.sii = sii(intRes) - sii(baseRes);

  // 6. Relative Index of Inequality (RII)
  const rii = (res) => {
    const means = Array(5).fill(null).map((_, q) => make(res, q).qaly / make(res, q).n);
    const overallMean = means.reduce((a,b)=>a+b)/5;
    const x = [0.1, 0.3, 0.5, 0.7, 0.9];
    const xMean = 0.5, yMean = overallMean;
    const slope = Array(5).fill(null).reduce((s,_,i)=>s+(x[i]-xMean)*(means[i]-yMean),0) / Array(5).fill(null).reduce((s,_,i)=>s+(x[i]-xMean)*(x[i]-xMean),0);
    return slope / overallMean;
  };
  measures.rii = rii(intRes) / rii(baseRes);

  // 7. Concentration Index (CI)
  measures.ci = 2 * [0.2,0.4,0.6,0.8,1.0].reduce((s, p, i) => {
    const baseMean = Array(5).fill(null).reduce((s,_,q)=>s+make(baseRes,q).qaly/make(baseRes,q).n,0)/5;
    const intMean = Array(5).fill(null).reduce((s,_,q)=>s+make(intRes,q).qaly/make(intRes,q).n,0)/5;
    return s + (p - 0.5) * ((make(intRes,i).qaly/make(intRes,i).n) / intMean);
  }, 0);

  // 8. Atkinson Index (on per-capita QALY gains — more sensitive for DCEA)
  measures.atkinson = (() => {
    const gains = Array(5).fill(null).map((_, q) => {
      const bpc = make(baseRes, q).qaly / make(baseRes, q).n;
      const ipc = make(intRes, q).qaly / make(intRes, q).n;
      return Math.max(0.001, ipc - bpc); // per-capita QALY gain (floor at 0.001 to avoid log issues)
    });
    const overallMean = gains.reduce((a,b)=>a+b)/5;
    if (overallMean <= 0) return 0;
    const epsilon = 0.5;
    return 1 - Math.pow((1/5) * gains.reduce((s,m)=>s+Math.pow(m/overallMean,1-epsilon),0), 1/(1-epsilon));
  })();

  // 9. Theil Index (on per-capita QALY gains)
  measures.theil = (() => {
    const gains = Array(5).fill(null).map((_, q) => {
      const bpc = make(baseRes, q).qaly / make(baseRes, q).n;
      const ipc = make(intRes, q).qaly / make(intRes, q).n;
      return Math.max(0.001, ipc - bpc);
    });
    const overallMean = gains.reduce((a,b)=>a+b)/5;
    if (overallMean <= 0) return 0;
    return (1/5) * gains.reduce((s,m)=>{
      const r = m / overallMean;
      return s + (r > 0 ? r * Math.log(r) : 0);
    }, 0);
  })();

  return measures;
}

// --- LOGISTICS ENGINE ---

function estimateLogistics(district, intervention, years) {
  const d = DISTRICTS[district];
  if (!d || intervention.type === "none") return null;

  const pop30_69 = d.pop * 0.45;
  let eligiblePct = 1.0;
  if (intervention.targetHypertensive) eligiblePct = d.htPrev;
  else if (intervention.targetDiabetic) eligiblePct = d.dmPrev;
  else if (intervention.targetRisk === "high") eligiblePct = 0.12;
  else if (intervention.targetRisk === "medium") eligiblePct = 0.25;

  const eligible = Math.round(pop30_69 * eligiblePct);
  const covered = Math.round(eligible * intervention.coverage / 100);
  const adherent = Math.round(covered * intervention.adherence / 100);

  const drugSupply = intervention.drugs.map(drug => ({
    name: drug.name,
    dailyDose: drug.dailyDose,
    monthlyPerPatient: drug.dailyDose * 30,
    annualTablets: drug.dailyDose * 365 * adherent,
    annualCost: drug.monthly * 12 * adherent,
    monthlyNeed: Math.ceil(drug.dailyDose * 30 * adherent / 1000),
  }));

  const annualLabTests = adherent * intervention.testsPerYear;
  const labCapacityPerFacility = 2500;
  const labsNeeded = Math.ceil(annualLabTests / labCapacityPerFacility);
  const labGap = Math.max(0, labsNeeded - d.labFacilities);

  const visitsTotal = adherent * intervention.visitsPerYear;
  const visitsPerProviderPerYear = 3000;
  const providersNeeded = Math.ceil(visitsTotal / visitsPerProviderPerYear);
  const physicianVisits = intervention.needsPhysician ? visitsTotal : Math.round(visitsTotal * 0.15);
  const physiciansNeeded = Math.ceil(physicianVisits / 2000);
  const physicianGap = Math.max(0, physiciansNeeded - d.physicians);
  const ashaNeeded = intervention.needsPhysician ? 0 : Math.ceil(visitsTotal * 0.6 / 1500);
  const ashaGap = Math.max(0, ashaNeeded - d.asha);

  const pharmacyLoad = adherent / (d.pharmacies || 1);
  const needsColdChain = intervention.needsColdChain;
  const smartphoneBarrier = intervention.needsSmartphone ? Math.round(eligible * 0.4 * (1 - d.urbanPct)) : 0;

  const drugCostAnnual = drugSupply.reduce((s, d) => s + d.annualCost, 0);
  const labCostAnnual = annualLabTests * 200;
  const hrCostAnnual = providersNeeded * 300000;
  const overheadAnnual = (drugCostAnnual + labCostAnnual + hrCostAnnual) * 0.15;
  const totalAnnualCost = drugCostAnnual + labCostAnnual + hrCostAnnual + overheadAnnual;

  const hwcReadiness = Math.min(100, Math.round((d.phcWithNcdKit / d.hwc) * 100));
  const facilitiesNeeded = Math.ceil(adherent / 500);
  const facilityGap = Math.max(0, facilitiesNeeded - d.hwc);

  return {
    district, eligible, covered, adherent, drugSupply, annualLabTests, labsNeeded, labGap,
    providersNeeded, physiciansNeeded, physicianGap, ashaNeeded, ashaGap,
    pharmacyLoad: Math.round(pharmacyLoad), smartphoneBarrier,
    drugCostAnnual, labCostAnnual, hrCostAnnual, overheadAnnual, totalAnnualCost,
    totalCostYears: totalAnnualCost * years,
    hwcReadiness, facilitiesNeeded, facilityGap,
    readinessScore: Math.round(
      (Math.min(1, d.physicians / physiciansNeeded) * 25) +
      (Math.min(1, d.labFacilities / (labsNeeded || 1)) * 25) +
      (Math.min(1, d.hwc / (facilitiesNeeded || 1)) * 25) +
      ((d.phcWithNcdKit / d.hwc) * 25)
    ),
  };
}

// --- COLORS ---
const COLORS = {
  quintiles: ["#c53030", "#dd6b20", "#d69e2e", "#38a169", "#2b6cb0"],
  categories: { "CVD Treatment": "#2b6cb0", "Diabetes Treatment": "#805ad5", "Digital Health": "#38a169", "Population Policy": "#dd6b20", "Service Delivery": "#c53030" },
  pie: ["#2b6cb0", "#38a169", "#dd6b20", "#805ad5", "#c53030", "#d69e2e"],
};

// --- UI COMPONENTS ---

function TabBtn({ active, onClick, children, icon }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap ${active ? "bg-white text-blue-800 border-t-2 border-x border-blue-800 -mb-px" : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"}`}>
      <span>{icon}</span>{children}
    </button>
  );
}

function Metric({ label, value, sub, color = "blue" }) {
  const cm = { blue: "border-blue-500 bg-blue-50", green: "border-green-500 bg-green-50", red: "border-red-500 bg-red-50", orange: "border-orange-500 bg-orange-50", purple: "border-purple-500 bg-purple-50", gray: "border-gray-400 bg-gray-50" };
  return (
    <div className={`border-l-4 ${cm[color] || cm.blue} p-2.5 rounded-r`}>
      <div className="text-xs text-gray-500 uppercase tracking-wide leading-tight">{label}</div>
      <div className="text-lg font-bold mt-0.5">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function Badge({ text, color }) {
  const cm = { green: "bg-green-100 text-green-800", red: "bg-red-100 text-red-800", yellow: "bg-yellow-100 text-yellow-800", blue: "bg-blue-100 text-blue-800" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cm[color] || cm.blue}`}>{text}</span>;
}

// --- TAB: GUIDE/TUTORIAL ---

function GuideTab() {
  const dataSources = [
    { source: "NFHS-5 (2019-21)", usedFor: "Hypertension, diabetes, tobacco prevalence; treatment access; wealth quintile distributions" },
    { source: "Globorisk India", usedFor: "10-year CVD risk prediction; calibrated to Indian population" },
    { source: "NSSO 75th Round", usedFor: "Out-of-pocket spending patterns; cost multipliers by wealth quintile" },
    { source: "PMJAY Data (2024)", usedFor: "Event costs (MI ₹2.5L, Stroke ₹1.8L); scheme coverage 40%" },
    { source: "Lancet meta-analyses", usedFor: "Drug efficacy: BP 20% RRR per 10mmHg, statin 20% per mmol/L LDL" },
    { source: "GBD 2021", usedFor: "Disease disability weights (QALYs); population-level health burden" },
    { source: "Indian RCTs (IHCI, STENO-2)", usedFor: "Intervention efficacy, adherence, cost per person with Indian context" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-gray-800 mb-2">Welcome to NCD-India Feasibility Prototype</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          This platform demonstrates the architecture and analytical approach of the proposed <strong>NCD-India Integrated Research Platform</strong>. It combines patient-level microsimulation, Distributed Cost-Effectiveness Analysis (DCEA) with equity weighting, disease modules (diabetes, CKD), and comprehensive logistics planning for NCDs in India.
        </p>
        <p className="text-sm text-gray-600 mt-2 italic">
          Current version uses illustrative parameters for demonstration. The funded project will replace all with rigorously derived, validated, peer-reviewed Indian data.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-2">How to Use This Platform</h3>
        <div className="text-xs text-gray-700 space-y-1.5">
          <div><strong>1. Population Tab:</strong> View synthetic population characteristics by wealth quintile (NFHS-5 calibrated). See the "double jeopardy" — high disease burden in poor populations with lowest treatment access.</div>
          <div><strong>2. Microsimulation Tab:</strong> Track survival, CVD events, and deaths over 20-year horizon under status quo vs. selected intervention.</div>
          <div><strong>3. DCEA Tab:</strong> Compare standard cost-effectiveness (efficiency) vs. equity-weighted results. Detect when interventions disproportionately benefit the poor or rich.</div>
          <div><strong>4. Compare All:</strong> Head-to-head ranking of all 9 interventions by equity-weighted net health benefit — population policy often ranks highest.</div>
          <div><strong>5. Epsilon Explorer:</strong> Sensitivity analysis: at what inequality aversion level (ε) does the policy recommendation change?</div>
          <div><strong>6. HEIP & HEAT:</strong> Health Equity Impact Plane visualizes trade-offs. 9 equity measures (Gini, Theil, Atkinson, etc.) quantify inequality changes.</div>
          <div><strong>7. District Planning:</strong> Same intervention, different equity impact and implementation readiness across 5 MP districts — enables geographically tailored strategies.</div>
          <div><strong>8. Logistics:</strong> Resource gaps, drug supply needs, lab capacity, provider workload for a specific district.</div>
          <div><strong>9. States:</strong> Compare intervention effectiveness across Kerala, Maharashtra, Bihar, Tamil Nadu — demonstrates state-level heterogeneity.</div>
          <div><strong>10-14. Advanced Tabs:</strong> Demonstrators (diabetes, tobacco tax), PSA (parameter uncertainty), validation, and enhanced cost analysis (CHE rates, impoverishment).</div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-3">
        <h3 className="text-sm font-bold text-blue-900 mb-2">Key Assumptions & Data Sources</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead><tr className="bg-blue-100"><th className="p-1.5 text-left">Data Domain</th><th className="p-1.5 text-left">Source(s)</th><th className="p-1.5 text-left">How Used</th></tr></thead>
            <tbody>
              {dataSources.map((d, i) => (
                <tr key={i} className={i % 2 ? "bg-white" : "bg-blue-50"}>
                  <td className="p-1.5 font-medium">{d.source}</td>
                  <td className="p-1.5 text-gray-600">{d.usedFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
        <h3 className="text-sm font-bold text-yellow-900 mb-1.5">Important Limitations</h3>
        <ul className="text-xs text-yellow-800 space-y-1 list-disc list-inside">
          <li><strong>Feasibility Prototype:</strong> All intervention parameters and costs are illustrative to demonstrate the platform architecture and analytical workflow.</li>
          <li><strong>Not for Policy Use:</strong> This prototype should NOT be used to make real policy decisions without full validation against Indian trial and observational data.</li>
          <li><strong>Synthetic Population:</strong> Generated from NFHS-5 distributions; does not represent any specific real cohort.</li>
          <li><strong>Parameter Ranges:</strong> Efficacy, adherence, and costs reflect published estimates but require local calibration for specific contexts.</li>
          <li><strong>Equity Weights:</strong> Relative inequality aversion (ε) is set by user; no consensus "correct" value — reflect policy priorities.</li>
          <li><strong>Future Work:</strong> The funded project will include formal calibration, sensitivity analysis, and validation against prospective cohort data.</li>
        </ul>
      </div>

      <div className="bg-green-50 border border-green-200 rounded p-3">
        <h3 className="text-sm font-bold text-green-900 mb-1.5">How to Interpret the Results</h3>
        <div className="text-xs text-green-800 space-y-1.5">
          <div><strong>ΔQALYs:</strong> Quality-adjusted life years gained by intervention vs. status quo. 1 QALY = 1 year in perfect health.</div>
          <div><strong>NHB (Net Health Benefit):</strong> = ΔQALYs − (ΔCost / WTP). Positive = cost-effective at WTP threshold. WTP = ₹2,34,859 (1× GDP per capita).</div>
          <div><strong>Equity-Weighted NHB:</strong> NHB weighted by relative inequality aversion — emphasizes benefits to poorest. If diverges from standard NHB, equity changes the decision.</div>
          <div><strong>Concentration Index:</strong> Positive = pro-rich (benefits higher-income groups more). Negative = pro-poor.</div>
          <div><strong>HEIP Quadrants:</strong> NE = Win-win (more health, less inequality). NW = Equitable but costly. SE = Efficient but unequal. SW = Lose-lose.</div>
        </div>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded p-3">
        <h3 className="text-sm font-bold text-purple-900 mb-1.5">Citation Format</h3>
        <p className="text-xs text-purple-800 font-mono bg-white p-2 rounded border border-purple-200 mt-1">
          "NCD-India: Feasibility Prototype v3.0 (Microsimulation + DCEA + Equity Analysis).<br/>
          ICMR Intermediate Grant Application, March 2026.<br/>
          Available at: [platform URL]"
        </p>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded p-3">
        <h3 className="text-sm font-bold text-indigo-900 mb-1.5">Quick Start</h3>
        <ol className="text-xs text-indigo-800 space-y-1 list-decimal list-inside">
          <li>Adjust <strong>Population Size</strong> (default 5,000) and <strong>Time Horizon</strong> (default 20 years) in the left panel.</li>
          <li>Select an <strong>Intervention</strong> from the dropdown (or "Use Custom Input" to build your own).</li>
          <li>Adjust <strong>Inequality Aversion (ε)</strong> — higher = stronger equity priority (default 1.0, moderate).</li>
          <li>Click <strong>"Run NCD-India Simulation"</strong> — takes ~1 second.</li>
          <li>Explore tabs: Start with Population → Simulation → DCEA → HEIP for the full equity story.</li>
        </ol>
      </div>

      <div className="text-center text-xs text-gray-500 italic">
        For questions about methodology, data sources, or how to adapt this framework for your state/district, contact the NCD-India team.
      </div>
    </div>
  );
}

// --- TAB: POPULATION ---

function PopulationTab({ population }) {
  const stats = useMemo(() => {
    if (!population.length) return null;
    return Array(5).fill(null).map((_, q) => {
      const g = population.filter(p => p.wealthQ === q);
      const n = g.length || 1; // guard against division by zero
      const safe = (arr, fn) => { const vals = arr.filter(p => isFinite(fn(p))); return vals.length ? vals.reduce((s, p) => s + fn(p), 0) / vals.length : 0; };
      return { quintile: WEALTH_QUINTILES[q], n: g.length, meanAge: safe(g, p => p.age).toFixed(1), meanSBP: safe(g, p => p.sbp).toFixed(0), htPrev: ((g.filter(p => p.hypertensive).length / n) * 100).toFixed(1), txAccess: ((g.filter(p => p.onTreatment).length / Math.max(1, g.filter(p => p.hypertensive).length)) * 100).toFixed(1), dmPrev: ((g.filter(p => p.diabetic).length / n) * 100).toFixed(1), tobPrev: ((g.filter(p => p.tobacco).length / n) * 100).toFixed(1), meanRisk: (safe(g, p => p.cvdRisk10yr) * 100).toFixed(1) };
    });
  }, [population]);

  if (!stats) return <div className="p-12 text-center text-gray-400">Click "Run Simulation" to generate population data</div>;

  const dj = stats.map(s => ({ q: s.quintile.split(" ")[0], "HT Prevalence %": +s.htPrev, "Treatment Access %": +s.txAccess }));

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-gray-700">Synthetic Population — NFHS-5 Calibrated Distributions by Wealth Quintile</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead><tr className="bg-gray-800 text-white">{["Wealth Quintile","N","Mean Age","SBP","HT %","Tx Access %","DM %","Tobacco %","10yr CVD Risk %"].map(h => <th key={h} className="p-2 text-left">{h}</th>)}</tr></thead>
          <tbody>{stats.map((s, i) => (
            <tr key={i} className={i % 2 ? "bg-gray-50" : "bg-white"}>
              <td className="p-2 font-semibold" style={{color: COLORS.quintiles[i]}}>{s.quintile}</td>
              <td className="p-2">{s.n}</td><td className="p-2">{s.meanAge}</td><td className="p-2">{s.meanSBP}</td>
              <td className="p-2">{s.htPrev}</td><td className="p-2">{s.txAccess}</td><td className="p-2">{s.dmPrev}</td>
              <td className="p-2">{s.tobPrev}</td><td className="p-2">{s.meanRisk}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div>
        <div className="text-xs font-semibold text-gray-600 mb-1">The "Double Jeopardy" — HT Prevalence vs Treatment Access by Wealth</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dj}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="q" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip contentStyle={{fontSize:11}}/><Legend wrapperStyle={{fontSize:10}}/><Bar dataKey="HT Prevalence %" fill="#c53030"/><Bar dataKey="Treatment Access %" fill="#38a169"/></BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// --- TAB: SIMULATION ---

function SimulationTab({ baseRes, intRes, intName }) {
  if (!baseRes || !intRes) return <div className="p-12 text-center text-gray-400">Run simulation to see results</div>;

  const ts = baseRes.results.map((r, i) => ({ year: r.year, "Status Quo": r.alive, [intName]: intRes.results[i].alive }));
  const ce = baseRes.results.map((r, i) => ({ year: r.year, "Status Quo": baseRes.results.slice(0,i+1).reduce((s,x)=>s+x.events,0), [intName]: intRes.results.slice(0,i+1).reduce((s,x)=>s+x.events,0) }));
  const tbe = baseRes.results.reduce((s,r)=>s+r.events,0), tie = intRes.results.reduce((s,r)=>s+r.events,0);
  const tbd = baseRes.results.reduce((s,r)=>s+r.deaths,0), tid = intRes.results.reduce((s,r)=>s+r.deaths,0);
  const tiq = intRes.results.reduce((s,r)=>s+r.totalQaly,0) - baseRes.results.reduce((s,r)=>s+r.totalQaly,0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <Metric label="CVD Events Averted" value={tbe - tie} sub={`${((1-tie/tbe)*100).toFixed(1)}% reduction`} color="green"/>
        <Metric label="Deaths Averted" value={tbd - tid} sub={`${((1-tid/tbd)*100).toFixed(1)}% reduction`} color="blue"/>
        <Metric label="Survivors (end)" value={`+${intRes.results.at(-1).alive - baseRes.results.at(-1).alive}`} color="purple"/>
        <Metric label="QALYs Gained" value={Math.round(tiq).toLocaleString()} color="orange"/>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">Survival Over Time</div>
          <ResponsiveContainer width="100%" height={210}><LineChart data={ts}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="year" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip contentStyle={{fontSize:11}}/><Legend wrapperStyle={{fontSize:10}}/><Line type="monotone" dataKey="Status Quo" stroke="#c53030" strokeWidth={2} dot={false}/><Line type="monotone" dataKey={intName} stroke="#38a169" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">Cumulative CVD Events</div>
          <ResponsiveContainer width="100%" height={210}><AreaChart data={ce}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="year" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip contentStyle={{fontSize:11}}/><Legend wrapperStyle={{fontSize:10}}/><Area type="monotone" dataKey="Status Quo" stroke="#c53030" fill="#fed7d7"/><Area type="monotone" dataKey={intName} stroke="#38a169" fill="#c6f6d5"/></AreaChart></ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// --- TAB: DCEA ---

function DCEATab({ dcea }) {
  if (!dcea) return <div className="p-12 text-center text-gray-400">Run simulation to see DCEA results</div>;

  const nhbD = dcea.incrementalByWealth.map((r,i) => ({ q: r.quintile.split(" ")[0], "Standard NHB": r.nhb, "Equity-Wt NHB": r.weightedNhb }));
  const ccD = [{pop:0,nhb:0,eq:0}]; let cum=0; const tot=Math.abs(dcea.standardNHB)||1;
  dcea.incrementalByWealth.forEach((r,i) => { cum += r.nhb/tot; ccD.push({pop:(i+1)*20, nhb: cum*100, eq:(i+1)*20}); });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <Metric label="Standard CEA" value={dcea.ceaRecommendation} sub={`NHB: ${dcea.standardNHB}`} color={dcea.standardNHB>0?"green":"red"}/>
        <Metric label="DCEA (Equity)" value={dcea.dceaRecommendation} sub={`Eq-Wt NHB: ${dcea.equityWeightedNHB}`} color={dcea.equityWeightedNHB>0?"green":"red"}/>
        <Metric label="Concentration Idx" value={dcea.concentrationIndex} sub={dcea.concentrationIndex>0?"Pro-rich":"Pro-poor"} color={dcea.concentrationIndex>0?"orange":"green"}/>
        <Metric label="CEA vs DCEA" value={dcea.diverges?"DIVERGE":"Agree"} sub={dcea.diverges?"Equity changes the decision!":"Same recommendation"} color={dcea.diverges?"red":"green"}/>
      </div>
      {dcea.diverges && <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-800"><b>Key Finding:</b> Standard CEA and DCEA give different recommendations — the equity dimension changes the policy decision.</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead><tr className="bg-gray-800 text-white">{["Quintile","ΔQALYs","ΔCost (₹)","ICER","NHB","Eq. Weight","Eq-Wt NHB"].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead>
          <tbody>
            {dcea.incrementalByWealth.map((r,i)=>(
              <tr key={i} className={i%2?"bg-gray-50":"bg-white"}>
                <td className="p-2 font-semibold" style={{color:COLORS.quintiles[i]}}>{r.quintile}</td>
                <td className="p-2 text-right">{r.dQaly}</td><td className="p-2 text-right">{r.dCost.toLocaleString()}</td>
                <td className="p-2 text-right">{typeof r.icer==="number"?`₹${r.icer.toLocaleString()}`:r.icer}</td>
                <td className="p-2 text-right" style={{color:r.nhb>0?"#38a169":"#c53030"}}>{r.nhb}</td>
                <td className="p-2 text-right">{r.equityWeight.toFixed(2)}</td>
                <td className="p-2 text-right font-bold" style={{color:r.weightedNhb>0?"#38a169":"#c53030"}}>{r.weightedNhb}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">NHB by Wealth Quintile</div>
          <ResponsiveContainer width="100%" height={200}><BarChart data={nhbD}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="q" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip contentStyle={{fontSize:11}}/><Legend wrapperStyle={{fontSize:10}}/><ReferenceLine y={0} stroke="#000"/><Bar dataKey="Standard NHB" fill="#2b6cb0"/><Bar dataKey="Equity-Wt NHB" fill="#805ad5"/></BarChart></ResponsiveContainer>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">Concentration Curve</div>
          <ResponsiveContainer width="100%" height={200}><LineChart data={ccD}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="pop" tick={{fontSize:10}} label={{value:'Cum. % Pop (poorest→richest)',position:'bottom',fontSize:8}}/><YAxis tick={{fontSize:10}}/><Tooltip contentStyle={{fontSize:11}}/><Legend wrapperStyle={{fontSize:10}}/><Line type="monotone" dataKey="eq" stroke="#999" strokeDasharray="5 5" name="Equality" dot={false}/><Line type="monotone" dataKey="nhb" stroke="#805ad5" strokeWidth={2} name="NHB Conc."/></LineChart></ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// --- TAB: HEIP & HEAT MEASURES ---

function HEIPHEATTab({ population, years, epsilon }) {
  const data = useMemo(() => {
    if (!population.length) return null;
    const rngB = seededRandom(42);
    const base = simulateCohort(population.map(p=>({...p})), INTERVENTIONS.none, years, rngB);

    const intData = [];
    Object.entries(INTERVENTIONS).filter(([k])=>k!=="none").forEach(([key, int]) => {
      const rng = seededRandom(42); // Same seed as baseline for CRN paired comparison
      const res = simulateCohort(population.map(p=>({...p})), int, years, rng);
      const dcea = computeDCEA(base, res, getEquityWeights(epsilon));
      const heat = computeHEATMeasures(base, res);

      const totalBaseQaly = base.results.reduce((s,r)=>s+r.totalQaly,0);
      const totalIntQaly = res.results.reduce((s,r)=>s+r.totalQaly,0);
      const deltaQaly = totalIntQaly - totalBaseQaly;

      // Per-capita QALYs using final alive count (consistent denominators)
      const lastYr = base.results.length - 1;
      const totalAliveBase = base.results[lastYr].aliveByWealth.reduce((s,v)=>s+v,0) || 1;
      const totalAliveInt = res.results[lastYr].aliveByWealth.reduce((s,v)=>s+v,0) || 1;
      const meanBasePC = totalBaseQaly / totalAliveBase;
      const meanIntPC = totalIntQaly / totalAliveInt;

      const ineqBase = Math.sqrt(Array(5).fill(null).reduce((s,_,q)=> {
        const qBase = base.results.reduce((s,r)=>s+r.qalyByWealth[q],0) / (base.results[lastYr].aliveByWealth[q] || 1);
        return s + (qBase - meanBasePC) * (qBase - meanBasePC);
      }, 0) / 5);

      const ineqInt = Math.sqrt(Array(5).fill(null).reduce((s,_,q)=> {
        const qInt = res.results.reduce((s,r)=>s+r.qalyByWealth[q],0) / (res.results[lastYr].aliveByWealth[q] || 1);
        return s + (qInt - meanIntPC) * (qInt - meanIntPC);
      }, 0) / 5);

      const deltaInequality = ineqInt - ineqBase;

      intData.push({
        name: int.name,
        key,
        category: int.category,
        deltaHealth: deltaQaly,
        deltaInequality: -deltaInequality,
        standardNHB: dcea.standardNHB,
        equityNHB: dcea.equityWeightedNHB,
        heat,
      });
    });
    return intData;
  }, [population, years, epsilon]);

  if (!data) return <div className="p-12 text-center text-gray-400">Run simulation first</div>;

  const heipData = data.map(d => ({
    x: d.deltaHealth,
    y: d.deltaInequality,
    name: d.name,
    category: d.category,
    fill: COLORS.categories[d.category] || "#999"
  }));

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-gray-700">HEIP (Health Equity Impact Plane) & HEAT Measures</div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">Health Equity Impact Plane (HEIP)</div>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{top:20,right:20,bottom:60,left:60}}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="x" type="number" name="ΔQALYs" tick={{fontSize:9}} tickFormatter={v => Math.round(v)} label={{value:'← Less Health  |  More Health →',position:'bottom',offset:10,fontSize:10}}/>
              <YAxis dataKey="y" type="number" name="ΔIneq" tick={{fontSize:9}} tickFormatter={v => v.toFixed(1)} label={{value:'← More Unequal  |  Less Unequal →',angle:-90,position:'insideLeft',fontSize:10}}/>
              <Tooltip cursor={{strokeDasharray:'3 3'}} contentStyle={{fontSize:11}} formatter={(v,name)=> [typeof v === 'number' ? v.toFixed(1) : v, name]} labelFormatter={(label,pay)=>pay?.[0]?.payload?.name || ''}/>
              <ReferenceLine x={0} stroke="#666" strokeWidth={1.5}/>
              <ReferenceLine y={0} stroke="#666" strokeWidth={1.5}/>
              {heipData.map((d, i) => (
                <Scatter key={i} name={d.name} data={[d]} fill={d.fill} isAnimationActive={false}/>
              ))}
            </ScatterChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 text-xs mt-1">
            <div className="bg-green-50 p-1.5 rounded text-center"><b>NE: Win-Win</b> (more health + less inequality)</div>
            <div className="bg-blue-50 p-1.5 rounded text-center"><b>NW: Equitable</b> (less inequality, but less health)</div>
            <div className="bg-yellow-50 p-1.5 rounded text-center"><b>SE: Efficient</b> (more health, but more inequality)</div>
            <div className="bg-red-50 p-1.5 rounded text-center"><b>SW: Lose-Lose</b> (less health + more inequality)</div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">HEIP Position & HEAT Summary</div>
          <div className="overflow-y-auto max-h-80 text-xs">
            <table className="w-full border-collapse mb-2">
              <thead><tr className="bg-gray-700 text-white"><th className="p-1">Intervention</th><th className="p-1">ΔHealth</th><th className="p-1">ΔInequality</th><th className="p-1">Quadrant</th></tr></thead>
              <tbody>{data.map((d, idx) => {
                const quad = d.deltaHealth > 0 && d.deltaInequality > 0 ? "NE (Win)" : d.deltaHealth <= 0 && d.deltaInequality > 0 ? "NW (Eq)" : d.deltaHealth > 0 && d.deltaInequality <= 0 ? "SE (Eff)" : "SW (Lose)";
                const qColor = quad.startsWith("NE") ? "#38a169" : quad.startsWith("NW") ? "#2b6cb0" : quad.startsWith("SE") ? "#d69e2e" : "#c53030";
                return (<tr key={idx} className={idx%2?"bg-gray-50":"bg-white"}>
                  <td className="p-1 font-medium" style={{fontSize:'10px'}}>{d.name}</td>
                  <td className="p-1 text-right">{Math.round(d.deltaHealth)}</td>
                  <td className="p-1 text-right">{d.deltaInequality.toFixed(2)}</td>
                  <td className="p-1 text-center font-bold" style={{color:qColor}}>{quad}</td>
                </tr>);
              })}</tbody>
            </table>
            <div className="text-xs font-semibold text-gray-600 mb-1 mt-2">9 HEAT Equity Measures</div>
            {data.map((d, idx) => (
              <div key={idx} className="bg-gray-50 p-1.5 rounded border border-gray-200 mb-1">
                <div className="font-semibold text-gray-700" style={{fontSize:'10px'}}>{d.name}</div>
                <div className="grid grid-cols-3 gap-1 text-xs mt-0.5">
                  <div>SII: {d.heat.sii?.toFixed(2)}</div>
                  <div>RII: {d.heat.rii?.toFixed(3)}</div>
                  <div>CI: {d.heat.ci?.toFixed(3)}</div>
                  <div>AT: {d.heat.atkinson?.toFixed(3)}</div>
                  <div>TH: {d.heat.theil?.toFixed(4)}</div>
                  <div>PAR(Q3): {d.heat.par?.[2]?.toFixed(0)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- TAB: DISTRICT PLANNING ---

function DistrictTab({ intervention, years }) {
  const data = useMemo(() => {
    if (intervention.type === "none") return null;
    return Object.keys(DISTRICTS).map(d => {
      const rng = seededRandom(d.length * 7777);
      const pop = generatePopulation(2000, DISTRICTS[d], rng, true);
      const rngB = seededRandom(d.length * 8888);
      const base = simulateCohort(pop.map(p=>({...p})), INTERVENTIONS.none, years, rngB);
      const rngI = seededRandom(d.length * 8888); // Same seed as baseline for CRN
      const intR = simulateCohort(pop.map(p=>({...p})), intervention, years, rngI);
      const w = getEquityWeights(1.0);
      const dcea = computeDCEA(base, intR, w);
      const log = estimateLogistics(d, intervention, years);
      return { name: d, ...DISTRICTS[d], dcea, logistics: log };
    });
  }, [intervention, years]);

  if (!data) return <div className="p-12 text-center text-gray-400">Select an intervention to see district planning</div>;

  const compData = data.map(d => ({
    district: d.name,
    "Standard NHB": d.dcea.standardNHB,
    "Equity-Wt NHB": d.dcea.equityWeightedNHB,
    "Readiness Score": d.logistics?.readinessScore || 0,
  }));

  const readinessData = data.map(d => ({
    district: d.name, subject: d.name,
    Physicians: Math.min(100, Math.round((d.physicians / (d.logistics?.physiciansNeeded || 1)) * 100)),
    "Lab Capacity": Math.min(100, Math.round((d.labFacilities / (d.logistics?.labsNeeded || 1)) * 100)),
    HWC: Math.min(100, Math.round((d.hwc / (d.logistics?.facilitiesNeeded || 1)) * 100)),
    "NCD Kits": Math.round((d.phcWithNcdKit / d.hwc) * 100),
  }));

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-gray-700">District-Level Planning — Madhya Pradesh (5 districts)</div>
      <div className="text-xs text-gray-500 mb-2">Same intervention, different equity impact and implementation readiness across districts</div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead><tr className="bg-gray-800 text-white">{["District","Pop.","Urban %","HT %","DM %","HWCs","Physicians","Readiness","Std NHB","Eq-Wt NHB","Diverges?"].map(h=><th key={h} className="p-1.5 text-left">{h}</th>)}</tr></thead>
          <tbody>{data.map((d,i)=>(
            <tr key={i} className={i%2?"bg-gray-50":"bg-white"}>
              <td className="p-1.5 font-semibold">{d.name}</td>
              <td className="p-1.5">{(d.pop/100000).toFixed(1)}L</td>
              <td className="p-1.5">{(d.urbanPct*100).toFixed(0)}%</td>
              <td className="p-1.5">{(d.htPrev*100).toFixed(0)}%</td>
              <td className="p-1.5">{(d.dmPrev*100).toFixed(0)}%</td>
              <td className="p-1.5">{d.hwc}</td>
              <td className="p-1.5">{d.physicians}</td>
              <td className="p-1.5"><Badge text={`${d.logistics?.readinessScore}%`} color={d.logistics?.readinessScore > 70 ? "green" : d.logistics?.readinessScore > 40 ? "yellow" : "red"}/></td>
              <td className="p-1.5" style={{color:d.dcea.standardNHB>0?"#38a169":"#c53030"}}>{d.dcea.standardNHB}</td>
              <td className="p-1.5" style={{color:d.dcea.equityWeightedNHB>0?"#38a169":"#c53030"}}>{d.dcea.equityWeightedNHB}</td>
              <td className="p-1.5 text-center">{d.dcea.diverges ? <Badge text="YES" color="red"/> : <Badge text="No" color="green"/>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">CEA vs DCEA Across Districts</div>
          <ResponsiveContainer width="100%" height={200}><BarChart data={compData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="district" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip contentStyle={{fontSize:11}}/><Legend wrapperStyle={{fontSize:10}}/><ReferenceLine y={0} stroke="#000"/><Bar dataKey="Standard NHB" fill="#2b6cb0"/><Bar dataKey="Equity-Wt NHB" fill="#805ad5"/></BarChart></ResponsiveContainer>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">Implementation Readiness by District</div>
          <ResponsiveContainer width="100%" height={200}><BarChart data={readinessData} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" domain={[0,100]} tick={{fontSize:10}}/><YAxis dataKey="district" type="category" tick={{fontSize:10}} width={60}/><Tooltip contentStyle={{fontSize:11}}/><Legend wrapperStyle={{fontSize:10}}/><Bar dataKey="Physicians" fill="#2b6cb0" stackId="a"/><Bar dataKey="Lab Capacity" fill="#38a169" stackId="b"/><Bar dataKey="NCD Kits" fill="#dd6b20" stackId="c"/></BarChart></ResponsiveContainer>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900">
        <b>District Planning Insight:</b> {data.find(d => d.logistics?.readinessScore < 40)?.name || "Mandla"} has the lowest readiness ({data.find(d => d.logistics?.readinessScore < 40)?.logistics?.readinessScore || "low"}%) — primarily driven by physician shortage and limited lab capacity. A CHW-led or mHealth intervention may be more appropriate here than physician-dependent protocols.
      </div>
    </div>
  );
}

// --- TAB: LOGISTICS ---

function LogisticsTab({ district, intervention, years }) {
  const log = useMemo(() => estimateLogistics(district, intervention, years), [district, intervention, years]);

  if (!log) return <div className="p-12 text-center text-gray-400">Select a district and intervention to see logistics</div>;

  const costPie = [
    { name: "Drugs", value: log.drugCostAnnual },
    { name: "Lab Tests", value: log.labCostAnnual },
    { name: "Human Resources", value: log.hrCostAnnual },
    { name: "Overhead", value: log.overheadAnnual },
  ].filter(d => d.value > 0);

  const gapData = [
    { resource: "Physicians", available: DISTRICTS[district].physicians, needed: log.physiciansNeeded, gap: log.physicianGap },
    { resource: "ASHAs", available: DISTRICTS[district].asha, needed: log.ashaNeeded, gap: log.ashaGap },
    { resource: "Lab Facilities", available: DISTRICTS[district].labFacilities, needed: log.labsNeeded, gap: log.labGap },
    { resource: "HWCs", available: DISTRICTS[district].hwc, needed: log.facilitiesNeeded, gap: log.facilityGap },
  ];

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-gray-700">Resource & Logistics Estimation — {district} District</div>
      <div className="text-xs text-gray-500">Intervention: {intervention.name} | Time Horizon: {years} years</div>

      <div className="grid grid-cols-5 gap-2">
        <Metric label="Eligible Population" value={log.eligible.toLocaleString()} sub="age 30-69" color="blue"/>
        <Metric label="Covered" value={log.covered.toLocaleString()} sub={`${intervention.coverage}% coverage`} color="green"/>
        <Metric label="Adherent" value={log.adherent.toLocaleString()} sub={`${intervention.adherence}% adherence`} color="purple"/>
        <Metric label="Annual Cost" value={`₹${(log.totalAnnualCost/100000).toFixed(1)}L`} sub="total programme" color="orange"/>
        <Metric label="Readiness" value={`${log.hwcReadiness}%`} sub="HWC NCD kit" color={log.hwcReadiness>60?"green":"red"}/>
      </div>

      {log.drugSupply.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-700 mb-1">Drug Supply Requirements (Annual)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead><tr className="bg-gray-700 text-white">{["Drug","Daily Dose","Monthly/Patient","Annual Tablets","Annual Cost (₹)"].map(h=><th key={h} className="p-1.5">{h}</th>)}</tr></thead>
              <tbody>{log.drugSupply.map((d,i)=>(
                <tr key={i} className={i%2?"bg-gray-50":"bg-white"}>
                  <td className="p-1.5 font-medium">{d.name}</td>
                  <td className="p-1.5 text-center">{d.dailyDose}</td>
                  <td className="p-1.5 text-right">{d.monthlyPerPatient}</td>
                  <td className="p-1.5 text-right">{d.annualTablets.toLocaleString()}</td>
                  <td className="p-1.5 text-right">₹{(d.annualCost/100000).toFixed(2)}L</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">Resource Gap Analysis</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead><tr className="bg-gray-700 text-white">{["Resource","Available","Needed","Gap"].map(h=><th key={h} className="p-1.5">{h}</th>)}</tr></thead>
              <tbody>{gapData.map((g,i)=>(
                <tr key={i} className={i%2?"bg-gray-50":"bg-white"}>
                  <td className="p-1.5 font-medium">{g.resource}</td>
                  <td className="p-1.5 text-right">{g.available.toLocaleString()}</td>
                  <td className="p-1.5 text-right">{g.needed.toLocaleString()}</td>
                  <td className="p-1.5 text-right">{g.gap > 0 ? <span className="text-red-600 font-bold">-{g.gap}</span> : <span className="text-green-600">OK</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {intervention.needsSmartphone && log.smartphoneBarrier > 0 && (
            <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800">
              <b>Digital Divide Alert:</b> ~{log.smartphoneBarrier.toLocaleString()} eligible rural individuals lack smartphone access — mHealth coverage will be inequitable without alternative channels.
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">Annual Cost Breakdown</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart><Pie data={costPie} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({name, percent}) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} style={{fontSize: 9}}>
              {costPie.map((_, i) => <Cell key={i} fill={COLORS.pie[i]}/>)}
            </Pie><Tooltip formatter={v => `₹${(v/100000).toFixed(2)}L`} contentStyle={{fontSize:11}}/></PieChart>
          </ResponsiveContainer>
          <div className="text-center text-xs text-gray-600 font-semibold">Total: ₹{(log.totalAnnualCost/100000).toFixed(1)}L/year | ₹{(log.totalCostYears/10000000).toFixed(2)}Cr over {years}yr</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-gray-50 border rounded p-2"><b>Lab Tests/Year:</b> {log.annualLabTests.toLocaleString()} ({log.labsNeeded} facilities needed, {log.labGap > 0 ? <span className="text-red-600">gap: {log.labGap}</span> : <span className="text-green-600">sufficient</span>})</div>
        <div className="bg-gray-50 border rounded p-2"><b>Pharmacy Load:</b> ~{log.pharmacyLoad} patients/pharmacy ({log.pharmacyLoad > 150 ? <span className="text-red-600">high load</span> : <span className="text-green-600">manageable</span>})</div>
        <div className="bg-gray-50 border rounded p-2"><b>Per-Capita Cost:</b> ₹{Math.round(log.totalAnnualCost / log.adherent).toLocaleString()}/patient/year</div>
      </div>
    </div>
  );
}

// --- TAB: INTERVENTION COMPARE ---

function InterventionCompareTab({ population, years, epsilon }) {
  const compareData = useMemo(() => {
    if (!population.length) return [];
    const rngB = seededRandom(42);
    const base = simulateCohort(population.map(p=>({...p})), INTERVENTIONS.none, years, rngB);
    const w = getEquityWeights(epsilon);

    return Object.entries(INTERVENTIONS).filter(([k]) => k !== "none").map(([key, int]) => {
      const rng = seededRandom(42); // Same seed as baseline for CRN paired comparison
      const res = simulateCohort(population.map(p=>({...p})), int, years, rng);
      const dcea = computeDCEA(base, res, w);
      const totalEvents = base.results.reduce((s,r)=>s+r.events,0);
      const intEvents = res.results.reduce((s,r)=>s+r.events,0);
      return {
        name: int.name, key, category: int.category,
        eventsAverted: totalEvents - intEvents,
        costPerPerson: int.costPerPerson,
        standardNHB: dcea.standardNHB,
        equityNHB: dcea.equityWeightedNHB,
        concentrationIdx: dcea.concentrationIndex,
        ceaRec: dcea.ceaRecommendation,
        dceaRec: dcea.dceaRecommendation,
        diverges: dcea.diverges,
      };
    }).sort((a, b) => b.equityNHB - a.equityNHB);
  }, [population, years, epsilon]);

  if (!compareData.length) return <div className="p-12 text-center text-gray-400">Run simulation first</div>;

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-gray-700">Head-to-Head Intervention Comparison</div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead><tr className="bg-gray-800 text-white">{["Rank","Intervention","Category","Cost/person","Events Averted","Std NHB","Eq-Wt NHB","Conc. Idx","CEA","DCEA","Diverges"].map(h=><th key={h} className="p-1.5 text-left">{h}</th>)}</tr></thead>
          <tbody>{compareData.map((d,i)=>(
            <tr key={i} className={i%2?"bg-gray-50":"bg-white"}>
              <td className="p-1.5 font-bold text-gray-400">{i+1}</td>
              <td className="p-1.5 font-semibold">{d.name}</td>
              <td className="p-1.5"><Badge text={d.category} color="blue"/></td>
              <td className="p-1.5 text-right">₹{d.costPerPerson.toLocaleString()}</td>
              <td className="p-1.5 text-right">{d.eventsAverted}</td>
              <td className="p-1.5 text-right" style={{color:d.standardNHB>0?"#38a169":"#c53030"}}>{d.standardNHB}</td>
              <td className="p-1.5 text-right font-bold" style={{color:d.equityNHB>0?"#38a169":"#c53030"}}>{d.equityNHB}</td>
              <td className="p-1.5 text-right">{d.concentrationIdx}</td>
              <td className="p-1.5 text-center">{d.ceaRec === "Cost-Effective" ? <Badge text="CE" color="green"/> : <Badge text="Not CE" color="red"/>}</td>
              <td className="p-1.5 text-center">{d.dceaRec === "Equity-Positive" ? <Badge text="Eq+" color="green"/> : <Badge text="Eq-" color="red"/>}</td>
              <td className="p-1.5 text-center">{d.diverges ? <Badge text="YES" color="red"/> : <Badge text="No" color="green"/>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <div>
        <div className="text-xs font-semibold text-gray-600 mb-1">Efficiency–Equity Plane</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={compareData.slice(0, 9)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis type="number" tick={{fontSize:10}}/>
            <YAxis dataKey="name" type="category" tick={{fontSize:9}} width={140}/>
            <Tooltip contentStyle={{fontSize:11}}/>
            <Legend wrapperStyle={{fontSize:10}}/>
            <ReferenceLine x={0} stroke="#000"/>
            <Bar dataKey="standardNHB" fill="#2b6cb0" name="Standard NHB"/>
            <Bar dataKey="equityNHB" fill="#805ad5" name="Equity-Wt NHB"/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-green-50 border border-green-200 rounded p-3 text-xs text-green-900">
        <b>Key Insight:</b> Population-level interventions and CHW-led care tend to rank higher on equity-weighted NHB despite lower per-patient efficacy — their broad, pro-poor reach offsets lower intensity.
      </div>
    </div>
  );
}

// --- TAB: EPSILON EXPLORER ---

function EpsilonTab({ population, intervention, years }) {
  const data = useMemo(() => {
    if (!population.length) return [];
    const rngB = seededRandom(42);
    const base = simulateCohort(population.map(p=>({...p})), INTERVENTIONS.none, years, rngB);
    const rngI = seededRandom(42); // Same seed as baseline for CRN
    const intR = simulateCohort(population.map(p=>({...p})), intervention, years, rngI);

    const pts = [];
    for (let eps = 0; eps <= 3.0; eps += 0.25) {
      const w = getEquityWeights(eps);
      const dcea = computeDCEA(base, intR, w);
      pts.push({ epsilon: eps, standardNHB: dcea.standardNHB, equityWeightedNHB: dcea.equityWeightedNHB });
    }
    return pts;
  }, [population, intervention, years]);

  if (!data.length) return <div className="p-12 text-center text-gray-400">Run simulation first</div>;
  const div = data.find((d,i) => i > 0 && (d.equityWeightedNHB > 0) !== (data[0].equityWeightedNHB > 0));

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-700"><b>Inequality Aversion Explorer:</b> At what level of equity concern (ε) does the recommendation change?</div>
      {div && <div className="bg-yellow-50 border border-yellow-300 rounded p-3 text-xs"><b>Divergence at ε ≈ {div.epsilon.toFixed(2)}:</b> Below this, efficiency dominates. Above this, equity changes the decision.</div>}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="epsilon" tick={{fontSize:10}} label={{value:'Inequality Aversion (ε)',position:'bottom',fontSize:10}}/><YAxis tick={{fontSize:10}} label={{value:'Net Health Benefit',angle:-90,position:'insideLeft',fontSize:10}}/><Tooltip contentStyle={{fontSize:11}}/><Legend wrapperStyle={{fontSize:10}}/><ReferenceLine y={0} stroke="#000" strokeWidth={2}/><Line type="monotone" dataKey="standardNHB" stroke="#2b6cb0" strokeWidth={2} strokeDasharray="5 5" name="Standard NHB" dot={false}/><Line type="monotone" dataKey="equityWeightedNHB" stroke="#805ad5" strokeWidth={2} name="Equity-Wt NHB"/></LineChart>
      </ResponsiveContainer>
      <div className="text-xs text-gray-500 italic">ε=0: Pure efficiency | ε=1: Moderate equity concern | ε≥2: Strong equity priority (Rawlsian)</div>
    </div>
  );
}

// --- TAB: STATE COMPARISON ---

function StateTab({ intervention, years, popSize }) {
  const data = useMemo(() => {
    if (!intervention || intervention.type === "none") return [];
    return Object.entries(STATES).map(([name, params]) => {
      const rng = seededRandom(name.length * 1000);
      const pop = generatePopulation(Math.min(Math.floor(popSize / 3), 50000), name, rng);
      const rngB = seededRandom(name.length * 2000);
      const base = simulateCohort(pop.map(p=>({...p})), INTERVENTIONS.none, years, rngB);
      const rngI = seededRandom(name.length * 2000); // Same seed as baseline for CRN
      const intR = simulateCohort(pop.map(p=>({...p})), intervention, years, rngI);
      const dcea = computeDCEA(base, intR, getEquityWeights(1.0));
      return { state: params.code, stateFull: name, ...dcea };
    });
  }, [intervention, years, popSize]);

  if (!data.length) return <div className="p-12 text-center text-gray-400">Select an intervention</div>;

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-gray-700">State-Level Comparison — Same Intervention, Different Equity Impact</div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead><tr className="bg-gray-800 text-white">{["State","Std NHB","Eq-Wt NHB","Conc. Index","CEA","DCEA","Diverges"].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead>
          <tbody>{data.map((s,i)=>(
            <tr key={i} className={i%2?"bg-gray-50":"bg-white"}>
              <td className="p-2 font-semibold">{s.stateFull}</td>
              <td className="p-2 text-right">{s.standardNHB}</td>
              <td className="p-2 text-right" style={{color:s.equityWeightedNHB>0?"#38a169":"#c53030"}}>{s.equityWeightedNHB}</td>
              <td className="p-2 text-right">{s.concentrationIndex}</td>
              <td className="p-2 text-center">{s.ceaRecommendation}</td>
              <td className="p-2 text-center">{s.dceaRecommendation}</td>
              <td className="p-2 text-center font-bold" style={{color:s.diverges?"#c53030":"#38a169"}}>{s.diverges?"YES":"No"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data.map(d=>({state:d.state,standardNHB:d.standardNHB,equityWeightedNHB:d.equityWeightedNHB}))}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="state" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}}/><Tooltip contentStyle={{fontSize:11}}/><Legend wrapperStyle={{fontSize:10}}/><ReferenceLine y={0} stroke="#000"/><Bar dataKey="standardNHB" fill="#2b6cb0" name="Standard NHB"/><Bar dataKey="equityWeightedNHB" fill="#805ad5" name="Equity-Wt NHB"/></BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- TAB: DEMONSTRATOR 2 - DIABETES TREATMENT ESCALATION ---

function Demonstrator2Tab({ population, years }) {
  // Costs reflect Indian generic pricing; efficacy includes CVD + microvascular benefit
  const strategies = [
    { name: "Metformin Monotherapy", coverage: 70, efficacy: 20, adherence: 68, cost: 1500 },
    { name: "Early SGLT2i Addition", coverage: 50, efficacy: 35, adherence: 55, cost: 8400 },
    { name: "Intensive STENO-2 Approach", coverage: 40, efficacy: 45, adherence: 50, cost: 16000 },
    { name: "CHW-Led DM at HWC", coverage: 65, efficacy: 24, adherence: 72, cost: 2400 },
  ];

  const data = useMemo(() => {
    if (!population.length) return [];
    const rngB = seededRandom(42);
    const base = simulateCohort(population.map(p=>({...p})), INTERVENTIONS.none, years, rngB);

    return strategies.map((strat, idx) => {
      const mockInt = {
        ...INTERVENTIONS.sglt2,
        name: strat.name,
        type: `demo2_${idx}`,
        coverage: strat.coverage,
        efficacy: strat.efficacy,
        adherence: strat.adherence,
        costPerPerson: strat.cost,
      };
      const rng = seededRandom(42); // Same seed as baseline for CRN
      const res = simulateCohort(population.map(p=>({...p})), mockInt, years, rng);
      const dcea1 = computeDCEA(base, res, getEquityWeights(0.0));
      const dcea2 = computeDCEA(base, res, getEquityWeights(2.0));

      const costByQ = Array(5).fill(null).map((_, q) => res.results.reduce((s,r)=>s+r.costByWealth[q],0) / (res.results[res.results.length-1].aliveByWealth[q] || 1));
      const qalyByQ = Array(5).fill(null).map((_, q) => res.results.reduce((s,r)=>s+r.qalyByWealth[q],0) / (res.results[res.results.length-1].aliveByWealth[q] || 1));

      return {
        name: strat.name,
        coverage: strat.coverage,
        efficacy: strat.efficacy,
        cost: strat.cost,
        stdNHB: dcea1.standardNHB,
        eqNHB: dcea2.equityWeightedNHB,
        costByQuintile: costByQ,
        qalyByQuintile: qalyByQ,
      };
    });
  }, [population, years]);

  if (!data.length) return <div className="p-12 text-center text-gray-400">Run simulation first</div>;

  const costQData = Array(5).fill(null).map((_, q) => ({
    quintile: WEALTH_QUINTILES[q].split(" ")[0],
    ...Object.fromEntries(data.map(d => [d.name, Math.round(d.costByQuintile[q])]))
  }));

  const qalyQData = Array(5).fill(null).map((_, q) => ({
    quintile: WEALTH_QUINTILES[q].split(" ")[0],
    ...Object.fromEntries(data.map(d => [d.name, parseFloat((d.qalyByQuintile[q] / 10).toFixed(2))]))
  }));

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-gray-700">Demonstrator 2: Diabetes Treatment Escalation Strategies</div>
      <div className="text-xs text-gray-600 mb-2">Compare 4 strategies for diabetes management: monotherapy, early SGLT2i, intensive STENO-2, and CHW-led HWC approach</div>

      <div className="grid grid-cols-4 gap-2">
        {data.map((d, i) => (
          <div key={i} className="bg-gray-50 border rounded p-2.5">
            <div className="font-semibold text-xs text-gray-800 mb-1">{d.name}</div>
            <div className="text-xs space-y-0.5 text-gray-700">
              <div>Coverage: {d.coverage}%</div>
              <div>Efficacy: {d.efficacy}%</div>
              <div>Cost: ₹{d.cost.toLocaleString()}</div>
              <div style={{color:d.stdNHB>0?"#38a169":"#c53030"}}>Std NHB: {d.stdNHB}</div>
              <div style={{color:d.eqNHB>0?"#38a169":"#c53030"}}>Eq NHB: {d.eqNHB}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">Cost per Quintile by Strategy</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={costQData}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="quintile" tick={{fontSize:10}}/>
              <YAxis tick={{fontSize:10}} label={{value:'Cost (₹)',angle:-90,position:'insideLeft',fontSize:9}}/>
              <Tooltip contentStyle={{fontSize:11}}/>
              <Legend wrapperStyle={{fontSize:9}}/>
              {data.map((d, i) => <Bar key={i} dataKey={d.name} fill={COLORS.quintiles[i % 5]}/>)}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">QALYs per Quintile by Strategy</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={qalyQData}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="quintile" tick={{fontSize:10}}/>
              <YAxis tick={{fontSize:10}} label={{value:'QALYs (cumsum/10)',angle:-90,position:'insideLeft',fontSize:9}}/>
              <Tooltip contentStyle={{fontSize:11}}/>
              <Legend wrapperStyle={{fontSize:9}}/>
              {data.map((d, i) => <Bar key={i} dataKey={d.name} fill={COLORS.quintiles[i % 5]}/>)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900">
        <b>Diabetes Equity-Efficiency Trade-off:</b> Metformin monotherapy (₹1.5K/yr, 70% coverage) and CHW-led HWC (₹2.4K/yr, 65% coverage) are cost-effective at Indian WTP thanks to low cost and broad reach. SGLT2i addition (₹8.4K, generic) maximizes cardio-renal outcomes but cost-effectiveness depends on population size and WTP threshold. Intensive STENO-2 (₹16K) is most effective per patient but too costly for population-level CE. At ε≥1.5, the recommendation shifts further toward broad-reach, low-cost strategies.
      </div>
    </div>
  );
}

// --- TAB: DEMONSTRATOR 3 - TOBACCO TAX ---

function Demonstrator3Tab({ population, years }) {
  const taxLevels = [
    { increase: 0.25, name: "25% Tax Increase" },
    { increase: 0.50, name: "50% Tax Increase" },
    { increase: 0.75, name: "75% Tax Increase" },
  ];

  const data = useMemo(() => {
    if (!population.length) return [];
    const rngB = seededRandom(42);
    const base = simulateCohort(population.map(p=>({...p})), INTERVENTIONS.none, years, rngB);

    return taxLevels.map((tax, idx) => {
      const mockInt = {
        ...INTERVENTIONS.tobaccoTax,
        name: tax.name,
        type: `demo3_${idx}`,
        coverage: 85 - (tax.increase * 50),
        efficacy: 18 + (tax.increase * 12),
        costPerPerson: 0,
      };
      const rng = seededRandom(42); // Same seed as baseline for CRN
      const res = simulateCohort(population.map(p=>({...p})), mockInt, years, rng);
      const dcea = computeDCEA(base, res, getEquityWeights(1.0));

      const tobaccoSpendByQ = [0.12, 0.10, 0.08, 0.06, 0.04]; // % of income spent on tobacco by quintile
      const financialBurdenByQ = Array(5).fill(null).map((_, q) => tobaccoSpendByQ[q] * (1 + tax.increase));
      const healthGainByQ = Array(5).fill(null).map((_, q) => {
        const dmRiskRed = 0.12 + (q === 0 ? 0.05 : 0);
        const cvdRiskRed = 0.15 + (q === 0 ? 0.06 : 0);
        return (dmRiskRed + cvdRiskRed) / 2;
      });

      return {
        name: tax.name,
        increase: tax.increase,
        coverage: mockInt.coverage,
        efficacy: mockInt.efficacy,
        standardNHB: dcea.standardNHB,
        equityNHB: dcea.equityWeightedNHB,
        financialBurdenByQ,
        healthGainByQ,
      };
    });
  }, [population, years]);

  if (!data.length) return <div className="p-12 text-center text-gray-400">Run simulation first</div>;

  const burdenData = Array(5).fill(null).map((_, q) => ({
    quintile: WEALTH_QUINTILES[q].split(" ")[0],
    ...Object.fromEntries(data.map(d => [d.name, (d.financialBurdenByQ[q] * 100).toFixed(1)]))
  }));

  const healthData = Array(5).fill(null).map((_, q) => ({
    quintile: WEALTH_QUINTILES[q].split(" ")[0],
    ...Object.fromEntries(data.map(d => [d.name, (d.healthGainByQ[q] * 100).toFixed(1)]))
  }));

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-gray-700">Demonstrator 3: Tobacco Tax Analysis</div>
      <div className="text-xs text-gray-600 mb-2">Model dual pathway impacts: health gains via CVD + DM risk reduction vs. financial burden (regressive)</div>

      <div className="grid grid-cols-3 gap-2">
        {data.map((d, i) => (
          <div key={i} className="bg-gray-50 border rounded p-2.5">
            <div className="font-semibold text-xs text-gray-800 mb-1">{d.name}</div>
            <div className="text-xs space-y-0.5 text-gray-700">
              <div>Coverage: {d.coverage}%</div>
              <div>CVD+DM Efficacy: {d.efficacy}%</div>
              <div style={{color:d.standardNHB>0?"#38a169":"#c53030"}}>Std NHB: {d.standardNHB}</div>
              <div style={{color:d.equityNHB>0?"#38a169":"#c53030"}}>Eq NHB: {d.equityNHB}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">Financial Burden by Wealth (% of income on tobacco)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={burdenData}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="quintile" tick={{fontSize:10}}/>
              <YAxis tick={{fontSize:10}} label={{value:'% Income',angle:-90,position:'insideLeft',fontSize:9}}/>
              <Tooltip contentStyle={{fontSize:11}}/>
              <Legend wrapperStyle={{fontSize:9}}/>
              {data.map((d, i) => <Bar key={i} dataKey={d.name} fill={COLORS.quintiles[i % 5]}/>)}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">Health Gain (CVD+DM Risk Reduction) by Wealth</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={healthData}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="quintile" tick={{fontSize:10}}/>
              <YAxis tick={{fontSize:10}} label={{value:'Risk Reduction %',angle:-90,position:'insideLeft',fontSize:9}}/>
              <Tooltip contentStyle={{fontSize:11}}/>
              <Legend wrapperStyle={{fontSize:9}}/>
              {data.map((d, i) => <Bar key={i} dataKey={d.name} fill={COLORS.quintiles[i % 5]}/>)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-900">
        <b>Equity-Efficiency Paradox:</b> Tobacco tax is health-equitable (poor gain more because more price-responsive) but financially regressive (poor spend larger share of income on tobacco). Higher tax increases reduce coverage but increase efficacy. This exemplifies the classic equity-efficiency trade-off in population policy.
      </div>
    </div>
  );
}

// --- TAB: PSA (Probabilistic Sensitivity Analysis) ---

function PSATab({ population, intervention, years }) {
  const psaData = useMemo(() => {
    if (!population.length) return null;
    const iterations = 50;
    const rngB = seededRandom(42);
    const base = simulateCohort(population.map(p=>({...p})), INTERVENTIONS.none, years, rngB);

    const results = [];
    for (let iter = 0; iter < iterations; iter++) {
      const paramRng = seededRandom(1000 + iter); // Separate RNG for parameter sampling

      // Parameter uncertainty
      const effMult = 0.8 + paramRng() * 0.4;
      const costMult = 0.7 + paramRng() * 0.6;
      const adhMult = 0.75 + paramRng() * 0.5;

      const varInt = {
        ...intervention,
        efficacy: Math.max(5, Math.min(100, intervention.efficacy * effMult)),
        costPerPerson: intervention.costPerPerson * costMult,
        adherence: Math.max(10, Math.min(100, intervention.adherence * adhMult)),
      };

      const rng = seededRandom(42); // Same seed as baseline for CRN
      const res = simulateCohort(population.map(p=>({...p})), varInt, years, rng);
      const dcea = computeDCEA(base, res, getEquityWeights(1.0));
      const totalDQ = dcea.totalDQaly;
      const totalDC = dcea.totalDCost;
      results.push({ iter, nhb: dcea.standardNHB, eqNhb: dcea.equityWeightedNHB, cost: varInt.costPerPerson, efficacy: varInt.efficacy, dQaly: totalDQ, dCost: totalDC });
    }

    const meanNHB = results.reduce((s, r) => s + r.nhb, 0) / iterations;
    const sdNHB = Math.sqrt(results.reduce((s, r) => s + (r.nhb - meanNHB) ** 2, 0) / iterations);
    const ci95 = [meanNHB - 1.96 * sdNHB, meanNHB + 1.96 * sdNHB];

    // CEAC: probability CE at each WTP threshold (recompute NHB at each WTP)
    const ceacData = [];
    for (let wtp = 50000; wtp <= 500000; wtp += 10000) {
      const nCE = results.filter(r => (r.dQaly - r.dCost / wtp) > 0).length;
      ceacData.push({ wtp: wtp / 1000, pctCE: (nCE / iterations) * 100 });
    }

    return { results, meanNHB, sdNHB, ci95, ceacData };
  }, [population, intervention, years]);

  if (!psaData) return <div className="p-12 text-center text-gray-400">Run simulation first</div>;

  const nhbDist = psaData.results.map((r, i) => ({ x: i, nhb: r.nhb, eqNhb: r.eqNhb }));

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-gray-700">Probabilistic Sensitivity Analysis (PSA)</div>
      <div className="text-xs text-gray-600 mb-2">N=50 iterations with parameter uncertainty: efficacy ±20%, cost ±30%, adherence ±25%</div>

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Mean NHB" value={psaData.meanNHB.toFixed(2)} sub="standard CEA" color="blue"/>
        <Metric label="SD (NHB)" value={psaData.sdNHB.toFixed(2)} sub="parameter uncertainty" color="orange"/>
        <Metric label="95% CI" value={`[${psaData.ci95[0].toFixed(1)}, ${psaData.ci95[1].toFixed(1)}]`} sub="credible interval" color="purple"/>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">NHB Distribution Across Iterations</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={psaData.results.slice(0, 25).map((r, i) => ({iter: `Iter ${i+1}`, nhb: r.nhb, eqNhb: r.eqNhb}))}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="iter" tick={{fontSize:8}}/>
              <YAxis tick={{fontSize:10}}/>
              <Tooltip contentStyle={{fontSize:11}}/>
              <Legend wrapperStyle={{fontSize:9}}/>
              <ReferenceLine y={0} stroke="#000"/>
              <Bar dataKey="nhb" fill="#2b6cb0" name="Standard NHB"/>
              <Bar dataKey="eqNhb" fill="#805ad5" name="Eq-Wt NHB"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">Cost-Effectiveness Acceptability Curve (CEAC)</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={psaData.ceacData}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="wtp" tick={{fontSize:10}} label={{value:'WTP Threshold (₹1000s)',position:'bottom',fontSize:9}}/>
              <YAxis tick={{fontSize:10}} label={{value:'% Cost-Effective',angle:-90,position:'insideLeft',fontSize:9}}/>
              <Tooltip contentStyle={{fontSize:11}}/>
              <Line type="monotone" dataKey="pctCE" stroke="#38a169" strokeWidth={2} dot={false} name="Probability CE"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded p-3 text-xs text-purple-900">
        <b>PSA Insight:</b> Mean NHB = {psaData.meanNHB.toFixed(2)} (95% CI: {psaData.ci95[0].toFixed(1)}–{psaData.ci95[1].toFixed(1)}). Parameter uncertainty spans a wide credible range. CEAC shows probability of cost-effectiveness across different willingness-to-pay thresholds.
      </div>
    </div>
  );
}

// --- TAB: VALIDATION ---

function ValidationTab({ population, years }) {
  const validationData = useMemo(() => {
    if (!population.length) return null;
    const rng = seededRandom(42);
    const sim = simulateCohort(population.map(p=>({...p})), INTERVENTIONS.none, years, rng);

    // Compute ACTUAL simulated metrics from population
    const N = population.length;
    const simHTPrev = population.filter(p => p.hypertensive).length / N;
    const simDMPrev = population.filter(p => p.diabetic).length / N;
    const simTobPrev = population.filter(p => p.tobacco).length / N;
    const simMeanSBP = population.reduce((s, p) => s + p.sbp, 0) / N;
    const simMeanBMI = population.reduce((s, p) => s + p.bmi, 0) / N;

    // Simulated event rate (annualized per 100K)
    const totalEvents = sim.results.reduce((s, r) => s + r.events, 0);
    const totalDeaths = sim.results.reduce((s, r) => s + r.deaths, 0);
    const simCVDEventRate = Math.round((totalEvents / N / years) * 100000);
    const simDeathRate = Math.round((totalDeaths / N / years) * 100000);

    // Observed reference values (GBD 2021, NFHS-5)
    const observed = [
      { metric: "HT Prevalence (%)", observed: 22.0, predicted: +(simHTPrev * 100).toFixed(1), source: "NFHS-5 (overall ~22%)" },
      { metric: "DM Prevalence (%)", observed: 8.0, predicted: +(simDMPrev * 100).toFixed(1), source: "NFHS-5 (age 15-49: 4.9%)" },
      { metric: "Tobacco Use (%)", observed: 27.0, predicted: +(simTobPrev * 100).toFixed(1), source: "NFHS-5 (~27% any use)" },
      { metric: "Mean SBP (mmHg)", observed: 127.0, predicted: +simMeanSBP.toFixed(1), source: "NFHS-5 BP measurements" },
      { metric: "Mean BMI", observed: 23.2, predicted: +simMeanBMI.toFixed(1), source: "NFHS-5 (adults)" },
      { metric: "CVD Event Rate (/100K/yr)", observed: 800, predicted: simCVDEventRate, source: "GBD 2021 India" },
      { metric: "All-Cause Mortality (/100K/yr)", observed: 750, predicted: simDeathRate, source: "SRS 2022 (30-69yr)" },
    ];

    // Compute calibration metrics
    const calibData = observed.map(d => ({
      ...d,
      diff: d.observed !== 0 ? +(((d.predicted - d.observed) / d.observed) * 100).toFixed(1) : 0,
    }));

    // R² from observed vs predicted
    const obsArr = calibData.map(d => d.observed);
    const predArr = calibData.map(d => d.predicted);
    const obsMean = obsArr.reduce((s, v) => s + v, 0) / obsArr.length;
    const predMean = predArr.reduce((s, v) => s + v, 0) / predArr.length;
    const ssRes = obsArr.reduce((s, v, i) => s + (v - predArr[i]) ** 2, 0);
    const ssTot = obsArr.reduce((s, v) => s + (v - obsMean) ** 2, 0);
    const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

    // Calibration slope (regression of observed on predicted)
    const cov = obsArr.reduce((s, v, i) => s + (v - obsMean) * (predArr[i] - predMean), 0);
    const varPred = predArr.reduce((s, v) => s + (v - predMean) ** 2, 0);
    const calibSlope = varPred > 0 ? cov / varPred : 1;

    // HT prevalence by quintile comparison
    const htByQ = Array(5).fill(null).map((_, q) => {
      const qPop = population.filter(p => p.wealthQ === q);
      return { quintile: WEALTH_QUINTILES[q].split(" ")[0],
        observed: NFHS_PARAMS.hypertension_prev[q] * 100,
        simulated: +((qPop.filter(p => p.hypertensive).length / (qPop.length || 1)) * 100).toFixed(1) };
    });

    return { calibData, rSquared, calibSlope, sim, htByQ };
  }, [population, years]);

  if (!validationData) return <div className="p-12 text-center text-gray-400">Run simulation first</div>;

  const calibrationPlot = validationData.calibData.map(d => ({
    name: d.metric,
    observed: d.observed,
    predicted: d.predicted,
  }));

  const rSq = validationData.rSquared;
  const calSlope = validationData.calibSlope;
  const statusColor = rSq > 0.8 ? "green" : rSq > 0.5 ? "yellow" : "red";
  const statusText = rSq > 0.8 ? "Good" : rSq > 0.5 ? "Moderate" : "Needs Calibration";

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-gray-700">Model Validation — Simulated vs Observed (GBD 2021 / NFHS-5)</div>
      <div className="bg-blue-50 border border-blue-200 rounded p-2.5 text-xs text-blue-900">
        <b>What this shows:</b> Compares simulated population metrics against observed Indian data from NFHS-5 and GBD 2021. R² and calibration slope indicate how well the synthetic population and disease model reproduce real-world patterns. All values are computed from the actual simulation, not mocked.
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Model Fit (R²)" value={rSq.toFixed(3)} sub="1.0 = perfect fit" color="blue"/>
        <Metric label="Calibration Slope" value={calSlope.toFixed(2)} sub="ideal = 1.0" color={Math.abs(calSlope - 1) < 0.2 ? "green" : "orange"}/>
        <Metric label="Validation Status" value={statusText} sub={`based on R² = ${rSq.toFixed(2)}`} color={statusColor}/>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">Observed vs Simulated — Key Metrics</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead><tr className="bg-gray-700 text-white">{["Metric","Observed","Simulated","% Diff","Source"].map(h=><th key={h} className="p-1.5">{h}</th>)}</tr></thead>
              <tbody>{validationData.calibData.map((d, i)=>(
                <tr key={i} className={i%2?"bg-gray-50":"bg-white"}>
                  <td className="p-1.5 font-medium">{d.metric}</td>
                  <td className="p-1.5 text-right">{d.observed}</td>
                  <td className="p-1.5 text-right">{d.predicted}</td>
                  <td className="p-1.5 text-right" style={{color: Math.abs(d.diff) < 15 ? "#38a169" : Math.abs(d.diff) < 30 ? "#d69e2e" : "#c53030"}}>{d.diff > 0 ? "+" : ""}{d.diff}%</td>
                  <td className="p-1.5 text-gray-500" style={{fontSize:'10px'}}>{d.source}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">HT Prevalence by Wealth Quintile — Observed vs Simulated</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={validationData.htByQ}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="quintile" tick={{fontSize:10}}/>
              <YAxis tick={{fontSize:10}} label={{value:'HT Prev %',angle:-90,position:'insideLeft',fontSize:9}}/>
              <Tooltip contentStyle={{fontSize:11}}/>
              <Legend wrapperStyle={{fontSize:9}}/>
              <Bar dataKey="observed" fill="#2b6cb0" name="NFHS-5 Observed"/>
              <Bar dataKey="simulated" fill="#38a169" name="Model Simulated"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={`${rSq > 0.7 ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"} border rounded p-3 text-xs ${rSq > 0.7 ? "text-green-900" : "text-yellow-900"}`}>
        <b>Validation Summary:</b> R² = {rSq.toFixed(3)}, calibration slope = {calSlope.toFixed(2)}.
        {rSq > 0.7 ? " Model reproduces observed Indian NCD patterns well." : " Model shows moderate fit — full calibration planned for funded project."}
        {" "}Note: This prototype uses NFHS-5 distributions as input, so prevalence metrics should closely match. Event rates and mortality comparisons against GBD 2021 provide independent validation of the disease progression model.
      </div>
    </div>
  );
}

// --- TAB: COSTS (Financial Protection & Equity Analysis) ---

function CostsTab({ population, years, intervention, baseRes, intRes }) {
  const costData = useMemo(() => {
    if (!population.length) return null;

    // Use pre-computed simulation results if available, otherwise run fresh
    let baseSim, intSim;
    if (baseRes && intRes) {
      baseSim = baseRes;
      intSim = intRes;
    } else {
      const rng = seededRandom(42);
      baseSim = simulateCohort(population.map(p=>({...p})), INTERVENTIONS.none, years, rng);
      const rng2 = seededRandom(42);
      intSim = simulateCohort(population.map(p=>({...p})), intervention || INTERVENTIONS.none, years, rng2);
    }

    const income = [50000, 80000, 120000, 180000, 300000]; // Annual income by quintile (NSSO 75th Round estimates)
    const povertyLine = 190 * 365; // ₹190/day Tendulkar line

    const makeFinance = (sim) => {
      const totalOOP = sim.population.reduce((s, p) => s + p.oopCost, 0);
      const totalPublic = sim.population.reduce((s, p) => s + p.publicCost, 0);
      const totalPMJAY = sim.population.reduce((s, p) => s + p.pmjayCost, 0);
      const totalCost = sim.population.reduce((s, p) => s + p.cost, 0);

      const costByQ = Array(5).fill(null).map((_, q) => {
        const popQ = sim.population.filter(p => p.wealthQ === q);
        const n = popQ.length || 1;
        return {
          quintile: WEALTH_QUINTILES[q],
          oop: popQ.reduce((s, p) => s + p.oopCost, 0) / n,
          public: popQ.reduce((s, p) => s + p.publicCost, 0) / n,
          pmjay: popQ.reduce((s, p) => s + p.pmjayCost, 0) / n,
          total: popQ.reduce((s, p) => s + p.cost, 0) / n,
        };
      });

      const cheRateByQ = Array(5).fill(null).map((_, q) => {
        const popQ = sim.population.filter(p => p.wealthQ === q);
        const nCHE = popQ.filter(p => (p.oopCost / (income[q] * years)) > 0.10).length; // 10% of annual income over horizon
        return (nCHE / (popQ.length || 1)) * 100;
      });

      const impoverishByQ = Array(5).fill(null).map((_, q) => {
        const popQ = sim.population.filter(p => p.wealthQ === q);
        const nImpov = popQ.filter(p => (income[q] - (p.oopCost / years)) < povertyLine).length;
        return (nImpov / (popQ.length || 1)) * 100;
      });

      return { totalOOP, totalPublic, totalPMJAY, totalCost, costByQ, cheRateByQ, impoverishByQ };
    };

    const base = makeFinance(baseSim);
    const int = makeFinance(intSim);

    return { base, int, income };
  }, [population, years, intervention, baseRes, intRes]);

  if (!costData) return <div className="p-12 text-center text-gray-400">Run simulation first</div>;

  const { base, int } = costData;
  const hasInt = intervention && intervention.type !== "none";
  const intName = intervention?.name || "Selected Intervention";

  const costBreakdown = [
    { name: "Out-of-Pocket (OOP)", value: base.totalOOP },
    { name: "Public (Tax-funded)", value: base.totalPublic },
    { name: "PMJAY (AB-PMJAY)", value: base.totalPMJAY },
  ].filter(d => d.value > 0);
  const totalBase = base.totalOOP + base.totalPublic + base.totalPMJAY;

  const cheCompare = Array(5).fill(null).map((_, i) => ({
    quintile: WEALTH_QUINTILES[i].split(" ")[0],
    "Status Quo": parseFloat(base.cheRateByQ[i].toFixed(1)),
    ...(hasInt ? {[intName]: parseFloat(int.cheRateByQ[i].toFixed(1))} : {}),
  }));

  const impoverCompare = Array(5).fill(null).map((_, i) => ({
    quintile: WEALTH_QUINTILES[i].split(" ")[0],
    "Status Quo": parseFloat(base.impoverishByQ[i].toFixed(1)),
    ...(hasInt ? {[intName]: parseFloat(int.impoverishByQ[i].toFixed(1))} : {}),
  }));

  const oopByQ = Array(5).fill(null).map((_, i) => ({
    quintile: WEALTH_QUINTILES[i].split(" ")[0],
    "Status Quo OOP": Math.round(base.costByQ[i].oop),
    ...(hasInt ? {[`${intName} OOP`]: Math.round(int.costByQ[i].oop)} : {}),
    "Annual Income": costData.income[i],
  }));

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-gray-700">Financial Protection & Health Equity Analysis</div>
      <div className="bg-blue-50 border border-blue-200 rounded p-2.5 text-xs text-blue-900">
        <b>What this module shows:</b> This tab models the financial consequences of NCD events on households. It tracks out-of-pocket (OOP) costs, public financing, and AB-PMJAY coverage for CVD events (MI, Stroke, HF) and ongoing treatment costs. It measures catastrophic health expenditure (CHE) and impoverishment risk across wealth quintiles — key metrics for Universal Health Coverage (UHC) monitoring.
        {hasInt && <span> It also compares financial protection under <b>{intName}</b> vs status quo.</span>}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Metric label="OOP Burden (Status Quo)" value={`₹${(base.totalOOP/10000000).toFixed(2)}Cr`} sub="households at risk" color="red"/>
        <Metric label="Public Financing" value={`₹${(base.totalPublic/10000000).toFixed(2)}Cr`} sub="tax-funded care" color="blue"/>
        <Metric label="PMJAY Protection" value={`₹${(base.totalPMJAY/10000000).toFixed(2)}Cr`} sub="scheme coverage" color="green"/>
        {hasInt ? (
          <Metric label="OOP Reduction" value={`${base.totalOOP > 0 ? ((1 - int.totalOOP/base.totalOOP)*100).toFixed(1) : 0}%`} sub={`with ${intName}`} color={int.totalOOP < base.totalOOP ? "green" : "orange"}/>
        ) : (
          <Metric label="Total Health Cost" value={`₹${(totalBase/10000000).toFixed(2)}Cr`} sub={`over ${years}yr`} color="purple"/>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">Healthcare Financing Sources (Status Quo)</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart><Pie data={costBreakdown} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({name, percent}) => `${name.split("(")[0].trim()} ${(percent*100).toFixed(0)}%`} labelLine={false} style={{fontSize:9}}>
              {costBreakdown.map((_, i) => <Cell key={i} fill={["#c53030","#2b6cb0","#38a169"][i]}/>)}
            </Pie><Tooltip formatter={v => `₹${(v/10000000).toFixed(2)}Cr`} contentStyle={{fontSize:11}}/></PieChart>
          </ResponsiveContainer>
          <div className="text-xs text-center text-gray-500 mt-1">OOP share reflects NSSO 75th Round pattern: poorest bear heaviest burden</div>
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">Per-Capita OOP vs Annual Income by Quintile</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={oopByQ}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="quintile" tick={{fontSize:10}}/>
              <YAxis tick={{fontSize:10}} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`}/>
              <Tooltip contentStyle={{fontSize:11}} formatter={v => `₹${v.toLocaleString()}`}/>
              <Legend wrapperStyle={{fontSize:9}}/>
              <Bar dataKey="Status Quo OOP" fill="#c53030"/>
              {hasInt && <Bar dataKey={`${intName} OOP`} fill="#38a169"/>}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">Catastrophic Health Expenditure (CHE &gt;10% of income/yr)</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={cheCompare}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="quintile" tick={{fontSize:10}}/>
              <YAxis tick={{fontSize:10}} label={{value:'CHE Rate %',angle:-90,position:'insideLeft',fontSize:9}}/>
              <Tooltip contentStyle={{fontSize:11}}/>
              <Legend wrapperStyle={{fontSize:9}}/>
              <Bar dataKey="Status Quo" fill="#c53030"/>
              {hasInt && <Bar dataKey={intName} fill="#38a169"/>}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">Impoverishment Risk (income - OOP &lt; poverty line)</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={impoverCompare}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="quintile" tick={{fontSize:10}}/>
              <YAxis tick={{fontSize:10}} label={{value:'Impoverished %',angle:-90,position:'insideLeft',fontSize:9}}/>
              <Tooltip contentStyle={{fontSize:11}}/>
              <Legend wrapperStyle={{fontSize:9}}/>
              <Bar dataKey="Status Quo" fill="#dd6b20"/>
              {hasInt && <Bar dataKey={intName} fill="#38a169"/>}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="text-xs font-semibold text-gray-600 mb-1">Detailed Financial Burden by Quintile</div>
        <table className="w-full text-xs border-collapse">
          <thead><tr className="bg-gray-800 text-white">{["Quintile","Annual Income","OOP/Person","OOP as % Income","CHE Rate","Impoverishment","PMJAY Coverage"].map(h=><th key={h} className="p-1.5 text-left">{h}</th>)}</tr></thead>
          <tbody>{Array(5).fill(null).map((_, i) => {
            const oopPct = base.costByQ[i].oop > 0 ? ((base.costByQ[i].oop / years) / costData.income[i] * 100).toFixed(1) : "0.0";
            return (
              <tr key={i} className={i%2?"bg-gray-50":"bg-white"}>
                <td className="p-1.5 font-semibold" style={{color:COLORS.quintiles[i]}}>{WEALTH_QUINTILES[i]}</td>
                <td className="p-1.5">₹{costData.income[i].toLocaleString()}</td>
                <td className="p-1.5">₹{Math.round(base.costByQ[i].oop).toLocaleString()}</td>
                <td className="p-1.5" style={{color: +oopPct > 10 ? "#c53030" : "#38a169"}}>{oopPct}%</td>
                <td className="p-1.5" style={{color: base.cheRateByQ[i] > 5 ? "#c53030" : "#38a169"}}>{base.cheRateByQ[i].toFixed(1)}%</td>
                <td className="p-1.5" style={{color: base.impoverishByQ[i] > 5 ? "#c53030" : "#38a169"}}>{base.impoverishByQ[i].toFixed(1)}%</td>
                <td className="p-1.5">₹{Math.round(base.costByQ[i].pmjay).toLocaleString()}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded p-3 text-xs text-orange-900">
        <b>Financial Protection Summary:</b> Under status quo, the poorest quintile faces {base.cheRateByQ[0].toFixed(1)}% CHE rate and {base.impoverishByQ[0].toFixed(1)}% impoverishment risk — driven by high OOP share (83% per NSSO) and low insurance coverage.
        {hasInt && int.cheRateByQ[0] < base.cheRateByQ[0] && <span> <b>{intName}</b> reduces poorest-quintile CHE to {int.cheRateByQ[0].toFixed(1)}% by preventing costly CVD events upstream.</span>}
        {" "}AB-PMJAY covers ~40% of hospitalization costs but outpatient NCD management remains largely OOP. This is a key equity argument for investing in prevention-focused interventions.
      </div>

      <div className="bg-gray-50 border rounded p-2.5 text-xs text-gray-600">
        <b>Methodology:</b> CVD event costs from PMJAY 2024 (MI ₹2.5L, Stroke ₹1.8L, HF ₹1.2L). OOP share by quintile from NSSO 75th Round (83% poorest → 65% richest). PMJAY eligibility modelled at 40% of hospitalizations. CHE threshold: OOP &gt;10% of annual household income. Poverty line: ₹190/day (Tendulkar). Income estimates approximate from NSSO consumption data. All costs discounted at 3% annually.
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================

export default function NCDIndiaPlatform() {
  const [tab, setTab] = useState("guide");
  const [state, setState] = useState("Madhya Pradesh");
  const [district, setDistrict] = useState("Indore");
  const [popSize, setPopSize] = useState(50000);
  const [years, setYears] = useState(20);
  const [epsilon, setEpsilon] = useState(1.0);
  const [selInt, setSelInt] = useState("ihci");
  const [useCustom, setUseCustom] = useState(false);
  const [custom, setCustom] = useState({ name: "My Custom Intervention", type: "custom", category: "Custom", coverage: 50, efficacy: 30, adherence: 50, costPerPerson: 5000, targetRisk: "all", targetHypertensive: false, targetDiabetic: false, targetAge: [30, 69], targetSex: "All", description: "User-defined intervention", drugs: [], testsPerYear: 2, visitsPerYear: 4, needsPhysician: false, needsColdChain: false, needsLab: true, needsSmartphone: false });
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [pop, setPop] = useState([]);
  const [baseRes, setBaseRes] = useState(null);
  const [intRes, setIntRes] = useState(null);
  const [dcea, setDcea] = useState(null);

  const curInt = useCustom ? custom : INTERVENTIONS[selInt];
  const intName = curInt.name;

  const run = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const rng = seededRandom(12345);
      const p = generatePopulation(popSize, state, rng);
      setPop(p);
      // Use SAME seed for both arms so identical random events happen to matched individuals
      // Difference in outcomes is purely due to intervention effect (common random numbers technique)
      const rB = seededRandom(42);
      const b = simulateCohort(p.map(x=>({...x})), INTERVENTIONS.none, years, rB);
      setBaseRes(b);
      const rI = seededRandom(42); // Same seed as baseline for paired comparison
      const ir = simulateCohort(p.map(x=>({...x})), curInt, years, rI);
      setIntRes(ir);
      setDcea(computeDCEA(b, ir, getEquityWeights(epsilon)));
      setRunning(false);
      setDone(true);
    }, 100);
  }, [popSize, state, years, epsilon, curInt]);

  const tabs = [
    { id: "guide", label: "Guide", icon: "📖" },
    { id: "population", label: "Population", icon: "👥" },
    { id: "simulation", label: "Microsimulation", icon: "⚙️" },
    { id: "dcea", label: "DCEA", icon: "⚖️" },
    { id: "compare", label: "Compare All", icon: "📊" },
    { id: "epsilon", label: "ε Explorer", icon: "📐" },
    { id: "heip", label: "HEIP & HEAT", icon: "❤️" },
    { id: "districts", label: "Districts", icon: "🗺️" },
    { id: "logistics", label: "Logistics", icon: "🏥" },
    { id: "states", label: "States", icon: "🇮🇳" },
    { id: "demo2", label: "Demo 2: DM", icon: "💊" },
    { id: "demo3", label: "Demo 3: Tax", icon: "🚬" },
    { id: "psa", label: "PSA", icon: "📈" },
    { id: "validation", label: "Validation", icon: "✓" },
    { id: "costs", label: "Costs", icon: "💰" },
  ];

  return (
    <div className="min-h-screen bg-gray-50" style={{fontSize: '13px'}}>
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">NCD-India Platform <span className="text-blue-300 text-xs font-normal ml-2">v3.0</span></h1>
            <p className="text-blue-200 text-xs mt-0.5">Microsimulation + DCEA + Diabetes/CKD + HEIP + HEAT + PSA + Validation + Enhanced Costs</p>
          </div>
          <div className="text-right text-xs text-blue-200">
            <div>ICMR Intermediate Grant — Enhanced Feasibility Prototype</div>
            <div>March 2026</div>
          </div>
        </div>
      </div>

      <div className="flex">
        <div className="w-64 bg-white border-r min-h-screen p-3 space-y-3 overflow-y-auto" style={{maxHeight: 'calc(100vh - 60px)'}}>
          <div className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b pb-1">Parameters</div>

          <div>
            <label className="block text-xs text-gray-500 mb-0.5">State</label>
            <select value={state} onChange={e => setState(e.target.value)} className="w-full border rounded px-2 py-1 text-xs">{Object.keys(STATES).map(s => <option key={s}>{s}</option>)}</select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">District (for planning)</label>
            <select value={district} onChange={e => setDistrict(e.target.value)} className="w-full border rounded px-2 py-1 text-xs">{Object.keys(DISTRICTS).map(d => <option key={d}>{d}</option>)}</select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Sample Size: {popSize >= 100000 ? (popSize/100000).toFixed(1) + "L" : popSize.toLocaleString()} adults (30-69yr)</label>
            <input type="range" min="10000" max="750000" step="10000" value={popSize} onChange={e => setPopSize(+e.target.value)} className="w-full"/>
            <div className="text-xs text-gray-400">Avg district: 5-7.5L adults</div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Horizon: {years}yr</label>
            <input type="range" min="5" max="30" step="5" value={years} onChange={e => setYears(+e.target.value)} className="w-full"/>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Inequality Aversion (ε): {epsilon.toFixed(1)}</label>
            <input type="range" min="0" max="3" step="0.25" value={epsilon} onChange={e => setEpsilon(+e.target.value)} className="w-full"/>
            <div className="text-xs text-gray-400">{epsilon===0?"Pure efficiency":epsilon<=1?"Moderate equity":"Strong equity priority"}</div>
          </div>

          <div className="border-t pt-2">
            <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Intervention</div>
            <label className="flex items-center gap-1.5 mb-1.5 cursor-pointer text-xs">
              <input type="checkbox" checked={useCustom} onChange={e => setUseCustom(e.target.checked)} className="rounded"/>
              Use Custom Input
            </label>
            {!useCustom ? (
              <div>
                <select value={selInt} onChange={e => setSelInt(e.target.value)} className="w-full border rounded px-2 py-1 text-xs mb-1">
                  {Object.entries(INTERVENTIONS).filter(([k])=>k!=="none").map(([k,v])=> <option key={k} value={k}>{v.name}</option>)}
                </select>
                <div className="text-xs text-gray-400 italic leading-tight">{INTERVENTIONS[selInt]?.description}</div>
              </div>
            ) : (
              <div className="space-y-1.5 bg-indigo-50 p-2 rounded text-xs">
                <input type="text" value={custom.name} onChange={e => setCustom(p=>({...p, name: e.target.value}))} className="w-full border rounded px-2 py-1" placeholder="Intervention name"/>
                <div><span className="text-gray-500">Coverage: {custom.coverage}%</span><input type="range" min="10" max="100" value={custom.coverage} onChange={e=>setCustom(p=>({...p,coverage:+e.target.value}))} className="w-full"/></div>
                <div><span className="text-gray-500">Efficacy: {custom.efficacy}%</span><input type="range" min="5" max="60" value={custom.efficacy} onChange={e=>setCustom(p=>({...p,efficacy:+e.target.value}))} className="w-full"/></div>
                <div><span className="text-gray-500">Adherence: {custom.adherence}%</span><input type="range" min="10" max="90" value={custom.adherence} onChange={e=>setCustom(p=>({...p,adherence:+e.target.value}))} className="w-full"/></div>
                <div><span className="text-gray-500">Cost ₹/yr: {custom.costPerPerson.toLocaleString()}</span><input type="range" min="0" max="50000" step="500" value={custom.costPerPerson} onChange={e=>setCustom(p=>({...p,costPerPerson:+e.target.value}))} className="w-full"/></div>
                <select value={custom.targetRisk} onChange={e=>setCustom(p=>({...p,targetRisk:e.target.value}))} className="w-full border rounded px-2 py-1">
                  <option value="all">All risk levels</option><option value="medium">≥10% CVD risk</option><option value="high">≥20% CVD risk</option>
                </select>
                <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={custom.targetHypertensive} onChange={e=>setCustom(p=>({...p,targetHypertensive:e.target.checked}))}/> HT only</label>
                <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={custom.targetDiabetic} onChange={e=>setCustom(p=>({...p,targetDiabetic:e.target.checked}))}/> DM only</label>
              </div>
            )}
          </div>

          <button onClick={run} disabled={running} className="w-full bg-blue-800 text-white py-2 rounded text-xs font-semibold hover:bg-blue-900 disabled:opacity-50 transition-colors">
            {running ? `Simulating ${popSize >= 100000 ? (popSize/100000).toFixed(1)+"L" : popSize.toLocaleString()} individuals...` : "Run NCD-India Simulation"}
          </button>
          {popSize > 200000 && <div className="text-xs text-amber-600 text-center">Large sample — may take 10-30 seconds</div>}
          {done && <div className="text-xs text-green-600 text-center">Done ({popSize >= 100000 ? (popSize/100000).toFixed(1) + "L" : popSize.toLocaleString()} adults simulated, {years}yr horizon)</div>}
        </div>

        <div className="flex-1 p-3 overflow-x-hidden">
          <div className="flex gap-0.5 mb-0 border-b overflow-x-auto flex-wrap">
            {tabs.map(t => <TabBtn key={t.id} active={tab===t.id} onClick={()=>setTab(t.id)} icon={t.icon}>{t.label}</TabBtn>)}
          </div>

          <div className="bg-white border border-t-0 rounded-b-lg p-4 min-h-96 overflow-y-auto" style={{maxHeight: 'calc(100vh - 180px)'}}>
            {tab === "guide" && <GuideTab/>}
            {tab === "population" && <PopulationTab population={pop}/>}
            {tab === "simulation" && <SimulationTab baseRes={baseRes} intRes={intRes} intName={intName}/>}
            {tab === "dcea" && <DCEATab dcea={dcea}/>}
            {tab === "compare" && <InterventionCompareTab population={pop} years={years} epsilon={epsilon}/>}
            {tab === "epsilon" && <EpsilonTab population={pop} intervention={curInt} years={years}/>}
            {tab === "heip" && <HEIPHEATTab population={pop} years={years} epsilon={epsilon}/>}
            {tab === "districts" && <DistrictTab intervention={curInt} years={years}/>}
            {tab === "logistics" && <LogisticsTab district={district} intervention={curInt} years={years}/>}
            {tab === "states" && <StateTab intervention={curInt} years={years} popSize={popSize}/>}
            {tab === "demo2" && <Demonstrator2Tab population={pop} years={years}/>}
            {tab === "demo3" && <Demonstrator3Tab population={pop} years={years}/>}
            {tab === "psa" && <PSATab population={pop} intervention={curInt} years={years}/>}
            {tab === "validation" && <ValidationTab population={pop} years={years}/>}
            {tab === "costs" && <CostsTab population={pop} years={years} intervention={curInt} baseRes={baseRes} intRes={intRes}/>}
          </div>

          <div className="mt-2 text-xs text-gray-400 text-center">
            NCD-India Feasibility Prototype v3.0 — ICMR Intermediate Grant Application | March 2026
          </div>
        </div>
      </div>
    </div>
  );
}
