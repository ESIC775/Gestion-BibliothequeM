import { useState } from "react";
import { Library, Mail, Lock, LogIn, AlertCircle, User, UserPlus } from "lucide-react";
import api from "../api";
import { motion } from "framer-motion";
import type { AppUser } from "../App";

interface LoginViewProps {
  onLogin: (user: AppUser) => void;
}

const LoginView = ({ onLogin }: LoginViewProps) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response =
        mode === "login"
          ? await api.post("/auth/login", { email, password })
          : await api.post("/auth/register", {
              firstName,
              lastName,
              email,
              password,
            });
      localStorage.setItem("token", response.data.access_token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      onLogin(response.data.user);
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { message?: string | string[] } };
      };
      const msg = e.response?.data?.message;
      setError(
        (Array.isArray(msg) ? msg.join(", ") : msg) ||
          (mode === "login" ? "Identifiants invalides" : "Inscription impossible"),
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
  };

  return (
    <div className="login-container">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="login-card"
      >
        <div className="login-header">
          <Library className="logo-icon" size={48} />
          <h1>Gestion de Bibliothèque</h1>
          <p>
            {mode === "login"
              ? "Connectez-vous pour accéder à la bibliothèque"
              : "Créez votre compte adhérent"}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="error-alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {mode === "register" && (
            <>
              <div className="form-group">
                <label>Prénom</label>
                <div className="input-with-icon">
                  <User size={18} />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Sarah"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Nom</label>
                <div className="input-with-icon">
                  <User size={18} />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Martin"
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label>Email</label>
            <div className="input-with-icon">
              <Mail size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              Mot de passe{mode === "register" ? " (6 caractères minimum)" : ""}
            </label>
            <div className="input-with-icon">
              <Lock size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={mode === "register" ? 6 : undefined}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? (
              <div className="loader small"></div>
            ) : mode === "login" ? (
              <>
                <LogIn size={18} /> Connexion
              </>
            ) : (
              <>
                <UserPlus size={18} /> Créer mon compte
              </>
            )}
          </button>

          <button type="button" className="link-button" onClick={switchMode}>
            {mode === "login"
              ? "Pas encore de compte ? S'inscrire"
              : "Déjà inscrit ? Se connecter"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default LoginView;
