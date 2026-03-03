import { useState, useEffect, useRef, useCallback } from "react";

const POOS = ["💩"];
const POO_COLORS = [
  "hue-rotate(0deg)",
  "hue-rotate(90deg) saturate(2)",
  "hue-rotate(180deg) saturate(1.5)",
  "hue-rotate(270deg) saturate(2)",
  "hue-rotate(45deg) saturate(1.8)",
  "hue-rotate(320deg) saturate(2.5)",
  "hue-rotate(140deg) saturate(2)",
  "hue-rotate(200deg) saturate(1.5)",
];
const STAR_COUNT = 120;
const EARTH_RADIUS_PCT = 0.1;
const BASE_SPEED = 1.0;
const SPEED_INCREMENT = 0.2;
const BASE_SPAWN_INTERVAL = 2000;
const MAX_PLAYS_PER_DAY = 3;
const SECRET_CODE = "POOP4LIFE";

const DEFAULT_LEADERBOARD = [
  { name: "PooSlayer99", score: 47 },
  { name: "EarthGuardian", score: 35 },
  { name: "CosmicFlusher", score: 28 },
  { name: "AstroWiper", score: 19 },
  { name: "SpacePlunger", score: 12 },
];

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

let idCounter = 0;

function generateStars(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: rand(1, 3.5),
    opacity: rand(0.3, 1),
    twinkleSpeed: rand(1.5, 4),
    twinkleDelay: rand(0, 3),
  }));
}

function spawnPoo(cx, cy, speed, gameW, gameH) {
  const angle = rand(0, Math.PI * 2);
  const maxDim = Math.max(gameW, gameH);
  const dist = maxDim * 0.6 + rand(0, maxDim * 0.2);
  const startX = cx + Math.cos(angle) * dist;
  const startY = cy + Math.sin(angle) * dist;
  const dx = cx - startX;
  const dy = cy - startY;
  const mag = Math.sqrt(dx * dx + dy * dy);
  const colorFilter = POO_COLORS[Math.floor(Math.random() * POO_COLORS.length)];
  const size = rand(36, 54);
  const offsetAngle = rand(-0.15, 0.15);
  const cosO = Math.cos(offsetAngle);
  const sinO = Math.sin(offsetAngle);
  const ndx = (dx / mag) * cosO - (dy / mag) * sinO;
  const ndy = (dx / mag) * sinO + (dy / mag) * cosO;

  return {
    id: ++idCounter,
    x: startX,
    y: startY,
    vx: ndx * speed * rand(0.9, 1.1),
    vy: ndy * speed * rand(0.9, 1.1),
    size,
    rotation: rand(0, 360),
    rotSpeed: rand(-4, 4),
    colorFilter,
    tapped: false,
    scale: 1,
    trail: [],
  };
}

// In-memory storage (persists during session only)
const gameStore = {
  leaderboard: [...DEFAULT_LEADERBOARD],
  plays: {},  // { "2026-03-03": { "fingerprint": count } }
};

function getFingerprint() {
  // Simple session-based ID using random value stored in module scope
  if (!gameStore._fp) {
    gameStore._fp = "user_" + Math.random().toString(36).slice(2, 10);
  }
  return gameStore._fp;
}

function getPlaysToday() {
  const key = getTodayKey();
  const fp = getFingerprint();
  return (gameStore.plays[key] && gameStore.plays[key][fp]) || 0;
}

function incrementPlays() {
  const key = getTodayKey();
  const fp = getFingerprint();
  if (!gameStore.plays[key]) gameStore.plays[key] = {};
  gameStore.plays[key][fp] = (gameStore.plays[key][fp] || 0) + 1;
}

function resetPlays() {
  const key = getTodayKey();
  const fp = getFingerprint();
  if (gameStore.plays[key]) gameStore.plays[key][fp] = 0;
}

function getLeaderboard() {
  return [...gameStore.leaderboard].sort((a, b) => b.score - a.score).slice(0, 5);
}

function submitScore(name, score) {
  gameStore.leaderboard.push({ name, score });
  gameStore.leaderboard.sort((a, b) => b.score - a.score);
  gameStore.leaderboard = gameStore.leaderboard.slice(0, 5);
}

