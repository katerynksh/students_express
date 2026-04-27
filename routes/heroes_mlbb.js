import express from 'express';
const router = express.Router();
import db from '../db/connector.js'

router.get('/', async function(req, res, next) {
  const heroes = await db.query('SELECT * FROM heroes_mlbb');

  const rowheroes = heroes.rows.map(w => {
    return {
      ...w,
      created_at: w.created_at.toLocaleDateString()
    }
  })
  res.render('heroes_mlbb_table', { heroes: rowheroes || [] });
});

router.get("/add", (req, res) => {
  res.render("forms/heroes_mlbb_form_add", { isEdit: false });
});

router.post("/add", async (req, res) => {
  try {
    let { hero_name, hero_class, hero_role, attack_type } = req.body;

    hero_class = hero_class?.toLowerCase() || "";
    attack_type = attack_type?.toLowerCase() || "";

    if (!hero_name) {
    return res.status(400).send("Ім'я героя не може бути пустим рядком");
} else if (!['tank', 'fighter', 'assassin', 'mage', 'marksman', 'support'].includes(hero_class)) {
    return res.status(400).send("Клас має бути одним з 'tank', 'fighter', 'assassin', 'mage', 'marksman', 'support'");
} else if (!hero_role) {
    return res.status(400).send("Роль не може бути пустою");
} else if (!['melee', 'ranged'].includes(attack_type)) {
    return res.status(400).send("Тип атаки має бути одним з 'melee', 'ranged'");
}

    const query = `
      INSERT INTO heroes_mlbb (name, hero_class, role, attack_type)
      VALUES ($1, $2, $3, $4)
    `;

    await db.query(query, [
      hero_name || "Unknown",
      hero_class || "Unknown",
      hero_role || "Unknown",
      attack_type || "Unknown"
    ]);
    res.redirect("/heroes_mlbb"); 
  } catch (err) {
    console.error("DATABASE ERROR:", err.message);
    res.status(500).send("Database Error: " + err.message);
  }
});

router.get("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM heroes_mlbb WHERE id = $1", [id]);
    res.redirect("/heroes_mlbb");
  } catch (err) {
    res.status(500).send("Could not delete hero"); 
  }
});

router.get("/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query("SELECT * FROM heroes_mlbb WHERE id = $1", [id]);
    if (result.rows.length === 0) return res.status(400).send("Hero not found");

    const hero = result.rows[0];
    res.render("forms/heroes_mlbb_form", { hero, isEdit: true });
  } catch (err) {
    res.status(500).send("Error loading edit form");
  }
});

router.post("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let { hero_name, hero_class, hero_role, attack_type } = req.body;

    hero_class = hero_class?.toLowerCase() || "";
    attack_type = attack_type?.toLowerCase() || "";
    
if (!hero_name) {
    return res.status(400).send("Ім'я героя не може бути пустим рядком");
} else if (!['tank', 'fighter', 'assassin', 'mage', 'marksman', 'support'].includes(hero_class)) {
    return res.status(400).send("Клас має бути одним з 'tank', 'fighter', 'assassin', 'mage', 'marksman', 'support'");
} else if (!hero_role) {
    return res.status(400).send("Роль не може бути пустою");
} else if (!['melee', 'ranged'].includes(attack_type)) {
    return res.status(400).send("Тип атаки має бути одним з 'melee', 'ranged'");
}
    const query = `
      UPDATE heroes_mlbb
      SET name = $1, hero_class = $2, role = $3, attack_type = $4
      WHERE id = $5
    `;

    await db.query(query, [hero_name, hero_class, hero_role, attack_type, id]);
    res.redirect("/heroes_mlbb");
  } catch (err) {
    res.status(500).send("Error updating hero data");
  }
});

export default router;