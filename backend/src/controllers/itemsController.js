const pool = require('../config/database');
const ApiError = require('../utils/ApiError');

/**
 * GET /api/v1/items — list all items
 */
async function getAllItems(req, res) {
  const result = await pool.query(
    `SELECT id, title, description, status, created_at
     FROM items
     ORDER BY created_at DESC`
  );

  res.json({ success: true, data: result.rows });
}

/**
 * POST /api/v1/items — create item
 * Body: { title, description?, status? }
 */
async function createItem(req, res) {
  const { title, description, status } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    throw new ApiError(400, 'Title is required');
  }

  const normalizedStatus = (status && String(status).trim()) || 'active';

  const result = await pool.query(
    `INSERT INTO items (title, description, status)
     VALUES ($1, $2, $3)
     RETURNING id, title, description, status, created_at`,
    [title.trim(), description?.trim() || null, normalizedStatus]
  );

  res.status(201).json({ success: true, data: result.rows[0] });
}

/**
 * DELETE /api/v1/items/:id — remove item by id
 */
async function deleteItem(req, res) {
  const id = parseInt(req.params.id, 10);

  if (Number.isNaN(id)) {
    throw new ApiError(400, 'Invalid item id');
  }

  const result = await pool.query(
    'DELETE FROM items WHERE id = $1 RETURNING id',
    [id]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, 'Item not found');
  }

  res.json({ success: true, data: { id: result.rows[0].id } });
}

module.exports = {
  getAllItems,
  createItem,
  deleteItem,
};
