(function(){
  const scenes=Array.from(document.querySelectorAll(".scene"));
  const nav=Array.from(document.querySelectorAll("[data-goto]"));
  const container=document.getElementById("scroller");
  const pause=document.getElementById("pause");
  const reading=document.getElementById("reading");
  function go(i) {
    const position=(i+scenes.length)%scenes.length;
    scenes[position].scrollIntoView({
      behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",
      block:"start"
    });
  }
  nav.forEach((el,i)=>el.addEventListener("click",()=>go(i)));
  document.querySelectorAll("[data-next]").forEach((el,i)=>el.addEventListener("click",()=>go(i+1)));
  pause.addEventListener("click",()=>{
    const on=document.body.classList.toggle("paused");
    pause.setAttribute("aria-pressed",String(on));
    pause.textContent=on?"Reprendre":"Pause";
  });
  reading.addEventListener("click",()=>{
    const on=document.body.classList.toggle("reading");
    reading.setAttribute("aria-pressed",String(on));
    reading.textContent=on?"Immersif":"Lecture";
  });
  if("IntersectionObserver" in window){
    const obs=new IntersectionObserver(entries=>{
      for(const entry of entries) {
        if(!entry.isIntersecting||entry.intersectionRatio<.6)continue;
        const index=scenes.indexOf(entry.target);
        scenes.forEach((el,i)=>el.classList.toggle("is-active",index===i));
        nav.forEach((el,i)=>i===index?el.setAttribute("aria-current","step"):el.removeAttribute("aria-current"));
      }
    },{root:container,threshold:[0,.6,1]});
    scenes.forEach(scene=>obs.observe(scene));
  }
  window.addEventListener("keydown",e=>{
    if(e.key!=="ArrowDown"&&e.key!=="ArrowUp")return;
    if(["INPUT","TEXTAREA","SELECT","BUTTON","A"].includes(document.activeElement?.tagName))return;
    e.preventDefault();
    const current=Math.max(0,nav.findIndex(el=>el.getAttribute("aria-current")==="step"));
    go(current+(e.key==="ArrowDown"?1:-1));
  });
})();