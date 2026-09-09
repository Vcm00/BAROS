"use client";

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Bell, ChevronRight, CircleDollarSign, GlassWater, LayoutDashboard, Package, Plus, Search, Settings, ShoppingCart, Sparkles, TrendingUp, Wine, X, Save, LogOut } from 'lucide-react';
import { createSupabaseBrowserClient } from '../lib/supabase';

type Recipe = { id:string; name:string; category:string; cost:number; price:number; stock:string; ingredients:string };
type Ingredient = { id:string; name:string; unit:string; quantity:number; min:number; price:number };
type Venue = { id:string; name:string; city:string; currency:string };

const seedRecipes: Recipe[] = [
  {id:'margarita',name:'Margarita',category:'Classic',cost:1.82,price:9.5,stock:'OK',ingredients:'Tequila · Triple sec · Lima'},
  {id:'mojito',name:'Mojito',category:'Classic',cost:1.46,price:9,stock:'OK',ingredients:'Ron · Lima · Hierbabuena · Soda'},
  {id:'negroni',name:'Negroni',category:'Classic',cost:2.35,price:11,stock:'Bajo',ingredients:'Gin · Campari · Vermut rojo'},
  {id:'daiquiri',name:'Daiquiri',category:'Sour',cost:1.31,price:8.5,stock:'OK',ingredients:'Ron · Lima · Azúcar'}
];
const seedIngredients: Ingredient[] = [
  {id:'campari',name:'Campari',unit:'L',quantity:.42,min:1,price:18},
  {id:'hierbabuena',name:'Hierbabuena',unit:'g',quantity:180,min:250,price:.03},
  {id:'triple-sec',name:'Triple sec',unit:'L',quantity:.7,min:1,price:16},
  {id:'tequila',name:'Tequila',unit:'L',quantity:2.4,min:1,price:22},
  {id:'ron',name:'Ron',unit:'L',quantity:3.2,min:1,price:15},
  {id:'lima',name:'Lima',unit:'ud',quantity:28,min:12,price:.55}
];
const nav = [['Resumen',LayoutDashboard],['Cócteles',GlassWater],['Ingredientes',Package],['Stock',ShoppingCart],['Carta digital',Wine],['Configuración',Settings]] as const;

