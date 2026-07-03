import clientPromise from '@/lib/mongodb';
import Link from 'next/link';

// Force dynamic fetch so database statistics stay live
export const dynamic = 'force-dynamic';

interface PortalStats {
  beautyCount: number;
  clothingCount: number;
}

async function getStats(): Promise<PortalStats> {
  try {
    const client = await clientPromise;
    const db = client.db('ugc_marketing');
    
    const beautyCount = await db.collection('ugc_items').countDocuments({ approved: true });
    const clothingCount = await db.collection('clothing_items').countDocuments({ approved: true });
    
    return { beautyCount, clothingCount };
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return { beautyCount: 0, clothingCount: 0 };
  }
}

export default async function Page() {
  const { beautyCount, clothingCount } = await getStats();

  return (
    <div className="portal-container">
      {/* Background drifting Ghibli-style watercolor clouds */}
      <div className="ghibli-cloud cloud-1" />
      <div className="ghibli-cloud cloud-2" />
      <div className="ghibli-cloud cloud-3" />

      {/* Bottom grassy meadow backdrop */}
      <div className="grassy-meadow" />

      {/* Cozy Storybook Badge */}
      <div className="vibe-tag">
        🌤️ Sudarshona's Corner 🌤️
      </div>

      {/* Header */}
      <header className="portal-header">
        <h1 className="portal-title">Sudarshona's UGC Hub</h1>
        <p className="portal-subtitle">
          No filters, just warm sunlit reviews, aesthetic outfits, and botanical skincare. Take a stroll and explore our cozy workshops.
        </p>
      </header>

      {/* Cards Grid */}
      <div className="cards-grid">
        {/* Beauty Card (The Skincare Meadow) */}
        <Link 
          href="/beauty" 
          className="portal-card beauty-card"
        >
          <span className="card-icon">🍃</span>
          <h2 className="card-title">Skincare Meadow</h2>
          <p className="card-desc">
            Gentle lip glow oils that shine like morning dew, hydrating rice water cleansers, and organic skincare reviews. Feel the fresh summer breeze.
          </p>
          <div className="card-stats">
            <span>🌸</span>
            <span>{beautyCount} botanical reviews</span>
          </div>
          <div className="card-arrow">
            <span>Explore space</span>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
        </Link>

        {/* Clothing Card (The Outfit Closet) */}
        <Link 
          href="/clothing" 
          className="portal-card clothing-card"
        >
          <span className="card-icon">🧥</span>
          <h2 className="card-title">The Outfit Closet</h2>
          <p className="card-desc">
            Cozy hand-knit cardigans, lightweight breathable linen blazers, and aesthetic unisex fit checks. Curated lookbooks in warm earthy tones.
          </p>
          <div className="card-stats">
            <span>🍂</span>
            <span>{clothingCount} style guides</span>
          </div>
          <div className="card-arrow">
            <span>Explore space</span>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
        </Link>
      </div>

      {/* Footer */}
      <footer className="portal-footer">
        ugc_sudarshona • crafted with love & nostalgia
      </footer>
    </div>
  );
}
