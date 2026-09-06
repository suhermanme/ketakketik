import React, { useEffect, useState } from 'react';

/** One brief, non-interactive celebration for each completed lesson. */
export const CompletionConfetti: React.FC<{ completedAt: number | null }> = ({ completedAt }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (completedAt === null || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(timer);
  }, [completedAt]);

  if (!visible || completedAt === null) return null;
  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#a78bfa', '#06b6d4'];

  return (
    <div key={completedAt} className="cc-confetti" aria-hidden="true">
      {Array.from({ length: 60 }, (_, index) => (
        <span
          key={index}
          className="cc-confetti-piece"
          style={{
            left: `${(index * 37) % 100}%`,
            backgroundColor: colors[index % colors.length],
            width: `${6 + index % 5}px`,
            height: `${8 + index % 7}px`,
            borderRadius: index % 3 === 0 ? '50%' : '2px',
            animationDelay: `${(index % 10) * 45}ms`,
            animationDuration: `${2100 + (index % 7) * 90}ms`,
            '--confetti-drift': `${(index % 2 ? 1 : -1) * (30 + index % 90)}px`,
            '--confetti-spin': `${(index % 2 ? 1 : -1) * (360 + index * 13)}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};
