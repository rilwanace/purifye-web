import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api'
import { useAuth } from '../../auth/useAuth'
import { openWhatsApp, promptWhatsApp } from '../../shared/utils/whatsapp'

type Period = 'this_month' | '3m' | '6m' | 'ytd' | 'all'
interface ViewEntry { id: string; params: Record<string,string>; period: Period; offset: number; activeTab?: string }

function fmt(n: number | null | undefined) {
  if (n == null) return '0'
  return Math.round(n).toLocaleString('en-US')
}
function fmtDate(s: string) {
  if (!s) return ''
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3])
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
  }
  try { return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) }
  catch { return s }
}

function SvgBars({ bars, color }: { bars: {label:string;value:number}[]; color: string }) {
  if (!bars?.length) return <svg width="100%" height="60" />
  const W=320,H=60,gap=2,n=bars.length
  const barW = Math.max(2, Math.floor((W-(n-1)*gap)/n))
  const max = Math.max(...bars.map(b=>b.value), 1)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="60" preserveAspectRatio="none">
      {bars.map((b,i)=>{
        const h = Math.max(2, Math.round((b.value/max)*(H-14)))
        const x = i*(barW+gap)
        return <g key={i}>
          <rect x={x} y={H-h-12} width={barW} height={h} rx="2" fill={color} opacity={0.85}/>
          {n<=12 && i%Math.ceil(n/6)===0 && <text x={x+barW/2} y={H-1} textAnchor="middle" fill="#555" fontSize="7">{b.label}</text>}
        </g>
      })}
    </svg>
  )
}

function Donut({ segs, size }: { segs:{pct:number;color:string}[]; size:number }) {
  const r=size/2-4,cx=size/2,cy=size/2,circ=2*Math.PI*r
  const offsets = segs.reduce<number[]>((acc, _s, i) => {
    acc.push(i === 0 ? 0 : acc[i-1] + (segs[i-1].pct/100)*circ)
    return acc
  }, [])
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
    {segs.map((s,i)=>{
      const dash=(s.pct/100)*circ
      return <circle key={i} cx={cx} cy={cy} r={r} fill="none"
        stroke={s.color} strokeWidth="12"
        strokeDasharray={`${dash.toFixed(2)} ${(circ-dash).toFixed(2)}`}
        strokeDashoffset={(-offsets[i]).toFixed(2)}
        transform={`rotate(-90 ${cx} ${cy})`}/>
    })}
  </svg>
}

function PeriodPills({ period, onChange }: { period:Period; onChange:(p:Period)=>void }) {
  const opts:[Period,string][] = [['this_month','This Month'],['3m','3M'],['6m','6M'],['ytd','YTD'],['all','All']]
  return <div style={{display:'flex',gap:6,padding:'10px 16px',overflowX:'auto',scrollbarWidth:'none'}}>
    {opts.map(([id,label])=>(
      <button key={id} onClick={()=>onChange(id)} style={{
        padding:'5px 13px',borderRadius:20,border:`1px solid ${id===period?'rgba(93,202,165,0.4)':'var(--border)'}`,
        background:id===period?'rgba(93,202,165,0.12)':'var(--bg-card)',
        color:id===period?'var(--accent)':'var(--text-muted)',fontSize:12,fontWeight:500,
        whiteSpace:'nowrap',cursor:'pointer',flexShrink:0,fontFamily:'var(--font-sans)',
      }}>{label}</button>
    ))}
  </div>
}

const Card = ({children,onClick,noTap}:{children:React.ReactNode;onClick?:()=>void;noTap?:boolean})=>(
  <div onClick={noTap?undefined:onClick} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,padding:14,cursor:noTap?'default':'pointer'}}>
    {children}
  </div>
)
const Lbl = ({children}:{children:React.ReactNode})=><div style={{fontSize:9,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:8,fontFamily:'var(--font-mono)'}}>{children}</div>
const Big = ({children,color}:{children:React.ReactNode;color?:string})=><div style={{fontSize:20,fontWeight:700,color:color||'var(--text-primary)',marginBottom:4,fontFamily:'var(--font-mono)'}}>{children}</div>
const Sub = ({children}:{children:React.ReactNode})=><div style={{fontSize:11,color:'var(--text-muted)'}}>{children}</div>

