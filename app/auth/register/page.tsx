/**
 * src/app/auth/register/page.tsx
 *
 * Diet Genie — Register Page
 *
 * Flow:
 *  1. User fills name / email / password / confirm
 *  2. supabase.auth.signUp() called
 *     a. If email-confirm is OFF in Supabase dashboard →
 *        session created immediately → redirect to /onboarding
 *     b. If email-confirm is ON →
 *        show "check your email" screen
 *  3. Google OAuth → /auth/callback → /onboarding
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter }                                 from "next/navigation";
import Link                                          from "next/link";
import { createBrowserClient }                       from "@/lib/supabase";

const supabase = createBrowserClient();

/* ── shared styles ─────────────────────────── */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,300;1,300;1,400&family=Raleway:wght@300;400;500;600&display=swap');

@keyframes gold-shimmer   { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
@keyframes nebula-drift   { 0%,100%{transform:scale(1) translate(0,0);opacity:.38} 50%{transform:scale(1.07) translate(12px,-8px);opacity:.62} }
@keyframes fade-up        { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
@keyframes card-glow      { 0%,100%{opacity:.55} 50%{opacity:1} }
@keyframes sparkle-pop    { 0%{transform:scale(0) rotate(0deg);opacity:1} 60%{transform:scale(1.3) rotate(180deg);opacity:.8} 100%{transform:scale(0) rotate(360deg);opacity:0} }
@keyframes btn-border-spin{ from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes pulse-glow     { 0%,100%{box-shadow:0 0 22px rgba(255,180,0,.6),0 0 50px rgba(255,130,0,.3)} 50%{box-shadow:0 0 42px rgba(255,210,0,1),0 0 90px rgba(255,160,0,.7)} }
@keyframes shake          { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-9px)} 40%,80%{transform:translateX(9px)} }
@keyframes slide-down     { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
@keyframes spin-loader    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes strength-grow  { from{width:0} to{width:100%} }
@keyframes envelope-float { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-10px) rotate(2deg)} }

