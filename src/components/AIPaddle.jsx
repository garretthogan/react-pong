import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_DEPTH, COURT_WIDTH, AI_SPEED } from '../constants/gameConstants'

export default function AIPaddle({ position, ballPosition, paddleRef, difficultyLevel, color }) {
  const errorOffsetRef = useRef(0)
  const reactionDelayRef = useRef(0)
  const lastUpdateRef = useRef(0)
  
  useFrame(({ clock }) => {
    if (paddleRef.current && ballPosition) {
      const currentTime = clock.getElapsedTime()
      
      // Calculate difficulty multipliers (improves with each successful player hit)
      // difficultyLevel starts at 0 and increases with each player hit
      const errorReduction = Math.max(0.3, 1 - difficultyLevel * 0.1) // Errors reduce by 10% each hit, min 30%
      const speedIncrease = Math.min(1.5, 1 + difficultyLevel * 0.08) // Speed increases by 8% each hit, max 150%
      const reactionImprovement = Math.max(0.2, 1 - difficultyLevel * 0.12) // Reaction improves by 12% each hit, min 20%
      
      // Update error offset periodically (AI changes its "mistake" every so often)
      if (currentTime - lastUpdateRef.current > 1.0) {
        // Start with smaller errors (±2 instead of ±3)
        errorOffsetRef.current = (Math.random() - 0.5) * 4 * errorReduction
        // Start with faster reaction (0.3 max delay instead of 0.6)
        reactionDelayRef.current = Math.random() * 0.3 * reactionImprovement
        lastUpdateRef.current = currentTime
      }
      
      // AI follows the ball's x position with error offset
      const targetX = ballPosition[0] + errorOffsetRef.current
      const diff = targetX - paddleRef.current.position.x
      
      // Start with lower reaction threshold (0.25 instead of 0.4)
      const reactionThreshold = (0.25 + reactionDelayRef.current) * reactionImprovement
      
      // Only move if difference is significant enough (simulates reaction threshold)
      if (Math.abs(diff) > reactionThreshold) {
        // Start with better base speed range (0.6-0.9 instead of 0.5-0.9)
        const baseSpeed = 0.6 + Math.random() * 0.3
        const speed = AI_SPEED * baseSpeed * speedIncrease
        paddleRef.current.position.x += Math.sign(diff) * speed
      }
      
      // Clamp to court boundaries
      paddleRef.current.position.x = Math.max(
        -COURT_WIDTH / 2 + PADDLE_WIDTH / 2,
        Math.min(COURT_WIDTH / 2 - PADDLE_WIDTH / 2, paddleRef.current.position.x)
      )
    }
  })

  return (
    <mesh ref={paddleRef} position={position}>
      <boxGeometry args={[PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_DEPTH]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}
