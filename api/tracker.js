// api/track.js - Vercel Serverless Function with MongoDB
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient;
  }

  const client = await MongoClient.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  cachedClient = client;
  return client;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const client = await connectToDatabase();
    const db = client.db('tracker');
    const collection = db.collection('stats');

    // GET - Retrieve stats
    if (req.method === 'GET') {
      const stats = await collection.findOne({ _id: 'page_stats' });
      
      if (!stats) {
        return res.status(200).json({
          total_views: 0,
          unique_visitors: 0,
          visits: []
        });
      }

      return res.status(200).json({
        total_views: stats.total_views || 0,
        unique_visitors: stats.unique_visitors?.length || 0,
        visits: stats.visits || []
      });
    }

    // POST - Track visitor
    if (req.method === 'POST') {
      const { visitor_id, timestamp, referrer, user_agent, page_url } = req.body;
      
      // Get current stats
      let stats = await collection.findOne({ _id: 'page_stats' });
      
      if (!stats) {
        stats = {
          _id: 'page_stats',
          total_views: 0,
          unique_visitors: [],
          visits: []
        };
      }

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

      // Save to database
      await collection.updateOne(
        { _id: 'page_stats' },
        { $set: stats },
        { upsert: true }
      );
      
      return res.status(200).json({ status: 'success' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Database connection failed' });
  }
}
