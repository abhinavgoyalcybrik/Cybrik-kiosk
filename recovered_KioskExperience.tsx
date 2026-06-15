"use client";

import React, { useState, useEffect } from "react";

export default function KioskExperience() {
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const date = new Date();
    setCurrentDate(
      date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    );
  }, []);

  return (
    <div className="kiosk-device">
      {/* HEADER */}
      <header className="kiosk-header">
        <div className="header-logo">Cybrik</div>
        <div className="header-title">AI Admission Intelligence</div>
        <div className="header-date">{currentDate}</div>
      </header>

      {/* MAIN CONTENT */}
      <main className="kiosk-main">
        {/* LEFT SECTION */}
        <section className="col-left">
          <h2>Profile Assessment</h2>
          
          <div className="giant-score">89%</div>
          <div className="giant-label">Student Match Score</div>
          
          <h2 style={{ marginTop: "48px" }}>Academic Profile</h2>
          <div className="profile-stat">IELTS: 7.5</div>
          <div className="profile-stat" style={{ borderBottom: "none" }}>Experience: 2 Years</div>
          
          <div style={{ marginTop: "64px", flex: 1 }}>
            <div className="status-indicator">
              <span className="status-dot"></span> Profile Evaluated
            </div>
            <div className="status-indicator">
              <span className="status-dot"></span> Eligibility Verified
            </div>
            <div className="status-indicator">
              <span className="status-dot"></span> Ready for Matching
            </div>
          </div>
          
          <button className="btn">View Profile</button>
        </section>

        {/* CENTER SECTION */}
        <section className="col-center">
          <div className="giant-count">24</div>
          <div className="count-label">Universities Available</div>
          
          <div className="country-list">
            <div className="country-row">
              <span>Canada</span>
              <span className="country-count">— 8</span>
            </div>
            <div className="country-row">
              <span>United Kingdom</span>
              <span className="country-count">— 7</span>
            </div>
            <div className="country-row">
              <span>Australia</span>
              <span className="country-count">— 5</span>
            </div>
            <div className="country-row" style={{ borderBottom: "none" }}>
              <span>United States</span>
              <span className="country-count">— 4</span>
            </div>
          </div>
          
          <div className="featured-card">
            <div className="card-title">University of Toronto</div>
            <div className="card-tag">92% Match</div>
            <div className="card-detail">Scholarship Available</div>
            <div className="card-detail">Application Open</div>
          </div>
          
          <button className="btn btn-primary" style={{ marginTop: "40px" }}>Explore Universities</button>
        </section>

        {/* RIGHT SECTION */}
        <section className="col-right">
          <h2>Documents Ready</h2>
          
          <div className="giant-score" style={{ color: "var(--text-primary)" }}>06</div>
          
          <div style={{ marginTop: "48px", flex: 1 }}>
            {[
              "SOP",
              "LOR",
              "Resume",
              "Financial Letter",
              "Visa Letter",
              "Application Summary"
            ].map((doc) => (
              <div key={doc} className="doc-item">
                <span className="doc-check">✓</span> {doc}
              </div>
            ))}
          </div>
          
          <button className="btn">Review Documents</button>
        </section>
      </main>

      {/* BOTTOM SECTION */}
      <footer className="kiosk-footer">
        <button className="btn-giant">Start Application</button>
        <div className="footer-text">AI-assisted admission process ready.</div>
      </footer>
    </div>
  );
}
