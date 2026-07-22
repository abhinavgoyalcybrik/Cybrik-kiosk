"use client";

import { useEffect, useRef, useState } from "react";

const PHONE_NUMBER = "+919876543210";
const STORAGE_KEY = "cybrik-call-now-position";
const EDGE_GAP = 16;
const DRAG_THRESHOLD = 6;

type Position = { x: number; y: number };

function PhoneIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
    </svg>
  );
}

export function DraggableCallNow() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef({ pointerId: -1, startX: 0, startY: 0, originX: 0, originY: 0, moved: false });
  const [position, setPosition] = useState<Position | null>(null);
  const [dragging, setDragging] = useState(false);

  const clamp = (next: Position): Position => {
    const rect = buttonRef.current?.getBoundingClientRect();
    const width = rect?.width ?? 132;
    const height = rect?.height ?? 56;
    return {
      x: Math.min(Math.max(EDGE_GAP, next.x), Math.max(EDGE_GAP, window.innerWidth - width - EDGE_GAP)),
      y: Math.min(Math.max(EDGE_GAP, next.y), Math.max(EDGE_GAP, window.innerHeight - height - EDGE_GAP)),
    };
  };

  useEffect(() => {
    let saved: Position | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Position | null;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    const initialPosition = saved ?? { x: window.innerWidth - 156, y: window.innerHeight - 88 };
    const frame = window.requestAnimationFrame(() => setPosition(clamp(initialPosition)));

    const handleResize = () => setPosition((current) => current ? clamp(current) : current);
    window.addEventListener("resize", handleResize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const savePosition = (next: Position) => {
    setPosition(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`call-now-fab${dragging ? " is-dragging" : ""}`}
      style={position ? { left: position.x, top: position.y } : undefined}
      aria-label="Call a Cybrik advisor now. Drag to reposition."
      title="Call now · drag to move"
      onPointerDown={(event) => {
        if (!position) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: position.x, originY: position.y, moved: false };
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (drag.pointerId !== event.pointerId) return;
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        drag.moved = true;
        setDragging(true);
        setPosition(clamp({ x: drag.originX + dx, y: drag.originY + dy }));
      }}
      onPointerUp={(event) => {
        const drag = dragRef.current;
        if (drag.pointerId !== event.pointerId) return;
        event.currentTarget.releasePointerCapture(event.pointerId);
        dragRef.current.pointerId = -1;
        setDragging(false);
        if (drag.moved) savePosition(clamp({ x: drag.originX + event.clientX - drag.startX, y: drag.originY + event.clientY - drag.startY }));
        else window.location.href = `tel:${PHONE_NUMBER}`;
      }}
      onPointerCancel={() => {
        dragRef.current.pointerId = -1;
        setDragging(false);
      }}
      onKeyDown={(event) => {
        if (!position || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault();
        const step = event.shiftKey ? 24 : 8;
        savePosition(clamp({
          x: position.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0),
          y: position.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0),
        }));
      }}
    >
      <span className="call-now-fab-icon"><PhoneIcon /></span>
      <span>Call now</span>
      <span className="call-now-fab-grip" aria-hidden="true" />
    </button>
  );
}
