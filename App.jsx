import React,{useEffect,useMemo,useState} from 'react';
import {supabase} from './supabase';

const money=n=>`Rs. ${Number(n||0).toLocaleString('en-PK')}`;
const sizes=['S','M','L','XL'];
const emptyCustomer={name:'',phone:'',alternate_phone:'',email:'',city:'',area:'',address:'',instructions:''};

export default function App(){
 const [lang,setLang]=useState('en'),[products,setProducts]=useState([]),[variants,setVariants]=useState([]),
 [cart,setCart]=useState([]),[page,setPage]=useState('shop'),[loading,setLoading]=useState(true),
 [message,setMessage]=useState(''),[customer,setCustomer]=useState(emptyCustomer),[payment,setPayment]=useState('cod'),
 [admin,setAdmin]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),
 [orders,setOrders]=useState([]),[stockEdits,setStockEdits]=useState({});
 const t=(en,ur)=>lang==='ur'?ur:en;
 async function load(){
  if(!supabase){setLoading(false);return}
  setLoading(true);
  const [{data:p,error:pe},{data:v,error:ve}]=await Promise.all([
   supabase.from('products').select('*').eq('active',true).order('sort_order'),
   supabase.from('product_variants').select('*').eq('active',true)
  ]);
  if(pe||ve)setMessage(pe?.message||ve?.message||'Could not load products');
  setProducts(p||[]);setVariants(v||[]);setLoading(false);
 }
 useEffect(()=>{load(); if(supabase){supabase.auth.getSession().then(({data})=>setAdmin(!!data.session)); const {data:sub}=supabase.auth.onAuthStateChange((_e,s)=>setAdmin(!!s));return()=>sub.subscription.unsubscribe()}},[]);
 const cartCount=cart.reduce((a,x)=>a+x.qty,0);
 const subtotal=cart.reduce((a,x)=>a+x.price*x.qty,0);
 const discount=subtotal>0?subtotal*.5:0;
 const delivery=subtotal-discount>=5000?0:(subtotal?350:0);
 const total=subtotal-discount+delivery;
 function add(p,size){
  const variant=variants.find(v=>v.product_id===p.id&&v.size===size);
  if(!variant||variant.stock_qty===null){setMessage(t('Stock is not configured for this size yet.','اس سائز کا اسٹاک ابھی درج نہیں کیا گیا۔'));return}
  const key=p.id+size,old=cart.find(x=>x.key===key);
  if(old&&old.qty>=variant.stock_qty){setMessage(t('Available stock limit reached.','دستیاب اسٹاک کی حد پوری ہو گئی ہے۔'));return}
  setCart(old?cart.map(x=>x.key===key?{...x,qty:x.qty+1}:x):[...cart,{key,product_id:p.id,sku:p.sku,name:p.name_en,color:p.color_name,size,qty:1,price:Number(p.original_price)}]);
  setMessage('');
 }
 async function checkout(e){
  e.preventDefault(); if(!supabase)return;
  if(!cart.length)return;
  const key=crypto.randomUUID();
  const {data,error}=await supabase.rpc('place_wc_order',{p_customer:customer,p_items:cart.map(x=>({product_id:x.product_id,size:x.size,qty:x.qty})),p_payment_method:payment,p_idempotency_key:key,p_coupon_code:null});
  if(error){setMessage(error.message);return}
  setMessage(`${t('Order placed:','آرڈر مکمل ہوگیا:')} ${data.order_number} — ${money(data.total)}`);
  setCart([]);setCustomer(emptyCustomer);setPage('shop');load();
 }
 async function signIn(e){e.preventDefault();const {error}=await supabase.auth.signInWithPassword({email,password});setMessage(error?.message||'Signed in');if(!error){setAdmin(true);setPage('admin')}}
 async function loadOrders(){const {data,error}=await supabase.from('orders').select('*').order('created_at',{ascending:false}).limit(100);if(error)setMessage(error.message);else setOrders(data||[])}
 async function saveStock(id){
  const value=stockEdits[id];if(value===''||value===undefined||!Number.isInteger(Number(value))||Number(value)<0){setMessage('Enter a valid stock quantity');return}
  const {error}=await supabase.from('product_variants').update({stock_qty:Number(value)}).eq('id',id);
  setMessage(error?.message||'Stock updated');if(!error)load();
 }
 async function uploadImage(productId,file){
  if(!file)return;const ext=file.name.split('.').pop().toLowerCase();if(!['jpg','jpeg','png','webp'].includes(ext)){setMessage('Use JPG, PNG or WebP');return}
  const path=`${productId}/${Date.now()}.${ext}`;
  const {error}=await supabase.storage.from('product-images').upload(path,file,{upsert:false,contentType:file.type});
  if(error){setMessage(error.message);return}
  const {data}=supabase.storage.from('product-images').getPublicUrl(path);
  const p=products.find(x=>x.id===productId),urls=[...(p.image_urls||[]),data.publicUrl];
  const {error:ue}=await supabase.from('products').update({image_urls:urls}).eq('id',productId);
  setMessage(ue?.message||'Image uploaded');if(!ue)load();
 }
 async function updateStatus(id,status){
  const order=orders.find(o=>o.id===id);
  const {error}=await supabase.from('orders').update({status,updated_at:new Date().toISOString()}).eq('id',id);
  if(error){setMessage(error.message);return}
  await supabase.from('order_status_history').insert({order_id:id,old_status:order?.status||null,new_status:status,note:'Updated by admin'});
  loadOrders();setMessage('Order status updated');
 }
 const configured=!!supabase;
 return <div className="app" dir={lang==='ur'?'rtl':'ltr'}>
  <header><div className="brand"><span className="mark">WC</span><div><b>WEATHER COLLECTIONS</b><small>{t('STITCHED • EVERYDAY ELEGANCE','سِلے ہوئے ملبوسات • نفیس انداز')}</small></div></div>
   <nav><button onClick={()=>setPage('shop')}>{t('Shop','خریداری')}</button><button onClick={()=>setPage('cart')}>{t('Cart','کارٹ')} ({cartCount})</button><button onClick={()=>{setPage('login')}}>{t('Admin','ایڈمن')}</button><button className="lang" onClick={()=>setLang(lang==='en'?'ur':'en')}>{lang==='en'?'اردو':'English'}</button></nav>
  </header>
  {!configured&&<div className="notice">Setup required: add your Supabase URL and publishable/anon key in the Cloudflare environment variables before deployment.</div>}
  {message&&<div className="message"><span>{message}</span><button onClick={()=>setMessage('')}>×</button></div>}
  {page==='shop'&&<main><section className="hero"><div><span className="eyebrow">WEATHER COLLECTIONS</span><h1>{t('Style that feels like you.','آپ کے انداز کی خوبصورتی۔')}</h1><p>{t('Discover our stitched collection in elegant colours and comfortable sizes.','خوبصورت رنگوں اور آرام دہ سائز میں ہمارا سِلا ہوا کلیکشن دیکھیے۔')}</p><button className="primary" onClick={()=>document.getElementById('catalog')?.scrollIntoView({behavior:'smooth'})}>{t('Explore collection','کلیکشن دیکھیں')}</button></div><div className="hero-art"><span>WC</span></div></section>
   <section id="catalog"><div className="section-head"><div><span className="eyebrow">THE COLLECTION</span><h2>{t('Shop by design','اپنا ڈیزائن منتخب کریں')}</h2></div><p>{t('50% launch offer on listed designs','منتخب ڈیزائنز پر 50% رعایت')}</p></div>
   {loading?<p>{t('Loading collection…','کلیکشن لوڈ ہو رہا ہے…')}</p>:!products.length?<p>{t('Products will appear here once available.','پروڈکٹس دستیاب ہونے پر یہاں نظر آئیں گے۔')}</p>:
   <div className="grid">{products.map(p=><ProductCard key={p.id} p={p} variants={variants} add={add} t={t}/>)}</div>}</section>
   <section className="delivery"><b>{t('Complimentary delivery on orders of Rs. 5,000 or more','5,000 روپے یا اس سے زیادہ کے آرڈر پر مفت ڈیلیوری')}</b><span>{t('Rs. 350 delivery below Rs. 5,000','5,000 روپے سے کم آرڈر پر 350 روپے ڈیلیوری')}</span></section>
  </main>}
  {page==='cart'&&<main className="narrow"><h1>{t('Your cart','آپ کا کارٹ')}</h1>{!cart.length?<p>{t('Your cart is empty.','آپ کا کارٹ خالی ہے۔')}</p>:<><div className="cart-list">{cart.map(x=><div className="cart-row" key={x.key}><div><b>{x.name} · {x.color}</b><small>{x.sku} / {x.size}</small></div><div>{money(x.price)} × {x.qty}</div><button onClick={()=>setCart(cart.filter(y=>y.key!==x.key))}>Remove</button></div>)}</div><div className="totals"><p>Subtotal <b>{money(subtotal)}</b></p><p>50% offer <b>−{money(discount)}</b></p><p>Delivery <b>{delivery?money(delivery):'Free'}</b></p><h2>Total <b>{money(total)}</b></h2></div>
  <h2>{t('Delivery details','ڈیلیوری کی تفصیلات')}</h2><form onSubmit={checkout} className="form-grid">{[['name','Full name *'],['phone','Contact number *'],['alternate_phone','Alternate number'],['email','Email'],['city','City *'],['area','Area / locality *'],['address','Complete delivery address *'],['instructions','Delivery instructions']].map(([k,label])=><label key={k}>{label}<input required={['name','phone','city','area','address'].includes(k)} value={customer[k]} onChange={e=>setCustomer({...customer,[k]:e.target.value})}/></label>)}<label>Payment method<select value={payment} onChange={e=>setPayment(e.target.value)}><option value="cod">Cash on Delivery</option><option value="advance">Advance Payment</option></select></label><button className="primary" type="submit">{t('Place order','آرڈر مکمل کریں')}</button></form></>}</main>}
  {page==='login'&&<main className="narrow"><h1>Admin login</h1><form className="login" onSubmit={signIn}><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="primary">Sign in</button></form></main>}
  {page==='admin'&&<main><div className="section-head"><div><span className="eyebrow">CONTROL PANEL</span><h1>Admin Dashboard</h1></div><button onClick={async()=>{await supabase.auth.signOut();setAdmin(false);setPage('shop')}}>Sign out</button></div>
   {!admin?<p>Please sign in using your authorised admin account.</p>:<><div className="admin-tabs"><button onClick={load}>Products & stock</button><button onClick={loadOrders}>Orders</button></div>
   <h2>Products & stock</h2><div className="admin-list">{products.map(p=><div className="admin-product" key={p.id}><b>{p.sku} — {p.color_name}</b><span>{money(p.original_price)} list price · 50% displayed offer</span><label>Upload product image <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>uploadImage(p.id,e.target.files?.[0])}/></label><div className="stock-grid">{variants.filter(v=>v.product_id===p.id).map(v=><label key={v.id}>{v.size}<input type="number" min="0" placeholder={v.stock_qty===null?'Not set':String(v.stock_qty)} value={stockEdits[v.id]??''} onChange={e=>setStockEdits({...stockEdits,[v.id]:e.target.value})}/><button onClick={()=>saveStock(v.id)}>Save</button></label>)}</div></div>)}</div>
   <h2>Recent orders</h2>{orders.map(o=><div className="order" key={o.id}><b>{o.order_number}</b><span>{money(o.total)} · {o.status}</span><select value={o.status} onChange={e=>updateStatus(o.id,e.target.value)}>{['pending','confirmed','processing','shipped','delivered','cancelled'].map(s=><option key={s}>{s}</option>)}</select></div>)}</>}
  </main>}
  <footer><b>WEATHER COLLECTIONS</b><p>WhatsApp: +92 339 9901239 · weathercollectionsofficial@gmail.com</p><small>© {new Date().getFullYear()} Weather Collections</small></footer>
 </div>
}
function ProductCard({p,variants,add,t}){
 const [size,setSize]=useState('M'),[image,setImage]=useState(0);
 const stock=variants.find(v=>v.product_id===p.id&&v.size===size);
 const urls=Array.isArray(p.image_urls)?p.image_urls:[];
 const sale=Number(p.original_price)*.5;
 return <article className="product"><div className="product-image">{urls[image]?<img src={urls[image]} alt={`${p.name_en} ${p.color_name}`}/>:<div className="placeholder"><span>WEATHER<br/>COLLECTIONS</span><b>{p.color_name}</b></div>}<span className="sale">50% OFF</span>{urls.length>1&&<button className="next-image" onClick={()=>setImage((image+1)%urls.length)}>›</button>}</div><div className="product-info"><small>{p.sku} · {p.design_code}</small><h3>{p.name_en}</h3><p>{p.color_name}</p><div className="price"><b>{money(sale)}</b><del>{money(p.original_price)}</del></div><div className="buy-row"><select value={size} onChange={e=>setSize(e.target.value)}>{sizes.map(s=><option key={s}>{s}</option>)}</select><button className="primary" disabled={!stock||stock.stock_qty===null||stock.stock_qty<1} onClick={()=>add(p,size)}>{stock?.stock_qty>0?t('Add to cart','کارٹ میں شامل کریں'):t('Out of stock','اسٹاک درج نہیں')}</button></div></div></article>
}