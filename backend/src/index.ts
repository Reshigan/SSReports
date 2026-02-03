import { Hono } from 'hono';
import { cors } from 'hono/cors';

interface Env {
  DB: D1Database;
  PHOTOS: R2Bucket;
  MYSQL_HOST: string;
  MYSQL_PORT: string;
  MYSQL_DATABASE: string;
  MYSQL_USER: string;
  MYSQL_PASSWORD: string;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.get('/', (c) => {
  return c.json({ message: 'SSReports API', version: '1.0.0' });
});

app.get('/api/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  
  try {
    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(email).first();
    
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (hashHex !== user.password_hash) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    
    const token = await generateJWT({ userId: user.id, email: user.email, role: user.role }, c.env.JWT_SECRET || 'default-secret');
    
    return c.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

app.post('/api/auth/register', async (c) => {
  const { email, password, name, role = 'viewer' } = await c.req.json();
  
  try {
    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();
    
    if (existing) {
      return c.json({ error: 'Email already exists' }, 400);
    }
    
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const result = await c.env.DB.prepare(
      'INSERT INTO users (email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(email, hashHex, name, role, new Date().toISOString()).run();
    
    return c.json({ message: 'User created successfully', userId: result.meta.last_row_id });
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

app.get('/api/users', async (c) => {
  try {
    const users = await c.env.DB.prepare(
      'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC'
    ).all();
    
    return c.json({ users: users.results });
  } catch (error) {
    console.error('Get users error:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

app.post('/api/users', async (c) => {
  const { email, password, name, role } = await c.req.json();
  
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const result = await c.env.DB.prepare(
      'INSERT INTO users (email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(email, hashHex, name, role, new Date().toISOString()).run();
    
    return c.json({ message: 'User created', userId: result.meta.last_row_id });
  } catch (error) {
    console.error('Create user error:', error);
    return c.json({ error: 'Failed to create user' }, 500);
  }
});

app.delete('/api/users/:id', async (c) => {
  const id = c.req.param('id');
  
  try {
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    return c.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    return c.json({ error: 'Failed to delete user' }, 500);
  }
});

app.get('/api/dashboard/kpis', async (c) => {
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  
  try {
    let dateFilter = '';
    let dateFilterVR = '';
    if (startDate && endDate) {
      dateFilter = `WHERE timestamp >= '${startDate}' AND timestamp <= '${endDate}'`;
      dateFilterVR = `WHERE checkin_id IN (SELECT id FROM checkins WHERE timestamp >= '${startDate}' AND timestamp <= '${endDate}')`;
    } else if (startDate) {
      dateFilter = `WHERE timestamp >= '${startDate}'`;
      dateFilterVR = `WHERE checkin_id IN (SELECT id FROM checkins WHERE timestamp >= '${startDate}')`;
    } else if (endDate) {
      dateFilter = `WHERE timestamp <= '${endDate}'`;
      dateFilterVR = `WHERE checkin_id IN (SELECT id FROM checkins WHERE timestamp <= '${endDate}')`;
    }
    
    const kpis = await c.env.DB.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM checkins ${dateFilter}) as total_checkins,
        (SELECT COUNT(*) FROM checkins ${dateFilter ? dateFilter + " AND status = 'APPROVED'" : "WHERE status = 'APPROVED'"}) as approved_checkins,
        (SELECT COUNT(*) FROM checkins ${dateFilter ? dateFilter + " AND status = 'PENDING'" : "WHERE status = 'PENDING'"}) as pending_checkins,
        (SELECT COUNT(DISTINCT agent_id) FROM checkins ${dateFilter}) as active_agents,
        (SELECT COUNT(*) FROM shops) as total_shops,
        (SELECT COUNT(*) FROM visit_responses ${dateFilterVR ? dateFilterVR + ' AND converted = 1' : 'WHERE converted = 1'}) as conversions,
        (SELECT COUNT(*) FROM visit_responses ${dateFilterVR}) as total_visits
    `).first();
    
    return c.json({ kpis });
  } catch (error) {
    console.error('KPIs error:', error);
    return c.json({ error: 'Failed to fetch KPIs' }, 500);
  }
});

app.get('/api/dashboard/checkins-by-date', async (c) => {
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  
  try {
    let query = `
      SELECT date(timestamp) as date, COUNT(*) as count 
      FROM checkins 
    `;
    
    const params: string[] = [];
    if (startDate && endDate) {
      query += ' WHERE timestamp >= ? AND timestamp <= ?';
      params.push(startDate, endDate);
    }
    
    query += ' GROUP BY date(timestamp) ORDER BY date';
    
    const stmt = c.env.DB.prepare(query);
    const result = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();
    
    return c.json({ data: result.results });
  } catch (error) {
    console.error('Checkins by date error:', error);
    return c.json({ error: 'Failed to fetch data' }, 500);
  }
});

app.get('/api/dashboard/checkins-by-hour', async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      SELECT hour, SUM(count) as count 
      FROM checkins_by_hour 
      GROUP BY hour 
      ORDER BY hour
    `).all();
    
    return c.json({ data: result.results });
  } catch (error) {
    console.error('Checkins by hour error:', error);
    return c.json({ error: 'Failed to fetch data' }, 500);
  }
});

app.get('/api/dashboard/checkins-by-day', async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      SELECT day_name, day_num, SUM(count) as count 
      FROM checkins_by_day 
      GROUP BY day_name, day_num 
      ORDER BY day_num
    `).all();
    
    return c.json({ data: result.results });
  } catch (error) {
    console.error('Checkins by day error:', error);
    return c.json({ error: 'Failed to fetch data' }, 500);
  }
});

app.get('/api/dashboard/agent-performance', async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      SELECT agent_id, agent_name, checkin_count, conversions, conversion_rate
      FROM agent_performance
      ORDER BY checkin_count DESC
      LIMIT 20
    `).all();
    
    return c.json({ data: result.results });
  } catch (error) {
    console.error('Agent performance error:', error);
    return c.json({ error: 'Failed to fetch data' }, 500);
  }
});

app.get('/api/dashboard/conversion-stats', async (c) => {
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  
  try {
    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = `WHERE checkin_id IN (SELECT id FROM checkins WHERE timestamp >= '${startDate}' AND timestamp <= '${endDate}')`;
    } else if (startDate) {
      dateFilter = `WHERE checkin_id IN (SELECT id FROM checkins WHERE timestamp >= '${startDate}')`;
    } else if (endDate) {
      dateFilter = `WHERE checkin_id IN (SELECT id FROM checkins WHERE timestamp <= '${endDate}')`;
    }
    
    const result = await c.env.DB.prepare(`
      SELECT 
        SUM(CASE WHEN converted = 1 THEN 1 ELSE 0 END) as converted_yes,
        SUM(CASE WHEN converted = 0 THEN 1 ELSE 0 END) as converted_no,
        SUM(CASE WHEN already_betting = 1 THEN 1 ELSE 0 END) as betting_yes,
        SUM(CASE WHEN already_betting = 0 THEN 1 ELSE 0 END) as betting_no
      FROM visit_responses ${dateFilter}
    `).first();
    
    return c.json({ data: result });
  } catch (error) {
    console.error('Conversion stats error:', error);
    return c.json({ error: 'Failed to fetch data' }, 500);
  }
});

app.get('/api/shops', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '100');
  const offset = (page - 1) * limit;
  
  try {
    const shops = await c.env.DB.prepare(`
      SELECT * FROM shops 
      WHERE latitude != 0 AND longitude != 0
      ORDER BY id
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();
    
    const total = await c.env.DB.prepare('SELECT COUNT(*) as count FROM shops WHERE latitude != 0 AND longitude != 0').first();
    
    return c.json({ 
      shops: shops.results, 
      total: total?.count || 0,
      page,
      limit
    });
  } catch (error) {
    console.error('Get shops error:', error);
    return c.json({ error: 'Failed to fetch shops' }, 500);
  }
});

app.get('/api/checkins', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = (page - 1) * limit;
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const agentId = c.req.query('agentId');
  const status = c.req.query('status');
  
  try {
    let query = 'SELECT * FROM checkins WHERE 1=1';
    const params: (string | number)[] = [];
    
    if (startDate) {
      query += ' AND timestamp >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND timestamp <= ?';
      params.push(endDate);
    }
    if (agentId) {
      query += ' AND agent_id = ?';
      params.push(parseInt(agentId));
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const stmt = c.env.DB.prepare(query);
    const checkins = await stmt.bind(...params).all();
    
    let countQuery = 'SELECT COUNT(*) as count FROM checkins WHERE 1=1';
    const countParams: (string | number)[] = [];
    
    if (startDate) {
      countQuery += ' AND timestamp >= ?';
      countParams.push(startDate);
    }
    if (endDate) {
      countQuery += ' AND timestamp <= ?';
      countParams.push(endDate);
    }
    if (agentId) {
      countQuery += ' AND agent_id = ?';
      countParams.push(parseInt(agentId));
    }
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }
    
    const countStmt = c.env.DB.prepare(countQuery);
    const total = countParams.length > 0 ? await countStmt.bind(...countParams).first() : await countStmt.first();
    
    return c.json({ 
      checkins: checkins.results, 
      total: total?.count || 0,
      page,
      limit
    });
  } catch (error) {
    console.error('Get checkins error:', error);
    return c.json({ error: 'Failed to fetch checkins' }, 500);
  }
});

app.get('/api/checkins/:id', async (c) => {
  const id = c.req.param('id');
  
  try {
    const checkin = await c.env.DB.prepare(
      'SELECT * FROM checkins WHERE id = ?'
    ).bind(id).first();
    
    if (!checkin) {
      return c.json({ error: 'Checkin not found' }, 404);
    }
    
    const response = await c.env.DB.prepare(
      'SELECT * FROM visit_responses WHERE checkin_id = ?'
    ).bind(id).first();
    
    return c.json({ checkin, response });
  } catch (error) {
    console.error('Get checkin error:', error);
    return c.json({ error: 'Failed to fetch checkin' }, 500);
  }
});

app.get('/api/checkins-map', async (c) => {
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  
  try {
    let query = `
      SELECT id, agent_id, latitude, longitude, timestamp, status, photo_path
      FROM checkins 
      WHERE latitude != 0 AND longitude != 0
    `;
    const params: string[] = [];
    
    if (startDate) {
      query += ' AND timestamp >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND timestamp <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT 1000';
    
    const stmt = c.env.DB.prepare(query);
    const result = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();
    
    return c.json({ checkins: result.results });
  } catch (error) {
    console.error('Get checkins map error:', error);
    return c.json({ error: 'Failed to fetch checkins' }, 500);
  }
});

app.get('/api/agents', async (c) => {
  try {
    const agents = await c.env.DB.prepare(`
      SELECT DISTINCT agent_id, agent_name 
      FROM agent_performance 
      ORDER BY agent_name
    `).all();
    
    return c.json({ agents: agents.results });
  } catch (error) {
    console.error('Get agents error:', error);
    return c.json({ error: 'Failed to fetch agents' }, 500);
  }
});

app.get('/api/shops/:id', async (c) => {
  const id = c.req.param('id');
  
  try {
    const shop = await c.env.DB.prepare(
      'SELECT * FROM shops WHERE id = ?'
    ).bind(id).first();
    
    if (!shop) {
      return c.json({ error: 'Shop not found' }, 404);
    }
    
    const checkins = await c.env.DB.prepare(`
      SELECT c.*, vr.converted, vr.already_betting, vr.responses
      FROM checkins c
      LEFT JOIN visit_responses vr ON c.id = vr.checkin_id
      WHERE c.shop_id = ?
      ORDER BY c.timestamp DESC
      LIMIT 100
    `).bind(id).all();
    
    const stats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_checkins,
        SUM(CASE WHEN c.status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN vr.converted = 1 THEN 1 ELSE 0 END) as conversions
      FROM checkins c
      LEFT JOIN visit_responses vr ON c.id = vr.checkin_id
      WHERE c.shop_id = ?
    `).bind(id).first();
    
    return c.json({ shop, checkins: checkins.results, stats });
  } catch (error) {
    console.error('Get shop error:', error);
    return c.json({ error: 'Failed to fetch shop' }, 500);
  }
});

app.get('/api/shops-analytics', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  
  try {
    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = `AND c.timestamp >= '${startDate}' AND c.timestamp <= '${endDate}'`;
    } else if (startDate) {
      dateFilter = `AND c.timestamp >= '${startDate}'`;
    } else if (endDate) {
      dateFilter = `AND c.timestamp <= '${endDate}'`;
    }
    
    const shops = await c.env.DB.prepare(`
      SELECT 
        s.id, s.name, s.address, s.latitude, s.longitude,
        COUNT(c.id) as total_checkins,
        SUM(CASE WHEN c.status = 'APPROVED' THEN 1 ELSE 0 END) as approved_checkins,
        SUM(CASE WHEN vr.converted = 1 THEN 1 ELSE 0 END) as conversions,
        MAX(c.timestamp) as last_visit,
        MAX(c.id) as latest_checkin_id
      FROM shops s
      LEFT JOIN checkins c ON s.id = c.shop_id ${dateFilter}
      LEFT JOIN visit_responses vr ON c.id = vr.checkin_id
      GROUP BY s.id, s.name, s.address, s.latitude, s.longitude
      HAVING total_checkins > 0
      ORDER BY total_checkins DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();
    
    const total = await c.env.DB.prepare(`
      SELECT COUNT(DISTINCT s.id) as count 
      FROM shops s
      INNER JOIN checkins c ON s.id = c.shop_id ${dateFilter ? dateFilter.replace('AND', 'WHERE') : ''}
    `).first();
    
    return c.json({ 
      shops: shops.results, 
      total: total?.count || 0,
      page,
      limit
    });
  } catch (error) {
    console.error('Get shops analytics error:', error);
    return c.json({ error: 'Failed to fetch shops analytics' }, 500);
  }
});

app.get('/api/customers-analytics', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  
  try {
    let dateFilter = '';
    let dateFilterVR = '';
    if (startDate && endDate) {
      dateFilter = `AND c.timestamp >= '${startDate}' AND c.timestamp <= '${endDate}'`;
      dateFilterVR = `WHERE checkin_id IN (SELECT id FROM checkins WHERE timestamp >= '${startDate}' AND timestamp <= '${endDate}')`;
    } else if (startDate) {
      dateFilter = `AND c.timestamp >= '${startDate}'`;
      dateFilterVR = `WHERE checkin_id IN (SELECT id FROM checkins WHERE timestamp >= '${startDate}')`;
    } else if (endDate) {
      dateFilter = `AND c.timestamp <= '${endDate}'`;
      dateFilterVR = `WHERE checkin_id IN (SELECT id FROM checkins WHERE timestamp <= '${endDate}')`;
    }
    
    const customers = await c.env.DB.prepare(`
      SELECT 
        c.id as checkin_id,
        c.timestamp,
        c.latitude,
        c.longitude,
        c.agent_id,
        ap.agent_name,
        s.name as shop_name,
        s.id as shop_id,
        vr.responses,
        vr.converted,
        vr.already_betting
      FROM visit_responses vr
      INNER JOIN checkins c ON vr.checkin_id = c.id ${dateFilter}
      LEFT JOIN shops s ON c.shop_id = s.id
      LEFT JOIN agent_performance ap ON c.agent_id = ap.agent_id
      ORDER BY c.timestamp DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();
    
    const total = await c.env.DB.prepare(`SELECT COUNT(*) as count FROM visit_responses ${dateFilterVR}`).first();
    
    const stats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_customers,
        SUM(CASE WHEN converted = 1 THEN 1 ELSE 0 END) as converted,
        SUM(CASE WHEN already_betting = 1 THEN 1 ELSE 0 END) as already_betting
      FROM visit_responses ${dateFilterVR}
    `).first();
    
    return c.json({ 
      customers: customers.results, 
      total: total?.count || 0,
      stats,
      page,
      limit
    });
  } catch (error) {
    console.error('Get customers analytics error:', error);
    return c.json({ error: 'Failed to fetch customers analytics' }, 500);
  }
});

app.get('/api/customer/:checkinId', async (c) => {
  const checkinId = c.req.param('checkinId');
  
  try {
    const customer = await c.env.DB.prepare(`
      SELECT 
        vr.*,
        c.timestamp,
        c.id as checkin_id,
        c.latitude,
        c.longitude,
        c.agent_id,
        c.status,
        c.notes,
        ap.agent_name,
        s.name as shop_name,
        s.address as shop_address,
        s.id as shop_id
      FROM visit_responses vr
      INNER JOIN checkins c ON vr.checkin_id = c.id
      LEFT JOIN shops s ON c.shop_id = s.id
      LEFT JOIN agent_performance ap ON c.agent_id = ap.agent_id
      WHERE vr.checkin_id = ?
    `).bind(checkinId).first();
    
    if (!customer) {
      return c.json({ error: 'Customer record not found' }, 404);
    }
    
    return c.json({ customer });
  } catch (error) {
    console.error('Get customer error:', error);
    return c.json({ error: 'Failed to fetch customer' }, 500);
  }
});

// Serve photos from R2
app.get('/api/photos/:checkinId', async (c) => {
  const checkinId = c.req.param('checkinId');
  
  try {
    const key = `checkins/${checkinId}.jpg`;
    const object = await c.env.PHOTOS.get(key);
    
    if (!object) {
      return c.json({ error: 'Photo not found' }, 404);
    }
    
    const headers = new Headers();
    headers.set('Content-Type', 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000');
    
    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Get photo error:', error);
    return c.json({ error: 'Failed to fetch photo' }, 500);
  }
});

app.get('/api/export/checkins', async (c) => {
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const format = c.req.query('format') || 'json';
  
  try {
    let query = `
      SELECT c.*, vr.visit_type, vr.converted, vr.already_betting, vr.responses
      FROM checkins c
      LEFT JOIN visit_responses vr ON c.id = vr.checkin_id
      WHERE 1=1
    `;
    const params: string[] = [];
    
    if (startDate) {
      query += ' AND c.timestamp >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND c.timestamp <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY c.timestamp DESC';
    
    const stmt = c.env.DB.prepare(query);
    const result = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();
    
    if (format === 'csv') {
      const headers = ['id', 'agent_id', 'shop_id', 'timestamp', 'latitude', 'longitude', 'status', 'notes', 'visit_type', 'converted', 'already_betting'];
      const csvRows = [headers.join(',')];
      
      for (const row of result.results as Record<string, unknown>[]) {
        const values = headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const strVal = String(val);
          return strVal.includes(',') ? `"${strVal}"` : strVal;
        });
        csvRows.push(values.join(','));
      }
      
      return new Response(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="checkins_export.csv"'
        }
      });
    }
    
    return c.json({ data: result.results });
  } catch (error) {
    console.error('Export error:', error);
    return c.json({ error: 'Export failed' }, 500);
  }
});

async function generateJWT(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + 86400 };
  
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(fullPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${headerB64}.${payloadB64}`)
  );
  
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

export default app;
