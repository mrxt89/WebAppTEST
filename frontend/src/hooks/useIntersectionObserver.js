// src/hooks/useIntersectionObserver.js
import { useEffect, useRef, useState } from 'react';

export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = options.ref || useRef(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observerOptions = {
      threshold: options.threshold || 0.1,
      root: options.root || null,
      rootMargin: options.rootMargin || '0px',
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      observerOptions
    );

    observer.observe(target);

    return () => {
      if (target) {
        observer.unobserve(target);
      }
      observer.disconnect();
    };
  }, [options.threshold, options.root, options.rootMargin, targetRef.current]);

  return { ref: targetRef, isIntersecting };
};