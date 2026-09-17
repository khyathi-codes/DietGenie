"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";

/* ─── Supabase (reads from env, gracefully no-ops if not configured) ─── */
const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabase     = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/* ════════════════════════════════════════════════════════════
   SECTION 1 — STAR FIELD (canvas)
   ════════════════════════════════════════════════════════════ */
function StarField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx    = canvas.getContext("2d")!;
    let raf: number;

    type Star = { x:number; y:number; r:number; a:number; da:number; twinkle:boolean };
    let stars: Star[] = [];

    function build(w:number, h:number) {
      stars = Array.from({ length: 260 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.8 + .2,
        a: Math.random(),
        da: (Math.random() * .004 + .001) * (Math.random() > .5 ? 1 : -1),
        twinkle: Math.random() > .5,
      }));
    }

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      build(canvas.width, canvas.height);
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        if (s.twinkle) {
          s.a += s.da;
          if (s.a > 1 || s.a < .05) s.da *= -1;
        }
        ctx.save();
        ctx.globalAlpha = Math.max(.05, Math.min(1, s.a));
        ctx.fillStyle   = "#fff";
        ctx.shadowColor = "#aaccff";
        ctx.shadowBlur  = s.r > 1.2 ? 5 : 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        // crosshair on big stars
        if (s.r > 1.5) {
          ctx.strokeStyle = "rgba(200,220,255,.35)";
          ctx.lineWidth   = .5;
          const l = s.r * 3.5;
          ctx.beginPath();
          ctx.moveTo(s.x - l, s.y); ctx.lineTo(s.x + l, s.y);
          ctx.moveTo(s.x, s.y - l); ctx.lineTo(s.x, s.y + l);
          ctx.stroke();
        }
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas ref={ref} style={{
      position:"absolute", inset:0,
      width:"100%", height:"100%",
      pointerEvents:"none", zIndex:0,
    }} />
  );
}

/* ════════════════════════════════════════════════════════════
   SECTION 2 — PARTICLE CANVAS (sparks, smoke, stars)
   ════════════════════════════════════════════════════════════ */
type Particle = {
  x:number; y:number; vx:number; vy:number;
  r:number; life:number; decay:number;
  color:string; type:"spark"|"smoke"|"star";
};

const P_COLORS = ["#FFD700","#FFA500","#00FFFF","#FF69B4","#9B59B6","#FFF8DC","#00CED1","#FFB347"];

function useParticleCanvas() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const particles  = useRef<Particle[]>([]);

  /* draw loop */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext("2d")!;
    let raf: number;

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener("resize", resize);

    function drawStar(ctx: CanvasRenderingContext2D, x:number, y:number, r:number) {
      ctx.save(); ctx.translate(x, y); ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(
          Math.cos((i*4*Math.PI/5) - Math.PI/2) * r,
          Math.sin((i*4*Math.PI/5) - Math.PI/2) * r
        );
      }
      ctx.closePath(); ctx.fill(); ctx.restore();
    }

    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const ps = particles.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.x += p.vx; p.y += p.vy; p.life -= p.decay;

        if (p.type === "smoke") {
          p.r += .45; p.vx *= .985;
          ctx.save();
          ctx.globalAlpha = p.life * .22;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0, "rgba(180,130,255,.55)");
          g.addColorStop(.5, "rgba(110,80,200,.25)");
          g.addColorStop(1, "rgba(60,30,150,0)");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        } else {
          ctx.save();
          ctx.globalAlpha    = Math.max(0, p.life * .92);
          ctx.fillStyle      = p.color;
          ctx.shadowColor    = p.color;
          ctx.shadowBlur     = p.type === "star" ? 10 : 6;
          if (p.type === "star") drawStar(ctx, p.x, p.y, p.r);
          else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill(); }
          ctx.restore();
        }
        if (p.life <= 0) ps.splice(i, 1);
      }
      raf = requestAnimationFrame(loop);
    }
    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  const addSmoke = useCallback((x:number, y:number) => {
    for (let i = 0; i < 2; i++) {
      particles.current.push({
        x: x + (Math.random()-.5)*18, y,
        vx:(Math.random()-.5)*.9, vy:-(Math.random()*2+.6),
        r: Math.random()*22+14, life:1,
        decay: Math.random()*.005+.003,
        color:"smoke", type:"smoke",
      });
    }
  }, []);

  const addSpark = useCallback((x:number, y:number) => {
    particles.current.push({
      x, y,
      vx:(Math.random()-.5)*2.5, vy:-(Math.random()*3+1),
      r: Math.random()*3.5+1.2, life:1,
      decay: Math.random()*.018+.009,
      color: P_COLORS[Math.floor(Math.random()*P_COLORS.length)],
      type: Math.random() > .4 ? "star" : "spark",
    });
  }, []);

  const addBurst = useCallback((x:number, y:number, n=55) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random()*Math.PI*2, spd = Math.random()*8+2;
      particles.current.push({
        x, y, vx:Math.cos(a)*spd, vy:Math.sin(a)*spd,
        r: Math.random()*5+2, life:1,
        decay: Math.random()*.022+.012,
        color: P_COLORS[Math.floor(Math.random()*P_COLORS.length)],
        type:"star",
      });
    }
  }, []);

  return { canvasRef, addSmoke, addSpark, addBurst };
}

