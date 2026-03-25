import express from 'express';
const router = express.Router();
import db from '../db/connector.js';

router.get('/', async function(req, res, next) {
  try {
    const cars = await db.query('SELECT * FROM cars ORDER BY id ASC');
    const rowCars = cars.rows.map(s => {
      return {
        ...s,
        created_at_time: s.created_at.toLocaleTimeString(), 
        created_at_date: s.created_at.toLocaleDateString()
      }
    });

    res.render('cars', { cars: rowCars || [] });
  } catch (error) {
    console.error('Помилка при завантаженні машин:', error);
    res.status(500).send('Помилка сервера при завантаженні даних');
  }
});


router.post('/', async (req, res) => {
  const { car_brand, car_model, engine_type, horsepower, weight, acceleration_0_to_100, price } = req.body; 

  try {
    await db.query(
      `INSERT INTO cars 
      (car_brand, car_model, engine_type, horsepower, weight, acceleration_0_to_100, price) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [car_brand, car_model, engine_type, horsepower, weight, acceleration_0_to_100, price]
    );
    
    res.redirect('/cars'); 
  } catch (error) {
    console.error('Помилка при створенні машини:', error);
    res.status(500).send('Помилка при збереженні в базу даних');
  }
});


router.get('/edit/:id', async (req, res) => {
  const carId = req.params.id;
  try {
    const carResult = await db.query('SELECT * FROM cars WHERE id = $1', [carId]);
    if (carResult.rows.length === 0) {
      return res.status(404).send('Машину не знайдено');
    }

    const allCars = await db.query('SELECT * FROM cars ORDER BY id ASC');
    const rowCars = allCars.rows.map(s => {
      return {
        ...s,
        created_at_time: s.created_at.toLocaleTimeString(), 
        created_at_date: s.created_at.toLocaleDateString()
      }
    });

    res.render('cars', { 
      cars: rowCars || [], 
      editingCar: carResult.rows[0] 
    });
  } catch (error) {
    console.error('Помилка при завантаженні машини для редагування:', error);
    res.status(500).send('Помилка сервера');
  }
});

router.post('/edit/:id', async (req, res) => {
  const carId = req.params.id;
  const { car_brand, car_model, engine_type, horsepower, weight, acceleration_0_to_100, price } = req.body; 

  try {
    await db.query(
      `UPDATE cars SET 
        car_brand = $1, 
        car_model = $2, 
        engine_type = $3, 
        horsepower = $4, 
        weight = $5, 
        acceleration_0_to_100 = $6, 
        price = $7 
      WHERE id = $8`,
      [car_brand, car_model, engine_type, horsepower, weight, acceleration_0_to_100, price, carId]
    );
    
    
    res.redirect('/cars');
  } catch (error) {
    console.error('Помилка при оновленні:', error);
    res.status(500).send('Помилка сервера при оновленні');
  }
});

router.delete('/:id', async (req, res) => {
  const carId = req.params.id;

  try {
    await db.query('DELETE FROM cars WHERE id = $1', [carId]);
    res.status(200).json({ message: 'Машину успішно видалено!' });
  } catch (error) {
    console.error('Помилка при видаленні:', error);
    res.status(500).json({ error: 'Помилка сервера при видаленні' });
  }
});

export default router;
