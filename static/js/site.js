document.addEventListener("DOMContentLoaded",()=>{
  const reveals=document.querySelectorAll(".reveal");
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");io.unobserve(e.target)}}),{threshold:.08});
  reveals.forEach(e=>io.observe(e));

  const photos=[...document.querySelectorAll(".photo")];
  const collectionFilters=[...document.querySelectorAll("[data-filter]")];
  const formatFilters=[...document.querySelectorAll("[data-format]")];
  const showMore=document.getElementById("show-more");
  const moreWrap=document.getElementById("gallery-more-wrap");
  const status=document.getElementById("gallery-status");
  const PAGE_SIZE=10;
  let shown=PAGE_SIZE;
  let activeCollection="all";
  let activeFormat="all";

  function matches(p){
    const category=p.dataset.category;
    const format=p.dataset.format;
    return (activeCollection==="all"||category===activeCollection) && (activeFormat==="all"||format===activeFormat);
  }

  function refreshGallery(reset=true){
    if(reset) shown=PAGE_SIZE;
    const matchesList=photos.filter(matches);
    photos.forEach(p=>{
      const match=matches(p);
      const visibleIndex=matchesList.indexOf(p);
      p.classList.toggle("is-hidden",!match);
      p.classList.toggle("load-hidden",match && visibleIndex>=shown);
    });
    const remaining=Math.max(0,matchesList.length-shown);
    if(showMore){
      showMore.style.display=remaining>0?"inline-flex":"none";
      showMore.querySelector("span").textContent=remaining>0?`+${Math.min(PAGE_SIZE,remaining)}`:"";
    }
    if(status) status.textContent=matchesList.length===0?"No photographs in this view.":`Showing ${Math.min(shown,matchesList.length)} of ${matchesList.length}`;
  }

  collectionFilters.forEach(btn=>btn.addEventListener("click",()=>{
    collectionFilters.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    activeCollection=btn.dataset.filter;
    refreshGallery(true);
  }));

  formatFilters.forEach(btn=>btn.addEventListener("click",()=>{
    formatFilters.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    activeFormat=btn.dataset.format;
    refreshGallery(true);
  }));

  if(showMore) showMore.addEventListener("click",()=>{shown+=PAGE_SIZE;refreshGallery(false)});
  refreshGallery();

  const lb=document.getElementById("lightbox");
  if(lb){
    const img=document.getElementById("lb-img"),title=document.getElementById("lb-title"),count=document.getElementById("lb-count");
    let current=0;
    const visible=()=>photos.filter(p=>!p.classList.contains("is-hidden")&&!p.classList.contains("load-hidden"));
    function open(p){const list=visible();current=list.indexOf(p);render();lb.classList.add("open");document.body.classList.add("lb-open");lb.setAttribute("aria-hidden","false")}
    function render(){const list=visible();const p=list[current];if(!p)return;img.src=p.dataset.src;img.alt=p.dataset.title;title.textContent=p.dataset.title||"Untitled";count.textContent=`${String(current+1).padStart(2,"0")} / ${String(list.length).padStart(2,"0")}`}
    function move(n){const list=visible();if(!list.length)return;current=(current+n+list.length)%list.length;render()}
    photos.forEach(p=>p.querySelector(".photo-button").addEventListener("click",()=>open(p)));
    lb.querySelector(".lb-close").onclick=()=>{lb.classList.remove("open");document.body.classList.remove("lb-open");lb.setAttribute("aria-hidden","true")};
    lb.querySelector(".lb-prev").onclick=()=>move(-1);lb.querySelector(".lb-next").onclick=()=>move(1);
    document.addEventListener("keydown",e=>{if(!lb.classList.contains("open"))return;if(e.key==="Escape")lb.querySelector(".lb-close").click();if(e.key==="ArrowLeft")move(-1);if(e.key==="ArrowRight")move(1)});
    let sx=0;lb.addEventListener("touchstart",e=>sx=e.changedTouches[0].screenX,{passive:true});lb.addEventListener("touchend",e=>{const dx=e.changedTouches[0].screenX-sx;if(Math.abs(dx)>45)move(dx>0?-1:1)},{passive:true})
  }

  const input=document.getElementById("photo-input"),zone=document.getElementById("dropzone"),fileCount=document.getElementById("file-count");
  if(input){
    input.addEventListener("change",()=>{fileCount.textContent=input.files.length?`${input.files.length} photo${input.files.length>1?"s":""} selected`:"JPG, PNG, WEBP · up to 25MB each"});
    ["dragenter","dragover"].forEach(x=>zone.addEventListener(x,e=>{e.preventDefault();zone.style.borderColor="#111"}));
    ["dragleave","drop"].forEach(x=>zone.addEventListener(x,e=>{e.preventDefault();zone.style.borderColor=""}));
    zone.addEventListener("drop",e=>{input.files=e.dataTransfer.files;input.dispatchEvent(new Event("change"))});
  }
});
