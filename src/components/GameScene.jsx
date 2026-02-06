import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { BALL_SPEED, MAX_BALL_SPEED, COURT_DEPTH, PADDLE_WIDTH, PADDLE_DEPTH, BALL_SIZE } from '../constants/gameConstants'
import Court from './Court'
import PlayerPaddle from './PlayerPaddle'
import AIPaddle from './AIPaddle'
import Ball from './Ball'

export default function GameScene({ onScoreChange, colorTheme, gameStarted, mouseControlEnabled, ballSpeed = BALL_SPEED }) {
  const baseSpeed = ballSpeed ?? BALL_SPEED
  const [mouseX, setMouseX] = useState(0)
  const [ballPosition, setBallPosition] = useState([0, 0, 0])
  
  // Initialize with direction toward random paddle at game start
  const getInitialBallVelocity = () => {
    const towardPlayer = Math.random() < 0.5
    // At game start, send toward random paddle (straight since paddles start at center)
    return [
      0,
      baseSpeed * (towardPlayer ? -1 : 1)
    ]
  }
  
  const [ballVelocity, setBallVelocity] = useState(getInitialBallVelocity)
  const [playerScore, setPlayerScore] = useState(0)
  const [aiScore, setAiScore] = useState(0)
  const [keys, setKeys] = useState({})
  const [aiDifficulty, setAiDifficulty] = useState(0)
  
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
      setBallVelocity([0, baseSpeed * (towardPlayer ? -1 : 1)])
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

  // Mouse movement handler
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (mouseControlEnabled) {
        const x = (e.clientX / window.innerWidth) * 2 - 1
        setMouseX(x)
      }
    }
    
    const handleKeyDown = (e) => {
      setKeys(prev => ({ ...prev, [e.key]: true }))
    }
    
    const handleKeyUp = (e) => {
      setKeys(prev => ({ ...prev, [e.key]: false }))
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
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
    
    // Calculate velocity to aim at center of target paddle
    const targetZ = towardAI ? (COURT_DEPTH / 2 - 1) : (-COURT_DEPTH / 2 + 1)
    
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
    // Use ball's last Z position to determine who should get the serve
    const ballWasNearPlayer = ballPosition[1] < 0
    // Give ball to whoever it was near when it went out
    resetBallToTarget(!ballWasNearPlayer)
  }

  // Ball collision detection with paddles
  const lastHitRef = useRef(null)

  useFrame(() => {
    const playerPaddleZ = -COURT_DEPTH / 2 + 1
    const aiPaddleZ = COURT_DEPTH / 2 - 1
    
    // Check collision with player paddle using actual paddle position
    if (playerPaddleRef.current && ballPosition) {
      const playerPaddleX = playerPaddleRef.current.position.x
      
      if (
        ballPosition[1] <= playerPaddleZ + PADDLE_DEPTH / 2 + BALL_SIZE &&
        ballPosition[1] >= playerPaddleZ - PADDLE_DEPTH / 2 - BALL_SIZE &&
        Math.abs(ballPosition[0] - playerPaddleX) < PADDLE_WIDTH / 2 + BALL_SIZE &&
        lastHitRef.current !== 'player'
      ) {
        // Increase ball speed by 8% on each hit, max 2x initial speed
        currentBallSpeedRef.current = Math.min(currentBallSpeedRef.current * 1.08, MAX_BALL_SPEED)
        
        // Increase AI difficulty when player successfully returns the ball
        setAiDifficulty(prev => prev + 1)
        
        const hitPosition = (ballPosition[0] - playerPaddleX) / (PADDLE_WIDTH / 2)
        setBallVelocity([currentBallSpeedRef.current * hitPosition * 0.7, currentBallSpeedRef.current])
        lastHitRef.current = 'player'
      }
    }
    
    // Check collision with AI paddle using actual paddle position
    if (aiPaddleRef.current && ballPosition) {
      const aiPaddleX = aiPaddleRef.current.position.x
      
      if (
        ballPosition[1] >= aiPaddleZ - PADDLE_DEPTH / 2 - BALL_SIZE &&
        ballPosition[1] <= aiPaddleZ + PADDLE_DEPTH / 2 + BALL_SIZE &&
        Math.abs(ballPosition[0] - aiPaddleX) < PADDLE_WIDTH / 2 + BALL_SIZE &&
        lastHitRef.current !== 'ai'
      ) {
        // Increase ball speed by 8% on each hit, max 2x initial speed
        currentBallSpeedRef.current = Math.min(currentBallSpeedRef.current * 1.08, MAX_BALL_SPEED)
        
        const hitPosition = (ballPosition[0] - aiPaddleX) / (PADDLE_WIDTH / 2)
        setBallVelocity([currentBallSpeedRef.current * hitPosition * 0.5, -currentBallSpeedRef.current])
        lastHitRef.current = 'ai'
      }
    }
    
    // Reset last hit when ball is in the middle
    if (Math.abs(ballPosition[1]) < COURT_DEPTH / 4) {
      lastHitRef.current = null
    }
  })

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 10, 0]} intensity={1.5} />
      <pointLight position={[0, 5, -10]} intensity={0.8} />
      <pointLight position={[ballPosition[0], 2, ballPosition[1]]} intensity={0.5} color={colorTheme.ball} />
      
      <Court lineColor={colorTheme.courtLines} floorColor={colorTheme.courtFloor} />
      <PlayerPaddle 
        position={[0, 0.2, -COURT_DEPTH / 2 + 1]} 
        mouseX={mouseX} 
        paddleRef={playerPaddleRef}
        color={colorTheme.playerPaddle}
      />
      <AIPaddle 
        position={[0, 0.2, COURT_DEPTH / 2 - 1]} 
        ballPosition={ballPosition} 
        paddleRef={aiPaddleRef} 
        difficultyLevel={aiDifficulty}
        color={colorTheme.aiPaddle}
      />
      <Ball 
        position={ballPosition} 
        velocity={ballVelocity}
        onPositionChange={setBallPosition}
        onScore={handleScore}
        onOutOfBounds={handleOutOfBounds}
        color={colorTheme.ball}
        gameStarted={gameStarted}
      />
    </>
  )
}
