import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast, Toaster } from "react-hot-toast";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setFormError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFormError("");
    setFieldErrors({});

    try {
      const res = await api.post("/auth/login", {
        email: formData.email,
        password: formData.password,
      });

      const { accessToken, refreshToken, user } = res.data;

      login({ user, accessToken, refreshToken });
      toast.success("Đăng nhập thành công!");

      // Điều hướng theo roleId
      // Ưu tiên quay lại trang gốc nếu có (ví dụ từ trang chọn ghế)
      if (location.state?.from) {
        navigate(location.state.from, {
          state: { selectedSeats: location.state.selectedSeats },
          replace: true,
        });
      } else {
        // Tất cả user (bao gồm admin) đều về trang chủ
        navigate("/");
      }
    } catch (err) {
      const errorData = err.response?.data;
      const fieldErrs = {};

      if (Array.isArray(errorData?.message)) {
        for (const entry of errorData.message) {
          if (entry.path || entry.field) {
            const field = entry.path || entry.field;
            const msg = entry.message || entry.error;
            fieldErrs[field] = msg;
          } else if (entry.message) {
            setFormError(entry.message);
          }
        }
        setFieldErrors(fieldErrs);
      } else if (typeof errorData?.message === "string") {
        setFormError(errorData.message);
      } else {
        setFormError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center background-color">
      <Toaster position="top-center" />
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md relative">
        <button
          onClick={() => navigate("/")}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl font-bold"
        >
          ✕
        </button>

        <h2 className="text-gray-900 font-bold mb-6 text-center text-2xl">
          Log in to QuickShow
        </h2>

        {formError && (
          <div className="text-red-500 text-sm mb-4 text-center">
            {formError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">Email address</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email address"
              className={`w-full px-4 py-2 border ${fieldErrors.email ? "border-red-500" : "border-gray-300"
                } text-gray-900 placeholder:text-gray-400 rounded-xl`}
              value={formData.email}
              onChange={handleChange}
              required
            />
            {fieldErrors.email && (
              <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              className={`w-full px-4 py-2 border ${fieldErrors.password ? "border-red-500" : "border-gray-300"
                } text-gray-900 placeholder:text-gray-400 rounded-xl`}
              value={formData.password}
              onChange={handleChange}
              required
            />
            {fieldErrors.password && (
              <p className="text-red-500 text-sm mt-1">
                {fieldErrors.password}
              </p>
            )}
            <div className="text-right mt-1">
              <a
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </a>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-primary text-white py-2 rounded-xl transition ${loading
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-primary-dull"
              }`}
          >
            {loading ? "Logging in..." : "Log in"}
          </button>

          <div className="mt-4">
            <button
              type="button"
              onClick={async () => {
                try {
                  // Gọi backend để lấy URL Google OAuth
                  const res = await api.get("/auth/google-link");
                  const { url } = res.data;
                  window.location.href = url; // Redirect sang Google
                } catch (error) {
                  toast.error("Không thể kết nối Google Login!");
                }
              }}
              className="w-full border border-gray-300 py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 transition"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-5 h-5"
              />
              <span className="text-gray-700">Đăng nhập với Google</span>
            </button>
          </div>
        </form>

        <p className="text-sm text-center mt-4 text-gray-800">
          Don't have an account?{" "}
          <a href="/register" className="text-primary hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
