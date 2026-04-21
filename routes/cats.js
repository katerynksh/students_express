import express from "express";
import bcrypt from "bcrypt";
const router = express.Router();
import db from "../db/connector.js";

const validateEmail = (email) => {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!email || email.trim().length === 0) return "Email is required";
  if (!re.test(email)) return "Invalid format (example: cat@mail.com)";
  if (email.length > 255) return "Email is too long";
  if (email.length < 4) return "Email is too short";
  return null;
};

const validatePassword = (pass) => {
  if (!pass || pass.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(pass))
    return "Password must contain at least one uppercase letter";
  if (!/[0-9]/.test(pass)) return "Password must contain at least one number";
  return null;
};

const validateUsername = (name) => {
  const n = name.trim();
  if (n.length < 3 || n.length > 30) return "Username must be 3-30 characters";
  if (!/^[a-zA-Z0-9_-]+$/.test(n))
    return "Username contains invalid characters";
  return null;
};

const validateAge = (age) => {
  const n = parseInt(age, 10);
  if (age === "" || age === null || age === undefined) return "Age is required";
  if (isNaN(n)) return "Age must be a valid number";
  if (n < 0 || n > 20) return "Age must be between 0 and 20 years old";
  return null;
};

const validateWeight = (weight) => {
  const w = parseFloat(weight);
  if (weight === "" || weight === null) return "Weight is required";
  if (isNaN(w)) return "Weight must be a number";
  if (w <= 0 || w > 25) return "Weight must be between 0.1 and 25 kg";
  return null;
};

const validateCatName = (name) => {
  if (!name || typeof name !== "string") return "Cat name is required";
  const trimmed = name.trim();
  if (trimmed.length < 1) return "Cat name is required";
  if (trimmed.length > 50) return "Cat name is too long (max 50 characters)";
  if (!/^[a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9\s-]+$/.test(trimmed)) {
    return "Cat name contains invalid characters";
  }
  return null;
};

const validateBreed = (breed) => {
  if (!breed || typeof breed !== "string") return "Breed is required";
  const trimmed = breed.trim();
  if (trimmed.length < 2) return "Breed must be at least 2 characters";
  if (trimmed.length > 50) return "Breed name is too long";
  if (!/^[a-zA-Zа-яА-ЯіІїЇєЄґҐ\s-]+$/.test(trimmed)) {
    return "Breed contains invalid characters";
  }
  return null;
};

const validateContact = (contact) => {
  if (!contact || typeof contact !== "string")
    return "Contact information is required";
  const trimmed = contact.trim();
  if (trimmed.length < 5) return "Contact must be at least 5 characters";
  if (trimmed.length > 100) return "Contact is too long (max 100)";
  if (/[<>]/.test(trimmed)) {
    return "Contact contains invalid symbols";
  }
  return null;
};

router.get("/", function (req, res, next) {
  res.render("cats/cats", { title: "CAT NET." });
});

router.get("/register", async (req, res) => {
  res.render("cats/cats-register-form", {
    title: "REGISTER - CAT NET.",
    errors: {},
    formData: {},
  });
});

router.post("/register", async (req, res) => {
  const username = req.body.username?.trim();
  const email = req.body.email?.trim();
  const { password, confirmPassword } = req.body;

  const errors = {};

  const uErr = validateUsername(username);
  const eErr = validateEmail(email);
  const pErr = validatePassword(password);

  if (uErr) errors.username = uErr;
  if (eErr) errors.email = eErr;
  if (pErr) errors.password = pErr;
  if (password !== confirmPassword)
    errors.confirmPassword = "Passwords don't match";

  if (Object.keys(errors).length > 0) {
    return res.render("cats/cats-register-form", {
      title: "REGISTER - CAT NET.",
      errors,
      formData: req.body,
    });
  }

  try {
    const userCheck = await db.query(
      "SELECT * FROM users_cats WHERE email = $1",
      [email],
    );
    if (userCheck.rows.length > 0) {
      return res.render("cats/cats-register-form", {
        title: "REGISTER - CAT NET.",
        errors: { email: "A user with this email is already registered." },
        formData: req.body,
      });
    }

    const saltRound = 10;
    const hashedPassword = await bcrypt.hash(password, saltRound);
    await db.query(
      "INSERT INTO users_cats (username, email, password) VALUES ($1, $2, $3)",
      [username, email, hashedPassword],
    );
    res.redirect("/cats/login");
  } catch (err) {
    console.error("REGISTRATION ERROR:", err);
    res.status(500).send("An error occurred during registration.");
  }
});

