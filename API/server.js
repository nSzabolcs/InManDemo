const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const port = 3000;

// CORS engedélyezés
app.use(cors());
app.use(express.json({ limit: '10mb' })); 

// MySQL kapcsolat beállítás
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'inmandemo',
  waitForConnections: true,
  connectionLimit: 10,
});

// SEGÉDFÜGGVÉNY a táblanév biztonságos kezelésére (alap validáció)
function isValidTableName(name) {
  return /^[a-zA-Z0-9_]+$/.test(name);
}

// SELECT ALL
app.get('/api/:table', async (req, res) => {
  const { table } = req.params;
  if (!isValidTableName(table)) return res.status(400).send('Invalid table name');

  try {
    const [rows] = await pool.query(`SELECT * FROM ??`, [table]);
    res.json(rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// SELECT BY ID
app.get('/api/:table/:id', async (req, res) => {
  const { table, id } = req.params;
  if (!isValidTableName(table)) return res.status(400).send('Invalid table name');

  try {
    const [rows] = await pool.query(`SELECT * FROM ?? WHERE id = ?`, [table, id]);
    if (rows.length === 0) return res.status(404).send('Not found');
    res.json(rows[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// INSERT
app.post('/api/:table', async (req, res) => {
  const { table } = req.params;
  const data = req.body;
  if (!isValidTableName(table)) return res.status(400).send('Invalid table name');

  try {
    const [result] = await pool.query(`INSERT INTO ?? SET ?`, [table, data]);
    res.json({ id: result.insertId });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// UPDATE
app.patch('/api/:table/:id', async (req, res) => {
  const { table, id } = req.params;
  const data = req.body;
  if (!isValidTableName(table)) return res.status(400).send('Invalid table name');

  try {
    const [result] = await pool.query(`UPDATE ?? SET ? WHERE id = ?`, [table, data, id]);
    res.json({ affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// DELETE
app.delete('/api/:table/:id', async (req, res) => {
  const { table, id } = req.params;
  if (!isValidTableName(table)) return res.status(400).send('Invalid table name');

  try {
    const [result] = await pool.query(`DELETE FROM ?? WHERE id = ?`, [table, id]);
    res.json({ affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.listen(port, () => {
  console.log(`API szerver fut: http://localhost:${port}`);
});
