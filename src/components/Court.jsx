import { COURT_WIDTH, COURT_DEPTH } from '../constants/gameConstants'

export default function Court({ lineColor, floorColor }) {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[COURT_WIDTH, COURT_DEPTH]} />
        <meshStandardMaterial color={floorColor} />
      </mesh>
      
      {/* Left boundary line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-COURT_WIDTH / 2, 0.01, 0]}>
        <planeGeometry args={[0.1, COURT_DEPTH]} />
        <meshStandardMaterial color={lineColor} />
      </mesh>
      
      {/* Right boundary line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[COURT_WIDTH / 2, 0.01, 0]}>
        <planeGeometry args={[0.1, COURT_DEPTH]} />
        <meshStandardMaterial color={lineColor} />
      </mesh>
      
      {/* Top boundary line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, COURT_DEPTH / 2]}>
        <planeGeometry args={[COURT_WIDTH, 0.1]} />
        <meshStandardMaterial color={lineColor} />
      </mesh>
      
      {/* Bottom boundary line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -COURT_DEPTH / 2]}>
        <planeGeometry args={[COURT_WIDTH, 0.1]} />
        <meshStandardMaterial color={lineColor} />
      </mesh>
    </group>
  )
}
