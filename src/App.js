import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import './App.css';

const socket = io('http://localhost:5000');

function Login({ setToken, setRole }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('Attempting login with:', username, password);
      const response = await axios.post('http://localhost:5000/login', { username, password });
      console.log('Login response:', response.data);
      setToken(response.data.token);
      setRole(response.data.role);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
      socket.emit('login', { token: response.data.token });
    } catch (error) {
      console.error('Login error:', error.response ? error.response.data : error.message);
      alert('Login fallito: ' + (error.response ? error.response.data.message : error.message));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text" 
        value={username} 
        onChange={(e) => setUsername(e.target.value)} 
        placeholder="Username" 
      />
      <input 
        type="password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)} 
        placeholder="Password" 
      />
      <button type="submit">Login</button>
    </form>
  );
}

function CentraleOperativa() {
  const [operators, setOperators] = useState([
    { id: 2, status: 'offline', streaming: false, peer: null },
    { id: 3, status: 'offline', streaming: false, peer: null },
    { id: 4, status: 'offline', streaming: false, peer: null },
    { id: 5, status: 'offline', streaming: false, peer: null }
  ]);
  const [messages, setMessages] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const videoRefs = useRef({});

  useEffect(() => {
    socket.on('operatorStatus', ({ id, status }) => {
      setOperators(prev => prev.map(op => op.id === id ? { ...op, status } : op));
    });

    socket.on('streamStarted', ({ operatorId, signalData }) => {
      setOperators(prev => prev.map(op => {
        if (op.id === operatorId) {
          const peer = new Peer({ initiator: false, trickle: false });
          peer.signal(signalData);
          peer.on('stream', stream => {
            if (videoRefs.current[operatorId]) {
              videoRefs.current[operatorId].srcObject = stream;
            }
          });
          return { ...op, streaming: true, peer };
        }
        return op;
      }));
    });

    socket.on('streamStopped', (operatorId) => {
      setOperators(prev => prev.map(op => {
        if (op.id === operatorId) {
          if (op.peer) {
            op.peer.destroy();
          }
          return { ...op, streaming: false, peer: null };
        }
        return op;
      }));
    });

    socket.on('message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('intervention', (intervention) => {
      setInterventions(prev => [...prev, intervention]);
    });

    return () => {
      socket.off('operatorStatus');
      socket.off('streamStarted');
      socket.off('streamStopped');
      socket.off('message');
      socket.off('intervention');
    };
  }, []);

  const toggleStream = (operatorId) => {
    socket.emit(operators.find(op => op.id === operatorId).streaming ? 'stopStream' : 'startStream', operatorId);
  };

  const sendMessage = (operatorId, message) => {
    socket.emit('message', { from: 'Centrale', to: operatorId, text: message });
  };

  return (
    <div>
      <h2>Centrale Operativa</h2>
      <div className="operator-grid">
        {operators.map(op => (
          <div key={op.id} className="operator-window">
            <h3>Operatore {op.id}</h3>
            <p>Stato: {op.status}</p>
            <video ref={el => videoRefs.current[op.id] = el} autoPlay muted />
            <button onClick={() => toggleStream(op.id)}>
              {op.streaming ? 'Stop Stream' : 'Avvia Stream'}
            </button>
            <input 
              type="text" 
              placeholder="Invia messaggio"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  sendMessage(op.id, e.target.value);
                  e.target.value = '';
                }
              }}
            />
          </div>
        ))}
      </div>
      <div className="messages">
        <h3>Messaggi</h3>
        {messages.map((msg, index) => (
          <p key={index}>{msg.from} a {msg.to}: {msg.text}</p>
        ))}
      </div>
      <div className="interventions">
        <h3>Interventi</h3>
        {interventions.map((int, index) => (
          <p key={index}>Operatore {int.operatorId}: {int.text}</p>
        ))}
      </div>
    </div>
  );
}

function InterfacciaOperatore() {
  const [streaming, setStreaming] = useState(false);
  const [message, setMessage] = useState('');
  const [peer, setPeer] = useState(null);
  const videoRef = useRef();

  const toggleStream = () => {
    if (streaming) {
      if (peer) {
        peer.destroy();
        setPeer(null);
      }
      socket.emit('stopStream', 2);  // Assume operatorId is 2
      setStreaming(false);
    } else {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          const newPeer = new Peer({ initiator: true, trickle: false, stream });
          setPeer(newPeer);
          
          newPeer.on('signal', data => {
            socket.emit('startStream', { operatorId: 2, signalData: data });
          });

          newPeer.on('stream', stream => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          });

          setStreaming(true);
        })
        .catch(err => console.error('Error accessing media devices.', err));
    }
  };

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit('message', { from: 'Operatore 2', text: message });
      setMessage('');
    }
  };

  const registerIntervention = () => {
    socket.emit('intervention', { operatorId: 2, text: 'Nuovo intervento registrato' });
  };

  return (
    <div>
      <h2>Interfaccia Operatore</h2>
      <video ref={videoRef} autoPlay muted />
      <button onClick={toggleStream}>{streaming ? 'Stop Stream' : 'Start Stream'}</button>
      <div>
        <input 
          type="text" 
          value={message} 
          onChange={(e) => setMessage(e.target.value)} 
          placeholder="Scrivi un messaggio..." 
        />
        <button onClick={sendMessage}>Invia</button>
      </div>
      <button onClick={registerIntervention}>Registra Intervento</button>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole] = useState(localStorage.getItem('role'));

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
    }
  }, [token, role]);

  useEffect(() => {
    socket.on('notification', (message) => {
      alert(message);  // In una versione più avanzata, potresti usare una libreria di notifiche più sofisticata
    });

    return () => {
      socket.off('notification');
    };
  }, []);

  const handleLogout = () => {
    setToken(null);
    setRole(null);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
  };

  if (!token) {
    return <Login setToken={setToken} setRole={setRole} />;
  }

  return (
    <div className="container">
      <button onClick={handleLogout}>Logout</button>
      {role === 'admin' ? <CentraleOperativa /> : <InterfacciaOperatore />}
    </div>
  );
}

export default App;