/* ════════════════════════════════════════════════════════════
   SECTION 3 — SMOKE PUFFS (CSS animated divs)
   ════════════════════════════════════════════════════════════ */
function SmokePuffs() {
  const puffs = [
    { anim:"smoke-puff",   delay:"0s",    dur:"3.2s", size:52, x:-2,  blur:20, color:"rgba(150,110,255," },
    { anim:"smoke-puff-b", delay:".6s",   dur:"3.6s", size:44, x:10,  blur:18, color:"rgba(170,130,255," },
    { anim:"smoke-puff-c", delay:"1.2s",  dur:"4s",   size:58, x:-14, blur:22, color:"rgba(120,80,220,"  },
    { anim:"smoke-puff",   delay:"1.8s",  dur:"3.4s", size:34, x:4,   blur:14, color:"rgba(200,170,255," },
    { anim:"smoke-puff-b", delay:"2.4s",  dur:"3.8s", size:28, x:-8,  blur:12, color:"rgba(180,150,255," },
    { anim:"smoke-puff",   delay:".3s",   dur:"2.8s", size:16, x:1,   blur:8,  color:"rgba(255,220,100," },
    { anim:"smoke-puff-c", delay:".9s",   dur:"3.1s", size:13, x:6,   blur:7,  color:"rgba(255,200,80,"  },
    { anim:"smoke-puff-b", delay:".5s",   dur:"3.3s", size:18, x:16,  blur:9,  color:"rgba(0,220,255,"   },
    { anim:"smoke-puff",   delay:"1.5s",  dur:"3.7s", size:14, x:-18, blur:8,  color:"rgba(0,200,240,"   },
  ];

  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
      {puffs.map((p, i) => (
        <div key={i} style={{
          position:"absolute",
          bottom:"50%", left:"50%",
          width: p.size, height: p.size,
          marginLeft: p.x - p.size/2,
          borderRadius:"50%",
          background:`radial-gradient(circle at 40% 35%, ${p.color}.55), ${p.color}.22) 55%, ${p.color}0) 80%)`,
          filter:`blur(${p.blur}px)`,
          animation:`${p.anim} ${p.dur} ease-out ${p.delay} infinite`,
          transformOrigin:"center bottom",
        }}/>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   SECTION 4 — FLOATING AMBIENT SPARKLES (CSS)
   ════════════════════════════════════════════════════════════ */
function FloatingSparkles() {
  const items = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left: `${((i * 37) % 94) + 2}%`,
  top: `${((i * 53) % 88) + 4}%`,
  size: ((i * 17) % 9) + 3,
  color: P_COLORS[i % P_COLORS.length],
  delay: `${(i * 0.7) % 5}s`,
  dur: `${((i * 0.8) % 3) + 2}s`,
  shape: i % 3 === 0 ? "star" : "circle",
}));
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:1, overflow:"hidden" }}>
      {items.map(s => (
        <div key={s.id} style={{
          position:"absolute", left:s.left, top:s.top,
          width:s.size, height:s.size,
          borderRadius: s.shape === "circle" ? "50%" : "0",
          background: s.shape === "circle" ? s.color : undefined,
          filter: `drop-shadow(0 0 ${s.size}px ${s.color})`,
          animation:`sparkle-pop ${s.dur} ease-in-out ${s.delay} infinite`,
        }}>
          {s.shape === "star" && (
            <svg width={s.size} height={s.size} viewBox="0 0 20 20">
              <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" fill={s.color}/>
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   SECTION 5 — AURA RINGS behind genie
   ════════════════════════════════════════════════════════════ */
function AuraRings() {
  const rings = [
    { size:160, color:"rgba(100,200,255,.28)", delay:"0s",   dur:"3.2s" },
    { size:240, color:"rgba(120,180,255,.16)", delay:".5s",  dur:"3.8s" },
    { size:340, color:"rgba(100,150,255,.09)", delay:"1s",   dur:"4.5s" },
    { size:460, color:"rgba(80,120,240,.05)",  delay:"1.5s", dur:"5.2s" },
    { size:210, color:"rgba(255,200,80,.08)",  delay:".8s",  dur:"4.0s" },
  ];
  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:2 }}>
      {rings.map((r,i) => (
        <div key={i} style={{
          position:"absolute",
          top:"50%", left:"50%",
          width:r.size, height:r.size,
          border:`1px solid ${r.color}`,
          borderRadius:"50%",
          transform: "translate(-50%, -50%)",
          animation:`aura-ring ${r.dur} ease-out ${r.delay} infinite`,
        }}/>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   SECTION 6 — MYSTIC BACKGROUND
   ════════════════════════════════════════════════════════════ */
function MysticBackground() {
  return (
    <div style={{ position:"absolute", inset:0, zIndex:0 }}>
      {/* base */}
      <div style={{ position:"absolute", inset:0,
        background:"radial-gradient(ellipse at 50% 100%, #0a0530 0%, #020818 55%, #000005 100%)" }}/>
      {/* nebulae */}
      <div style={{ position:"absolute", top:"14%", left:"-8%", width:"52%", height:"65%",
        borderRadius:"50%",
        background:"radial-gradient(ellipse at center, rgba(75,25,160,.18) 0%, rgba(40,10,100,.08) 55%, transparent 82%)",
        filter:"blur(40px)",
        animation:"nebula-drift 9s ease-in-out infinite" }}/>
      <div style={{ position:"absolute", top:"8%", right:"-12%", width:"55%", height:"68%",
        borderRadius:"50%",
        background:"radial-gradient(ellipse at center, rgba(0,70,160,.14) 0%, rgba(0,35,100,.06) 55%, transparent 80%)",
        filter:"blur(50px)",
        animation:"nebula-drift 11s ease-in-out 2s infinite" }}/>
      <div style={{ position:"absolute", bottom:0, left:"18%", width:"64%", height:"52%",
        borderRadius:"50%",
        background:"radial-gradient(ellipse at center, rgba(55,18,115,.26) 0%, rgba(38,10,78,.12) 55%, transparent 82%)",
        filter:"blur(60px)",
        animation:"nebula-drift 13s ease-in-out 4s infinite" }}/>
      {/* horizon glow */}
      <div style={{ position:"absolute", bottom:0, left:"8%", right:"8%", height:"28%",
        background:"radial-gradient(ellipse at 50% 100%, rgba(60,20,120,.38) 0%, rgba(30,10,60,.16) 55%, transparent 82%)",
        filter:"blur(20px)" }}/>
      {/* horizontal shimmer line */}
      <div style={{ position:"absolute", bottom:"16%", left:"5%", right:"5%", height:1,
        background:"linear-gradient(90deg, transparent, rgba(195,145,255,.4) 30%, rgba(145,95,255,.6) 50%, rgba(195,145,255,.4) 70%, transparent)",
        animation:"nebula-drift 7s ease-in-out infinite" }}/>
      {/* vignettes */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:"22%",
        background:"linear-gradient(to bottom, rgba(0,0,5,.68) 0%, transparent 100%)" }}/>
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"18%",
        background:"linear-gradient(to top, rgba(0,0,5,.5) 0%, transparent 100%)" }}/>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   SECTION 7 — GET STARTED BUTTON
   ════════════════════════════════════════════════════════════ */
function GetStartedButton({ onClick }: { onClick: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const onMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const b = btnRef.current; if (!b) return;
    const r = b.getBoundingClientRect();
    const x = e.clientX - r.left - r.width/2;
    const y = e.clientY - r.top  - r.height/2;
    b.style.transform = `translate(${x*.35}px, ${y*.35}px) scale(1.06)`;
    b.style.transition = "transform .08s ease";
  };
  const onMouseLeave = () => {
    const b = btnRef.current; if (!b) return;
    b.style.transform = "translate(0,0) scale(1)";
    b.style.transition = "transform .5s cubic-bezier(.34,1.56,.64,1)";
  };

  return (
    <div style={{ position:"relative", display:"inline-flex", marginTop:"2.2rem" }}>
      {/* spinning conic border */}
      <div style={{
        position:"absolute", inset:-3, borderRadius:58,
        background:"conic-gradient(from 0deg, transparent 0%, #FFD700 25%, transparent 50%, #00FFFF 75%, transparent 100%)",
        animation:"btn-border-spin 3s linear infinite",
        opacity:.55,
      }}/>
      {/* glow halo */}
      <div style={{
        position:"absolute", inset:-14, borderRadius:68,
        background:"radial-gradient(ellipse at center, rgba(255,180,0,.28) 0%, rgba(255,100,0,.12) 55%, transparent 78%)",
        filter:"blur(8px)",
        animation:"pulse-glow 2.2s ease-in-out infinite",
        pointerEvents:"none",
      }}/>
      <button
        ref={btnRef}
        onClick={onClick}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{
          fontFamily:"'Cinzel', serif",
          fontSize:"clamp(.8rem, 1.5vw, .98rem)",
          fontWeight:700,
          letterSpacing:".22em",
          color:"#160800",
          background:"linear-gradient(135deg, #FFD700 0%, #FFF8DC 28%, #FFD700 52%, #FFA500 78%, #FFD700 100%)",
          backgroundSize:"250% 250%",
          border:"none",
          padding:"1rem 3.4rem",
          borderRadius:52,
          cursor:"pointer",
          position:"relative",
          boxShadow:"0 0 25px rgba(255,180,0,.7), 0 0 55px rgba(255,130,0,.4), inset 0 1px 0 rgba(255,255,200,.5)",
          animation:"gold-shimmer 4s ease infinite, pulse-glow 2.2s ease-in-out infinite",
          userSelect:"none",
          outline:"none",
          whiteSpace:"nowrap",
        }}
      >
        <span style={{ display:"flex", alignItems:"center", gap:".65rem" }}>
          <span style={{ display:"inline-block", animation:"sparkle-pop 1.6s ease-in-out infinite" }}>✦</span>
          Get Started
          <span style={{ display:"inline-block", animation:"sparkle-pop 1.6s ease-in-out .8s infinite" }}>✦</span>
        </span>
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   SECTION 8 — MAIN PAGE COMPONENT
   ════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const router  = useRouter();
  const [phase, setPhase]         = useState(0);
  const [checking, setChecking]   = useState(true);
  const [loggedIn, setLoggedIn]   = useState(false);

  const lampRef = useRef<HTMLDivElement>(null);
  const { canvasRef, addSmoke, addSpark, addBurst } = useParticleCanvas();

  /* ── Check Supabase session on mount ── */
  useEffect(() => {
    (async () => {
      if (!supabase) { setChecking(false); return; }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setLoggedIn(!!session);
      } catch { /* env vars missing or network error */ }
      setChecking(false);
    })();
  }, []);

  /* ── Cinematic intro timer ── */
  useEffect(() => {
    if (checking) return; 
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 200), // Lamp fades in
      setTimeout(() => setPhase(3), 300), // Smoke starts spawning instantly
      setTimeout(() => setPhase(4), 400), // Genie summons immediately 
      setTimeout(() => setPhase(5), 1500), // Title text fades in
      setTimeout(() => setPhase(6), 2000), // CTA Button appears
    ];
    return () => timers.forEach(clearTimeout);
  }, [checking]);

  /* ── Ambient smoke + sparks near spout ── */
  useEffect(() => {
    if (phase < 3) return;
    const id = setInterval(() => {
      const lamp = lampRef.current;
      if (!lamp) return;
      const r = lamp.getBoundingClientRect();
      /* Target the exact pixel location of the lamp spout on screen */
      const sx = r.left + r.width * 0.15;
      const sy = r.top  + r.height * 0.45;
      addSmoke(sx, sy);
      if (Math.random() > .55) addSpark(sx + (Math.random()-.5)*22, sy - 10);
    }, 60);
    return () => clearInterval(id);
  }, [phase, addSmoke, addSpark]);

  /* ── Ambient genie sparks ── */
  useEffect(() => {
    if (phase < 4) return;
    const id = setInterval(() => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight * .35;
      const a  = Math.random() * Math.PI * 2;
      const d  = Math.random() * 85 + 20;
      addSpark(cx + Math.cos(a)*d, cy + Math.sin(a)*d);
    }, 190);
    return () => clearInterval(id);
  }, [phase, addSpark]);

  /* ── Handle CTA ── */
  const handleGetStarted = useCallback(() => {
    const audio = new Audio("/magic.mp3");
    audio.volume = 1;
    audio.currentTime = 0;

    audio.play().then(() => {
      console.log("Sound playing");
    }).catch((err) => {
      console.log("Audio error:", err);
    });

    addBurst(window.innerWidth/2, window.innerHeight*.72, 60);
    setTimeout(() => {
      if (loggedIn) router.push("/dashboard");
      else          router.push("/auth/login");
    }, 380);
  }, [loggedIn, router, addBurst]);

  /* ── Inline animation helpers ── */
  const fadeStyle = (show: boolean, delay = "0s", extra: React.CSSProperties = {}): React.CSSProperties => ({
    opacity:    show ? 1 : 0,
    animation:  show ? `fade-in-up .9s ease ${delay} both` : "none",
    transition: "opacity .5s",
    ...extra,
  });

  return (
    <div style={{
      position:"fixed", inset:0, overflow:"hidden",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      background:"#020818",
    }}>
      {/* ── Black flash overlay ── */}
      {phase === 0 && (
        <div style={{
          position:"absolute", inset:0, background:"#000008", zIndex:999,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <div style={{
            fontFamily:"'Cinzel', serif", fontSize:".65rem",
            letterSpacing:".55em", color:"rgba(255,200,80,.3)",
          }}>
            ✦ DIET GENIE ✦
          </div>
        </div>
      )}

      {/* ── Background ── */}
      {phase >= 1 && <MysticBackground />}

      {/* ── Stars ── */}
      {phase >= 1 && <StarField />}

      {/* ── Floating scene sparkles ── */}
      {phase >= 2 && <FloatingSparkles />}

      {/* ── Particle canvas (sparks / smoke) ── */}
      <canvas ref={canvasRef} style={{
        position:"absolute", inset:0,
        width:"100%", height:"100%",
        pointerEvents:"none", zIndex:3,
      }}/>

      {/* ── Central Stage (Unified Layout Wrapper) ── */}
      <div style={{
        position:"relative", zIndex:5,
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        width:"100%", maxWidth:860,
        padding:"0 1.5rem",
      }}>

        {/* ── THE VISUAL THEATER WRAPPER ── */}
        <div 
          style={{ 
            position: "relative", 
            width: "360px", 
            height: "380px", 
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            alignItems: "center"
          }}
        >
          {/* AURA RINGS (Behind the Genie) */}
          {phase >= 4 && <AuraRings />}

          {/* GENIE — Anchored absolutely above the lamp spout */}
          {phase >= 4 && (
            <div
              style={{
                position: "absolute",
                bottom: "35px", /* Lowered from 100px to perfectly seat the tail in the spout */
                left: "50%",
                transform: "translateX(-50%)",
                width: "220px",
                height: "auto",
                zIndex: 1,
                transformOrigin: "bottom center",
                /* Triggers entry summon-genie keyframes, then defaults to floating loop */
                animation: "summon-genie 2s ease-out forwards, genie-float 4s ease-in-out infinite 2s",
              }}
            >
              {/* MAGIC GRADIENT GLOW GLOW UNDER GENIE */}
              <div
                style={{
                  position: "absolute",
                  bottom: "-15px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "140px",
                  height: "140px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(120,220,255,.45) 0%, rgba(120,100,255,.15) 50%, transparent 75%)",
                  filter: "blur(25px)",
                  zIndex: -1,
                }}
              />

              <Image
                src="/genie.png"
                alt="Genie"
                width={320}
                height={380}
                style={{
                  objectFit: "contain",
                  display: "block",
                  filter: "drop-shadow(0 0 25px rgba(0,200,255,.6)) drop-shadow(0 0 70px rgba(0,150,255,.4))",
                }}
                priority
              />
            </div>
          )}

          {/* LAMP CONTAINER */}
          {phase >= 2 && (
            <div 
              ref={lampRef} 
              style={{ 
                position: "relative",
                zIndex: 2,
                filter: "drop-shadow(0 0 20px rgba(255,200,0,.7)) drop-shadow(0 0 50px rgba(255,150,0,.4))",
                animation: "lamp-float 4s ease-in-out infinite",
              }}
            >
              {/* CSS smoke puffs nested cleanly inside the lamp boundaries */}
              {phase >= 3 && (
                <div style={{
                  position: "absolute",
                  left: "15%", top: "45%",
                  width: 1, height: 1,
                  zIndex: 9, pointerEvents: "none",
                }}>
                  <SmokePuffs/>
                </div>
              )}

              <Image
                src="/lamp.png"
                alt="Lamp"
                width={290}
                height={150}
                style={{
                  objectFit: "contain",
                  display: "block",
                }}
                priority
              />
            </div>
          )}
        </div>

        {/* HERO TEXT */}
        <div style={{ textAlign:"center", marginTop:"1.6rem", ...fadeStyle(phase >= 5) }}>
          {/* Decorative line */}
          <div style={{ display:"flex", justifySelf: "center", gap:12, marginBottom:14 }}>
            <div style={{ height:1, width:52,
              background:"linear-gradient(90deg, transparent, rgba(255,200,100,.55))" }}/>
            <span style={{ fontFamily:"'Cinzel', serif", fontSize:".55rem",
              letterSpacing:".5em", color:"rgba(255,200,100,.5)" }}>
            </span>
            <div style={{ height:1, width:52,
              background:"linear-gradient(90deg, rgba(255,200,100,.55), transparent)" }}/>
          </div>

          {/* Main title */}
          <h1 style={{
            fontFamily:"'Cinzel', serif",
            fontSize:"clamp(2rem, 6vw, 4rem)",
            fontWeight:900,
            letterSpacing:".32em",
            lineHeight:1,
            background:"linear-gradient(135deg, #B8860B 0%, #FFD700 30%, #FFF8DC 50%, #FFD700 70%, #B8860B 100%)",
            WebkitBackgroundClip:"text",
            WebkitTextFillColor:"transparent",
            textShadow:"0 0 40px rgba(255,215,0,.15)",
          }}>
            DIET GENIE
          </h1>

          <p style={{
            fontFamily:"'Cormorant Garamond', serif",
            fontSize:"clamp(1.1rem, 2.5vw, 1.45rem)",
            fontStyle:"italic",
            letterSpacing:".05em",
            color:"#aaccff",
            opacity:.8,
            marginTop:".8rem",
            maxWidth:540,
            marginLeft:"auto",
            marginRight:"auto",
          }}>
            your wish for the perfect diet is granted.
          </p>
        </div>

        {/* CTA BUTTON */}
        <div style={fadeStyle(phase >= 6, ".1s")}>
          <GetStartedButton onClick={handleGetStarted} />
        </div>

      </div>
    </div>
  );
}