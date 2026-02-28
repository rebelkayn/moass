import { useState, useEffect, useRef, useCallback } from "react";

const EMOJIS_SAFE = ["🌸", "🍉", "⭐", "🎈", "🦋", "🌺", "🍊", "💎", "🎵", "🌈", "🍀", "🧸"];
const POO = "💩";
const POOL_HEIGHT_PCT = 0.28;
const SPAWN_INTERVAL_INITIAL = 1400;
const SPAWN_INTERVAL_MIN = 300;
const FALL_SPEED_INITIAL = 1.2;
const FALL_SPEED_MAX = 7;
const POO_CHANCE_INITIAL = 0.28;
const POO_CHANCE_MAX = 0.55;

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

let idCounter = 0;

export default function PoolPooPatrol() {
  const [phase, setPhase] = useState("start");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [emojis, setEmojis] = useState([]);
  const [splashes, setSplashes] = useState([]);
  const [tapEffects, setTapEffects] = useState([]);
  const [screenFlash, setScreenFlash] = useState(false);
  const [speedLevel, setSpeedLevel] = useState(0);
  const gameRef = useRef(null);
  const animRef = useRef(null);
  const spawnRef = useRef(null);
  const scoreRef = useRef(0);
  const phaseRef = useRef("start");
  const speedRef = useRef(0);
  const gameAreaRef = useRef({ width: 400, height: 700 });

  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { speedRef.current = speedLevel; }, [speedLevel]);

  const getPoolY = useCallback(() => {
    return gameAreaRef.current.height * (1 - POOL_HEIGHT_PCT);
  }, []);

  const spawnEmoji = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    const spd = speedRef.current;
    const pooChance = Math.min(POO_CHANCE_INITIAL + spd * 0.015, POO_CHANCE_MAX);
    const isPoo = Math.random() < pooChance;
    const emoji = isPoo ? POO : EMOJIS_SAFE[Math.floor(Math.random() * EMOJIS_SAFE.length)];
    const speed = Math.min(FALL_SPEED_INITIAL + spd * 0.18, FALL_SPEED_MAX) * rand(0.85, 1.15);
    const size = isPoo ? rand(42, 56) : rand(30, 44);
    const w = gameAreaRef.current.width;
    const x = rand(size, w - size);

    const newEmoji = {
      id: ++idCounter,
      emoji,
      isPoo,
      x,
      y: -size,
      speed,
      size,
      wobble: rand(0, Math.PI * 2),
      wobbleSpeed: rand(0.02, 0.06),
      wobbleAmp: rand(8, 20),
      rotation: rand(-30, 30),
      rotSpeed: rand(-2, 2),
      tapped: false,
    };

    setEmojis(prev => [...prev, newEmoji]);
  }, []);

  const gameLoop = useCallback(() => {
    if (phaseRef.current !== "playing") return;

    setEmojis(prev => {
      const poolY = getPoolY();
      const updated = [];
      let pooHitPool = false;
      const newSplashes = [];

      for (const e of prev) {
        if (e.tapped) continue;
        const newY = e.y + e.speed;
        const newWobble = e.wobble + e.wobbleSpeed;
        const newRot = e.rotation + e.rotSpeed;

        if (newY + e.size / 2 >= poolY) {
          if (e.isPoo) {
            pooHitPool = true;
            newSplashes.push({ id: e.id, x: e.x, y: poolY, type: "poo" });
          } else {
            newSplashes.push({ id: e.id, x: e.x, y: poolY, type: "safe" });
          }
          continue;
        }

        updated.push({ ...e, y: newY, wobble: newWobble, rotation: newRot });
      }

      if (newSplashes.length > 0) {
        setSplashes(sp => [...sp, ...newSplashes]);
        setTimeout(() => {
          setSplashes(sp => sp.filter(s => !newSplashes.find(ns => ns.id === s.id)));
        }, 600);
      }

      if (pooHitPool) {
        setScreenFlash(true);
        setTimeout(() => setScreenFlash(false), 400);
        setPhase("gameover");
        setHighScore(h => Math.max(h, scoreRef.current));
        return [];
      }

      return updated;
    });

    animRef.current = requestAnimationFrame(gameLoop);
  }, [getPoolY]);

  const startGame = useCallback(() => {
    setScore(0);
    setEmojis([]);
    setSplashes([]);
    setTapEffects([]);
    setSpeedLevel(0);
    scoreRef.current = 0;
    speedRef.current = 0;
    idCounter = 0;
    setPhase("playing");
  }, []);

  useEffect(() => {
    if (phase === "playing") {
      animRef.current = requestAnimationFrame(gameLoop);
      const spawnTick = () => {
        if (phaseRef.current !== "playing") return;
        spawnEmoji();
        const interval = Math.max(
          SPAWN_INTERVAL_INITIAL - speedRef.current * 50,
          SPAWN_INTERVAL_MIN
        );
        spawnRef.current = setTimeout(spawnTick, interval * rand(0.7, 1.3));
      };
      spawnTick();

      return () => {
        cancelAnimationFrame(animRef.current);
        clearTimeout(spawnRef.current);
      };
    }
  }, [phase, gameLoop, spawnEmoji]);

  useEffect(() => {
    const updateSize = () => {
      if (gameRef.current) {
        gameAreaRef.current = {
          width: gameRef.current.clientWidth,
          height: gameRef.current.clientHeight,
        };
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handleTap = useCallback((e, emoji) => {
    e.preventDefault();
    e.stopPropagation();
    if (emoji.tapped || phaseRef.current !== "playing") return;

    if (emoji.isPoo) {
      setScore(s => s + 1);
      setSpeedLevel(s => s + 1);
      setTapEffects(prev => [...prev, { id: emoji.id, x: emoji.x, y: emoji.y, text: "+1 🏎️", color: "#4ade80" }]);
    } else {
      setScreenFlash(true);
      setTimeout(() => setScreenFlash(false), 400);
      setPhase("gameover");
      setHighScore(h => Math.max(h, scoreRef.current));
      setTapEffects(prev => [...prev, { id: emoji.id, x: emoji.x, y: emoji.y, text: "WRONG!", color: "#f87171" }]);
    }

    setEmojis(prev => prev.map(em => em.id === emoji.id ? { ...em, tapped: true } : em));
    setTimeout(() => {
      setEmojis(prev => prev.filter(em => em.id !== emoji.id));
      setTapEffects(prev => prev.filter(te => te.id !== emoji.id));
    }, 400);
  }, []);

  const getSpeedLabel = () => {
    if (speedLevel < 3) return "";
    if (speedLevel < 8) return "⚡ Getting faster!";
    if (speedLevel < 15) return "🔥 Speed up!";
    if (speedLevel < 25) return "🚀 TURBO MODE";
    return "☠️ INSANE SPEED";
  };

  return (
    <div style={styles.wrapper}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-user-select: none; user-select: none; }
        body { margin: 0; overflow: hidden; }
        @keyframes popIn { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes floatUp { 0% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-60px) scale(1.3); } }
        @keyframes splash { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        @keyframes waveMove { 0% { background-position-x: 0; } 100% { background-position-x: 200px; } }
        @keyframes flashRed { 0% { background-color: rgba(255,50,50,0.4); } 100% { background-color: transparent; } }
        @keyframes bobTitle { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-8px) rotate(2deg); } }
        @keyframes speedPulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.1); } }
      `}</style>

      <div
        ref={gameRef}
        style={{
          ...styles.gameArea,
          ...(screenFlash ? { animation: "flashRed 0.4s ease" } : {}),
        }}
      >
        <div style={styles.sky} />
        <div style={styles.sun}>☀️</div>
        <div style={{ ...styles.cloud, top: "6%", left: "10%", fontSize: 36 }}>☁️</div>
        <div style={{ ...styles.cloud, top: "3%", right: "15%", fontSize: 28 }}>☁️</div>
        <div style={{ ...styles.cloud, top: "12%", left: "55%", fontSize: 22 }}>☁️</div>

        <div style={{ ...styles.mansion, bottom: `${POOL_HEIGHT_PCT * 100 + 3}%` }}>
          <div style={styles.mansionBody}>
            <div style={styles.mansionRoof} />
            <div style={styles.mansionWindows}>
              <div style={styles.window}>🪟</div>
              <div style={styles.window}>🪟</div>
              <div style={styles.window}>🪟</div>
            </div>
            <div style={styles.mansionDoor}>🚪</div>
          </div>
        </div>

        <div style={{ ...styles.palm, left: "5%", bottom: `${POOL_HEIGHT_PCT * 100}%` }}>🌴</div>
        <div style={{ ...styles.palm, right: "5%", bottom: `${POOL_HEIGHT_PCT * 100}%` }}>🌴</div>

        <div style={{ ...styles.pool, height: `${POOL_HEIGHT_PCT * 100}%` }}>
          <div style={styles.poolWater} />
          <div style={styles.poolEdge} />
          <div style={{ ...styles.floaty, left: "20%", top: "40%" }}>🦩</div>
          <div style={{ ...styles.floaty, right: "25%", top: "55%" }}>🛟</div>

          {splashes.map(s => (
            <div
              key={s.id}
              style={{
                position: "absolute",
                left: s.x - 20,
                top: 10,
                fontSize: 32,
                animation: "splash 0.6s ease forwards",
                pointerEvents: "none",
                zIndex: 20,
              }}
            >
              {s.type === "poo" ? "🤮" : "💦"}
            </div>
          ))}
        </div>

        {emojis.map(e => (
          <div
            key={e.id}
            onPointerDown={(ev) => handleTap(ev, e)}
            style={{
              position: "absolute",
              left: e.x + Math.sin(e.wobble) * e.wobbleAmp - e.size / 2,
              top: e.y,
              width: e.size + 16,
              height: e.size + 16,
              fontSize: e.size,
              lineHeight: `${e.size + 16}px`,
              textAlign: "center",
              cursor: "pointer",
              transform: `rotate(${e.rotation}deg)`,
              transition: e.tapped ? "all 0.3s ease" : "none",
              opacity: e.tapped ? 0 : 1,
              scale: e.tapped ? "2" : "1",
              zIndex: e.isPoo ? 15 : 10,
              filter: e.isPoo ? "drop-shadow(0 4px 8px rgba(139,90,43,0.5))" : "none",
              touchAction: "none",
            }}
          >
            {e.emoji}
          </div>
        ))}

        {tapEffects.map(te => (
          <div
            key={te.id}
            style={{
              position: "absolute",
              left: te.x - 20,
              top: te.y - 20,
              fontSize: 20,
              fontFamily: "'Lilita One', cursive",
              fontWeight: 800,
              color: te.color,
              animation: "floatUp 0.5s ease forwards",
              pointerEvents: "none",
              zIndex: 30,
              textShadow: "0 2px 4px rgba(0,0,0,0.4)",
            }}
          >
            {te.text}
          </div>
        ))}

        {phase === "playing" && (
          <div style={styles.hud}>
            <div style={styles.hudLeft}>
              <span style={styles.hudScore}>💩 {score}</span>
            </div>
            <div style={styles.hudCenter}>
              {getSpeedLabel() && (
                <span style={{ ...styles.speedLabel, animation: "speedPulse 1s ease-in-out infinite" }}>
                  {getSpeedLabel()}
                </span>
              )}
            </div>
            <div style={styles.hudRight}>
              <span style={styles.hudSpeed}>×{(1 + speedLevel * 0.15).toFixed(1)}</span>
            </div>
          </div>
        )}

        {phase === "start" && (
          <div style={styles.overlay}>
            <div style={{ animation: "popIn 0.5s ease" }}>
              <div style={{ fontSize: 72, marginBottom: 8, animation: "bobTitle 2s ease-in-out infinite" }}>💩</div>
              <h1 style={styles.title}>Pool Poo Patrol</h1>
              <div style={styles.rulesBox}>
                <p style={styles.rule}>👆 Tap the 💩 to score — game speeds up each tap!</p>
                <p style={styles.rule}>🚫 Don't tap other emojis — instant game over!</p>
                <p style={styles.rule}>🏊 If a 💩 hits the pool — game over!</p>
                <p style={{ ...styles.rule, color: "#fbbf24", marginTop: 8 }}>How long can you survive? 💀</p>
              </div>
              <button onClick={startGame} style={styles.playBtn}>
                Play! 🏊
              </button>
              {highScore > 0 && <p style={styles.highScoreText}>Best: {highScore} 💩</p>}
            </div>
          </div>
        )}

        {phase === "gameover" && (
          <div style={styles.overlay}>
            <div style={{ animation: "popIn 0.5s ease" }}>
              <div style={{ fontSize: 64, marginBottom: 8 }}>
                {score >= 30 ? "🏆" : score >= 20 ? "🔥" : score >= 10 ? "👏" : "💀"}
              </div>
              <h2 style={styles.gameOverTitle}>
                {score >= 30 ? "LEGENDARY!" : score >= 20 ? "INSANE RUN!" : score >= 10 ? "Nice try!" : "Pool Contaminated!"}
              </h2>
              <div style={styles.finalScore}>{score}</div>
              <p style={styles.finalLabel}>poops caught</p>
              <p style={styles.speedStat}>Top speed: ×{(1 + speedLevel * 0.15).toFixed(1)}</p>
              {score >= highScore && score > 0 && (
                <p style={{ color: "#fbbf24", fontFamily: "'Lilita One', cursive", fontSize: 18, marginBottom: 12 }}>
                  🎉 New High Score!
                </p>
              )}
              <button onClick={startGame} style={styles.playBtn}>
                Try Again 🔄
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100vw",
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#1a1a2e",
    fontFamily: "'Nunito', sans-serif",
  },
  gameArea: {
    position: "relative",
    width: "100%",
    maxWidth: 480,
    height: "100vh",
    maxHeight: 860,
    overflow: "hidden",
    boxShadow: "0 0 60px rgba(0,0,0,0.5)",
  },
  sky: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(180deg, #38bdf8 0%, #7dd3fc 35%, #bae6fd 55%, #e0f2fe 75%, #60a832 75.5%, #4d8c28 100%)",
    zIndex: 0,
  },
  sun: {
    position: "absolute",
    top: "4%",
    right: "12%",
    fontSize: 48,
    zIndex: 1,
    filter: "drop-shadow(0 0 20px rgba(250,200,50,0.6))",
  },
  cloud: { position: "absolute", zIndex: 1, opacity: 0.9 },
  mansion: {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 2,
  },
  mansionBody: {
    position: "relative",
    width: 200,
    height: 100,
    background: "linear-gradient(180deg, #fef3c7, #fde68a)",
    borderRadius: "8px 8px 0 0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
    border: "2px solid #d97706",
  },
  mansionRoof: {
    position: "absolute",
    top: -30,
    left: -20,
    width: 240,
    height: 0,
    borderLeft: "20px solid transparent",
    borderRight: "20px solid transparent",
    borderBottom: "30px solid #92400e",
  },
  mansionWindows: { display: "flex", gap: 16, marginTop: 8 },
  window: { fontSize: 28 },
  mansionDoor: { fontSize: 28, marginTop: 4 },
  palm: {
    position: "absolute",
    fontSize: 56,
    zIndex: 3,
    filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.2))",
  },
  pool: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    overflow: "hidden",
  },
  poolWater: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(180deg, rgba(56,189,248,0.85) 0%, rgba(14,116,144,0.95) 100%)",
    backgroundSize: "200px 100%",
    animation: "waveMove 4s linear infinite",
  },
  poolEdge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 12,
    background: "linear-gradient(90deg, #d4d4d8, #e4e4e7, #d4d4d8)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    zIndex: 6,
  },
  floaty: {
    position: "absolute",
    fontSize: 32,
    opacity: 0.7,
    zIndex: 7,
    animation: "pulse 3s ease-in-out infinite",
  },
  hud: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    paddingTop: 48,
    background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 100%)",
    zIndex: 50,
  },
  hudLeft: { display: "flex", alignItems: "center", gap: 12 },
  hudCenter: { flex: 1, textAlign: "center" },
  hudRight: { display: "flex", alignItems: "center" },
  hudScore: {
    fontFamily: "'Lilita One', cursive",
    fontSize: 26,
    color: "#fff",
    textShadow: "0 2px 6px rgba(0,0,0,0.4)",
  },
  hudSpeed: {
    fontFamily: "'Lilita One', cursive",
    fontSize: 18,
    color: "#fbbf24",
    background: "rgba(0,0,0,0.35)",
    borderRadius: 10,
    padding: "4px 10px",
  },
  speedLabel: {
    fontFamily: "'Lilita One', cursive",
    fontSize: 13,
    color: "#fb923c",
    textShadow: "0 1px 4px rgba(0,0,0,0.3)",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(15,23,42,0.88)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    zIndex: 100,
    padding: 24,
  },
  title: {
    fontFamily: "'Lilita One', cursive",
    fontSize: 38,
    color: "#fff",
    marginBottom: 16,
    textShadow: "0 3px 10px rgba(0,0,0,0.3)",
    letterSpacing: 1,
  },
  rulesBox: {
    background: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: "16px 20px",
    marginBottom: 24,
    border: "1px solid rgba(255,255,255,0.08)",
  },
  rule: {
    color: "#cbd5e1",
    fontSize: 14,
    marginBottom: 6,
    fontWeight: 700,
    lineHeight: 1.5,
  },
  playBtn: {
    marginTop: 8,
    background: "linear-gradient(135deg, #f59e0b, #d97706)",
    color: "#fff",
    border: "none",
    borderRadius: 20,
    padding: "16px 48px",
    fontSize: 22,
    fontFamily: "'Lilita One', cursive",
    cursor: "pointer",
    boxShadow: "0 6px 24px rgba(245,158,11,0.4)",
    letterSpacing: 1,
  },
  highScoreText: {
    color: "#94a3b8",
    marginTop: 16,
    fontSize: 14,
    fontWeight: 600,
  },
  gameOverTitle: {
    fontFamily: "'Lilita One', cursive",
    fontSize: 30,
    color: "#f87171",
    marginBottom: 8,
    textShadow: "0 2px 8px rgba(0,0,0,0.3)",
  },
  finalScore: {
    fontFamily: "'Lilita One', cursive",
    fontSize: 64,
    color: "#fff",
    textShadow: "0 4px 12px rgba(0,0,0,0.3)",
  },
  finalLabel: {
    color: "#94a3b8",
    fontSize: 16,
    marginBottom: 4,
    fontWeight: 700,
  },
  speedStat: {
    color: "#fbbf24",
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 12,
  },
};
