const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const { FRONTEND_URL, NODE_ENV } = require('./lib/env');
const { apiLimiter } = require('./middleware/rateLimit');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const issueRoutes = require('./routes/issueRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');

const app = express();

// Security headers, including a practical Content-Security-Policy.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    referrerPolicy: { policy: 'no-referrer' },
  })
);

// Explicit allow-list, never a wildcard, since requests carry JWT auth.
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  })
);

app.use(express.json({ limit: '100kb' }));

if (NODE_ENV !== 'test') {
  app.use(morgan(NODE_ENV === 'development' ? 'dev' : 'combined'));
}

app.use('/api', apiLimiter);

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/audit-logs', auditLogRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
