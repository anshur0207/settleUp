"use client";

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { GoogleLogin } from '@react-oauth/google';

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [activeTab, setActiveTab] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const touristImages = [
    "https://loremflickr.com/1200/800/india?random=1",
    "https://loremflickr.com/1200/800/nepal?random=2",
    "https://loremflickr.com/1200/800/himalayas?random=3",
    "https://loremflickr.com/1200/800/ladakh?random=4",
    "https://loremflickr.com/1200/800/spiti?random=5",
    "https://loremflickr.com/1200/800/goa?random=6"
  ];
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  useEffect(() => {
    if (location.pathname === "/signup") {
      setActiveTab("signup");
    } else {
      setActiveTab("login");
    }
  }, [location.pathname]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImgIndex((prev) => (prev + 1) % touristImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [touristImages.length]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError("");
    setForm({ name: "", email: "", password: "", confirm: "" });
    navigate(tab === "login" ? "/login" : "/signup");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (activeTab === "signup") {
        if (!form.name.trim()) {
          setError("Name cannot be blank");
          setLoading(false);
          return;
        }
        if (!/^[A-Za-z\s]+$/.test(form.name.trim())) {
          setError("Name can only contain alphabets and spaces");
          setLoading(false);
          return;
        }
        if (!/^(?=.*[!@#$%^&*(),.?":{}|<>]).{6,}$/.test(form.password)) {
          setError("Password must be at least 6 characters and include a special character");
          setLoading(false);
          return;
        }
        if (!form.email.toLowerCase().trim().endsWith('@gmail.com')) {
          setError('Only @gmail.com emails are allowed for signup');
          setLoading(false);
          return;
        }
        if (form.password !== form.confirm) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }

        const response = await api.post("auth/signup", {
          name: form.name,
          email: form.email,
          password: form.password,
        });

        login(response.data);
      } else {
        const response = await api.post("auth/login", {
          email: form.email,
          password: form.password,
        });

        login(response.data);
      }

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Unable to authenticate"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.post('auth/google', { credential: credentialResponse.credential });
      login(response.data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Google Auth failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google Auth failed');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 flex flex-col w-full">
        {/* Navbar */}
        <nav className="grid grid-cols-2 lg:grid-cols-3 items-center px-6 md:px-12 py-6 border-b border-gray-100 shrink-0">
          <Link to="/" className="flex items-center gap-4">
            <img src="/logo.png?v=1" alt="SettleUp Logo" className="w-12 h-12 object-contain" />

            <h1 className="text-3xl font-black">
              Settle<span className="text-emerald-500">Up</span>
            </h1>
          </Link>


          <div className="hidden lg:block"></div>
        </nav>

        <div className="grid lg:grid-cols-2 flex-1">
          {/* Left Section */}
          <div className="bg-[#f3faf5] p-8 md:p-16 flex flex-col justify-between order-2 lg:order-1">
            <div>
              <h1 className="text-5xl md:text-7xl font-black leading-tight text-gray-900">
                Split expenses.
                <br />
                Track easily.
                <br />
                <span className="text-emerald-500">Settle instantly.</span>
              </h1>

              <p className="mt-8 text-xl text-gray-600 leading-relaxed max-w-xl">
                SettleUp makes sharing expenses with friends simple, fair and stress-free.
              </p>

              <div className="mt-14 space-y-8">
                <Feature
                  icon={<span className="text-emerald-600 text-3xl">👥</span>}
                  title="Split with anyone"
                  desc="Friends, trips, roommates & more"
                />

                <Feature
                  icon={<span className="text-emerald-600 text-3xl">📊</span>}
                  title="Track every expense"
                  desc="See who owes and who gets"
                />

                <Feature
                  icon={<span className="text-emerald-600 text-3xl">🛡️</span>}
                  title="Settle stress free"
                  desc="Clear balances, happy relationships"
                />
              </div>
            </div>

            <div className="mt-10 flex-1 relative min-h-[300px]">
              {touristImages.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt="Tourist destination"
                  className={`absolute inset-0 w-full h-full object-cover rounded-[32px] shadow-xl transition-opacity duration-1000 ${idx === currentImgIndex ? "opacity-100" : "opacity-0"
                    }`}
                />
              ))}
            </div>
          </div>

          {/* Right Section */}
          <div className="p-8 md:p-16 flex flex-col justify-start bg-white pt-10 md:pt-16 order-1 lg:order-2">
            <div>
              <h1 className="text-5xl font-black text-gray-900">Welcome Back 👋</h1>

              <p className="mt-4 text-xl text-gray-500">
                {activeTab === "login"
                  ? "Login to continue to your account"
                  : "Create a new account to start settling up"}
              </p>
            </div>

            <div className="mt-12 flex border-b border-gray-200">
              <button
                onClick={() => handleTabChange("login")}
                className={`pb-4 w-36 text-xl font-bold transition ${activeTab === "login"
                  ? "text-emerald-600 border-b-4 border-emerald-500"
                  : "text-gray-400"
                  }`}
              >
                Login
              </button>

              <button
                onClick={() => handleTabChange("signup")}
                className={`pb-4 w-36 text-xl font-bold transition ${activeTab === "signup"
                  ? "text-emerald-600 border-b-4 border-emerald-500"
                  : "text-gray-400"
                  }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-10 space-y-6">
              {activeTab === "signup" && (
                <InputField
                  label="Full Name"
                  placeholder="Enter your name"
                  value={form.name}
                  onChange={(value) => setForm({ ...form, name: value })}
                />
              )}

              <InputField
                label="Email Address"
                placeholder="Email address"
                value={form.email}
                onChange={(value) => setForm({ ...form, email: value })}
                type="email"
              />

              <InputField
                label="Password"
                placeholder="Password"
                value={form.password}
                onChange={(value) => setForm({ ...form, password: value })}
                type="password"
              />

              {activeTab === "signup" && (
                <InputField
                  label="Confirm Password"
                  placeholder="Confirm password"
                  value={form.confirm}
                  onChange={(value) => setForm({ ...form, confirm: value })}
                  type="password"
                />
              )}

              {activeTab === "login" && (
                <div className="flex justify-end">
                  <Link to="/forgot" className="text-emerald-600 font-semibold hover:underline">
                    Forgot Password?
                  </Link>
                </div>
              )}

              {error && <p className="text-sm text-rose-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-600 transition text-white text-xl font-bold shadow-lg disabled:opacity-60"
              >
                {loading
                  ? activeTab === "login"
                    ? "Logging in..."
                    : "Creating account..."
                  : activeTab === "login"
                    ? "Login"
                    : "Create Account"}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-slate-500">
                    {activeTab === "login" ? "Or continue with" : "Or sign up with"}
                  </span>
                </div>
              </div>
              <div className="mt-6 flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  ux_mode="redirect"
                  text={activeTab === "login" ? "signin_with" : "signup_with"}
                />
              </div>
            </div>

            <p className="text-center text-gray-500 pt-8">
              {activeTab === "login"
                ? "Don't have an account?"
                : "Already have an account?"}
              <button
                onClick={() => handleTabChange(activeTab === "login" ? "signup" : "login")}
                className="ml-2 text-emerald-600 font-semibold hover:underline"
              >
                {activeTab === "login" ? "Sign Up" : "Login"}
              </button>
            </p>
          </div>
        </div>
      </div>

      <footer className="w-full bg-white border-t border-gray-100 py-6 text-center text-sm text-slate-500 shrink-0">
        <p>Built with SettleUp • Manage expenses, friends, and groups in one place.</p>
        <p className="mt-2">© {new Date().getFullYear()} SettleUp. All rights reserved.</p>
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div className="flex items-start gap-5">
      <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
        {icon}
      </div>

      <div>
        <h3 className="text-2xl font-bold">{title}</h3>
        <p className="text-gray-500 text-lg mt-1">{desc}</p>
      </div>
    </div>
  );
}

function InputField({
  label,
  placeholder,
  icon,
  rightIcon,
  value,
  onChange,
  type = "text",
}) {
  return (
    <div>
      <label className="block mb-3 font-semibold text-gray-700">{label}</label>

      <div className="relative">
        {icon && (
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}

        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`w-full h-16 rounded-2xl border border-gray-200 bg-white text-lg focus:outline-none focus:ring-4 focus:ring-emerald-100 ${icon ? "pl-14" : "pl-5"
            } ${rightIcon ? "pr-14" : "pr-5"}`}
        />

        {rightIcon && (
          <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer">
            {rightIcon}
          </div>
        )}
      </div>
    </div>
  );
}
