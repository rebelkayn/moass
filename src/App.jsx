import { useState, useEffect, useCallback } from "react";

const OPERATIONS = [
  { name: "addition", generate: () => { const a = rand(50, 200); const b = rand(50, 200); return { q: `${a} + ${b}`, answer: a + b }; }},
  { name: "subtraction", generate: () => { const a = rand(100, 500); const b = rand(10, a); return { q: `${a} − ${b}`, answer: a - b }; }},
  { name: "multiplication", generate: () => { const a = rand(3, 15); const b = rand(3, 25); return { q: `${a} × ${b}`, answer: a * b }; }},
  { name: "division", generate: () => { const b = rand(2, 12); const answer = rand(3, 25); return { q: `${b * answer} ÷ ${b}`, answer }; }},
  { name: "exponent", generate: () => { const base = rand(2, 9); const exp = rand(2, 3); return { q: `${base}${exp === 2 ? "²" : "³"}`, answer: Math.pow(base, exp) }; }},
  { name: "percent", generate: () => { const p = [10, 20, 25, 50][rand(0, 3)]; const n = rand(2, 20) * (100 / p); return { q: `What is ${p}% of ${n}?`, answer: (p / 100) * n }; }},
  { name: "fraction", generate: () => { const a = rand(1, 9); const b = rand(1, 9); const d = rand(2, 6); return { q: `${a}/${d} + ${b}/${d}`, answer: `${a + b}/${d}`, raw: (a + b) / d }; }},
];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateChoices(answer) {
  const num = typeof answer === "string" ? eval(answer) : answer;
  const choices = new Set();
  choices.add(typeof answer === "string" ? answer : num);
  while (choices.size < 4) {
    const offset = rand(1, Math.max(5, Math.abs(Math.round(num * 0.3))));
    const wrong = typeof answer === "string"
      ? `${Math.round(eval(answer) + (Math.random() > 0.5 ? offset : -offset))}/${answer.split("/")[1]}`
      : num + (Math.random() > 0.5 ? offset : -offset);
    if (wrong !== answer && wrong !== num && (typeof wrong !== "number" || wrong > 0)) choices.add(wrong);
  }
  return [...choices].sort(() => Math.random() - 0.5);
}

function generateQuestion() {
  const op = OPERATIONS[rand(0, OPERATIONS.length - 1)];
  const { q, answer } = op.generate();
  return { question: q, answer, choices: generateChoices(answer) };
}

const TOTAL_QUESTIONS = 10;

const ENCOURAGEMENTS = ["Nailed it! 🎯", "Brilliant! 🧠", "You got it! ✨", "Math wizard! 🪄", "Perfect! 💎", "Correct! 🔥"];
const MISSES = ["Not quite! 😬", "So close!", "Oops!", "Almost!"];

