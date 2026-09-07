"use client";

import { useMemo, useState } from 'react';
import { Bell, ChevronRight, CircleDollarSign, GlassWater, LayoutDashboard, Package, Plus, Search, Settings, ShoppingCart, Sparkles, TrendingUp, Wine } from 'lucide-react';

const recipes = [
  { name: 'Margarita', category: 'Classic', cost: 1.82, price: 9.5, stock: 'OK', ingredients: 'Tequila · Triple sec · Lima' },
  { name: 'Mojito', category: 'Classic', cost: 1.46, price: 9, stock: 'OK', ingredients: 'Ron · Lima · Hierbabuena · Soda' },
  { name: 'Negroni', category: 'Classic', cost: 2.35, price: 11, stock: 'Bajo', ingredients: 'Gin · Campari · Vermut rojo' },
  { name: 'Daiquiri', category: 'Sour', cost: 1.31, price: 8.5, stock: 'OK', ingredients: 'Ron · Lima · Azúcar' },
];

const nav = [
  ['Resumen', LayoutDashboard], ['Cócteles', GlassWater], ['Ingredientes', Package], ['Stock', ShoppingCart], ['Carta digital', Wine], ['Configuración', Settings]
] as const;

export default function Home() {
  const [active, setActive] = useState('Resumen');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => recipes.filter(r => `${r.name} ${r.ingredients}`.toLowerCase().includes(query.toLowerCase())), [query]);

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">B</div><div><strong>BAROS</strong><span>cocktail OS</span></div></div>
      <div className="venue"><div className="venue-avatar">LC</div><div><b>La Copa</b><span>Madrid · Local 01</span></div><ChevronRight size={15}/></div>
      <nav>{nav.map(([label, Icon]) => <button key={label} className={active === label ? 'nav active' : 'nav'} onClick={() => setActive(label)}><Icon size={18}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="help"><Sparkles size={16}/><span><b>Plan Starter</b><small>12 días restantes</small></span></div><button className="user"><div>VC</div><span><b>Mi cuenta</b><small>Administrador</small></span></button></div>
    </aside>

    <section className="content">
      <header className="topbar"><div><p className="eyebrow">LUNES, 7 SEPTIEMBRE 2026</p><h1>{active}</h1></div><div className="top-actions"><button className="icon-btn"><Bell size={18}/><i/></button><button className="primary"><Plus size={17}/> Nuevo cóctel</button></div></header>

      <div className="hero"><div><span className="pill"><Sparkles size={14}/> BAROS INTELLIGENCE</span><h2>Tu carta, tus costes,<br/><em>bajo control.</em></h2><p>Gestiona recetas y stock. Descubre qué cócteles puedes preparar con lo que tienes.</p><div className="hero-actions"><button className="dark"><Search size={16}/> Buscar un cóctel</button><button className="ghost">Importar desde TheCocktailDB <ChevronRight size={15}/></button></div></div><div className="hero-glass"><div className="liquid"/><div className="garnish"/><div className="ice i1"/><div className="ice i2"/><div className="ice i3"/></div></div>

      <div className="metrics"><Metric icon={<CircleDollarSign/>} label="Ventas estimadas" value="2.840 €" delta="+12,4%"/><Metric icon={<TrendingUp/>} label="Margen medio" value="72,8%" delta="+3,1%"/><Metric icon={<GlassWater/>} label="Cócteles activos" value="24" delta="+4 este mes"/><Metric icon={<Package/>} label="Stock bajo" value="3" delta="Revisar ahora" warning/></div>

      <section className="panel"><div className="panel-head"><div><h3>Tu carta</h3><p>Coste, precio y margen por cóctel.</p></div><div className="search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar..."/></div></div><div className="table">{filtered.map(r => { const margin = Math.round((1-r.cost/r.price)*100); return <div className="row" key={r.name}><div className="cocktail"><div className="cocktail-icon">🍸</div><div><b>{r.name}</b><span>{r.ingredients}</span></div></div><span className="category">{r.category}</span><span>{r.cost.toFixed(2)} €</span><span>{r.price.toFixed(2)} €</span><strong>{margin}%</strong><span className={r.stock === 'Bajo' ? 'status low' : 'status'}>{r.stock}</span><button className="more">•••</button></div>})}</div><button className="view-all">Ver todos los cócteles <ChevronRight size={15}/></button></section>

      <div className="bottom-grid"><section className="panel compact"><div className="panel-head"><div><h3>Stock por revisar</h3><p>Ingredientes cerca del mínimo.</p></div><button className="text-btn">Ver stock <ChevronRight size={14}/></button></div>{[['Campari','0,42 L','Mín. 1 L'],['Hierbabuena','180 g','Mín. 250 g'],['Triple sec','0,7 L','Mín. 1 L']].map(x => <div className="stock-row" key={x[0]}><div className="stock-dot"/><div><b>{x[0]}</b><span>{x[2]}</span></div><strong>{x[1]}</strong></div>)}</section><section className="panel opportunity"><span className="pill"><Sparkles size={14}/> OPORTUNIDAD</span><h3>Te faltan 3 ingredientes<br/>para <em>34 cócteles.</em></h3><p>Optimiza tu próxima compra y amplía tu carta con el stock que ya tienes.</p><button className="dark">Ver recomendaciones <ChevronRight size={15}/></button></section></div>
      <footer>BAROS · Gestión inteligente para bares <span>Beta privada</span></footer>
    </section>
  </main>
}

function Metric({icon,label,value,delta,warning=false}:{icon:React.ReactNode,label:string,value:string,delta:string,warning?:boolean}) { return <div className="metric"><div className="metric-icon">{icon}</div><div><span>{label}</span><b>{value}</b><small className={warning?'warn':''}>{delta}</small></div></div> }
