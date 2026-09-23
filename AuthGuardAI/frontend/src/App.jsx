import { useState, useEffect } from "react";
import Login from "./Login.jsx";
import Dashboard from "./Dashboard.jsx";

function App() {
  const [user, setUser] = useState(null);

  useEffect(function () {
    const savedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLoginSuccess = function (userData) {
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = function () {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  if (user) {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  return <Login onLoginSuccess={handleLoginSuccess} />;
}

export default App;