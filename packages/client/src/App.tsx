import { useEffect, useState } from "react"


function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/hello')
      .then(response => response.json())
      .then(data => setMessage(data.message))
      .catch(error => console.error('Error fetching message:', error));
  }, []);

  return (
    <div>
      <h1>Message from API:</h1>
      <p className="font-bold p-4 text-3xl">{message}</p>
    </div>
  ); 
}

export default App
