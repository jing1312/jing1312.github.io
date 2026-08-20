/* immersive-scene.js — 全屏 3D 沉浸式场景 · 无 PMREM 稳健版 */
import * as THREE from "three";

const THEMES = [
  { sky: ["#f8b8d4","#fce4ec"], light: 0xffb0d0, accent: 0xf06f98, fog: 0xfce4ec },
  { sky: ["#c8b8f0","#ede7ff"], light: 0xc4b0f0, accent: 0xa78ae3, fog: 0xf1edff },
  { sky: ["#8fd8c0","#e4f8f1"], light: 0x80d0b0, accent: 0x65c9a7, fog: 0xecfaf5 },
  { sky: ["#f0d870","#fff8e7"], light: 0xf0c850, accent: 0xe8ad33, fog: 0xfff8e7 },
  { sky: ["#80b8e0","#e5f3ff"], light: 0x80b0e0, accent: 0x5a9fd6, fog: 0xedf7ff },
  { sky: ["#f0a0b8","#fff0f2"], light: 0xf090b0, accent: 0xf47fa2, fog: 0xfff0f2 },
];
function lerpC(a,b,t){return new THREE.Color(a.r+(b.r-a.r)*t,a.g+(b.g-a.g)*t,a.b+(b.b-a.b)*t);}
function damp(c,t,l,dt){return t+(c-t)*Math.exp(-l*dt);}

/* 材质工厂 — 不依赖 envMap，用 lights + emissive 营造质感 */
function clay(c,o={}){
  return new THREE.MeshPhysicalMaterial({
    color:c,
    roughness:o.roughness??0.3,
    metalness:o.metalness??0.05,
    clearcoat:o.clearcoat??0.6,
    clearcoatRoughness:o.clearcoatRoughness??0.3,
    transmission:o.transmission??0,
    thickness:o.thickness??0,
    ior:o.ior??1.4,
    emissive:o.emissive??0x000000,
    emissiveIntensity:o.emissiveIntensity??0,
    transparent:o.transparent??false,
    opacity:o.opacity??1,
  });
}

/* ── 道具创建 ── */
function createFlower(){
  const g=new THREE.Group();
  const pm=clay(0xff7da5,{roughness:0.2,clearcoat:1,emissive:0xff3d7f,emissiveIntensity:0.12});
  for(let i=0;i<6;i++){
    const a=(i/6)*Math.PI*2;
    const p=new THREE.Mesh(new THREE.SphereGeometry(0.12,24,16),pm);
    p.scale.set(0.6,1.0,0.4);
    p.position.set(Math.cos(a)*0.14,Math.sin(a)*0.14,0);
    p.rotation.z=a-Math.PI/2;
    g.add(p);
  }
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.08,24,16),clay(0xffd36f,{roughness:0.15,clearcoat:1,emissive:0xffaa30,emissiveIntensity:0.2})));
  return g;
}

function createCapsule(){
  const g=new THREE.Group();
  const pm=clay(0xf06f98,{roughness:0.15,clearcoat:1,emissive:0xf06f98,emissiveIntensity:0.08});
  const ym=clay(0xffd16b,{roughness:0.18,clearcoat:1,emissive:0xffd16b,emissiveIntensity:0.08});
  const t=new THREE.Mesh(new THREE.SphereGeometry(0.15,32,24),pm);
  const b=new THREE.Mesh(new THREE.SphereGeometry(0.15,32,24),ym);
  t.scale.y=b.scale.y=0.8;
  t.position.y=0.11; b.position.y=-0.11;
  g.add(t,b);
  g.rotation.z=-0.7;
  return g;
}

function createTestTube(){
  const g=new THREE.Group();
  const gm=clay(0xdff7ff,{transmission:0.85,roughness:0.05,clearcoat:1,transparent:true,opacity:0.7,ior:1.5,thickness:0.5});
  const lm=clay(0x77d7ad,{roughness:0.1,clearcoat:1,emissive:0x55cc99,emissiveIntensity:0.15,transparent:true,opacity:0.9});
  const tube=new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.075,0.36,32,1,true),gm);
  const liq=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.17,24),lm);
  liq.position.y=-0.08;
  const rim=new THREE.Mesh(new THREE.TorusGeometry(0.082,0.015,12,32),clay(0x70b6ed,{roughness:0.2,clearcoat:1,emissive:0x4090d0,emissiveIntensity:0.15}));
  rim.rotation.x=Math.PI/2; rim.position.y=0.18;
  g.add(tube,liq,rim);
  g.rotation.z=-0.55;
  return g;
}

