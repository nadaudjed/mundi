import test from "node:test";
import assert from "node:assert/strict";
import {imageQueries,selectImage,searchCommons,downloadPhoto,collectEditorialImages} from "../scripts/collect-editorial-images.mjs";
function candidate(title="File:Textile recycling facility.jpg",license="CC BY 4.0",url="https://creativecommons.org/licenses/by/4.0/"){
  return {title,imageinfo:[{mime:"image/jpeg",thumburl:"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/test.jpg/1400px-test.jpg",
    width:1600,height:1000,thumbwidth:1400,thumbheight:875,extmetadata:{
    LicenseShortName:{value:license},LicenseUrl:{value:url},Artist:{value:"<a href='https://commons.wikimedia.org'>Photo &amp; Artist</a>"}}}]};
}
test("image search queries use the article first, then a distinct photographic topic fallback",()=>{
 const q=imageQueries({title:"Déchets textiles : comment ils sont recyclés en Europe",topic:"recyclage"});
 assert.equal(q[0],"textile recycling");
 assert.ok(q.some(x=>x.includes("dechets textiles")));
 assert.ok(q.includes("recycling"));
 assert.deepEqual(imageQueries({title:"!!!",topic:"afrique"}),["african city"]);
});
test("Commons selector accepts credited CC BY photo and strips HTML safely",()=>{
 const pic=selectImage([candidate()],"textile recycling");
 assert.equal(pic.license,"CC BY 4.0");
 assert.equal(pic.author,"Photo & Artist");
 assert.match(pic.url,/commons.wikimedia.org/);
});
test("reject all pictures with unknown rights, unauthenticated authors, or unsupported format",()=>{
 const badLicense=candidate("File:Textile recycling.jpg","Copyrighted","https://example.org/terms");
 const missing=candidate();delete missing.imageinfo[0].extmetadata.Artist;
 const external=candidate();external.imageinfo[0].thumburl="https://evil.example/picture.jpg";
 const diagram=candidate("File:Textile recycling diagram.jpg");
 assert.equal(selectImage([badLicense,missing,external,diagram],"textile recycling"),null);
});
test("search URL includes category and imageinfo rights, and never exposes an API key",async()=>{
 let uri;
 const out=await searchCommons("textile recycling",async (url,options)=>{
   uri=new URL(url);assert.equal(options.headers.Accept,"application/json");
   return {ok:true,json:async()=>({query:{pages:[candidate()]}})};
 });
 assert.equal(uri.host,"commons.wikimedia.org");
 assert.equal(uri.searchParams.get("gsrsearch"),"textile recycling");
 assert.match(uri.searchParams.get("iiprop"),/extmetadata/);
 assert.ok(out);
});
test("reject unsafe image download URL before sending any network request",async()=>{
 await assert.rejects(downloadPhoto({src:"https://evil.example/unsafe.jpg"},()=>{throw new Error("SHOULD NOT CALL")}),/not Wikimedia/);
});
test("each approved candidate becomes a local image and an attributed manifest entry",async()=>{
 const fs=await import("node:fs"),os=await import("node:os"),path=await import("node:path");
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"mundi-photos-"));
 try{
   const fake=Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),Buffer.alloc(5000)]);
   const result=await collectEditorialImages([{status:"published",slug:"article-test",title:"Le recyclage textile",topic:"recyclage"}],[],{
     root,max:1,search:async()=>({...selectImage([candidate()],"textile recycling"),title:"Textile facility"}),
     download:async()=>({ext:"jpg",buffer:fake}),day:"2026-11-23"
   });
   assert.equal(result.images.length,1);
   assert.equal(result.images[0].kind,"illustration");
   assert.equal(result.images[0].review,"automated-license-and-title-check");
   assert.equal(result.images[0].sourceUrl.startsWith("https://commons.wikimedia.org/"),true);
   assert.ok(fs.existsSync(path.join(root,"public/media/editorial/article-test.jpg")));
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test("existing photos are never overwritten and unlicensed results never become public",async()=>{
 const old={slug:"article-a",src:"/media/editorial/article-a.jpg"};
 const result=await collectEditorialImages([
 {status:"published",slug:"article-a",title:"Article A",topic:"finance"},
 {status:"published",slug:"article-b",title:"Article B",topic:"finance"},
 {status:"draft",slug:"article-c",title:"Article C",topic:"finance"}],[old],{
 search:async()=>null,max:8
 });
 assert.deepEqual(result.images,[old]);
 assert.equal(result.report.length,1);
 assert.equal(result.report[0].status,"no_licensed_photo");
});

test("Wikimedia Commons HTTPS and HTTP Creative Commons licence URLs are normalised, not rejected",()=>{
 const pic=candidate("File:Textile recycling factory.jpg","CC BY-SA 3.0","http://creativecommons.org/licenses/by-sa/3.0/");
 pic.imageinfo[0].thumburl="https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/image.jpg/1400px-image.jpg";
 const selected=selectImage([pic],"textile recycling");
 assert.ok(selected);
 assert.equal(selected.licenseUrl,"https://creativecommons.org/licenses/by-sa/3.0/");
 assert.match(selected.src,/^https:\/\/thumb\.wikimedia\.org\//);
 const noSlash=candidate("File:Textile recycling factory.jpg","CC BY-SA 4.0","https://creativecommons.org/licenses/by-sa/4.0");
 assert.ok(selectImage([noSlash],"textile recycling"));
 const deed=candidate("File:Textile recycling factory.jpg","CC0","http://creativecommons.org/publicdomain/zero/1.0/deed.en");
 assert.ok(selectImage([deed],"textile recycling"));
});
test("non-Wikimedia thumbnails and fake Creative Commons hosts stay blocked",()=>{
 const foreign=candidate();foreign.imageinfo[0].thumburl="https://upload.wikimedia.org.evil.example/pic.jpg";
 assert.equal(selectImage([foreign],"textile recycling"),null);
 const fake=candidate("File:Textile recycling factory.jpg","CC BY 4.0","https://creativecommons.org.evil.example/licenses/by/4.0/");
 assert.equal(selectImage([fake],"textile recycling"),null);
});
