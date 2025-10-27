import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// VITE Environment Variable: Note the 'import.meta.env.VITE_API_URL' syntax
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function App() {
  const [visitors, setVisitors] = useState([]);
  const [name, setName] = useState('');
  const [outboundIp, setOutboundIp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Function to fetch all visitors
  const fetchVisitors = async () => {
    try {
      setError('');
      setLoading(true);
      const response = await axios.get(`${API_URL}/visitors`);
      setVisitors(response.data);
    } catch (err) {
      setError('Failed to fetch visitors.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch visitors on initial component load
  useEffect(() => {
    fetchVisitors();
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return;
    try {
      setError('');
      await axios.post(`${API_URL}/visitors`, { name });
      setName(''); // Clear input box
      fetchVisitors(); // Refresh the list
    } catch (err) {
      setError('Failed to add visitor.');
      console.error(err);
    }
  };

  // Handle the outbound IP check
  const checkIp = async () => {
    try {
      setError('');
      setOutboundIp('Checking...');
      const response = await axios.get(`${API_URL}/check-ip`);
      setOutboundIp(`Server's Public IP: ${response.data.ip}`);
    } catch (err) {
      setError('Failed to check IP.');
      setOutboundIp('');
      console.error(err);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Visitor Log</h1>

        {/* Form to add a new visitor */}
        <form onSubmit={handleSubmit} className="visitor-form">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
          />
          <button type="submit">Sign In</button>
        </form>

        {/* Display error messages */}
        {error && <p className="error">{error}</p>}

        {/* Button to test NAT Gateway */}
        <div className="ip-check">
          <button onClick={checkIp}>Test Outbound Connection</button>
          {outboundIp && <p>{outboundIp}</p>}
        </div>

        {/* List of visitors */}
        <div className="visitor-list">
          <h2>Signed In:</h2>
          {loading ? <p>Loading...</p> : (
            <ul>
              {visitors.map((visitor, index) => (
                <li key={index}>{visitor.name}</li>
              ))}
            </ul>
          )}
        </div>

      </header>
    </div>
  );
}

export default App;