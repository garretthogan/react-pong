import { useRef, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import GameScene from './components/GameScene'
import { BALL_SPEED } from './constants/gameConstants'
import { logStorageError } from './utils/log'
import './App.css'

const BALL_SPEED_STORAGE_KEY = 'pongBallSpeed'
const THEME_VOLUME_STORAGE_KEY = 'pongThemeVolume'
const THEME_MUTED_STORAGE_KEY = 'pongThemeMuted'
const AI_DIFFICULTY_STORAGE_KEY = 'pongAiDifficulty'
const MIN_BALL_SPEED = 1
const MAX_BALL_SPEED = 50

function loadBallSpeed() {
  try {
    const saved = localStorage.getItem(BALL_SPEED_STORAGE_KEY)
    if (saved != null) {
      const n = Number(saved)
      if (!Number.isNaN(n) && n >= MIN_BALL_SPEED && n <= MAX_BALL_SPEED) return n
    }
  } catch (e) {
    logStorageError('loadBallSpeed', e)
  }
  return BALL_SPEED
}

function App() {
  const [playerScore, setPlayerScore] = useState(0)
  const [aiScore, setAiScore] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const [mouseControlEnabled, setMouseControlEnabled] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [winner, setWinner] = useState(null)
  const [gameKey, setGameKey] = useState(0)
  const [paused, setPaused] = useState(false)
  const [baseBallSpeed, setBaseBallSpeed] = useState(loadBallSpeed)
  const [themeVolume, setThemeVolume] = useState(() => {
    try {
      const v = localStorage.getItem(THEME_VOLUME_STORAGE_KEY)
      if (v != null) { const n = Number(v); if (!Number.isNaN(n) && n >= 0 && n <= 1) return n }
    } catch (e) {
      logStorageError('loadThemeVolume', e)
    }
    return 0.25
  })
  const [themeMuted, setThemeMuted] = useState(() => {
    try {
      const m = localStorage.getItem(THEME_MUTED_STORAGE_KEY)
      if (m !== null) return m === 'true'
    } catch (e) {
      logStorageError('loadThemeMuted', e)
    }
    return false
  })
  const [aiDifficulty, setAiDifficulty] = useState(() => {
    try {
      const v = localStorage.getItem(AI_DIFFICULTY_STORAGE_KEY)
      if (v != null) { const n = Number(v); if (!Number.isNaN(n) && n >= 0 && n <= 1) return n }
    } catch (e) {
      logStorageError('loadAiDifficulty', e)
    }
    return 0.5
  })
  const themeAudioRef = useRef(null)

  const MUSIC_MIX_LEVEL = 0.25

  useEffect(() => {
    const base = import.meta.env.BASE_URL
    const audio = new Audio(`${base}sounds/themesong.wav`)
    audio.loop = true
    themeAudioRef.current = audio
    audio.volume = themeMuted ? 0 : themeVolume * MUSIC_MIX_LEVEL
    audio.play().catch(() => {})
    return () => { audio.pause(); themeAudioRef.current = null }
  }, [])

  useEffect(() => {
    const a = themeAudioRef.current
    if (!a) return
    a.volume = themeMuted ? 0 : themeVolume * MUSIC_MIX_LEVEL
  }, [themeVolume, themeMuted])

  // [Habit loop: Investment] Persist settings so return visit has personalization
  useEffect(() => {
    try {
      localStorage.setItem(THEME_VOLUME_STORAGE_KEY, String(themeVolume))
      localStorage.setItem(THEME_MUTED_STORAGE_KEY, String(themeMuted))
      localStorage.setItem(AI_DIFFICULTY_STORAGE_KEY, String(aiDifficulty))
    } catch (e) {
      logStorageError('persistSettings', e)
    }
  }, [themeVolume, themeMuted, aiDifficulty])

  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target
      const inInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
      if (e.key === 'Escape') {
        if (gameStarted && !gameOver) {
          e.preventDefault()
          setPaused(true)
          document.exitPointerLock()
        }
        return
      }
      if (e.key?.toLowerCase() === 'm') {
        if (inInput) return
        e.preventDefault()
        setThemeMuted((m) => !m)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameStarted, gameOver])

  useEffect(() => {
    if (!gameStarted || gameOver || paused || !mouseControlEnabled) {
      if (document.pointerLockElement === gameAreaRef.current) document.exitPointerLock()
    }
  }, [gameStarted, gameOver, paused, mouseControlEnabled])

  useEffect(() => {
    const handlePointerLockChange = () => {
      if (!document.pointerLockElement && gameAreaRef.current && gameStarted && !gameOver) {
        setPaused(true)
      }
    }
    document.addEventListener('pointerlockchange', handlePointerLockChange)
    return () => document.removeEventListener('pointerlockchange', handlePointerLockChange)
  }, [gameStarted, gameOver])

  // Persist ball speed to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(BALL_SPEED_STORAGE_KEY, String(baseBallSpeed))
    } catch (e) {
      logStorageError('persistBallSpeed', e)
    }
  }, [baseBallSpeed])
  
  // Load stats from localStorage with validation
  const loadStats = () => {
    try {
      const savedStats = localStorage.getItem('pongStats')
      if (savedStats) {
        const parsed = JSON.parse(savedStats)
        // Validate that the stats are reasonable numbers
        const wins = typeof parsed.wins === 'number' && parsed.wins >= 0 ? parsed.wins : 0
        const losses = typeof parsed.losses === 'number' && parsed.losses >= 0 ? parsed.losses : 0
        return { wins, losses }
      }
      return { wins: 0, losses: 0 }
    } catch (e) {
      logStorageError('loadStats', e)
      return { wins: 0, losses: 0 }
    }
  }
  
  const [stats, setStats] = useState(loadStats)
  const gameOverProcessedRef = useRef(false)
  
  // [Habit loop: Investment — durable progress] Persist wins/losses for next trigger
  useEffect(() => {
    try {
      localStorage.setItem('pongStats', JSON.stringify(stats))
    } catch (e) {
      logStorageError('persistStats', e)
    }
  }, [stats])
  
  const resetStats = () => {
    if (!window.confirm('Reset all win/loss stats? This cannot be undone.')) return
    setStats({ wins: 0, losses: 0 })
    try {
      localStorage.setItem('pongStats', JSON.stringify({ wins: 0, losses: 0 }))
    } catch (e) {
      logStorageError('clearStats', e)
    }
  }
  
  const audioUnlockRef = useRef(null)
  const gameAreaRef = useRef(null)

  const resetGame = () => {
    setPlayerScore(0)
    setAiScore(0)
    setGameOver(false)
    setWinner(null)
    setGameStarted(false)
    setPaused(false)
    gameOverProcessedRef.current = false // Reset for next game
    setGameKey(prev => prev + 1) // Force GameScene to remount with new random ball direction
  }
  
  // Default color theme
  const defaultTheme = {
    playerPaddle: '#00ff88',
    aiPaddle: '#ff3366',
    ball: '#ffff00',
    courtLines: '#ffffff',
    courtFloor: '#1a1a2e'
  }
  
  // Load theme from localStorage or use default
  const loadTheme = () => {
    try {
      const savedTheme = localStorage.getItem('pongColorTheme')
      return savedTheme ? JSON.parse(savedTheme) : defaultTheme
    } catch (e) {
      logStorageError('loadTheme', e)
      return defaultTheme
    }
  }
  
  // Color Theme State
  const [colorTheme, setColorTheme] = useState(loadTheme)
  
  // Save theme to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('pongColorTheme', JSON.stringify(colorTheme))
    } catch (e) {
      logStorageError('persistTheme', e)
    }
  }, [colorTheme])
  
  const updateColor = (key, value) => {
    setColorTheme(prev => ({ ...prev, [key]: value }))
  }
  
  const resetColors = () => {
    if (!window.confirm('Reset all colors to default? This cannot be undone.')) return
    setColorTheme(defaultTheme)
  }
  
  const handleScoreUpdate = (player, ai) => {
    setPlayerScore(player)
    setAiScore(ai)
    
    // Check for game over (only process once per game)
    if (!gameOverProcessedRef.current) {
      if (player >= 11) {
        setGameOver(true)
        setWinner('player')
        setPaused(false)
        setStats(prev => ({ ...prev, wins: prev.wins + 1 }))
        gameOverProcessedRef.current = true
      } else if (ai >= 11) {
        setGameOver(true)
        setWinner('ai')
        setPaused(false)
        setStats(prev => ({ ...prev, losses: prev.losses + 1 }))
        gameOverProcessedRef.current = true
      }
    }
  }
  
  return (
    <div className="game-layout">
      <aside className="game-sidebar">
        <h1 className="game-title">BATTLE PADDLES</h1>

        <div className="game-panel">
          <h3 className="game-panel-title controls">CONTROLS</h3>
          <div className="game-control-row">
            <label className="game-checkbox-label">
              <input
                type="checkbox"
                checked={mouseControlEnabled}
                onChange={(e) => setMouseControlEnabled(e.target.checked)}
              />
              <span>Enable Mouse Control</span>
            </label>
          </div>
          <p className="game-hint">Mouse: Move left/right</p>
          <p className="game-hint">Arrow Keys: ← →</p>
          <p className="game-hint">Keyboard: A / D</p>
        </div>

        <div className="game-panel">
          <h3 className="game-panel-title info">INFO</h3>
          <p className="game-hint">Ball speeds up with each hit</p>
          <p className="game-hint">AI gets harder during rallies</p>
          <p className="game-hint">Everything resets after scoring</p>
        </div>

        <div className="game-panel">
          <h3 className="game-panel-title theme">COLOR THEME</h3>
          <div className="game-color-row">
            <label className="game-label">Player Paddle</label>
            <input
              type="color"
              value={colorTheme.playerPaddle}
              onChange={(e) => updateColor('playerPaddle', e.target.value)}
            />
          </div>
          <div className="game-color-row">
            <label className="game-label">AI Paddle</label>
            <input
              type="color"
              value={colorTheme.aiPaddle}
              onChange={(e) => updateColor('aiPaddle', e.target.value)}
            />
          </div>
          <div className="game-color-row">
            <label className="game-label">Ball</label>
            <input
              type="color"
              value={colorTheme.ball}
              onChange={(e) => updateColor('ball', e.target.value)}
            />
          </div>
          <div className="game-color-row">
            <label className="game-label">Court Lines</label>
            <input
              type="color"
              value={colorTheme.courtLines}
              onChange={(e) => updateColor('courtLines', e.target.value)}
            />
          </div>
          <div className="game-color-row">
            <label className="game-label">Court Floor</label>
            <input
              type="color"
              value={colorTheme.courtFloor}
              onChange={(e) => updateColor('courtFloor', e.target.value)}
            />
          </div>
          <button type="button" className="game-full-width" aria-label="Reset colors to default" onClick={resetColors}>
            Reset to Default
          </button>
        </div>
      </aside>
      
      <div
        ref={gameAreaRef}
        className="game-viewport"
        role="button"
        tabIndex={paused ? 0 : -1}
        aria-label={paused ? 'Click to resume game' : 'Game court'}
        style={{ cursor: gameStarted && !gameOver && !paused ? 'none' : 'default' }}
        onClick={() => {
          if (paused) {
            setPaused(false)
            if (mouseControlEnabled) gameAreaRef.current?.requestPointerLock()
          }
        }}
        onKeyDown={(e) => {
          if (paused && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            setPaused(false)
            if (mouseControlEnabled) gameAreaRef.current?.requestPointerLock()
          }
        }}
      >
        {!gameStarted && !gameOver && (
          <div className="game-overlay-center">
            <button
              type="button"
              className="game-cta-button primary"
              aria-label="Start game"
              onClick={() => {
                if (audioUnlockRef.current) audioUnlockRef.current()
                if (themeAudioRef.current && !themeMuted) themeAudioRef.current.play().catch(() => {})
                setGameStarted(true)
                if (mouseControlEnabled) gameAreaRef.current?.requestPointerLock()
              }}
            >
              START GAME
            </button>
            <p className="game-cta-sub">Click to begin playing</p>
          </div>
        )}

        {paused && (
          <div className="game-overlay-center pointer-events-none">
            <div className="game-paused-title">Paused</div>
            <p className="game-paused-hint">Click the court to resume</p>
          </div>
        )}

        {gameOver && (
          <div className="game-overlay-center">
            <h1 className="game-over-title" style={{ color: winner === 'player' ? colorTheme.playerPaddle : colorTheme.aiPaddle }}>
              {winner === 'player' ? 'YOU WIN!' : 'AI WINS!'}
            </h1>
            <p className="game-over-score">Final Score: {playerScore} - {aiScore}</p>
            <button type="button" className="game-cta-button primary" aria-label="Play again" onClick={resetGame}>
              PLAY AGAIN
            </button>
          </div>
        )}

        {!gameOver && (
          <div className="game-score-display">
            <div style={{ color: colorTheme.playerPaddle }}>{playerScore}</div>
            <div style={{ color: colorTheme.aiPaddle }}>{aiScore}</div>
          </div>
        )}

        <Canvas
          orthographic
          camera={{ position: [0, 12, 0], zoom: 70, near: 0.1, far: 1000 }}
          onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
          style={{ width: '100%', height: '100%', background: '#000', cursor: gameStarted && !gameOver && !paused ? 'none' : 'default' }}
        >
          <GameScene 
            key={gameKey}
            onScoreChange={handleScoreUpdate}
            colorTheme={colorTheme}
            gameStarted={gameStarted && !gameOver}
            paused={paused}
            mouseControlEnabled={mouseControlEnabled}
            ballSpeed={baseBallSpeed}
            audioUnlockRef={audioUnlockRef}
            aiDifficulty={aiDifficulty}
            audioMuted={themeMuted}
          />
        </Canvas>
      </div>

      <aside className="game-sidebar game-sidebar-right">
        <h1 className="game-panel-title stats">STATS</h1>

        <div className="stat-block">
          <div className="stat-row">
            <div className="stat-label">Wins</div>
            <div className="stat-value wins">{stats.wins}</div>
          </div>
          <div className="stat-row">
            <div className="stat-label">Losses</div>
            <div className="stat-value losses">{stats.losses}</div>
          </div>
        </div>

        <div className="game-section">
          <div className="game-section-title">Win Rate</div>
          <div className="stat-value rate">
            {stats.wins + stats.losses > 0 ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100) : 0}%
          </div>
        </div>

        <button type="button" className="game-full-width" aria-label="Reset win and loss stats" onClick={resetStats}>
          Reset Stats
        </button>

        <div className="game-section">
          <div className="game-section-title">Theme music</div>
          <label className="game-checkbox-label" title="Toggle sound on or off">
            <input
              type="checkbox"
              checked={!themeMuted}
              aria-label="Unmute theme music and paddle sounds"
              onChange={(e) => {
                const unmuting = e.target.checked
                setThemeMuted(!unmuting)
                if (unmuting) themeAudioRef.current?.play().catch(() => {})
              }}
            />
            <span>Unmuted</span>
          </label>
          <label className="game-label">Volume</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={themeVolume}
            disabled={themeMuted}
            onChange={(e) => {
              setThemeVolume(Number(e.target.value))
              if (!themeMuted) themeAudioRef.current?.play().catch(() => {})
            }}
          />
        </div>

        <div className="game-section">
          <label className="game-label">AI difficulty</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={aiDifficulty}
            onChange={(e) => setAiDifficulty(Number(e.target.value))}
          />
          <p className="game-hint">0 = easy, 1 = hard</p>
        </div>

        <div className="game-section">
          <label className="game-label">Base ball speed</label>
          <input
            type="number"
            min={MIN_BALL_SPEED}
            max={MAX_BALL_SPEED}
            value={baseBallSpeed}
            onChange={(e) => {
              const v = e.target.valueAsNumber
              if (!Number.isNaN(v)) setBaseBallSpeed(Math.min(MAX_BALL_SPEED, Math.max(MIN_BALL_SPEED, v)))
            }}
            onBlur={(e) => {
              const v = e.target.valueAsNumber
              if (Number.isNaN(v) || v < MIN_BALL_SPEED) setBaseBallSpeed(MIN_BALL_SPEED)
              else if (v > MAX_BALL_SPEED) setBaseBallSpeed(MAX_BALL_SPEED)
            }}
          />
          <p className="game-hint">{MIN_BALL_SPEED}–{MAX_BALL_SPEED} (units/sec)</p>
        </div>
      </aside>
    </div>
  )
}

export default App