html,body { margin:0;padding:0;background:#020818; }

.input-root input:-webkit-autofill,
.input-root input:-webkit-autofill:hover,
.input-root input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0px 1000px rgba(5,3,22,0) inset !important;
  -webkit-text-fill-color: rgba(230,220,255,.95) !important;
  transition: background-color 9999s ease-in-out 0s;
}
`;

/* ── Star canvas ─────────────────────────────── */
function StarCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!; const ctx = c.getContext("2d")!;
    type S = { x:number;y:number;r:number;a:number;da:number };
    let stars:S[] = [], raf:number;
    const build = (w:number,h:number) => {
      stars = Array.from({length:180},()=>({
        x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.6+.15,
        a:Math.random(),da:(Math.random()*.004+.001)*(Math.random()>.5?1:-1),
      }));
    };
    const resize = () => { c.width=window.innerWidth;c.height=window.innerHeight;build(c.width,c.height); };
    const draw   = () => {
      ctx.clearRect(0,0,c.width,c.height);
      for(const s of stars){
        s.a+=s.da; if(s.a>1||s.a<.04)s.da*=-1;
        ctx.save(); ctx.globalAlpha=Math.max(.04,s.a);
        ctx.fillStyle="#fff";ctx.shadowColor="#aaccff";ctx.shadowBlur=3;
        ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();
        ctx.restore();
      }
      raf=requestAnimationFrame(draw);
    };
    resize();window.addEventListener("resize",resize);draw();
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize)};
  },[]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}}/>;
}

/* ── Sparkles ─────────────────────────────────── */
function Sparkles() {
  const dots = [
    { left: "10%", top: "20%", size: 4, color: "#FFD700", delay: "0s", dur: "3s" },
    { left: "25%", top: "60%", size: 5, color: "#FFA500", delay: "1s", dur: "4s" },
    { left: "40%", top: "30%", size: 3, color: "#00FFFF", delay: "2s", dur: "3.5s" },
    { left: "55%", top: "75%", size: 6, color: "#FF69B4", delay: "0.5s", dur: "5s" },
    { left: "70%", top: "25%", size: 4, color: "#9B59B6", delay: "1.5s", dur: "4s" },
    { left: "85%", top: "50%", size: 5, color: "#FFF8DC", delay: "2.5s", dur: "3s" },
    { left: "15%", top: "80%", size: 4, color: "#FFD700", delay: "3s", dur: "4s" },
    { left: "35%", top: "15%", size: 5, color: "#FFA500", delay: "1s", dur: "5s" },
    { left: "50%", top: "45%", size: 3, color: "#00FFFF", delay: "2s", dur: "3s" },
    { left: "65%", top: "85%", size: 6, color: "#FF69B4", delay: "0s", dur: "4s" },
    { left: "80%", top: "35%", size: 4, color: "#9B59B6", delay: "2.5s", dur: "5s" },
    { left: "90%", top: "70%", size: 5, color: "#FFF8DC", delay: "1.5s", dur: "3.5s" },
    { left: "20%", top: "40%", size: 4, color: "#FFD700", delay: "3s", dur: "4.5s" },
    { left: "75%", top: "10%", size: 5, color: "#00FFFF", delay: "2s", dur: "4s" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {dots.map((d, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            borderRadius: "50%",
            background: d.color,
            filter: `drop-shadow(0 0 ${d.size}px ${d.color})`,
            animation: `sparkle-pop ${d.dur} ease-in-out ${d.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Password strength ─────────────────────────── */
function PasswordStrength({ pw }: { pw: string }) {
  if (!pw) return null;
  const checks = [pw.length>=8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)];
  const score  = checks.filter(Boolean).length;
  const label  = ["","Too short","Fair","Good","Strong"][score];
  const color  = ["","#ff5555","#FFA500","#FFD700","#4ade80"][score];
  const pct    = ["0%","25%","50%","75%","100%"][score];
  return (
    <div style={{marginTop:"-1rem",marginBottom:"1.1rem"}}>
      <div style={{height:3,borderRadius:4,background:"rgba(255,255,255,.07)",overflow:"hidden"}}>
        <div style={{
          height:"100%",borderRadius:4,width:pct,
          background:color, boxShadow:`0 0 8px ${color}88`,
          transition:"width .4s ease,background .4s ease",
        }}/>
      </div>
      <p style={{
        marginTop:4,textAlign:"right",fontFamily:"'Raleway',sans-serif",
        fontSize:".68rem",letterSpacing:".08em",color,opacity:.85,
      }}>{label}</p>
    </div>
  );
}

