// api/track.js - Vercel Serverless Function
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const STATS_KEY = 'page_stats';

  // GET - Retrieve stats
  if (req.method === 'GET') {
    try {
      const stats = await kv.get(STATS_KEY) || {
        total_views: 0,
        unique_visitors: [],
        visits: []
      };
      
      return res.status(200).json({
        total_views: stats.total_views,
        unique_visitors: stats.unique_visitors.length,
        visits: stats.visits
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to retrieve stats' });
    }
  }

  // POST - Track visitor
  if (req.method === 'POST') {
    try {
      const { visitor_id, timestamp, referrer, user_agent, page_url } = req.body;
      
      // Get current stats
      let stats = await kv.get(STATS_KEY) || {
        total_views: 0,
        unique_visitors: [],
        visits: []
      };
      
      // Update stats
      stats.total_views += 1;
      
      if (visitor_id && !stats.unique_visitors.includes(visitor_id)) {
        stats.unique_visitors.push(visitor_id);
      }
      
      stats.visits.push({
        visitor_id,
        timestamp,
        referrer: referrer || 'Direct',
        user_agent,
        page_url
      });
      
      // Keep only last 1000 visits
      if (stats.visits.length > 1000) {
        stats.visits = stats.visits.slice(-1000);
      }
      
      // Save updated stats
      await kv.set(STATS_KEY, stats);
      
      return res.status(200).json({ status: 'success' });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to track visitor' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