router.get("/login", (req, res) => {
  res.render("cats/cats-login-form", {
    title: "Login - CAT NET.",
    errors: {},
    formData: {},
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const errors = {};

  const eErr = validateEmail(email);
  const pErr = validatePassword(password);

  if (eErr) errors.email = eErr;
  if (pErr) errors.password = pErr;

  if (Object.keys(errors).length > 0) {
    return res.render("cats/cats-login-form", {
      title: "Login - CAT NET.",
      errors,
      formData: req.body,
    });
  }

  try {
    const result = await db.query("SELECT * FROM users_cats WHERE email = $1", [
      email,
    ]);
    const user = result.rows[0];

    if (user) {
      const validPassword = await bcrypt.compare(password, user.password);
      if (validPassword) {
        return res.redirect(`/cats/profile?user=${user.username}`);
      } else {
        errors.password = "Invalid password";
      }
    } else {
      errors.email = "User with this email not found";
    }

    res.render("cats/cats-login-form", {
      title: "Login - CAT NET.",
      errors,
      formData: req.body,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err.message);
    res.status(500).send("Server error during login");
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
  const errors = {};

  const nErr = validateCatName(name);
  const bErr = validateBreed(breed);
  const aErr = validateAge(age_years);
  const wErr = validateWeight(weight_kg);
  const cErr = validateContact(owner_contact);

  if (nErr) errors.name = nErr;
  if (bErr) errors.breed = bErr;
  if (aErr) errors.age_years = aErr;
  if (wErr) errors.weight_kg = wErr;
  if (cErr) errors.owner_contact = cErr;

  if (Object.keys(errors).length > 0) {
    return res.render("cats/cats-add", {
      title: "REGISTER NEW CAT",
      errors,
      cat: req.body,
      username,
      isEdit: false,
    });
  }

  try {
    const userRes = await db.query(
      "SELECT id FROM users_cats WHERE username = $1",
      [username],
    );
    const userId = userRes.rows[0].id;

    await db.query(
      `INSERT INTO cats (name, breed, age_years, weight_kg, favorite_food, has_microchip, owner_contact, character_notes, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        name,
        breed,
        parseInt(age_years),
        parseFloat(weight_kg),
        favorite_food,
        has_microchip === "on",
        owner_contact,
        character_notes,
        userId,
      ],
    );

    res.redirect(`/cats/profile?user=${username}`);
  } catch (err) {
    res.status(500).send("Failed to save cat data.");
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
      errors: {},
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

router.post("/edit", async (req, res) => {
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
    cat_id,
  } = req.body;

  const errors = {
    name: validateCatName(name),
    breed: validateBreed(breed),
    age_years: validateAge(age_years),
    weight_kg: validateWeight(weight_kg),
    owner_contact: validateContact(req.body.owner_contact),
  };

  Object.keys(errors).forEach((key) => {
    if (errors[key] === null) delete errors[key];
  });

  if (Object.keys(errors).length > 0) {
    return res.render("cats/cats-add", {
      title: "EDIT CAT",
      errors,
      cat: { ...req.body, id: cat_id },
      username,
      isEdit: true,
    });
  }

  try {
    const userRes = await db.query(
      "SELECT id FROM users_cats WHERE username = $1",
      [username],
    );
    const userId = userRes.rows[0].id;

    await db.query(
      `UPDATE cats SET name=$1, breed=$2, age_years=$3, weight_kg=$4, favorite_food=$5, 
       has_microchip=$6, owner_contact=$7, character_notes=$8 WHERE id=$9 AND user_id=$10`,
      [
        name,
        breed,
        parseInt(age_years),
        parseFloat(weight_kg),
        favorite_food,
        has_microchip === "on",
        owner_contact,
        character_notes,
        cat_id,
        userId,
      ],
    );

    res.redirect(`/cats/profile?user=${encodeURIComponent(username)}`);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error while saving changes.");
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
