const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const ticketRoutes = require('./routes/tickets');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const adminUsersRoutes = require('./routes/adminUsers');


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin/users', adminUsersRoutes);


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'skone-ticketing-backend' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

