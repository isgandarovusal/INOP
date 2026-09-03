import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Pencil, Plus, Store, Trash2 } from "lucide-react";
import PageHeader from "../../../Components/PageHeader";
import SearchInput from "../../../Components/SearchInput";
import EmptyState from "../../../Components/EmptyState";
import ConfirmDialog from "../../../Components/ConfirmDialog";
import Badge from "../../../Components/Badge";
import { getRestaurants, deleteRestaurant } from "../../../Services/restaurantsService";
import type { Restaurant, RestaurantStatus } from "../../../Types/audit";
import { useAuth } from "../../../Context/AuthContext";
import { canManageAudit } from "../../../Utils/permissions";

const RestaurantsList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user ? canManageAudit(user.role) : false;

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RestaurantStatus>("all");
  const [deleteTarget, setDeleteTarget] = useState<Restaurant | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getRestaurants()
      .then(setRestaurants)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    return restaurants
      .filter((r) => statusFilter === "all" || r.status === statusFilter)
      .filter((r) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return r.name.toLowerCase().includes(q) || r.location.toLowerCase().includes(q);
      });
  }, [restaurants, query, statusFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    await deleteRestaurant(deleteTarget.id);
    setDeleteTarget(null);
    setDeletingId(null);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Restaurants"
        subtitle={`${restaurants.length} total · ${filtered.length} shown`}
        actions={
          canManage && (
            <button className="btn-add" onClick={() => navigate("/app/audit/restaurants/new")}>
              <Plus size={16} />
              Add restaurant
            </button>
          )
        }
      />

      <div className="filter-bar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search name or location…" />
        <select
          className="input-field"
          style={{ width: 160 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | RestaurantStatus)}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="admin-table-container glass">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Location</th>
              <th>Status</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4}>
                  <div className="empty-state">
                    <Loader2 size={24} className="spin" />
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <EmptyState
                    icon={<Store size={28} />}
                    title={query ? "No restaurants match your search" : "No restaurants yet"}
                    hint={query ? "Try a different keyword." : "Restaurants you add will show up here."}
                  />
                </td>
              </tr>
            ) : (
              filtered.map((restaurant) => (
                <tr
                  key={restaurant.id}
                  className={deletingId === restaurant.id ? "row--removing" : ""}
                >
                  <td
                    className="cell-title cell-title--clickable"
                    onClick={() => navigate(`/app/audit/restaurants/${restaurant.id}`)}
                  >
                    {restaurant.name}
                  </td>
                  <td className="cell-muted">{restaurant.location}</td>
                  <td>
                    <Badge tone={restaurant.status === "active" ? "success" : "neutral"}>
                      {restaurant.status}
                    </Badge>
                  </td>
                  <td>
                    <div className="row-actions">
                      {canManage && (
                        <>
                          <button
                            className="icon-btn icon-btn--edit"
                            title="Edit"
                            onClick={() => navigate(`/app/audit/restaurants/${restaurant.id}/edit`)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            className="icon-btn icon-btn--danger"
                            title="Delete"
                            disabled={deletingId === restaurant.id}
                            onClick={() => setDeleteTarget(restaurant)}
                          >
                            {deletingId === restaurant.id ? (
                              <Loader2 size={15} className="spin" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this restaurant?"
          message={`"${deleteTarget.name}" and its history will be permanently removed.`}
          loading={deletingId === deleteTarget.id}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default RestaurantsList;
