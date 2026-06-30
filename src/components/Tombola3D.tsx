import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text, Float, Environment } from "@react-three/drei";
import * as THREE from "three";

type Token = { id: string; name: string };

type Props = {
  tokens: Token[];
  spinning: boolean;
  className?: string;
};

// Tiny stylized "abeja chuturubis" — yellow body w/ black stripes, wings, label.
function BeeToken({
  token,
  basePos,
  index,
  spinning,
}: {
  token: Token;
  basePos: THREE.Vector3;
  index: number;
  spinning: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const wingL = useRef<THREE.Mesh>(null);
  const wingR = useRef<THREE.Mesh>(null);
  const seed = useMemo(() => Math.random() * 10, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      // Spinning energy: bigger jitter when drum spins
      const amp = spinning ? 0.35 : 0.08;
      groupRef.current.position.x = basePos.x + Math.sin(t * 2 + seed) * amp;
      groupRef.current.position.y = basePos.y + Math.cos(t * 2.4 + seed) * amp;
      groupRef.current.position.z = basePos.z + Math.sin(t * 1.7 + seed * 1.3) * amp;
      groupRef.current.rotation.y += spinning ? 0.08 : 0.012;
      groupRef.current.rotation.x = Math.sin(t + index) * 0.3;
    }
    const flap = Math.sin(t * (spinning ? 38 : 22) + seed) * 0.6;
    if (wingL.current) wingL.current.rotation.z = 0.4 + flap;
    if (wingR.current) wingR.current.rotation.z = -0.4 - flap;
  });

  return (
    <group ref={groupRef} position={basePos.toArray()}>
      {/* body */}
      <mesh castShadow>
        <sphereGeometry args={[0.32, 24, 24]} />
        <meshStandardMaterial color="#facc15" roughness={0.4} metalness={0.15} />
      </mesh>
      {/* black stripes */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[0.325, 0.05, 12, 32]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      <mesh position={[0, 0.13, 0]}>
        <torusGeometry args={[0.295, 0.045, 12, 32]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      <mesh position={[0, -0.13, 0]}>
        <torusGeometry args={[0.295, 0.045, 12, 32]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      {/* eyes */}
      <mesh position={[0.18, 0.08, 0.26]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      <mesh position={[-0.18, 0.08, 0.26]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      {/* stinger */}
      <mesh position={[0, 0, -0.36]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.06, 0.18, 12]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      {/* wings */}
      <mesh ref={wingL} position={[0.18, 0.28, 0]} rotation={[0, 0, 0.4]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.45}
          roughness={0.1}
          transmission={0.7}
          thickness={0.05}
        />
      </mesh>
      <mesh ref={wingR} position={[-0.18, 0.28, 0]} rotation={[0, 0, -0.4]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.45}
          roughness={0.1}
          transmission={0.7}
          thickness={0.05}
        />
      </mesh>
      {/* name label — billboard via Text */}
      <Text
        position={[0, -0.55, 0]}
        fontSize={0.18}
        color="#fde047"
        outlineColor="#000"
        outlineWidth={0.012}
        anchorX="center"
        anchorY="middle"
        maxWidth={1.8}
      >
        {token.name}
      </Text>
    </group>
  );
}

function Drum({ tokens, spinning }: { tokens: Token[]; spinning: boolean }) {
  const drumRef = useRef<THREE.Group>(null);
  const speed = useRef(0.25);

  useFrame((_, delta) => {
    const target = spinning ? 4.5 : 0.25;
    // ease toward target speed
    speed.current += (target - speed.current) * Math.min(1, delta * 2.2);
    if (drumRef.current) {
      drumRef.current.rotation.y += speed.current * delta;
      drumRef.current.rotation.z = Math.sin(_.clock.elapsedTime * 0.4) * 0.08;
    }
  });

  // Position bees on a fibonacci sphere so they fill the drum evenly.
  const positions = useMemo(() => {
    const n = tokens.length || 1;
    const radius = Math.min(2.2, 1.2 + Math.sqrt(n) * 0.18);
    const golden = Math.PI * (3 - Math.sqrt(5));
    return tokens.map((_, i) => {
      const y = 1 - (i / Math.max(1, n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      return new THREE.Vector3(Math.cos(theta) * r * radius, y * radius * 0.85, Math.sin(theta) * r * radius);
    });
  }, [tokens]);

  return (
    <group ref={drumRef} rotation={[0.25, 0, 0]}>
      {/* Transparent glass drum */}
      <mesh>
        <sphereGeometry args={[2.8, 48, 48]} />
        <meshPhysicalMaterial
          color="#fff7c2"
          transparent
          opacity={0.12}
          roughness={0.05}
          transmission={0.95}
          thickness={0.4}
          ior={1.2}
          clearcoat={1}
          clearcoatRoughness={0.05}
        />
      </mesh>
      {/* Gold rim equator */}
      <mesh>
        <torusGeometry args={[2.8, 0.07, 16, 64]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.25} />
      </mesh>
      {/* meridian */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[2.8, 0.05, 16, 64]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.3} />
      </mesh>
      {/* Bees */}
      {tokens.map((tk, i) => (
        <BeeToken
          key={tk.id}
          token={tk}
          basePos={positions[i]}
          index={i}
          spinning={spinning}
        />
      ))}
    </group>
  );
}

function Stage({ tokens, spinning }: Props) {
  return (
    <>
      <color attach="background" args={["#0a0a0a"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 6, 5]} intensity={1.2} color="#fff3b0" />
      <pointLight position={[-4, -2, -3]} intensity={0.7} color="#f59e0b" />
      <pointLight position={[0, 0, 4]} intensity={0.6} color="#fef3c7" />

      <Float floatIntensity={0.4} rotationIntensity={0.15} speed={1.2}>
        <Drum tokens={tokens} spinning={spinning} />
      </Float>

      {/* Pedestal glow */}
      <mesh position={[0, -3.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 3.4, 64]} />
        <meshBasicMaterial color="#facc15" transparent opacity={0.15} />
      </mesh>

      <Suspense fallback={null}>
        <Environment preset="sunset" />
      </Suspense>
    </>
  );
}

export function Tombola3D({ tokens, spinning, className }: Props) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0.6, 7.2], fov: 45 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false }}
      >
        <Stage tokens={tokens} spinning={spinning} />
      </Canvas>
    </div>
  );
}
