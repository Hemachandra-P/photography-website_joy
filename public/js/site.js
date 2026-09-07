document.addEventListener("DOMContentLoaded",()=>{
  const prefersReduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Soft reveal motion for sections and gallery items.
  const reveals=document.querySelectorAll(".reveal");
  if(!prefersReduced && "IntersectionObserver" in window){
    const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");io.unobserve(e.target)}}),{threshold:.08,rootMargin:"0px 0px -40px 0px"});
    reveals.forEach(e=>io.observe(e));
  }else reveals.forEach(e=>e.classList.add("visible"));

  const mobileToggle=document.getElementById("mobile-menu-toggle");
  const mobileMenu=document.getElementById("mobile-menu");
  if(mobileToggle&&mobileMenu){
    const closeMenu=()=>{mobileMenu.classList.remove("open");mobileToggle.setAttribute("aria-expanded","false");mobileMenu.setAttribute("aria-hidden","true")};
    mobileToggle.addEventListener("click",()=>{const open=!mobileMenu.classList.contains("open");mobileMenu.classList.toggle("open",open);mobileToggle.setAttribute("aria-expanded",String(open));mobileMenu.setAttribute("aria-hidden",String(!open))});
    mobileMenu.querySelectorAll("a").forEach(a=>a.addEventListener("click",closeMenu));
  }

  const nav=document.getElementById("site-nav");
  const progress=document.getElementById("scroll-progress");
  const heroImage=document.querySelector(".hero-image[data-parallax]");
  let ticking=false,lastScroll=window.scrollY,scrollVelocity=0;
  function onScroll(){
    const max=document.documentElement.scrollHeight-window.innerHeight;
    const y=window.scrollY;
    scrollVelocity=y-lastScroll;
    lastScroll=y;

    if(progress) progress.style.width=`${max>0?(y/max)*100:0}%`;

    if(nav){
        nav.classList.toggle("scrolled",y>30);

        if(window.innerWidth<=800){
            if(scrollVelocity>0 && y>100){
                nav.classList.add("nav-hidden");
            }else if(scrollVelocity<0){
                nav.classList.remove("nav-hidden");
            }
        }else{
            nav.classList.remove("nav-hidden");
        }
    }

    if(heroImage && !prefersReduced && y < window.innerHeight*1.15)
        heroImage.style.transform=`translate3d(0,${Math.min(y*.08,55)}px,0) scale(1.04)`;

    document.documentElement.style.setProperty("--scroll-y",`${y}px`);
    document.documentElement.style.setProperty("--scroll-velocity",`${Math.max(-18,Math.min(18,scrollVelocity))}`);

    ticking=false;
}
  window.addEventListener("scroll",()=>{if(!ticking){requestAnimationFrame(onScroll);ticking=true}},{passive:true});
  onScroll();

  // V10: optimized single-canvas solar system shared by every public page.
  const solarCanvas=document.getElementById("solar-canvas");
  if(solarCanvas){
    const ctx=solarCanvas.getContext("2d",{alpha:true});
    let w=0,h=0,dpr=1,stars=[],mouseX=.5,mouseY=.5,scrollY=window.scrollY,targetScroll=scrollY,raf=0,lastFrame=0;
    const reduced=prefersReduced;
    const colors=[[220,240,255],[240,232,210],[190,220,210],[160,190,255]];
    const makeStar=()=>({x:Math.random(),y:Math.random(),z:.2+Math.random()*.8,r:.35+Math.random()*.9,tw:Math.random()*Math.PI*2,ts:.0015+Math.random()*.006,c:colors[(Math.random()*colors.length)|0]});
    const planets=[
      {a:.07,b:.035,r:2.6,c1:"#b9b3aa",c2:"#4b4742",speed:.0032,phase:.4},
      {a:.11,b:.055,r:4,c1:"#e7b76d",c2:"#765034",speed:.00235,phase:1.7},
      {a:.155,b:.075,r:4.7,c1:"#63a9d8",c2:"#183e6b",speed:.0018,phase:3.1},
      {a:.20,b:.095,r:3.8,c1:"#d46b4d",c2:"#6e281f",speed:.00145,phase:4.2},
      {a:.29,b:.14,r:9,c1:"#dfbf96",c2:"#71533e",speed:.0009,phase:5.1},
      {a:.39,b:.19,r:8,c1:"#d9c68f",c2:"#756a4b",speed:.00062,phase:2.1,ring:true},
      {a:.49,b:.24,r:6,c1:"#8ad7dd",c2:"#2b6d78",speed:.00045,phase:4.8},
      {a:.58,b:.28,r:5.8,c1:"#587edb",c2:"#182a68",speed:.00034,phase:.8}
    ];
    function resize(){
      dpr=Math.min(window.devicePixelRatio||1,1.5); w=window.innerWidth; h=window.innerHeight;
      solarCanvas.width=Math.round(w*dpr); solarCanvas.height=Math.round(h*dpr); solarCanvas.style.width=w+"px"; solarCanvas.style.height=h+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0);
      const count=w<600?55:Math.min(125,Math.max(75,Math.floor(w*h/14500)));
      stars=Array.from({length:count},makeStar);
      draw(performance.now(),true);
    }
    function draw(t,force=false){
      if(!force && t-lastFrame<33)return; // cap decorative animation near 30fps
      lastFrame=t; targetScroll=window.scrollY; scrollY+=(targetScroll-scrollY)*.055;
      ctx.clearRect(0,0,w,h);
      const drift=scrollY*.00042;
      for(const st of stars){
        st.tw+=st.ts*2;
        let x=(st.x+Math.sin(t*.00003+st.tw)*.012*st.z+(mouseX-.5)*.012*st.z+drift*st.z*3)%1;
        let y=(st.y+(mouseY-.5)*.008*st.z-drift*st.z)%1;
        if(x<0)x+=1;if(y<0)y+=1;
        const px=x*w,py=y*h,alpha=.11+st.z*.28*(.7+.3*Math.sin(st.tw));
        const rgb=st.c.join(",");ctx.beginPath();ctx.fillStyle=`rgba(${rgb},${alpha})`;ctx.arc(px,py,st.r*st.z,0,Math.PI*2);ctx.fill();
      }
      const cx=w*.72+(mouseX-.5)*18, cy=h*.52+(mouseY-.5)*12, scale=Math.min(w,h), orbitScroll=scrollY*.0011;
      const sunR=Math.max(12,scale*.026);
      const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,sunR*7);glow.addColorStop(0,"rgba(255,224,150,.22)");glow.addColorStop(.35,"rgba(255,170,70,.08)");glow.addColorStop(1,"rgba(255,120,40,0)");ctx.fillStyle=glow;ctx.beginPath();ctx.arc(cx,cy,sunR*7,0,Math.PI*2);ctx.fill();
      planets.forEach((p,i)=>{
        const rx=scale*p.a,ry=scale*p.b;ctx.save();ctx.strokeStyle=`rgba(255,255,255,${i<4?.075:.045})`;ctx.lineWidth=.7;ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);ctx.stroke();ctx.restore();
        const ang=p.phase+t*p.speed+orbitScroll*(1.1-i*.07),x=cx+Math.cos(ang)*rx,y=cy+Math.sin(ang)*ry,r=p.r*(.76+Math.min(w,1800)/2400);
        const grad=ctx.createRadialGradient(x-r*.35,y-r*.4,r*.12,x,y,r);grad.addColorStop(0,p.c1);grad.addColorStop(.55,p.c2);grad.addColorStop(1,"rgba(0,0,0,.92)");ctx.fillStyle=grad;ctx.shadowBlur=r*1.8;ctx.shadowColor=p.c1;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        if(p.ring){ctx.save();ctx.translate(x,y);ctx.rotate(-.28);ctx.strokeStyle="rgba(224,205,153,.5)";ctx.lineWidth=Math.max(1,r*.2);ctx.beginPath();ctx.ellipse(0,0,r*1.8,r*.55,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
      });
      const sun=ctx.createRadialGradient(cx-sunR*.3,cy-sunR*.3,sunR*.08,cx,cy,sunR);sun.addColorStop(0,"#fff4bd");sun.addColorStop(.45,"#ffb347");sun.addColorStop(1,"#9d4c1c");ctx.fillStyle=sun;ctx.shadowBlur=sunR*2.8;ctx.shadowColor="#ffad3d";ctx.beginPath();ctx.arc(cx,cy,sunR,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    }
    function frame(t){draw(t);raf=requestAnimationFrame(frame)}
    resize();
    if(!reduced){window.addEventListener("resize",resize,{passive:true});window.addEventListener("mousemove",e=>{mouseX=e.clientX/w;mouseY=e.clientY/h},{passive:true});raf=requestAnimationFrame(frame);window.addEventListener("pagehide",()=>cancelAnimationFrame(raf),{once:true});}
  }

  // Inline welcome type-on: it sits at the top of the hero instead of a separate intro page.
  const heroTyping=document.getElementById("hero-typing");
  if(heroTyping && !prefersReduced){
    const text="Welcome to Joy Photography";
    let i=0;
    const type=()=>{heroTyping.textContent=text.slice(0,i++);if(i<=text.length)window.setTimeout(type,48)};
    window.setTimeout(type,180);
  } else if(heroTyping){heroTyping.textContent="Welcome to Joy Photography";}

  const photos=[...document.querySelectorAll(".photo")];
  const collectionFilters=[...document.querySelectorAll("[data-filter]")];
  const formatFilters=[...document.querySelectorAll("[data-format]")];
  const showMore=document.getElementById("show-more");
  const status=document.getElementById("gallery-status");
  const PAGE_SIZE=18;
  let shown=PAGE_SIZE,activeCollection="all",activeFormat="all";
  function matches(p){
    const category=(p.dataset.category||"").trim().toLowerCase();
    const format=(p.dataset.format||"").trim().toLowerCase();
    return (activeCollection==="all"||category===activeCollection.trim().toLowerCase()) && (activeFormat==="all"||format===activeFormat.trim().toLowerCase());
  }
  function refreshGallery(reset=true){
    if(reset) shown=PAGE_SIZE;
    const list=photos.filter(matches);
    photos.forEach(p=>{const match=matches(p),idx=list.indexOf(p);p.classList.toggle("is-hidden",!match);p.classList.toggle("load-hidden",match&&idx>=shown)});
    const remaining=Math.max(0,list.length-shown);
    if(showMore){showMore.style.display=remaining>0?"inline-flex":"none";showMore.querySelector("span").textContent=remaining?`+${Math.min(PAGE_SIZE,remaining)}`:""}
    if(status) status.textContent=list.length===0?"No photographs in this view.":`Showing ${Math.min(shown,list.length)} of ${list.length}`;
  }
  collectionFilters.forEach(btn=>btn.addEventListener("click",()=>{collectionFilters.forEach(b=>b.classList.remove("active"));btn.classList.add("active");activeCollection=btn.dataset.filter;refreshGallery()}));
  formatFilters.forEach(btn=>btn.addEventListener("click",()=>{formatFilters.forEach(b=>b.classList.remove("active"));btn.classList.add("active");activeFormat=btn.dataset.format;refreshGallery()}));
  if(showMore) showMore.addEventListener("click",()=>{
    const list=photos.filter(matches);
    list.slice(shown,shown+PAGE_SIZE).forEach(p=>{const img=p.querySelector("img");if(img) img.loading="eager";});
    shown+=PAGE_SIZE;
    refreshGallery(false);
    document.querySelector(".gallery")?.classList.add("just-expanded");
  });
  refreshGallery();

  // Keep broken URLs from making the gallery look empty; the card remains visible for diagnosis.
  photos.forEach(p=>{
    const image=p.querySelector("img");
    if(image){
      image.addEventListener("error",()=>{
        p.classList.add("image-error");
        image.alt=`Unable to load ${p.dataset.title||"photograph"}`;
        image.removeAttribute("src");
      },{once:true});
    }
  });

  // Robust lightbox: delegated open/close events, explicit z-index, backdrop close,
  // Escape support and focus restoration. This avoids the fragile click-only setup.
  const lb=document.getElementById("lightbox");
  if(lb){
    const img=document.getElementById("lb-img"),title=document.getElementById("lb-title"),count=document.getElementById("lb-count");
    const closeBtn=lb.querySelector(".lb-close"),prevBtn=lb.querySelector(".lb-prev"),nextBtn=lb.querySelector(".lb-next");
    let current=0,lastTrigger=null;
    const visible=()=>photos.filter(p=>!p.classList.contains("is-hidden")&&!p.classList.contains("load-hidden"));
    function render(){const list=visible();const p=list[current];if(!p)return;img.src=p.dataset.src;img.alt=p.dataset.title||"Photography";title.textContent=p.dataset.title||"Untitled";count.textContent=`${String(current+1).padStart(2,"0")} / ${String(list.length).padStart(2,"0")}`}
    function open(p){const list=visible();const idx=list.indexOf(p);if(idx<0)return;current=idx;lastTrigger=p.querySelector(".photo-button");render();lb.classList.add("open");document.body.classList.add("lb-open");lb.setAttribute("aria-hidden","false");requestAnimationFrame(()=>closeBtn?.focus())}
    function close(){lb.classList.remove("open");document.body.classList.remove("lb-open");lb.setAttribute("aria-hidden","true");img.removeAttribute("src");if(lastTrigger)requestAnimationFrame(()=>lastTrigger.focus())}
    function move(n){const list=visible();if(!list.length)return;current=(current+n+list.length)%list.length;render()}
    photos.forEach(p=>p.querySelector(".photo-button")?.addEventListener("click",()=>open(p)));
    closeBtn?.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();close()});
    prevBtn?.addEventListener("click",e=>{e.stopPropagation();move(-1)});
    nextBtn?.addEventListener("click",e=>{e.stopPropagation();move(1)});
    lb.addEventListener("click",e=>{if(e.target===lb)close()});
    document.addEventListener("keydown",e=>{if(!lb.classList.contains("open"))return;if(e.key==="Escape"){e.preventDefault();close()}else if(e.key==="ArrowLeft"){e.preventDefault();move(-1)}else if(e.key==="ArrowRight"){e.preventDefault();move(1)}});
    let sx=0;lb.addEventListener("touchstart",e=>sx=e.changedTouches[0].screenX,{passive:true});lb.addEventListener("touchend",e=>{const dx=e.changedTouches[0].screenX-sx;if(Math.abs(dx)>45)move(dx>0?-1:1)},{passive:true});
  }

  const input=document.getElementById("photo-input"),zone=document.getElementById("dropzone"),fileCount=document.getElementById("file-count");
  if(input&&zone){
    input.addEventListener("change",()=>{if(fileCount)fileCount.textContent=input.files.length?`${input.files.length} photo${input.files.length>1?"s":""} selected`:"JPG, PNG, WEBP · up to 25MB each"});
    ["dragenter","dragover"].forEach(x=>zone.addEventListener(x,e=>{e.preventDefault();zone.style.borderColor="#111"}));
    ["dragleave","drop"].forEach(x=>zone.addEventListener(x,e=>{e.preventDefault();zone.style.borderColor=""}));
    zone.addEventListener("drop",e=>{try{input.files=e.dataTransfer.files;input.dispatchEvent(new Event("change"))}catch(_){}});
  }
});