export default function SpacePooDefense() {
  const [phase, setPhase] = useState("start");
  const [score, setScore] = useState(0);
  const [poos, setPoos] = useState([]);
  const [effects, setEffects] = useState([]);
  const [explosions, setExplosions] = useState([]);
  const [speedMult, setSpeedMult] = useState(1);
  const [earthHit, setEarthHit] = useState(false);
  const [combo, setCombo] = useState(0);
  const [shieldFlash, setShieldFlash] = useState(false);
  const [stars] = useState(() => generateStars(STAR_COUNT));
  const [earthRotation, setEarthRotation] = useState(0);
  const [spawnCount, setSpawnCount] = useState(1);
  const [username, setUsername] = useState("");
  const [playsLeft, setPlaysLeft] = useState(MAX_PLAYS_PER_DAY - getPlaysToday());
  const [leaderboard, setLeaderboard] = useState(getLeaderboard());
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeSuccess, setCodeSuccess] = useState(false);
  const [showNameInput, setShowNameInput] = useState(true);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  const gameRef = useRef(null);
  const animRef = useRef(null);
  const spawnRef = useRef(null);
  const phaseRef = useRef("start");
  const scoreRef = useRef(0);
  const speedRef = useRef(1);
  const spawnCountRef = useRef(1);
  const poosRef = useRef([]);
  const gameAreaRef = useRef({ width: 400, height: 700 });
  const earthRef = useRef({ x: 200, y: 350, radius: 40 });

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { speedRef.current = speedMult; }, [speedMult]);
  useEffect(() => { spawnCountRef.current = spawnCount; }, [spawnCount]);
  useEffect(() => { poosRef.current = poos; }, [poos]);

  useEffect(() => {
    const updateSize = () => {
      if (gameRef.current) {
        const w = gameRef.current.clientWidth;
        const h = gameRef.current.clientHeight;
        gameAreaRef.current = { width: w, height: h };
        const r = Math.min(w, h) * EARTH_RADIUS_PCT;
        earthRef.current = { x: w / 2, y: h / 2, radius: r };
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const doSpawn = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const { width: w, height: h } = gameAreaRef.current;
    const cx = w / 2;
    const cy = h / 2;
    const speed = BASE_SPEED * speedRef.current;
    const count = spawnCountRef.current;
    const currentPoos = poosRef.current.filter(p => !p.tapped);
    const toSpawn = Math.max(count, currentPoos.length < 1 ? 1 : count);

    const newPoos = [];
    for (let i = 0; i < toSpawn; i++) {
      newPoos.push(spawnPoo(cx, cy, speed, w, h));
    }
    setPoos(prev => [...prev, ...newPoos]);
  }, []);

  const gameLoop = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    setEarthRotation(r => r + 0.3);
    setPoos(prev => {
      const earth = earthRef.current;
      const updated = [];
      let hitEarth = false;
      const newExplosions = [];

      for (const p of prev) {
        if (p.tapped) {
          if (p.scale > 0.1) updated.push({ ...p, scale: p.scale * 0.85 });
          continue;
        }
        const newX = p.x + p.vx;
        const newY = p.y + p.vy;
        const newRot = p.rotation + p.rotSpeed;
        const dx = newX - earth.x;
        const dy = newY - earth.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const hitDist = earth.radius + p.size * 0.3;

        if (dist < hitDist) {
          hitEarth = true;
          newExplosions.push({ id: p.id, x: newX, y: newY });
          continue;
        }
        const trail = [...(p.trail || []), { x: newX, y: newY }].slice(-6);
        updated.push({ ...p, x: newX, y: newY, rotation: newRot, trail });
      }

      if (newExplosions.length > 0) {
        setExplosions(e => [...e, ...newExplosions]);
        setTimeout(() => setExplosions(e => e.filter(ex => !newExplosions.find(ne => ne.id === ex.id))), 800);
      }

      if (hitEarth) {
        setEarthHit(true);
        setPhase("gameover");
        return [];
      }
      return updated;
    });

    const activePoos = poosRef.current.filter(p => !p.tapped);
    if (activePoos.length < 1 && phaseRef.current === "playing") doSpawn();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [doSpawn]);

  const startGame = useCallback(() => {
    if (playsLeft <= 0) return;
    incrementPlays();
    setPlaysLeft(MAX_PLAYS_PER_DAY - getPlaysToday());
    setScore(0);
    setPoos([]);
    setEffects([]);
    setExplosions([]);
    setSpeedMult(1);
    setSpawnCount(1);
    setCombo(0);
    setEarthHit(false);
    setShieldFlash(false);
    setScoreSubmitted(false);
    scoreRef.current = 0;
    speedRef.current = 1;
    spawnCountRef.current = 1;
    idCounter = 0;
    setPhase("playing");
  }, [playsLeft]);

  useEffect(() => {
    if (phase === "playing") {
      animRef.current = requestAnimationFrame(gameLoop);
      const spawnTick = () => {
        if (phaseRef.current !== "playing") return;
        doSpawn();
        const interval = Math.max(BASE_SPAWN_INTERVAL / speedRef.current, 400);
        spawnRef.current = setTimeout(spawnTick, interval * rand(0.8, 1.2));
      };
      doSpawn();
      spawnRef.current = setTimeout(spawnTick, BASE_SPAWN_INTERVAL);
      return () => {
        cancelAnimationFrame(animRef.current);
        clearTimeout(spawnRef.current);
      };
    }
  }, [phase, gameLoop, doSpawn]);

  useEffect(() => {
    if (phase === "gameover" && !scoreSubmitted && username.trim()) {
      submitScore(username.trim(), score);
      setLeaderboard(getLeaderboard());
      setScoreSubmitted(true);
    }
  }, [phase, score, username, scoreSubmitted]);

  const handleTap = useCallback((e, poo) => {
    e.preventDefault();
    e.stopPropagation();
    if (poo.tapped || phaseRef.current !== "playing") return;

    const newScore = scoreRef.current + 1;
    setScore(newScore);
    setCombo(c => c + 1);
    setSpeedMult(s => +(s + SPEED_INCREMENT).toFixed(1));
    setSpawnCount(s => Math.min(s + 1, 12));
    setShieldFlash(true);
    setTimeout(() => setShieldFlash(false), 200);

    const pointText = combo >= 5 ? `+1 🔥×${combo + 1}` : "+1";
    setEffects(prev => [...prev, { id: poo.id, x: poo.x, y: poo.y, text: pointText, color: "#4ade80" }]);
    setTimeout(() => setEffects(prev => prev.filter(ef => ef.id !== poo.id)), 600);
    setPoos(prev => prev.map(p => p.id === poo.id ? { ...p, tapped: true } : p));
  }, [combo]);

  const handleCodeSubmit = () => {
    if (codeInput.trim().toUpperCase() === SECRET_CODE) {
      resetPlays();
      setPlaysLeft(MAX_PLAYS_PER_DAY);
      setCodeSuccess(true);
      setCodeError("");
      setTimeout(() => {
        setShowCodeModal(false);
        setCodeInput("");
        setCodeSuccess(false);
      }, 1500);
    } else {
      setCodeError("Wrong code! Nice try though 😏");
      setCodeSuccess(false);
    }
  };

  const getSpeedLabel = () => {
    if (speedMult < 1.6) return "";
    if (speedMult < 2.5) return "⚡ FASTER!";
    if (speedMult < 4) return "🔥 HYPERSPEED";
    if (speedMult < 6) return "🚀 WARP DRIVE";
    return "☠️ LUDICROUS SPEED";
  };

  const earth = earthRef.current;
  const lb = leaderboard;

  const medalEmoji = (i) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;

  return (
    <div style={styles.wrapper}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bungee&family=Nunito:wght@600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-user-select: none; user-select: none; }
        body { margin: 0; overflow: hidden; }
        input { -webkit-user-select: text; user-select: text; }
        @keyframes popIn { 0% { transform: scale(0) rotate(-10deg); opacity: 0; } 60% { transform: scale(1.15) rotate(3deg); } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
        @keyframes floatUp { 0% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-70px) scale(1.5); } }
        @keyframes explode { 0% { transform: scale(0.5); opacity: 1; } 50% { transform: scale(3); opacity: 0.8; } 100% { transform: scale(5); opacity: 0; } }
        @keyframes twinkle { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
        @keyframes shieldPulse { 0% { box-shadow: 0 0 30px rgba(100,200,255,0.6), inset 0 0 20px rgba(100,200,255,0.2); } 100% { box-shadow: 0 0 5px rgba(100,200,255,0.1); } }
        @keyframes earthGlow { 0%,100% { box-shadow: 0 0 40px rgba(80,180,255,0.3), 0 0 80px rgba(80,180,255,0.1); } 50% { box-shadow: 0 0 60px rgba(80,180,255,0.5), 0 0 120px rgba(80,180,255,0.2); } }
        @keyframes bobFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes speedPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes screenShake { 0%,100% { transform: translate(0,0); } 25% { transform: translate(-5px,3px); } 50% { transform: translate(4px,-4px); } 75% { transform: translate(-3px,-2px); } }
        @keyframes ringExpand { 0% { transform: scale(0.3); opacity: 1; border-width: 4px; } 100% { transform: scale(3); opacity: 0; border-width: 1px; } }
        @keyframes comboGlow { 0% { text-shadow: 0 0 10px rgba(255,200,50,0.8); } 100% { text-shadow: 0 0 2px rgba(255,200,50,0.2); } }
        @keyframes fadeIn { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes successPop { 0% { transform: scale(0.8); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
      `}</style>

      <div
        ref={gameRef}
        style={{
          ...styles.gameArea,
          ...(earthHit ? { animation: "screenShake 0.5s ease" } : {}),
        }}
      >
        <div style={styles.space} />
        <div style={styles.nebula1} />
        <div style={styles.nebula2} />

        {stars.map(s => (
          <div key={s.id} style={{
            position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
            width: s.size, height: s.size, borderRadius: "50%", background: "#fff",
            opacity: s.opacity, animation: `twinkle ${s.twinkleSpeed}s ease-in-out ${s.twinkleDelay}s infinite`,
            zIndex: 1, pointerEvents: "none",
          }} />
        ))}

        {poos.map(p => !p.tapped && p.trail && p.trail.map((t, i) => (
          <div key={`trail-${p.id}-${i}`} style={{
            position: "absolute", left: t.x - 4, top: t.y - 4, width: 8, height: 8,
            borderRadius: "50%", background: "rgba(180, 130, 60, 0.3)",
            opacity: (i + 1) / p.trail.length * 0.4, filter: p.colorFilter,
            pointerEvents: "none", zIndex: 5,
          }} />
        )))}

        {poos.map(p => (
          <div key={p.id} onPointerDown={(ev) => handleTap(ev, p)} style={{
            position: "absolute", left: p.x - p.size / 2, top: p.y - p.size / 2,
            width: p.size + 12, height: p.size + 12, fontSize: p.size,
            lineHeight: `${p.size + 12}px`, textAlign: "center", cursor: "pointer",
            transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
            filter: `${p.colorFilter} drop-shadow(0 0 8px rgba(200,150,50,0.6))`,
            opacity: p.tapped ? 0.5 : 1, transition: p.tapped ? "all 0.2s ease-out" : "none",
            zIndex: 10, touchAction: "none",
          }}>💩</div>
        ))}

        <div style={{
          position: "absolute", left: earth.x - earth.radius - 8, top: earth.y - earth.radius - 8,
          width: (earth.radius + 8) * 2, height: (earth.radius + 8) * 2, borderRadius: "50%",
          animation: shieldFlash ? "shieldPulse 0.3s ease" : "earthGlow 3s ease-in-out infinite",
          zIndex: 8, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontSize: earth.radius * 2, lineHeight: 1, transform: `rotate(${earthRotation}deg)`,
            filter: "drop-shadow(0 0 15px rgba(50,150,255,0.4))",
          }}>🌍</div>
        </div>

        {explosions.map(ex => (
          <div key={ex.id} style={{
            position: "absolute", left: ex.x - 30, top: ex.y - 30, width: 60, height: 60,
            borderRadius: "50%", background: "radial-gradient(circle, rgba(255,100,50,0.9), rgba(255,200,50,0.5), transparent)",
            animation: "explode 0.8s ease-out forwards", pointerEvents: "none", zIndex: 25,
          }} />
        ))}
        {explosions.map(ex => (
          <div key={`ring-${ex.id}`} style={{
            position: "absolute", left: ex.x - 40, top: ex.y - 40, width: 80, height: 80,
            borderRadius: "50%", border: "3px solid rgba(255,150,50,0.8)",
            animation: "ringExpand 0.8s ease-out forwards", pointerEvents: "none", zIndex: 24,
          }} />
        ))}

        {effects.map(ef => (
          <div key={ef.id} style={{
            position: "absolute", left: ef.x - 25, top: ef.y - 30, fontSize: 20,
            fontFamily: "'Bungee', cursive", color: ef.color,
            animation: "floatUp 0.6s ease forwards", pointerEvents: "none", zIndex: 30,
            textShadow: "0 2px 6px rgba(0,0,0,0.5)", whiteSpace: "nowrap",
          }}>{ef.text}</div>
        ))}

        {phase === "playing" && (
          <>
            <div style={styles.hud}>
              <div style={styles.hudLeft}><span style={styles.hudScore}>🛡️ {score}</span></div>
              <div style={styles.hudCenter}>
                {getSpeedLabel() && (
                  <span style={{ ...styles.speedLabel, animation: "speedPulse 0.8s ease-in-out infinite" }}>{getSpeedLabel()}</span>
                )}
              </div>
              <div style={styles.hudRight}><span style={styles.hudSpeed}>×{speedMult.toFixed(1)}</span></div>
            </div>
            {combo >= 3 && (
              <div style={{ ...styles.comboDisplay, animation: "comboGlow 0.5s ease infinite" }}>COMBO ×{combo}</div>
            )}
            <div style={styles.playsIndicator}>
              {[...Array(MAX_PLAYS_PER_DAY)].map((_, i) => (
                <span key={i} style={{ fontSize: 14, opacity: i < playsLeft ? 1 : 0.2 }}>🚀</span>
              ))}
            </div>
          </>
        )}

        {/* START SCREEN */}
        {phase === "start" && (
          <div style={styles.overlay}>
            <div style={{ animation: "popIn 0.6s ease", maxWidth: 360, width: "100%" }}>
              <div style={{ fontSize: 72, marginBottom: 4, animation: "bobFloat 2.5s ease-in-out infinite" }}>🌍</div>
              <h1 style={styles.title}>Space Poo<br />Defense</h1>
              <p style={styles.subtitle}>Protect Earth from space poop!</p>

              {showNameInput ? (
                <div style={styles.nameInputBox}>
                  <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8, fontWeight: 700 }}>Enter your name, defender:</p>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.slice(0, 16))}
                    placeholder="Your username..."
                    maxLength={16}
                    style={styles.nameInput}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && username.trim()) setShowNameInput(false);
                    }}
                  />
                  <button
                    onClick={() => { if (username.trim()) setShowNameInput(false); }}
                    disabled={!username.trim()}
                    style={{ ...styles.smallBtn, opacity: username.trim() ? 1 : 0.4 }}
                  >
                    Ready! ✅
                  </button>
                </div>
              ) : (
                <>
                  <p style={{ color: "#64748b", fontSize: 13, marginBottom: 4 }}>Playing as</p>
                  <p style={{ color: "#fbbf24", fontFamily: "'Bungee', cursive", fontSize: 18, marginBottom: 16 }}>{username}</p>

                  <div style={styles.rulesBox}>
                    <p style={styles.rule}>👆 Tap the 💩 before they hit Earth!</p>
                    <p style={styles.rule}>🏎️ Each tap = +0.2x speed + more poop!</p>
                    <p style={{ ...styles.rule, color: "#f87171" }}>☄️ One hit = Game Over!</p>
                  </div>

                  <div style={styles.playsBox}>
                    <span style={{ color: "#94a3b8", fontSize: 13 }}>Plays remaining today: </span>
                    {[...Array(MAX_PLAYS_PER_DAY)].map((_, i) => (
                      <span key={i} style={{ fontSize: 18, opacity: i < playsLeft ? 1 : 0.2, marginLeft: 2 }}>🚀</span>
                    ))}
                  </div>

                  {playsLeft > 0 ? (
                    <button onClick={startGame} style={styles.playBtn}>DEFEND EARTH! 🚀</button>
                  ) : (
                    <div style={{ marginTop: 16 }}>
                      <p style={{ color: "#f87171", fontFamily: "'Bungee', cursive", fontSize: 16, marginBottom: 8 }}>No plays left today!</p>
                      <p style={{ color: "#64748b", fontSize: 13 }}>Come back tomorrow for 3 more plays</p>
                    </div>
                  )}

                  {/* Leaderboard */}
                  <div style={styles.lbBox}>
                    <p style={styles.lbTitle}>🏆 TOP DEFENDERS</p>
                    {lb.map((entry, i) => (
                      <div key={i} style={{ ...styles.lbRow, animation: `fadeIn ${0.3 + i * 0.1}s ease`, background: i === 0 ? "rgba(255,200,50,0.08)" : "transparent" }}>
                        <span style={styles.lbMedal}>{medalEmoji(i)}</span>
                        <span style={styles.lbName}>{entry.name}</span>
                        <span style={styles.lbScore}>{entry.score}</span>
                      </div>
                    ))}
                  </div>

                  <p
                    onClick={() => { setShowCodeModal(true); setCodeInput(""); setCodeError(""); setCodeSuccess(false); }}
                    style={styles.secretLink}
                  >
                    Got a code?
                  </p>

                  <p onClick={() => setShowNameInput(true)} style={{ color: "#475569", fontSize: 11, marginTop: 6, cursor: "pointer", textDecoration: "underline" }}>
                    Change name
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* GAME OVER SCREEN */}
        {phase === "gameover" && (
          <div style={styles.overlay}>
            <div style={{ animation: "popIn 0.5s ease", maxWidth: 360, width: "100%" }}>
              <div style={{ fontSize: 64, marginBottom: 8 }}>
                {score >= 50 ? "🏆" : score >= 30 ? "⭐" : score >= 15 ? "🛸" : "💥"}
              </div>
              <h2 style={styles.gameOverTitle}>
                {score >= 50 ? "GALACTIC HERO!" : score >= 30 ? "SPACE COMMANDER!" : score >= 15 ? "GOOD EFFORT!" : "EARTH DESTROYED!"}
              </h2>
              <div style={styles.finalScore}>{score}</div>
              <p style={styles.finalLabel}>poops deflected</p>
              <p style={styles.speedStat}>Max speed: ×{speedMult.toFixed(1)}</p>

              {lb.find(e => e.name === username.trim() && e.score === score) && (
                <p style={{ color: "#fbbf24", fontFamily: "'Bungee', cursive", fontSize: 14, marginBottom: 8, animation: "comboGlow 0.5s ease infinite" }}>
                  🎉 ON THE LEADERBOARD!
                </p>
              )}

              {/* Leaderboard */}
              <div style={styles.lbBox}>
                <p style={styles.lbTitle}>🏆 TOP DEFENDERS</p>
                {lb.map((entry, i) => {
                  const isYou = entry.name === username.trim() && entry.score === score;
                  return (
                    <div key={i} style={{
                      ...styles.lbRow,
                      animation: `fadeIn ${0.3 + i * 0.1}s ease`,
                      background: isYou ? "rgba(100,200,255,0.1)" : i === 0 ? "rgba(255,200,50,0.08)" : "transparent",
                      border: isYou ? "1px solid rgba(100,200,255,0.3)" : "1px solid transparent",
                    }}>
                      <span style={styles.lbMedal}>{medalEmoji(i)}</span>
                      <span style={{ ...styles.lbName, color: isYou ? "#67e8f9" : "#e2e8f0" }}>{entry.name} {isYou ? "← YOU" : ""}</span>
                      <span style={styles.lbScore}>{entry.score}</span>
                    </div>
                  );
                })}
              </div>

              <div style={styles.playsBox}>
                <span style={{ color: "#94a3b8", fontSize: 13 }}>Plays left: </span>
                {[...Array(MAX_PLAYS_PER_DAY)].map((_, i) => (
                  <span key={i} style={{ fontSize: 18, opacity: i < playsLeft ? 1 : 0.2, marginLeft: 2 }}>🚀</span>
                ))}
              </div>

              {playsLeft > 0 ? (
                <button onClick={startGame} style={styles.playBtn}>RETRY 🔄</button>
              ) : (
                <div style={{ marginTop: 16 }}>
                  <p style={{ color: "#f87171", fontFamily: "'Bungee', cursive", fontSize: 15 }}>No plays left today!</p>
                  <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Come back tomorrow</p>
                </div>
              )}

              <p
                onClick={() => { setShowCodeModal(true); setCodeInput(""); setCodeError(""); setCodeSuccess(false); }}
                style={styles.secretLink}
              >
                Got a code?
              </p>

              <p onClick={() => { setPhase("start"); setShowNameInput(false); }} style={{ color: "#475569", fontSize: 11, marginTop: 6, cursor: "pointer", textDecoration: "underline" }}>
                Back to menu
              </p>
            </div>
          </div>
        )}

        {/* SECRET CODE MODAL */}
        {showCodeModal && (
          <div style={styles.modalOverlay} onClick={() => setShowCodeModal(false)}>
            <div style={{ ...styles.modal, animation: "popIn 0.3s ease" }} onClick={e => e.stopPropagation()}>
              {codeSuccess ? (
                <div style={{ animation: "successPop 0.4s ease", textAlign: "center" }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
                  <p style={{ color: "#4ade80", fontFamily: "'Bungee', cursive", fontSize: 18 }}>PLAYS RESET!</p>
                  <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>You got 3 more plays!</p>
                </div>
              ) : (
                <>
                  <p style={{ color: "#e2e8f0", fontFamily: "'Bungee', cursive", fontSize: 16, marginBottom: 12 }}>🔐 Enter Secret Code</p>
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeError(""); }}
                    placeholder="CODE..."
                    style={styles.codeInput}
                    onKeyDown={(e) => { if (e.key === "Enter") handleCodeSubmit(); }}
                    autoFocus
                  />
                  {codeError && <p style={{ color: "#f87171", fontSize: 12, marginTop: 6 }}>{codeError}</p>}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button onClick={() => setShowCodeModal(false)} style={styles.cancelBtn}>Cancel</button>
                    <button onClick={handleCodeSubmit} style={styles.submitCodeBtn}>Submit</button>
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

const styles = {
  wrapper: { width: "100vw", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: "#000", fontFamily: "'Nunito', sans-serif" },
  gameArea: { position: "relative", width: "100%", maxWidth: 480, height: "100vh", maxHeight: 860, overflow: "hidden", boxShadow: "0 0 80px rgba(50,100,200,0.15)" },
  space: { position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 20%, #0a0e27 0%, #050816 50%, #020408 100%)", zIndex: 0 },
  nebula1: { position: "absolute", width: "120%", height: "120%", top: "-10%", left: "-10%", background: "radial-gradient(ellipse at 70% 30%, rgba(100,50,180,0.08) 0%, transparent 50%)", zIndex: 0, pointerEvents: "none" },
  nebula2: { position: "absolute", width: "120%", height: "120%", top: "-10%", left: "-10%", background: "radial-gradient(ellipse at 20% 70%, rgba(50,100,200,0.06) 0%, transparent 50%)", zIndex: 0, pointerEvents: "none" },
  hud: { position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", paddingTop: 48, background: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)", zIndex: 50 },
  hudLeft: { display: "flex", alignItems: "center" },
  hudCenter: { flex: 1, textAlign: "center" },
  hudRight: { display: "flex", alignItems: "center" },
  hudScore: { fontFamily: "'Bungee', cursive", fontSize: 24, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.5)" },
  hudSpeed: { fontFamily: "'Bungee', cursive", fontSize: 16, color: "#fbbf24", background: "rgba(255,200,50,0.1)", border: "1px solid rgba(255,200,50,0.2)", borderRadius: 10, padding: "4px 10px" },
  speedLabel: { fontFamily: "'Bungee', cursive", fontSize: 12, color: "#fb923c", textShadow: "0 0 10px rgba(251,146,60,0.5)" },
  comboDisplay: { position: "absolute", bottom: 60, left: 0, right: 0, textAlign: "center", fontFamily: "'Bungee', cursive", fontSize: 22, color: "#fbbf24", zIndex: 50, pointerEvents: "none" },
  playsIndicator: { position: "absolute", bottom: 16, right: 16, display: "flex", gap: 4, zIndex: 50 },
  overlay: { position: "absolute", inset: 0, background: "rgba(2,4,8,0.92)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", zIndex: 100, padding: 24, overflowY: "auto" },
  title: { fontFamily: "'Bungee', cursive", fontSize: 34, color: "#fff", marginBottom: 6, textShadow: "0 0 20px rgba(100,180,255,0.4), 0 3px 10px rgba(0,0,0,0.5)", lineHeight: 1.15 },
  subtitle: { color: "#94a3b8", fontSize: 15, marginBottom: 20, fontWeight: 700 },
  nameInputBox: { background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "20px", marginBottom: 16, border: "1px solid rgba(100,180,255,0.1)" },
  nameInput: { width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid rgba(100,180,255,0.2)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 16, fontFamily: "'Nunito', sans-serif", fontWeight: 700, outline: "none", textAlign: "center", marginBottom: 10 },
  smallBtn: { padding: "10px 24px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#fff", fontFamily: "'Bungee', cursive", fontSize: 14, cursor: "pointer" },
  rulesBox: { background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: "14px 18px", marginBottom: 16, border: "1px solid rgba(100,180,255,0.08)" },
  rule: { color: "#cbd5e1", fontSize: 13, marginBottom: 6, fontWeight: 700, lineHeight: 1.5 },
  playsBox: { display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 16 },
  playBtn: { background: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#fff", border: "none", borderRadius: 20, padding: "14px 36px", fontSize: 18, fontFamily: "'Bungee', cursive", cursor: "pointer", boxShadow: "0 6px 30px rgba(99,102,241,0.4)", letterSpacing: 1 },
  lbBox: { background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: "14px 16px", marginTop: 16, marginBottom: 12, border: "1px solid rgba(255,255,255,0.06)" },
  lbTitle: { fontFamily: "'Bungee', cursive", fontSize: 14, color: "#fbbf24", marginBottom: 10, letterSpacing: 1 },
  lbRow: { display: "flex", alignItems: "center", padding: "8px 10px", borderRadius: 10, marginBottom: 4 },
  lbMedal: { fontSize: 16, width: 32, textAlign: "center" },
  lbName: { flex: 1, textAlign: "left", color: "#e2e8f0", fontSize: 14, fontWeight: 700 },
  lbScore: { fontFamily: "'Bungee', cursive", fontSize: 15, color: "#fbbf24", minWidth: 40, textAlign: "right" },
  secretLink: { color: "#334155", fontSize: 11, marginTop: 14, cursor: "pointer", textDecoration: "underline", transition: "color 0.2s" },
  modalOverlay: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 24 },
  modal: { background: "#1e293b", borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 320, border: "1px solid rgba(100,180,255,0.15)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" },
  codeInput: { width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid rgba(100,180,255,0.2)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 18, fontFamily: "'Bungee', cursive", outline: "none", textAlign: "center", letterSpacing: 4 },
  cancelBtn: { flex: 1, padding: "10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#94a3b8", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" },
  submitCodeBtn: { flex: 1, padding: "10px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#fff", fontFamily: "'Bungee', cursive", fontSize: 14, cursor: "pointer" },
  gameOverTitle: { fontFamily: "'Bungee', cursive", fontSize: 24, color: "#f87171", marginBottom: 8, textShadow: "0 0 15px rgba(248,113,113,0.4)" },
  finalScore: { fontFamily: "'Bungee', cursive", fontSize: 56, color: "#fff", textShadow: "0 0 20px rgba(100,180,255,0.3)" },
  finalLabel: { color: "#94a3b8", fontSize: 14, marginBottom: 4, fontWeight: 700 },
  speedStat: { color: "#fbbf24", fontSize: 13, fontWeight: 700, marginBottom: 12, fontFamily: "'Bungee', cursive" },
};
