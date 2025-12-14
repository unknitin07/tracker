// api/track.js - Vercel Serverless Function (No Database Required)

// Simple in-memory storage (resets on deployment, but good for basic tracking)
// For persistent storage across deployments, use Vercel KV or external service

let stats = {
  total_views: 0,
  unique_visitors: [],
  visits: []
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET - Retrieve stats
  if (req.method === 'GET') {
    try {
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
      
      return res.status(200).json({ status: 'success' });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to track visitor' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
