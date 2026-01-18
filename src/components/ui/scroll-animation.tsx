"use client";

import { useEffect, useRef, useState, ReactNode } from "react";

interface ScrollAnimationProps {
  children: ReactNode;
  animation?: "fade-up" | "fade-scale" | "slide-left" | "slide-right";
  delay?: number;
  className?: string;
  threshold?: number;
}

export function ScrollAnimation({
  children,
  animation = "fade-up",
  delay = 0,
  className = "",
  threshold = 0.1,
}: ScrollAnimationProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  const animationClass = {
    "fade-up": "fade-in-up",
    "fade-scale": "fade-in-scale",
    "slide-left": "slide-in-left",
    "slide-right": "slide-in-right",
  }[animation];

  return (
    <div
      ref={ref}
      className={`${className} ${isVisible ? animationClass : "opacity-0"}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// Staggered animation for lists/grids
interface StaggeredAnimationProps {
  children: ReactNode[];
  animation?: "fade-up" | "fade-scale" | "slide-left" | "slide-right";
  staggerDelay?: number;
  className?: string;
  itemClassName?: string;
}

export function StaggeredAnimation({
  children,
  animation = "fade-up",
  staggerDelay = 100,
  className = "",
  itemClassName = "",
}: StaggeredAnimationProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  const animationClass = {
    "fade-up": "fade-in-up",
    "fade-scale": "fade-in-scale",
    "slide-left": "slide-in-left",
    "slide-right": "slide-in-right",
  }[animation];

  return (
    <div ref={ref} className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className={`${itemClassName} ${isVisible ? animationClass : "opacity-0"}`}
          style={{ animationDelay: `${index * staggerDelay}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
