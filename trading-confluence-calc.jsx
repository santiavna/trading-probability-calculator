import { useState } from "react";

// Normal CDF approximation
const NORM = (z) => {
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z)/Math.sqrt(2);
  const t = 1/(1+p*x);
  const y = 1-(((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-x*x));
  return 0.5*(1+sign*y);
};

const BASE_WEIGHTS = [
  { id: "fib618",    label: "Target en Fibo 0.618", value: 8, defaultHard: true },
  { id: "fib382",    label: "Target en Fibo 0.382", value: 5, defaultHard: true },
  { id: "sma10",     labelLong: "SMA 10 por encima del spot", labelShort: "SMA 10 por debajo del spot", value: 10, defaultHard: true },
  { id: "sma50",     labelLong: "SMA 50 por encima del spot", labelShort: "SMA 50 por debajo del spot", value: 6, defaultHard: false },
  { id: "sma200",    labelLong: "SMA 200 por encima del spot", labelShort: "SMA 200 por debajo del spot", value: 3, defaultHard: false },
  { id: "elong2",    labelLong: "SMA 10 elongada >2% hacia abajo", labelShort: "SMA 10 elongada >2% hacia arriba", value: 4, defaultHard: false },
  { id: "elong5",    labelLong: "SMA 10 elongada >5% hacia abajo", labelShort: "SMA 10 elongada >5% hacia arriba", value: 9, defaultHard: true },
  { id: "vol",       label: "Volumen creciente", value: 4, defaultHard: false },
  { id: "trendalc",  label: "Tendencia general alcista", value: 6, defaultHard: false },
  { id: "trendbaj",  label: "Tendencia general bajista", value: 6, defaultHard: false },
  { id: "rsi3070",    labelLong: "RSI < 30 (sobrevendido)", labelShort: "RSI > 70 (sobrecomprado)", value: 15, defaultHard: true },
  { id: "rsimedia",   labelLong: "RSI claramente por debajo de su media", labelShort: "RSI claramente por encima de su media", value: 3, defaultHard: false },
  { id: "llavealc",  label: "Llave de reversion alcista", value: 12, defaultHard: true },
  { id: "llavebaj",  label: "Llave de reversion bajista", value: 12, defaultHard: true },
];

const getWeights = (isLong) => BASE_WEIGHTS.map(w => ({
  ...w,
  label: w.label || (isLong ? w.labelLong : w.labelShort)
}));

const clamp = (v, min=0, max=100) => Math.min(max, Math.max(min, v));

const Gauge = ({ value, size=130 }) => {
  const color = value >= 65 ? "#22c55e" : value >= 45 ? "#eab308" : "#ef4444";
  const r = 52, circ = Math.PI * r;
  const offset = circ - (clamp(value)/100)*circ;
  return (
    <svg width={size} height={size*0.6} viewBox="0 0 130 78">
      <defs>
        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color}/>
        </linearGradient>
      </defs>
      <path d={`M 10 72 A ${r} ${r} 0 0 1 120 72`} fill="none" stroke="#0d1a0d" strokeWidth="14"/>
      <path d={`M 10 72 A ${r} ${r} 0 0 1 120 72`} fill="none" stroke="url(#gaugeGrad)"
        strokeWidth="14" strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{transition:"stroke-dashoffset 0.9s cubic-bezier(.4,0,.2,1)"}}/>
      <text x="65" y="68" textAnchor="middle" fill={color} fontSize="22"
        fontFamily="'Share Tech Mono',monospace" fontWeight="700">
        {clamp(value).toFixed(1)}%
      </text>
    </svg>
  );
};

const Section = ({ title, children, accent="#22c55e" }) => (
  <div style={{background:"#0d150d",border:`1px solid ${accent}22`,borderRadius:14,padding:20,marginBottom:16}}>
    <div style={{fontSize:10,letterSpacing:3,color:accent,textTransform:"uppercase",marginBottom:14,fontFamily:"'Share Tech Mono',monospace"}}>
      ▸ {title}
    </div>
    {children}
  </div>
);

