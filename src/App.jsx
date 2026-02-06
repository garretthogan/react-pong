import { useRef, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import GameScene from './components/GameScene'
import { BALL_SPEED } from './constants/gameConstants'
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
    console.error('Error loading ball speed from localStorage:', e)
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
    } catch (e) {}
    return 0.25
  })
  const [themeMuted, setThemeMuted] = useState(() => {
    try {
      const m = localStorage.getItem(THEME_MUTED_STORAGE_KEY)
      if (m !== null) return m === 'true'
    } catch (e) {}
    return false
  })
  const [aiDifficulty, setAiDifficulty] = useState(() => {
    try {
      const v = localStorage.getItem(AI_DIFFICULTY_STORAGE_KEY)
      if (v != null) { const n = Number(v); if (!Number.isNaN(n) && n >= 0 && n <= 1) return n }
    } catch (e) {}
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

  useEffect(() => {
    try {
      localStorage.setItem(THEME_VOLUME_STORAGE_KEY, String(themeVolume))
      localStorage.setItem(THEME_MUTED_STORAGE_KEY, String(themeMuted))
      localStorage.setItem(AI_DIFFICULTY_STORAGE_KEY, String(aiDifficulty))
    } catch (e) {}
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
      console.error('Error saving ball speed to localStorage:', e)
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
    } catch (error) {
      console.error('Error loading stats from localStorage:', error)
      return { wins: 0, losses: 0 }
    }
  }
  
  const [stats, setStats] = useState(loadStats)
  const gameOverProcessedRef = useRef(false)
  
  // Save stats to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('pongStats', JSON.stringify(stats))
    } catch (error) {
      console.error('Error saving stats to localStorage:', error)
    }
  }, [stats])
  
  const resetStats = () => {
    setStats({ wins: 0, losses: 0 })
    // Also clear localStorage to fix any corrupted data
    try {
      localStorage.setItem('pongStats', JSON.stringify({ wins: 0, losses: 0 }))
    } catch (error) {
      console.error('Error clearing stats from localStorage:', error)
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
    } catch (error) {
      console.error('Error loading theme from localStorage:', error)
      return defaultTheme
    }
  }
  
  // Color Theme State
  const [colorTheme, setColorTheme] = useState(loadTheme)
  
  // Save theme to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('pongColorTheme', JSON.stringify(colorTheme))
    } catch (error) {
      console.error('Error saving theme to localStorage:', error)
    }
  }, [colorTheme])
  
  const updateColor = (key, value) => {
    setColorTheme(prev => ({ ...prev, [key]: value }))
  }
  
  const resetColors = () => {
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
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0a', display: 'flex' }}>
      {/* Left Info Panel */}
      <div style={{
        width: '300px',
        padding: '30px',
        background: '#1a1a2e',
        color: 'white',
        fontFamily: 'monospace',
        zIndex: 1,
        borderRight: '2px solid #333'
      }}>
        <h1 style={{ margin: '0 0 20px 0', fontSize: '32px', color: '#ffffff' }}>BATTLE PADDLES</h1>
        
        <div style={{
          background: '#0a0a0a',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '12px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#00ff88' }}>CONTROLS</h3>
          
          <div style={{ 
            marginBottom: '10px', 
            paddingBottom: '10px', 
            borderBottom: '1px solid rgba(255,255,255,0.1)' 
          }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              fontSize: '14px'
            }}>
              <input 
                type="checkbox" 
                checked={mouseControlEnabled}
                onChange={(e) => setMouseControlEnabled(e.target.checked)}
                style={{ 
                  marginRight: '10px', 
                  cursor: 'pointer',
                  width: '16px',
                  height: '16px'
                }}
              />
              <span>Enable Mouse Control</span>
            </label>
          </div>
          
          <p style={{ margin: '3px 0', fontSize: '14px', opacity: 0.8, lineHeight: '1.4' }}>
            Mouse: Move left/right
          </p>
          <p style={{ margin: '3px 0', fontSize: '14px', opacity: 0.8, lineHeight: '1.4' }}>
            Arrow Keys: ← →
          </p>
          <p style={{ margin: '3px 0', fontSize: '14px', opacity: 0.8, lineHeight: '1.4' }}>
            Keyboard: A / D
          </p>
        </div>
        
        <div style={{
          background: '#0a0a0a',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '12px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#ffaa00' }}>INFO</h3>
          <p style={{ margin: '3px 0', fontSize: '13px', opacity: 0.7, lineHeight: '1.4' }}>
            Ball speeds up with each hit
          </p>
          <p style={{ margin: '3px 0', fontSize: '13px', opacity: 0.7, lineHeight: '1.4' }}>
            AI gets harder during rallies
          </p>
          <p style={{ margin: '3px 0', fontSize: '13px', opacity: 0.7, lineHeight: '1.4' }}>
            Everything resets after scoring
          </p>
        </div>
        
        <div style={{
          background: '#0a0a0a',
          padding: '15px',
          borderRadius: '8px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#9966ff' }}>COLOR THEME</h3>
          
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '3px', opacity: 0.8 }}>
              Player Paddle
            </label>
            <input 
              type="color" 
              value={colorTheme.playerPaddle} 
              onChange={(e) => updateColor('playerPaddle', e.target.value)}
              style={{ width: '100%', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
            />
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '3px', opacity: 0.8 }}>
              AI Paddle
            </label>
            <input 
              type="color" 
              value={colorTheme.aiPaddle} 
              onChange={(e) => updateColor('aiPaddle', e.target.value)}
              style={{ width: '100%', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
            />
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '3px', opacity: 0.8 }}>
              Ball
            </label>
            <input 
              type="color" 
              value={colorTheme.ball} 
              onChange={(e) => updateColor('ball', e.target.value)}
              style={{ width: '100%', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
            />
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '3px', opacity: 0.8 }}>
              Court Lines
            </label>
            <input 
              type="color" 
              value={colorTheme.courtLines} 
              onChange={(e) => updateColor('courtLines', e.target.value)}
              style={{ width: '100%', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
            />
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '3px', opacity: 0.8 }}>
              Court Floor
            </label>
            <input 
              type="color" 
              value={colorTheme.courtFloor} 
              onChange={(e) => updateColor('courtFloor', e.target.value)}
              style={{ width: '100%', height: '28px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
            />
          </div>
          
          <button
            onClick={resetColors}
            style={{
              width: '100%',
              padding: '8px',
              background: '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: 'monospace',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = '#444'}
            onMouseOut={(e) => e.target.style.background = '#333'}
          >
            Reset to Default
          </button>
        </div>
      </div>
      
      {/* Game Area - click to resume when paused */}
      <div
        ref={gameAreaRef}
        style={{ flex: 1, position: 'relative', cursor: gameStarted && !gameOver && !paused ? 'none' : 'default' }}
        onClick={() => {
          if (paused) {
            setPaused(false)
            if (mouseControlEnabled) gameAreaRef.current?.requestPointerLock()
          }
        }}
        role="button"
        tabIndex={-1}
        aria-label={paused ? 'Click to resume game' : undefined}
      >
        {/* Start Button */}
        {!gameStarted && !gameOver && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
            textAlign: 'center'
          }}>
            <button
              onClick={() => {
                if (audioUnlockRef.current) audioUnlockRef.current()
                if (themeAudioRef.current && !themeMuted) themeAudioRef.current.play().catch(() => {})
                setGameStarted(true)
                if (mouseControlEnabled) gameAreaRef.current?.requestPointerLock()
              }}
              style={{
                padding: '20px 60px',
                fontSize: '32px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'scale(1.05)'
                e.target.style.boxShadow = '0 12px 30px rgba(0,0,0,0.6)'
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = '0 8px 20px rgba(0,0,0,0.5)'
              }}
            >
              START GAME
            </button>
            <p style={{ 
              marginTop: '20px', 
              color: 'rgba(255,255,255,0.6)', 
              fontSize: '14px',
              fontFamily: 'monospace'
            }}>
              Click to begin playing
            </p>
          </div>
        )}

        {/* Paused overlay */}
        {paused && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
            textAlign: 'center',
            pointerEvents: 'none'
          }}>
            <div style={{
              fontSize: '48px',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '16px',
              textShadow: '0 2px 12px rgba(0,0,0,0.8)'
            }}>
              Paused
            </div>
            <p style={{
              fontSize: '18px',
              color: 'rgba(255,255,255,0.8)',
              fontFamily: 'monospace'
            }}>
              Click the court to resume
            </p>
          </div>
        )}
        
        {/* Game Over Screen */}
        {gameOver && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
            textAlign: 'center'
          }}>
            <h1 style={{
              fontSize: '64px',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              color: winner === 'player' ? colorTheme.playerPaddle : colorTheme.aiPaddle,
              marginBottom: '20px',
              textShadow: '0 4px 20px rgba(0,0,0,0.8)'
            }}>
              {winner === 'player' ? 'YOU WIN!' : 'AI WINS!'}
            </h1>
            <p style={{
              fontSize: '24px',
              color: 'rgba(255,255,255,0.8)',
              fontFamily: 'monospace',
              marginBottom: '30px'
            }}>
              Final Score: {playerScore} - {aiScore}
            </p>
            <button
              onClick={resetGame}
              style={{
                padding: '15px 50px',
                fontSize: '24px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'scale(1.05)'
                e.target.style.boxShadow = '0 12px 30px rgba(0,0,0,0.6)'
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = '0 8px 20px rgba(0,0,0,0.5)'
              }}
            >
              PLAY AGAIN
            </button>
          </div>
        )}
        
        {/* Score Display */}
        {!gameOver && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            gap: '100px',
            fontFamily: 'monospace',
            fontSize: '72px',
            fontWeight: 'bold',
            zIndex: 1,
            pointerEvents: 'none',
            opacity: 0.3
          }}>
            <div style={{ color: colorTheme.playerPaddle }}>{playerScore}</div>
            <div style={{ color: colorTheme.aiPaddle }}>{aiScore}</div>
          </div>
        )}

        
        <Canvas
          orthographic
          camera={{ 
            position: [0, 12, 0],
            zoom: 70,
            near: 0.1,
            far: 1000
          }}
          onCreated={({ camera }) => {
            camera.lookAt(0, 0, 0)
          }}
          style={{ 
            width: '100%', 
            height: '100%', 
            background: '#0a0a0a',
            cursor: gameStarted && !gameOver && !paused ? 'none' : 'default'
          }}
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
      
      {/* Right Stats Panel */}
      <div style={{
        width: '250px',
        padding: '30px',
        background: '#1a1a2e',
        color: 'white',
        fontFamily: 'monospace',
        zIndex: 1,
        borderLeft: '2px solid #333'
      }}>
        <h1 style={{ margin: '0 0 30px 0', fontSize: '24px', color: '#ffffff' }}>STATS</h1>
        
        <div style={{
          background: '#0a0a0a',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              fontSize: '12px', 
              opacity: 0.6, 
              marginBottom: '5px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: '#00ff88'
            }}>
              Wins
            </div>
            <div style={{ 
              fontSize: '48px', 
              fontWeight: 'bold',
              color: '#00ff88'
            }}>
              {stats.wins}
            </div>
          </div>
          
          <div>
            <div style={{ 
              fontSize: '12px', 
              opacity: 0.6, 
              marginBottom: '5px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: '#ff3366'
            }}>
              Losses
            </div>
            <div style={{ 
              fontSize: '48px', 
              fontWeight: 'bold',
              color: '#ff3366'
            }}>
              {stats.losses}
            </div>
          </div>
        </div>
        
        <div style={{
          background: '#0a0a0a',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div style={{ 
            fontSize: '12px', 
            opacity: 0.6, 
            marginBottom: '5px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Win Rate
          </div>
          <div style={{ 
            fontSize: '28px', 
            fontWeight: 'bold',
            color: '#ffaa00'
          }}>
            {stats.wins + stats.losses > 0 
              ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
              : 0}%
          </div>
        </div>
        
        <button
          onClick={resetStats}
          style={{
            width: '100%',
            padding: '12px',
            background: '#333',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'monospace',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.target.style.background = '#444'}
          onMouseOut={(e) => e.target.style.background = '#333'}
        >
          Reset Stats
        </button>

        <div style={{
          background: '#0a0a0a',
          padding: '15px',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <div style={{
            fontSize: '12px',
            opacity: 0.6,
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Theme music
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '14px', marginBottom: '10px' }}>
            <input
              type="checkbox"
              checked={!themeMuted}
              onChange={(e) => {
                const unmuting = e.target.checked
                setThemeMuted(!unmuting)
                if (unmuting) themeAudioRef.current?.play().catch(() => {})
              }}
              style={{ marginRight: '8px', cursor: 'pointer', width: '16px', height: '16px' }}
            />
            <span>Unmuted</span>
          </label>
          <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', opacity: 0.8 }}>
            Volume
          </label>
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
            style={{ width: '100%', cursor: themeMuted ? 'default' : 'pointer' }}
          />
        </div>

        <div style={{
          background: '#0a0a0a',
          padding: '15px',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            opacity: 0.6,
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            AI difficulty
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={aiDifficulty}
            onChange={(e) => setAiDifficulty(Number(e.target.value))}
            style={{ width: '100%', cursor: 'pointer' }}
          />
          <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px' }}>
            0 = easy, 1 = hard
          </div>
        </div>

        <div style={{
          background: '#0a0a0a',
          padding: '15px',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            opacity: 0.6,
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Base ball speed
          </label>
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
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              fontFamily: 'monospace',
              background: '#1a1a2e',
              color: '#fff',
              border: '1px solid #333',
              borderRadius: '4px',
              boxSizing: 'border-box'
            }}
          />
          <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '4px' }}>
            {MIN_BALL_SPEED}–{MAX_BALL_SPEED} (units/sec)
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