/* ── Floating label input ──────────────────────── */
interface InputProps {
  id:string;label:string;type?:string;value:string;
  onChange:(v:string)=>void;error?:string;hint?:string;
  icon:string;autoComplete?:string;disabled?:boolean;
}
function FloatInput({id,label,type="text",value,onChange,error,hint,icon,autoComplete,disabled}:InputProps) {
  const [focused,setFocused]=useState(false);
  const lifted=focused||value.length>0;
  return (
    <div style={{position:"relative",marginBottom:error?".5rem":"1.38rem"}}>
      <div className="input-root" style={{
        position:"relative",borderRadius:12,
        border:`1px solid ${error?"rgba(255,80,80,.65)":focused?"rgba(255,200,80,.6)":"rgba(255,255,255,.09)"}`,
        background:focused?"rgba(255,200,80,.035)":"rgba(255,255,255,.025)",
        boxShadow:error?"0 0 0 1px rgba(255,80,80,.18)":focused?"0 0 0 1px rgba(255,200,80,.12),0 0 22px rgba(255,180,0,.07)":"none",
        transition:"border-color .22s,background .22s,box-shadow .22s",
        opacity:disabled?.55:1,
      }}>
        <span style={{
          position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",
          fontSize:"1rem",opacity:lifted?.92:.32,transition:"opacity .22s",
          pointerEvents:"none",zIndex:2,lineHeight:1,
        }}>{icon}</span>
        <label htmlFor={id} style={{
          position:"absolute",left:46,
          top:lifted?8:"50%",
          transform:lifted?"translateY(0) scale(.75)":"translateY(-50%)",
          transformOrigin:"left center",
          fontFamily:"'Raleway',sans-serif",fontSize:".9rem",
          color:error?"rgba(255,120,120,.85)":focused?"rgba(255,200,80,.88)":"rgba(180,160,255,.48)",
          transition:"all .22s cubic-bezier(.4,0,.2,1)",
          pointerEvents:"none",zIndex:2,letterSpacing:".04em",
        }}>{label}</label>
        <input id={id} type={type} value={value} autoComplete={autoComplete}
          disabled={disabled}
          onChange={e=>onChange(e.target.value)}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          style={{
            display:"block",width:"100%",
            paddingTop:24,paddingBottom:10,paddingLeft:46,paddingRight:16,
            background:"transparent",border:"none",outline:"none",
            fontFamily:"'Raleway',sans-serif",fontSize:".95rem",
            color:"rgba(230,220,255,.95)",letterSpacing:".03em",boxSizing:"border-box",
          }}
        />
      </div>
      {error&&<p style={{margin:"5px 0 1.2rem 14px",fontFamily:"'Raleway',sans-serif",
        fontSize:".72rem",color:"rgba(255,110,110,.88)",animation:"slide-down .2s ease both"}}>⚠ {error}</p>}
      {hint&&!error&&<p style={{margin:"5px 0 0 14px",fontFamily:"'Raleway',sans-serif",
        fontSize:".7rem",color:"rgba(160,140,220,.4)",letterSpacing:".03em"}}>{hint}</p>}
    </div>
  );
}

/* ── Gold submit button ─────────────────────────── */
function GoldButton({loading,children,disabled}:{loading?:boolean;children:React.ReactNode;disabled?:boolean}){
  return (
    <div style={{position:"relative",marginBottom:"1.2rem"}}>
      <div style={{position:"absolute",inset:-2,borderRadius:54,
        background:"conic-gradient(from 0deg,transparent 0%,#FFD700 25%,transparent 50%,#00FFFF 75%,transparent 100%)",
        animation:"btn-border-spin 3s linear infinite",opacity:.5,zIndex:0}}/>
      <button type="submit" disabled={disabled||loading} style={{
        position:"relative",zIndex:1,
        width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:".6rem",
        fontFamily:"'Cinzel',serif",fontSize:".88rem",fontWeight:700,letterSpacing:".2em",
        color:disabled||loading?"rgba(22,8,0,.5)":"#160800",
        background:"linear-gradient(135deg,#FFD700 0%,#FFF8DC 28%,#FFD700 52%,#FFA500 78%,#FFD700 100%)",
        backgroundSize:"260% 260%",border:"none",padding:".96rem",borderRadius:52,
        cursor:disabled||loading?"default":"pointer",
        boxShadow:"0 0 26px rgba(255,180,0,.62),0 0 58px rgba(255,130,0,.38),inset 0 1px 0 rgba(255,255,200,.5)",
        animation:"gold-shimmer 4s ease infinite,pulse-glow 2.4s ease-in-out infinite",
        opacity:disabled||loading?.72:1,transition:"opacity .2s",
      }}>
        {loading?(
          <>{
            <svg width="18" height="18" viewBox="0 0 20 20" style={{animation:"spin-loader .75s linear infinite"}}>
              <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(22,8,0,.35)" strokeWidth="2.5"/>
              <path d="M10 2 A8 8 0 0 1 18 10" fill="none" stroke="#160800" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          }Creating account…</>
        ):children}
      </button>
    </div>
  );
}

