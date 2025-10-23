import { useNavigate } from "react-router-dom";
import { useState } from "react";
import api from "../lib/api";

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setFieldErrors({
        confirmPassword: "Passwords do not match",
      });
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/register", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.password,
      });

      navigate("/login");
    } catch (err) {
      const errorData = err.response?.data;
      const msg = errorData?.message;
      const fieldErrs = {};

      if (Array.isArray(msg)) {
        for (const entry of msg) {
          const field = entry.field || entry.path;
          const message = entry.error || entry.message;
          if (field) {
            fieldErrs[field] = message;
          } else {
            setError(message);
          }
        }
        setFieldErrors(fieldErrs);
      } else if (typeof msg === "string") {
        setError(msg);
      } else {
        setError("Registration failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-[80px] min-h-screen flex items-center justify-center bg-[#09090b] px-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md relative">
        <button
          onClick={() => navigate("/")}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl font-bold"
        >
          ✕
        </button>

        <h2 className="text-gray-900 font-bold mb-6 text-center text-2xl">
          Sign up for QuickShow
        </h2>

        {error && (
          <div className="text-red-500 text-sm text-center mb-4">{error}</div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">Username</label>
            <input
              type="text"
              name="name"
              placeholder="Enter your username"
              className={`w-full px-4 py-2 border ${
                fieldErrors.name ? "border-red-500" : "border-gray-300"
              } text-gray-900 placeholder:text-gray-400 rounded-xl`}
              value={formData.name}
              onChange={handleChange}
              required
            />
            {fieldErrors.name && (
              <p className="text-red-500 text-sm mt-1">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Email address</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              className={`w-full px-4 py-2 border ${
                fieldErrors.email ? "border-red-500" : "border-gray-300"
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
              placeholder="Create a password"
              className={`w-full px-4 py-2 border ${
                fieldErrors.password ? "border-red-500" : "border-gray-300"
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
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              className={`w-full px-4 py-2 border ${
                fieldErrors.confirmPassword
                  ? "border-red-500"
                  : "border-gray-300"
              } text-gray-900 placeholder:text-gray-400 rounded-xl`}
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-primary text-white py-2 rounded-xl transition ${
              loading
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-primary-dull"
            }`}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="text-sm text-center mt-4 text-gray-800">
          Already have an account?{" "}
          <a href="/login" className="text-primary hover:underline">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
};

export default Register;
