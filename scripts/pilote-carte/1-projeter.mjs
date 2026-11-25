import fs from "node:fs";
import {feature} from "topojson-client";
const topo=JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-50m.json","utf8"));
const countries=feature(topo,topo.objects.countries).features;
const adm=JSON.parse(fs.readFileSync("adm1.geojson","utf8"));
const kat=adm.features.find(f=>f.properties.adm0_a3==="COD"&&f.properties.name==="Katanga");
const W=600,H=560, lon0=10.5,lon1=33.5,lat0=3,lat1=-19;
const k=Math.cos(8*Math.PI/180);
const sx=W/((lon1-lon0)*k), sy=H/(lat0-lat1);
const s=Math.min(sx,sy);
const P=([lo,la])=>[ (lo-lon0)*k*s, (lat0-la)*s ];
function ring(r){let out=[],last=null;for(const c of r){const p=P(c);if(last&&Math.hypot(p[0]-last[0],p[1]-last[1])<2.2)continue;out.push(p);last=p;}
 if(out.length<3)return "";return "M"+out.map(p=>p[0].toFixed(1)+" "+p[1].toFixed(1)).join("L")+"Z";}
function path(g){const polys=g.type==="Polygon"?[g.coordinates]:g.coordinates;return polys.map(pl=>pl.map(ring).join("")).join("");}
function inView(g){const polys=g.type==="Polygon"?[g.coordinates]:g.coordinates;return polys.some(pl=>pl[0].some(([lo,la])=>lo>lon0-5&&lo<lon1+5&&la<lat0+5&&la>lat1-5));}
const keep={"180":"rdc","024":"angola","894":"zambie","178":"congo","716":"zimbabwe","072":"botswana","516":"namibie","454":"malawi","508":"mozambique","834":"tanzanie","646":"rwanda","108":"burundi","800":"ouganda","140":"rca","120":"cameroun","266":"gabon","226":"guinee-eq","728":"soudan-sud"};
const out={};
for(const f of countries){ if(!inView(f.geometry))continue; const id=keep[f.id]||("c"+f.id); out[id]=path(f.geometry);}
out.katanga=path(kat.geometry);
const pt=(lo,la)=>P([lo,la]).map(v=>+v.toFixed(1));
const points={kolwezi:pt(25.472,-10.716),lubumbashi:pt(27.479,-11.664),dilolo:pt(22.333,-10.683),kinshasa:pt(15.322,-4.325)};
const labels={rdc:pt(22.5,-2.5),angola:pt(17.5,-12.5),zambie:pt(27.5,-14.6)};
fs.writeFileSync("map.json",JSON.stringify({W,H:Math.round((lat0-lat1)*s),paths:out,points,labels}));
console.log(Object.keys(out).length, Math.round((lat0-lat1)*s), (lon1-lon0)*k*s, fs.statSync("map.json").size);
