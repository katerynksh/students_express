import express from 'express';
const router = express.Router();
import db from '../db/connector.js';
import { registerSlonik, deleteSlonik, updateSlonik, checkPassword, checkAge, checkUsername, checkPlaceOfBirth } from '../controllers/slonikiController.js';

router.get('/', async function(req, res, next) {
  const sloniki = await db.query('SELECT * FROM sloniki');
  const rowSloniki = sloniki.rows.map(s => {
    return {
      ...s,
      created_at_time: s.created_at.toLocaleTimeString(), 
      created_at_date: s.created_at.toLocaleDateString()
    }
  })
  res.render('sloniki', { sloniki: rowSloniki || [] });
});

router.get('/create', async function(req, res, next) {
  res.render('forms/sloniki/sloniki_form');
})

router.post('/create', async function(req, res, next) {
const { username, password, age, place_of_birth } = req.body;

  try {

    const { username, password, age, place_of_birth } = req.body;

    checkUsername(username);
    checkAge(age);
    checkPassword(password);
    checkPlaceOfBirth(place_of_birth);
    
    await registerSlonik(username, password, age, place_of_birth);
    
    res.redirect('/sloniki');
  } catch (err) {
    const errorMessage = err.message
    // res.status(500).send(`!! Error registering slonik: this slonik: @${username} is already exist`);
    res.render('forms/sloniki/sloniki_form', {
      errorUsername: errorMessage.includes("username") ? errorMessage : null,
      errorAge: errorMessage.includes("age") ? errorMessage : null,
      errorPassword: (errorMessage.
        includes("Password") || errorMessage.
        includes("password")) ? errorMessage : null,
      errorPlaceOfBirth: errorMessage.includes("place") ? errorMessage : null,
      username, age, place_of_birth
    })
  }
})

router.get('/delete', async function(req, res, next) {
  res.render('forms/sloniki/deleteSloniki');
})

router.post('/delete', async function(req, res, next) {
const { username, password} = req.body;

try {
    await deleteSlonik(username, password);
    res.redirect('/sloniki');
  } catch (err) {
    if (err.message === 'Invalid password') {
      res.status(403).send('Invalid password');
    } else {
      res.status(500).send(`!! Error deleting slonik: @${username}`);
    }
  }
});



router.get('/update', (req, res) => {
  res.render('forms/sloniki/updateSloniki'); 
});

router.post('/update', async (req, res) => {
  const { currentUsername, password, newUsername, newAge, new_place_of_birth } = req.body;
  const updateData = {
    username: newUsername,
    age: newAge,
    place_of_birth: new_place_of_birth
  };

  try {
    await updateSlonik(currentUsername, password, updateData);
    res.redirect('/sloniki');
  } catch (err) {
    if (err.message === 'Invalid password') {
      res.status(403).send('Error: invalid password');
    } else {
      res.status(500).send('Error updating');
    }
  }
});


export default router;