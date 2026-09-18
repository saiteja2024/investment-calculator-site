import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./styles.css";

const COLORS = {
  ink900: "#0f1f1a",
  ink800: "#172b24",
  hair: "#2b4238",
  paper: "#f0ebdc",
  paperDim: "#9fafa5",
  gold: "#c9a227",
  moss: "#5c8b72",
};
const AFFILIATE_URL = "https://www.chime.com/r/saitejaejjigiri1/?c=s";
const DEFAULT_PLAN = {
  initial: 1000,
  monthly: 500,
  years: 20,
  rate: 10,
};
const PRESETS = [
  { name: "Getting started", description: "$100/mo for 10 years", initial: 0, monthly: 100, years: 10, rate: 7 },
  { name: "Steady builder", description: "$500/mo for 20 years", ...DEFAULT_PLAN },
  { name: "Future-focused", description: "$1,000/mo for 30 years", initial: 5000, monthly: 1000, years: 30, rate: 8 },
];

const money = (value) => `$${Math.round(value).toLocaleString("en-US")}`;
const chartAxisValue = (value) => {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}m`;
  }
  return `${Math.round(value / 1000)}k`;
};
const numberValue = (value) =>
  parseFloat(String(value).replace(/[^0-9.]/g, "")) || 0;

function NumberField({ label, value, onChange }) {
  const [text, setText] = useState(value.toLocaleString("en-US"));
  useEffect(() => {
    setText(value.toLocaleString("en-US"));
  }, [value]);
  const commit = (nextText) => {
    const next = numberValue(nextText);
    onChange(next);
    setText(next.toLocaleString("en-US"));
  };
  return (
    <label className="field">
      <span className="label">{label}</span>
      <span className="number-input">
        <span>$</span>
        <input
          aria-label={label}
          inputMode="decimal"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onBlur={() => commit(text)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      </span>
    </label>
  );
}

function SliderField({ label, value, onChange, min, max, step, display }) {
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <label className="field">
      <span className="field-top">
        <span className="label">{label}</span>
        <output className="slider-value" htmlFor={`${label}-slider`}>{display}</output>
      </span>
      <input
        id={`${label}-slider`}
        className="range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        aria-valuetext={display}
        style={{ "--range-progress": `${progress}%` }}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="range-labels" aria-hidden="true">
        <span>{label === "Time horizon" ? `${min} year` : `${min}%`}</span>
        <span>{label === "Time horizon" ? `${max} years` : `${max}%`}</span>
      </span>
    </label>
  );
}

function TooltipContent({ active, payload, label, inflationAdjusted }) {
  if (!active || !payload?.length) return null;
  const contributed =
    payload.find((item) => item.dataKey === "contributed")?.value || 0;
  const growth = payload.find((item) => item.dataKey === "growth")?.value || 0;
  return (
    <div className="tooltip">
      <div className="tooltip-muted">
        Year {label}
        {inflationAdjusted ? " · today's dollars" : ""}
      </div>
      <div>● Contributed: {money(contributed)}</div>
      <div>● Growth: {money(growth)}</div>
      <strong>Total: {money(contributed + growth)}</strong>
    </div>
  );
}

function App() {
  const [initial, setInitial] = useState(DEFAULT_PLAN.initial);
  const [monthly, setMonthly] = useState(DEFAULT_PLAN.monthly);
  const [years, setYears] = useState(DEFAULT_PLAN.years);
  const [rate, setRate] = useState(DEFAULT_PLAN.rate);
  const [adjustInflation, setAdjustInflation] = useState(false);
  const [inflation, setInflation] = useState(3);
  const [activePreset, setActivePreset] = useState("Steady builder");

  const updatePlan = (setField) => (value) => {
    setField(value);
    setActivePreset(null);
  };
  const applyPreset = (preset) => {
    setInitial(preset.initial);
    setMonthly(preset.monthly);
    setYears(preset.years);
    setRate(preset.rate);
    setActivePreset(preset.name);
  };
  const resetPlan = () => {
    setInitial(DEFAULT_PLAN.initial);
    setMonthly(DEFAULT_PLAN.monthly);
    setYears(DEFAULT_PLAN.years);
    setRate(DEFAULT_PLAN.rate);
    setAdjustInflation(false);
    setInflation(3);
    setActivePreset("Steady builder");
  };

  const result = useMemo(() => {
    const monthlyRate = rate / 100 / 12;
    let balance = initial;
    let contributed = initial;
    const raw = [{ year: 0, balance: initial, contributed: initial }];
    for (let month = 1; month <= years * 12; month += 1) {
      balance = balance * (1 + monthlyRate) + monthly;
      contributed += monthly;
      if (month % 12 === 0) {
        raw.push({ year: month / 12, balance, contributed });
      }
    }
    const adjust = (value, year) =>
      adjustInflation
        ? value / Math.pow(1 + inflation / 100, year)
        : value;
    const series = raw.map((item) => {
      const adjustedBalance = adjust(item.balance, item.year);
      const adjustedContributed = adjust(item.contributed, item.year);
      return {
        year: item.year,
        contributed: adjustedContributed,
        growth: Math.max(adjustedBalance - adjustedContributed, 0),
      };
    });
    const last = series.at(-1);
    return {
      balance: last.contributed + last.growth,
      contributed: last.contributed,
      growth: last.growth,
      series,
      nominalBalance: balance,
    };
  }, [initial, monthly, years, rate, adjustInflation, inflation]);

  const growthShare =
    result.balance > 0 ? Math.round((result.growth / result.balance) * 100) : 0;

  return (
    <main className="app">
      <div className="wrap">
        <header>
          <h1>What steady investing adds up to</h1>
          <p>
            Set a starting amount, a monthly contribution, and a time horizon.
            See how much comes from what you put in, and how much comes from
            growth — in real, spendable terms if you want.
          </p>
        </header>
        <section className="scenario-picker" aria-label="Investment scenarios">
          <div>
            <span className="eyebrow">Quick start</span>
            <strong>Choose a plan, then make it yours.</strong>
          </div>
          <div className="preset-list">
            {PRESETS.map((preset) => (
              <button
                className={activePreset === preset.name ? "preset active" : "preset"}
                key={preset.name}
                onClick={() => applyPreset(preset)}
                type="button"
              >
                <span>{preset.name}</span>
                <small>{preset.description}</small>
              </button>
            ))}
          </div>
          <button className="reset" onClick={resetPlan} type="button">Reset plan</button>
        </section>
        <div className="layout">
          <section className="controls">
            <NumberField label="Starting amount" value={initial} onChange={updatePlan(setInitial)} />
            <NumberField label="Monthly contribution" value={monthly} onChange={updatePlan(setMonthly)} />
            <SliderField label="Time horizon" value={years} onChange={updatePlan(setYears)} min={1} max={50} step={1} display={`${years} yrs`} />
            <SliderField label="Expected annual return" value={rate} onChange={updatePlan(setRate)} min={0} max={100} step={0.5} display={`${rate.toFixed(1)}%`} />
            <small>10% approximates the S&amp;P 500&apos;s long-run historical average. Actual returns vary year to year.</small>
            <div className="divider">
              <button className="toggle-row" onClick={() => setAdjustInflation(!adjustInflation)} type="button" aria-pressed={adjustInflation}>
                <span><b>Adjust for inflation</b><small>Show value in today&apos;s purchasing power</small></span>
                <i className={adjustInflation ? "toggle on" : "toggle"}><em /></i>
              </button>
              {adjustInflation && (
                <div className="inflation">
                  <SliderField label="Assumed inflation rate" value={inflation} onChange={setInflation} min={0} max={8} step={0.1} display={`${inflation.toFixed(1)}%`} />
                  <small>3% is close to the long-run US average. Higher inflation erodes more of the nominal gain.</small>
                </div>
              )}
            </div>
          </section>
          <section className="results">
            <div className="hero">
              <div>
                <small>{adjustInflation ? "Projected value, in today's dollars" : "Projected value"}</small>
                <div className={adjustInflation ? "hero-number gold" : "hero-number"}>{money(result.balance)}</div>
              </div>
              {adjustInflation && <span className="badge">inflation-adjusted</span>}
            </div>
            {adjustInflation && <small>Nominal (uninflated) value: {money(result.nominalBalance)}</small>}
            <div className="stats">
              <div><small>● Total contributed</small><strong>{money(result.contributed)}</strong></div>
              <div><small>● Growth earned</small><strong>{money(result.growth)}</strong></div>
              <div><small>● Growth share</small><strong>{growthShare}%</strong></div>
            </div>
            <div className="charts">
              <div>
                <small>Balance over time · USD{adjustInflation ? " · today's dollars" : ""}</small>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={result.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={COLORS.hair} vertical={false} />
                    <XAxis dataKey="year" tickFormatter={(value) => `${value}y`} stroke={COLORS.paperDim} />
                    <YAxis width={42} tickFormatter={chartAxisValue} stroke={COLORS.paperDim} />
                    <Tooltip content={<TooltipContent inflationAdjusted={adjustInflation} />} />
                    <Area type="monotone" dataKey="contributed" stackId="a" stroke={COLORS.moss} fill={COLORS.moss} fillOpacity={0.55} />
                    <Area type="monotone" dataKey="growth" stackId="a" stroke={COLORS.gold} fill={COLORS.gold} fillOpacity={0.55} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="donut">
                <small>Contributed vs. growth</small>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={[{ value: result.contributed }, { value: result.growth }]} dataKey="value" innerRadius={58} outerRadius={80} paddingAngle={2}>
                      <Cell fill={COLORS.moss} /><Cell fill={COLORS.gold} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <strong>{growthShare}%<small>from growth</small></strong>
              </div>
            </div>
            <div className="affiliate">
              <div><h2>Join me on Chime and get $100</h2><p>Terms apply.</p></div>
              <a href={AFFILIATE_URL} target="_blank" rel="noopener noreferrer sponsored">Join Chime</a>
            </div>
            <small>Disclosure: this is a referral link — I may earn a reward if you sign up.</small>
          </section>
        </div>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
