import fs from "node:fs";
const m=JSON.parse(fs.readFileSync("map.json","utf8")), i=JSON.parse(fs.readFileSync("inset.json","utf8"));
const W=580,H=560, s=560/22, km200=200/111.2*s;
const P=m.points, L=m.labels;
const others=Object.entries(m.paths).filter(([k])=>!["rdc","angola","zambie","katanga"].includes(k)).map(([,v])=>v).join("");
const font='font-family="Inter, Helvetica, Arial, sans-serif"';
const city=(k,name,dx=8,dy=4,anchor="start",bold=false)=>`<circle cx="${P[k][0]}" cy="${P[k][1]}" r="4.5" fill="#23262b" stroke="#fff" stroke-width="1.5"/><text x="${P[k][0]+dx}" y="${P[k][1]+dy}" text-anchor="${anchor}" font-size="15" ${bold?'font-weight="700"':'font-weight="500"'} fill="#23262b" stroke="#f3f0e8" stroke-width="3.5" paint-order="stroke">${name}</text>`;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d" ${font}>
<title id="t">Le Shaba, province minière du Zaïre (1977-1978)</title>
<desc id="d">Carte MUNDI. La province du Shaba (ancien Katanga), au sud-est du Zaïre, actuelle république démocratique du Congo, est colorée en rouge. Dilolo, Kolwezi et Lubumbashi y sont placées ; l'Angola est à l'ouest, la Zambie au sud. Frontières : Natural Earth, domaine public.</desc>
<rect width="${W}" height="${H}" fill="#d9e1de"/>
<path d="${others}" fill="#ece8df" stroke="#8a8f96" stroke-width="0.6"/>
<path d="${m.paths.angola}" fill="#ece8df" stroke="#6b7078" stroke-width="0.8"/>
<path d="${m.paths.zambie}" fill="#ece8df" stroke="#6b7078" stroke-width="0.8"/>
<path d="${m.paths.rdc}" fill="#f8f6f0" stroke="#23262b" stroke-width="1.2"/>
<path d="${m.paths.katanga}" fill="#a33b25" fill-opacity="0.88" stroke="#7d2a19" stroke-width="1"/>
<text x="${L.rdc[0]}" y="${L.rdc[1]}" text-anchor="middle" font-size="17" font-weight="700" letter-spacing="2" fill="#23262b">ZAÏRE</text>
<text x="${L.rdc[0]}" y="${L.rdc[1]+19}" text-anchor="middle" font-size="13" fill="#3a3e45">auj. république démocratique du Congo</text>
<text x="${L.angola[0]}" y="${L.angola[1]}" text-anchor="middle" font-size="15" font-weight="700" letter-spacing="2" fill="#5b6070">ANGOLA</text>
<text x="${L.zambie[0]}" y="${L.zambie[1]}" text-anchor="middle" font-size="15" font-weight="700" letter-spacing="2" fill="#5b6070">ZAMBIE</text>
<text x="420" y="282" text-anchor="middle" font-size="20" font-weight="800" letter-spacing="3" fill="#fff">SHABA</text>
<text x="420" y="299" text-anchor="middle" font-size="12" fill="#fff">ancien Katanga</text>
<defs><marker id="a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#23262b"/></marker></defs>
<path d="M ${P.dilolo[0]-60} ${P.dilolo[1]+62} Q ${P.dilolo[0]-30} ${P.dilolo[1]+40} ${P.dilolo[0]-8} ${P.dilolo[1]+5}" fill="none" stroke="#23262b" stroke-width="2.2" stroke-dasharray="6 4" marker-end="url(#a)"/>
<text x="${P.dilolo[0]-150}" y="${P.dilolo[1]+80}" font-size="13" font-weight="600" fill="#23262b" stroke="#ece8df" stroke-width="3" paint-order="stroke">Mars 1977 : entrée par Dilolo</text>
${city("dilolo","Dilolo",-8,-10,"end")}
${city("kolwezi","Kolwezi",0,-24,"middle",true)}
<text x="${P.kolwezi[0]}" y="${P.kolwezi[1]-10}" text-anchor="middle" font-size="12" font-weight="600" fill="#23262b" stroke="#f3f0e8" stroke-width="3" paint-order="stroke">visée en mai 1978</text>
${city("lubumbashi","Lubumbashi",8,16)}
${city("kinshasa","Kinshasa",8,4)}
<g transform="translate(14 14)"><rect width="${i.W+12}" height="${i.H+12}" fill="#f8f6f0" stroke="#8a8f96" stroke-width="0.8"/><g transform="translate(6 6)"><path d="${i.africa}" fill="#d6d2c7" stroke="#8a8f96" stroke-width="0.4"/><path d="${i.drc}" fill="#a33b25"/><rect x="${i.box[0][0]}" y="${i.box[0][1]}" width="${i.box[1][0]-i.box[0][0]}" height="${i.box[1][1]-i.box[0][1]}" fill="none" stroke="#23262b" stroke-width="1.2"/></g></g>
<g transform="translate(${W-km200-24} ${H-22})"><rect x="-8" y="-20" width="${km200+24}" height="32" fill="#f8f6f0" fill-opacity="0.85"/><path d="M0 0H${km200.toFixed(1)}" stroke="#23262b" stroke-width="3"/><text x="${(km200/2).toFixed(1)}" y="-7" text-anchor="middle" font-size="12" fill="#23262b">200 km</text></g>
<text x="12" y="${H-10}" font-size="11" fill="#3a3e45">Carte MUNDI · frontières actuelles : Natural Earth (domaine public)</text>
</svg>`;
fs.writeFileSync("public/media/pilote/shaba-carte.svg",svg.replace(/\n/g,""));
fs.writeFileSync("preview.svg",svg);