function HBar({name,value,pct,color}:{name:string;value:number;pct:number;color:string}) {
  return <div style={{marginBottom:9}}>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:11}}>
      <span style={{color:'var(--text-primary)',fontWeight:500,maxWidth:'65%',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</span>
      <span style={{color:'var(--text-muted)'}}>Rs. {fmt(value)}</span>
    </div>
    <div style={{height:5,background:'var(--bg-input)',borderRadius:3,overflow:'hidden'}}>
      <div style={{height:'100%',borderRadius:3,background:color,width:`${pct}%`}}/>
    </div>
  </div>
}

// === Summary cards ===
function RevenueCard({d,push}:{d:any;push:(id:string,p:{})=>void}) {
  const bars=d.bars||[]
  const bl={daily:'Daily',weekly:'Weekly',monthly:'Monthly'}[d.bucket as string]||''
  return <Card onClick={()=>push('revenue',{})}>
    <Lbl>Revenue — {bl}</Lbl>
    <Big>Rs. {fmt(d.total)}</Big>
    <SvgBars bars={bars} color="#3bf084"/>
  </Card>
}

function MarginCard({d,push}:{d:any;push:(id:string,p:{})=>void}) {
  const segs=[{pct:d.cogs_pct,color:'#d85a30'},{pct:d.opex_pct,color:'#ef9f27'},{pct:Math.max(0,d.profit_pct),color:'#3bf084'}].filter(s=>s.pct>0)
  const tot=segs.reduce((a,s)=>a+s.pct,0); if(tot<99)segs.push({pct:100-tot,color:'#222'})
  return <Card onClick={()=>push('pnl',{})}>
    <Lbl>Net Margin</Lbl>
    <Big>{d.margin_pct}%</Big>
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,marginTop:6}}>
      <div style={{position:'relative',width:90,height:90}}>
        <Donut segs={segs} size={90}/>
        <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',fontSize:14,fontWeight:800,color:'#3bf084'}}>{d.margin_pct}%</div>
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:'5px 10px',justifyContent:'center'}}>
        {[['COGS','#d85a30'],['Opex','#ef9f27'],['Profit','#3bf084']].map(([l,c])=>(
          <div key={l} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'var(--text-muted)'}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:c}}/>{l}
          </div>
        ))}
      </div>
    </div>
  </Card>
}

function ExpCard({d,push}:{d:any;push:(id:string,p:{})=>void}) {
  const cats=(d.categories||[]).filter((c:any)=>!c.name.startsWith('+'))
  const rest=(d.categories||[]).filter((c:any)=>c.name.startsWith('+'))
  const colors=['#3bf084','#ef9f27','#d85a30','#888']
  const segs=cats.map((c:any,i:number)=>({pct:c.pct,color:colors[i]||'#555'})).filter((s:any)=>s.pct>0)
  if(rest.length&&rest[0].pct>0)segs.push({pct:rest[0].pct,color:'#333'})
  const tot=segs.reduce((a:number,s:any)=>a+s.pct,0); if(tot<99)segs.push({pct:100-tot,color:'#1a1a1a'})
  return <Card onClick={()=>push('expenses',{})}>
    <Lbl>Expenses</Lbl>
    <Big>Rs. {fmt(d.total)}</Big>
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,marginTop:6}}>
      <Donut segs={segs} size={90}/>
      <div style={{display:'flex',flexWrap:'wrap',gap:'5px 10px',justifyContent:'center'}}>
        {cats.map((c:any,i:number)=>(
          <div key={c.name} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'var(--text-muted)'}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:colors[i]||'#555'}}/>{c.name}
          </div>
        ))}
      </div>
    </div>
  </Card>
}

function CashCard({d,push}:{d:any;push:(id:string,p:{})=>void}) {
  const accts=d.accounts||[], max=Math.max(...accts.map((a:any)=>a.value),1)
  const colors=['#3bf084','#1a9e6e','#0d6e4a']
  return <Card onClick={()=>push('cash_accounts',{})}>
    <Lbl>Cash Now</Lbl>
    <Big>Rs. {fmt(d.total)}</Big>
    <div style={{marginTop:10}}>
      {accts.map((a:any,i:number)=>{
        const isMore=a.name.startsWith('+'), pct=max>0?Math.min(100,Math.round(a.value/max*100)):0
        return <HBar key={a.name} name={a.name} value={a.value} pct={pct} color={isMore?'var(--bg-input)':(colors[i]||'#0d6e4a')}/>
      })}
    </div>
  </Card>
}

function AgingCard({side,d,push}:{side:'ar'|'ap';d:any;push:(id:string,p:{})=>void}) {
  const isAR=side==='ar', bk=d.buckets||{}
  const vals=[bk['0_30']||0,bk['31_60']||0,bk['61_90']||0,bk['90_plus']||0]
  const maxV=Math.max(...vals,1), H=50
  const bkColors=['#3bf084','#ef9f27','#d85a30','#a32d2d']
  const bkLabels=['0-30','31-60','61-90','90+']
  const cnt=isAR?d.customer_count:d.supplier_count
  return <Card onClick={()=>push(isAR?'ar_aging':'ap_aging',{})}>
    <Lbl>{isAR?'A/R Aging':'A/P Aging'}</Lbl>
    <Big>Rs. {fmt(d.total)}</Big>
    <Sub>{cnt} {isAR?'customer':'supplier'}{cnt!==1?'s':''}</Sub>
    <div style={{display:'flex',gap:6,marginTop:10,alignItems:'flex-end',height:H+16}}>
      {vals.map((v,i)=>{
        const h=maxV>0?Math.max(3,Math.round(v/maxV*H)):3
        return <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
          <div style={{width:'100%',borderRadius:'3px 3px 0 0',height:h,background:bkColors[i]}}/>
          <div style={{fontSize:9,color:bkColors[i],textAlign:'center',whiteSpace:'nowrap'}}>{bkLabels[i]}</div>
        </div>
      })}
    </div>
  </Card>
}