/* ── Google OAuth button ─────────────────────────── */
function GoogleButton({onClick,disabled}:{onClick:()=>void;disabled?:boolean}){
  const [h,setH]=useState(false);
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{
        width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:".65rem",
        fontFamily:"'Raleway',sans-serif",fontSize:".86rem",fontWeight:500,letterSpacing:".04em",
        color:"rgba(220,210,255,.85)",
        background:h?"rgba(255,255,255,.07)":"rgba(255,255,255,.04)",
        border:`1px solid ${h?"rgba(255,255,255,.18)":"rgba(255,255,255,.09)"}`,
        padding:".88rem",borderRadius:12,cursor:disabled?"default":"pointer",
        transition:"background .22s,border-color .22s",outline:"none",opacity:disabled?.55:1,
      }}>
      <svg width="18" height="18" viewBox="0 0 48 48" style={{flexShrink:0}}>
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      Continue with Google
    </button>
  );
}

/* ── Email-sent confirmation screen ─────────────── */
function EmailSentScreen({ email, onResend }: { email:string; onResend:()=>void }) {
  return (
    <div style={{textAlign:"center",padding:"1.5rem 0 .5rem",animation:"fade-up .5s ease both"}}>
      <div style={{
        fontSize:"3.2rem",marginBottom:"1rem",
        display:"inline-block",
        animation:"envelope-float 3s ease-in-out infinite",
      }}>📬</div>
      <h2 style={{
        fontFamily:"'Cinzel',serif",fontSize:"1rem",fontWeight:700,
        letterSpacing:".18em",color:"rgba(255,200,80,.92)",marginBottom:".65rem",
      }}>CHECK YOUR EMAIL</h2>
      <p style={{
        fontFamily:"'Raleway',sans-serif",fontSize:".82rem",lineHeight:1.75,
        letterSpacing:".03em",color:"rgba(180,160,255,.7)",marginBottom:"1.6rem",
      }}>
        A confirmation link was sent to<br/>
        <strong style={{color:"rgba(255,200,80,.82)"}}>{email}</strong>.<br/>
        Click it to activate your Diet Genie account.
      </p>
      <button onClick={onResend} style={{
        background:"none",border:"none",cursor:"pointer",
        fontFamily:"'Raleway',sans-serif",fontSize:".74rem",
        color:"rgba(255,200,80,.52)",letterSpacing:".08em",
        textDecoration:"underline",marginBottom:"1.2rem",
      }}>Didn&apos;t receive it? Resend email</button>
      <div style={{
        height:1,background:"rgba(255,255,255,.06)",margin:"1rem 0",
      }}/>
      <Link href="/auth/login" style={{
        fontFamily:"'Raleway',sans-serif",fontSize:".78rem",
        color:"rgba(180,160,255,.5)",textDecoration:"none",letterSpacing:".04em",
      }}>← Back to sign in</Link>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function RegisterPage() {
  const router = useRouter();

  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errors,    setErrors]    = useState<Record<string,string>>({});

  const cardRef = useRef<HTMLDivElement>(null);

  const shake = useCallback(() => {
    const el=cardRef.current; if(!el) return;
    el.style.animation="none";
    requestAnimationFrame(()=>{ el.style.animation="shake .4s ease"; });
  },[]);

  const validate = (): boolean => {
    const e: Record<string,string> = {};
    if (!name.trim())                      e.name     = "Name is required";
    else if (name.trim().length < 2)       e.name     = "Please enter your full name";
    if (!email.trim())                     e.email    = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email    = "Enter a valid email address";
    if (!password)                         e.password = "Password is required";
    else if (password.length < 8)         e.password = "Minimum 8 characters";
    if (!confirm)                          e.confirm  = "Please confirm your password";
    else if (confirm !== password)         e.confirm  = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { shake(); return; }
    setLoading(true); setErrors({});

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setLoading(false);
      setErrors({ form: error.message });
      shake(); return;
    }

    /*
     * If email confirmation is disabled in Supabase dashboard:
     * data.session will be present → redirect immediately.
     *
     * If email confirmation is required:
     * data.session is null → show "check your email" screen.
     */
    if (data.session) {
      router.push("/onboarding");
    } else {
      setLoading(false);
      setEmailSent(true);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleResend = async () => {
    await supabase.auth.resend({ type: "signup", email });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div style={{
        position:"fixed",inset:0,overflow:"auto",
        display:"flex",alignItems:"center",justifyContent:"center",
        background:"radial-gradient(ellipse at 50% 100%,#0a0530 0%,#020818 55%,#000005 100%)",
        fontFamily:"'Raleway',sans-serif",padding:"1.5rem 1rem",
        minHeight:"100vh",
      }}>
        {/* nebulae */}
        <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden"}}>
          {[
            {t:"8%",  l:"-14%",   w:"52%",h:"72%",c:"rgba(70,22,155,.2)", dur:"9s",  del:"0s"},
            {t:"4%",  l:"auto",   w:"56%",h:"74%",c:"rgba(0,65,155,.15)", dur:"12s", del:"2.2s"},
            {t:"auto",l:"14%",    w:"72%",h:"52%",c:"rgba(55,16,112,.28)",dur:"14s", del:"4s"},
          ].map((n,i)=>(
            <div key={i} style={{
              position:"absolute",top:n.t,left:n.l,
              right:i===1?"-16%":undefined,bottom:i===2?"0":undefined,
              width:n.w,height:n.h,borderRadius:"50%",
              background:`radial-gradient(ellipse at center,${n.c} 0%,transparent 75%)`,
              filter:"blur(48px)",
              animation:`nebula-drift ${n.dur} ease-in-out ${n.del} infinite`,
            }}/>
          ))}
        </div>

        <StarCanvas/>
        <Sparkles/>

        {/* ── CARD ── */}
        <div ref={cardRef} style={{
          position:"relative",zIndex:10,
          width:"100%",maxWidth:460,
          animation:"fade-up .7s cubic-bezier(.16,1,.3,1) both",
          margin:"auto",
        }}>
          {/* animated card border */}
          <div style={{
            position:"absolute",inset:-1.5,borderRadius:23,zIndex:0,
            background:"linear-gradient(135deg,rgba(0,200,255,.32),rgba(255,200,80,.3),rgba(150,80,255,.24),rgba(0,200,255,.32))",
            backgroundSize:"300% 300%",
            animation:"gold-shimmer 6s ease infinite,card-glow 3s ease-in-out infinite",
          }}/>

          {/* glass body */}
          <div style={{
            position:"relative",zIndex:1,
            background:"rgba(5,3,22,.90)",
            backdropFilter:"blur(32px)",WebkitBackdropFilter:"blur(32px)",
            borderRadius:22,padding:"2.4rem 2.2rem 2rem",
          }}>

            {/* header */}
            <div style={{textAlign:"center",marginBottom:"2rem"}}>
              <div style={{
                display:"inline-flex",alignItems:"center",justifyContent:"center",
                width:58,height:58,borderRadius:"50%",marginBottom:".9rem",
                background:"linear-gradient(135deg,rgba(0,200,255,.12),rgba(100,50,200,.07))",
                border:"1px solid rgba(0,200,255,.24)",fontSize:"1.65rem",
                boxShadow:"0 0 26px rgba(0,180,255,.22),inset 0 0 20px rgba(0,150,255,.05)",
              }}>🧞</div>
              <h1 style={{
                fontFamily:"'Cinzel',serif",fontWeight:900,
                fontSize:"1.55rem",letterSpacing:".22em",marginBottom:".38rem",
                background:"linear-gradient(135deg,#B8860B,#FFD700,#FFF8DC,#FFD700,#B8860B)",
                backgroundSize:"300% 300%",
                WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",
                animation:"gold-shimmer 5s ease infinite",
              }}>DIET GENIE</h1>
              <p style={{
                fontFamily:"'Cormorant Garamond',serif",
                fontSize:"1.02rem",fontStyle:"italic",fontWeight:300,
                color:"rgba(200,178,255,.72)",letterSpacing:".1em",
              }}>Begin your magical health journey.</p>
            </div>

            {/* email-sent confirmation */}
            {emailSent ? (
              <EmailSentScreen email={email} onResend={handleResend}/>
            ) : (
              <form onSubmit={handleRegister} noValidate>

                {/* form-level error */}
                {errors.form && (
                  <div style={{
                    padding:".72rem 1rem",borderRadius:10,marginBottom:"1.2rem",
                    background:"rgba(255,60,60,.07)",border:"1px solid rgba(255,80,80,.22)",
                    fontFamily:"'Raleway',sans-serif",fontSize:".76rem",
                    color:"rgba(255,120,120,.9)",animation:"slide-down .25s ease both",
                  }}>⚠ {errors.form}</div>
                )}

                <FloatInput id="name" label="Full name" value={name}
                  onChange={setName} error={errors.name} icon="✨"
                  autoComplete="name" disabled={loading}/>

                <FloatInput id="email" label="Email address" type="email"
                  value={email} onChange={setEmail} error={errors.email}
                  icon="✉" autoComplete="email" disabled={loading}/>

                <FloatInput id="password" label="Password" type="password"
                  value={password} onChange={setPassword} error={errors.password}
                  icon="🔑" autoComplete="new-password" disabled={loading}
                  hint="Use 8+ characters with uppercase, numbers & symbols"/>

                <PasswordStrength pw={password}/>

                <FloatInput id="confirm" label="Confirm password" type="password"
                  value={confirm} onChange={setConfirm} error={errors.confirm}
                  icon="🔒" autoComplete="new-password" disabled={loading}/>

                {/* terms */}
                <p style={{
                  fontFamily:"'Raleway',sans-serif",fontSize:".7rem",
                  color:"rgba(140,120,200,.42)",letterSpacing:".03em",
                  marginBottom:"1.3rem",lineHeight:1.65,
                }}>
                  By creating an account you agree to our{" "}
                  <a href="#" style={{color:"rgba(255,200,80,.52)",textDecoration:"none"}}>Terms</a>{" "}
                  and{" "}
                  <a href="#" style={{color:"rgba(255,200,80,.52)",textDecoration:"none"}}>Privacy Policy</a>.
                </p>

                <GoldButton loading={loading} disabled={loading}>
                  ✦ &nbsp; Create Account &nbsp; ✦
                </GoldButton>

                {/* divider */}
                <div style={{
                  display:"flex",alignItems:"center",gap:"1rem",
                  margin:"1.2rem 0",color:"rgba(120,100,180,.32)",fontSize:".72rem",
                }}>
                  <div style={{flex:1,height:1,background:"rgba(255,255,255,.06)"}}/>
                  <span style={{fontFamily:"'Raleway',sans-serif",letterSpacing:".1em",whiteSpace:"nowrap"}}>or continue with</span>
                  <div style={{flex:1,height:1,background:"rgba(255,255,255,.06)"}}/>
                </div>

                <GoogleButton onClick={handleGoogle} disabled={loading}/>

                {/* login link */}
                <p style={{
                  textAlign:"center",marginTop:"1.6rem",
                  fontFamily:"'Raleway',sans-serif",fontSize:".78rem",
                  color:"rgba(160,140,220,.48)",letterSpacing:".04em",
                }}>
                  Already have an account?{" "}
                  <Link href="/auth/login" style={{
                    color:"rgba(255,200,80,.75)",textDecoration:"none",fontWeight:600,
                  }}>Sign in ✦</Link>
                </p>
              </form>
            )}
          </div>
        </div>

        {/* back to home */}
        <Link href="/" style={{
          position:"fixed",top:20,left:20,zIndex:60,
          fontFamily:"'Cinzel',serif",fontSize:".58rem",letterSpacing:".24em",
          color:"rgba(255,200,80,.32)",textDecoration:"none",
          border:"1px solid rgba(255,200,80,.12)",
          padding:".3rem .9rem",borderRadius:20,background:"transparent",
        }}>← Home</Link>
      </div>
    </>
  );
}
