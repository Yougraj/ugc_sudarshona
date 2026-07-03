import './clothing.css';
import React from 'react';

export const metadata = {
  title: "Sudarshona's Outfit Closet - UGC Style Guides",
  description: "Aesthetic lookbooks, cozy cardigans, and style reviews by Sudarshona.",
};

export default function ClothingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="clothing-theme">{children}</div>;
}