function PurchCard({d,push}:{d:any;push:(id:string,p:{})=>void}) {
  const sups=d.suppliers||[], max=Math.max(...sups.map((s:any)=>s.value),1)
  const colors=['#3bf084','#1a9e6e','#0d6e4a','#555']
  return <Card onClick={()=>push('purchases',{})}>
    <Lbl>Purchases by Supplier</Lbl>
    <Big>Rs. {fmt(d.total)}</Big>
    <Sub>{d.supplier_count} supplier{d.supplier_count!==1?'s':''}</Sub>
    <div style={{marginTop:10}}>
      {sups.map((s:any,i:number)=>{
        const isMore=s.name.startsWith('+'), pct=max>0?Math.min(100,Math.round(s.value/max*100)):0
        return <HBar key={s.name} name={s.name} value={s.value} pct={pct} color={isMore?'#333':(colors[i]||'#555')}/>
      })}
    </div>
  </Card>
}

function InvCard({d,push}:{d:any;push:(id:string,p:{})=>void}) {
  const skus=d.skus||[], max=Math.max(...skus.map((s:any)=>s.value),1)
  const colors=['#3bf084','#1a9e6e','#0d6e4a','#555']
  return <Card onClick={()=>push('inventory',{})}>
    <Lbl>Inventory by SKU</Lbl>
    <Big>Rs. {fmt(d.total)}</Big>
    <Sub>{d.sku_count} SKU{d.sku_count!==1?'s':''}</Sub>
    <div style={{marginTop:10}}>
      {skus.map((s:any,i:number)=>{
        const isMore=s.name.startsWith('+'), pct=max>0?Math.min(100,Math.round(s.value/max*100)):0
        return <HBar key={s.name} name={s.name} value={s.value} pct={pct} color={isMore?'#333':(colors[i]||'#555')}/>
      })}
    </div>
  </Card>
}

// === Drill row primitives ===
const Row = ({name,sub,val,valColor,onClick,chevron}:{name:string;sub?:string;val:string;valColor?:string;onClick?:()=>void;chevron?:boolean})=>(
  <div onClick={onClick} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 14px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,cursor:onClick?'pointer':'default'}}>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:'var(--font-sans)',color:'var(--text-primary)'}}>{name}</div>
      {sub&&<div style={{fontSize:9,color:'var(--text-muted)',fontFamily:'var(--font-mono)',marginTop:2}}>{sub}</div>}
    </div>
    <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:12}}>
      <div style={{fontSize:13,fontWeight:600,color:valColor||'var(--text-primary)',fontFamily:'var(--font-mono)'}}>{val}</div>
      {chevron&&<div style={{fontSize:14,color:'var(--text-dim)'}}>›</div>}
    </div>
  </div>
)

