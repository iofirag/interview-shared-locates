import React, { useState, useEffect } from 'react';
import axios from 'axios';

const baseUrl = "https://9g7qfsq0qk.execute-api.us-east-1.amazonaws.com/v1/session";//"https://task.qspark.trade/v1/session";


const LocateRequests = () => {
  const [sessionId, setSessionId] = useState(null);
  const [locates, setLocates] = useState({});

  useEffect(() => {
    // Create a new session when the component mounts
    axios.post(baseUrl)
      .then(response => {
        setSessionId(response.data);
      })
      .catch(error => {
        console.error(error);
      });
  }, []);

  const handleRequestClick = () => {
    // Retrieve the locate requests when the button is clicked
    axios.get(`${baseUrl}/${sessionId}/locates`)
      .then(response => {
        console.log(response.data);
        setLocates(response.data);
      })
      .catch(error => {
        console.error(error);
      });
  };

  return (
    <div>
      <h1>Session ID: {sessionId}</h1>
      <button onClick={handleRequestClick}>Retrieve Locate Requests</button>
      <table>
        <thead>
          <tr>
            <th>Machine</th>
            <th>Symbol</th>
            <th>Locates</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(locates).map(([machine, symbols]) => (
              <>
              {Object.entries(symbols).map(([symbol, locates]) => (
                <tr>
                  <td>{machine}</td>
                  <td>{symbol}</td>
                  <td>{locates}</td>
                </tr>
              ))}
              </>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LocateRequests;

