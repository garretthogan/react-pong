import { useFrame } from '@react-three/fiber'
import { PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_DEPTH, COURT_WIDTH } from '../constants/gameConstants'

export default function PlayerPaddle({ position, mouseX, paddleRef, color, paused }) {
  useFrame(() => {
    if (paused || !paddleRef.current) return
    const targetX = mouseX * (COURT_WIDTH / 2 - PADDLE_WIDTH / 2)
    paddleRef.current.position.x += (targetX - paddleRef.current.position.x) * 0.1
    paddleRef.current.position.x = Math.max(
      -COURT_WIDTH / 2 + PADDLE_WIDTH / 2,
      Math.min(COURT_WIDTH / 2 - PADDLE_WIDTH / 2, paddleRef.current.position.x)
    )
  })

  return (
    <mesh ref={paddleRef} position={position}>
      <boxGeometry args={[PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_DEPTH]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}
