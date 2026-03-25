import express from 'express';
const router = express.Router();
import db from '../db/connector.js';

router.get('/', async function(req, res, next) {
  const exercise = await db.query('SELECT * FROM gym');

  const modExercise = exercise.rows.map(w => {
    return {
      ...w,
      created_at: w.created_at.toLocaleDateString()
    }
  })
  res.render('gym', { exercise: modExercise || [] });
});
router.get('/addExercise', async function(req, res, next) {
  res.render('forms/gym_form');
})

router.post('/addExercise', async function(req, res, next) {
  console.log("Submitted data: ", req.body);

const { exercise_name, difficult_level, required_level, Muscle_name, Sets } = req.body;

  async function addExer(exercise_name, difficult_level, required_level, Muscle_name, Sets) {
   try {
      const query = `
      INSERT INTO gym (
            exercise_name, difficult_level, required_level, Muscle_name, Sets
        )
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *`;
   const res = await db.query(query, [exercise_name, difficult_level, required_level, Muscle_name, Sets]);

   } catch (err) 
      { console.error(err)
        throw err;
   }
}

try {
    await addExer(exercise_name, difficult_level, required_level, Muscle_name, Sets);
    
    res.redirect('/gym');
  } catch (err) {
    res.status(500).send("Помилка при додаванні вправи. Можливо, вона вже існує.");
  }
});

export default router;