export default function Home(){
  const supabase = createSupabaseBrowserClient();
  const [active,setActive] = useState('Resumen');
  const [query,setQuery] = useState('');
  const [recipes,setRecipes] = useState<Recipe[]>([]);
  const [ingredients,setIngredients] = useState<Ingredient[]>([]);
  const [venue,setVenue] = useState<Venue|null>(null);
  const [userName,setUserName] = useState('Mi cuenta');
  const [userEmail,setUserEmail] = useState('');
  const [modal,setModal] = useState<'recipe'|'ingredient'|'import'|null>(null);
  const [editing,setEditing] = useState<Recipe|null>(null);
  const [loading,setLoading] = useState(true);
  const [toast,setToast] = useState('');
  const [error,setError] = useState('');

  const notify=(s:string)=>{setToast(s);setTimeout(()=>setToast(''),2200)};

  async function loadData(){
    if(!supabase){setError('Faltan las variables de Supabase.');setLoading(false);return;}
    setLoading(true); setError('');
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user){window.location.href='/login';return;}
    setUserEmail(user.email||'');
    setUserName((user.user_metadata?.full_name as string)||user.email?.split('@')[0]||'Mi cuenta');

    let {data:venues,error:venueError}=await supabase.from('venues').select('id,name,city,currency').eq('owner_id',user.id).order('created_at',{ascending:true}).limit(1);
    if(venueError){setError(venueError.message);setLoading(false);return;}
    let current=venues?.[0] as Venue|undefined;
    if(!current){
      const {data:newVenue,error:newVenueError}=await supabase.from('venues').insert({owner_id:user.id,name:'Mi bar',city:'Madrid',currency:'EUR'}).select('id,name,city,currency').single();
      if(newVenueError){setError(newVenueError.message);setLoading(false);return;}
      current=newVenue as Venue;
    }
    setVenue(current);

    const [ingsRes,recipesRes]=await Promise.all([
      supabase.from('ingredients').select('id,name,unit,quantity,min_quantity,purchase_price').eq('venue_id',current.id).order('name'),
      supabase.from('recipes').select('id,name,category,cost,price,active,description').eq('venue_id',current.id).order('name')
    ]);
    if(ingsRes.error){setError(ingsRes.error.message);setLoading(false);return;}
    if(recipesRes.error){setError(recipesRes.error.message);setLoading(false);return;}

    let loadedIngredients:Ingredient[]=(ingsRes.data||[]).map((x:any)=>({id:x.id,name:x.name,unit:x.unit,quantity:Number(x.quantity),min:Number(x.min_quantity),price:Number(x.purchase_price)}));
    let loadedRecipes:Recipe[]=(recipesRes.data||[]).map((x:any)=>({id:x.id,name:x.name,category:x.category,cost:Number(x.cost),price:Number(x.price),stock:'OK',ingredients:x.description||''}));

    // Seed only what is actually missing. This makes the initial data load idempotent
    // and prevents React/Next.js development reloads from inserting duplicates.
    const existingIngredientNames=new Set(loadedIngredients.map(i=>i.name.trim().toLowerCase()));
    const missingIngredients=seedIngredients.filter(i=>!existingIngredientNames.has(i.name.trim().toLowerCase()));
    if(missingIngredients.length){
      const ingredientRows=missingIngredients.map(i=>({venue_id:current!.id,name:i.name,unit:i.unit,quantity:i.quantity,min_quantity:i.min,purchase_price:i.price}));
      const {data:newIngredients,error:seedIError}=await supabase.from('ingredients').insert(ingredientRows).select('id,name,unit,quantity,min_quantity,purchase_price');
      if(seedIError){setError(seedIError.message);setLoading(false);return;}
      loadedIngredients=[...loadedIngredients,...(newIngredients||[]).map((x:any)=>({id:x.id,name:x.name,unit:x.unit,quantity:Number(x.quantity),min:Number(x.min_quantity),price:Number(x.purchase_price)}))];
    }

    const existingRecipeNames=new Set(loadedRecipes.map(r=>r.name.trim().toLowerCase()));
    const missingRecipes=seedRecipes.filter(r=>!existingRecipeNames.has(r.name.trim().toLowerCase()));
    if(missingRecipes.length){
      const recipeRows=missingRecipes.map(r=>({venue_id:current!.id,name:r.name,category:r.category,cost:r.cost,price:r.price,active:true,description:r.ingredients}));
      const {data:newRecipes,error:seedRError}=await supabase.from('recipes').insert(recipeRows).select('id,name,category,cost,price,active,description');
      if(seedRError){setError(seedRError.message);setLoading(false);return;}
      loadedRecipes=[...loadedRecipes,...(newRecipes||[]).map((x:any)=>({id:x.id,name:x.name,category:x.category,cost:Number(x.cost),price:Number(x.price),stock:'OK',ingredients:x.description||''}))];
    }

    setIngredients(loadedIngredients);
    setRecipes(loadedRecipes);
    setLoading(false);
  }

  useEffect(()=>{loadData();},[]);

  const saveIngredient=async(next:Ingredient[])=>{
    if(!supabase||!venue)return;
    const changed=next.find(n=>{const old=ingredients.find(i=>i.id===n.id);return old&&JSON.stringify(old)!==JSON.stringify(n)});
    const added=next.find(n=>!ingredients.some(i=>i.id===n.id));
    if(changed){const {error:e}=await supabase.from('ingredients').update({name:changed.name,unit:changed.unit,quantity:changed.quantity,min_quantity:changed.min,purchase_price:changed.price}).eq('id',changed.id).eq('venue_id',venue.id);if(e){notify('No se pudo guardar el stock');return;}}
    if(added){const {data,e}=await supabase.from('ingredients').insert({venue_id:venue.id,name:added.name,unit:added.unit,quantity:added.quantity,min_quantity:added.min,purchase_price:added.price}).select('id,name,unit,quantity,min_quantity,purchase_price').single();if(e){notify('No se pudo añadir');return;} if(data){const saved={id:data.id,name:data.name,unit:data.unit,quantity:Number(data.quantity),min:Number(data.min_quantity),price:Number(data.purchase_price)};setIngredients(next.map(x=>x.id===added.id?saved:x));return;}}
    setIngredients(next);
  };

  const saveRecipe=async(recipe:Recipe)=>{
    if(!supabase||!venue)return;
    const payload={name:recipe.name,category:recipe.category,cost:recipe.cost,price:recipe.price,active:true,description:recipe.ingredients};
    const isExisting=recipes.some(r=>r.id===recipe.id);
    const result=isExisting?await supabase.from('recipes').update(payload).eq('id',recipe.id).eq('venue_id',venue.id).select('id,name,category,cost,price,active,description').single():await supabase.from('recipes').insert({...payload,venue_id:venue.id}).select('id,name,category,cost,price,active,description').single();
    if(result.error){notify('No se pudo guardar el cóctel');return;}
    const x:any=result.data;
    const saved:Recipe={id:x.id,name:x.name,category:x.category,cost:Number(x.cost),price:Number(x.price),stock:recipe.stock,ingredients:x.description||''};
    setRecipes(isExisting?recipes.map(r=>r.id===saved.id?saved:r):[...recipes,saved]);
    setModal(null);notify('Cóctel guardado');
  };

  const addImported=async(recipe:Recipe)=>{await saveRecipe(recipe);notify(`${recipe.name} importado`);};

  const logout=async()=>{if(supabase)await supabase.auth.signOut();window.location.href='/login';};
  const low=ingredients.filter(i=>i.quantity<=i.min);
  const avg=recipes.length?Math.round(recipes.reduce((a,r)=>a+(1-r.cost/r.price)*100,0)/recipes.length):0;
  const filtered=useMemo(()=>recipes.filter(r=>`${r.name} ${r.ingredients}`.toLowerCase().includes(query.toLowerCase())),[recipes,query]);
  const openNew=()=>{setEditing(null);setModal('recipe')};
  const initials=(userName||'MC').split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();

  if(loading)return <div className="loading-screen"><div><div className="brand-mark">B</div><h1>BAROS</h1><p>Cargando tu espacio...</p></div></div>;

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">B</div><div><strong>BAROS</strong><span>cocktail OS</span></div></div>
      <div className="venue"><div className="venue-avatar">{(venue?.name||'MB').slice(0,2).toUpperCase()}</div><div><b>{venue?.name||'Mi bar'}</b><span>{venue?.city||'Madrid'} · Local 01</span></div><ChevronRight size={15}/></div>
      <nav>{nav.map(([label,Icon])=><button key={label} className={active===label?'nav active':'nav'} onClick={()=>setActive(label)}><Icon size={18}/><span>{label}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="help"><Sparkles size={16}/><span><b>Plan Starter</b><small>12 días restantes</small></span></div><button className="user" onClick={logout}><div>{initials}</div><span><b>{userName}</b><small>{userEmail||'Cerrar sesión'}</small></span><LogOut size={14}/></button></div>
    </aside>
    <section className="content">
      <header className="topbar"><div><p className="eyebrow">BAROS · {new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase()}</p><h1>{active}</h1></div><div className="top-actions"><button className="icon-btn"><Bell size={18}/><i/></button><button className="primary" onClick={openNew}><Plus size={17}/> Nuevo cóctel</button></div></header>
      {error&&<div className="error-banner">{error}</div>}
      {active==='Resumen'&&<>
        <div className="hero"><div><span className="pill"><Sparkles size={14}/> BAROS INTELLIGENCE</span><h2>Tu carta, tus costes,<br/><em>bajo control.</em></h2><p>Gestiona recetas y stock. Descubre qué cócteles puedes preparar con lo que tienes.</p><div className="hero-actions"><button className="dark" onClick={()=>setActive('Cócteles')}><Search size={16}/> Buscar un cóctel</button><button className="ghost" onClick={()=>setModal('import')}>Importar desde TheCocktailDB <ChevronRight size={15}/></button></div></div><div className="hero-glass"><div className="liquid"/><div className="garnish"/><div className="ice i1"/><div className="ice i2"/><div className="ice i3"/></div></div>
        <div className="metrics"><Metric icon={<CircleDollarSign/>} label="Ventas estimadas" value="2.840 €" delta="+12,4%"/><Metric icon={<TrendingUp/>} label="Margen medio" value={`${avg}%`} delta="calculado en tu carta"/><Metric icon={<GlassWater/>} label="Cócteles activos" value={String(recipes.length)} delta="guardados"/><Metric icon={<Package/>} label="Stock bajo" value={String(low.length)} delta={low.length?'Revisar ahora':'Todo correcto'} warning={!!low.length}/></div>
        <section className="panel"><div className="panel-head"><div><h3>Tu carta</h3><p>Coste, precio y margen por cóctel.</p></div><div className="search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar..."/></div></div><RecipeTable rows={filtered} onEdit={r=>{setEditing(r);setModal('recipe')}}/></section>
        <div className="bottom-grid"><StockPanel ingredients={low}/><section className="panel opportunity"><span className="pill"><Sparkles size={14}/> OPORTUNIDAD</span><h3>Te faltan {low.length} ingredientes<br/>para <em>ampliar tu carta.</em></h3><p>Optimiza tu próxima compra y amplía tu carta con el stock que ya tienes.</p><button className="dark" onClick={()=>setActive('Stock')}>Ver recomendaciones <ChevronRight size={15}/></button></section></div>
      </>}
      {active==='Cócteles'&&<Cocktails recipes={recipes} query={query} setQuery={setQuery} onNew={openNew} onEdit={r=>{setEditing(r);setModal('recipe')}} onImport={()=>setModal('import')}/>} 
      {active==='Ingredientes'&&<Ingredients ingredients={ingredients} onNew={()=>setModal('ingredient')} onSave={saveIngredient}/>} 
      {active==='Stock'&&<Stock ingredients={ingredients} onSave={saveIngredient}/>} 
      {active==='Carta digital'&&<Menu recipes={recipes}/>} 
      {active==='Configuración'&&<SettingsPanel venue={venue} onSaved={v=>{setVenue(v);notify('Configuración guardada')}}/>}
      <footer>BAROS · Gestión inteligente para bares <span>Beta privada</span></footer>
    </section>
    {modal==='recipe'&&<RecipeModal initial={editing} onClose={()=>setModal(null)} onSave={saveRecipe}/>} 
    {modal==='ingredient'&&<IngredientModal onClose={()=>setModal(null)} onSave={i=>{setModal(null);saveIngredient([...ingredients,{...i,id:`new-${crypto.randomUUID()}`}]);notify('Ingrediente añadido')}}/>}
    {modal==='import'&&<ImportModal onClose={()=>setModal(null)} onImport={addImported}/>} 
    {toast&&<div className="toast">✓ {toast}</div>}
  </main>
}

function Metric({icon,label,value,delta,warning=false}:{icon:ReactNode;label:string;value:string;delta:string;warning?:boolean}){return <div className="metric"><div className="metric-icon">{icon}</div><div><span>{label}</span><b>{value}</b><small className={warning?'warn':''}>{delta}</small></div></div>}
function RecipeTable({rows,onEdit}:{rows:Recipe[];onEdit:(r:Recipe)=>void}){return <div className="table-wrap"><table><thead><tr><th>CÓCTEL</th><th>CATEGORÍA</th><th>COSTE</th><th>PRECIO</th><th>MARGEN</th><th></th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><div className="recipe-name"><span>{r.name.slice(0,1)}</span><div><b>{r.name}</b><small>{r.ingredients}</small></div></div></td><td><span className="tag">{r.category}</span></td><td>{r.cost.toFixed(2)} €</td><td><b>{r.price.toFixed(2)} €</b></td><td><span className="margin">{Math.round((1-r.cost/r.price)*100)}%</span></td><td><button className="row-action" onClick={()=>onEdit(r)}>Editar</button></td></tr>)}</tbody></table></div>}