export default function MathQuiz() {
  const [phase, setPhase] = useState("start");
  const [current, setCurrent] = useState(null);
  const [questionNum, setQuestionNum] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [streak, setStreak] = useState(0);
  const [shakeWrong, setShakeWrong] = useState(false);
  const [history, setHistory] = useState([]);

  const nextQuestion = useCallback(() => {
    if (questionNum >= TOTAL_QUESTIONS) {
      setPhase("results");
      return;
    }
    setCurrent(generateQuestion());
    setSelected(null);
    setFeedback("");
    setShakeWrong(false);
  }, [questionNum]);

  useEffect(() => {
    if (phase === "playing") nextQuestion();
  }, [phase]);

  const handleChoice = (choice) => {
    if (selected !== null) return;
    setSelected(choice);
    const isCorrect = String(choice) === String(current.answer);
    const newStreak = isCorrect ? streak + 1 : 0;

    setHistory(h => [...h, { question: current.question, correct: isCorrect, answer: current.answer, picked: choice }]);

    if (isCorrect) {
      setScore(s => s + 1);
      setStreak(newStreak);
      setFeedback(ENCOURAGEMENTS[rand(0, ENCOURAGEMENTS.length - 1)] + (newStreak >= 3 ? ` ${newStreak} streak! 🔥` : ""));
    } else {
      setStreak(0);
      setShakeWrong(true);
      setFeedback(`${MISSES[rand(0, MISSES.length - 1)]} Answer: ${current.answer}`);
    }

    setTimeout(() => {
      setQuestionNum(n => n + 1);
    }, 1500);
  };

  useEffect(() => {
    if (questionNum > 0 && questionNum <= TOTAL_QUESTIONS && phase === "playing") {
      nextQuestion();
    } else if (questionNum > 0 && questionNum > TOTAL_QUESTIONS) {
      setPhase("results");
    }
  }, [questionNum]);

  const restart = () => {
    setPhase("playing");
    setQuestionNum(0);
    setScore(0);
    setStreak(0);
    setSelected(null);
    setHistory([]);
    setFeedback("");
  };

  const pct = Math.round((score / TOTAL_QUESTIONS) * 100);
  const grade = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : "Keep practicing!";

  return (
    <div style={styles.wrapper}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        @keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes slideUp { 0% { transform: translateY(30px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-8px); } 40%,80% { transform: translateX(8px); } }
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes gradientMove { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; }
        .choice-btn { transition: all 0.2s ease; cursor: pointer; border: none; }
        .choice-btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
        .choice-btn:active:not(:disabled) { transform: translateY(0); }
        .shake { animation: shake 0.5s ease; }
      `}</style>

      <div style={styles.container}>
        {/* Decorative shapes */}
        <div style={{ ...styles.decor, top: -40, left: -40, width: 120, height: 120, background: "rgba(255,200,50,0.15)", borderRadius: "50%" }} />
        <div style={{ ...styles.decor, bottom: -30, right: -30, width: 100, height: 100, background: "rgba(100,200,255,0.12)", borderRadius: "30%" }} />
        <div style={{ ...styles.decor, top: 60, right: -20, width: 60, height: 60, background: "rgba(255,100,150,0.1)", borderRadius: "50%" }} />

        {phase === "start" && (
          <div style={{ animation: "popIn 0.5s ease", textAlign: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 8, animation: "float 3s ease-in-out infinite" }}>🧮</div>
            <h1 style={styles.title}>Math Blitz</h1>
            <p style={styles.subtitle}>10 questions · 7th grade level · How many can you nail?</p>
            <button onClick={() => setPhase("playing")} style={styles.startBtn} className="choice-btn">
              Let's Go! →
            </button>
          </div>
        )}

        {phase === "playing" && current && (
          <div>
            {/* Progress bar */}
            <div style={styles.progressContainer}>
              <div style={{ ...styles.progressBar, width: `${(questionNum / TOTAL_QUESTIONS) * 100}%` }} />
            </div>
            <div style={styles.topRow}>
              <span style={styles.questionCount}>Q{questionNum}/{TOTAL_QUESTIONS}</span>
              <span style={styles.scoreDisplay}>⭐ {score}</span>
              {streak >= 2 && <span style={{ ...styles.streakBadge, animation: "pulse 0.6s ease" }}>🔥 {streak}</span>}
            </div>

            {/* Question */}
            <div style={{ ...styles.questionCard, animation: "popIn 0.35s ease" }}>
              <div style={styles.questionLabel}>Solve</div>
              <div style={styles.questionText}>{current.question}</div>
            </div>

            {/* Choices */}
            <div style={styles.choicesGrid}>
              {current.choices.map((c, i) => {
                const isSelected = selected !== null && String(c) === String(selected);
                const isCorrectAnswer = selected !== null && String(c) === String(current.answer);
                const isWrongSelected = isSelected && !isCorrectAnswer;
                let bg = styles.choiceColors[i];
                if (selected !== null) {
                  if (isCorrectAnswer) bg = "#22c55e";
                  else if (isWrongSelected) bg = "#ef4444";
                  else bg = "#d1d5db";
                }
                return (
                  <button
                    key={i}
                    className={`choice-btn ${isWrongSelected && shakeWrong ? "shake" : ""}`}
                    disabled={selected !== null}
                    onClick={() => handleChoice(c)}
                    style={{
                      ...styles.choiceBtn,
                      background: bg,
                      animation: `slideUp ${0.3 + i * 0.08}s ease`,
                      opacity: selected !== null && !isCorrectAnswer && !isWrongSelected ? 0.4 : 1,
                      color: selected !== null && !isCorrectAnswer && !isWrongSelected ? "#666" : "#fff",
                    }}
                  >
                    <span style={styles.choiceLetter}>{["A", "B", "C", "D"][i]}</span>
                    <span style={styles.choiceValue}>{c}</span>
                  </button>
                );
              })}
            </div>

            {/* Feedback */}
            {feedback && (
              <div style={{ ...styles.feedback, animation: "popIn 0.3s ease", color: selected === current.answer ? "#22c55e" : "#ef4444" }}>
                {feedback}
              </div>
            )}
          </div>
        )}

        {phase === "results" && (
          <div style={{ animation: "popIn 0.5s ease", textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 4 }}>{pct >= 80 ? "🏆" : pct >= 60 ? "👏" : "💪"}</div>
            <h2 style={styles.resultsTitle}>Quiz Complete!</h2>
            <div style={styles.scoreBig}>{score}/{TOTAL_QUESTIONS}</div>
            <div style={styles.gradeLabel}>{grade}</div>
            <div style={styles.pctBar}>
              <div style={{ ...styles.pctFill, width: `${pct}%`, background: pct >= 70 ? "linear-gradient(90deg, #22c55e, #16a34a)" : "linear-gradient(90deg, #f59e0b, #ea580c)" }} />
            </div>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>{pct}% correct</p>

            {/* History */}
            <div style={styles.historyBox}>
              {history.map((h, i) => (
                <div key={i} style={{ ...styles.historyRow, background: h.correct ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)" }}>
                  <span style={{ marginRight: 8 }}>{h.correct ? "✅" : "❌"}</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13 }}>{h.question} = {String(h.answer)}</span>
                </div>
              ))}
            </div>

            <button onClick={restart} style={styles.startBtn} className="choice-btn">
              Play Again 🔄
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
    backgroundSize: "200% 200%",
    animation: "gradientMove 15s ease infinite",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    fontFamily: "'Fredoka', sans-serif",
  },
  container: {
    position: "relative",
    width: "100%",
    maxWidth: 480,
    background: "rgba(30, 41, 59, 0.85)",
    backdropFilter: "blur(20px)",
    borderRadius: 28,
    padding: "36px 28px",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
    overflow: "hidden",
  },
  decor: { position: "absolute", pointerEvents: "none", zIndex: 0 },
  title: {
    fontSize: 38,
    fontWeight: 700,
    color: "#f8fafc",
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 15,
    marginBottom: 32,
    lineHeight: 1.5,
  },
  startBtn: {
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    border: "none",
    borderRadius: 16,
    padding: "16px 40px",
    fontSize: 18,
    fontWeight: 600,
    fontFamily: "'Fredoka', sans-serif",
    cursor: "pointer",
    boxShadow: "0 6px 20px rgba(99,102,241,0.4)",
  },
  progressContainer: {
    height: 6,
    background: "rgba(255,255,255,0.08)",
    borderRadius: 3,
    marginBottom: 16,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    background: "linear-gradient(90deg, #6366f1, #a78bfa)",
    borderRadius: 3,
    transition: "width 0.4s ease",
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  questionCount: { color: "#94a3b8", fontSize: 13, fontWeight: 500 },
  scoreDisplay: { color: "#fbbf24", fontSize: 15, fontWeight: 600 },
  streakBadge: {
    background: "rgba(249,115,22,0.2)",
    color: "#fb923c",
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 13,
    fontWeight: 600,
  },
  questionCard: {
    background: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: "28px 20px",
    textAlign: "center",
    marginBottom: 24,
    border: "1px solid rgba(255,255,255,0.06)",
  },
  questionLabel: {
    color: "#64748b",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 12,
    fontWeight: 600,
  },
  questionText: {
    color: "#f1f5f9",
    fontSize: 32,
    fontWeight: 700,
    fontFamily: "'Space Mono', monospace",
  },
  choicesGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 16,
  },
  choiceBtn: {
    borderRadius: 16,
    padding: "18px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: "'Fredoka', sans-serif",
    fontSize: 16,
    fontWeight: 600,
  },
  choiceLetter: {
    opacity: 0.6,
    fontSize: 12,
    fontWeight: 500,
  },
  choiceValue: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 18,
    fontWeight: 700,
  },
  choiceColors: ["#6366f1", "#ec4899", "#f59e0b", "#14b8a6"],
  feedback: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: 600,
    padding: 8,
  },
  resultsTitle: {
    color: "#f8fafc",
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 8,
  },
  scoreBig: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 52,
    fontWeight: 700,
    color: "#f8fafc",
    marginBottom: 4,
  },
  gradeLabel: {
    fontSize: 20,
    fontWeight: 600,
    color: "#a78bfa",
    marginBottom: 16,
  },
  pctBar: {
    height: 10,
    background: "rgba(255,255,255,0.08)",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 8,
  },
  pctFill: {
    height: "100%",
    borderRadius: 5,
    transition: "width 1s ease",
  },
  historyBox: {
    maxHeight: 180,
    overflowY: "auto",
    marginBottom: 24,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  historyRow: {
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: 10,
    fontSize: 14,
    color: "#cbd5e1",
  },
};