const TxRow = ({tx}:{tx:any})=>{
  const isCredit=(tx.credit||0)>0, amt=isCredit?tx.credit:tx.debit
  return <div style={{padding:'10px 14px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
      <div style={{fontSize:12,fontWeight:500,flex:1,marginRight:8,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any,fontFamily:'var(--font-sans)',color:'var(--text-primary)'}}>{tx.description||'—'}</div>
      <div style={{fontSize:12,fontWeight:600,whiteSpace:'nowrap',color:isCredit?'#3bf084':'#d85a30',fontFamily:'var(--font-mono)'}}>{isCredit?'+':'-'}Rs. {fmt(amt)}</div>
    </div>
    <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
      <div style={{fontSize:9,color:'var(--text-muted)',fontFamily:'var(--font-mono)'}}>{fmtDate(tx.date)}</div>
      <div style={{fontSize:9,color:'var(--text-dim)',fontFamily:'var(--font-mono)'}}>Bal: Rs. {fmt(tx.running_balance)}</div>
    </div>
  </div>
}

const SectionHead = ({children}:{children:React.ReactNode})=>(
  <div style={{fontSize:9,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text-muted)',padding:'8px 0 4px',fontFamily:'var(--font-mono)'}}>{children}</div>
)
const ViewH = ({title,sub}:{title:string;sub?:string})=><>
  <div style={{fontSize:16,fontWeight:700}}>{title}</div>
  {sub&&<div style={{fontSize:11,color:'var(--text-muted)'}}>{sub}</div>}
</>
const LoadMore = ({has,onLoad,loading}:{has:boolean;onLoad:()=>void;loading?:boolean})=>!has?null:(
  <div onClick={loading?undefined:onLoad} style={{padding:12,textAlign:'center',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,color:'var(--accent)',fontSize:12,fontWeight:600,cursor:loading?'not-allowed':'pointer',opacity:loading?0.6:1}}>
    {loading ? 'Loading…' : 'Load more'}
  </div>
)

// === Drill views ===
const CashAccountsView = ({d,push}:{d:any;push:Function})=>(
  <div style={{display:'flex',flexDirection:'column',gap:8}}>
    <ViewH title="Cash Accounts" sub="Tap an account to see transactions"/>
    {(d.accounts||[]).map((a:any)=><Row key={a.name} name={a.name} val={`Rs. ${fmt(a.balance)}`}
      valColor={a.balance<0?'#d85a30':'#3bf084'} onClick={()=>push('account_txns',{account:a.name})} chevron/>)}
  </div>
)

const AccountTxnsView = ({d,onMore,loadingMore}:{d:any;onMore:()=>void;loadingMore?:boolean})=>(
  <div style={{display:'flex',flexDirection:'column',gap:8}}>
    <ViewH title={d.account||''} sub={`Balance: Rs. ${fmt(d.total)}`}/>
    {(d.transactions||[]).map((tx:any,i:number)=><TxRow key={i} tx={tx}/>)}
    <LoadMore has={!!d.has_more} onLoad={onMore} loading={loadingMore}/>
  </div>
)

const AgingView = ({d,side,push}:{d:any;side:'ar'|'ap';push:Function})=>{
  const isAR=side==='ar', bk=d.totals||{}
  const vals=[bk['0-30']||0,bk['31-60']||0,bk['61-90']||0,bk['90+']||0]
  const maxV=Math.max(...vals,1), H=60
  const bkColors=['#3bf084','#ef9f27','#d85a30','#a32d2d']
  const bkLabels=['0-30 days','31-60','61-90','90+']
  const parties=d.parties||[]

  function sendWaReminder(p: any) {
    const amt = Math.round(p.outstanding ?? p.total_outstanding ?? 0).toLocaleString('en-US')
    const msg = isAR
      ? `Hi ${p.name}, friendly reminder: Rs. ${amt} is outstanding. Please arrange payment at your earliest convenience. — Purifye`
      : `Hi ${p.name}, we have an outstanding balance of Rs. ${amt}. We will arrange payment soon. — Purifye`
    if (p.contact) {
      openWhatsApp(p.contact, msg)
    } else {
      promptWhatsApp(msg)
    }
  }

  return <div style={{display:'flex',flexDirection:'column',gap:8}}>
    <ViewH title={isAR?'A/R Aging':'A/P Aging'}/>
    <div style={{display:'flex',gap:6,alignItems:'flex-end',height:H+20,margin:'4px 0'}}>
      {vals.map((v,i)=>{const h=maxV>0?Math.max(3,Math.round(v/maxV*H)):3;return(
        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
          <div style={{width:'100%',borderRadius:'3px 3px 0 0',height:h,background:bkColors[i]}}/>
          <div style={{fontSize:9,color:bkColors[i],textAlign:'center'}}>{bkLabels[i]}</div>
        </div>
      )})}
    </div>
    <SectionHead>{isAR?'Customers':'Suppliers'} ({parties.length})</SectionHead>
    {parties.map((p:any)=>p.is_rollup_other
      ?<Row key={p.name} name={p.name} val={`Rs. ${fmt(p.total_outstanding ?? p.outstanding)}`}/>
      :<div key={p.name} style={{display:'flex',alignItems:'center',gap:0}}>
        <div style={{flex:1}} onClick={()=>push(isAR?'customer_ledger':'supplier_ledger',isAR?{customer:p.name}:{supplier:p.name})}>
          <Row name={p.name} val={`Rs. ${fmt(p.total_outstanding ?? p.outstanding)}`} valColor="#ef9f27" onClick={()=>{}} chevron/>
        </div>
        <button onClick={e=>{e.stopPropagation();sendWaReminder(p)}} title="Send WhatsApp reminder"
          style={{background:'none',border:'none',cursor:'pointer',fontSize:18,padding:'0 4px',flexShrink:0,lineHeight:1}}>
          💬
        </button>
      </div>
    )}
  </div>
}

const CounterpartyLedger = ({d,ctype,onMore,loadingMore}:{d:any;ctype:string;onMore:()=>void;loadingMore?:boolean})=>{
  const outstanding=d.outstanding||0
  const outColor=outstanding>0?'#ef9f27':outstanding<0?'#3bf084':'var(--text-primary)'
  const trend=d.trend||[], maxT=Math.max(...trend.map((t:any)=>Math.abs(t.balance)),1)
  return <div style={{display:'flex',flexDirection:'column',gap:8}}>
    <ViewH title={d[ctype]||''}/>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10}}>
      <div>
        <div style={{fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.6px'}}>{ctype==='customer'?'Outstanding':'You Owe'}</div>
        <div style={{fontSize:18,fontWeight:700,color:outColor}}>Rs. {fmt(outstanding)}</div>
      </div>
      <div style={{width:120}}>
        <div style={{display:'flex',gap:2,alignItems:'flex-end',height:36}}>
          {trend.map((t:any,i:number)=>{const h=maxT>0?Math.max(2,Math.round(Math.abs(t.balance)/maxT*36)):2;return(
            <div key={i} style={{flex:1,height:h,background:t.balance>0?'#1a9e6e':'#555',borderRadius:1}}/>
          )})}
        </div>
        <div style={{fontSize:9,color:'var(--text-dim)',textAlign:'center',marginTop:3}}>12-month balance</div>
      </div>
    </div>
    <SectionHead>Transactions</SectionHead>
    {(d.transactions||[]).map((tx:any,i:number)=><TxRow key={i} tx={tx}/>)}
    <LoadMore has={!!d.has_more} onLoad={onMore} loading={loadingMore}/>
  </div>
}

const RevenueView = ({d,entry,onTab,push}:{d:any;entry:ViewEntry;onTab:(t:string)=>void;push:Function})=>{
  const active=entry.activeTab||'customer'
  const tabs=[['customer','By Customer'],['product','By Product'],['month','By Month'],['channel','By Channel']]
  return <div style={{display:'flex',flexDirection:'column',gap:8}}>
    <ViewH title="Revenue" sub={`Rs. ${fmt(d.total)} total`}/>
    <div style={{display:'flex',gap:6,overflowX:'auto',scrollbarWidth:'none',paddingBottom:2}}>
      {tabs.map(([id,label])=>(
        <button key={id} onClick={()=>onTab(id)} style={{padding:'5px 12px',borderRadius:16,border:`1px solid ${id===active?'rgba(93,202,165,0.4)':'var(--border)'}`,
          background:id===active?'rgba(93,202,165,0.12)':'var(--bg-card)',color:id===active?'var(--accent)':'var(--text-muted)',
          fontSize:11,fontWeight:500,whiteSpace:'nowrap',cursor:'pointer',flexShrink:0,fontFamily:'var(--font-sans)'}}>
          {label}
        </button>
      ))}
    </div>
    {(d.rows||[]).map((r:any,i:number)=>active==='customer'
      ?<Row key={i} name={r.label} sub={`${(r.pct||0).toFixed(1)}% of revenue`} val={`Rs. ${fmt(r.value)}`}
        valColor="#3bf084" onClick={()=>push('customer_ledger',{customer:r.label})} chevron/>
      :<div key={i} style={{marginBottom:9}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,fontSize:11}}>
          <span>{r.label}</span><span style={{color:'var(--text-muted)'}}>Rs. {fmt(r.value)} ({(r.pct||0).toFixed(1)}%)</span>
        </div>
        <div style={{height:5,background:'var(--bg-input)',borderRadius:3,overflow:'hidden'}}>
          <div style={{height:'100%',borderRadius:3,background:'#3bf084',width:`${Math.min(100,r.pct||0)}%`}}/>
        </div>
      </div>
    )}
  </div>
}

const PnlView = ({d,push}:{d:any;push:Function})=>(
  <div style={{display:'flex',flexDirection:'column',gap:6}}>
    <ViewH title="Profit & Loss"/>
    <div onClick={()=>push('revenue',{})} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,cursor:'pointer'}}>
      <div style={{fontSize:13,fontWeight:500}}>Revenue</div>
      <div style={{fontSize:13,fontWeight:600,color:'#3bf084'}}>Rs. {fmt(d.revenue)}</div>
    </div>
    <div onClick={()=>push('cogs_drill',{})} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,cursor:'pointer'}}>
      <div style={{fontSize:13,fontWeight:500}}>COGS</div>
      <div style={{fontSize:13,fontWeight:600,color:'#d85a30'}}>Rs. {fmt(d.cogs)}</div>
    </div>
    <div style={{display:'flex',justifyContent:'space-between',padding:'12px 14px',background:'var(--bg-surface)',border:'1px solid var(--text-dim)',borderRadius:10}}>
      <div style={{fontSize:13,fontWeight:500}}>Gross Profit</div>
      <div style={{fontSize:13,fontWeight:600,color:d.gross_profit>=0?'#3bf084':'#d85a30'}}>Rs. {fmt(d.gross_profit)} <span style={{fontSize:10,color:'var(--text-muted)'}}>({d.gross_margin_pct}%)</span></div>
    </div>
    <div onClick={()=>push('expenses',{})} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10,cursor:'pointer'}}>
      <div style={{fontSize:13,fontWeight:500}}>Total Opex</div>
      <div style={{fontSize:13,fontWeight:600,color:'#d85a30'}}>Rs. {fmt(d.total_opex)}</div>
    </div>
    {(d.opex_categories||[]).map((c:any)=>(
      <div key={c.name} style={{display:'flex',justifyContent:'space-between',padding:'12px 14px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10}}>
        <div style={{fontSize:11,color:'var(--text-muted)',paddingLeft:16}}>{c.name}</div>
        <div style={{fontSize:13,fontWeight:600,color:'var(--text-muted)'}}>Rs. {fmt(c.amount)}</div>
      </div>
    ))}
    <div style={{display:'flex',justifyContent:'space-between',padding:'12px 14px',background:'rgba(26,158,110,0.1)',border:'1px solid rgba(93,202,165,0.3)',borderRadius:10}}>
      <div style={{fontSize:13,fontWeight:700}}>Net Profit</div>
      <div style={{fontSize:16,fontWeight:800,color:d.net_profit>=0?'#3bf084':'#d85a30'}}>Rs. {fmt(d.net_profit)} <span style={{fontSize:10,color:'var(--text-muted)'}}>({d.net_margin_pct}%)</span></div>
    </div>
  </div>
)

const CogsView = ({d}:{d:any})=>(
  <div style={{display:'flex',flexDirection:'column',gap:8}}>
    <ViewH title="COGS Breakdown" sub={`Total: Rs. ${fmt(d.total)}`}/>
    {(d.products||[]).map((p:any)=><Row key={p.name} name={p.name} sub={`${p.pct||0}% of COGS · ${p.tx_count} entries`} val={`Rs. ${fmt(p.total)}`} valColor="#d85a30"/>)}
  </div>
)

const ExpensesView = ({d,push}:{d:any;push:Function})=>(
  <div style={{display:'flex',flexDirection:'column',gap:8}}>
    <ViewH title="Expenses" sub={`Rs. ${fmt(d.total)} total`}/>
    {(d.categories||[]).map((c:any)=>c.name.startsWith('+')
      ?<Row key={c.name} name={c.name} val={`Rs. ${fmt(c.total)}`}/>
      :<Row key={c.name} name={c.name} sub={`${(c.pct||0).toFixed(1)}% of expenses`} val={`Rs. ${fmt(c.total)}`}
        onClick={()=>push('category_vendors',{category:c.name})} chevron/>
    )}
  </div>
)

const CatVendorsView = ({d,push}:{d:any;push:Function})=>(
  <div style={{display:'flex',flexDirection:'column',gap:8}}>
    <ViewH title={`${d.category||''} Vendors`} sub={`Rs. ${fmt(d.total)} total`}/>
    {(d.vendors||[]).map((v:any)=><Row key={v.name} name={v.name}
      sub={`${v.tx_count} transaction${v.tx_count!==1?'s':''} · ${(v.pct||0).toFixed(1)}%`}
      val={`Rs. ${fmt(v.total)}`} onClick={()=>push('vendor_txns',{vendor:v.name})} chevron/>)}
  </div>
)

const VendorLedgerView = ({d}:{d:any})=>(
  <div style={{display:'flex',flexDirection:'column',gap:8}}>
    <ViewH title={d.vendor||''} sub={`Total spent: Rs. ${fmt(d.total_spent)}`}/>
    {(d.transactions||[]).map((tx:any,i:number)=>(
      <div key={i} style={{padding:'10px 14px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10}}>
        <div style={{display:'flex',justifyContent:'space-between'}}>
          <div style={{fontSize:12,fontWeight:500}}>{tx.description||'—'}</div>
          <div style={{fontSize:12,fontWeight:600,color:'#d85a30'}}>Rs. {fmt(tx.amount)}</div>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
          <div style={{fontSize:10,color:'var(--text-muted)'}}>{fmtDate(tx.date)}</div>
          <div style={{fontSize:10,color:'var(--text-dim)'}}>{tx.category||''}</div>
        </div>
      </div>
    ))}
  </div>
)

const PurchasesView = ({d,push}:{d:any;push:Function})=>(
  <div style={{display:'flex',flexDirection:'column',gap:8}}>
    <ViewH title="Purchases" sub={`Rs. ${fmt(d.total)} · ${d.supplier_count} supplier${d.supplier_count!==1?'s':''}`}/>
    {(d.suppliers||[]).map((s:any)=><Row key={s.name} name={s.name}
      sub={`${s.tx_count} purchase${s.tx_count!==1?'s':''} · ${(s.pct||0).toFixed(1)}%`}
      val={`Rs. ${fmt(s.value)}`} onClick={()=>push('supplier_ledger',{supplier:s.name})} chevron/>)}
  </div>
)

const InventoryView = ({d,push}:{d:any;push:Function})=>(
  <div style={{display:'flex',flexDirection:'column',gap:8}}>
    <ViewH title="Inventory" sub={`Rs. ${fmt(d.total)} · ${d.sku_count} SKU${d.sku_count!==1?'s':''}`}/>
    {(d.skus||[]).map((s:any)=><Row key={s.name} name={s.name}
      sub={`Qty: ${s.qty} · WAC: Rs. ${fmt(s.wac)}`}
      val={`Rs. ${fmt(s.value)}`}
      onClick={s.id?()=>push('product_movement',{sku_id:s.id,sku_name:s.name}):undefined}
      chevron={!!s.id}/>)}
  </div>
)

const ProductMovView = ({d,entry,onMore,loadingMore}:{d:any;entry:ViewEntry;onMore:()=>void;loadingMore?:boolean})=>(
  <div style={{display:'flex',flexDirection:'column',gap:8}}>
    <ViewH title={d.sku_name||entry.params.sku_name||''}/>
    <div style={{display:'flex',gap:16,padding:'10px 14px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10}}>
      {[['QTY',d.current_qty],['VALUE',`Rs. ${fmt(d.current_value)}`],['WAC',`Rs. ${fmt(d.wac)}`]].map(([l,v])=>(
        <div key={l as string}><div style={{fontSize:10,color:'var(--text-muted)'}}>{l}</div><div style={{fontSize:16,fontWeight:700}}>{v}</div></div>
      ))}
    </div>
    <SectionHead>Stock Movements</SectionHead>
    {(d.transactions||[]).map((tx:any,i:number)=>(
      <div key={i} style={{padding:'10px 14px',background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:10}}>
        <div style={{display:'flex',justifyContent:'space-between'}}>
          <div style={{fontSize:12,fontWeight:500}}>{tx.ref||tx.type||'—'}</div>
          <div style={{fontSize:12,fontWeight:600,color:tx.qty_change>0?'#3bf084':'#d85a30'}}>{tx.qty_change>0?'+':''}{tx.qty_change} units</div>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
          <div style={{fontSize:10,color:'var(--text-muted)'}}>{fmtDate(tx.date)} · {tx.type||''}</div>
          <div style={{fontSize:10,color:'var(--text-dim)'}}>Qty: {tx.qty_after} · WAC: {fmt(tx.wac)}</div>
        </div>
      </div>
    ))}
    <LoadMore has={!!d.has_more} onLoad={onMore} loading={loadingMore}/>
  </div>
)

// === Main Component ===

function ReportsBar() {
  const navigate = useNavigate()
  const REPORTS = [
    { label: 'P&L', tab: 'pnl' },
    { label: 'B/S', tab: 'bs' },
    { label: 'C/F', tab: 'cf' },
    { label: 'T/B', tab: 'tb' },
    { label: 'Ledger', tab: 'ledger' },
  ]
  const btn: React.CSSProperties = {
    padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)',
    background: 'transparent', color: '#6a6a64', cursor: 'pointer', flexShrink: 0,
    fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
  }
  return (
    <div style={{ display: 'flex', overflowX: 'auto', gap: 6, padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', scrollbarWidth: 'none' }}>
      {REPORTS.map(r => (
        <button key={r.tab} onClick={() => navigate('/accounting/reports?tab=' + r.tab)} style={btn}>{r.label}</button>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  useAuth()
  const [period, setPeriod] = useState<Period>('this_month')
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string|null>(null)
  const [stack, setStack] = useState<ViewEntry[]>([])
  const [drillData, setDrillData] = useState<any>(null)
  const [drillLoading, setDrillLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(()=>{
    let stale = false
    setLoading(true); setError(null)
    api(`/api/dashboard-data?period=${period}`)
      .then(d=>{ if (!stale) { setSummary(d); setLoading(false) } })
      .catch(e=>{ if (!stale) { setError(e.message); setLoading(false) } })
    return () => { stale = true }
  }, [period])

  const cur = stack[stack.length-1]

  const fetchDrill = async (entry: ViewEntry): Promise<any> => {
    const p=entry.period||period, pa=entry.params||{}, b='/api/dashboard'
    switch(entry.id){
      case 'cash_accounts': return api(`${b}/cash-accounts`)
      case 'account_txns': return api(`${b}/account-transactions?account=${encodeURIComponent(pa.account||'')}&offset=${entry.offset}&limit=50`)
      case 'ar_aging': return api(`${b}/ar-aging`)
      case 'ap_aging': return api(`${b}/ap-aging`)
      case 'customer_ledger': return api(`${b}/customer-ledger?customer=${encodeURIComponent(pa.customer||'')}&offset=${entry.offset}&limit=50`)
      case 'supplier_ledger': return api(`${b}/supplier-ledger?supplier=${encodeURIComponent(pa.supplier||'')}&offset=${entry.offset}&limit=50`)
      case 'revenue': return api(`${b}/revenue-breakdown?period=${p}&dimension=${entry.activeTab||'customer'}`)
      case 'expenses': return api(`${b}/expenses-breakdown?period=${p}`)
      case 'category_vendors': return api(`${b}/category-vendors?category=${encodeURIComponent(pa.category||'')}&period=${p}`)
      case 'vendor_txns': return api(`${b}/vendor-transactions?vendor=${encodeURIComponent(pa.vendor||'')}`)
      case 'purchases': return api(`${b}/purchases-breakdown?period=${p}`)
      case 'inventory': return api(`${b}/inventory-breakdown`)
      case 'product_movement': return api(`${b}/product-movement?sku_id=${encodeURIComponent(pa.sku_id||'')}&offset=${entry.offset}&limit=50`)
      case 'pnl': return api(`${b}/pnl-breakdown?period=${p}`)
      case 'cogs_drill': return api(`${b}/cogs-breakdown?period=${p}`)
      default: throw new Error('Unknown view')
    }
  }

  useEffect(()=>{
    if(!cur)return
    let stale = false
    setDrillLoading(true); setDrillData(null); setLoadingMore(false)
    fetchDrill(cur).then(d=>{ if (!stale) { setDrillData(d); setDrillLoading(false) } }).catch(e=>{ if (!stale) { setDrillData({error:e.message}); setDrillLoading(false) } })
    return () => { stale = true }
  }, [cur?.id, JSON.stringify(cur?.params), cur?.activeTab])

  const push = (id:string, params:Record<string,string>={})=>{
    const entry:ViewEntry={id,params,period,offset:0,activeTab:id==='revenue'?'customer':undefined}
    setStack(prev=>[...prev,entry])
  }
  const pop = ()=>setStack(prev=>prev.slice(0,-1))
  const onTab = (tab:string)=>setStack(prev=>prev.map((v,i)=>i===prev.length-1?{...v,activeTab:tab}:v))
  const onMore = useCallback(async()=>{
    if(!cur||!drillData?.has_more||loadingMore)return
    const next={...cur,offset:cur.offset+50}
    setLoadingMore(true)
    try{
      const more=await fetchDrill(next)
      const k={account_txns:'transactions',customer_ledger:'transactions',supplier_ledger:'transactions',product_movement:'transactions'}[cur.id]
      if(k&&more[k])setDrillData((prev:any)=>({...prev,[k]:[...(prev[k]||[]),...more[k]],has_more:!!more.has_more}))
      setStack(prev=>prev.map((v,i)=>i===prev.length-1?next:v))
    }catch{}
    setLoadingMore(false)
  },[cur,drillData,loadingMore])

  // Summary view
  if(stack.length===0||!cur){
    return <div>
      <ReportsBar />
      <PeriodPills period={period} onChange={p=>{ setPeriod(p); setStack([]) }}/>
      {loading&&<div style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>Loading…</div>}
      {error&&<div style={{padding:20,color:'var(--danger)',textAlign:'center'}}>{error}</div>}
      {summary&&<div style={{padding:'10px 16px',display:'flex',flexDirection:'column',gap:8}}>
        <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:2}}>{summary.business_name} · {summary.as_of_date}</div>
        <RevenueCard d={summary.revenue} push={push}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <MarginCard d={summary.net_margin} push={push}/>
          <ExpCard d={summary.expenses} push={push}/>
        </div>
        <CashCard d={summary.cash} push={push}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <AgingCard side="ar" d={summary.ar_aging} push={push}/>
          <AgingCard side="ap" d={summary.ap_aging} push={push}/>
        </div>
        <PurchCard d={summary.purchases} push={push}/>
        {summary.track_inventory&&summary.inventory&&<InvCard d={summary.inventory} push={push}/>}
      </div>}
    </div>
  }

  // Drill view
  return <div>
    <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 16px',borderBottom:'1px solid var(--border)'}}>
      <button onClick={pop} style={{background:'none',border:'none',color:'var(--accent)',cursor:'pointer',fontSize:20,padding:'0 4px',fontFamily:'var(--font-sans)'}}>←</button>
      <span style={{fontSize:13,color:'var(--text-muted)'}}>Back</span>
    </div>
    <div style={{padding:'12px 16px'}}>
      {drillLoading&&<div style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>Loading…</div>}
      {drillData?.error&&<div style={{padding:20,color:'var(--danger)',textAlign:'center'}}>{drillData.error}</div>}
      {drillData&&!drillData.error&&(()=>{
        switch(cur.id){
          case 'cash_accounts': return <CashAccountsView d={drillData} push={push}/>
          case 'account_txns': return <AccountTxnsView d={drillData} onMore={onMore} loadingMore={loadingMore}/>
          case 'ar_aging': return <AgingView d={drillData} side="ar" push={push}/>
          case 'ap_aging': return <AgingView d={drillData} side="ap" push={push}/>
          case 'customer_ledger': return <CounterpartyLedger d={drillData} ctype="customer" onMore={onMore} loadingMore={loadingMore}/>
          case 'supplier_ledger': return <CounterpartyLedger d={drillData} ctype="supplier" onMore={onMore} loadingMore={loadingMore}/>
          case 'revenue': return <RevenueView d={drillData} entry={cur} onTab={onTab} push={push}/>
          case 'pnl': return <PnlView d={drillData} push={push}/>
          case 'cogs_drill': return <CogsView d={drillData}/>
          case 'expenses': return <ExpensesView d={drillData} push={push}/>
          case 'category_vendors': return <CatVendorsView d={drillData} push={push}/>
          case 'vendor_txns': return <VendorLedgerView d={drillData}/>
          case 'purchases': return <PurchasesView d={drillData} push={push}/>
          case 'inventory': return <InventoryView d={drillData} push={push}/>
          case 'product_movement': return <ProductMovView d={drillData} entry={cur} onMore={onMore} loadingMore={loadingMore}/>
          default: return <div style={{color:'var(--text-muted)'}}>Unknown view: {cur.id}</div>
        }
      })()}
    </div>
  </div>
}
