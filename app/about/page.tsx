"use client";

import { PeopleMapsLogo } from "@/components/Logo";
import { IconMapMarker } from "@/components/icons";

export default function AboutPage() {
  return (
    <div className="page">
      <div id="home">
        <div className="sign-box">
          <div className="about-icon">
            <IconMapMarker size={120} color="#F94848" />
          </div>
          <h1>Why?</h1>
          <div id="about-text">
            <p className="italic">
              Cities are full of useful places nobody knows about — a hidden
              bakery, a community fridge, a quiet spot to sit. Maps work best
              when the people who live there keep them up to date.
            </p>
          </div>
        </div>
        <div className="home-content">
          <PeopleMapsLogo size={120} />
          <h1>How?</h1>
          <div id="list">
            <p>
              <span className="bold">1.</span> Create a map about anything you
              care about.
            </p>
            <p>
              <span className="bold">2.</span> Add spots with a quick review and
              rating.
            </p>
            <p>
              <span className="bold">3.</span> Keep spots current — mark them
              open, closed or unknown.
            </p>
            <p>
              <span className="bold">4.</span> Save your favourites and share
              the map with others.
            </p>
            <p>
              <span className="bold">5.</span> Be respectful and accurate so
              other people can rely on the map.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}