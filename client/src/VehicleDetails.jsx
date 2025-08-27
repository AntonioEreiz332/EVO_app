import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Modal from "bootstrap/js/dist/modal";
import { toast } from "react-toastify";
import { getUserSession } from "./utils/auth";


import logo from "./assets/evo-logo.svg";
import LogoutButton from "./components/LogoutButton";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, XAxis, YAxis, Bar, CartesianGrid } from "recharts";

const COLORS = ["#10b981", "#60a5fa", "#f59e0b", "#8b5cf6", "#ef4444"];

export default function VehicleDetails() {
  const user = getUserSession();
  const { id } = useParams();
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState(null);
  const [newCost, setNewCost] = useState({
    type: "servis",
    description: "",
    amount: "",
    date: new Date().toISOString().slice(0,10),
    mileage: "",
  });

  const addCostModalRef = useRef(null);
  const addCostModalInstance = useRef(null);

  useEffect(() => {
    if (addCostModalRef.current) {
      addCostModalInstance.current = Modal.getOrCreateInstance(
        addCostModalRef.current,
        {
          backdrop: true,
          keyboard: true,
          focus: true,
        }
      );
    }
    return () => {
      addCostModalInstance.current?.dispose();
    };
  }, []);


  // Dohvat vozila s troškovima
  useEffect(() => {
    axios.get(`http://localhost:3001/vehicle/${id}`)
      .then(res => setVehicle(res.data))
      .catch(() => navigate("/home"));
  }, [id, navigate]);

  // Analitika po kategorijama
  const pieData = useMemo(() => {
    if (!vehicle?.costs?.length) return [];
    const map = vehicle.costs.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + (Number(c.amount) || 0);
      return acc;
    }, {});
    const translate = { servis: "Servis", kvar: "Kvar", registracija: "Registracija", gorivo: "Gorivo" };
    return Object.entries(map).map(([k,v]) => ({ name: translate[k] || k, value: v }));
  }, [vehicle]);

  // Analitika po mjesecima (YYYY-MM)
  const barData = useMemo(() => {
    if (!vehicle?.costs?.length) return [];
    const m = new Map();
    for (const c of vehicle.costs) {
      const d = new Date(c.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      m.set(key, (m.get(key)||0) + (Number(c.amount)||0));
    }
    return Array.from(m.entries()).sort(([a],[b])=>a>b?1:-1).map(([k,v])=>({ month:k, total:v }));
  }, [vehicle]);

  // Dodavanje troškova
  const handleAddCost = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`http://localhost:3001/vehicle/${id}/costs`, newCost);
      setVehicle(res.data.vehicle);
      setNewCost({
        type: "servis",
        description: "",
        amount: "",
        date: new Date().toISOString().slice(0, 10),
        mileage: "",
      });
      
      addCostModalInstance.current?.hide();
      toast.success("Trošak je dodan!", { autoClose: 300 });
    } catch (err) {
      console.error("Greška kod dodavanja troška:", err);
      toast.error("Greška kod dodavanja troška.", { autoClose: 300 });
    }
  };

  const handleDeleteVehicle = async () => {
    if (!confirm("Obrisati ovo vozilo? Svi troškovi bit će trajno izbrisani."))
      return;
    try {
      await axios.delete(`http://localhost:3001/vehicle/${id}`);
      toast.success("Vozilo je izbrisano!");
      navigate("/home");
    } catch (err) {
      console.error("Greška pri brisanju vozila:", err);
      toast.error("Greška pri brisanju vozila.");
    }
  };


  return (
    <>
      {/* Header */}
      <header className="app-header">
        <div className="logo-wrap">
          <button
            className="btn btn-outline-primary btn-sm me-2"
            onClick={() => navigate("/home")}
          >
            ← Natrag
          </button>
          <img
            src={logo}
            alt="EVO"
            style={{ height: 24 }}
            role="button"
            onClick={() => navigate("/home")}
          />
          <span role="button" onClick={() => navigate("/home")}>
            EVO
          </span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <span className="text-muted">{user?.name || "Korisnik"}</span>
          <LogoutButton />
        </div>
      </header>

      <div className="container my-4">
        {/* Gornji red: Troškovi + Informacije o vozilu */}
        <div className="row g-4">
          <div className="col-12 col-lg-7">
            <div className="card-soft p-3 p-md-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="section-title">Troškovi</div>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => addCostModalInstance.current?.show()}
                >
                  + DODAJ TROŠAK
                </button>
              </div>

              {!vehicle?.costs?.length ? (
                <div className="text-muted">Nema troškova.</div>
              ) : (
                <div className="vehicle-list">
                  {vehicle.costs
                    .slice()
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((c, idx) => (
                      <div key={idx} className="expense-row">
                        <div>
                          <div className="expense-title text-capitalize">
                            {c.type} — {c.description || "Bez opisa"}
                          </div>
                          <div className="expense-sub">
                            {new Date(c.date).toLocaleDateString("hr-HR")}
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="expense-amount">
                            {Number(c.amount).toLocaleString("hr-HR", {
                              minimumFractionDigits: 2,
                            })}{" "}
                            €
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="col-12 col-lg-5">
            <div className="card-soft p-3 p-md-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="section-title mb-0">Informacije o vozilu</div>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleDeleteVehicle}
                >
                  {" "}
                  OBRIŠI VOZILO
                </button>
              </div>
              {vehicle ? (
                <ul className="list-unstyled mb-0">
                  <li>
                    <strong>Marka:</strong> {vehicle.brand}
                  </li>
                  <li>
                    <strong>Model:</strong> {vehicle.model}
                  </li>
                  <li>
                    <strong>Godina:</strong> {vehicle.year || "-"}
                  </li>
                  <li>
                    <strong>Registracija:</strong> {vehicle.registration || "-"}
                  </li>
                  <li>
                    <strong>Kreirano:</strong>{" "}
                    {new Date(vehicle.createdAt).toLocaleDateString("hr-HR")}
                  </li>
                </ul>
              ) : (
                <div className="text-muted">Učitavanje...</div>
              )}
            </div>
          </div>
        </div>

        {/* Donji red: Analitika */}
        <div className="row g-4 mt-1">
          <div className="col-12 col-xl-6">
            <div className="card-soft p-3 p-md-4">
              <div className="section-title mb-3">
                Analitika po kategorijama
              </div>
              <div style={{ width: "100%", height: 320 }}>
                {pieData.length ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        isAnimationActive={false}
                      >
                        {pieData.map((e, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-muted">Nema podataka.</div>
                )}
              </div>
            </div>
          </div>

          <div className="col-12 col-xl-6">
            <div className="card-soft p-3 p-md-4">
              <div className="section-title mb-3">Trošak po mjesecima</div>
              <div style={{ width: "100%", height: 320 }}>
                {barData.length ? (
                  <ResponsiveContainer>
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="total" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-muted">Nema podataka.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal za dodavanje troškova */}
      <div
        className="modal fade"
        ref={addCostModalRef}
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <form onSubmit={handleAddCost}>
              <div className="modal-header">
                <h5 className="modal-title">Dodaj trošak</h5>
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Kategorija</label>
                  <select
                    className="form-select"
                    value={newCost.type}
                    onChange={(e) =>
                      setNewCost({ ...newCost, type: e.target.value })
                    }
                    required
                  >
                    <option value="servis">Servis</option>
                    <option value="kvar">Kvar</option>
                    <option value="registracija">Registracija</option>
                    <option value="gorivo">Gorivo</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Opis</label>
                  <input
                    className="form-control"
                    value={newCost.description}
                    onChange={(e) =>
                      setNewCost({ ...newCost, description: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Kilometraža (km)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="form-control"
                    value={newCost.mileage}
                    onChange={(e) =>
                      setNewCost({ ...newCost, mileage: e.target.value })
                    }
                    placeholder="npr. 152000"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Iznos (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={newCost.amount}
                    onChange={(e) =>
                      setNewCost({ ...newCost, amount: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Datum</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newCost.date}
                    onChange={(e) =>
                      setNewCost({ ...newCost, date: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary">
                  Spremi
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
