import dotenv from 'dotenv'
dotenv.config()
import createError from 'http-errors'
import express from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import indexRouter from './routes/index.js'
import usersRouter from './routes/users.js'
import gamesRouter from './routes/games.js'
import weaponRouter from './routes/dead_space.js'
import carsRouter from './routes/cars.js'
import slonikiRouter from './routes/sloniki.js'
import gymRouter from './routes/gym.js'
import heroesRouter from './routes/heroes_mlbb.js' 
import catsRouter from './routes/cats.js' 
import dhdRouter from './routes/dhd.js'
import streetFoodRouter from './routes/street_food.js'

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/students', usersRouter);
app.use('/games', gamesRouter);
app.use('/weapons', weaponRouter);
app.use('/sloniki', slonikiRouter);
app.use('/cars', carsRouter);
app.use('/gym', gymRouter);
app.use('/heroes', heroesRouter); 
app.use('/cats', catsRouter); 
app.use('/dhd', dhdRouter);
app.use('/street_food', streetFoodRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

export default app;