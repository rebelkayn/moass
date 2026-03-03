import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONFIG ───
const POO_COLORS = [
  "hue-rotate(0deg)","hue-rotate(90deg) saturate(2)","hue-rotate(180deg) saturate(1.5)",
  "hue-rotate(270deg) saturate(2)","hue-rotate(45deg) saturate(1.8)","hue-rotate(320deg) saturate(2.5)",
];
const STAR_COUNT = 100;
const EARTH_RADIUS_PCT = 0.1;
const BASE_SPEED = 1.0;
const SPEED_INCREMENT = 0.15;
const BASE_SPAWN_INTERVAL = 1800;
const MAX_POOS = 8;
const MAX_PLAYS_PER_DAY = 3;
const SECRET_CODE = "POOP4LIFE";
const BOSS_INTERVAL = 25;
const POWERUP_CHANCE = 0.12;
const NEAR_MISS_DIST_MULT = 2.2;

const DEFAULT_LB = [
  { name: "PooSlayer99", score: 47 },
  { name: "EarthGuardian", score: 35 },
  { name: "CosmicFlusher", score: 28 },
  { name: "AstroWiper", score: 19 },
  { name: "SpacePlunger", score: 12 },
];

const MILESTONES = [
  { at: 10, title: "CADET", emoji: "🎖️", color: "#60a5fa" },
  { at: 25, title: "COMMANDER", emoji: "⭐", color: "#a78bfa" },
  { at: 50, title: "ADMIRAL", emoji: "🔥", color: "#fb923c" },
  { at: 75, title: "LEGEND", emoji: "💎", color: "#22d3ee" },
  { at: 100, title: "GALACTIC GOD", emoji: "👑", color: "#fbbf24" },
];

const POWERUP_TYPES = [
  { type: "shield", emoji: "🛡️", color: "#3b82f6", duration: 0, label: "SHIELD!" },
  { type: "freeze", emoji: "❄️", color: "#67e8f9", duration: 3000, label: "FREEZE!" },
  { type: "bomb", emoji: "💣", color: "#f87171", duration: 0, label: "BOOM!" },
  { type: "double", emoji: "⭐", color: "#fbbf24", duration: 5000, label: "2X POINTS!" },
];

const ZONES = [
  { minScore: 0, bg1: "#0a0e27", bg2: "#050816", nebula: "rgba(100,50,180,0.06)", name: "Deep Space" },
  { minScore: 15, bg1: "#0f1a2e", bg2: "#0a1020", nebula: "rgba(80,80,200,0.08)", name: "Asteroid Belt" },
  { minScore: 30, bg1: "#1a0a0a", bg2: "#100505", nebula: "rgba(200,50,50,0.08)", name: "Red Nebula" },
  { minScore: 50, bg1: "#0a0a1a", bg2: "#050510", nebula: "rgba(150,50,200,0.1)", name: "Dark Sector" },
  { minScore: 75, bg1: "#000005", bg2: "#000000", nebula: "rgba(50,50,100,0.06)", name: "Black Hole Zone" },
];

function rand(a, b) { return Math.random() * (b - a) + a; }
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
function dist(x1, y1, x2, y2) { return Math.sqrt((x1-x2)**2 + (y1-y2)**2); }
function getTodayKey() { return new Date().toISOString().split("T")[0]; }

let idC = 0;
const stars = Array.from({ length: STAR_COUNT }, (_, i) => ({
  id: i, x: Math.random()*100, y: Math.random()*100, size: rand(1,3), op: rand(0.3,1), ts: rand(1.5,4), td: rand(0,3),
}));

function mkPoo(cx, cy, speed, gw, gh, isBoss = false) {
  const angle = rand(0, Math.PI * 2);
  const d = Math.max(gw, gh) * 0.6 + rand(0, Math.max(gw, gh) * 0.15);
  const sx = cx + Math.cos(angle) * d;
  const sy = cy + Math.sin(angle) * d;
  const dx = cx - sx, dy = cy - sy, mag = Math.sqrt(dx*dx + dy*dy);
  const off = rand(-0.12, 0.12);
  const co = Math.cos(off), so = Math.sin(off);
  const ndx = (dx/mag)*co - (dy/mag)*so;
  const ndy = (dx/mag)*so + (dy/mag)*co;
  const zigzag = !isBoss && Math.random() < 0.25 + speed * 0.02;
  return {
    id: ++idC, x: sx, y: sy,
    vx: ndx * speed * rand(0.9, 1.1) * (isBoss ? 0.6 : 1),
    vy: ndy * speed * rand(0.9, 1.1) * (isBoss ? 0.6 : 1),
    size: isBoss ? 64 : rand(36, 50),
    rot: rand(0,360), rotSpd: rand(-3,3),
    color: POO_COLORS[randInt(0, POO_COLORS.length-1)],
    tapped: false, scale: 1,
    isBoss, bossHp: isBoss ? 3 : 1, bossMaxHp: isBoss ? 3 : 1,
    zigzag, zigAmp: rand(1.5, 3), zigFreq: rand(0.03, 0.07), zigT: 0,
    frozen: false,
  };
}

function mkPowerup(cx, cy, gw, gh) {
  const type = POWERUP_TYPES[randInt(0, POWERUP_TYPES.length - 1)];
  const angle = rand(0, Math.PI * 2);
  const d = Math.max(gw, gh) * 0.55;
  const sx = cx + Math.cos(angle) * d;
  const sy = cy + Math.sin(angle) * d;
  const dx = cx - sx, dy = cy - sy, mag = Math.sqrt(dx*dx + dy*dy);
  return {
    id: ++idC, x: sx, y: sy,
    vx: (dx/mag) * 1.2, vy: (dy/mag) * 1.2,
    ...type, size: 38, rot: 0, tapped: false, scale: 1,
  };
}

