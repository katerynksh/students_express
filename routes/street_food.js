import express from 'express';
import db from '../db/connector.js';
import { getNames } from 'country-list';

const router = express.Router();

const countries = getNames().sort((a, b) => a.localeCompare(b));

function normalizeCountry(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidCountry(country) {
  const normalized = normalizeCountry(country);
  return countries.some(item => item.toLowerCase() === normalized);
}

router.get('/', async function (req, res, next) {
  try {
    const food = await db.query('SELECT * FROM street_food ORDER BY id ASC');

    res.render('street_food', {
      title: 'Street Food',
      mode: 'list',
      food: food.rows || []
    });
  } catch (err) {
    next(err);
  }
});

router.get('/new', function (req, res) {
  res.render('street_food', {
    title: 'Add food',
    mode: 'form',
    pageTitle: 'Add new food',
    action: '/street_food/create',
    buttonText: 'Create food',
    item: {},
    countries: JSON.stringify(countries)
  });
});

router.post('/create', async function (req, res, next) {
  try {
    const { food_name, country, spicy_level, price, rating } = req.body;

    if (!isValidCountry(country)) {
      return res.status(400).render('street_food', {
        title: 'Add food',
        mode: 'form',
        pageTitle: 'Add new food',
        action: '/street_food/create',
        buttonText: 'Create food',
        item: req.body,
        countries: JSON.stringify(countries),
        formError: 'Please choose a valid country from the list.'
      });
    }

    await db.query(
      `
      INSERT INTO street_food (food_name, country, spicy_level, price, rating)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        food_name,
        country.trim(),
        spicy_level === '' ? null : spicy_level,
        price === '' ? null : price,
        rating === '' ? null : rating
      ]
    );

    res.redirect('/street_food');
  } catch (err) {
    next(err);
  }
});

router.get('/edit/:id', async function (req, res, next) {
  try {
    const result = await db.query(
      'SELECT * FROM street_food WHERE id = $1',
      [req.params.id]
    );

    const item = result.rows[0];

    if (!item) {
      return res.status(404).render('error', {
        message: 'Food not found',
        error: {}
      });
    }

    res.render('street_food', {
      title: 'Edit food',
      mode: 'form',
      pageTitle: 'Edit food',
      action: `/street_food/update/${item.id}`,
      buttonText: 'Save changes',
      item,
      countries: JSON.stringify(countries)
    });
  } catch (err) {
    next(err);
  }
});

router.post('/update/:id', async function (req, res, next) {
  try {
    const { food_name, country, spicy_level, price, rating } = req.body;

    if (!isValidCountry(country)) {
      return res.status(400).render('street_food', {
        title: 'Edit food',
        mode: 'form',
        pageTitle: 'Edit food',
        action: `/street_food/update/${req.params.id}`,
        buttonText: 'Save changes',
        item: {
          id: req.params.id,
          ...req.body
        },
        countries: JSON.stringify(countries),
        formError: 'Please choose a valid country from the list.'
      });
    }

    await db.query(
      `
      UPDATE street_food
      SET food_name = $1,
          country = $2,
          spicy_level = $3,
          price = $4,
          rating = $5
      WHERE id = $6
      `,
      [
        food_name,
        country.trim(),
        spicy_level === '' ? null : spicy_level,
        price === '' ? null : price,
        rating === '' ? null : rating,
        req.params.id
      ]
    );

    res.redirect('/street_food');
  } catch (err) {
    next(err);
  }
});

router.post('/delete/:id', async function (req, res, next) {
  try {
    await db.query(
      'DELETE FROM street_food WHERE id = $1',
      [req.params.id]
    );

    res.redirect('/street_food');
  } catch (err) {
    next(err);
  }
});

export default router;