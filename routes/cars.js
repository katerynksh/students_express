import express from 'express';
const router = express.Router();
import db from '../db/connector.js';

router.get('/', async function(req, res, next) {
  const cars = await db.query('SELECT * FROM cars ORDER BY id ASC');
  const rowCars = cars.rows.map(s => {
    return {
      ...s,
      created_at_time: s.created_at.toLocaleTimeString(), 
      created_at_date: s.created_at.toLocaleDateString()
    }
  })

  res.render('cars', { cars: rowCars || [] });
});

export default router;