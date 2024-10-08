const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const SECRET_KEY = 'your_secret_key';

const users = [
  { id: 1, username: 'admin', password: bcrypt.hashSync('admin', 8), role: 'admin' },
  { id: 2, username: 'operator1', password: bcrypt.hashSync('operator1', 8), role: 'operator' },
  { id: 3, username: 'operator2', password: bcrypt.hashSync('operator2', 8), role: 'operator' },
  { id: 4, username: 'operator3', password: bcrypt.hashSync('operator3', 8), role: 'operator' },
  { id: 5, username: 'operator4', password: bcrypt.hashSync('operator4', 8), role: 'operator' },
];
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token, role: user.role });
  } else {
    res.status(401).json({ message: 'Autenticazione fallita' });
  }
});

io.on('connection', (socket) => {
  console.log('Nuovo client connesso');

  socket.on('login', ({ token }) => {
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      if (decoded.role === 'operator') {
        socket.join('operators');
        io.emit('operatorStatus', { id: decoded.id, status: 'online' });
      }
    } catch (error) {
      console.error('Token non valido', error);
    }
  });

  socket.on('startStream', (operatorId) => {
    io.emit('streamStarted', operatorId);
  });

  socket.on('stopStream', (operatorId) => {
    io.emit('streamStopped', operatorId);
  });

  socket.on('message', (data) => {
    io.emit('message', data);
  });

  socket.on('intervention', (data) => {
    io.emit('intervention', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnesso');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server in esecuzione sulla porta ${PORT}`));/ /  
 F o r c e d  
 u p d a t e  
 / /  
 F o r c e d  
 u p d a t e  
 f o r  
 H e r o k u  
 d e p l o y  
 