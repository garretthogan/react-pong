import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_DEPTH, COURT_WIDTH, AI_SPEED } from '../constants/gameConstants'

export default function AIPaddle({ position, ballPosition, paddleRef, difficultyLevel, baseDifficulty = 0.5, color }) {
  const errorOffsetRef = useRef(0)
  const reactionDelayRef = useRef(0)
  const lastUpdateRef = useRef(0)
  const d = Math.max(0, Math.min(1, baseDifficulty))

  useFrame(({ clock }) => {
    if (paddleRef.current && ballPosition) {
      const currentTime = clock.getElapsedTime()

      // Base difficulty from slider (0 = easy, 1 = hard) scales error, speed, and reaction
      const baseErrorScale = 1 - d * 0.7
      const baseSpeedScale = 0.5 + d * 0.5
      const baseReactionScale = 1 - d * 0.8

      // Rally difficulty (improves with each successful player hit)
      const rallyError = Math.max(0.3, 1 - difficultyLevel * 0.1)
      const rallySpeed = Math.min(1.5, 1 + difficultyLevel * 0.08)
      const rallyReaction = Math.max(0.2, 1 - difficultyLevel * 0.12)

      const errorReduction = Math.max(0.2, baseErrorScale * rallyError)
      const speedIncrease = baseSpeedScale * rallySpeed
      const reactionImprovement = Math.max(0.15, baseReactionScale * rallyReaction)

      // Update error offset periodically (AI changes its "mistake" every so often)
      if (currentTime - lastUpdateRef.current > 1.0) {
        errorOffsetRef.current = (Math.random() - 0.5) * 4 * errorReduction
        reactionDelayRef.current = Math.random() * 0.3 * reactionImprovement
        lastUpdateRef.current = currentTime
      }

      const targetX = ballPosition[0] + errorOffsetRef.current
      const diff = targetX - paddleRef.current.position.x
      const reactionThreshold = (0.25 + reactionDelayRef.current) * reactionImprovement

      if (Math.abs(diff) > reactionThreshold) {
        const baseSpeed = 0.6 + Math.random() * 0.3
        const speed = AI_SPEED * baseSpeed * Math.min(1.5, speedIncrease)
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
