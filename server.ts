import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('knowledge.db');

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    l1 TEXT NOT NULL,
    l2 TEXT NOT NULL,
    definition TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS relations (
    source TEXT NOT NULL,
    relation TEXT NOT NULL,
    target TEXT NOT NULL,
    description TEXT,
    PRIMARY KEY (source, relation, target),
    FOREIGN KEY (source) REFERENCES nodes (id) ON DELETE CASCADE,
    FOREIGN KEY (target) REFERENCES nodes (id) ON DELETE CASCADE
  );
`);

// Simple function to seed initial data if empty
async function seedInitialData() {
  const nodeCount = db.prepare('SELECT count(*) as count FROM nodes').get() as { count: number };
  if (nodeCount.count === 0) {
    console.log('Seeding initial data from knowledgeMap.ts...');
    // We import dynamically to avoid issues if the file is being edited
    const { NODES, RELATIONS } = await import('./src/data/knowledgeMap.ts');
    
    const insertNode = db.prepare('INSERT INTO nodes (id, name, type, l1, l2, definition) VALUES (?, ?, ?, ?, ?, ?)');
    const insertNodeTransaction = db.transaction((nodes) => {
      for (const node of nodes) {
        insertNode.run(node.id, node.name, node.type, node.l1, node.l2, node.definition);
      }
    });

    const insertRelation = db.prepare('INSERT INTO relations (source, relation, target, description) VALUES (?, ?, ?, ?)');
    const insertRelationTransaction = db.transaction((relations) => {
      for (const rel of relations) {
        insertRelation.run(rel.source, rel.relation, rel.target, rel.description || '');
      }
    });

    insertNodeTransaction(NODES);
    insertRelationTransaction(RELATIONS);
    console.log('Seed completed.');
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  await seedInitialData();

  // API Endpoints
  app.get('/api/nodes', (req, res) => {
    const nodes = db.prepare('SELECT * FROM nodes').all();
    res.json(nodes);
  });

  app.post('/api/nodes', (req, res) => {
    const { id, name, type, l1, l2, definition } = req.body;
    try {
      db.prepare('INSERT INTO nodes (id, name, type, l1, l2, definition) VALUES (?, ?, ?, ?, ?, ?)').run(id, name, type, l1, l2, definition);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.put('/api/nodes/:id', (req, res) => {
    const { id } = req.params;
    const { name, type, l1, l2, definition } = req.body;
    try {
      db.prepare('UPDATE nodes SET name = ?, type = ?, l1 = ?, l2 = ?, definition = ? WHERE id = ?').run(name, type, l1, l2, definition, id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/nodes/delete', (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing node ID' });
    
    try {
      console.log('--- NODE DELETE ATTEMPT ---', id);
      db.transaction(() => {
        // Delete the node
        const nodeResult = db.prepare('DELETE FROM nodes WHERE id = ?').run(id);
        // Delete all associated relations
        const relResult = db.prepare('DELETE FROM relations WHERE source = ? OR target = ?').run(id, id);
        console.log('Deleted node:', nodeResult.changes, 'Deleted relations:', relResult.changes);
      })();
      res.json({ success: true });
    } catch (err) {
      console.error('Node delete transaction failed:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.delete('/api/nodes/:id', (req, res) => {
    res.status(405).json({ error: 'Please use POST /api/nodes/delete' });
  });

  app.get('/api/relations', (req, res) => {
    const relations = db.prepare('SELECT * FROM relations').all();
    res.json(relations);
  });

  app.post('/api/relations', (req, res) => {
    const { source, relation, target, description } = req.body;
    try {
      db.prepare('INSERT INTO relations (source, relation, target, description) VALUES (?, ?, ?, ?)').run(source, relation, target, description || '');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/relations/delete', (req, res) => {
    try {
      const { source, relation, target } = req.body;

      console.log('--- DETAILED DELETE LOG ---');
      console.log('Requested:', { source, relation, target });

      if (!source || !relation || !target) {
        return res.status(400).json({ error: 'Missing parameters' });
      }

      // Exact match
      let stmt = db.prepare('DELETE FROM relations WHERE source = ? AND relation = ? AND target = ?');
      let result = stmt.run(source, relation, target);
      
      if (result.changes === 0) {
        console.warn('Exact match failed. Checking reversed direction...');
        // Try to see if it exists but reversed (for horizontal relations)
        const reversed = db.prepare('SELECT * FROM relations WHERE source = ? AND relation = ? AND target = ?').get(target, relation, source);
        if (reversed) {
           console.log('Found reversed relation! Deleting that instead.');
           stmt = db.prepare('DELETE FROM relations WHERE source = ? AND relation = ? AND target = ?');
           result = stmt.run(target, relation, source);
        }
      }

      console.log('Final Delete Result:', result);
      
      res.json({ 
        success: result.changes > 0, 
        changes: result.changes,
        debug: { source, relation, target }
      });
    } catch (err) {
      console.error('SERVER DELETE EXCEPTION:', err);
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Keep the old one for breadcrumbs/compatibility but point to same logic if needed
  app.delete('/api/relations', (req, res) => {
    res.status(405).json({ error: 'Please use POST /api/relations/delete' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