function createRobot(){
  const g=new THREE.Group();
  const bm=clay(0x8a83d8,{roughness:0.2,clearcoat:1,emissive:0x6a60c8,emissiveIntensity:0.12});
  const body=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.27,0.24),bm);
  const face=new THREE.Mesh(new THREE.BoxGeometry(0.26,0.14,0.03),clay(0xeef5ff,{roughness:0.35}));
  face.position.set(0,0.02,0.13);
  const em=clay(0x293451,{roughness:0.4,emissive:0x4080ff,emissiveIntensity:0.4});
  const le=new THREE.Mesh(new THREE.SphereGeometry(0.028,16,12),em);
  const re=le.clone();
  le.position.set(-0.06,0.025,0.155); re.position.set(0.06,0.025,0.155);
  const ant=new THREE.Mesh(new THREE.CylinderGeometry(0.013,0.013,0.16,12),clay(0xf06f98,{emissive:0xf06f98,emissiveIntensity:0.3}));
  ant.position.y=0.2;
  const tip=new THREE.Mesh(new THREE.SphereGeometry(0.038,20,16),clay(0xffd16b,{roughness:0.1,clearcoat:1,emissive:0xffd16b,emissiveIntensity:0.5}));
  tip.position.y=0.3;
  g.add(body,face,le,re,ant,tip);
  return g;
}

function createOcta(c,e){
  return new THREE.Mesh(new THREE.OctahedronGeometry(0.12,0),clay(c,{roughness:0.15,clearcoat:1,emissive:e,emissiveIntensity:0.3}));
}

/* ── 粒子系统 ── */
function createParticles(count=220){
  const pos=new Float32Array(count*3),sz=new Float32Array(count),ph=new Float32Array(count),col=new Float32Array(count*3);
  const pal=[new THREE.Color(0xff7da5),new THREE.Color(0xffb0d0),new THREE.Color(0xffd16b),new THREE.Color(0xc8b8f0),new THREE.Color(0xffffff)];
  for(let i=0;i<count;i++){
    pos[i*3]=(Math.random()-0.5)*18;
    pos[i*3+1]=(Math.random()-0.5)*14;
    pos[i*3+2]=(Math.random()-0.5)*10-2;
    sz[i]=Math.random()*0.08+0.02;
    ph[i]=Math.random()*Math.PI*2;
    const c=pal[Math.floor(Math.random()*pal.length)];
    col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute("position",new THREE.BufferAttribute(pos,3));
  geo.setAttribute("aSize",new THREE.BufferAttribute(sz,1));
  geo.setAttribute("aPhase",new THREE.BufferAttribute(ph,1));
  geo.setAttribute("aColor",new THREE.BufferAttribute(col,3));
  const mat=new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0},uPR:{value:Math.min(devicePixelRatio,2)}},
    vertexShader:`
      uniform float uTime,uPR;
      attribute float aSize,aPhase;
      attribute vec3 aColor;
      varying vec3 vC; varying float vA;
      void main(){
        vC=aColor;
        vec3 p=position;
        p.x+=sin(uTime*0.3+aPhase)*0.5;
        p.y=mod(p.y+uTime*0.15+7.0,14.0)-7.0;
        p.z+=cos(uTime*0.2+aPhase)*0.3;
        vec4 mv=modelViewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=aSize*uPR*300./-mv.z;
        float d=length(mv.xyz);
        vA=smoothstep(12.,4.,d)*(0.6+0.4*sin(uTime*0.8+aPhase));
      }`,
    fragmentShader:`
      varying vec3 vC; varying float vA;
      void main(){
        vec2 uv=gl_PointCoord-0.5;
        float d=length(uv);
        if(d>0.5)discard;
        float c=smoothstep(0.5,0.0,d);
        float g=exp(-d*d*12.);
        gl_FragColor=vec4(vC*(c*0.8+g*0.4),(c*0.7+g*0.3)*vA);
      }`,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending
  });
  return{geo,mat,points:new THREE.Points(geo,mat)};
}

