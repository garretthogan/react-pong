import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BALL_SPEED, MAX_BALL_SPEED, COURT_DEPTH, PADDLE_WIDTH, PADDLE_DEPTH, BALL_SIZE, COURT_WIDTH } from '../constants/gameConstants'
import Court from './Court'
import PlayerPaddle from './PlayerPaddle'
import AIPaddle from './AIPaddle'
import Ball from './Ball'

const MOBILE_BREAKPOINT_PX = 768
const PADDLE_INSET_DESKTOP = 3
const PADDLE_INSET_MOBILE = 3.5

export default function GameScene({ onScoreChange, colorTheme, gameStarted, paused = false, mouseControlEnabled, ballSpeed = BALL_SPEED, audioUnlockRef, aiDifficulty: aiDifficultySetting = 0.5, audioMuted = false }) {
  const baseSpeed = ballSpeed ?? BALL_SPEED
  const [mouseX, setMouseX] = useState(0)
  const [ballPosition, setBallPosition] = useState([0, 0, 0])
  
  // Initialize with direction toward random paddle at game start
  // Player is at +Z (bottom), AI at -Z (top); positive velocity = toward player
  const getInitialBallVelocity = () => {
    const towardPlayer = Math.random() < 0.5
    return [
      0,
      baseSpeed * (towardPlayer ? 1 : -1)
    ]
  }
  
  const [ballVelocity, setBallVelocity] = useState(getInitialBallVelocity)
  const [playerScore, setPlayerScore] = useState(0)
  const [aiScore, setAiScore] = useState(0)
  const [keys, setKeys] = useState({})
  const [aiDifficulty, setAiDifficulty] = useState(0)
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1024))

  const isMobile = viewportWidth <= MOBILE_BREAKPOINT_PX
  const paddleInset = isMobile ? PADDLE_INSET_MOBILE : PADDLE_INSET_DESKTOP

  const { size, camera } = useThree()
  const zoom = camera?.zoom ?? 70
  const visibleWidth = size.width / zoom
  const visibleHeight = size.height / zoom
  const courtFitScale = (size.width > 0 && size.height > 0)
    ? Math.min(1, visibleWidth / COURT_WIDTH, visibleHeight / COURT_DEPTH)
    : 1

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Refs to track actual paddle positions and current ball speed
  const playerPaddleRef = useRef()
  const aiPaddleRef = useRef()
  const currentBallSpeedRef = useRef(baseSpeed)
  const prevGameStartedRef = useRef(false)

  useEffect(() => {
    currentBallSpeedRef.current = baseSpeed
  }, [baseSpeed])

  // When game starts, set ball velocity from current base speed (so panel speed applies to initial spawn)
  useEffect(() => {
    if (gameStarted && !prevGameStartedRef.current) {
      const towardPlayer = Math.random() < 0.5
      setBallVelocity([0, baseSpeed * (towardPlayer ? 1 : -1)])
      currentBallSpeedRef.current = baseSpeed
    }
    prevGameStartedRef.current = gameStarted
  }, [gameStarted, baseSpeed])
  
  // Update parent component when scores change
  useEffect(() => {
    if (onScoreChange) {
      onScoreChange(playerScore, aiScore)
    }
  }, [playerScore, aiScore, onScoreChange])

  const POINTER_LOCK_SENSITIVITY = 0.002

  // Mouse and touch handlers for paddle position
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!mouseControlEnabled) return
      if (document.pointerLockElement) {
        setMouseX((prev) => Math.max(-1, Math.min(1, prev + e.movementX * POINTER_LOCK_SENSITIVITY)))
      } else {
        setMouseX((e.clientX / window.innerWidth) * 2 - 1)
      }
    }

    const handleTouchMove = (e) => {
      if (e.touches.length === 0) return
      const clientX = e.touches[0].clientX
      const normalized = (clientX / window.innerWidth) * 2 - 1
      setMouseX(Math.max(-1, Math.min(1, normalized)))
      e.preventDefault()
    }

    const handleKeyDown = (e) => {
      setKeys(prev => ({ ...prev, [e.key]: true }))
    }

    const handleKeyUp = (e) => {
      setKeys(prev => ({ ...prev, [e.key]: false }))
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [mouseControlEnabled])

  // Handle keyboard movement for player paddle
  useEffect(() => {
    const interval = setInterval(() => {
      if (keys['ArrowLeft'] || keys['a']) {
        setMouseX(prev => Math.max(-1, prev - 0.05))
      }
      if (keys['ArrowRight'] || keys['d']) {
        setMouseX(prev => Math.min(1, prev + 0.05))
      }
    }, 16)
    
    return () => clearInterval(interval)
  }, [keys])

  const resetBallToTarget = (towardAI) => {
    // Reset ball speed to initial value
    currentBallSpeedRef.current = baseSpeed
    
    // Reset AI difficulty to starting level
    setAiDifficulty(0)
    
    // Reset ball position and velocity
    setBallPosition([0, 0, 0])
    
    // Get the target paddle's current X position
    let targetX = 0
    if (towardAI && aiPaddleRef.current) {
      targetX = aiPaddleRef.current.position.x
    } else if (!towardAI && playerPaddleRef.current) {
      targetX = playerPaddleRef.current.position.x
    }
    
    // Player at +Z (bottom), AI at -Z (top)
    const targetZ = towardAI ? (-COURT_DEPTH / 2 + paddleInset) : (COURT_DEPTH / 2 - paddleInset)
    
    // Calculate direction vector
    const dx = targetX - 0 // Ball starts at x=0
    const dz = targetZ - 0 // Ball starts at z=0
    const distance = Math.sqrt(dx * dx + dz * dz)
    
    // Normalize and scale by ball speed
    setBallVelocity([
      (dx / distance) * baseSpeed,
      (dz / distance) * baseSpeed
    ])
  }
  
  const handleScore = (scorer) => {
    if (scorer === 'player') {
      setPlayerScore(prev => prev + 1)
    } else {
      setAiScore(prev => prev + 1)
    }
    
    // Ball goes toward the paddle that lost (opposite of who scored)
    // If player scored, ball goes toward AI (who lost)
    // If AI scored, ball goes toward player (who lost)
    const towardAI = scorer === 'player'
    resetBallToTarget(towardAI)
  }
  
  const handleOutOfBounds = () => {
    // When ball goes out of bounds, determine who was closer/should receive serve
    // Player at +Z (bottom), AI at -Z (top)
    const ballWasNearPlayer = ballPosition[1] > 0
    resetBallToTarget(!ballWasNearPlayer)
  }

  // Ball collision detection with paddles
  const lastHitRef = useRef(null)
  const paddleHitSoundsRef = useRef(null)
  const nextPaddleSoundIndexRef = useRef(0)

  useEffect(() => {
    const base = import.meta.env.BASE_URL
    const sounds = [
      new Audio(`${base}sounds/ball-hit-paddle1.wav`),
      new Audio(`${base}sounds/ball-hit-paddle2.wav`)
    ]
    paddleHitSoundsRef.current = sounds
    if (audioUnlockRef) {
      audioUnlockRef.current = () => {
        const first = sounds[0]
        first.volume = 1
        first.currentTime = 0
        first.play().then(() => {
          setTimeout(() => first.pause(), 80)
        }).catch(() => {})
        sounds.slice(1).forEach((s) => {
          s.volume = 0
          s.play().then(() => { s.pause(); s.volume = 1 }).catch(() => { s.volume = 1 })
        })
      }
    }
  }, [audioUnlockRef])

  const PADDLE_HIT_VOLUME = 0.35

  const playPaddleHitSound = () => {
    if (audioMuted) return
    const sounds = paddleHitSoundsRef.current
    if (!sounds) return
    const i = nextPaddleSoundIndexRef.current % sounds.length
    nextPaddleSoundIndexRef.current = (i + 1) % sounds.length
    const s = sounds[i]
    s.volume = PADDLE_HIT_VOLUME
    s.currentTime = 0
    s.play().catch(() => {})
  }

  useFrame(() => {
    // Player at +Z (bottom), AI at -Z (top)
    const playerPaddleZ = COURT_DEPTH / 2 - paddleInset
    const aiPaddleZ = -COURT_DEPTH / 2 + paddleInset
    
    // Check collision with player paddle (at bottom, ball approaches from negative Z)
    if (playerPaddleRef.current && ballPosition) {
      const playerPaddleX = playerPaddleRef.current.position.x
      
      if (
        ballPosition[1] >= playerPaddleZ - PADDLE_DEPTH / 2 - BALL_SIZE &&
        ballPosition[1] <= playerPaddleZ + PADDLE_DEPTH / 2 + BALL_SIZE &&
        Math.abs(ballPosition[0] - playerPaddleX) < PADDLE_WIDTH / 2 + BALL_SIZE &&
        lastHitRef.current !== 'player'
      ) {
        currentBallSpeedRef.current = Math.min(currentBallSpeedRef.current * 1.08, MAX_BALL_SPEED)
        setAiDifficulty(prev => prev + 1)
        playPaddleHitSound()
        const hitPosition = (ballPosition[0] - playerPaddleX) / (PADDLE_WIDTH / 2)
        setBallVelocity([currentBallSpeedRef.current * hitPosition * 0.7, -currentBallSpeedRef.current])
        lastHitRef.current = 'player'
      }
    }
    
    // Check collision with AI paddle (at top, ball approaches from positive Z)
    if (aiPaddleRef.current && ballPosition) {
      const aiPaddleX = aiPaddleRef.current.position.x
      
      if (
        ballPosition[1] <= aiPaddleZ + PADDLE_DEPTH / 2 + BALL_SIZE &&
        ballPosition[1] >= aiPaddleZ - PADDLE_DEPTH / 2 - BALL_SIZE &&
        Math.abs(ballPosition[0] - aiPaddleX) < PADDLE_WIDTH / 2 + BALL_SIZE &&
        lastHitRef.current !== 'ai'
      ) {
        currentBallSpeedRef.current = Math.min(currentBallSpeedRef.current * 1.08, MAX_BALL_SPEED)
        playPaddleHitSound()
        const hitPosition = (ballPosition[0] - aiPaddleX) / (PADDLE_WIDTH / 2)
        setBallVelocity([currentBallSpeedRef.current * hitPosition * 0.5, currentBallSpeedRef.current])
        lastHitRef.current = 'ai'
      }
    }
    
    if (Math.abs(ballPosition[1]) < COURT_DEPTH / 4) {
      lastHitRef.current = null
    }
  })

  return (
    <group scale={[courtFitScale, courtFitScale, courtFitScale]}>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 10, 0]} intensity={1.5} />
      <pointLight position={[0, 5, -10]} intensity={0.8} />
      <pointLight position={[ballPosition[0], 2, ballPosition[1]]} intensity={0.5} color={colorTheme.ball} />
      
      <Court lineColor={colorTheme.courtLines} floorColor={colorTheme.courtFloor} />
      <PlayerPaddle 
        position={[0, 0.2, COURT_DEPTH / 2 - paddleInset]} 
        mouseX={mouseX} 
        paddleRef={playerPaddleRef}
        color={colorTheme.playerPaddle}
        paused={paused}
      />
      <AIPaddle 
        position={[0, 0.2, -COURT_DEPTH / 2 + paddleInset]} 
        ballPosition={ballPosition} 
        paddleRef={aiPaddleRef} 
        difficultyLevel={aiDifficulty}
        baseDifficulty={aiDifficultySetting}
        color={colorTheme.aiPaddle}
        paused={paused}
      />
      <Ball 
        position={ballPosition} 
        velocity={ballVelocity}
        onPositionChange={setBallPosition}
        onScore={handleScore}
        onOutOfBounds={handleOutOfBounds}
        color={colorTheme.ball}
        gameStarted={gameStarted}
        paused={paused}
      />
    </group>
  )
}