// ─── STORE ───
const store = { lb: [...DEFAULT_LB], plays: {}, _fp: null };
function fp() { if (!store._fp) store._fp = "u_" + Math.random().toString(36).slice(2,10); return store._fp; }
function playsToday() { const k = getTodayKey(); return store.plays[k]?.[fp()] || 0; }
function incPlays() { const k = getTodayKey(); if (!store.plays[k]) store.plays[k] = {}; store.plays[k][fp()] = (store.plays[k][fp()]||0)+1; }
function rstPlays() { const k = getTodayKey(); if (store.plays[k]) store.plays[k][fp()] = 0; }
function getLb() { return [...store.lb].sort((a,b) => b.score - a.score).slice(0,5); }
function addLb(name, score) { store.lb.push({name,score}); store.lb.sort((a,b)=>b.score-a.score); store.lb = store.lb.slice(0,5); }

export default function Game() {
  const [phase, setPhase] = useState("start");
  const [score, setScore] = useState(0);
  const [poos, setPoos] = useState([]);
  const [powerups, setPowerups] = useState([]);
  const [effects, setEffects] = useState([]);
  const [particles, setParticles] = useState([]);
  const [explosions, setExplosions] = useState([]);
  const [speedMult, setSpeedMult] = useState(1);
  const [earthHit, setEarthHit] = useState(false);
  const [combo, setCombo] = useState(0);
  const [shieldFlash, setShieldFlash] = useState(false);
  const [earthRot, setEarthRot] = useState(0);
  const [username, setUsername] = useState("");
  const [playsLeft, setPlaysLeft] = useState(MAX_PLAYS_PER_DAY - playsToday());
  const [lb, setLb] = useState(getLb());
  const [showCode, setShowCode] = useState(false);
  const [codeIn, setCodeIn] = useState("");
  const [codeErr, setCodeErr] = useState("");
  const [codeOk, setCodeOk] = useState(false);
  const [showName, setShowName] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [milestone, setMilestone] = useState(null);
  const [hasShield, setHasShield] = useState(false);
  const [activePower, setActivePower] = useState(null);
  const [frozen, setFrozen] = useState(false);
  const [doublePoints, setDoublePoints] = useState(false);
  const [warningRing, setWarningRing] = useState(false);
  const [nearMissBonus, setNearMissBonus] = useState(null);
  const [zone, setZone] = useState(ZONES[0]);
  const [screenShake, setScreenShake] = useState(false);

  const gameRef = useRef(null);
  const animRef = useRef(null);
  const spawnRef = useRef(null);
  const pr = useRef({ phase:"start", score:0, speed:1, poos:[], powerups:[], frozen:false, shield:false, double:false });
  const gaRef = useRef({ w:400, h:700 });
  const eRef = useRef({ x:200, y:350, r:40 });
  const milestoneHit = useRef(new Set());

  const sync = (k,v) => { pr.current[k] = v; };
  useEffect(() => sync("phase", phase), [phase]);
  useEffect(() => sync("score", score), [score]);
  useEffect(() => sync("speed", speedMult), [speedMult]);
  useEffect(() => sync("poos", poos), [poos]);
  useEffect(() => sync("powerups", powerups), [powerups]);
  useEffect(() => sync("frozen", frozen), [frozen]);
  useEffect(() => sync("shield", hasShield), [hasShield]);
  useEffect(() => sync("double", doublePoints), [doublePoints]);

  // Zone progression
  useEffect(() => {
    const z = [...ZONES].reverse().find(z => score >= z.minScore) || ZONES[0];
    if (z.name !== zone.name) setZone(z);
  }, [score, zone.name]);

  // Milestone checks
  useEffect(() => {
    const m = MILESTONES.find(m => score === m.at && !milestoneHit.current.has(m.at));
    if (m) {
      milestoneHit.current.add(m.at);
      setMilestone(m);
      setTimeout(() => setMilestone(null), 2500);
    }
  }, [score]);

  useEffect(() => {
    const upd = () => {
      if (gameRef.current) {
        const w = gameRef.current.clientWidth, h = gameRef.current.clientHeight;
        gaRef.current = { w, h };
        eRef.current = { x: w/2, y: h/2, r: Math.min(w,h) * EARTH_RADIUS_PCT };
      }
    };
    upd(); window.addEventListener("resize", upd);
    return () => window.removeEventListener("resize", upd);
  }, []);

  const doSpawn = useCallback(() => {
    if (pr.current.phase !== "playing") return;
    const { w, h } = gaRef.current;
    const cx = w/2, cy = h/2;
    const spd = BASE_SPEED * pr.current.speed;
    const active = pr.current.poos.filter(p => !p.tapped);
    if (active.length >= MAX_POOS) return;

    const toAdd = Math.min(2, MAX_POOS - active.length);
    const isBossTime = pr.current.score > 0 && pr.current.score % BOSS_INTERVAL === 0 && !active.some(p => p.isBoss);

    const np = [];
    if (isBossTime) {
      np.push(mkPoo(cx, cy, spd, w, h, true));
    }
    for (let i = 0; i < toAdd; i++) np.push(mkPoo(cx, cy, spd, w, h, false));

    // Powerup spawn
    if (Math.random() < POWERUP_CHANCE && pr.current.powerups.filter(p=>!p.tapped).length < 2) {
      setPowerups(prev => [...prev, mkPowerup(cx, cy, w, h)]);
    }

    setPoos(prev => [...prev, ...np]);
  }, []);

  const triggerShake = useCallback(() => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 150);
  }, []);

  const gameLoop = useCallback(() => {
    if (pr.current.phase !== "playing") return;
    setEarthRot(r => r + 0.3);
    const earth = eRef.current;
    const isFrozen = pr.current.frozen;

    // Update poos
    setPoos(prev => {
      const updated = [];
      let hit = false;
      const newFx = [];
      let warn = false;

      for (const p of prev) {
        if (p.tapped) {
          if (p.scale > 0.1) updated.push({ ...p, scale: p.scale * 0.8 });
          continue;
        }

        const spdMult = isFrozen ? 0.2 : 1;
        let nx, ny;
        if (p.zigzag) {
          const zt = p.zigT + p.zigFreq;
          const perp = Math.atan2(p.vy, p.vx) + Math.PI/2;
          const zig = Math.sin(zt * 40) * p.zigAmp;
          nx = p.x + p.vx * spdMult + Math.cos(perp) * zig * spdMult;
          ny = p.y + p.vy * spdMult + Math.sin(perp) * zig * spdMult;
          updated.push({ ...p, x: nx, y: ny, rot: p.rot + p.rotSpd, zigT: zt });
        } else {
          nx = p.x + p.vx * spdMult;
          ny = p.y + p.vy * spdMult;
          updated.push({ ...p, x: nx, y: ny, rot: p.rot + p.rotSpd });
        }

        const d = dist(nx, ny, earth.x, earth.y);
        const hitD = earth.r + p.size * 0.3;

        // Warning ring
        if (d < earth.r * NEAR_MISS_DIST_MULT + p.size) warn = true;

        if (d < hitD) {
          if (pr.current.shield) {
            setHasShield(false);
            newFx.push({ id: p.id, x: nx, y: ny, text: "🛡️ BLOCKED!", color: "#3b82f6" });
            updated.pop(); // remove this poo
            continue;
          }
          hit = true;
          setExplosions(e => [...e, { id: p.id, x: nx, y: ny }]);
          setTimeout(() => setExplosions(e => e.filter(x => x.id !== p.id)), 800);
          updated.pop();
        }
      }

      setWarningRing(warn);
      if (newFx.length) {
        setEffects(e => [...e, ...newFx]);
        setTimeout(() => setEffects(e => e.filter(x => !newFx.find(f => f.id === x.id))), 800);
      }

      if (hit) {
        setEarthHit(true);
        setPhase("gameover");
        return [];
      }
      return updated;
    });

    // Update powerups
    setPowerups(prev => {
      const updated = [];
      for (const p of prev) {
        if (p.tapped) {
          if (p.scale > 0.1) updated.push({ ...p, scale: p.scale * 0.8 });
          continue;
        }
        const nx = p.x + p.vx * (isFrozen ? 0.3 : 1);
        const ny = p.y + p.vy * (isFrozen ? 0.3 : 1);
        const d = dist(nx, ny, earth.x, earth.y);
        if (d < earth.r) continue; // powerup missed, despawn
        updated.push({ ...p, x: nx, y: ny, rot: p.rot + 2 });
      }
      return updated;
    });

    // Update particles
    setParticles(prev => prev
      .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 1, vy: p.vy + 0.02 }))
      .filter(p => p.life > 0)
    );

    // Ensure min 1 poo
    const active = pr.current.poos.filter(p => !p.tapped);
    if (active.length < 1) doSpawn();

    animRef.current = requestAnimationFrame(gameLoop);
  }, [doSpawn, triggerShake]);

  const spawnParticles = useCallback((x, y, color, count = 8) => {
    const ps = [];
    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const spd = rand(1, 4);
      ps.push({ id: ++idC, x, y, vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd, color, life: randInt(15,30), size: rand(3,7) });
    }
    setParticles(prev => [...prev, ...ps]);
  }, []);

  const startGame = useCallback(() => {
    if (playsLeft <= 0) return;
    incPlays();
    setPlaysLeft(MAX_PLAYS_PER_DAY - playsToday());
    setScore(0); setPoos([]); setPowerups([]); setEffects([]); setParticles([]); setExplosions([]);
    setSpeedMult(1); setCombo(0); setEarthHit(false); setShieldFlash(false);
    setSubmitted(false); setHasShield(false); setActivePower(null);
    setFrozen(false); setDoublePoints(false); setWarningRing(false); setNearMissBonus(null);
    setZone(ZONES[0]); setMilestone(null); setScreenShake(false);
    pr.current = { phase:"playing", score:0, speed:1, poos:[], powerups:[], frozen:false, shield:false, double:false };
    milestoneHit.current = new Set();
    idC = 0;
    setPhase("playing");
  }, [playsLeft]);

  useEffect(() => {
    if (phase === "playing") {
      animRef.current = requestAnimationFrame(gameLoop);
      const tick = () => {
        if (pr.current.phase !== "playing") return;
        doSpawn();
        const int = Math.max(BASE_SPAWN_INTERVAL / pr.current.speed, 500);
        spawnRef.current = setTimeout(tick, int * rand(0.8,1.2));
      };
      doSpawn();
      spawnRef.current = setTimeout(tick, BASE_SPAWN_INTERVAL);
      return () => { cancelAnimationFrame(animRef.current); clearTimeout(spawnRef.current); };
    }
  }, [phase, gameLoop, doSpawn]);

  useEffect(() => {
    if (phase === "gameover" && !submitted && username.trim()) {
      addLb(username.trim(), score); setLb(getLb()); setSubmitted(true);
    }
  }, [phase, score, username, submitted]);

  const handleTapPoo = useCallback((e, poo) => {
    e.preventDefault(); e.stopPropagation();
    if (poo.tapped || pr.current.phase !== "playing") return;

    const earth = eRef.current;
    const d = dist(poo.x, poo.y, earth.x, earth.y);
    const nearMiss = d < earth.r * NEAR_MISS_DIST_MULT;

    if (poo.isBoss && poo.bossHp > 1) {
      // Boss takes multiple hits
      triggerShake();
      spawnParticles(poo.x, poo.y, "#fbbf24", 6);
      setPoos(prev => prev.map(p => p.id === poo.id ? { ...p, bossHp: p.bossHp - 1, size: p.size * 0.9 } : p));
      setEffects(prev => [...prev, { id: idC++, x: poo.x, y: poo.y, text: `💥 ${poo.bossHp-1}HP`, color: "#fbbf24" }]);
      setTimeout(() => setEffects(prev => prev.slice(1)), 600);
      return;
    }

    const pts = (pr.current.double ? 2 : 1) * (poo.isBoss ? 5 : 1) + (nearMiss ? 2 : 0);
    setScore(s => s + pts);
    setCombo(c => c + 1);
    setSpeedMult(s => +(s + SPEED_INCREMENT).toFixed(2));
    triggerShake();
    spawnParticles(poo.x, poo.y, poo.isBoss ? "#fbbf24" : "#8b5e3c", poo.isBoss ? 16 : 8);

    let txt = `+${pts}`;
    if (poo.isBoss) txt = `+${pts} BOSS! 👑`;
    else if (nearMiss) txt = `+${pts} CLOSE! 😱`;
    if (nearMiss) {
      setNearMissBonus({ x: poo.x, y: poo.y });
      setTimeout(() => setNearMissBonus(null), 600);
    }

    setEffects(prev => [...prev, { id: poo.id, x: poo.x, y: poo.y, text: txt, color: nearMiss ? "#f59e0b" : "#4ade80" }]);
    setTimeout(() => setEffects(prev => prev.filter(ef => ef.id !== poo.id)), 700);
    setPoos(prev => prev.map(p => p.id === poo.id ? { ...p, tapped: true } : p));
  }, [triggerShake, spawnParticles]);

  const handleTapPowerup = useCallback((e, pu) => {
    e.preventDefault(); e.stopPropagation();
    if (pu.tapped || pr.current.phase !== "playing") return;

    setPowerups(prev => prev.map(p => p.id === pu.id ? { ...p, tapped: true } : p));
    spawnParticles(pu.x, pu.y, pu.color, 10);
    setActivePower({ label: pu.label, color: pu.color });
    setTimeout(() => setActivePower(null), 1500);

    if (pu.type === "shield") {
      setHasShield(true);
    } else if (pu.type === "freeze") {
      setFrozen(true);
      setTimeout(() => setFrozen(false), pu.duration);
    } else if (pu.type === "bomb") {
      // Explode all poos
      setPoos(prev => {
        prev.filter(p => !p.tapped).forEach(p => {
          spawnParticles(p.x, p.y, "#f87171", 6);
          setScore(s => s + (pr.current.double ? 2 : 1));
        });
        return prev.map(p => ({ ...p, tapped: true }));
      });
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 300);
    } else if (pu.type === "double") {
      setDoublePoints(true);
      setTimeout(() => setDoublePoints(false), pu.duration);
    }

    setEffects(prev => [...prev, { id: pu.id, x: pu.x, y: pu.y, text: pu.label, color: pu.color }]);
    setTimeout(() => setEffects(prev => prev.filter(ef => ef.id !== pu.id)), 700);
  }, [spawnParticles]);

  const handleCode = () => {
    if (codeIn.trim().toUpperCase() === SECRET_CODE) {
      rstPlays(); setPlaysLeft(MAX_PLAYS_PER_DAY); setCodeOk(true); setCodeErr("");
      setTimeout(() => { setShowCode(false); setCodeIn(""); setCodeOk(false); }, 1500);
    } else { setCodeErr("Wrong code! 😏"); setCodeOk(false); }
  };

  const speedLabel = speedMult < 1.4 ? "" : speedMult < 2.2 ? "⚡ FASTER!" : speedMult < 3.5 ? "🔥 HYPERSPEED" : speedMult < 5 ? "🚀 WARP DRIVE" : "☠️ LUDICROUS";
  const earth = eRef.current;
  const medal = (i) => i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`;

  return (
    <div style={s.wrapper}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bungee&family=Nunito:wght@600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-user-select:none;user-select:none}
        body{margin:0;overflow:hidden}
        input{-webkit-user-select:text;user-select:text}
        @keyframes popIn{0%{transform:scale(0) rotate(-10deg);opacity:0}60%{transform:scale(1.15) rotate(3deg)}100%{transform:scale(1) rotate(0);opacity:1}}
        @keyframes floatUp{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-70px) scale(1.5)}}
        @keyframes explode{0%{transform:scale(.5);opacity:1}50%{transform:scale(3);opacity:.8}100%{transform:scale(5);opacity:0}}
        @keyframes twinkle{0%,100%{opacity:.3}50%{opacity:1}}
        @keyframes earthGlow{0%,100%{box-shadow:0 0 40px rgba(80,180,255,.3),0 0 80px rgba(80,180,255,.1)}50%{box-shadow:0 0 60px rgba(80,180,255,.5),0 0 120px rgba(80,180,255,.2)}}
        @keyframes bobFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes speedPulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes shake{0%,100%{transform:translate(0,0)}25%{transform:translate(-3px,2px)}50%{transform:translate(2px,-3px)}75%{transform:translate(-2px,-1px)}}
        @keyframes ringPulse{0%{transform:scale(.8);opacity:.8;border-width:3px}100%{transform:scale(1.8);opacity:0;border-width:1px}}
        @keyframes warningPulse{0%,100%{box-shadow:0 0 20px rgba(255,80,80,.4)}50%{box-shadow:0 0 50px rgba(255,80,80,.7)}}
        @keyframes comboGlow{0%{text-shadow:0 0 10px rgba(255,200,50,.8)}100%{text-shadow:0 0 2px rgba(255,200,50,.2)}}
        @keyframes fadeIn{0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes successPop{0%{transform:scale(.8)}50%{transform:scale(1.1)}100%{transform:scale(1)}}
        @keyframes milestoneIn{0%{transform:scale(0) rotate(-20deg);opacity:0}50%{transform:scale(1.3) rotate(5deg)}70%{transform:scale(.95)}100%{transform:scale(1) rotate(0);opacity:1}}
        @keyframes milestoneOut{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.5) translateY(-40px)}}
        @keyframes powerGlow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.5)}}
        @keyframes frozenOverlay{0%,100%{opacity:.1}50%{opacity:.2}}
        @keyframes shieldBubble{0%,100%{box-shadow:0 0 30px rgba(59,130,246,.4),inset 0 0 15px rgba(59,130,246,.15)}50%{box-shadow:0 0 50px rgba(59,130,246,.6),inset 0 0 25px rgba(59,130,246,.25)}}
        @keyframes nearMissRing{0%{transform:scale(.5);opacity:1}100%{transform:scale(2.5);opacity:0}}
      `}</style>

      <div ref={gameRef} style={{
        ...s.gameArea,
        ...(screenShake ? { animation: "shake .15s ease" } : {}),
      }}>
        {/* Dynamic background */}
        <div style={{ ...s.space, background: `radial-gradient(ellipse at 30% 20%, ${zone.bg1} 0%, ${zone.bg2} 100%)` }} />
        <div style={{ ...s.nebula, background: `radial-gradient(ellipse at 70% 30%, ${zone.nebula} 0%, transparent 50%)` }} />

        {/* Frozen overlay */}
        {frozen && <div style={{ position:"absolute", inset:0, background:"rgba(100,200,255,0.08)", animation:"frozenOverlay 1s ease infinite", zIndex:2, pointerEvents:"none" }} />}

        {stars.map(st => (
          <div key={st.id} style={{
            position:"absolute",left:`${st.x}%`,top:`${st.y}%`,width:st.size,height:st.size,
            borderRadius:"50%",background:"#fff",opacity:st.op,
            animation:`twinkle ${st.ts}s ease-in-out ${st.td}s infinite`,zIndex:1,pointerEvents:"none",
          }} />
        ))}

        {/* Particles */}
        {particles.map(p => (
          <div key={p.id} style={{
            position:"absolute",left:p.x,top:p.y,width:p.size,height:p.size,
            borderRadius:"50%",background:p.color,opacity:p.life/30,
            pointerEvents:"none",zIndex:20,
          }} />
        ))}

        {/* Poos */}
        {poos.map(p => (
          <div key={p.id} onPointerDown={ev => handleTapPoo(ev, p)} style={{
            position:"absolute",left:p.x-p.size/2,top:p.y-p.size/2,
            width:p.size+12,height:p.size+12,fontSize:p.size,
            lineHeight:`${p.size+12}px`,textAlign:"center",cursor:"pointer",
            transform:`rotate(${p.rot}deg) scale(${p.scale})`,
            filter:`${p.color} drop-shadow(0 0 ${p.isBoss?'15px rgba(255,200,50,0.8)':'8px rgba(200,150,50,0.5)'})`,
            opacity:p.tapped?.3:1,transition:p.tapped?"all .2s":"none",
            zIndex:10,touchAction:"none",
          }}>
            💩
            {p.isBoss && !p.tapped && (
              <div style={{
                position:"absolute",bottom:-8,left:"50%",transform:"translateX(-50%)",
                width:p.size*.8,height:5,borderRadius:3,background:"rgba(0,0,0,.5)",overflow:"hidden",
              }}>
                <div style={{
                  width:`${(p.bossHp/p.bossMaxHp)*100}%`,height:"100%",
                  background:"linear-gradient(90deg,#ef4444,#fbbf24)",borderRadius:3,transition:"width .2s",
                }} />
              </div>
            )}
          </div>
        ))}

        {/* Powerups */}
        {powerups.map(p => (
          <div key={p.id} onPointerDown={ev => handleTapPowerup(ev, p)} style={{
            position:"absolute",left:p.x-p.size/2,top:p.y-p.size/2,
            width:p.size+12,height:p.size+12,fontSize:p.size,
            lineHeight:`${p.size+12}px`,textAlign:"center",cursor:"pointer",
            transform:`rotate(${p.rot}deg) scale(${p.scale})`,
            opacity:p.tapped?.3:1,transition:p.tapped?"all .2s":"none",
            animation:p.tapped?"none":"powerGlow 1s ease infinite",
            filter:`drop-shadow(0 0 12px ${p.color})`,
            zIndex:12,touchAction:"none",
          }}>
            {p.emoji}
          </div>
        ))}

        {/* Earth + shield */}
        <div style={{
          position:"absolute",left:earth.x-earth.r-12,top:earth.y-earth.r-12,
          width:(earth.r+12)*2,height:(earth.r+12)*2,borderRadius:"50%",
          animation:hasShield?"shieldBubble 1.5s ease infinite":"earthGlow 3s ease-in-out infinite",
          border:hasShield?"2px solid rgba(59,130,246,0.4)":"none",
          zIndex:8,pointerEvents:"none",display:"flex",alignItems:"center",justifyContent:"center",
        }}>
          <div style={{ fontSize:earth.r*2,lineHeight:1,transform:`rotate(${earthRot}deg)`,filter:"drop-shadow(0 0 15px rgba(50,150,255,.4))" }}>🌍</div>
        </div>

        {/* Warning ring */}
        {warningRing && phase === "playing" && (
          <div style={{
            position:"absolute",left:earth.x-earth.r*1.8,top:earth.y-earth.r*1.8,
            width:earth.r*3.6,height:earth.r*3.6,borderRadius:"50%",
            border:"2px solid rgba(255,80,80,0.5)",
            animation:"ringPulse 1s ease infinite",
            pointerEvents:"none",zIndex:7,
          }} />
        )}

        {/* Near miss ring */}
        {nearMissBonus && (
          <div style={{
            position:"absolute",left:nearMissBonus.x-25,top:nearMissBonus.y-25,
            width:50,height:50,borderRadius:"50%",border:"3px solid #f59e0b",
            animation:"nearMissRing .6s ease forwards",pointerEvents:"none",zIndex:22,
          }} />
        )}

        {/* Explosions */}
        {explosions.map(ex => (
          <div key={ex.id} style={{
            position:"absolute",left:ex.x-30,top:ex.y-30,width:60,height:60,borderRadius:"50%",
            background:"radial-gradient(circle,rgba(255,100,50,.9),rgba(255,200,50,.5),transparent)",
            animation:"explode .8s ease-out forwards",pointerEvents:"none",zIndex:25,
          }} />
        ))}

        {/* Effects */}
        {effects.map(ef => (
          <div key={ef.id} style={{
            position:"absolute",left:ef.x-30,top:ef.y-30,fontSize:18,
            fontFamily:"'Bungee',cursive",color:ef.color,whiteSpace:"nowrap",
            animation:"floatUp .7s ease forwards",pointerEvents:"none",zIndex:30,
            textShadow:"0 2px 6px rgba(0,0,0,.6)",
          }}>{ef.text}</div>
        ))}

        {/* Milestone popup */}
        {milestone && (
          <div style={{
            position:"absolute",top:"20%",left:0,right:0,textAlign:"center",zIndex:60,pointerEvents:"none",
            animation:"milestoneIn .5s ease",
          }}>
            <div style={{ fontSize:48 }}>{milestone.emoji}</div>
            <div style={{ fontFamily:"'Bungee',cursive",fontSize:28,color:milestone.color,textShadow:`0 0 20px ${milestone.color}` }}>
              {milestone.title}
            </div>
            <div style={{ color:"#94a3b8",fontSize:13,fontWeight:700 }}>{milestone.at} poops deflected!</div>
          </div>
        )}

        {/* Active powerup label */}
        {activePower && (
          <div style={{
            position:"absolute",top:"15%",left:0,right:0,textAlign:"center",zIndex:55,pointerEvents:"none",
            fontFamily:"'Bungee',cursive",fontSize:22,color:activePower.color,
            textShadow:`0 0 15px ${activePower.color}`,animation:"popIn .3s ease",
          }}>{activePower.label}</div>
        )}

        {/* HUD */}
        {phase === "playing" && (
          <>
            <div style={s.hud}>
              <div style={s.hudL}><span style={s.hudScore}>🛡️ {score}</span></div>
              <div style={s.hudC}>
                {speedLabel && <span style={{...s.speedLbl,animation:"speedPulse .8s infinite"}}>{speedLabel}</span>}
              </div>
              <div style={s.hudR}>
                {doublePoints && <span style={{fontSize:14,marginRight:6,animation:"powerGlow 1s infinite"}}>⭐2X</span>}
                {hasShield && <span style={{fontSize:14,marginRight:6}}>🛡️</span>}
                <span style={s.hudSpd}>×{speedMult.toFixed(1)}</span>
              </div>
            </div>
            {combo >= 3 && <div style={{...s.combo,animation:"comboGlow .5s infinite"}}>COMBO ×{combo}</div>}
            <div style={s.zoneLabel}>{zone.name}</div>
            <div style={s.playsInd}>
              {[...Array(MAX_PLAYS_PER_DAY)].map((_,i) => <span key={i} style={{fontSize:14,opacity:i<playsLeft?1:.2}}>🚀</span>)}
            </div>
          </>
        )}

        {/* START */}
        {phase === "start" && (
          <div style={s.overlay}>
            <div style={{animation:"popIn .6s ease",maxWidth:360,width:"100%"}}>
              <div style={{fontSize:72,marginBottom:4,animation:"bobFloat 2.5s infinite"}}>🌍</div>
              <h1 style={s.title}>Space Poo<br/>Defense</h1>
              <p style={s.sub}>Protect Earth from space poop!</p>
              {showName ? (
                <div style={s.nameBox}>
                  <p style={{color:"#94a3b8",fontSize:13,marginBottom:8,fontWeight:700}}>Enter your name, defender:</p>
                  <input type="text" value={username} onChange={e=>setUsername(e.target.value.slice(0,16))}
                    placeholder="Your username..." maxLength={16} style={s.nameIn}
                    onKeyDown={e=>{if(e.key==="Enter"&&username.trim())setShowName(false)}} />
                  <button onClick={()=>{if(username.trim())setShowName(false)}}
                    disabled={!username.trim()} style={{...s.smBtn,opacity:username.trim()?1:.4}}>Ready! ✅</button>
                </div>
              ) : (
                <>
                  <p style={{color:"#64748b",fontSize:13}}>Playing as</p>
                  <p style={{color:"#fbbf24",fontFamily:"'Bungee',cursive",fontSize:18,marginBottom:12}}>{username}</p>
                  <div style={s.rules}>
                    <p style={s.rule}>👆 Tap 💩 before they hit Earth!</p>
                    <p style={s.rule}>🏎️ Gets faster every tap!</p>
                    <p style={s.rule}>👑 Boss 💩 every 25 pts — 3 taps to kill!</p>
                    <p style={s.rule}>⭐ Grab power-ups: 🛡️❄️💣⭐</p>
                    <p style={s.rule}>😱 Near-miss = bonus points!</p>
                    <p style={{...s.rule,color:"#f87171"}}>☄️ One hit = Game Over!</p>
                  </div>
                  <div style={s.playsBox}>
                    <span style={{color:"#94a3b8",fontSize:13}}>Plays today: </span>
                    {[...Array(MAX_PLAYS_PER_DAY)].map((_,i) => <span key={i} style={{fontSize:18,opacity:i<playsLeft?1:.2,marginLeft:2}}>🚀</span>)}
                  </div>
                  {playsLeft > 0
                    ? <button onClick={startGame} style={s.playBtn}>DEFEND EARTH! 🚀</button>
                    : <div style={{marginTop:16}}><p style={{color:"#f87171",fontFamily:"'Bungee',cursive",fontSize:16}}>No plays left today!</p><p style={{color:"#64748b",fontSize:13,marginTop:4}}>Come back tomorrow</p></div>
                  }
                  <div style={s.lbBox}>
                    <p style={s.lbTitle}>🏆 TOP DEFENDERS</p>
                    {lb.map((e,i) => (
                      <div key={i} style={{...s.lbRow,animation:`fadeIn ${.3+i*.1}s ease`,background:i===0?"rgba(255,200,50,.08)":"transparent"}}>
                        <span style={s.lbMed}>{medal(i)}</span><span style={s.lbName}>{e.name}</span><span style={s.lbSc}>{e.score}</span>
                      </div>
                    ))}
                  </div>
                  <p onClick={()=>{setShowCode(true);setCodeIn("");setCodeErr("");setCodeOk(false)}} style={s.secLink}>Got a code?</p>
                  <p onClick={()=>setShowName(true)} style={{color:"#475569",fontSize:11,marginTop:6,cursor:"pointer",textDecoration:"underline"}}>Change name</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* GAME OVER */}
        {phase === "gameover" && (
          <div style={s.overlay}>
            <div style={{animation:"popIn .5s ease",maxWidth:360,width:"100%"}}>
              <div style={{fontSize:64,marginBottom:8}}>{score>=50?"🏆":score>=30?"⭐":score>=15?"🛸":"💥"}</div>
              <h2 style={s.goTitle}>{score>=50?"GALACTIC HERO!":score>=30?"SPACE COMMANDER!":score>=15?"GOOD EFFORT!":"EARTH DESTROYED!"}</h2>
              <div style={s.finScore}>{score}</div>
              <p style={s.finLbl}>poops deflected</p>
              <p style={s.finSpd}>Max speed: ×{speedMult.toFixed(1)}</p>
              <div style={s.lbBox}>
                <p style={s.lbTitle}>🏆 TOP DEFENDERS</p>
                {lb.map((e,i) => {
                  const isYou = e.name===username.trim()&&e.score===score;
                  return (
                    <div key={i} style={{...s.lbRow,animation:`fadeIn ${.3+i*.1}s ease`,
                      background:isYou?"rgba(100,200,255,.1)":i===0?"rgba(255,200,50,.08)":"transparent",
                      border:isYou?"1px solid rgba(100,200,255,.3)":"1px solid transparent"}}>
                      <span style={s.lbMed}>{medal(i)}</span>
                      <span style={{...s.lbName,color:isYou?"#67e8f9":"#e2e8f0"}}>{e.name}{isYou?" ← YOU":""}</span>
                      <span style={s.lbSc}>{e.score}</span>
                    </div>
                  );
                })}
              </div>
              <div style={s.playsBox}>
                <span style={{color:"#94a3b8",fontSize:13}}>Plays left: </span>
                {[...Array(MAX_PLAYS_PER_DAY)].map((_,i) => <span key={i} style={{fontSize:18,opacity:i<playsLeft?1:.2,marginLeft:2}}>🚀</span>)}
              </div>
              {playsLeft > 0
                ? <button onClick={startGame} style={s.playBtn}>RETRY 🔄</button>
                : <div style={{marginTop:16}}><p style={{color:"#f87171",fontFamily:"'Bungee',cursive",fontSize:15}}>No plays left!</p></div>
              }
              <p onClick={()=>{setShowCode(true);setCodeIn("");setCodeErr("");setCodeOk(false)}} style={s.secLink}>Got a code?</p>
              <p onClick={()=>{setPhase("start");setShowName(false)}} style={{color:"#475569",fontSize:11,marginTop:6,cursor:"pointer",textDecoration:"underline"}}>Back to menu</p>
            </div>
          </div>
        )}

        {/* CODE MODAL */}
        {showCode && (
          <div style={s.modOv} onClick={()=>setShowCode(false)}>
            <div style={{...s.mod,animation:"popIn .3s ease"}} onClick={e=>e.stopPropagation()}>
              {codeOk ? (
                <div style={{animation:"successPop .4s ease",textAlign:"center"}}>
                  <div style={{fontSize:48,marginBottom:8}}>🎉</div>
                  <p style={{color:"#4ade80",fontFamily:"'Bungee',cursive",fontSize:18}}>PLAYS RESET!</p>
                </div>
              ) : (
                <>
                  <p style={{color:"#e2e8f0",fontFamily:"'Bungee',cursive",fontSize:16,marginBottom:12}}>🔐 Secret Code</p>
                  <input type="text" value={codeIn} onChange={e=>{setCodeIn(e.target.value.toUpperCase());setCodeErr("")}}
                    placeholder="CODE..." style={s.codeIn} onKeyDown={e=>{if(e.key==="Enter")handleCode()}} autoFocus />
                  {codeErr && <p style={{color:"#f87171",fontSize:12,marginTop:6}}>{codeErr}</p>}
                  <div style={{display:"flex",gap:8,marginTop:12}}>
                    <button onClick={()=>setShowCode(false)} style={s.canBtn}>Cancel</button>
                    <button onClick={handleCode} style={s.subBtn}>Submit</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  wrapper:{width:"100vw",height:"100vh",display:"flex",justifyContent:"center",alignItems:"center",background:"#000",fontFamily:"'Nunito',sans-serif"},
  gameArea:{position:"relative",width:"100%",maxWidth:480,height:"100vh",maxHeight:860,overflow:"hidden",boxShadow:"0 0 80px rgba(50,100,200,.15)"},
  space:{position:"absolute",inset:0,zIndex:0},
  nebula:{position:"absolute",width:"120%",height:"120%",top:"-10%",left:"-10%",zIndex:0,pointerEvents:"none"},
  hud:{position:"absolute",top:0,left:0,right:0,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",paddingTop:48,background:"linear-gradient(180deg,rgba(0,0,0,.6) 0%,transparent 100%)",zIndex:50},
  hudL:{display:"flex",alignItems:"center"},hudC:{flex:1,textAlign:"center"},hudR:{display:"flex",alignItems:"center"},
  hudScore:{fontFamily:"'Bungee',cursive",fontSize:24,color:"#fff",textShadow:"0 2px 8px rgba(0,0,0,.5)"},
  hudSpd:{fontFamily:"'Bungee',cursive",fontSize:15,color:"#fbbf24",background:"rgba(255,200,50,.1)",border:"1px solid rgba(255,200,50,.2)",borderRadius:10,padding:"3px 9px"},
  speedLbl:{fontFamily:"'Bungee',cursive",fontSize:11,color:"#fb923c",textShadow:"0 0 10px rgba(251,146,60,.5)"},
  combo:{position:"absolute",bottom:60,left:0,right:0,textAlign:"center",fontFamily:"'Bungee',cursive",fontSize:22,color:"#fbbf24",zIndex:50,pointerEvents:"none"},
  zoneLabel:{position:"absolute",bottom:36,left:0,right:0,textAlign:"center",fontFamily:"'Bungee',cursive",fontSize:10,color:"rgba(255,255,255,.2)",zIndex:50,pointerEvents:"none",letterSpacing:2,textTransform:"uppercase"},
  playsInd:{position:"absolute",bottom:16,right:16,display:"flex",gap:4,zIndex:50},
  overlay:{position:"absolute",inset:0,background:"rgba(2,4,8,.92)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",zIndex:100,padding:24,overflowY:"auto"},
  title:{fontFamily:"'Bungee',cursive",fontSize:34,color:"#fff",marginBottom:6,textShadow:"0 0 20px rgba(100,180,255,.4),0 3px 10px rgba(0,0,0,.5)",lineHeight:1.15},
  sub:{color:"#94a3b8",fontSize:15,marginBottom:20,fontWeight:700},
  nameBox:{background:"rgba(255,255,255,.04)",borderRadius:16,padding:20,marginBottom:16,border:"1px solid rgba(100,180,255,.1)"},
  nameIn:{width:"100%",padding:"12px 16px",borderRadius:12,border:"2px solid rgba(100,180,255,.2)",background:"rgba(255,255,255,.06)",color:"#fff",fontSize:16,fontFamily:"'Nunito',sans-serif",fontWeight:700,outline:"none",textAlign:"center",marginBottom:10},
  smBtn:{padding:"10px 24px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#3b82f6,#6366f1)",color:"#fff",fontFamily:"'Bungee',cursive",fontSize:14,cursor:"pointer"},
  rules:{background:"rgba(255,255,255,.04)",borderRadius:14,padding:"12px 16px",marginBottom:16,border:"1px solid rgba(100,180,255,.08)"},
  rule:{color:"#cbd5e1",fontSize:13,marginBottom:5,fontWeight:700,lineHeight:1.4},
  playsBox:{display:"flex",alignItems:"center",justifyContent:"center",gap:4,marginBottom:14},
  playBtn:{background:"linear-gradient(135deg,#3b82f6,#6366f1)",color:"#fff",border:"none",borderRadius:20,padding:"14px 36px",fontSize:18,fontFamily:"'Bungee',cursive",cursor:"pointer",boxShadow:"0 6px 30px rgba(99,102,241,.4)",letterSpacing:1},
  lbBox:{background:"rgba(255,255,255,.03)",borderRadius:14,padding:"12px 14px",marginTop:14,marginBottom:10,border:"1px solid rgba(255,255,255,.06)"},
  lbTitle:{fontFamily:"'Bungee',cursive",fontSize:13,color:"#fbbf24",marginBottom:8,letterSpacing:1},
  lbRow:{display:"flex",alignItems:"center",padding:"7px 10px",borderRadius:10,marginBottom:3},
  lbMed:{fontSize:15,width:30,textAlign:"center"},
  lbName:{flex:1,textAlign:"left",color:"#e2e8f0",fontSize:13,fontWeight:700},
  lbSc:{fontFamily:"'Bungee',cursive",fontSize:14,color:"#fbbf24",minWidth:36,textAlign:"right"},
  secLink:{color:"#334155",fontSize:11,marginTop:14,cursor:"pointer",textDecoration:"underline"},
  modOv:{position:"absolute",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:24},
  mod:{background:"#1e293b",borderRadius:20,padding:"28px 24px",width:"100%",maxWidth:320,border:"1px solid rgba(100,180,255,.15)",boxShadow:"0 20px 50px rgba(0,0,0,.5)"},
  codeIn:{width:"100%",padding:"12px 16px",borderRadius:12,border:"2px solid rgba(100,180,255,.2)",background:"rgba(255,255,255,.06)",color:"#fff",fontSize:18,fontFamily:"'Bungee',cursive",outline:"none",textAlign:"center",letterSpacing:4},
  canBtn:{flex:1,padding:10,borderRadius:12,border:"1px solid rgba(255,255,255,.1)",background:"transparent",color:"#94a3b8",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer"},
  subBtn:{flex:1,padding:10,borderRadius:12,border:"none",background:"linear-gradient(135deg,#3b82f6,#6366f1)",color:"#fff",fontFamily:"'Bungee',cursive",fontSize:14,cursor:"pointer"},
  goTitle:{fontFamily:"'Bungee',cursive",fontSize:24,color:"#f87171",marginBottom:8,textShadow:"0 0 15px rgba(248,113,113,.4)"},
  finScore:{fontFamily:"'Bungee',cursive",fontSize:56,color:"#fff",textShadow:"0 0 20px rgba(100,180,255,.3)"},
  finLbl:{color:"#94a3b8",fontSize:14,marginBottom:4,fontWeight:700},
  finSpd:{color:"#fbbf24",fontSize:13,fontWeight:700,marginBottom:12,fontFamily:"'Bungee',cursive"},
};
