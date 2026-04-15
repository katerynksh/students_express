import express from 'express';
import db from '../db/connector.js';
import { getNames } from 'country-list';
import bcrypt from 'bcrypt';
import session from 'express-session';

const router = express.Router();

router.use(
  session({
    secret: 'street-food-secret',
    resave: false,
    saveUninitialized: false
  })
);
const SALT_ROUNDS = 10;

const countries = getNames().sort((a, b) => a.localeCompare(b));

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/street_food/index');
  }

  next();
}

function normalizeCountry(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidCountry(country) {
  const normalized = normalizeCountry(country);
  return countries.some((item) => item.toLowerCase() === normalized);
}

function validateStreetFoodForm(formData) {
  const fieldErrors = {};

  const foodName = String(formData.food_name || '').trim();
  const country = String(formData.country || '').trim();

  const spicyLevel =
    formData.spicy_level === '' || formData.spicy_level === undefined
      ? null
      : Number(formData.spicy_level);

  const price =
    formData.price === '' || formData.price === undefined
      ? null
      : Number(formData.price);

  const rating =
    formData.rating === '' || formData.rating === undefined
      ? null
      : Number(formData.rating);

  const imageUrl = String(formData.image_url || '').trim() || null;

  if (!foodName) {
    fieldErrors.food_name = 'Назва страви є обов’язковою';
  }

  if (!country) {
    fieldErrors.country = 'Країна є обов’язковою';
  } else if (!isValidCountry(country)) {
    fieldErrors.country = 'Оберіть країну зі списку';
  }

  if (
    spicyLevel !== null &&
    (!Number.isInteger(spicyLevel) || spicyLevel < 0 || spicyLevel > 10)
  ) {
    fieldErrors.spicy_level = 'Рівень гостроти повинен бути від 0 до 10';
  }

  if (price !== null && (Number.isNaN(price) || price < 0.01)) {
    fieldErrors.price = 'Ціна повинна бути не меншою за 0.01';
  }

  if (
    rating !== null &&
    (!Number.isInteger(rating) || rating < 1 || rating > 10)
  ) {
    fieldErrors.rating = 'Рейтинг повинен бути від 1 до 10';
  }

  return {
    fieldErrors,
    sanitizedData: {
      food_name: foodName,
      country,
      spicy_level: spicyLevel,
      price,
      rating,
      image_url: imageUrl
    }
  };
}

function validateRegisterForm(formData) {
  const fieldErrors = {};

  const username = String(formData.username || '').trim();
  const email = String(formData.email || '').trim().toLowerCase();
  const password = String(formData.password || '');
  const confirmPassword = String(formData.confirm_password || '');

  if (!username || username.length < 3) {
    fieldErrors.username = 'Username повинен містити мінімум 3 символи';
  }

  if (!email) {
    fieldErrors.email = 'Email є обов’язковим';
  } else {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      fieldErrors.email = 'Введіть коректний email';
    }
  }

  const passwordPattern =
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-\\/\[\]+=`~;']).{8,}$/;

  if (!password) {
    fieldErrors.password = 'Пароль є обов’язковим';
  } else if (!passwordPattern.test(password)) {
    fieldErrors.password =
      'Пароль: 8+ символів, велика літера, мала літера, цифра і спецсимвол';
  }

  if (password !== confirmPassword) {
    fieldErrors.confirm_password = 'Паролі не співпадають';
  }

  return {
    fieldErrors,
    sanitizedData: {
      username,
      email,
      password
    }
  };
}

function validateLoginForm(formData) {
  const fieldErrors = {};

  const login = String(formData.login || '').trim();
  const password = String(formData.password || '');

  if (!login) {
    fieldErrors.login = 'Введіть username або email';
  }

  if (!password) {
    fieldErrors.password = 'Введіть пароль';
  }

  return {
    fieldErrors,
    sanitizedData: {
      login,
      password
    }
  };
}

function buildFormView({
  title,
  pageTitle,
  action,
  buttonText,
  item = {},
  fieldErrors = {}
}) {
  return {
    title,
    isForm: true,
    pageTitle,
    action,
    buttonText,
    item,
    countries: JSON.stringify(countries),
    fieldErrors
  };
}

function formatFoodData(rows) {
  return (rows || []).map((item) => {
    const date = new Date(item.created_at);

    const formattedDate = new Intl.DateTimeFormat('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);

    const formattedPrice =
      item.price !== null && item.price !== undefined
        ? `$${Number(item.price).toFixed(2)}`
        : '—';

    return {
      ...item,
      formatted_created_at: formattedDate,
      formatted_price: formattedPrice
    };
  });
}

// ... (верх файлу НЕ міняємо)

router.get('/index', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM street_food ORDER BY id ASC');

    res.render('forms/street_food/street_food_index', {
      title: 'Street Food Preview',
      food: formatFoodData(result.rows),
      user: req.session?.user || null
    });
  } catch (err) {
    next(err);
  }
});

// LOGIN
router.get('/login', (req, res) => {
  if (req.session?.user) {
    return res.redirect('/street_food');
  }

  res.render('forms/street_food/street_food_login', {
    title: 'Street Food Login',
    item: {},
    fieldErrors: {}
  });
});

router.post('/login', async (req, res, next) => {
  try {
    const { fieldErrors, sanitizedData } = validateLoginForm(req.body);

    if (Object.keys(fieldErrors).length > 0) {
      return res.status(400).render('forms/street_food/street_food_login', {
        title: 'Street Food Login',
        item: req.body,
        fieldErrors
      });
    }

    const result = await db.query(
      `SELECT * FROM street_food_users WHERE username = $1 OR email = $1 LIMIT 1`,
      [sanitizedData.login]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(400).render('forms/street_food/street_food_login', {
        title: 'Street Food Login',
        item: req.body,
        fieldErrors: { login: 'Користувача не знайдено' }
      });
    }

    const isPasswordValid = await bcrypt.compare(
      sanitizedData.password,
      user.password_hash
    );

    if (!isPasswordValid) {
      return res.status(400).render('forms/street_food/street_food_login', {
        title: 'Street Food Login',
        item: req.body,
        fieldErrors: { password: 'Невірний пароль' }
      });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    res.redirect('/street_food');
  } catch (err) {
    next(err);
  }
});

// REGISTER
router.get('/register', (req, res) => {
  if (req.session?.user) {
    return res.redirect('/street_food');
  }

  res.render('forms/street_food/street_food_register', {
    title: 'Street Food Register',
    item: {},
    fieldErrors: {}
  });
});

router.post('/register', async (req, res, next) => {
  try {
    const { fieldErrors, sanitizedData } = validateRegisterForm(req.body);

    if (Object.keys(fieldErrors).length > 0) {
      return res.status(400).render('forms/street_food/street_food_register', {
        title: 'Street Food Register',
        item: req.body,
        fieldErrors
      });
    }

    const existingUser = await db.query(
      `SELECT id FROM street_food_users WHERE username = $1 OR email = $2 LIMIT 1`,
      [sanitizedData.username, sanitizedData.email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).render('forms/street_food/street_food_register', {
        title: 'Street Food Register',
        item: req.body,
        fieldErrors: {
          username: 'Username або email вже зайнятий'
        }
      });
    }

    const passwordHash = await bcrypt.hash(
      sanitizedData.password,
      SALT_ROUNDS
    );

    const createdUser = await db.query(
      `INSERT INTO street_food_users (username, email, password_hash)
   VALUES ($1, $2, $3)
   RETURNING id, username, email, role`,
      [sanitizedData.username, sanitizedData.email, passwordHash]
    );

    req.session.user = {
      id: createdUser.rows[0].id,
      username: createdUser.rows[0].username,
      email: createdUser.rows[0].email,
      role: createdUser.rows[0].role
    };

    res.redirect('/street_food');
  } catch (err) {
    next(err);
  }
});

// LOGOUT
router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.redirect('/street_food/index');
  });
});

// PRIVATE LIST
router.get('/', requireAuth, async (req, res, next) => {
  try {
    let result;

    if (req.session.user?.role === 'admin') {
      result = await db.query(
        `SELECT * FROM street_food ORDER BY id ASC`
      );
    } else {
      result = await db.query(
        `SELECT * FROM street_food WHERE user_id = $1 ORDER BY id ASC`,
        [req.session.user.id]
      );
    }

    res.render('forms/street_food/street_food', {
      title: 'Street Food',
      isForm: false,
      food: formatFoodData(result.rows),
      user: req.session.user
    });
  } catch (err) {
    next(err);
  }
});

// NEW
router.get('/new', requireAuth, (req, res) => {
  res.render(
    'forms/street_food/street_food',
    buildFormView({
      title: 'Add food',
      pageTitle: 'Add new food',
      action: '/street_food/create',
      buttonText: 'Create food'
    })
  );
});

// CREATE
router.post('/create', requireAuth, async (req, res, next) => {
  try {
    const { fieldErrors, sanitizedData } = validateStreetFoodForm(req.body);

    if (Object.keys(fieldErrors).length > 0) {
      return res.status(400).render(
        'forms/street_food/street_food',
        buildFormView({
          title: 'Add food',
          pageTitle: 'Add new food',
          action: '/street_food/create',
          buttonText: 'Create food',
          item: req.body,
          fieldErrors
        })
      );
    }

    const { food_name, country, spicy_level, price, rating, image_url } =
      sanitizedData;

    await db.query(
      `INSERT INTO street_food 
      (food_name, country, spicy_level, price, rating, image_url, user_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        food_name,
        country,
        spicy_level,
        price,
        rating,
        image_url,
        req.session.user.id
      ]
    );

    res.redirect('/street_food');
  } catch (err) {
    next(err);
  }
});

