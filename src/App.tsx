import React, { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Download, Upload, Home, Edit3, TrendingUp, User } from 'lucide-react';

const STORAGE_KEY = 'moshefit-client-app';

function fmtDate(d: string | Date) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

type Daily = { date: string; weight: any; steps: any; calories: any; protein: any; workout: boolean; notes?: string };
type ProgramRow = { day: string; title: string; items: string };

const defaultState = {
  client: { code: '', fullName: '', heightCm: '', startWeight: '', targetWeight: '', notes: '' },
  targets: { calories: '', protein: '', steps: '', workoutsPerWeek: '' },
  dailyLog: [] as Daily[],
  program: [] as ProgramRow[],
};

export default function App() {
  const [state, setState] = useState(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : defaultState; } catch { return defaultState; }
  });
  const [tab, setTab] = useState<'home'|'daily'|'progress'|'profile'>('home');
  const [today, setToday] = useState(fmtDate(new Date()));

  useEffect(()=>{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  const weeklyData = useMemo(()=>{
    const byDate = [...state.dailyLog].sort((a,b)=> new Date(a.date).getTime()-new Date(b.date).getTime());
    return byDate.slice(-14);
  }, [state.dailyLog]);

  const adherence = useMemo(()=>{
    const ws = new Date(); ws.setDate(ws.getDate()-6);
    const week = state.dailyLog.filter((r:Daily)=> new Date(r.date) >= ws);
    const days = week.length || 1;
    const cT = Number(state.targets.calories)||0;
    const pT = Number(state.targets.protein)||0;
    const sT = Number(state.targets.steps)||0;
    const calOk = cT ? week.filter(r=> r.calories && r.calories >= 0.9*cT && r.calories <= 1.1*cT).length : 0;
    const proOk = pT ? week.filter(r=> r.protein && r.protein >= 0.9*pT).length : 0;
    const stepOk = sT ? week.filter(r=> r.steps && r.steps >= sT).length : 0;
    const wDone = week.filter(r=> r.workout).length;
    const wT = Number(state.targets.workoutsPerWeek)||0;
    const pct = (n:number)=> Math.round((n/days)*100);
    const workoutPct = wT ? Math.min(100, Math.round((wDone/wT)*100)) : 0;
    return { calories: days?pct(calOk):0, protein: days?pct(proOk):0, steps: days?pct(stepOk):0, workouts: workoutPct };
  }, [state.dailyLog, state.targets]);

  function addDaily() {
    setState((p:any)=> ({...p, dailyLog: [...p.dailyLog, {date: today, weight:'', steps:'', calories:'', protein:'', workout:false, notes:''}]}));
  }
  function rmDaily(i:number) { setState((p:any)=> ({...p, dailyLog: p.dailyLog.filter((_ :any, idx:number)=> idx!==i)})); }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `moshefit_${(state.client.fullName||'client').replace(/\s+/g,'_')}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ()=> { try { const data = JSON.parse(String(reader.result)); setState(data); } catch { alert('קובץ לא תקין'); } };
    reader.readAsText(file);
  }

  return (
    <div dir="rtl" className="container">
      <div className="topbar">
        <h1>MOSHE FIT – מעקב מתאמן</h1>
        <div className="flex">
          <button className="btn" onClick={exportJSON} title="ייצוא"><span style={{display:'inline-flex',gap:6,alignItems:'center'}}><Download size={16}/>ייצוא</span></button>
          <label className="btn" style={{display:'inline-flex',gap:6,alignItems:'center', cursor:'pointer'}}>
            <Upload size={16}/>ייבוא
            <input type="file" accept="application/json" onChange={importJSON} style={{display:'none'}}/>
          </label>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {([['home','בית', Home], ['daily','יומן', Edit3], ['progress','התקדמות', TrendingUp], ['profile','פרופיל', User]] as const).map(([val,label,Icon])=> (
          <button key={val} role="tab" aria-selected={tab===val} onClick={()=>setTab(val as any)}>
            <span style={{display:'inline-flex',gap:6,alignItems:'center'}}><Icon size={16}/>{label}</span>
          </button>
        ))}
      </div>

      {tab==='home' && (
        <div className="card" style={{marginTop:12}}>
          <div className="grid grid-2">
            <div>
              <label htmlFor="today">תאריך</label>
              <input id="today" type="date" value={today} onChange={(e)=>setToday(e.target.value)}/>
            </div>
            <div>
              <label>קוד מתאמן</label>
              <input placeholder="למשל: MF-001" value={state.client.code} onChange={(e)=> setState((p:any)=> ({...p, client: {...p.client, code: e.target.value}})) }/>
            </div>
          </div>
          <div style={{fontSize:13, color:'#64748b', marginTop:8}}>🍏 טיפ: מלא יעדים בפרופיל → ואז הזן ביומן. אפשר לייצא קובץ ולשלוח למאמן.</div>
        </div>
      )}

      {tab==='daily' && (
        <div className="card" style={{marginTop:12}}>
          <div className="flex between" style={{marginBottom:8}}>
            <div style={{fontWeight:600}}>יומן יומי</div>
            <button className="btn primary" onClick={addDaily}>+ הוסף יום</button>
          </div>
          <div className="grid">
            {state.dailyLog.map((row:Daily, idx:number)=>(
              <div key={idx} className="row">
                <div className="grid grid-2" style={{marginBottom:8}}>
                  <div>
                    <label>תאריך</label>
                    <input type="date" value={row.date} onChange={(e)=>{
                      const v=e.target.value; setState((p:any)=>{ const n={...p}; n.dailyLog=[...n.dailyLog]; n.dailyLog[idx]={...n.dailyLog[idx], date:v}; return n;});
                    }}/>
                  </div>
                  <div>
                    <label>משקל (ק"ג)</label>
                    <input type="number" value={row.weight} onChange={(e)=>{
                      const v=e.target.value; setState((p:any)=>{ const n={...p}; n.dailyLog=[...n.dailyLog]; n.dailyLog[idx]={...n.dailyLog[idx], weight:Number(v)}; return n;});
                    }}/>
                  </div>
                  <div>
                    <label>צעדים</label>
                    <input type="number" value={row.steps} onChange={(e)=>{
                      const v=e.target.value; setState((p:any)=>{ const n={...p}; n.dailyLog=[...n.dailyLog]; n.dailyLog[idx]={...n.dailyLog[idx], steps:Number(v)}; return n;});
                    }}/>
                  </div>
                  <div>
                    <label>קלוריות</label>
                    <input type="number" value={row.calories} onChange={(e)=>{
                      const v=e.target.value; setState((p:any)=>{ const n={...p}; n.dailyLog=[...n.dailyLog]; n.dailyLog[idx]={...n.dailyLog[idx], calories:Number(v)}; return n;});
                    }}/>
                  </div>
                  <div>
                    <label>חלבון (גר׳)</label>
                    <input type="number" value={row.protein} onChange={(e)=>{
                      const v=e.target.value; setState((p:any)=>{ const n={...p}; n.dailyLog=[...n.dailyLog]; n.dailyLog[idx]={...n.dailyLog[idx], protein:Number(v)}; return n;});
                    }}/>
                  </div>
                  <div className="flex" style={{alignItems:'end', gap:8}}>
                    <input id={`w${idx}`} type="checkbox" checked={!!row.workout} onChange={(e)=>{
                      const v=e.target.checked; setState((p:any)=>{ const n={...p}; n.dailyLog=[...n.dailyLog]; n.dailyLog[idx]={...n.dailyLog[idx], workout:v}; return n;});
                    }}/>
                    <label htmlFor={`w${idx}`}>אימון בוצע</label>
                    <button className="btn danger" onClick={()=>rmDaily(idx)}>מחק</button>
                  </div>
                </div>
                <label>הערות</label>
                <textarea value={row.notes||''} onChange={(e)=>{
                  const v=e.target.value; setState((p:any)=>{ const n={...p}; n.dailyLog=[...n.dailyLog]; n.dailyLog[idx]={...n.dailyLog[idx], notes:v}; return n;});
                }}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==='progress' && (
        <div className="card" style={{marginTop:12}}>
          <div className="kpis">
            <div className="kpi"><div className="title">עמידה בקלוריות</div><div className="value">{adherence.calories}%</div></div>
            <div className="kpi"><div className="title">עמידה בחלבון</div><div className="value">{adherence.protein}%</div></div>
            <div className="kpi"><div className="title">עמידה בצעדים</div><div className="value">{adherence.steps}%</div></div>
            <div className="kpi"><div className="title">עמידה באימונים</div><div className="value">{adherence.workouts}%</div></div>
          </div>
          <div style={{marginTop:12}}>
            <div style={{fontWeight:600, marginBottom:6}}>גרף משקל – 14 ימים</div>
            <div style={{height:220}}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={['auto','auto']} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="weight" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {tab==='profile' && (
        <div className="card" style={{marginTop:12}}>
          <div className="grid grid-2">
            <div>
              <label>שם מלא</label>
              <input value={state.client.fullName} onChange={(e)=> setState((p:any)=> ({...p, client:{...p.client, fullName:e.target.value}})) }/>
            </div>
            <div>
              <label>גובה (ס"מ)</label>
              <input type="number" value={state.client.heightCm} onChange={(e)=> setState((p:any)=> ({...p, client:{...p.client, heightCm:e.target.value}})) }/>
            </div>
            <div>
              <label>משקל פתיחה (ק"ג)</label>
              <input type="number" value={state.client.startWeight} onChange={(e)=> setState((p:any)=> ({...p, client:{...p.client, startWeight:e.target.value}})) }/>
            </div>
            <div>
              <label>יעד משקל (ק"ג)</label>
              <input type="number" value={state.client.targetWeight} onChange={(e)=> setState((p:any)=> ({...p, client:{...p.client, targetWeight:e.target.value}})) }/>
            </div>
          </div>
          <div className="grid grid-2" style={{marginTop:12}}>
            <div>
              <label>יעד קלוריות</label>
              <input type="number" value={state.targets.calories} onChange={(e)=> setState((p:any)=> ({...p, targets:{...p.targets, calories:e.target.value}})) }/>
            </div>
            <div>
              <label>יעד חלבון (גר׳)</label>
              <input type="number" value={state.targets.protein} onChange={(e)=> setState((p:any)=> ({...p, targets:{...p.targets, protein:e.target.value}})) }/>
            </div>
            <div>
              <label>יעד צעדים</label>
              <input type="number" value={state.targets.steps} onChange={(e)=> setState((p:any)=> ({...p, targets:{...p.targets, steps:e.target.value}})) }/>
            </div>
            <div>
              <label>אימונים לשבוע</label>
              <input type="number" value={state.targets.workoutsPerWeek} onChange={(e)=> setState((p:any)=> ({...p, targets:{...p.targets, workoutsPerWeek:e.target.value}})) }/>
            </div>
          </div>
          <div style={{marginTop:12}}>
            <label>הערות</label>
            <textarea value={state.client.notes} onChange={(e)=> setState((p:any)=> ({...p, client:{...p.client, notes:e.target.value}})) }/>
          </div>
          <div style={{marginTop:12}}>
            <div style={{fontWeight:600, marginBottom:6}}>תכנית אימון (תיאור חופשי לפי ימים)</div>
            <ProgramEditor program={state.program} onChange={(program)=> setState((p:any)=> ({...p, program})) }/>
          </div>
        </div>
      )}
    </div>
  );
}

function ProgramEditor({ program, onChange }:{ program: ProgramRow[]; onChange: (p:ProgramRow[])=>void }) {
  const [rows, setRows] = useState(program?.length ? program : [
    { day: 'א׳', title: 'גוף עליון', items: 'חזה, גב, כתפיים, יד קדמית/אחורית' },
    { day: 'ב׳', title: 'גוף תחתון', items: 'סקוואט, לאנג׳ים, דדליפט רומני' },
  ]);
  useEffect(()=>{ onChange?.(rows); }, [rows]);
  function addRow(){ setRows(prev=> [...prev, { day:'', title:'', items:'' }]); }
  function rmRow(i:number){ setRows(prev=> prev.filter((_,idx)=> idx!==i)); }
  function up(i:number, key:keyof ProgramRow, val:string){ setRows(prev=> { const n=[...prev]; n[i]={...n[i],[key]:val}; return n; }); }
  return (
    <div className="grid">
      {rows.map((r, i)=>(
        <div key={i} className="grid" style={{gridTemplateColumns:'1fr 2fr 3fr auto', gap:8, alignItems:'end'}}>
          <div><label>יום</label><input value={r.day} onChange={(e)=>up(i,'day',e.target.value)}/></div>
          <div><label>כותרת</label><input value={r.title} onChange={(e)=>up(i,'title',e.target.value)}/></div>
          <div><label>תרגילים</label><input value={r.items} onChange={(e)=>up(i,'items',e.target.value)}/></div>
          <div><button className="btn danger" onClick={()=>rmRow(i)}>מחק</button></div>
        </div>
      ))}
      <button className="btn" onClick={addRow}>+ הוסף יום</button>
    </div>
  )
}
