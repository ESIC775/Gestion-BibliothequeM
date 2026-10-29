import { useState, useEffect, type ElementType } from "react";
import {
  BookOpen,
  Users,
  UserCircle,
  Library,
  Search,
  User as UserIcon,
  Clock,
  LayoutDashboard,
  RefreshCcw,
  LogOut,
  CalendarDays,
  AlertTriangle,
  PackageCheck,
  Euro,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "./api";
import "./App.css";

// Views
import BooksView from "./views/BooksView";
import AuthorsView from "./views/AuthorsView";
import UsersView from "./views/UsersView";
import LoansView from "./views/LoansView";
import LoginView from "./views/LoginView";
import ReservationsView from "./views/ReservationsView.tsx";

type View =
  | "dashboard"
  | "books"
  | "authors"
  | "users"
  | "loans"
  | "reservations";

export interface AppUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "MEMBER";
}
interface Loan {
  id: number;
  status: "BORROWED" | "RETURNED";
  borrowedAt: string;
  dueDate: string;
  returnedAt: string | null;
  renewals: number;
  overdue: boolean;
  daysLate: number;
  fine: number;
  userId: number;
  bookId: number;
  user?: { firstName: string; lastName: string };
  book?: { title: string };
}
interface Reservation {
  id: number;
  status: "PENDING" | "READY" | "COMPLETED" | "CANCELLED" | "EXPIRED";
  reservedAt: string;
  expiresAt: string | null;
  queuePosition?: number;
  userId: number;
  bookId: number;
  user?: { firstName: string; lastName: string };
  book?: { title: string };
}
interface AppData {
  books: {
    id: number;
    title: string;
    isbn: string;
    publishedYear: number;
    totalCopies: number;
    availableCopies: number;
    summary: string;
    categoryId: number;
    coverUrl?: string;
    category?: { name: string };
    authors?: { id: number; firstName: string; lastName: string }[];
  }[];
  authors: { id: number; firstName: string; lastName: string; bio: string }[];
  users: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role?: "ADMIN" | "MEMBER";
    profile?: { address: string; phone: string; membershipNumber: string };
  }[];
  loans: Loan[];
  reservations: Reservation[];
  categories: { id: number; name: string }[];
}

/** Récupère la session sauvegardée (uniquement si elle contient un rôle : anciennes sessions ignorées). */
const readSavedUser = (): AppUser | null => {
  try {
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");
    if (!savedUser || !savedToken) return null;
    const parsed = JSON.parse(savedUser);
    return parsed?.role ? parsed : null;
  } catch {
    return null;
  }
};

