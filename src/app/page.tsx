import fs from 'fs';
import path from 'path';
import UGCDashboard from '@/components/UGCDashboard';

// Disable Static Rendering, force fetch on each load so changes to JSON are immediately visible
export const dynamic = 'force-dynamic';

export interface UGCItem {
  _id: string;
  productName: string;
  platform: 'instagram' | 'youtube';
  username: string;
  userHandle: string;
  content: string;
  mediaUrl?: string;
  mediaType: 'image' | 'video' | 'text';
  rating?: number;
  likes?: number;
  buyUrl: string;
  postUrl?: string;
  approved: boolean;
  createdAt: string;
  tags?: string[];
}

async function getUGCItems(): Promise<UGCItem[]> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'ugc-data.json');
    if (!fs.existsSync(filePath)) {
      console.warn('UGC data file not found at:', filePath);
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data) as UGCItem[];
  } catch (error) {
    console.error('Failed to read UGC data file:', error);
    return [];
  }
}

export default async function Page() {
  const initialItems = await getUGCItems();
  return <UGCDashboard initialItems={initialItems} />;
}
