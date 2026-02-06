import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { BALL_SIZE, COURT_WIDTH, COURT_DEPTH } from '../constants/gameConstants'

export default function Ball({ position, velocity, onPositionChange, onScore, onOutOfBounds, color, gameStarted, paused }) {
  const ballRef = useRef()
  const velocityRef = useRef(velocity)
  const outOfBoundsTimeRef = useRef(null)
  const lastWallCollisionRef = useRef(0)
  const wallCollisionCooldownRef = useRef(false)

  useEffect(() => {
    velocityRef.current = velocity
  }, [velocity])

  useFrame((state, delta) => {
    if (ballRef.current) {
      const currentTime = state.clock.getElapsedTime()
      
      // Don't move ball until game has started, or when paused; keep in sync with parent
      if (!gameStarted || paused) {
        ballRef.current.position.x = position[0]
        ballRef.current.position.y = 0.3
        ballRef.current.position.z = position[1]
        onPositionChange([ballRef.current.position.x, ballRef.current.position.z])
        return
      }
      
      // Sync to center when parent resets (e.g. after score)
      if (position[0] === 0 && position[1] === 0) {
        ballRef.current.position.x = 0
        ballRef.current.position.z = 0
      }
      
      // Clamp delta to avoid large jumps (e.g. tab in background) that cause jitter
      const dt = Math.min(delta, 0.1)
      // Update ball position (dt = seconds since last frame → framerate-independent speed)
      ballRef.current.position.x += velocityRef.current[0] * dt
      ballRef.current.position.z += velocityRef.current[1] * dt
      // Keep ball at a fixed height above the ground
      ballRef.current.position.y = 0.3

      // Reset cooldown if enough time has passed (0.1 seconds)
      if (currentTime - lastWallCollisionRef.current > 0.1) {
        wallCollisionCooldownRef.current = false
      }

      // Check if ball is outside boundaries
      const outsideRight = ballRef.current.position.x >= COURT_WIDTH / 2 - BALL_SIZE / 2
      const outsideLeft = ballRef.current.position.x <= -COURT_WIDTH / 2 + BALL_SIZE / 2
      const isOutsideBounds = outsideRight || outsideLeft
      
      if (isOutsideBounds) {
        // Track how long ball has been out of bounds
        if (outOfBoundsTimeRef.current === null) {
          outOfBoundsTimeRef.current = currentTime
        } else if (currentTime - outOfBoundsTimeRef.current > 0.5) {
          // Ball has been stuck outside for more than 0.5 seconds
          onOutOfBounds()
          outOfBoundsTimeRef.current = null
          return
        }
        
        // Normal bounce behavior if not stuck
        if (!wallCollisionCooldownRef.current) {
          velocityRef.current[0] *= -1
          lastWallCollisionRef.current = currentTime
          wallCollisionCooldownRef.current = true
          
          // Edge case fix: If ball is moving too parallel to the boundary, push it toward center
          const velocityMagnitude = Math.sqrt(velocityRef.current[0] ** 2 + velocityRef.current[1] ** 2)
          const horizontalRatio = Math.abs(velocityRef.current[0]) / velocityMagnitude
          
          // If horizontal component is less than 30% of total velocity, it's too parallel
          if (horizontalRatio < 0.3) {
            // Add horizontal velocity to push ball toward center
            const pushDirection = ballRef.current.position.x > 0 ? -1 : 1
            velocityRef.current[0] = pushDirection * velocityMagnitude * 0.4
            
            // Adjust vertical velocity to maintain overall speed
            const newVerticalSpeed = Math.sqrt(velocityMagnitude ** 2 - velocityRef.current[0] ** 2)
            velocityRef.current[1] = Math.sign(velocityRef.current[1]) * newVerticalSpeed
            
            // Push ball slightly away from the wall to unstick it
            ballRef.current.position.x += pushDirection * BALL_SIZE
          }
        }
      } else {
        // Ball is within bounds, reset the out-of-bounds timer
        outOfBoundsTimeRef.current = null
      }

      // Check if ball went past paddles (scoring)
      if (ballRef.current.position.z > COURT_DEPTH / 2 + 1) {
        onScore('player')
        return
      }
      if (ballRef.current.position.z < -COURT_DEPTH / 2 - 1) {
        onScore('ai')
        return
      }

      onPositionChange([ballRef.current.position.x, ballRef.current.position.z])
    }
  })

  return (
    <mesh ref={ballRef}>
      <sphereGeometry args={[BALL_SIZE, 32, 32]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
    </mesh>
  )
}
