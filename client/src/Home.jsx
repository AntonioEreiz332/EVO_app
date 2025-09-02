import React, { useEffect, useState, useMemo, useRef } from "react";
import LogoutButton from "./components/LogoutButton";
import { getUserSession } from "./utils/auth";
import logo from "./assets/evo-logo.svg";
import axios from "axios";
import Modal from "bootstrap/js/dist/modal";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";


import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

function Home() {
  const navigate = useNavigate();
  const user = useMemo(() => getUserSession(), []); 
  const userId = user?.id;
  const [vehicles, setVehicles] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const thisYear = new Date().getFullYear();
  const [newVehicle, setNewVehicle] = useState({
    brand: "",
    model: "",
    year: String(thisYear),
    registration: "",
    odometer: "",
  });

  const yearOptions = useMemo(() => {
    const start = 1980;
    const end = thisYear + 1;
    const arr = [];
    for (let y = end; y >= start; y--) arr.push(y);
    return arr;
  }, [thisYear]);

  const addVehicleModalRef = useRef(null);
  const addVehicleModalInstance = useRef(null);

  useEffect(() => {
    if (addVehicleModalRef.current) {
      addVehicleModalInstance.current = Modal.getOrCreateInstance(
        addVehicleModalRef.current,
        { backdrop: true, keyboard: true, focus: true }
      );
    }
    return () => {
      addVehicleModalInstance.current?.dispose();
    };
  }, []);

  // Dohvati vozila iz baze
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    axios
      .get(`http://localhost:3001/vehicles/${userId}`)
      .then((res) => {
        if (!cancelled) setVehicles(res.data);
      })
      .catch((err) => console.error("Greška kod dohvata vozila:", err));

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!vehicles?.length) {
      setRecentExpenses([]);
      setAnalytics([]);
      return;
    }

    // Zadnjih 5 troškova svih vozila 
    const allCosts = vehicles.flatMap((v) =>
      (v.costs || []).map((c) => ({
        vehicleName: `${v.brand} ${v.model}`,
        amount: Number(c.amount) || 0,
        date: c.date ? new Date(c.date) : new Date(0),
        title: c.description || c.type || "Trošak",
      }))
    );

    const last5 = allCosts
      .sort((a, b) => b.date - a.date)
      .slice(0, 5)
      .map((c, idx) => ({
        id: idx + 1,
        title: c.title,
        vehicle: c.vehicleName,
        amount: c.amount,
        date: c.date.toLocaleDateString("hr-HR"),
      }));

    setRecentExpenses(last5);

    // Analitika-potrošeno ove godine po vozilu 
    const thisYear = new Date().getFullYear();
    const totalsByVehicle = new Map();

    for (const v of vehicles) {
      const key = `${v.brand} ${v.model}`;
      const sum = (v.costs || [])
        .filter((c) => {
          const d = c.date ? new Date(c.date) : null;
          return d && d.getFullYear() === thisYear;
        })
        .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

      totalsByVehicle.set(key, (totalsByVehicle.get(key) || 0) + sum);
    }

    const analyticsData = Array.from(totalsByVehicle.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0); 

    setAnalytics(analyticsData);
  }, [vehicles]);

  const COLORS = ["#10b981", "#60a5fa", "#f59e0b", "#8b5cf6", "#ef4444"];

  // Dodavanje novog vozila
  const handleAddVehicle = async (e) => {
    e.preventDefault();
    const km = Number(newVehicle.odometer);
    if (!Number.isFinite(km) || km < 0) {
      toast.warn("Unesi važeću kilometražu (0 ili više).");
      return;
    }
    try {
      const res = await axios.post("http://localhost:3001/vehicles", {
        ...newVehicle,
        year: Number(newVehicle.year),
        odometer: km,
        userId: user.id,
      });
      setVehicles((prev) => [...prev, res.data]);
      setNewVehicle({ brand: "", model: "", year: String(thisYear), registration: "",odometer: "" });

      addVehicleModalInstance.current?.hide();
      toast.success("Vozilo je uspješno dodano!", { autoClose: 300 });
    } catch (err) {
      console.error("Greška kod dodavanja vozila:", err);
      toast.error("Greška kod dodavanja vozila.", { autoClose: 300 });
    }
  };

  return (
    <>
      {/* Header */}
      <header className="app-header">
        <div className="logo-wrap">
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
        {/* Prvi red: Moja Vozila + Zadnji troškovi */}
        <div className="row g-4">
          {/* Moja vozila */}
          <div className="col-12 col-lg-6">
            <div className="card-soft p-3 p-md-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="section-title">Moja Vozila</div>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => addVehicleModalInstance.current?.show()}
                >
                  <span className="me-1">+</span> DODAJ
                </button>
              </div>

              <div className="vehicle-list">
                {vehicles.map((v) => (
                  <div
                    key={v._id}
                    className="vehicle-item"
                    role="button"
                    onClick={() => navigate(`/vehicles/${v._id}`)}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>
                        {v.brand} {v.model}
                      </div>
                      <div className="vehicle-meta">{v.registration}</div>
                    </div>
                    <span className="text-muted">&rsaquo;</span>
                  </div>
                ))}
                {vehicles.length === 0 && (
                  <div className="text-muted">Nema dodanih vozila.</div>
                )}
              </div>
            </div>
          </div>

          {/* Zadnji troškovi */}
          <div className="col-12 col-lg-6">
            <div className="card-soft p-3 p-md-4">
              <div className="section-title mb-3">Zadnji Troškovi</div>
              <div>
                {recentExpenses.map((e) => (
                  <div key={e.id} className="expense-row">
                    <div>
                      <div className="expense-title">{e.title}</div>
                      <div className="expense-sub">{e.vehicle}</div>
                    </div>
                    <div className="text-end">
                      <div className="expense-amount">
                        {e.amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}{" "}
                        €
                      </div>
                      <div className="expense-sub">{e.date}</div>
                    </div>
                  </div>
                ))}
                {recentExpenses.length === 0 && (
                  <div className="text-muted">Još nema troškova.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Drugi red: Analitika troškova */}
        <div className="row g-4 mt-1">
          <div className="col-12">
            <div className="card-soft p-3 p-md-4">
              <div className="section-title mb-3">
                Analitika Troškova {new Date().getFullYear()}
              </div>
              <div style={{ width: "100%", height: 360 }}>
                {analytics.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={analytics}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={140}
                        isAnimationActive={false} 
                      >
                        {analytics.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) =>
                          `${value.toLocaleString("hr-HR", {
                            minimumFractionDigits: 2,
                          })} €`
                        }
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-muted">Nema podataka za analitiku.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal za dodavanje vozila */}
      <div
        className="modal fade"
        ref={addVehicleModalRef}
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <form onSubmit={handleAddVehicle}>
              <div className="modal-header">
                <h5 className="modal-title">Dodaj vozilo</h5>
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Marka</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newVehicle.brand}
                    onChange={(e) =>
                      setNewVehicle({ ...newVehicle, brand: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Model</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newVehicle.model}
                    onChange={(e) =>
                      setNewVehicle({ ...newVehicle, model: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Godina</label>
                  <select
                    className="form-select"
                    value={newVehicle.year}
                    onChange={(e) => setNewVehicle({ ...newVehicle, year: e.target.value })}
                    required
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Registracija</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newVehicle.registration}
                    onChange={(e) =>
                      setNewVehicle({
                        ...newVehicle,
                        registration: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Trenutna kilometraža (km)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="form-control"
                    value={newVehicle.odometer}
                    onChange={(e) => setNewVehicle({ ...newVehicle, odometer: e.target.value })}
                    required
                    placeholder="npr. 165000"
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

export default Home;
