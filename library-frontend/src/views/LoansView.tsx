import React, { useState } from "react";
import {
  Plus,
  CheckCircle2,
  Clock,
  BookOpen,
  User,
  Edit,
  Trash2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import api from "../api";
import Modal from "../components/Modal";

interface Loan {
  id: number;
  borrowedAt: string;
  dueDate: string;
  returnedAt: string | null;
  status: "BORROWED" | "RETURNED";
  renewals: number;
  overdue: boolean;
  daysLate: number;
  fine: number;
  userId: number;
  bookId: number;
  user?: { firstName: string; lastName: string };
  book?: { title: string };
}

interface BookOption {
  id: number;
  title: string;
  availableCopies: number;
}
interface UserOption {
  id: number;
  firstName: string;
  lastName: string;
}
interface LoansData {
  loans: Loan[];
  users: UserOption[];
  books: BookOption[];
}

const errorText = (error: unknown, fallback: string) => {
  const e = error as { response?: { data?: { message?: string | string[] } } };
  const msg = e.response?.data?.message;
  return (Array.isArray(msg) ? msg.join(", ") : msg) || fallback;
};

const LoansView = ({
  data,
  onRefresh,
  isAdmin,
}: {
  data: LoansData;
  onRefresh: () => void;
  isAdmin: boolean;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);

  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 14);

  const [formData, setFormData] = useState({
    userId: data.users[0]?.id || "",
    bookId:
      data.books.filter((b: BookOption) => b.availableCopies > 0)[0]?.id || "",
    dueDate: defaultDueDate.toISOString().split("T")[0],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReturn = async (id: number) => {
    if (!confirm("Confirmer le retour de ce livre ?")) return;
    try {
      await api.patch(`/loans/${id}`, { status: "RETURNED" });
      onRefresh();
    } catch (error) {
      alert(errorText(error, "Erreur lors du retour"));
    }
  };

  const handleRenew = async (id: number) => {
    try {
      await api.post(`/loans/${id}/renew`);
      onRefresh();
    } catch (error) {
      alert(errorText(error, "Renouvellement impossible"));
    }
  };

  const handleDelete = async (id: number) => {
    if (
      confirm(
        "Voulez-vous vraiment supprimer cet emprunt ? (Le livre redeviendra disponible)",
      )
    ) {
      try {
        await api.delete(`/loans/${id}`);
        onRefresh();
      } catch (error) {
        alert(errorText(error, "Erreur lors de la suppression"));
      }
    }
  };

  const handleEdit = (loan: Loan) => {
    setEditingLoan(loan);
    setFormData({
      userId: loan.userId,
      bookId: loan.bookId,
      dueDate: loan.dueDate.split("T")[0],
    });
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditingLoan(null);
    setFormData({
      userId: data.users[0]?.id || "",
      bookId:
        data.books.filter((b: BookOption) => b.availableCopies > 0)[0]?.id ||
        "",
      dueDate: defaultDueDate.toISOString().split("T")[0],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (editingLoan) {
        await api.patch(`/loans/${editingLoan.id}`, {
          dueDate: new Date(formData.dueDate).toISOString(),
        });
      } else {
        await api.post("/loans", {
          userId: formData.userId,
          bookId: formData.bookId,
          dueDate: new Date(formData.dueDate).toISOString(),
        });
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (error: unknown) {
      const e = error as {
        response?: { data?: { message?: string | string[] } };
      };
      const msg = e.response?.data?.message;
      alert(
        "Erreur: " + (Array.isArray(msg) ? msg.join(", ") : msg || "Inconnue"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="view-content">
      {isAdmin ? (
        <div className="view-actions">
          <button className="btn-primary" onClick={openNewModal}>
            <Plus size={18} /> Nouvel Emprunt
          </button>
        </div>
      ) : (
        <p className="info-note">
          Vos emprunts sont enregistrés au comptoir par un bibliothécaire. Vous pouvez renouveler un prêt (2 fois
          maximum) tant qu'il n'est pas en retard.
        </p>
      )}
      {data.loans.length === 0 && (
        <p className="empty-state">{isAdmin ? "Aucun emprunt pour le moment." : "Vous n'avez aucun emprunt."}</p>
      )}

      <div className="grid-list">
        {data.loans.map((loan: Loan) => (
          <div
            key={loan.id}
            className={`item-card loan-card ${loan.status.toLowerCase()}`}
          >
            <div className="loan-header">
              <span
                className={`status-pill ${loan.overdue ? "overdue" : loan.status.toLowerCase()}`}
              >
                {loan.status === "RETURNED"
                  ? "Rendu"
                  : loan.overdue
                    ? `En retard (${loan.daysLate} j)`
                    : "En cours"}
              </span>
              <p className="date">
                Le {new Date(loan.borrowedAt).toLocaleDateString()}
              </p>
            </div>

            <div className="loan-details">
              <div className="detail-item">
                <BookOpen size={16} />
                <span>{loan.book?.title}</span>
              </div>
              {isAdmin && (
                <div className="detail-item">
                  <User size={16} />
                  <span>
                    {loan.user?.firstName} {loan.user?.lastName}
                  </span>
                </div>
              )}
              {loan.fine > 0 && (
                <div className="detail-item fine">
                  <AlertTriangle size={16} />
                  <span>Amende : {loan.fine.toFixed(2)} €</span>
                </div>
              )}
              {loan.status === "BORROWED" && (
                <div className="detail-item">
                  <RefreshCw size={16} />
                  <span>Renouvelé {loan.renewals} / 2 fois</span>
                </div>
              )}
            </div>

            <div
              className="loan-footer"
              style={{
                borderTop: "1px solid #e2e8f0",
                paddingTop: "0.75rem",
                marginTop: "0.75rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div className="due-date">
                <Clock size={14} />
                <span>
                  Échéance : {new Date(loan.dueDate).toLocaleDateString()}
                </span>
              </div>
              <div
                className="item-actions"
                style={{
                  position: "relative",
                  right: "0",
                  top: "0",
                  opacity: 1,
                  visibility: "visible",
                  margin: 0,
                  padding: 0,
                }}
              >
                {loan.status === "BORROWED" && !loan.overdue && (
                  <button
                    className="btn-icon"
                    style={{ color: "#3b82f6" }}
                    onClick={() => handleRenew(loan.id)}
                    title="Renouveler de 14 jours"
                  >
                    <RefreshCw size={16} />
                  </button>
                )}
                {isAdmin && loan.status === "BORROWED" && (
                  <button
                    className="btn-icon"
                    style={{ color: "#10b981" }}
                    onClick={() => handleReturn(loan.id)}
                    title="Enregistrer le retour"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                )}
                {isAdmin && loan.status === "BORROWED" && (
                  <button
                    className="btn-icon edit"
                    onClick={() => handleEdit(loan)}
                    title="Modifier la date de retour"
                  >
                    <Edit size={16} />
                  </button>
                )}
                {isAdmin && (
                  <button
                    className="btn-icon delete"
                    onClick={() => handleDelete(loan.id)}
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLoan ? "Modifier l'Emprunt" : "Nouvel Emprunt"}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Membre emprunteur</label>
            <select
              value={formData.userId}
              onChange={(e) =>
                setFormData({ ...formData, userId: parseInt(e.target.value) })
              }
              required
              disabled={!!editingLoan}
            >
              {data.users.map((u: UserOption) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Livre à emprunter</label>
            <select
              value={formData.bookId}
              onChange={(e) =>
                setFormData({ ...formData, bookId: parseInt(e.target.value) })
              }
              disabled={!!editingLoan}
              required
            >
              {editingLoan && (
                <option value={editingLoan.bookId}>
                  {editingLoan.book?.title || "Livre actuel"}
                </option>
              )}
              {!editingLoan &&
                data.books
                  .filter((b: BookOption) => b.availableCopies > 0)
                  .map((b: BookOption) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.availableCopies} dispo)
                    </option>
                  ))}
            </select>
            {editingLoan && (
              <small style={{ color: "#64748b" }}>
                Le livre d'un emprunt existant ne peut pas être modifié.
              </small>
            )}
          </div>
          <div className="form-group">
            <label>Date d'échéance prévue</label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) =>
                setFormData({ ...formData, dueDate: e.target.value })
              }
              required
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {editingLoan
                ? "Enregistrer les modifications"
                : "Confirmer l'emprunt"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LoansView;