function App() {
  const [user, setUser] = useState<AppUser | null>(readSavedUser);
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [data, setData] = useState<AppData>({
    books: [],
    authors: [],
    users: [],
    loans: [],
    reservations: [],
    categories: [],
  });
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (user) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // La liste des membres est réservée aux bibliothécaires.
      const noUsers = Promise.resolve({ data: [] });
      const [booksRes, authorsRes, usersRes, loansRes, resRes, catsRes] =
        await Promise.all([
          api.get("/books"),
          api.get("/authors"),
          isAdmin ? api.get("/users") : noUsers,
          api.get("/loans"),
          api.get("/reservations"),
          api.get("/categories"),
        ]);
      setData({
        books: booksRes.data,
        authors: authorsRes.data,
        users: usersRes.data,
        loans: loansRes.data,
        reservations: resRes.data,
        categories: catsRes.data,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setCurrentView("dashboard");
    setUser(null);
  };

  if (!user) {
    return <LoginView onLogin={(u) => setUser(u)} />;
  }

  const SidebarItem = ({
    id,
    icon: Icon,
    label,
  }: {
    id: View;
    icon: ElementType;
    label: string;
  }) => (
    <button
      onClick={() => setCurrentView(id)}
      className={`sidebar-item ${currentView === id ? "active" : ""}`}
    >
      <Icon size={20} />
      <span>{label}</span>
      {currentView === id && (
        <motion.div layoutId="active-pill" className="active-pill" />
      )}
    </button>
  );

  const titles: Record<View, string> = isAdmin
    ? {
        dashboard: "Tableau de Bord",
        books: "Gestion des Livres",
        authors: "Gestion des Auteurs",
        users: "Gestion des Membres",
        loans: "Gestion des Emprunts",
        reservations: "Gestion des Réservations",
      }
    : {
        dashboard: "Mon Espace",
        books: "Catalogue",
        authors: "Auteurs",
        users: "Membres",
        loans: "Mes Emprunts",
        reservations: "Mes Réservations",
      };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <Library className="logo-icon" />
            <h1>Gestion de Bibliothèque</h1>
          </div>
        </div>

        <nav className="sidebar-nav">
          <SidebarItem
            id="dashboard"
            icon={LayoutDashboard}
            label={isAdmin ? "Tableau de Bord" : "Mon Espace"}
          />
          <div className="nav-divider">
            {isAdmin ? "Gestion" : "Bibliothèque"}
          </div>
          <SidebarItem
            id="books"
            icon={BookOpen}
            label={isAdmin ? "Livres" : "Catalogue"}
          />
          {isAdmin && (
            <>
              <SidebarItem id="authors" icon={UserCircle} label="Auteurs" />
              <SidebarItem id="users" icon={Users} label="Membres" />
            </>
          )}
          <SidebarItem
            id="loans"
            icon={Clock}
            label={isAdmin ? "Emprunts" : "Mes emprunts"}
          />
          <SidebarItem
            id="reservations"
            icon={CalendarDays}
            label={isAdmin ? "Réservations" : "Mes réservations"}
          />
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-pill">
              <UserIcon size={16} />
              <span>
                {user.firstName}
                {isAdmin ? " (bibliothécaire)" : ""}
              </span>
            </div>
            <button className="btn-logout" onClick={logout} title="Déconnexion">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h2>{titles[currentView]}</h2>
          <div className="header-actions">
            <div className="search-bar">
              <Search size={18} />
              <input type="text" placeholder="Rechercher..." />
            </div>
            <button className="btn-primary" onClick={() => fetchData()}>
              <RefreshCcw size={18} />
              <span>Actualiser</span>
            </button>
          </div>
        </header>

        <div className="content-body">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="loader-container"
              >
                <div className="loader"></div>
              </motion.div>
            ) : (
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="view-container"
              >
                {currentView === "dashboard" && (
                  <DashboardView data={data} isAdmin={isAdmin} />
                )}
                {currentView === "books" && (
                  <BooksView
                    data={data}
                    onRefresh={fetchData}
                    isAdmin={isAdmin}
                  />
                )}
                {currentView === "authors" && isAdmin && (
                  <AuthorsView data={data} onRefresh={fetchData} />
                )}
                {currentView === "users" && isAdmin && (
                  <UsersView data={data} onRefresh={fetchData} />
                )}
                {currentView === "loans" && (
                  <LoansView
                    data={data}
                    onRefresh={fetchData}
                    isAdmin={isAdmin}
                  />
                )}
                {currentView === "reservations" && (
                  <ReservationsView
                    data={data}
                    onRefresh={fetchData}
                    isAdmin={isAdmin}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

const DashboardView = ({
  data,
  isAdmin,
}: {
  data: AppData;
  isAdmin: boolean;
}) => {
  const borrowed = data.loans.filter((l: Loan) => l.status === "BORROWED");
  const overdue = borrowed.filter((l: Loan) => l.overdue);
  const ready = data.reservations.filter((r) => r.status === "READY");
  const waiting = data.reservations.filter((r) => r.status === "PENDING");
  const fines = data.loans.reduce((sum, l) => sum + (l.fine || 0), 0);

  return (
    <div className="fade-in">
      <div className="dashboard-grid">
        <StatCard
          icon={BookOpen}
          label={isAdmin ? "Livres" : "Livres au catalogue"}
          count={data.books.length}
          color="#3b82f6"
        />
        {isAdmin && (
          <StatCard
            icon={Users}
            label="Membres"
            count={data.users.length}
            color="#10b981"
          />
        )}
        <StatCard
          icon={Clock}
          label={isAdmin ? "Emprunts en cours" : "Mes emprunts en cours"}
          count={borrowed.length}
          color="#f59e0b"
        />
        <StatCard
          icon={AlertTriangle}
          label="En retard"
          count={overdue.length}
          color="#dc2626"
        />
        {isAdmin && (
          <StatCard
            icon={LayoutDashboard}
            label="Retours effectués"
            count={data.loans.filter((l: Loan) => l.status === "RETURNED").length}
            color="#8b5cf6"
          />
        )}
        <StatCard
          icon={PackageCheck}
          label="Réservations à retirer"
          count={ready.length}
          color="#16a34a"
        />
        <StatCard
          icon={CalendarDays}
          label="En file d'attente"
          count={waiting.length}
          color="#ec4899"
        />
        {fines > 0 && (
          <StatCard
            icon={Euro}
            label={isAdmin ? "Amendes cumulées (€)" : "Mes amendes (€)"}
            count={Number(fines.toFixed(2))}
            color="#dc2626"
          />
        )}
      </div>

      <div className="rules-box">
        <h3>Règles de la bibliothèque</h3>
        <ul>
          <li>Un prêt dure <strong>14 jours</strong>, avec <strong>3 livres</strong> maximum en même temps.</li>
          <li>Chaque prêt peut être renouvelé <strong>2 fois</strong> (+14 jours), sauf s'il est en retard ou réservé par quelqu'un d'autre.</li>
          <li>Un livre réservé et disponible est mis de côté <strong>3 jours</strong> au comptoir. Sinon, vous entrez dans la file d'attente.</li>
          <li>Retard : <strong>0,20 € par jour</strong>. Tant qu'un livre est en retard, il est impossible d'emprunter ou de réserver.</li>
          <li>Les prêts sont enregistrés au comptoir par un bibliothécaire.</li>
        </ul>
      </div>
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  count,
  color,
}: {
  icon: ElementType;
  label: string;
  count: number;
  color: string;
}) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ backgroundColor: `${color}15`, color }}>
      <Icon size={24} />
    </div>
    <div className="stat-info">
      <span className="stat-label">{label}</span>
      <span className="stat-count">{count}</span>
    </div>
  </div>
);

export default App;
