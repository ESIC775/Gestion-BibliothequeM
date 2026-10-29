import { useState } from 'react';
import { CalendarDays, Trash2, XCircle, CheckCircle, PackageCheck, Hourglass } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api';

type Status = 'PENDING' | 'READY' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

interface Reservation {
  id: number;
  status: Status;
  reservedAt: string;
  expiresAt: string | null;
  queuePosition?: number;
  userId: number;
  bookId: number;
  user?: { firstName: string; lastName: string };
  book?: { title: string };
}

interface ReservationsViewProps {
  data: {
    reservations: Reservation[];
  };
  onRefresh: () => void;
  isAdmin: boolean;
}

const LABELS: Record<Status, string> = {
  PENDING: "En file d'attente",
  READY: 'Prêt à retirer',
  COMPLETED: 'Retiré',
  CANCELLED: 'Annulée',
  EXPIRED: 'Expirée',
};

const errorMessage = (error: unknown, fallback: string) => {
  const e = error as { response?: { data?: { message?: string | string[] } } };
  const msg = e.response?.data?.message;
  return (Array.isArray(msg) ? msg.join(', ') : msg) || fallback;
};

const ReservationsView = ({ data, onRefresh, isAdmin }: ReservationsViewProps) => {
  const [loading, setLoading] = useState<number | null>(null);

  const handleCancel = async (id: number) => {
    if (!window.confirm('Voulez-vous vraiment annuler cette réservation ?')) return;
    setLoading(id);
    try {
      await api.patch(`/reservations/${id}/cancel`);
      onRefresh();
    } catch (error) {
      alert(errorMessage(error, "Erreur lors de l'annulation"));
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Supprimer définitivement cette réservation ?')) return;
    setLoading(id);
    try {
      await api.delete(`/reservations/${id}`);
      onRefresh();
    } catch (error) {
      alert(errorMessage(error, 'Erreur lors de la suppression'));
    } finally {
      setLoading(null);
    }
  };

  const detail = (res: Reservation) => {
    if (res.status === 'READY' && res.expiresAt) {
      return `À retirer au comptoir avant le ${new Date(res.expiresAt).toLocaleDateString()}`;
    }
    if (res.status === 'PENDING' && res.queuePosition) {
      return `Position ${res.queuePosition} dans la file`;
    }
    return '';
  };

  return (
    <div className="view-content">
      {!isAdmin && (
        <p className="info-note">
          Quand votre livre est « prêt à retirer », passez au comptoir : un bibliothécaire enregistrera votre
          emprunt.
        </p>
      )}
      <div className="table-container fade-in">
        <table className="data-table">
          <thead>
            <tr>
              <th>Livre</th>
              {isAdmin && <th>Membre</th>}
              <th>Date de Réservation</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.reservations.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="empty-state">
                  Aucune réservation trouvée
                </td>
              </tr>
            ) : (
              data.reservations.map((res) => (
                <motion.tr key={res.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td>
                    <div className="book-info-cell">
                      <span className="book-title">{res.book?.title || 'Livre inconnu'}</span>
                    </div>
                  </td>
                  {isAdmin && (
                    <td>{res.user ? `${res.user.firstName} ${res.user.lastName}` : 'Utilisateur inconnu'}</td>
                  )}
                  <td>{new Date(res.reservedAt).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge ${res.status.toLowerCase()}`}>
                      {res.status === 'PENDING' && <Hourglass size={14} />}
                      {res.status === 'READY' && <PackageCheck size={14} />}
                      {(res.status === 'CANCELLED' || res.status === 'EXPIRED') && <XCircle size={14} />}
                      {res.status === 'COMPLETED' && <CheckCircle size={14} />}
                      {LABELS[res.status]}
                    </span>
                    {detail(res) && <div className="status-detail">{detail(res)}</div>}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {(res.status === 'PENDING' || res.status === 'READY') && (
                        <button
                          className="btn-icon btn-warning"
                          onClick={() => handleCancel(res.id)}
                          disabled={loading === res.id}
                          title="Annuler la réservation"
                        >
                          <CalendarDays size={18} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => handleDelete(res.id)}
                          disabled={loading === res.id}
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReservationsView;
