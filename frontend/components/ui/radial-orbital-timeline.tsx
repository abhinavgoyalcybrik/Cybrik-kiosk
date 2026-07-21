"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Link2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface TimelineItem { id: number; title: string; date: string; content: string; category: string; icon: LucideIcon; relatedIds: number[]; status: "completed" | "in-progress" | "pending"; energy: number }
interface Props { timelineData: TimelineItem[]; activeId?: number; onSelect?: (id: number) => void }

export default function RadialOrbitalTimeline({ timelineData, activeId, onSelect }: Props) {
  const [rotation, setRotation] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const paused = expanded !== null;

  useEffect(() => {
    if (paused || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setRotation((angle) => (angle + .24) % 360), 50);
    return () => window.clearInterval(timer);
  }, [paused]);

  const choose = (id: number) => {
    setExpanded((current) => current === id ? null : id);
    onSelect?.(id);
  };

  return (
    <div className="radial-timeline" role="group" aria-label="Explore destinations in orbit" onClick={() => setExpanded(null)}>
      <div className="radial-core" aria-hidden="true"><span /><i /></div>
      <div className="radial-ring" aria-hidden="true" />
      {timelineData.map((item, index) => {
        const angle = (index / timelineData.length) * 360 + rotation;
        const radian = angle * Math.PI / 180;
        const Icon = item.icon;
        const isOpen = expanded === item.id;
        const isActive = activeId === item.id;
        return (
          <div className="radial-node-wrap" key={item.id} style={{ "--node-x": Math.cos(radian), "--node-y": Math.sin(radian), zIndex: isOpen ? 20 : Math.round(8 + Math.sin(radian) * 2), opacity: isOpen ? 1 : Math.max(.55, .78 + Math.sin(radian) * .2) } as React.CSSProperties}>
            <button className={`radial-node ${isActive ? "is-active" : ""}`} type="button" aria-expanded={isOpen} aria-label={`View ${item.title}`} onClick={(event) => { event.stopPropagation(); choose(item.id); }}><Icon size={17} /><span>{item.title}</span></button>
            {isOpen && <Card className="radial-detail" onClick={(event) => event.stopPropagation()}><CardHeader><div className="radial-detail-meta"><Badge variant={item.status === "completed" ? "default" : "secondary"}>{item.status.replace("-", " ")}</Badge><span>{item.date}</span></div><CardTitle>{item.title}</CardTitle></CardHeader><CardContent><p>{item.content}</p><div className="radial-energy"><span><Zap size={12} /> Profile fit</span><b>{item.energy}%</b><i><em style={{ width: `${item.energy}%` }} /></i></div>{item.relatedIds.length > 0 && <div className="radial-links"><span><Link2 size={12} /> Connected</span>{item.relatedIds.slice(0, 2).map((id) => { const related = timelineData.find((entry) => entry.id === id); return <Button key={id} variant="ghost" size="sm" onClick={() => choose(id)}>{related?.title}<ArrowRight size={12} /></Button>; })}</div>}</CardContent></Card>}
          </div>
        );
      })}
    </div>
  );
}
