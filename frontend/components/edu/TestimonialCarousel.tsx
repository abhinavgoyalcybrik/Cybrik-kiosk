import Image from "next/image";
import { Graduation, MapPin, Spark } from "./Icons";

const testimonials = [
  { name: "Naina Kapoor", role: "Master’s student · RMIT University", quote: "Cybrik helped me understand why RMIT fit my goals, then turned a confusing application process into a clear weekly plan.", destination: "Australia", code: "AU", proof: "₹6.5L scholarship", match: "98% match", image: "/student-campus-1.webp", position: "44% 42%" },
  { name: "Arjun Mehta", role: "Software engineer · Toronto", quote: "The recommendations respected my budget and work experience. I found programs I would never have considered on my own.", destination: "Canada", code: "CA", proof: "5 offers compared", match: "94% match", image: "/student-campus-2.webp", position: "66% 35%" },
  { name: "Maya Fernando", role: "Bachelor’s student · University of Sydney", quote: "Every requirement was explained in plain language. I always knew which document to prepare next and why it mattered.", destination: "Australia", code: "AU", proof: "Checklist complete", match: "96% match", image: "/student-campus-2.webp", position: "22% 40%" },
  { name: "Daniel Okafor", role: "Data science student · Munich", quote: "Cybrik filtered out programs I wasn’t eligible for and gave me a shortlist I could discuss confidently with my family.", destination: "Germany", code: "DE", proof: "₹8L saved", match: "92% match", image: "/student-campus-2.webp", position: "50% 42%" },
  { name: "Sara Williams", role: "MBA candidate · London", quote: "The match breakdown made the decision feel objective. I could compare tuition, scholarships, and career fit in one place.", destination: "United Kingdom", code: "UK", proof: "3 strong offers", match: "97% match", image: "/student-campus-1.webp", position: "63% 38%" },
];

function TestimonialCard({ testimonial, index }: { testimonial: typeof testimonials[number]; index: number }) {
  return <div className="testimonial-slot" style={{ "--story-delay": `${index * 110}ms` } as React.CSSProperties}><article className="testimonial-card">
    <header><div className="testimonial-avatar"><Image src={testimonial.image} alt="" fill sizes="52px" style={{ objectPosition: testimonial.position }} /></div><div><strong>{testimonial.name}</strong><span>{testimonial.role}</span></div><span className="testimonial-quote" aria-hidden="true">“</span></header>
    <blockquote>{testimonial.quote}</blockquote>
    <div className="testimonial-meta"><span className="story-destination"><b>{testimonial.code}</b><MapPin />{testimonial.destination}</span><span><Graduation />{testimonial.proof}</span><span className="story-match"><Spark />{testimonial.match}</span></div>
  </article></div>;
}

export function TestimonialCarousel() {
  return <section className="stories-carousel" id="stories" data-reveal data-cursor-intent>
    <div className="stories-heading section-pad"><div><span className="kicker">Student success stories</span><h2>Trusted by students worldwide.</h2></div><p>Discover how Cybrik helps students find the right universities, uncover scholarships, and begin their international education journey with confidence.</p></div>
    <div className="testimonial-viewport">
      <div className="testimonial-track">
        <div className="testimonial-set">{testimonials.map((testimonial, index) => <TestimonialCard key={testimonial.name} testimonial={testimonial} index={index} />)}</div>
        <div className="testimonial-set" aria-hidden="true">{testimonials.map((testimonial, index) => <TestimonialCard key={`${testimonial.name}-copy`} testimonial={testimonial} index={index} />)}</div>
      </div>
    </div>
  </section>;
}
