import clientPromise from '@/lib/mongodb';
import ClothingDashboard, { UGCItem } from '@/components/ClothingDashboard';

// Disable Static Rendering, force fetch on each load so changes are immediately visible
export const dynamic = 'force-dynamic';

async function getUGCItems(): Promise<UGCItem[]> {
  try {
    const client = await clientPromise;
    const db = client.db('ugc_marketing');
    const collection = db.collection('clothing_items');
    
    const items = await collection.find({ approved: true }).sort({ createdAt: -1 }).toArray();
    
    return items.map((item) => {
      return {
        _id: item._id.toString(),
        productName: item.productName || '',
        platform: item.platform || 'instagram',
        username: item.username || '',
        userHandle: item.userHandle || '',
        content: item.content || '',
        mediaUrl: item.mediaUrl || '',
        mediaType: item.mediaType || 'text',
        rating: typeof item.rating === 'number' ? item.rating : 5,
        likes: typeof item.likes === 'number' ? item.likes : 0,
        buyUrl: item.buyUrl || '',
        buyUrls: Array.isArray(item.buyUrls) ? item.buyUrls : [],
        postUrl: item.postUrl || '',
        instagramPostUrl: item.instagramPostUrl || '',
        youtubePostUrl: item.youtubePostUrl || '',
        approved: !!item.approved,
        createdAt: item.createdAt instanceof Date 
          ? item.createdAt.toISOString() 
          : (typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString()),
        tags: Array.isArray(item.tags) ? item.tags : [],
      } as UGCItem;
    });
  } catch (error) {
    console.error('Failed to fetch UGC items from MongoDB Atlas:', error);
    return [];
  }
}

export default async function Page() {
  const initialItems = await getUGCItems();
  return <ClothingDashboard initialItems={initialItems} />;
}
