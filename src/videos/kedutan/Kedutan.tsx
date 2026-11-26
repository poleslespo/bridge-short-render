import React,{useEffect,useMemo,useState} from "react";
import * as THREE from "three";
import {AbsoluteFill,continueRender,delayRender,useCurrentFrame} from "remotion";
import {ThreeCanvas} from "@remotion/three";
import {useThree} from "@react-three/fiber";
import {EffectComposer} from "@react-three/postprocessing";
import {BlendFunction,BloomEffect,ToneMappingEffect,ToneMappingMode} from "postprocessing";
import {World,loadKit,Kit} from "./world";
import {InkPass,noInkFallback} from "../bridge/ink";
import {LensBlur,GrainEffect} from "../bridge/lensblur";
import {GradeEffect,GRADES,GRADE_STRENGTH,gradeFor} from "../bridge/grade";
import {TOTAL,SHOTS,layersAt,dofAt} from "./story";

export const KEDUTAN_FRAMES=TOTAL;
const makeBloom=()=>{
 const b=new BloomEffect({blendFunction:BlendFunction.ADD,intensity:.5,luminanceThreshold:1,luminanceSmoothing:.2,mipmapBlur:true,levels:6,radius:.6});
 const mip=b.mipmapBlurPass;const setSize=mip.setSize.bind(mip);
 mip.setSize=(w:number,h:number)=>setSize(Math.round(1920*w/Math.max(h,1)),1920);
 return b;
};
const useKit=()=>{
 const [kit,setKit]=useState<Kit|null>(null);
 const [handle]=useState(()=>delayRender("kedutan procedural world"));
 useEffect(()=>{loadKit().then(k=>{setKit(k);continueRender(handle);});},[handle]);
 return kit;
};
const Inner:React.FC<{id:number;kit:Kit}> = ({id,kit})=>{
 const f=useCurrentFrame();const {camera,scene}=useThree();
 const world=useMemo(()=>new World(kit),[kit]);
 const fx=useMemo(()=>({
  ink:new InkPass(scene,camera as THREE.PerspectiveCamera),
  lens:new LensBlur({maxCoC:24,nearScale:1.2}),
  bloom:makeBloom(),
  tone:new ToneMappingEffect({mode:ToneMappingMode.NEUTRAL}),
  grade:new GradeEffect(GRADES.golden,GRADE_STRENGTH.golden),
  grain:new GrainEffect({amount:.025,cellPx:1.5}),
 }),[camera,scene]);
 useEffect(()=>()=>fx.ink.dispose(),[fx]);
 const post=useMemo(()=><EffectComposer multisampling={4}>
  <primitive object={fx.ink} dispose={null}/>
  <primitive object={fx.lens.pre} dispose={null}/>
  <primitive object={fx.lens.main} dispose={null}/>
  <primitive object={fx.bloom} dispose={null}/>
  <primitive object={fx.tone} dispose={null}/>
  <primitive object={fx.grade} dispose={null}/>
 </EffectComposer>,[fx]);
 const cam=camera as THREE.PerspectiveCamera;
 const target=world.update(id,f,cam,scene);
 noInkFallback(world.root);
 const d=dofAt(f);
 // fokus = jarak kamera->subjek (target yang dikembalikan world.update)
 fx.lens.focus=Math.max(.3,target.distanceTo(cam.position));
 fx.lens.cInf=d.cInf;gradeFor(fx.grade,SHOTS[id-1]?.light??"golden");
 return <><primitive object={world.root} dispose={null}/>{post}</>;
};
const ShotView:React.FC<{id:number;kit:Kit;alpha:number}>=({id,kit,alpha})=>
 <AbsoluteFill style={{opacity:alpha}}>
  <ThreeCanvas width={1080} height={1920} shadows gl={{antialias:false,stencil:false,powerPreference:"high-performance",toneMappingExposure:1}}
   camera={{fov:40,near:.2,far:1500}}>
   <Inner id={id} kit={kit}/>
  </ThreeCanvas>
 </AbsoluteFill>;
export const KedutanShort:React.FC=()=>{
 const f=useCurrentFrame();const kit=useKit();if(!kit)return null;
 // Teks besar "KEDUTAN" sebagai overlay (ECU shot 1 terlalu sempit untuk
 // teks in-world — plane 3D selalu terpotong). Muncul di 70 frame pertama.
 const showKedutan=f<70;
 return <AbsoluteFill style={{background:"#101d36"}}>
  {layersAt(f).map((l,i)=><ShotView key={i} id={l.id} kit={kit} alpha={l.alpha}/>)}
  {showKedutan&&<AbsoluteFill style={{alignItems:"flex-start",justifyContent:"flex-start"}}>
   <div style={{width:"100%",textAlign:"center",marginTop:"6%",fontSize:130,fontWeight:900,color:"#fff4c9",textShadow:"0 6px 0 #20170f, 0 0 24px rgba(0,0,0,.45)",letterSpacing:2}}>KEDUTAN</div>
  </AbsoluteFill>}
 </AbsoluteFill>;
};
