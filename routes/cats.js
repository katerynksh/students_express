import express from "express";
import bcrypt from "bcrypt";
const router = express.Router();
import db from "../db/connector.js";

router.get("/", function (req, res, next) {
  res.render("cats/cats", { title: "CAT NET." });
});

router.get("/register", async (req, res) => {
  res.render("cats/cats-register-form", { title: "REGISTER - CAT NET." });
});

router.post("/register", async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  if (!username || !email || !password || !confirmPassword) {
    return res
      .status(400)
      .send("All fields (name, email, password) are required.");
  }
  if (password !== confirmPassword) {
    return res.status(400).send("The passwords don't match!");
  }
  try {
    const userCheck = await db.query(
      "SELECT * FROM users_cats WHERE email = $1",
      [email],
    );
    if (userCheck.rows.length > 0) {
      return res
        .status(400)
        .send("A user with this email is already registered.");
    }
    const saltRound = 10;
    const hashedPassword = await bcrypt.hash(password, saltRound);
    await db.query(
      "INSERT INTO users_cats (username, email, password) VALUES ($1, $2, $3)",
      [username, email, hashedPassword],
    );
    res.redirect("/cats/login");
  } catch (err) {
    console.error("FULL ERROR DETAILS:", err);
    res
      .status(500)
      .send("An error occurred on the server during registration.");
  }
});

router.get("/login", (req, res) => {
  res.render("cats/cats-login-form", { title: "Login - CAT NET." });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await db.query("SELECT * FROM users_cats WHERE email = $1", [
      email,
    ]);
    if (user.rows.length > 0) {
      const validPassword = await bcrypt.compare(
        password,
        user.rows[0].password,
      );
      if (validPassword) {
        const name = user.rows[0].username;
        return res.redirect(`/cats/profile?user=${name}`);
      }
    }
    res.status(401).send("Invalid login");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

router.get("/profile", async (req, res) => {
  const name = req.query.user || "Guest";
  try {
    const userRes = await db.query(
      "SELECT id FROM users_cats WHERE username = $1",
      [name],
    );
    if (userRes.rows.length > 0) {
      const userId = userRes.rows[0].id;
      const catsRes = await db.query(
        "SELECT * FROM cats WHERE user_id =$1 ORDER BY created_at DESC",
        [userId],
      );

      res.render("cats/cats-profile", {
        title: "MY PROFILE - CAT NET.",
        username: name,
        cats: catsRes.rows,
      });
    } else {
      res.redirect("/cats");
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error loading profile");
  }
});
router.get("/logout", async (req, res) => {
  res.redirect("/cats");
});

router.get("/add-form", (req, res) => {
  const username = req.query.user;
  res.render("cats/cats-add", { username });
});

router.post("/add", async (req, res) => {
  const {
    name,
    breed,
    age_years,
    weight_kg,
    favorite_food,
    has_microchip,
    character_notes,
    username,
    owner_contact,
  } = req.body;
  try {
    const userRes = await db.query(
      "SELECT id FROM users_cats WHERE username = $1",
      [username],
    );
    if (userRes.rows.length === 0) {
      return res.status(404).send("User not found");
    }
    const userId = userRes.rows[0].id;
    await db.query(
      `INSERT INTO cats (name, breed, age_years, weight_kg, favorite_food, has_microchip, owner_contact, character_notes, user_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        name,
        breed,
        age_years ? parseInt(age_years) : null,
        weight_kg ? parseFloat(weight_kg) : null,
        favorite_food,
        has_microchip === "on",
        owner_contact,
        character_notes,
        userId,
      ],
    );

    res.redirect(`/cats/profile?user=${username}`);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Failed to add cat: " + err.message);
  }
});

router.post("/delete", async (req, res) => {
  const { cat_id, username } = req.body;
  try {
    const userRes = await db.query(
      "SELECT id FROM  users_cats WHERE username = $1",
      [username],
    );
    const userId = userRes.rows[0].id;

    await db.query("DELETE FROM cats WHERE id = $1 AND user_id = $2", [
      cat_id,
      userId,
    ]);
    res.redirect(`/cats/profile?user=${username}`);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error while deleting");
  }
});

router.get("/edit-form/:id", async (req, res) => {
  const catId = req.params.id;
  const username = req.query.user;

  try {
    const result = await db.query("SELECT * FROM cats WHERE id = $1", [catId]);
    const cat = result.rows[0];

    if (!cat) {
      return res.status(404).send("Cat not found");
    }

    res.render("cats/cats-add", {
      cat,
      username,
      isEdit: true,
      title: "EDIT CAT - CAT NET.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

router.get("/all", async (req, res) => {
  const name = req.query.user || "Guest";
  try {
    const allCatsRes = await db.query(`
      SELECT cats.*, users_cats.username as owner_name 
      FROM cats 
      JOIN users_cats ON cats.user_id = users_cats.id 
      ORDER BY cats.created_at DESC
    `);

    res.render("cats/cats-all", {
      title: "ALL CATS - CAT NET.",
      cats: allCatsRes.rows,
      username: name,
    });
  } catch (err) {
    console.error("DETAILED ERROR:", err);
    res.status(500).send("Error loading list of all cats");
  }
});

router.get("/view-public", async (req, res) => {
  try {
    const listCats = await db.query(`
      SELECT cats.*, users_cats.username as owner_name 
      FROM cats 
      JOIN users_cats ON cats.user_id = users_cats.id 
      ORDER BY cats.created_at DESC
    `);
    res.render("cats/cats-public-list", {
      title: "PUBLIC LIST - CAT NET.",
      cats: listCats.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading public list");
  }
});

export default router;