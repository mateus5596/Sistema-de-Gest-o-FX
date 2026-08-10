const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_SIpP4sb2etQa@ep-icy-dawn-acemibaq-pooler.sa-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
const pool = new Pool({ 
  connectionString,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = global.prisma || new PrismaClient({ adapter });
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_financex_key_123';

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token == null) return res.status(401).json({ error: 'Token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'FinanceX API is running' });
});

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});


// User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { name, cpf, password } = req.body;
    const cleanCpf = cpf ? cpf.replace(/\D/g, '') : '';
    
    // Check if user exists (check formatted or unformatted)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { cpf: cpf },
          { cpf: cleanCpf }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Usuário já cadastrado com este CPF' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        cpf: cleanCpf || cpf,
        password: hashedPassword
      }
    });

    // Generate token for auto-login
    const token = jwt.sign({ userId: user.id, cpf: user.cpf }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ message: 'Usuário cadastrado com sucesso', token, user: { id: user.id, name: user.name, cpf: user.cpf } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message || 'Falha ao cadastrar usuário' });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { cpf, password } = req.body;
    const cleanCpf = cpf ? cpf.replace(/\D/g, '') : '';
    
    // Find user (support both formatted '123.456.789-00' and raw digits '12345678900')
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { cpf: cpf },
          { cpf: cleanCpf }
        ]
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'CPF ou senha incorretos' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'CPF ou senha incorretos' });
    }

    // Generate token
    const token = jwt.sign({ userId: user.id, cpf: user.cpf }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user: { id: user.id, name: user.name, cpf: user.cpf } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Falha ao realizar login' });
  }
});

// Get all transactions (Protected)
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.userId },
      orderBy: { date: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Create a new transaction (Protected)
app.post('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const { type, value, description, category, date, status } = req.body;
    const newTransaction = await prisma.transaction.create({
      data: {
        type,
        value: parseFloat(value),
        description,
        category,
        date: new Date(date),
        status,
        userId: req.user.userId
      }
    });
    res.json(newTransaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Delete a transaction (Protected)
app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.transaction.delete({
      where: { 
        id: parseInt(id),
        userId: req.user.userId // ensure user can only delete their own
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Vercel serverless functions require exporting the app
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

module.exports = app;
