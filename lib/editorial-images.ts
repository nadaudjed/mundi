/** Images d'illustration automatiquement collectées auprès de Wikimedia Commons. */
export type EditorialPhoto={
  slug:string;src:string;alt:string;title:string;credit:string;license:string;
  licenseUrl:string;sourceUrl:string;
  /** illustration : photo générique ; archive : photo d'époque d'un récit daté (#125). */
  kind:"illustration"|"archive";
  review:"automated-license-and-title-check";retrievedAt:string;searchQuery:string;
  /** Photo propre à une carte « Données » : la publication et l'identifiant de la carte. */
  publication?:string;card?:string;
};
const LICENSES=["https://creativecommons.org/licenses/by/4.0/",
  "https://creativecommons.org/licenses/by-sa/4.0/",
  "https://creativecommons.org/licenses/by/3.0/",
  "https://creativecommons.org/licenses/by-sa/3.0/",
  "https://creativecommons.org/licenses/by/2.0/",
  "https://creativecommons.org/licenses/by-sa/2.0/",
  "https://creativecommons.org/publicdomain/zero/1.0/",
  // Archives du domaine public (Wikimedia Commons, sans lien de licence propre) : marque « domaine public ».
  "https://creativecommons.org/publicdomain/mark/1.0/"];
const HTTPS=(s:unknown,host:string)=>{try{const u=new URL(String(s));return u.protocol==="https:"&&u.hostname===host&&!u.username&&!u.password;}catch{return false;}};
export function validateEditorialPhotos(items:unknown):string[]{
  if(!Array.isArray(items))return ["Catalogue photographique invalide"];
  const errors:string[]=[],seen=new Set<string>();
  for(const [i,item] of items.entries()){
    const p=item as Partial<EditorialPhoto>,where="Photo "+(i+1);
    if(!p||typeof p!=="object"){errors.push(where+" : objet requis");continue;}
    if(typeof p.slug!=="string"||!(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).test(p.slug)||seen.has(p.slug))
      errors.push(where+" : slug invalide ou en double");
    if(p.slug)seen.add(p.slug);
    if(typeof p.src!=="string"||!(/^\/media\/editorial\/[a-z0-9-]+\.(jpg|png|webp)$/).test(p.src)||p.src.includes(".."))
      errors.push(where+" : image locale requise");
    if((p.kind!=="illustration"&&p.kind!=="archive")||p.review!=="automated-license-and-title-check")
      errors.push(where+" : préciser la nature et la vérification automatique");
    for(const k of ["alt","title","credit","license","searchQuery"] as const)
      if(typeof p[k]!=="string"||p[k].trim().length<3||p[k].length>250)
        errors.push(where+" : "+k+" requis");
    if(typeof p.sourceUrl!=="string"||!HTTPS(p.sourceUrl,"commons.wikimedia.org"))
      errors.push(where+" : lien d'origine Wikimedia requis");
    if(typeof p.licenseUrl!=="string"||!LICENSES.includes(p.licenseUrl))
      errors.push(where+" : licence autorisée requise");
    if((p.publication!==undefined||p.card!==undefined)&&(typeof p.publication!=="string"||typeof p.card!=="string"||!/^[a-z0-9-]{1,60}$/.test(p.card)))
      errors.push(where+" : photo de carte : publication et carte requises");
    if(typeof p.retrievedAt!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(p.retrievedAt))
      errors.push(where+" : date de récupération requise");
  }
  return errors;
}