/* ── 发光精灵 ── */
function createGlowSprite(color,size=1){
  const cv=document.createElement("canvas"); cv.width=cv.height=128;
  const cx=cv.getContext("2d");
  const g=cx.createRadialGradient(64,64,0,64,64,64);
  const c=new THREE.Color(color);
  const r=Math.round(c.r*255),gn=Math.round(c.g*255),b=Math.round(c.b*255);
  g.addColorStop(0,`rgba(${r},${gn},${b},0.8)`);
  g.addColorStop(0.3,`rgba(${r},${gn},${b},0.3)`);
  g.addColorStop(1,`rgba(${r},${gn},${b},0)`);
  cx.fillStyle=g; cx.fillRect(0,0,128,128);
  const tex=new THREE.CanvasTexture(cv); tex.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.SpriteMaterial({map:tex,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,opacity:0.6});
  const sp=new THREE.Sprite(mat); sp.scale.setScalar(size);
  return sp;
}

/* ── 主场景 ── */
export function createImmersiveScene(canvas,{reducedMotion=false,onReady}={}){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.15;

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(40,1,0.1,100);
  camera.position.set(0,0,7);
  scene.fog=new THREE.FogExp2(0xfce4ec,0.04);

  /* 天空盒 — 渐变 shader sphere */
  const it=THEMES[0];
  const skyMat=new THREE.ShaderMaterial({
    uniforms:{uTop:{value:new THREE.Color(it.sky[0])},uBottom:{value:new THREE.Color(it.sky[1])}},
    vertexShader:`varying vec3 vP; void main(){vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      uniform vec3 uTop,uBottom; varying vec3 vP;
      void main(){
        float h=normalize(vP).y*0.5+0.5;
        h=smoothstep(0.,1.,h);
        vec3 c=mix(uBottom,uTop,h);
        gl_FragColor=vec4(c,1.);
      }`,
    side:THREE.BackSide,depthWrite:false,fog:false
  });
  const sky=new THREE.Mesh(new THREE.SphereGeometry(40,32,16),skyMat);
  scene.add(sky);

  /* 灯光 — 不依赖 envMap，用多盏灯营造质感 */
  const hemi=new THREE.HemisphereLight(0xffffff,0xb9a9de,1.5);
  scene.add(hemi);
  const keyLight=new THREE.DirectionalLight(0xfff2f6,4.0);
  keyLight.position.set(4,5,4);
  keyLight.castShadow=true;
  keyLight.shadow.mapSize.set(1024,1024);
  keyLight.shadow.camera.near=0.5; keyLight.shadow.camera.far=20;
  keyLight.shadow.camera.left=-5; keyLight.shadow.camera.right=5;
  keyLight.shadow.camera.top=5; keyLight.shadow.camera.bottom=-5;
  keyLight.shadow.bias=-0.0005;
  scene.add(keyLight);
  const fillLight=new THREE.DirectionalLight(0xaee8ff,2.0);
  fillLight.position.set(-4,2,3);
  scene.add(fillLight);
  const rimLight=new THREE.DirectionalLight(0xffc0d8,1.5);
  rimLight.position.set(0,-3,-5);
  scene.add(rimLight);
  /* 额外点光源增加层次 */
  const pl1=new THREE.PointLight(0xff7da5,2,8); pl1.position.set(-2,1,2); scene.add(pl1);
  const pl2=new THREE.PointLight(0xa78ae3,2,8); pl2.position.set(2,-1,2); scene.add(pl2);

  /* 舞台 */
  const stage=new THREE.Group();
  const kittyRig=new THREE.Group();
  const rings=new THREE.Group();
  stage.add(rings,kittyRig);
  scene.add(stage);

  /* 背景圆盘 */
  const backDisc=new THREE.Mesh(new THREE.CircleGeometry(1.6,72),clay(0xfefcff,{opacity:0.9,roughness:0.5,transparent:true}));
  backDisc.position.z=-0.4; backDisc.receiveShadow=true; stage.add(backDisc);
  const innerDisc=new THREE.Mesh(new THREE.CircleGeometry(1.2,72),clay(0xffe8ef,{opacity:0.5,roughness:0.4,transparent:true}));
  innerDisc.position.z=-0.25; stage.add(innerDisc);

  /* 装饰光环 */
  const ringSpecs=[[1.25,0.035,0xf7a8be,0.72,-0.1],[1.38,0.025,0xffffff,0.9,-0.18],[1.5,0.018,0xd7c7f6,0.55,-0.26]];
  for(let i=0;i<3;i++){
    const r=ringSpecs[i];
    const ring=new THREE.Mesh(new THREE.TorusGeometry(r[0],r[1],18,96),clay(r[2],{opacity:r[3],roughness:0.18,transparent:true,emissive:r[2],emissiveIntensity:0.08}));
    ring.position.z=r[4];
    ring.rotation.set(i*0.05,i*-0.08,0);
    rings.add(ring);
  }

  /* Kitty 头像 — 圆形遮罩 texture */
  const portraitUniforms={uMap:{value:null},uOpacity:{value:0}};
  const portraitMat=new THREE.ShaderMaterial({
    uniforms:portraitUniforms,
    vertexShader:`varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      uniform sampler2D uMap; uniform float uOpacity;
      varying vec2 vUv;
      void main(){
        vec2 p=vUv-0.5;
        float r=length(p);
        float mask=1.0-smoothstep(0.475,0.5,r);
        vec4 t=texture2D(uMap,vUv);
        if(mask<0.01)discard;
        gl_FragColor=vec4(t.rgb,t.a*mask*uOpacity);
      }`,
    transparent:true,depthWrite:false
  });
  const portrait=new THREE.Mesh(new THREE.PlaneGeometry(2.1,2.1),portraitMat);
  portrait.position.z=0.1; kittyRig.add(portrait);

  const portraitGlow=createGlowSprite(0xffb0d0,3.5);
  portraitGlow.position.z=0.05; kittyRig.add(portraitGlow);

  /* 道具 */
  const props=[];
  function addProp(obj,x,y,z,scale,phase){
    obj.position.set(x,y,z); obj.scale.setScalar(scale);
    obj.userData={baseX:x,baseY:y,baseZ:z,phase:phase,spin:0.15+phase*0.04};
    obj.traverse(c=>{if(c.isMesh){c.castShadow=true; c.receiveShadow=true;}});
    stage.add(obj); props.push(obj);
  }
  addProp(createFlower(),-1.8,1.1,0.3,0.85,0.2);
  addProp(createCapsule(),1.7,1.2,0.4,1.1,1.3);
  addProp(createTestTube(),-1.9,-0.9,0.35,1.0,2.4);
  addProp(createRobot(),1.6,-1.0,0.45,0.9,3.5);
  addProp(createOcta(0xffca55,0xffaa30),1.9,0.2,0.55,1.0,4.2);
  addProp(createOcta(0xf2a2dc,0xf080c0),-1.5,0.3,0.5,1.0,5.1);

  const propGlows=[];
  props.forEach(p=>{
    const glow=createGlowSprite(0xffb0d0,1.2);
    glow.position.copy(p.position);
    stage.add(glow); propGlows.push(glow);
  });

  /* 粒子 */
  const particles=createParticles(reducedMotion?80:220);
  scene.add(particles.points);

  /* 地面阴影 */
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.ShadowMaterial({opacity:0.1}));
  ground.rotation.x=-Math.PI/2; ground.position.y=-2.5; ground.receiveShadow=true;
  scene.add(ground);

  /* 加载 Kitty 头像 */
  let ready=false;
  const loader=new THREE.TextureLoader();
  loader.load("assets/hello-kitty-avatar.png",(tex)=>{
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
    portraitUniforms.uMap.value=tex;
    ready=true; onReady?.();
  },undefined,()=>{onReady?.();});

  /* 交互状态 */
  let scrollProgress=0,targetScroll=0;
  let pointerX=0,pointerY=0,targetPX=0,targetPY=0;
  let prev=performance.now();

  function resize(){
    const w=Math.max(innerWidth,1),h=Math.max(innerHeight,1);
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,w<760?1.3:1.8));
    renderer.setSize(w,h,false);
    camera.aspect=w/h; camera.updateProjectionMatrix();
  }
  resize(); addEventListener("resize",resize,{passive:true});
  addEventListener("pointermove",(e)=>{
    targetPX=(e.clientX/innerWidth)*2-1;
    targetPY=-(e.clientY/innerHeight)*2+1;
  },{passive:true});

  /* 相机路径 */
  const camPath=[
    {pos:[0,0,7],look:[0,0,0]},
    {pos:[2,0.5,6],look:[0,0,0]},
    {pos:[-1.5,1,5.5],look:[0,0,0]},
    {pos:[1,0,6],look:[0,0.5,0]},
    {pos:[-2,0.5,5],look:[0,0,0]},
    {pos:[0,1,6.5],look:[0,0,0]},
  ];
  function getCamPos(t){
    const seg=t*(camPath.length-1); const i=Math.floor(seg); const f=seg-i;
    if(i>=camPath.length-1) return camPath[camPath.length-1];
    const a=camPath[i],b=camPath[i+1];
    return{
      pos:[a.pos[0]+(b.pos[0]-a.pos[0])*f,a.pos[1]+(b.pos[1]-a.pos[1])*f,a.pos[2]+(b.pos[2]-a.pos[2])*f],
      look:[a.look[0]+(b.look[0]-a.look[0])*f,a.look[1]+(b.look[1]-a.look[1])*f,a.look[2]+(b.look[2]-a.look[2])*f]
    };
  }

  function setScroll(p){targetScroll=p;}

  function frame(now){
    const dt=Math.min((now-prev)/1000,0.05); prev=now;
    scrollProgress=damp(scrollProgress,targetScroll,5,dt);
    pointerX=damp(pointerX,targetPX,4,dt); pointerY=damp(pointerY,targetPY,4,dt);

    /* 主题颜色渐变 */
    const seg=scrollProgress*(THEMES.length-1); const si=Math.floor(seg); const sf=seg-si;
    const t0=THEMES[Math.min(si,THEMES.length-1)]; const t1=THEMES[Math.min(si+1,THEMES.length-1)];
    const skyTop=lerpC(new THREE.Color(t0.sky[0]),new THREE.Color(t1.sky[0]),sf);
    const skyBot=lerpC(new THREE.Color(t0.sky[1]),new THREE.Color(t1.sky[1]),sf);
    const lightCol=lerpC(new THREE.Color(t0.light),new THREE.Color(t1.light),sf);
    const fogCol=lerpC(new THREE.Color(t0.fog),new THREE.Color(t1.fog),sf);
    skyMat.uniforms.uTop.value.copy(skyTop);
    skyMat.uniforms.uBottom.value.copy(skyBot);
    keyLight.color.copy(lightCol);
    scene.fog.color.copy(fogCol);
    pl1.color.copy(skyTop);
    pl2.color.copy(skyBot);

    /* 相机 */
    const cp=getCamPos(scrollProgress);
    camera.position.x=damp(camera.position.x,cp.pos[0]+pointerX*0.3,5,dt);
    camera.position.y=damp(camera.position.y,cp.pos[1]+pointerY*0.2,5,dt);
    camera.position.z=damp(camera.position.z,cp.pos[2],5,dt);
    camera.lookAt(cp.look[0],cp.look[1],cp.look[2]);

    /* 舞台可见性 */
    const stageVisible=scrollProgress<0.15;
    const targetVis=stageVisible?1:Math.max(0,1-(scrollProgress-0.15)*3);
    portraitUniforms.uOpacity.value=damp(portraitUniforms.uOpacity.value,targetVis,5,dt);
    stage.visible=targetVis>0.01;
    const vis=Math.max(0.01,targetVis);

    /* 动画 */
    if(!reducedMotion){
      const bob=Math.sin(now*0.00115)*0.14;
      kittyRig.position.y=damp(kittyRig.position.y,bob,8,dt);
      kittyRig.rotation.z=Math.sin(now*0.0008)*0.035+pointerX*0.025;
      rings.rotation.z+=dt*0.06;
      rings.rotation.y=Math.sin(now*0.00042)*0.08+pointerX*0.05;
      props.forEach((p,i)=>{
        p.position.y=p.userData.baseY+Math.sin(now*0.0012+p.userData.phase)*0.13;
        p.position.x=p.userData.baseX+Math.cos(now*0.00072+p.userData.phase)*0.035;
        p.rotation.y+=dt*p.userData.spin;
        p.rotation.x+=dt*p.userData.spin*0.58;
        if(propGlows[i]){propGlows[i].position.copy(p.position); propGlows[i].material.opacity=0.4*vis;}
      });
      portraitGlow.material.opacity=0.5*vis;
      particles.mat.uniforms.uTime.value=now*0.001;
    }

    stage.scale.setScalar(damp(stage.scale.x,0.5+vis*0.2,5,dt));
    renderer.render(scene,camera);
  }
  renderer.setAnimationLoop(frame);

  return{
    renderer,
    get ready(){return ready;},
    setScroll,
    dispose(){
      renderer.setAnimationLoop(null);
      removeEventListener("resize",resize);
      particles.geo.dispose(); particles.mat.dispose();
      renderer.dispose();
    }
  };
}