import express from 'express';
import db from '../db/connector.js';


import { CarService, CarValidator } from '../controllers/carController.js'; 
(async () => {
  try {
    await db.query('ALTER TABLE cars ADD COLUMN IF NOT EXISTS image_url TEXT;');
    console.log("Колонку image_url успішно перевірено/додано в БД!");
  } catch (err) {
    console.error("Помилка бази даних при додаванні колонки:", err.message);
  }
})();
const router = express.Router();


router.get('/', async function(req, res, next) {
  console.log("Зайшли на головну сторінку!"); 
  try {
    
    const cars = await db.query('SELECT * FROM cars ORDER BY id ASC');
    const rowCars = cars.rows.map(s => {
      return {
        ...s,
        created_at_time: s.created_at.toLocaleTimeString(), 
        created_at_date: s.created_at.toLocaleDateString()
      }
    });

    res.render('cars', { 
        cars: rowCars || [], 
        showList: true,   
        showForm: false 
    });
  } catch (error) {
    console.error('Помилка при завантаженні машин:', error);
    res.status(500).send('Помилка сервера при завантаженні даних');
  }
});


router.get('/new', (req, res) => {
  console.log("Зайшли на сторінку створення!");
  res.render('cars', { 
      showList: false,  
      showForm: true,   
      editingCar: null 
  });
});


router.post('/', async (req, res) => {
  try {
    new CarValidator(req.body).validate();
const newCar = await new CarService(req.body).create();
    res.redirect('/cars');
  } catch (error) {
    console.error('Помилка при створенні машини:', error.message);

    res.status(400).send(`Помилка: ${error.message} <br><br><a href="/cars/new">Повернутися назад</a>`);
  }
});


router.get('/edit/:id', async (req, res) => {
  const carId = req.params.id;
  try {
    const carResult = await db.query('SELECT * FROM cars WHERE id = $1', [carId]);
    if (carResult.rows.length === 0) {
      return res.status(404).send('Машину не знайдено');
    }

    res.render('cars', { 
      showList: false,  
      showForm: true,   
      editingCar: carResult.rows[0] 
    });
  } catch (error) {
    console.error('Помилка при завантаженні машини для редагування:', error);
    res.status(500).send('Помилка сервера');
  }
});


router.post('/edit/:id', async (req, res) => {
  const carId = req.params.id;

  try {
    
new CarValidator(req.body).validate();
await new CarService(req.body).update(carId);

    res.redirect('/'); 
  } catch (error) {
    console.error('Помилка при оновленні:', error.message);
    res.status(400).send(`Помилка: ${error.message} <br><br><a href="/cars/edit/${carId}">Повернутися назад</a>`);
  }
});


router.delete('/:id', async (req, res) => {
  const carId = req.params.id;
  try {
    await CarService.delete(req.params.id);
    res.status(200).json({ message: 'Машину успішно видалено!' });
  } catch (error) {
    console.error('Помилка при видаленні:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/setup-db', async (req, res) => {
  try {
    
    await db.query('ALTER TABLE cars ADD COLUMN IF NOT EXISTS image_url TEXT;');
    res.send('Колонку image_url успішно перевірено/додано! Тепер цей маршрут можна видалити з коду.');
  } catch (error) {
    console.error('Помилка оновлення БД:', error);
    res.status(500).send(`Помилка: ${error.message}`);
  }
});
export default router;
