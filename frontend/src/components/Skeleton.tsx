import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = "", 
  width = "100%", 
  height = "20px", 
  borderRadius = "4px" 
}) => {
  return (
    <motion.div
      className={`skeleton ${className}`}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ 
        repeat: Infinity, 
        duration: 1.5, 
        ease: "easeInOut" 
      }}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'var(--skeleton-bg, #eee)',
        display: 'block'
      }}
    />
  );
};

export const CardSkeleton = () => (
  <div className="card p-6 flex-col-gap-4">
    <Skeleton width="60%" height="24px" />
    <Skeleton height="100px" />
    <div className="flex justify-between items-center mt-2">
      <Skeleton width="30%" height="16px" />
      <Skeleton width="20%" height="16px" />
    </div>
  </div>
);

export const TableRowSkeleton = ({ cols = 5 }: { cols?: number }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="p-4">
        <Skeleton height="16px" width={i === 0 ? "80%" : "60%"} />
      </td>
    ))}
  </tr>
);
