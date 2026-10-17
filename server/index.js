require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { getPool } = require('./db');
const { initSocket } = require('./socket');
const authRouter = require('./routes/auth');
const mealsRouter = require('./routes/meals');
const ordersRouter = require('./routes/orders');
const walletRouter = require('./routes/wallet');
const reviewsRouter = require('./routes/reviews');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});
initSocket(io);

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '8mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ok');
    res.json({
      status: 'ok',
      database: 'connected',
      message: 'KomşuAş API çalışıyor',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/meals', mealsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/reviews', reviewsRouter);

io.on('connection', (socket) => {
  console.log(`Socket bağlandı: ${socket.id}`);
  socket.on('join:user', (userId) => {
    if (userId) socket.join(`user:${userId}`);
  });
  socket.on('disconnect', () => {
    console.log(`Socket ayrıldı: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`Server http://localhost:${PORT} adresinde çalışıyor`);
  try {
    await getPool();
  } catch (err) {
    console.error('Veritabanına başlangıçta bağlanılamadı:', err.message);
  }
});
