import express from 'express';
const router = express.Router();
import db from '../db/connector.js';

router.get('/', async function(req, res, next) {
  const weapon = await db.query('SELECT * FROM deadSpace');

  const modWeapons = weapon.rows.map(w => {
    return {
      ...w,
      created_at: w.created_at.toLocaleDateString()
    }
  })
  res.render('dead_space', { weapons: modWeapons || [] });
});

// Add
// -------------------------------------------------------------
router.get('/createGun', async function(req, res, next) {
  res.render('forms/dead_space_form');
})

router.post('/createGun', async function(req, res, next) {
  console.log("Submitted data: ", req.body);

const { name_of_gun, damage_type, damage_dealth, reload_seconds, additional_info } = req.body;

  async function addGun(name_of_gun, damage_type, damage_dealth, reload_seconds, additional_info) {
   try {
      const query = `
      INSERT INTO deadSpace (
            name_of_gun, damage_type, damage_dealth, reload_seconds, additional_info
        )
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *`;
   const res = await db.query(query, [name_of_gun, damage_type, damage_dealth, reload_seconds, additional_info]);

   } catch (err) 
      { console.error(err)
        throw err;
   }
}

try {
    await addGun(name_of_gun, damage_type, damage_dealth, reload_seconds, additional_info);
    
    res.redirect('/weapons');
  } catch (err) {
    res.status(500).send("Помилка при додаванні зброї. Схоже що ви вказали щось неправильно.");
  }
});
// -------------------------------------------------------------

// Edit
// -------------------------------------------------------------
router.get('/edit/:id', async function (req, res, next) {
  try {
    const result = await db.query(
      'SELECT * FROM deadSpace WHERE id = $1',
      [req.params.id]
    );

    const item = result.rows[0];

    if (!item) {
      return res.status(404).render('error', {
        message: 'Gun not found',
        error: {}
      });
    }

    res.render('dead_space', {
      title: 'Edit weapons',
      mode: 'form',
      pageTitle: 'Edit weapons',
      action: `/weapons/edit/${item.id}`,
      buttonText: 'Save changes',
      item
    });
  } catch (err) {
    next(err);
  }
});

router.post('/edit/:id', async function (req, res, next) {
  try {
    const { name_of_gun, damage_type, damage_dealth, reload_seconds, additional_info } = req.body;

    await db.query(
      `
      UPDATE deadSpace
      SET 
          name_of_gun = $1,
          damage_type = $2,
          damage_dealth = $3,
          reload_seconds = $4,
          additional_info = $5
      WHERE id = $6
      `,
       [
        name_of_gun,
        damage_type,
        damage_dealth === '' ? null : damage_dealth,
        reload_seconds === '' ? null : reload_seconds,
        additional_info === '' ? null : additional_info,
        req.params.id
      ]
    );
      } catch (err) {
    next(err);
  }
    res.redirect('/weapons');
});
// -------------------------------------------------------------

// Delete
// -------------------------------------------------------------
router.get("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM deadSpace WHERE id = $1", [id]);
    res.redirect("/weapons");
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).send("Could not delete gun");
  }
});
// ------------------------------------------------------------

export default router;
