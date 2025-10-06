import { createContext, useContext, useState, useEffect } from "react";
import api from "../lib/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({
    isLoggedIn: false,
    user: null,
    accessToken: null,
    refreshToken: null,
  });

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");
    const userStr = localStorage.getItem("user");

    if (token && refreshToken) {
      // Nếu có token nhưng chưa có user info, lấy thông tin user
      if (!userStr) {
        fetchUserInfo(token);
      } else {
        setAuth({
          isLoggedIn: true,
          user: JSON.parse(userStr),
          accessToken: token,
          refreshToken,
        });
      }
    }
  }, []);

  // Thêm hàm fetch user info
  const fetchUserInfo = async (token) => {
    try {
      const response = await api.get("/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const user = response.data;
      localStorage.setItem("user", JSON.stringify(user));
      setAuth((prev) => ({
        ...prev,
        isLoggedIn: true,
        user,
      }));
    } catch (error) {
      console.error("Error fetching user info:", error);
      logout();
    }
  };

  useEffect(() => {
    const syncAuth = () => {
      const token = localStorage.getItem("accessToken");
      const refreshToken = localStorage.getItem("refreshToken");
      const userStr = localStorage.getItem("user");

      if (token && refreshToken) {
        if (!userStr) {
          fetchUserInfo(token);
        } else {
          setAuth({
            isLoggedIn: true,
            user: JSON.parse(userStr),
            accessToken: token,
            refreshToken,
          });
        }
      } else {
        setAuth({
          isLoggedIn: false,
          user: null,
          accessToken: null,
          refreshToken: null,
        });
      }
    };
    window.addEventListener("storage", syncAuth);
    return () => window.removeEventListener("storage", syncAuth);
  }, []);

  const login = async ({ user, accessToken, refreshToken }) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);

    // Nếu có user info thì lưu luôn, không thì fetch
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
      setAuth({
        isLoggedIn: true,
        user,
        accessToken,
        refreshToken,
      });
    } else {
      // Trường hợp đăng nhập Google chỉ trả về token
      await fetchUserInfo(accessToken);
    }
  };

  const logout = () => {
    localStorage.clear();
    setAuth({
      isLoggedIn: false,
      user: null,
      accessToken: null,
      refreshToken: null,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        auth,
        isLoggedIn: auth.isLoggedIn,
        login,
        logout,
        user: auth.user,
        updateUser: (updatedUser) => {
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setAuth((prev) => ({ ...prev, user: updatedUser }));
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
