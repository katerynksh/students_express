import express from 'express';
const router = express.Router();
import db from '../db/connector.js'

router.get('/', async function(req, res, next) {
  const heroes = await db.query('SELECT * FROM heroes');

  const rowheroes = heroes.rows.map(w => {
    return {
      ...w,
      created_at: w.created_at.toLocaleDateString()
    }
  })
  res.render('herose_table', { heroes: rowheroes || [] });
});

router.get("/add", (req, res) => {
  res.render("forms/heroes_form", { isEdit: false });
});

router.post("/add", async (req, res) => {
  try {
    const { hero_name, hero_class, hero_role, attack_type } = req.body;

    const query = `
      INSERT INTO heroes (name, hero_class, role, attack_type)
      VALUES ($1, $2, $3, $4)
    `;

    await db.query(query, [
      hero_name || "Unknown",
      hero_class || "Unknown",
      hero_role || "Unknown",
      attack_type || "Unknown"
    ]);
    res.redirect("/heroes"); 
  } catch (err) {
    console.error("DATABASE ERROR:", err.message);
    res.status(500).send("Database Error: " + err.message);
  }
});

router.get("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM heroes WHERE id = $1", [id]);
    res.redirect("/heroes");
  } catch (err) {
    res.status(500).send("Could not delete hero"); 
  }
});

router.get("/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query("SELECT * FROM heroes WHERE id = $1", [id]);
    if (result.rows.length === 0) return res.status(400).send("Hero not found");

    const hero = result.rows[0];
    res.render("forms/heroes_form", { hero, isEdit: true });
  } catch (err) {
    res.status(500).send("Error loading edit form");
  }
});

router.post("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { hero_name, hero_class, hero_role, attack_type } = req.body;

    const query = `
      UPDATE heroes
      SET name = $1, hero_class = $2, role = $3, attack_type = $4
      WHERE id = $5
    `;

    await db.query(query, [hero_name, hero_class, hero_role, attack_type, id]);
    res.redirect("/heroes");
  } catch (err) {
    res.status(500).send("Error updating hero data");
  }
});

export default router;