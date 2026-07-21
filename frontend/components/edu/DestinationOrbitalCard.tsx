"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import RadialOrbitalTimeline, { type TimelineItem } from "@/components/ui/radial-orbital-timeline";
import { Globe } from "./Icons";

const destinations = [
  { country: "Australia", theme: "australia", universities: 6, programs: 24, cities: ["Melbourne", "Sydney", "Brisbane"], scholarship: "Up to ₹8L", opportunities: 3, intake: "February 2027", status: "Applications open", fit: 96 },
  { country: "Canada", theme: "canada", universities: 11, programs: 42, cities: ["Toronto", "Vancouver", "Ottawa"], scholarship: "Up to ₹12L", opportunities: 5, intake: "July 2027", status: "Early applications", fit: 93 },
  { country: "United Kingdom", theme: "united-kingdom", universities: 14, programs: 51, cities: ["London", "Manchester", "Edinburgh"], scholarship: "Up to ₹15L", opportunities: 8, intake: "September 2027", status: "Applications open", fit: 91 },
  { country: "Germany", theme: "germany", universities: 9, programs: 31, cities: ["Berlin", "Munich", "Hamburg"], scholarship: "Up to ₹6L", opportunities: 4, intake: "January 2028", status: "Limited seats", fit: 88 },
  { country: "France", theme: "france", universities: 8, programs: 34, cities: ["Paris", "Lyon", "Toulouse"], scholarship: "Up to ₹9L", opportunities: 4, intake: "September 2027", status: "Applications open", fit: 87 },
  { country: "Ireland", theme: "ireland", universities: 7, programs: 28, cities: ["Dublin", "Cork", "Galway"], scholarship: "Up to ₹10L", opportunities: 5, intake: "September 2027", status: "Closing soon", fit: 85 },
  { country: "New Zealand", theme: "new-zealand", universities: 8, programs: 26, cities: ["Auckland", "Wellington", "Dunedin"], scholarship: "Up to ₹11L", opportunities: 4, intake: "February 2028", status: "Early applications", fit: 84 },
] as const;

const timeline: TimelineItem[] = destinations.map((item, index) => ({ id: index + 1, title: item.country, date: item.intake, content: `${item.universities} universities and ${item.programs} matching programs.`, category: "Destination", icon: MapPin, relatedIds: [((index + 1) % destinations.length) + 1], status: index < 2 ? "completed" : index < 4 ? "in-progress" : "pending", energy: item.fit }));

export function DestinationOrbitalCard() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % destinations.length), 4500);
    return () => window.clearInterval(timer);
  }, []);
  const destination = destinations[active];

  return <div className={`feature-visual destination-stage theme-${destination.theme}`} data-craft-reactive>
    <RadialOrbitalTimeline timelineData={timeline} activeId={active + 1} onSelect={(id) => setActive(id - 1)} />
    <div className="country-card country-main orbital-country" key={`country-${active}`}><Globe size={28} /><span>Explore destinations</span><strong>{destination.country}</strong><small>{destination.universities} universities · {destination.programs} programs</small><div className="city-pills">{destination.cities.map((city) => <b key={city}>{city}</b>)}</div></div>
    <div className="floating-card scholarship orbital-scholarship" key={`scholarship-${active}`}><span>Scholarship match</span><strong>{destination.scholarship}</strong><small>{destination.opportunities} opportunities found</small></div>
    <div className="floating-card deadline orbital-intake" key={`intake-${active}`}><span>Next intake</span><strong>{destination.intake}</strong><small>{destination.status}</small></div>
  </div>;
}
