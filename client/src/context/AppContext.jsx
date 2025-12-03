import { createContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export const AppContext = createContext();

const AppContextProvider = (props) => {
  const backendURL = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();
  
  // Initialize from localStorage if available
  const storedUser = localStorage.getItem("user");
  const storedCredit = localStorage.getItem("credit");
  const storedToken = localStorage.getItem("token");
  
  const [user, setUser] = useState(storedUser ? JSON.parse(storedUser) : null);
  const [showLogin, setShowLogin] = useState(false);
  const [token, setToken] = useState(storedToken);
  const [credit, setCredit] = useState(storedCredit ? parseInt(storedCredit) : 0);
  const [loading, setLoading] = useState(!!storedToken);

  const loadCreditsData = async () => {
    try {
      if (!token) {
        setLoading(false);
        return;
      }

      const { data } = await axios.get(backendURL + "/api/user/credits", {
        headers: { token },
      });
      
      if (data.success) {
        const newCredit = data.credits;
        const userData = {
          name: data.user.name,
          creditBalance: newCredit
        };
        
        // Update state
        setCredit(newCredit);
        setUser(userData);
        
        // Save to localStorage
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("credit", newCredit.toString());
        
        console.log("Credits loaded:", newCredit); // Debug log
      }
    } catch (error) {
      console.error("Error loading credits:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateImage = async (prompt) => {
    try {
      const { data } = await axios.post(
        backendURL + "/api/image/generate-image",
        { prompt },
        { headers: { token } }
      );
      
      if (data.success) {
        // Update credit from backend response
        if (typeof data.creditBalance === "number") {
          const newCredit = data.creditBalance;
          setCredit(newCredit);
          setUser(prev => ({ ...prev, creditBalance: newCredit }));
          
          // Update localStorage
          localStorage.setItem("credit", newCredit.toString());
          const updatedUser = { ...user, creditBalance: newCredit };
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
        return data.resultImage;
      } else {
        toast.error(data.message);
        
        // Sync credit on failure
        if (typeof data.creditBalance === "number") {
          const newCredit = data.creditBalance;
          setCredit(newCredit);
          setUser(prev => ({ ...prev, creditBalance: newCredit }));
          
          // Update localStorage
          localStorage.setItem("credit", newCredit.toString());
          const updatedUser = { ...user, creditBalance: newCredit };
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
        
        if (data.creditBalance === 0) {
          navigate("/buy");
        }
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error(error.message);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("credit");
    setToken("");
    setUser(null);
    setCredit(0);
    setLoading(false);
  };

  // Load credits when token changes
  useEffect(() => {
    if (token) {
      loadCreditsData();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Sync token to localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  const value = {
    user,
    setUser,
    showLogin,
    setShowLogin,
    backendURL,
    token,
    setToken,
    credit,
    setCredit,
    loadCreditsData,
    logout,
    generateImage,
    loading,
  };

  return (
    <AppContext.Provider value={value}>
      {props.children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;