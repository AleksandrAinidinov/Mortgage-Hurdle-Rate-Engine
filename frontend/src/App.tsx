import { useState } from "react";
import { ArrowRight, Flame, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import axios from "axios";

interface AnalysisResult {
  monthlyInterestSavings: number;
  totalCostOfWaiting: number;
  dailyCostOfWaiting: number;
  paybackPeriodMonths: number;
  breakEvenRate: number;
  netBenefitNow: number;
  adjustedBenefit: number;
  recommendation: "LOCK_NOW" | "WAIT";
  summary: string;
}

function App() {
  const [formData, setFormData] = useState({
    currentRate: 5.25,
    remainingBalance: 400000,
    maturityDate: "03/25/2028",
    homeValue: 800000,
    waitMonths: 6,
    lender: "TD Canada Trust",
    mortgageRateType: "Fixed",
  });

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post("/api/v1/strategy/analyze-full", formData);
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.details || "Failed to analyze mortgage strategy.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <nav style={{ background: "white", borderBottom: "1px solid var(--perch-border)", padding: "16px 0" }}>
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg viewBox="0 0 24 24" width="32" height="32" fill="var(--perch-green)">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" />
            </svg>
            <span style={{ fontSize: "24px", fontWeight: 700, color: "var(--perch-green)", letterSpacing: "-0.5px" }}>perch</span>
          </div>
          <div style={{ display: "flex", gap: "24px", fontSize: "14px", fontWeight: 500 }}>
            <span>Solutions</span>
            <span>Tools</span>
            <span>Learn</span>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <header style={{ background: "var(--perch-green)", color: "white", padding: "64px 0", textAlign: "center" }}>
        <div className="container">
          <h1 style={{ color: "white", fontSize: "40px", marginBottom: "16px" }}>Are You Losing Money by Waiting?</h1>
          <p style={{ opacity: 0.9, fontSize: "18px" }}>Find out if switching now actually pays off.</p>
        </div>
      </header>

      <main className="container" style={{ marginTop: "-40px", paddingBottom: "100px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", alignItems: "start" }}>

          {/* Input Form */}
          <section className="card">
            <h2 style={{ marginBottom: "24px", fontSize: "20px" }}>What's your current mortgage offer?</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <label>Current Rate (%)</label>
                <input
                  type="number" step="0.01"
                  value={formData.currentRate}
                  onChange={e => setFormData({ ...formData, currentRate: Number(e.target.value) })}
                />
              </div>
              <div>
                <label>Remaining Balance ($)</label>
                <input
                  type="number"
                  value={formData.remainingBalance}
                  onChange={e => setFormData({ ...formData, remainingBalance: Number(e.target.value) })}
                />
              </div>
              <div>
                <label>Maturity Date</label>
                <input
                  type="text" placeholder="MM/DD/YYYY"
                  value={formData.maturityDate}
                  onChange={e => setFormData({ ...formData, maturityDate: e.target.value })}
                />
              </div>
              <div>
                <label>Home Value ($)</label>
                <input
                  type="number"
                  value={formData.homeValue}
                  onChange={e => setFormData({ ...formData, homeValue: Number(e.target.value) })}
                />
              </div>
              <div>
                <label>Lender</label>
                <input
                  type="text"
                  value={formData.lender}
                  onChange={e => setFormData({ ...formData, lender: e.target.value })}
                />
              </div>
              <div>
                <label>Rate Type</label>
                <select
                  value={formData.mortgageRateType}
                  onChange={e => setFormData({ ...formData, mortgageRateType: e.target.value as any })}
                >
                  <option value="Fixed">Fixed</option>
                  <option value="Variable">Variable</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: "24px" }}>
              <label>Wait Strategy (Months to simulate)</label>
              <input
                type="number"
                value={formData.waitMonths}
                onChange={e => setFormData({ ...formData, waitMonths: Number(e.target.value) })}
              />
            </div>

            <button
              className="btn-primary"
              style={{ width: "100%", marginTop: "32px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? "Analyzing..." : "Analyze Strategy"}
              {!loading && <ArrowRight size={20} />}
            </button>

            {error && (
              <div style={{ marginTop: "16px", color: "#d93025", fontSize: "14px", display: "flex", gap: "8px" }}>
                <AlertTriangle size={18} />
                {error}
              </div>
            )}
          </section>

          {/* Results Side */}
          <section>
            {result ? (
              <div className="card" style={{ border: result.recommendation === "LOCK_NOW" ? "2px solid #ed6c02" : "2px solid var(--perch-green)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  {result.recommendation === "LOCK_NOW" ? (
                    <Flame color="#ed6c02" size={32} />
                  ) : (
                    <CheckCircle color="var(--perch-green)" size={32} />
                  )}
                  <div>
                    <h3 style={{ fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px", color: "#666" }}>Verdict</h3>
                    <p style={{ fontSize: "24px", fontWeight: 700, color: result.recommendation === "LOCK_NOW" ? "#ed6c02" : "var(--perch-green)" }}>
                      {result.recommendation === "LOCK_NOW" ? "LOCK NOW" : "WAIT"}
                    </p>
                  </div>
                </div>

                <div style={{ background: "var(--perch-bg-alt)", padding: "20px", borderRadius: "8px", marginBottom: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                    <span style={{ color: "#666" }}>Daily Loss by Waiting</span>
                    <span style={{ fontWeight: 700, color: "#d93025" }}>${result.dailyCostOfWaiting.toFixed(0)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#666" }}>Monthly Gain After Switching</span>
                    <span style={{ fontWeight: 700 }}>${result.monthlyInterestSavings.toFixed(0)} / mo</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                  <div style={{ padding: "16px", border: "1px solid var(--perch-border)", borderRadius: "8px" }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Break-Even</div>
                    <div style={{ fontSize: "18px", fontWeight: 600 }}>{result.paybackPeriodMonths === -1 ? "Never" : `${result.paybackPeriodMonths} Months`}</div>
                  </div>
                  <div style={{ padding: "16px", border: "1px solid var(--perch-border)", borderRadius: "8px" }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>Total Net Benefit</div>
                    <div style={{ fontSize: "18px", fontWeight: 600, color: "var(--perch-green)" }}>${result.netBenefitNow.toLocaleString()}</div>
                  </div>
                </div>

                {/* <div style={{ fontSize: "14px", color: "#444", whiteSpace: "pre-line", borderTop: "1px solid var(--perch-border)", paddingTop: "20px" }}>
                  {result.summary}
                </div> */}
              </div>
            ) : (
              <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: "300px", background: "#fafafa" }}>
                <TrendingUp size={48} color="#ccc" style={{ marginBottom: "16px" }} />
                <p style={{ color: "#999", textAlign: "center" }}>Enter your details to generate your <br />Time-to-Decision analysis.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
