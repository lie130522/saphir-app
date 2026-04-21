import { useState } from 'react';
import { motion } from 'framer-motion';

const SYMBOLS = ['$', '€', 'FC', '¥', '₿', '₣', '📈', '📊'];

const generateParticles = () => Array.from({ length: 25 }, (_, i) => ({
  id: i,
  symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
  size: Math.random() * 20 + 10,
  initialX: Math.random() * 100,
  initialY: Math.random() * 100,
  duration: Math.random() * 20 + 20,
  randomX: Math.random() * 50 - 25,
}));

export default function BackgroundAnimation() {
  const [particles] = useState(generateParticles);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      zIndex: 0,
      pointerEvents: 'none',
      background: 'white'
    }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            top: `${p.initialY}%`,
            left: `${p.initialX}%`,
            fontSize: `${p.size}px`,
            color: 'rgba(14, 165, 233, 0.08)',
            userSelect: 'none',
            fontWeight: 'bold',
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, p.randomX, 0],
            rotate: [0, 360],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          {p.symbol}
        </motion.div>
      ))}
    </div>
  );
}