// EDIT
router.get('/edit/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT * FROM street_food
       WHERE id = $1 AND (user_id = $2 OR $3 = 'admin')`,
      [
        req.params.id,
        req.session.user.id,
        req.session.user.role
      ]
    );

    const item = result.rows[0];

    if (!item) {
      return res.redirect('/street_food');
    }

    res.render(
      'forms/street_food/street_food',
      buildFormView({
        title: 'Edit food',
        pageTitle: 'Edit food',
        action: `/street_food/update/${item.id}`,
        buttonText: 'Save changes',
        item
      })
    );
  } catch (err) {
    next(err);
  }
});

// UPDATE
router.post('/update/:id', requireAuth, async (req, res, next) => {
  try {
    const { fieldErrors, sanitizedData } = validateStreetFoodForm(req.body);

    if (Object.keys(fieldErrors).length > 0) {
      return res.status(400).render(
        'forms/street_food/street_food',
        buildFormView({
          title: 'Edit food',
          pageTitle: 'Edit food',
          action: `/street_food/update/${req.params.id}`,
          buttonText: 'Save changes',
          item: { id: req.params.id, ...req.body },
          fieldErrors
        })
      );
    }

    const { food_name, country, spicy_level, price, rating, image_url } =
      sanitizedData;

    await db.query(
      `UPDATE street_food
       SET food_name=$1, country=$2, spicy_level=$3,
           price=$4, rating=$5, image_url=$6
       WHERE id=$7 AND (user_id=$8 OR $9='admin')`,
      [
        food_name,
        country,
        spicy_level,
        price,
        rating,
        image_url,
        req.params.id,
        req.session.user.id,
        req.session.user.role
      ]
    );

    res.redirect('/street_food');
  } catch (err) {
    next(err);
  }
});

// DELETE
router.post('/delete/:id', requireAuth, async (req, res, next) => {
  try {
    await db.query(
      `DELETE FROM street_food
       WHERE id=$1 AND (user_id=$2 OR $3='admin')`,
      [
        req.params.id,
        req.session.user.id,
        req.session.user.role
      ]
    );

    res.redirect('/street_food');
  } catch (err) {
    next(err);
  }
});
export default router;