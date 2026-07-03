import './beauty.css';
import React from 'react';

export const metadata = {
  title: "Sudarshona's Skincare Meadow - UGC Reviews",
  description: "Hydrating skincare recommendations and organic product reviews by Sudarshona.",
};

export default function BeautyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="beauty-theme">{children}</div>;
}