function Cocktails({recipes,query,setQuery,onNew,onEdit,onImport}:{recipes:Recipe[];query:string;setQuery:(s:string)=>void;onNew:()=>void;onEdit:(r:Recipe)=>void;onImport:()=>void}){const rows=recipes.filter(r=>`${r.name} ${r.ingredients}`.toLowerCase().includes(query.toLowerCase()));return <section className="page"><div className="page-head"><div><h2>Gestiona tu carta</h2><p>Crea, edita e importa recetas.</p></div><div className="actions"><button className="ghost" onClick={onImport}>Importar</button><button className="dark" onClick={onNew}><Plus size={16}/> Nuevo cóctel</button></div></div><div className="search large"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar cócteles..."/></div><RecipeTable rows={rows} onEdit={onEdit}/></section>}

function Ingredients({ingredients,onNew,onSave}:{ingredients:Ingredient[];onNew:()=>void;onSave:(x:Ingredient[])=>void}){return <section className="page"><div className="page-head"><div><h2>Ingredientes</h2><p>Costes y cantidades disponibles.</p></div><button className="dark" onClick={onNew}><Plus size={16}/> Nuevo ingrediente</button></div><div className="panel"><div className="table-wrap"><table><thead><tr><th>INGREDIENTE</th><th>UNIDAD</th><th>CANTIDAD</th><th>MÍNIMO</th><th>PRECIO COMPRA</th><th>ESTADO</th></tr></thead><tbody>{ingredients.map(i=><tr key={i.id}><td><b>{i.name}</b></td><td>{i.unit}</td><td><input className="cell-input" type="number" value={i.quantity} onChange={e=>onSave(ingredients.map(x=>x.id===i.id?{...x,quantity:Number(e.target.value)}:x))}/></td><td>{i.min}</td><td>{i.price.toFixed(2)} €</td><td><span className={i.quantity<=i.min?'status low':'status'}>{i.quantity<=i.min?'Stock bajo':'OK'}</span></td></tr>)}</tbody></table></div></div></section>}

function Stock({ingredients,onSave}:{ingredients:Ingredient[];onSave:(x:Ingredient[])=>void}){return <section className="page"><div className="page-head"><div><h2>Control de stock</h2><p>Actualiza existencias y detecta faltas antes del servicio.</p></div></div><div className="stock-grid">{ingredients.map(i=><div className="stock-card" key={i.id}><div><span>{i.name}</span><b>{i.quantity} {i.unit}</b></div><div className={i.quantity<=i.min?'stock-bar low':'stock-bar'}><i style={{width:`${Math.min(100,Math.max(4,(i.quantity/Math.max(i.min,0.001))*100))}%`}}/></div><div className="stock-actions"><button onClick={()=>onSave(ingredients.map(x=>x.id===i.id?{...x,quantity:Math.max(0,x.quantity-1)}:x))}>−</button><button onClick={()=>onSave(ingredients.map(x=>x.id===i.id?{...x,quantity:x.quantity+1}:x))}>+</button></div></div>)}</div></section>}

function StockPanel({ingredients}:{ingredients:Ingredient[]}){return <section className="panel stock-panel"><div className="panel-head"><div><h3>Stock a revisar</h3><p>Ingredientes por debajo del mínimo.</p></div><Package size={20}/></div>{ingredients.length?<div className="mini-list">{ingredients.slice(0,4).map(i=><div key={i.id}><span>{i.name}</span><b>{i.quantity} {i.unit}</b></div>)}</div>:<div className="empty">Todo el stock está en niveles correctos.</div>}</section>}

function Menu({recipes}:{recipes:Recipe[]}){return <section className="page"><div className="page-head"><div><h2>Carta digital</h2><p>Una carta pública sencilla para compartir con tus clientes.</p></div></div><div className="menu-preview"><div className="menu-brand">BAROS <span>COCKTAILS</span></div>{recipes.map(r=><article key={r.id}><div><span>{r.category}</span><h3>{r.name}</h3><p>{r.ingredients||'Receta disponible en BAROS'}</p></div><b>{r.price.toFixed(2)} €</b></article>)}</div></section>}

function SettingsPanel({venue,onSaved}:{venue:Venue|null;onSaved:(v:Venue)=>void}){const [name,setName]=useState(venue?.name||'');const [city,setCity]=useState(venue?.city||'');const [currency,setCurrency]=useState(venue?.currency||'EUR');const supabase=createSupabaseBrowserClient();return <section className="page"><div className="page-head"><div><h2>Configuración</h2><p>Datos del local.</p></div></div><div className="settings-card"><label>Nombre del local<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Ciudad<input value={city} onChange={e=>setCity(e.target.value)}/></label><label>Moneda<select value={currency} onChange={e=>setCurrency(e.target.value)}><option value="EUR">EUR · €</option><option value="GBP">GBP · £</option><option value="USD">USD · $</option></select></label><button className="dark" onClick={async()=>{if(!supabase||!venue)return;const {data,error}=await supabase.from('venues').update({name,city,currency}).eq('id',venue.id).select('id,name,city,currency').single();if(error)return;if(data)onSaved(data as Venue)}}><Save size={16}/> Guardar cambios</button></div></section>}

function RecipeModal({initial,onClose,onSave}:{initial:Recipe|null;onClose:()=>void;onSave:(r:Recipe)=>void}){const [name,setName]=useState(initial?.name||'');const [category,setCategory]=useState(initial?.category||'Classic');const [cost,setCost]=useState(String(initial?.cost??''));const [price,setPrice]=useState(String(initial?.price??''));const [ingredients,setIngredients]=useState(initial?.ingredients||'');return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><div><span className="eyebrow">RECETA</span><h2>{initial?'Editar cóctel':'Nuevo cóctel'}</h2></div><button onClick={onClose}><X size={18}/></button></div><div className="form-grid"><label>Nombre<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Margarita"/></label><label>Categoría<select value={category} onChange={e=>setCategory(e.target.value)}><option>Classic</option><option>Sour</option><option>Highball</option><option>Signature</option><option>Tiki</option></select></label><label>Coste<input type="number" step="0.01" value={cost} onChange={e=>setCost(e.target.value)}/></label><label>Precio venta<input type="number" step="0.01" value={price} onChange={e=>setPrice(e.target.value)}/></label><label className="full">Ingredientes<input value={ingredients} onChange={e=>setIngredients(e.target.value)} placeholder="Tequila · Lima · Triple sec"/></label></div><div className="modal-actions"><button className="ghost" onClick={onClose}>Cancelar</button><button className="dark" onClick={()=>{if(!name.trim())return;onSave({id:initial?.id||`new-${crypto.randomUUID()}`,name:name.trim(),category,cost:Number(cost)||0,price:Number(price)||0,stock:initial?.stock||'OK',ingredients})}}><Save size={16}/> Guardar</button></div></div></div>}

function IngredientModal({onClose,onSave}:{onClose:()=>void;onSave:(i:Omit<Ingredient,'id'>)=>void}){const [name,setName]=useState('');const [unit,setUnit]=useState('L');const [quantity,setQuantity]=useState('0');const [min,setMin]=useState('0');const [price,setPrice]=useState('0');return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><div><span className="eyebrow">STOCK</span><h2>Nuevo ingrediente</h2></div><button onClick={onClose}><X size={18}/></button></div><div className="form-grid"><label>Nombre<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Gin"/></label><label>Unidad<select value={unit} onChange={e=>setUnit(e.target.value)}><option>L</option><option>ml</option><option>g</option><option>ud</option><option>kg</option></select></label><label>Cantidad<input type="number" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label><label>Mínimo<input type="number" value={min} onChange={e=>setMin(e.target.value)}/></label><label>Precio compra<input type="number" step="0.01" value={price} onChange={e=>setPrice(e.target.value)}/></label></div><div className="modal-actions"><button className="ghost" onClick={onClose}>Cancelar</button><button className="dark" onClick={()=>{if(!name.trim())return;onSave({name:name.trim(),unit,quantity:Number(quantity)||0,min:Number(min)||0,price:Number(price)||0})}}><Save size={16}/> Añadir</button></div></div></div>}

function ImportModal({onClose,onImport}:{onClose:()=>void;onImport:(r:Recipe)=>void}){const [term,setTerm]=useState('margarita');const [results,setResults]=useState<any[]>([]);const [busy,setBusy]=useState(false);const search=async()=>{setBusy(true);try{const res=await fetch(`/api/cocktails?query=${encodeURIComponent(term)}`);const data=await res.json();setResults(data.drinks||[])}finally{setBusy(false)}};useEffect(()=>{search()},[]);return <div className="modal-backdrop"><div className="modal wide"><div className="modal-head"><div><span className="eyebrow">THECOCKTAILDB</span><h2>Importar cóctel</h2></div><button onClick={onClose}><X size={18}/></button></div><div className="search large"><Search size={16}/><input value={term} onChange={e=>setTerm(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="Buscar en TheCocktailDB..."/><button className="dark" onClick={search}>Buscar</button></div><div className="import-results">{busy?<p>Buscando...</p>:results.map(d=><button key={d.idDrink} className="import-item" onClick={()=>{onImport({id:`import-${d.idDrink}-${crypto.randomUUID()}`,name:d.strDrink,category:d.strCategory||'Classic',cost:0,price:0,stock:'OK',ingredients:[d.strIngredient1,d.strIngredient2,d.strIngredient3,d.strIngredient4,d.strIngredient5].filter(Boolean).join(' · ')})}}><span>{d.strDrink}</span><small>{d.strCategory||'Cocktail'}</small><ChevronRight size={15}/></button>)}</div></div></div>}