const Input = ({ label, value, onChange, placeholder, accent="#22c55e" }) => (
  <div style={{display:"flex",flexDirection:"column",gap:5}}>
    <label style={{fontSize:10,color:"#4a6a4a",letterSpacing:1.5,textTransform:"uppercase",fontFamily:"'Share Tech Mono',monospace"}}>{label}</label>
    <input type="number" value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}
      style={{
        background:"#070f07",border:`1px solid #1e2e1e`,borderRadius:8,
        color:"#c8e6c8",padding:"9px 12px",fontSize:13,
        fontFamily:"'Share Tech Mono',monospace",transition:"all 0.2s",outline:"none",
      }}
      onFocus={e=>{e.target.style.borderColor=accent;e.target.style.boxShadow=`0 0 0 2px ${accent}22`;}}
      onBlur={e=>{e.target.style.borderColor="#1e1e3a";e.target.style.boxShadow="none";}}
    />
  </div>
);

export default function App() {
  const [tab, setTab] = useState("calc");
  const DEFAULT_W = BASE_WEIGHTS.reduce((a,w)=>({...a,[w.id]:w.value}),{});
  const DEFAULT_HARD = BASE_WEIGHTS.reduce((a,w)=>({...a,[w.id]:w.defaultHard}),{});

  const loadFromStorage = (key, fallback) => {
    try {
      const stored = localStorage.getItem(key);
      if(!stored) return fallback;
      const parsed = JSON.parse(stored);
      // Merge with fallback to handle new keys added in updates
      return {...fallback, ...parsed};
    } catch { return fallback; }
  };

  const [form, setForm] = useState({ precio:"", target:"", stop:"", atr:"", dias:"3" });
  const [confluences, setConfluences] = useState(
    BASE_WEIGHTS.reduce((a,w)=>({...a,[w.id]:false}),{})
  );
  const [weights, setWeights] = useState(() => loadFromStorage("trading_weights", DEFAULT_W));
  const [result, setResult] = useState(null);

  const isLong = !form.precio || !form.target || +form.target >= +form.precio;
  const DEFAULT_WEIGHTS = getWeights(isLong);

  // Init any missing confluence keys when new weights added
  const allIds = BASE_WEIGHTS.map(w=>w.id);
  const missingConf = allIds.filter(id=>!(id in confluences));
  if(missingConf.length) setConfluences(c=>({...c,...missingConf.reduce((a,id)=>({...a,[id]:false}),{})}));

  const [hardDifficulty, setHardDifficulty] = useState(() => loadFromStorage("trading_hard", DEFAULT_HARD));

  const handle = (k,v) => { setForm(f=>({...f,[k]:v})); setResult(null); };
  const toggleHard = (id) => {
    const next = h => {
      const updated = {...h,[id]:!h[id]};
      localStorage.setItem("trading_hard", JSON.stringify(updated));
      return updated;
    };
    setHardDifficulty(next);
  };
  const toggleC = (id) => setConfluences(c => {
    const next = {...c, [id]: !c[id]};
    if(id === "elong2" && next.elong2) next.elong5 = false;
    if(id === "elong5" && next.elong5) next.elong2 = false;
    return next;
  });
  const setW = (id,v) => {
    const val = Math.max(0,Math.min(30,+v||0));
    setWeights(w => {
      const updated = {...w,[id]:val};
      localStorage.setItem("trading_weights", JSON.stringify(updated));
      return updated;
    });
  };

  const calcular = () => {
    const precio=+form.precio, target=+form.target, stop=+form.stop||null, atr=+form.atr, dias=+form.dias;
    if(!precio||!target||!atr||!dias) return;
    const sigma = atr*Math.sqrt(dias);
    const distTarget = Math.abs(target-precio);
    const distStop = stop ? (isLong ? precio-stop : stop-precio) : null;
    const z = distTarget/sigma;
    let probBase = (1-NORM(z))*100;

    let bonus = 0;
    let penalty = 0;
    DEFAULT_WEIGHTS.forEach(w => {
      if(!confluences[w.id]) return;
      // Tendencia contraria a la dirección resta
      if(isLong && w.id === "trendbaj") { penalty += weights[w.id]; return; }
      if(!isLong && w.id === "trendalc") { penalty += weights[w.id]; return; }
      // Llave de reversion contraria a la dirección resta
      if(isLong && w.id === "llavebaj") { penalty += weights[w.id]; return; }
      if(!isLong && w.id === "llavealc") { penalty += weights[w.id]; return; }
      bonus += weights[w.id];
    });
    const cnt = DEFAULT_WEIGHTS.filter(w=>confluences[w.id] &&
      !(isLong && w.id==="trendbaj") && !(!isLong && w.id==="trendalc") &&
      !(isLong && w.id==="llavebaj") && !(!isLong && w.id==="llavealc")).length;
    const cntMult = DEFAULT_WEIGHTS.filter(w=>confluences[w.id] && hardDifficulty[w.id] &&
      !(isLong && w.id==="trendbaj") && !(!isLong && w.id==="trendalc") &&
      !(isLong && w.id==="llavebaj") && !(!isLong && w.id==="llavealc")).length;
    if(cntMult>=3) bonus *= 1.15;
    if(cntMult>=5) bonus *= 1.1;

    const probFinal = clamp(probBase + bonus - penalty);
    const probStop = (stop && distStop > 0) ? clamp(NORM((-distStop)/sigma)*100) : null;
    const rr = (distStop && distStop > 0) ? (distTarget/distStop).toFixed(2) : null;

    setResult({ probBase: clamp(probBase), probFinal, probStop, rr, distTarget, distStop, sigma, bonus: clamp(bonus), penalty, cnt, cntMult, isLong });
  };

  const allFilled = form.precio && form.target && form.atr && form.dias;

  const accent = "#22c55e";
  const accentG = "#22c55e";

  return (
    <div style={{
      minHeight:"100vh", background:"#070f07",
      fontFamily:"'Share Tech Mono',monospace",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:"24px 16px"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@700;900&display=swap');
        *{box-sizing:border-box;}
        input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none;}
        input[type=number]{-moz-appearance:textfield;}
        .tab-btn{cursor:pointer;padding:8px 18px;border-radius:8px;font-size:11px;letter-spacing:2px;
          text-transform:uppercase;border:1px solid #1e1e3a;background:transparent;
          font-family:'Share Tech Mono',monospace;transition:all 0.2s;}
        .tab-btn.active{background:#22c55e22;border-color:#22c55e;color:#86efac;}
        .tab-btn:not(.active){color:#4a4a6a;}
        .tab-btn:not(.active):hover{border-color:#22c55e55;color:#22c55e;}
        .calc-btn{width:100%;padding:13px;border-radius:10px;cursor:pointer;
          font-family:'Share Tech Mono',monospace;font-size:12px;letter-spacing:3px;
          text-transform:uppercase;transition:all 0.2s;border:1px solid #22c55e;
          background:#22c55e22;color:#86efac;}
        .calc-btn:hover{background:#22c55e;color:#000;transform:translateY(-1px);}
        .calc-btn:disabled{opacity:0.3;cursor:not-allowed;transform:none;}
        .conf-item{display:flex;align-items:center;gap:10px;padding:8px 10px;
          border-radius:8px;cursor:pointer;transition:background 0.15s;border:1px solid transparent;}
        .conf-item:hover{background:#22c55e11;border-color:#22c55e22;}
        .conf-item.active{background:#22c55e1a;border-color:#22c55e44;}
        .result-in{animation:fadeUp 0.5s cubic-bezier(.4,0,.2,1) forwards;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .w-input{background:#070f07;border:1px solid #1e2e1e;border-radius:6px;
          color:#c8e6c8;padding:4px 8px;font-size:12px;font-family:'Share Tech Mono',monospace;
          width:52px;text-align:center;outline:none;}
        .w-input:focus{border-color:#22c55e;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:#070f07;}
        ::-webkit-scrollbar-thumb{background:#1e2e1e;border-radius:4px;}
      `}</style>

      <div style={{width:"100%",maxWidth:500}}>
        
        <div style={{marginBottom:24,position:"relative"}}>
          <div style={{
            position:"absolute",top:-10,left:-10,right:-10,bottom:-10,
            background:"radial-gradient(ellipse at 50% 0%, #22c55e15 0%, transparent 70%)",
            pointerEvents:"none"
          }}/>
          <div style={{fontSize:10,letterSpacing:4,color:accent,marginBottom:6}}>SISTEMA DE ANÁLISIS</div>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:28,color:"#e8e8ff",letterSpacing:1,lineHeight:1.1,fontWeight:900}}>
            PROB. DE<br/>OCURRENCIA
          </div>
          <div style={{fontSize:10,color:"#4a4a6a",marginTop:6}}>
            Browniano + Confluencias Fibonacci / SMA
          </div>
        </div>

        
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          <button className={`tab-btn ${tab==="calc"?"active":""}`} onClick={()=>setTab("calc")}>
            Calculadora
          </button>
          <button className={`tab-btn ${tab==="weights"?"active":""}`} onClick={()=>setTab("weights")}>
            ⚙ Pesos %
          </button>
          <button className={`tab-btn ${tab==="guide"?"active":""}`} onClick={()=>setTab("guide")}>
            📖 Guía
          </button>
        </div>

        {tab==="calc" && (
          <>
            
            <Section title="Datos del Trade" accent={accent}>
              {form.precio && form.target && (
                <div style={{marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
                  <span style={{
                    fontSize:11,padding:"4px 14px",borderRadius:20,letterSpacing:2,fontWeight:700,
                    background: isLong ? "#22c55e22" : "#ef444422",
                    border: `1px solid ${isLong ? "#22c55e" : "#ef4444"}`,
                    color: isLong ? "#22c55e" : "#ef4444"
                  }}>
                    {isLong ? "▲ LONG" : "▼ SHORT"}
                  </span>
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <Input label="Precio Actual" value={form.precio} onChange={v=>handle("precio",v)} placeholder="ej: 1580.71" accent={accent}/>
                <Input label="Target" value={form.target} onChange={v=>handle("target",v)} placeholder="ej: 1647.16" accent={accent}/>
                <Input label="Stop Loss (opcional)" value={form.stop} onChange={v=>handle("stop",v)} placeholder="ej: 1490.00" accent={accent}/>
                <Input label="ATR 14 (diario)" value={form.atr} onChange={v=>handle("atr",v)} placeholder="ej: 38.50" accent={accent}/>
              </div>
              <div>
                <div style={{fontSize:10,color:"#4a4a6a",letterSpacing:1.5,marginBottom:8,textTransform:"uppercase"}}>
                  Horizonte: <span style={{color:accent}}>{form.dias} día{form.dias!=1?"s":""}</span>
                </div>
                <input type="range" min="1" max="30" value={form.dias} onChange={e=>handle("dias",e.target.value)}
                  style={{width:"100%",accentColor:accent,cursor:"pointer"}}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#2a2a4a",marginTop:3}}>
                  <span>1d</span><span>15d</span><span>30d</span>
                </div>
              </div>
            </Section>

            
            <Section title="Confluencias (marcá las que aplican)" accent="#22c55e">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {DEFAULT_WEIGHTS.map(w=>(
                  <div key={w.id} className={`conf-item ${confluences[w.id]?"active":""}`}
                    onClick={()=>toggleC(w.id)}>
                    <div style={{
                      width:16,height:16,borderRadius:4,border:`1px solid ${confluences[w.id]?"#22c55e":"#2a4a2a"}`,
                      background:confluences[w.id]?"#22c55e":"transparent",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:10,color:"#000",flexShrink:0,transition:"all 0.15s"
                    }}>
                      {confluences[w.id]?"✓":""}
                    </div>
                    <div style={{fontSize:10,color:confluences[w.id]?"#86efac":"#4a6a4a",lineHeight:1.4}}>
                      {w.label}
                      <span style={{color:confluences[w.id]?"#22c55e":"#2a4a2a",marginLeft:4}}>
                        +{weights[w.id]}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {(() => {
                const starredActive = Object.keys(confluences).filter(id=>confluences[id] && hardDifficulty[id]).length;
                return starredActive>=3 ? (
                  <div style={{marginTop:10,fontSize:10,color:"#eab308",textAlign:"center",
                    padding:"6px",background:"#eab30811",borderRadius:6}}>
                    ✦ {starredActive} confluencias ⭐ activas → bonus multiplicador activo
                  </div>
                ) : null;
              })()}
            </Section>

            <button className="calc-btn" onClick={calcular} disabled={!allFilled}>
              CALCULAR PROBABILIDAD →
            </button>

            
            {result && (
              <div className="result-in" style={{marginTop:16}}>
                <Section title="Resultado" accent={accentG}>
                  <div style={{display:"grid",gridTemplateColumns:result.probStop!==null?"1fr 1fr":"1fr",gap:16,marginBottom:20}}>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:9,color:"#4a4a6a",letterSpacing:2,marginBottom:4,textTransform:"uppercase"}}>Prob. Final Target</div>
                      <Gauge value={result.probFinal}/>
                      <div style={{fontSize:10,color:"#4a4a6a",marginTop:2}}>+${result.distTarget.toFixed(2)}</div>
                    </div>
                    {result.probStop!==null && (
                      <div style={{textAlign:"center"}}>
                        <div style={{fontSize:9,color:"#4a4a6a",letterSpacing:2,marginBottom:4,textTransform:"uppercase"}}>Prob. Stop</div>
                        <Gauge value={result.probStop}/>
                        <div style={{fontSize:10,color:"#4a4a6a",marginTop:2}}>-${result.distStop.toFixed(2)}</div>
                      </div>
                    )}
                  </div>

                  
                  <div style={{borderTop:"1px solid #1e1e3a",paddingTop:14,display:"flex",flexDirection:"column",gap:8}}>
                    {[
                      {label:"Prob. base (Browniano)", value:`${result.probBase.toFixed(1)}%`},
                      {label:"Bonus confluencias", value:`+${result.bonus.toFixed(1)}%`, color:"#22c55e"},
                      result.penalty>0 && {label:"Penalización tendencia", value:`-${result.penalty.toFixed(1)}%`, color:"#ef4444"},
                      {label:"Confluencias activas", value:`${result.cnt}`},
                      {label:"Volatilidad esperada σ", value:`$${result.sigma.toFixed(2)}`},
                      result.rr && {label:"Ratio R/R", value:`1 : ${result.rr}`, color: parseFloat(result.rr)>=2?"#22c55e":"#ef4444"},
                  result.probStop!==null && {label:"Esperanza matemática", 
                    value: `$${((result.probFinal/100 * result.distTarget) - (result.probStop/100 * result.distStop)).toFixed(2)}`,
                    color: ((result.probFinal/100 * result.distTarget) - (result.probStop/100 * result.distStop)) >= 0 ? "#22c55e" : "#ef4444"
                  },
                  !result.probStop && {label:"Esperanza matemática", value:"Sin stop — incalculable", color:"#ef4444"},
                    ].filter(Boolean).map(({label,value,color})=>(
                      <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:11,color:"#4a4a6a"}}>{label}</span>
                        <span style={{fontSize:13,color:color||"#c8e6c8",fontWeight:600}}>{value}</span>
                      </div>
                    ))}
                  </div>

                  
                  <div style={{
                    marginTop:14,padding:"12px 14px",background:"#070713",
                    borderRadius:8,border:`1px solid ${result.probFinal>=60?"#22c55e":result.probFinal>=40?"#eab308":"#ef4444"}33`,
                    fontSize:11,color:"#6a6a8a",lineHeight:1.8
                  }}>
                    {result.probFinal>=65 ? "✅ Setup de alta probabilidad." :
                     result.probFinal>=45 ? "⚠️ Probabilidad moderada, manejá bien el riesgo." :
                     "❌ Setup de baja probabilidad. Buscá más confluencias o esperá mejor entrada."}
                    {result.cnt>=3 && " Las múltiples confluencias mejoran significativamente el setup."}
                    {result.rr && parseFloat(result.rr)>=2 && " El ratio R/R es favorable."}
                    {result.rr && parseFloat(result.rr)<1 && " ⚠️ El ratio R/R es desfavorable, revisá el stop o el target."}
                  </div>
                </Section>
              </div>
            )}
          </>
        )}

        {tab==="weights" && (
          <Section title="Editar Pesos de Confluencias (%)" accent="#22c55e">
            <div style={{fontSize:10,color:"#4a6a4a",marginBottom:16,lineHeight:1.7}}>
              Editá los % y marcá con ⭐ las confluencias que cuentan para activar el bonus multiplicador.
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8,gap:16}}>
              <span style={{fontSize:9,color:"#4a6a4a",letterSpacing:1}}>%</span>
              <span style={{fontSize:9,color:"#eab308",letterSpacing:1}}>⭐ MULT</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {DEFAULT_WEIGHTS.map(w=>(
                <div key={w.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                  padding:"8px 10px",background:"#0d150d",borderRadius:8,border:`1px solid ${hardDifficulty[w.id]?"#eab30844":"#1e2e1e"}`}}>
                  <span style={{fontSize:11,color:"#6a8a6a",flex:1}}>{w.label}</span>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <button onClick={()=>setW(w.id,weights[w.id]-1)}
                      style={{width:22,height:22,border:"1px solid #1e2e1e",borderRadius:4,
                        background:"#070f07",color:"#22c55e",cursor:"pointer",fontSize:14,
                        display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace"}}>−</button>
                    <input className="w-input" type="number" value={weights[w.id]}
                      onChange={e=>setW(w.id,e.target.value)}/>
                    <button onClick={()=>setW(w.id,weights[w.id]+1)}
                      style={{width:22,height:22,border:"1px solid #1e2e1e",borderRadius:4,
                        background:"#070f07",color:"#22c55e",cursor:"pointer",fontSize:14,
                        display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"monospace"}}>+</button>
                    <span style={{fontSize:10,color:"#4a6a4a",width:16}}>%</span>
                    <div onClick={()=>toggleHard(w.id)} style={{
                      width:24,height:24,borderRadius:6,cursor:"pointer",
                      border:`1px solid ${hardDifficulty[w.id]?"#eab308":"#2a4a2a"}`,
                      background:hardDifficulty[w.id]?"#eab30822":"transparent",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:13,transition:"all 0.15s"
                    }}>
                      {hardDifficulty[w.id]?"⭐":"☆"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{marginTop:14,fontSize:10,color:"#4a6a4a",textAlign:"center",
              padding:"10px",background:"#22c55e11",borderRadius:8,border:"1px solid #22c55e22"}}>
              Total máximo posible: +{Object.values(weights).reduce((a,b)=>a+b,0)}% sobre la prob. base
            </div>
            <div style={{marginTop:8,fontSize:9,color:"#6a5a2a",textAlign:"center"}}>
              ⭐ marcadas = cuentan para activar el bonus multiplicador (3+ activas → x1.15, 5+ → x1.10 adicional)
            </div>
          </Section>
        )}

        {tab==="guide" && (
          <Section title="Guía de Indicadores" accent="#22c55e">
            {[
              {
                title: "ATR — Rango Verdadero Medio",
                body: "Mide cuánto se mueve el activo en promedio por día. Es la base del cálculo de probabilidad — a mayor ATR más volátil e incierto el movimiento. En TradingView buscalo como 'Rango verdadero medio', período 14."
              },
              {
                title: "Fibonacci 0.618 / 0.382",
                body: "Niveles donde el precio tiende a frenar o rebotar. Para ver soportes trazás de mínimo a máximo. Para ver resistencias trazás de máximo a mínimo. Tildás si tu target coincide con alguno de esos niveles."
              },
              {
                title: "SMA 10 / 50 / 200",
                body: "Medias móviles simples de 10, 50 y 200 cierres. El precio estadísticamente tiende a converger hacia ellas — ya sea subiendo, bajando o lateralizando. Si están entre el spot y tu target suman probabilidad de convergencia."
              },
              {
                title: "Elongación SMA 10 >2% / >5%",
                body: "Cuando el precio se aleja mucho de la SMA 10, tiende a converger de vuelta. Calculás: (SMA10 − Precio) / SMA10 × 100. Si da más de 2% o 5% en la dirección de tu trade, tildás el nivel correspondiente. Solo una a la vez."
              },
              {
                title: "Volumen creciente",
                body: "Barras de volumen más altas que el promedio reciente acompañando el movimiento. Más participantes operando = movimiento más confiable. Lo evaluás visualmente en el panel de volumen de TradingView."
              },
              {
                title: "Tendencia general alcista / bajista",
                body: "Dirección general del precio en el gráfico diario. Si va a favor de tu trade suma probabilidad. Si va en contra resta — porque estás operando contra la marea. Si tildás la tendencia contraria a tu dirección se aplica penalización automática."
              },
              {
                title: "RSI < 30 / > 70",
                body: "Índice de Fuerza Relativa. Por debajo de 30 = sobrevendido → probable rebote alcista. Por encima de 70 = sobrecomprado → probable caída. Es la señal más rara y por eso tiene el mayor peso. En TradingView buscalo como 'RSI', período 14."
              },
              {
                title: "RSI vs su media",
                body: "Cuando el RSI está claramente separado de su media móvil (línea amarilla) indica momentum direccional. Si la separación es pequeña o están cruzándose no lo tildés — es señal débil."
              },
              {
                title: "Llave de reversión alcista",
                body: "Patrón de velas que señala cambio de tendencia bajista a alcista. Condiciones: tendencia previa bajista → vela que hace nuevo mínimo pero cierra por encima del máximo de la vela anterior → vela siguiente que confirma superando ese máximo."
              },
              {
                title: "Llave de reversión bajista",
                body: "Patrón de velas que señala cambio de tendencia alcista a bajista. Condiciones: tendencia previa alcista → vela que hace nuevo máximo pero cierra por debajo del mínimo de la vela anterior → vela siguiente que confirma perforando ese mínimo. Si va en contra de tu dirección se aplica penalización automática."
              },
            ].map(({title, body})=>(
              <div key={title} style={{marginBottom:16,paddingBottom:16,borderBottom:"1px solid #1e2e1e"}}>
                <div style={{fontSize:11,color:"#22c55e",fontWeight:700,marginBottom:6,letterSpacing:1}}>{title}</div>
                <div style={{fontSize:11,color:"#6a8a6a",lineHeight:1.8}}>{body}</div>
              </div>
            ))}
          </Section>
        )}

        <div style={{marginTop:12,fontSize:9,color:"#2a4a2a",textAlign:"center",lineHeight:1.8}}>
          Modelo estadístico + scoring de confluencias — no garantiza resultados futuros.<br/>
          Usá siempre gestión de riesgo.
        </div>

        <div style={{marginTop:16,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <a href="https://www.linkedin.com/in/santiago-avnaim-597569131/" target="_blank" rel="noopener noreferrer"
            style={{display:"flex",alignItems:"center",gap:6,textDecoration:"none",
              padding:"6px 14px",borderRadius:20,border:"1px solid #22c55e33",
              background:"#22c55e11",transition:"all 0.2s"}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#22c55e">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            <span style={{fontSize:10,color:"#22c55e",fontFamily:"'Share Tech Mono',monospace",letterSpacing:1}}>
              Santiago Avnaim
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}