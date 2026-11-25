import fs from "node:fs";
import {feature,merge} from "topojson-client";
const topo=JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-110m.json","utf8"));
const geoms=topo.objects.countries.geometries;
const africaIds=new Set(["012","024","204","072","854","108","120","132","140","148","174","178","180","262","818","226","232","231","266","270","288","324","624","384","404","426","430","434","450","454","466","478","480","504","508","516","562","566","646","678","686","690","694","706","710","728","729","748","834","768","788","800","732","894","716"]);
const af=geoms.filter(g=>africaIds.has(g.id));
const land=merge(topo,af);
const drc=feature(topo,geoms.find(g=>g.id==="180")).geometry;
const lon0=-18,lon1=52,lat0=38,lat1=-35,W=120;
const s=W/(lon1-lon0);
const P=([lo,la])=>[(lo-lon0)*s,(lat0-la)*s];
function ring(r){let o=[],l=null;for(const c of r){const p=P(c);if(l&&Math.hypot(p[0]-l[0],p[1]-l[1])<0.8)continue;o.push(p);l=p;}return o.length<3?"":"M"+o.map(p=>p[0].toFixed(1)+" "+p[1].toFixed(1)).join("L")+"Z";}
const path=g=>(g.type==="Polygon"?[g.coordinates]:g.coordinates).map(pl=>pl.map(ring).join("")).join("");
// cadre de la carte principale
const box=[P([10.5,3]),P([33.5,-19])];
fs.writeFileSync("inset.json",JSON.stringify({W,H:Math.round((lat0-lat1)*s),africa:path(land),drc:path(drc),box:box.map(p=>p.map(v=>+v.toFixed(1)))}));
console.log(fs.statSync("inset.json").size);
