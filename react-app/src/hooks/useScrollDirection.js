import { useState, useEffect } from 'react';

/**
 * Hook to detect scroll direction
 * Returns 'up', 'down', or null
 */
export function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState(null);
  const [prevOffset, setPrevOffset] = useState(0);

  useEffect(() => {
    const threshold = 10; // Minimum scroll amount to trigger
    let ticking = false;

    const updateScrollDirection = () => {
      const scrollY = window.pageYOffset;

      if (Math.abs(scrollY - prevOffset) < threshold) {
        ticking = false;
        return;
      }

      setScrollDirection(scrollY > prevOffset ? 'down' : 'up');
      setPrevOffset(scrollY);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll);

    return () => window.removeEventListener('scroll', onScroll);
  }, [prevOffset]);

  return scrollDirection;
}

/**
 * Hook to show/hide element based on scroll
 * Returns boolean - true if should be visible
 */
export function useScrollVisibility() {
  const scrollDirection = useScrollDirection();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (scrollDirection === 'down') {
      setIsVisible(false);
    } else if (scrollDirection === 'up') {
      setIsVisible(true);
    }
  }, [scrollDirection]);

  return isVisible;
}