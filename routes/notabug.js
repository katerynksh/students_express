import express from 'express';
const router = express.Router();
import db from '../db/connector.js';
import bcrypt from 'bcrypt';

router.use(async (req, res, next) => {
  const hunterName = req.cookies.notabug_hunter;
  if (hunterName) {
    try {
      const userRes = await db.query('SELECT id, username, reputation, balance, sanity FROM notabug_users WHERE username = $1', [hunterName]);
      if (userRes.rows.length) {
        req.user = userRes.rows[0];
      }
    } catch (err) {
      console.error('User load error:', err);
    }
  }
  res.locals.user = req.user || null;
  next();
});

function validateUsername(username) {
  if (!username || typeof username !== 'string') return false;
  if (username.length < 3 || username.length > 30) return false;
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return false;
  return true;
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 6 || password.length > 100) return false;
  return true;
}

router.get('/register', async (req, res, next) => {
  try {
    const stats = await getGlobalStats();
    res.render('notabug/register', {
      ...stats,
      globalChaosClass: chaosClass(stats.chaosLevel),
      chaosBodyClass: chaosBodyClass(stats.chaosLevel),
      layout: 'layout'
    });
  } catch (err) {
    next(err);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const { username, password, confirmPassword, email } = req.body;

    if (!validateUsername(username)) {
      return res.status(400).render('notabug/register', {
        error: 'Username must be 3-30 characters, alphanumeric with - and _ only',
        layout: 'layout'
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).render('notabug/register', {
        error: 'Password must be 6-100 characters',
        layout: 'layout'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).render('notabug/register', {
        error: 'Passwords do not match',
        layout: 'layout'
      });
    }

    const existsRes = await db.query('SELECT id FROM notabug_users WHERE username = $1', [username]);
    if (existsRes.rows.length) {
      return res.status(400).render('notabug/register', {
        error: 'Username already taken',
        layout: 'layout'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const createRes = await db.query(
      'INSERT INTO notabug_users (username, password_hash, email, sanity, reputation, balance) VALUES ($1, $2, $3, 100, 0, 0) RETURNING id, username',
      [username, passwordHash, email || null]
    );

    await addFeedEvent(`<span class="user-ref">@${username}</span> joined the hunters`);

    res.cookie('notabug_hunter', username, { 
      maxAge: 24 * 60 * 60 * 1000, 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.redirect('/notabug');
  } catch (err) {
    next(err);
  }
});

router.get('/login', async (req, res, next) => {
  try {
    const stats = await getGlobalStats();
    res.render('notabug/login', {
      ...stats,
      globalChaosClass: chaosClass(stats.chaosLevel),
      chaosBodyClass: chaosBodyClass(stats.chaosLevel),
      layout: 'layout'
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!validateUsername(username) || !password) {
      return res.status(400).render('notabug/login', {
        error: 'Invalid username or password',
        layout: 'layout'
      });
    }

    const userRes = await db.query('SELECT id, password_hash, username FROM notabug_users WHERE username = $1', [username]);
    if (!userRes.rows.length) {
      return res.status(400).render('notabug/login', {
        error: 'Invalid username or password',
        layout: 'layout'
      });
    }

    const user = userRes.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(400).render('notabug/login', {
        error: 'Invalid username or password',
        layout: 'layout'
      });
    }

    res.cookie('notabug_hunter', username, { 
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    const redirect = req.query.redirect || '/notabug';
    res.redirect(redirect);
  } catch (err) {
    next(err);
  }
});

router.get('/logout', (req, res) => {
  res.clearCookie('notabug_hunter');
  res.redirect('/notabug');
});

function chaosClass(level) {
  if (level >= 80) return 'high';
  if (level >= 50) return 'medium';
  return 'low';
}

function chaosBodyClass(level) {
  if (level >= 90) return 'chaos-critical';
  if (level >= 70) return 'chaos-high';
  return '';
}

function sanitizeClass(sanity) {
  if (sanity >= 50) return 'sanity-100';
  if (sanity >= 30) return 'sanity-50';
  if (sanity >= 10) return 'sanity-30';
  return 'sanity-10';
}

function sanitizeEffect(sanity) {
  if (sanity >= 50) return 'Normal operations';
  if (sanity >= 30) return 'Minor visual glitches detected';
  if (sanity >= 10) return 'Fake bugs may appear';
  return 'REALITY UNRELIABLE';
}

async function getGlobalStats() {
  const chaos = await db.query('SELECT AVG(chaos_level)::int as avg FROM notabug_bugs WHERE status != $1', ['escaped']);
  const hunters = await db.query('SELECT COUNT(*)::int as cnt FROM notabug_users WHERE is_active = true');
  const sanity = await db.query('SELECT AVG(sanity)::int as avg FROM notabug_users WHERE is_active = true');
  return {
    chaosLevel: chaos.rows[0].avg || 0,
    activeHunters: hunters.rows[0].cnt || 0,
    globalSanity: sanity.rows[0].avg || 100
  };
}

async function getFeed(limit = 20) {
  const res = await db.query(
    'SELECT * FROM notabug_feed ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  return res.rows.map(r => ({
    ...r,
    timeStr: r.created_at.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  }));
}

async function addFeedEvent(msg) {
  await db.query('INSERT INTO notabug_feed (message) VALUES ($1)', [msg]);
}

router.get('/', async (req, res, next) => {
  try {
    const filterStatus = req.query.status || 'all'; 
    let query = 'SELECT * FROM notabug_bugs';
    let queryParams = [];

    if (filterStatus === 'open') {
      query += " WHERE status IN ('open', 'claimed')";
    } else if (filterStatus === 'closed') {
      query += " WHERE status IN ('fixed', 'escaped')";
    }

    query += ' ORDER BY chaos_level DESC, id DESC';

    const bugsRes = await db.query(query, queryParams);
    const stats = await getGlobalStats();
    const feed = await getFeed();

    const openBugsRes = await db.query("SELECT COUNT(*)::int as count FROM notabug_bugs WHERE status IN ('open', 'claimed')");
    const openBugsCount = openBugsRes.rows[0].count;
    const maxOpenBugs = 100;
    const canCreateNewBugs = openBugsCount < maxOpenBugs;

    const bugs = bugsRes.rows.map(b => ({
      ...b,
      severityClass: 'severity-' + b.severity,
      statusClass: 'status-' + b.status,
      chaosClass: chaosClass(b.chaos_level),
      isCritical: b.severity === 'critical',
      bountyFormatted: b.bounty ? '$' + b.bounty : '—'
    }));

    const globalChaosClass = chaosClass(stats.chaosLevel);

    res.render('notabug/dashboard', {
      bugs,
      feed,
      ...stats,
      globalChaosClass,
      chaosBodyClass: chaosBodyClass(stats.chaosLevel),
      filterStatus,
      openBugsCount,
      maxOpenBugs,
      canCreateNewBugs,
      layout: 'layout'
    });
  } catch (err) {
    next(err);
  }
});

router.get('/bug/:id', async (req, res, next) => {
  try {
    const bugRes = await db.query('SELECT * FROM notabug_bugs WHERE id = $1', [req.params.id]);
    if (!bugRes.rows.length) return res.status(404).render('error', { message: 'Bug not found', error: {} });

    const bug = bugRes.rows[0];
    const mutationsRes = await db.query(
      'SELECT * FROM notabug_mutations WHERE bug_id = $1 ORDER BY created_at ASC',
      [bug.id]
    );
    const stats = await getGlobalStats();

    const mutations = mutationsRes.rows.map(m => ({
      ...m,
      timeStr: m.created_at.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    }));

    res.render('notabug/bug', {
      bug: {
        ...bug,
        severityClass: 'severity-' + bug.severity,
        statusClass: 'status-' + bug.status,
        chaosClass: chaosClass(bug.chaos_level),
        bountyFormatted: bug.bounty ? '$' + bug.bounty : '—'
      },
      mutations,
      ...stats,
      globalChaosClass: chaosClass(stats.chaosLevel),
      chaosBodyClass: chaosBodyClass(stats.chaosLevel),
      layout: 'layout'
    });
  } catch (err) {
    next(err);
  }
});

router.post('/bug/:id/claim', async (req, res, next) => {
  try {
    const bugId = parseInt(req.params.id);
    if (isNaN(bugId)) return res.redirect('/notabug');

    const hunter = req.user ? req.user.username : req.body.hunter;
    if (!hunter) {
      return res.status(401).redirect('/notabug/login?redirect=' + encodeURIComponent(req.originalUrl));
    }

    const bugRes = await db.query('SELECT * FROM notabug_bugs WHERE id = $1', [bugId]);
    if (!bugRes.rows.length) {
      return res.status(404).redirect('/notabug');
    }

    const bug = bugRes.rows[0];

    if (bug.status !== 'open') {
      const stats = await getGlobalStats();
      return res.render('notabug/bug', {
        bug: { ...bug, severityClass: 'severity-' + bug.severity, statusClass: 'status-' + bug.status, chaosClass: chaosClass(bug.chaos_level), bountyFormatted: bug.bounty ? '$' + bug.bounty : '—' },
        mutations: [],
        validationError: `Cannot claim bug! Status is: ${bug.status}`,
        ...stats,
        globalChaosClass: chaosClass(stats.chaosLevel),
        chaosBodyClass: chaosBodyClass(stats.chaosLevel),
        layout: 'layout'
      });
    }

    if (bug.claimed_by === hunter) {
      const stats = await getGlobalStats();
      return res.render('notabug/bug', {
        bug: { ...bug, severityClass: 'severity-' + bug.severity, statusClass: 'status-' + bug.status, chaosClass: chaosClass(bug.chaos_level), bountyFormatted: bug.bounty ? '$' + bug.bounty : '—' },
        mutations: [],
        validationError: 'You already claimed this bug!',
        ...stats,
        globalChaosClass: chaosClass(stats.chaosLevel),
        chaosBodyClass: chaosBodyClass(stats.chaosLevel),
        layout: 'layout'
      });
    }

    await db.query(
      'UPDATE notabug_bugs SET status = $1, claimed_by = $2 WHERE id = $3',
      ['claimed', hunter, bugId]
    );

    let userRes = await db.query('SELECT id FROM notabug_users WHERE username = $1', [hunter]);
    if (!userRes.rows.length) {
      userRes = await db.query('INSERT INTO notabug_users (username, password_hash) VALUES ($1, $2) RETURNING id', [hunter, 'nohash']);
    }
    const userId = userRes.rows[0].id;

    await db.query(
      'UPDATE notabug_users SET sanity = GREATEST(sanity - 5, 0) WHERE id = $1',
      [userId]
    );

    await db.query(
      'INSERT INTO notabug_mutations (bug_id, description) VALUES ($1, $2)',
      [bugId, 'Claimed by ' + hunter]
    );

    await addFeedEvent(`<span class="user-ref">@${hunter}</span> claimed <span class="bug-ref">bug #${bugId}</span>`);

    res.redirect('/notabug/bug/' + bugId);
  } catch (err) {
    next(err);
  }
});

router.post('/bug/:id/fix', async (req, res, next) => {
  try {
    const bugId = parseInt(req.params.id);
    if (isNaN(bugId)) return res.redirect('/notabug');

    const hunter = req.user ? req.user.username : req.body.hunter;
    if (!hunter) {
      return res.status(401).redirect('/notabug/login?redirect=' + encodeURIComponent(req.originalUrl));
    }

    const bugRes = await db.query('SELECT * FROM notabug_bugs WHERE id = $1', [bugId]);
    if (!bugRes.rows.length) {
      return res.status(404).redirect('/notabug');
    }

    const bug = bugRes.rows[0];

    if (bug.claimed_by !== hunter) {
      const stats = await getGlobalStats();
      return res.render('notabug/bug', {
        bug: { ...bug, severityClass: 'severity-' + bug.severity, statusClass: 'status-' + bug.status, chaosClass: chaosClass(bug.chaos_level), bountyFormatted: bug.bounty ? '$' + bug.bounty : '—' },
        mutations: [],
        validationError: 'You did not claim this bug!',
        ...stats,
        globalChaosClass: chaosClass(stats.chaosLevel),
        chaosBodyClass: chaosBodyClass(stats.chaosLevel),
        layout: 'layout'
      });
    }

    if (bug.status !== 'claimed') {
      const stats = await getGlobalStats();
      return res.render('notabug/bug', {
        bug: { ...bug, severityClass: 'severity-' + bug.severity, statusClass: 'status-' + bug.status, chaosClass: chaosClass(bug.chaos_level), bountyFormatted: bug.bounty ? '$' + bug.bounty : '—' },
        mutations: [],
        validationError: `Cannot fix bug! Status is: ${bug.status}`,
        ...stats,
        globalChaosClass: chaosClass(stats.chaosLevel),
        chaosBodyClass: chaosBodyClass(stats.chaosLevel),
        layout: 'layout'
      });
    }

    let userRes = await db.query('SELECT id FROM notabug_users WHERE username = $1', [hunter]);
    if (!userRes.rows.length) {
      userRes = await db.query('INSERT INTO notabug_users (username, password_hash) VALUES ($1, $2) RETURNING id', [hunter, 'nohash']);
    }
    const userId = userRes.rows[0].id;

    const severityRoll = { low: 0.8, medium: 0.55, high: 0.35, critical: 0.15 };
    const chance = severityRoll[bug.severity] || 0.5;
    const roll = Math.random();

    let outcome = 'fail';
    if (roll < chance) outcome = 'success';
    else if (roll > 0.92) outcome = 'catastrophe';

    let newChaos = bug.chaos_level;
    let feedMsg = '';

    if (outcome === 'success') {
      await db.query('UPDATE notabug_bugs SET status = $1 WHERE id = $2', ['fixed', bugId]);
      newChaos = Math.max(0, bug.chaos_level - 15);
      await db.query('UPDATE notabug_bugs SET chaos_level = $1 WHERE id = $2', [newChaos, bugId]);
      
      const bountyAmount = bug.bounty || 50;
      await db.query(
        'UPDATE notabug_users SET reputation = reputation + 10, balance = balance + $1, bugs_fixed = bugs_fixed + 1, sanity = GREATEST(sanity - 8, 0) WHERE id = $2',
        [bountyAmount, userId]
      );
      
      await db.query('INSERT INTO notabug_mutations (bug_id, description) VALUES ($1, $2)', [bugId, 'Fixed by ' + hunter]);
      feedMsg = `<span class="success-ref">✓ Bug #${bugId} fixed</span> by <span class="user-ref">@${hunter}</span> | Bounty: $${bountyAmount}`;
    } else if (outcome === 'catastrophe') {
      newChaos = Math.min(100, bug.chaos_level + 25);
      await db.query('UPDATE notabug_bugs SET chaos_level = $1, severity = $2 WHERE id = $3', [newChaos, 'critical', bugId]);
      
      const newBugTitle = 'Splinter of #' + bugId;
      const newBugRes = await db.query(
        'INSERT INTO notabug_bugs (title, description, severity, chaos_level, status, bounty) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [newBugTitle, 'Spawned from a failed fix attempt on bug #' + bugId, 'high', 60, 'open', 50]
      );
      
      await db.query(
        'UPDATE notabug_users SET sanity = GREATEST(sanity - 20, 0), bugs_failed = bugs_failed + 1, balance = GREATEST(balance - 25, 0) WHERE id = $1',
        [userId]
      );
      
      await db.query('INSERT INTO notabug_mutations (bug_id, description) VALUES ($1, $2)', [bugId, 'Fix attempt catastrophically failed. New bug spawned.']);
      feedMsg = `<span class="chaos-ref">💥 Fix failed on #${bugId} — new bug #${newBugRes.rows[0].id} spawned</span>`;
    } else {
      newChaos = Math.min(100, bug.chaos_level + 10);
      await db.query('UPDATE notabug_bugs SET chaos_level = $1 WHERE id = $2', [newChaos, bugId]);
      
      await db.query(
        'UPDATE notabug_users SET sanity = GREATEST(sanity - 8, 0), bugs_failed = bugs_failed + 1, reputation = GREATEST(reputation - 2, 0) WHERE id = $1',
        [userId]
      );
      
      await db.query('INSERT INTO notabug_mutations (bug_id, description) VALUES ($1, $2)', [bugId, 'Fix attempt failed.']);
      feedMsg = `Fix attempt on <span class="bug-ref">#${bugId}</span> failed. Chaos rising.`;
    }

    if (feedMsg) await addFeedEvent(feedMsg);

    res.redirect('/notabug/bug/' + bugId + '?outcome=' + outcome);
  } catch (err) {
    next(err);
  }
});

router.get('/report', async (req, res, next) => {
  try {
    const stats = await getGlobalStats();
    res.render('notabug/report', {
      ...stats,
      globalChaosClass: chaosClass(stats.chaosLevel),
      chaosBodyClass: chaosBodyClass(stats.chaosLevel),
      layout: 'layout'
    });
  } catch (err) {
    next(err);
  }
});

router.post('/report', async (req, res, next) => {
  try {
    const openBugsRes = await db.query("SELECT COUNT(*)::int as count FROM notabug_bugs WHERE status IN ('open', 'claimed')");
    const openBugsCount = openBugsRes.rows[0].count;
    const maxOpenBugs = 100;

    if (openBugsCount >= maxOpenBugs) {
      const stats = await getGlobalStats();
      return res.status(429).render('notabug/report', {
        error: `System capacity reached! ${openBugsCount}/${maxOpenBugs} open bugs. Cannot create new bugs until some are fixed or escape.`,
        ...stats,
        globalChaosClass: chaosClass(stats.chaosLevel),
        chaosBodyClass: chaosBodyClass(stats.chaosLevel),
        layout: 'layout'
      });
    }

    let { title, description, severity, bounty, steps } = req.body;
    if (!title || !severity) return res.redirect('/notabug/report');

    const severities = ['low', 'medium', 'high', 'critical'];
    if (!severities.includes(severity)) severity = 'medium';

    const chaos = Math.floor(Math.random() * 60) + 10;
    const unstable = Math.random() > 0.6;

    if (Math.random() > 0.7) {
      description = (description || '') + ' [SYSTEM: description altered by entropy daemon]';
    }

    const result = await db.query(
      'INSERT INTO notabug_bugs (title, description, severity, chaos_level, status, bounty, steps_to_reproduce) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [title, description || 'No description provided.', severity, chaos, 'open', bounty ? parseInt(bounty) : null, steps || null]
    );

    const bugId = result.rows[0].id;

    await db.query('INSERT INTO notabug_mutations (bug_id, description) VALUES ($1, $2)', [bugId, 'Bug reported']);

    if (unstable) {
      await db.query('INSERT INTO notabug_mutations (bug_id, description) VALUES ($1, $2)', [bugId, 'Marked as unstable by system']);
    }

    await addFeedEvent(`New bug <span class="bug-ref">#${bugId}</span> reported: <span class="highlight">${title}</span>`);

    res.redirect('/notabug/bug/' + bugId);
  } catch (err) {
    next(err);
  }
});

router.get('/profile/:username', async (req, res, next) => {
  try {
    const username = req.params.username;
    
    const userRes = await db.query('SELECT id, username, sanity, reputation, balance, bugs_fixed, bugs_failed, created_at FROM notabug_users WHERE username = $1', [username]);
    if (!userRes.rows.length) {
      return res.status(404).render('error', { message: 'Hunter not found', error: {} });
    }

    const user = userRes.rows[0];

    const activeBugsRes = await db.query(
      'SELECT id, title, severity, chaos_level, bounty FROM notabug_bugs WHERE claimed_by = $1 AND status = $2 LIMIT 10',
      [username, 'claimed']
    );

    const stats = await getGlobalStats();

    const sanityVal = user.sanity || 100;
    const sanityKlass = sanitizeClass(sanityVal);
    const sanityEffect = sanitizeEffect(sanityVal);

    const isOwnProfile = req.user && req.user.id === user.id;

    res.render('notabug/profile', {
      user: {
        ...user,
        sanityClass: sanityKlass,
        sanityEffect,
        sanityPct: sanityVal
      },
      activeBugs: activeBugsRes.rows,
      isOwnProfile,
      ...stats,
      globalChaosClass: chaosClass(stats.chaosLevel),
      chaosBodyClass: chaosBodyClass(stats.chaosLevel),
      layout: 'layout'
    });
  } catch (err) {
    next(err);
  }
});

router.post('/system/tick', async (req, res, next) => {
  try {
    const bugs = await db.query("SELECT * FROM notabug_bugs WHERE status IN ('open','claimed') ORDER BY RANDOM() LIMIT 3");

    for (const bug of bugs.rows) {
      const roll = Math.random();

      if (roll < 0.15) {
        const newChaos = Math.min(100, bug.chaos_level + Math.floor(Math.random() * 15) + 5);
        await db.query('UPDATE notabug_bugs SET chaos_level = $1, severity = CASE WHEN $1 > 80 THEN $2 ELSE severity END WHERE id = $3',
          [newChaos, 'critical', bug.id]);
        await db.query('INSERT INTO notabug_mutations (bug_id, description) VALUES ($1, $2)', [bug.id, 'Severity escalated automatically']);
        await addFeedEvent(`<span class="chaos-ref">⚠ Bug #${bug.id} mutated — chaos rising</span>`);
      }

      if (roll > 0.95) {
        await db.query("UPDATE notabug_bugs SET status = 'escaped' WHERE id = $1", [bug.id]);
        await db.query('INSERT INTO notabug_mutations (bug_id, description) VALUES ($1, $2)', [bug.id, 'Bug escaped containment']);
        await addFeedEvent(`<span class="chaos-ref">🚨 Bug #${bug.id} has escaped!</span>`);
      }
    }

    const openBugsRes = await db.query("SELECT COUNT(*)::int as count FROM notabug_bugs WHERE status IN ('open', 'claimed')");
    const openBugsCount = openBugsRes.rows[0].count;
    const maxOpenBugs = 100;

    if (Math.random() > 0.6 && openBugsCount < maxOpenBugs) {
      const titles = [
        'Undefined behavior in production',
        'Race condition at midnight',
        'Null pointer in critical path',
        'Memory leak detected somewhere',
        'Segfault on valid input',
        'Infinite loop that sometimes stops',
        'Heisenbug: disappears when debugging',
        'Type coercion anomaly',
        'Off-by-one in core logic',
        'Silent data corruption'
      ];
      const severities = ['low', 'low', 'medium', 'medium', 'high', 'critical'];
      const title = titles[Math.floor(Math.random() * titles.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      const chaos = Math.floor(Math.random() * 70) + 10;

      const newBug = await db.query(
        'INSERT INTO notabug_bugs (title, description, severity, chaos_level, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [title, 'Auto-generated by system entropy engine.', severity, chaos, 'open']
      );
      await db.query('INSERT INTO notabug_mutations (bug_id, description) VALUES ($1, $2)', [newBug.rows[0].id, 'Spawned by entropy engine']);
      await addFeedEvent(`System spawned <span class="bug-ref">#${newBug.rows[0].id}</span>: <span class="highlight">${title}</span>`);
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
});

export default router;