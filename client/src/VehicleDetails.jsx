import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Modal from "bootstrap/js/dist/modal";
import { toast } from "react-toastify";
import { getUserSession } from "./utils/auth";


import logo from "./assets/evo-logo.svg";
import LogoutButton from "./components/LogoutButton";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, XAxis, YAxis, Bar, CartesianGrid } from "recharts";

const COLOR_BY_TYPE = {
  servis: "#10b981",       
  kvar: "#ef4444",         
  registracija: "#60a5fa", 
  osiguranje: "#f59e0b",   
  gorivo: "#8b5cf6",       
  gume: "#14b8a6",         
};


const CATEGORY_LABELS = {
  servis: "Servis",
  kvar: "Kvar",
  registracija: "Registracija",
  osiguranje: "Osiguranje",
  gorivo: "Gorivo",
  gume: "Gume",
};

const CATEGORY_OPTIONS = [
  { value: "servis", label: "Servis" },
  { value: "kvar", label: "Kvar" },
  { value: "registracija", label: "Registracija" },
  { value: "osiguranje", label: "Osiguranje" },
  { value: "gorivo", label: "Gorivo" },
  { value: "gume", label: "Gume" },
];

const SUBCATEGORIES = {
  servis: [
    "Mali servis",
    "Veliki servis",
    "Kočnice",
    "Motor i prijenos",
    "Elektronika",
    "Ovjes i trap",
    "Klima",
    "Tekućine i potrošni materijal",
    "Gume i vulkanizacija",
  ],
  kvar: [
    "Motor i pogon",
    "Kočnice",
    "Elektronika",
    "Ovjes i trap",
    "Mjenjač i prijenos",
    "Klima i grijanje",
    "Gume i kotači",
  ],
};
const TRACKED_SUBS = ["Mali servis", "Veliki servis", "Kočnice"];

export default function VehicleDetails() {
  const user = getUserSession();
  const { id } = useParams();
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState(null);
  const [newCost, setNewCost] = useState({
    type: "servis",
    subcategory: "",
    description: "",
    notes: "",
    location: "",
    vendor: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    mileage: "",
  });

  const [editCost, setEditCost] = useState({
    _id: "",
    type: "servis",
    subcategory: "",
    description: "",
    notes: "",
    location: "",
    vendor: "",
    amount: "",
    date: "",
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

  const viewEditModalRef = useRef(null);
  const viewEditModalInstance = useRef(null);
  useEffect(() => {
    if (viewEditModalRef.current) {
      viewEditModalInstance.current = Modal.getOrCreateInstance(
        viewEditModalRef.current,
        {
          backdrop: true,
          keyboard: true,
          focus: true,
        }
      );
    }
    return () => viewEditModalInstance.current?.dispose();
  }, []);

  // Dohvat vozila s troškovima
  useEffect(() => {
    axios
      .get(`http://localhost:3001/vehicle/${id}`)
      .then((res) => setVehicle(res.data))
      .catch(() => navigate("/home"));
  }, [id, navigate]);

  // Analitika po kategorijama
  const pieData = useMemo(() => {
    if (!vehicle?.costs?.length) return [];
    const totals = vehicle.costs.reduce((acc, c) => {
      const t = c.type;
      const val = Number(c.amount) || 0;
      acc[t] = (acc[t] || 0) + val;
      return acc;
    }, {});
    return CATEGORY_OPTIONS.map(({ value }) => ({
      key: value,
      name: CATEGORY_LABELS[value] || value,
      value: totals[value] || 0,
    })).filter((x) => x.value > 0);
  }, [vehicle]);

  // Analitika po mjesecima (YYYY-MM)
  const barData = useMemo(() => {
    if (!vehicle?.costs?.length) return [];
    const m = new Map();
    for (const c of vehicle.costs) {
      const d = new Date(c.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      m.set(key, (m.get(key) || 0) + (Number(c.amount) || 0));
    }
    return Array.from(m.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([k, v]) => ({ month: k, total: v }));
  }, [vehicle]);

  // Dodavanje troškova
  const handleAddCost = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `http://localhost:3001/vehicle/${id}/costs`,
        newCost
      );
      setVehicle(res.data.vehicle);
      setNewCost({
        type: "servis",
        subcategory: "",
        description: "",
        notes: "",
        location: "",
        vendor: "",
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

  //otvaranje modala za pregled/uređivanje/brisanje troška
  const openViewEditCost = (c) => {
    setEditCost({
      _id: c._id,
      type: c.type,
      subcategory: c.subcategory || "",
      description: c.description || "",
      notes: c.notes || "",
      location: c.location || "",
      vendor: c.vendor || "",
      amount: c.amount ?? "",
      date: c.date
        ? new Date(c.date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      mileage: typeof c.mileage === "number" ? c.mileage : "",
    });
    viewEditModalInstance.current?.show();
  };

  //spremanje izmjene troška
  const handleSaveEditCost = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put(
        `http://localhost:3001/vehicle/${id}/costs/${editCost._id}`,
        {
          type: editCost.type,
          subcategory: editCost.subcategory || "",
          description: editCost.description,
          notes: editCost.notes,
          location: editCost.location,
          vendor: editCost.vendor,
          amount: editCost.amount,
          date: editCost.date,
          mileage: editCost.mileage,
        }
      );
      setVehicle(res.data.vehicle);
      viewEditModalInstance.current?.hide();
      toast.success("Trošak je ažuriran.", { autoClose: 400 });
    } catch (err) {
      console.error(
        "Greška pri ažuriranju troška:",
        err?.response?.data || err.message
      );
      toast.error("Greška pri ažuriranju troška.", { autoClose: 700 });
    }
  };

  //brisanje troška
  const handleDeleteCost = async () => {
    if (!confirm("Obrisati ovaj trošak?")) return;
    try {
      const res = await axios.delete(
        `http://localhost:3001/vehicle/${id}/costs/${editCost._id}`
      );
      setVehicle(res.data.vehicle);
      viewEditModalInstance.current?.hide();
      toast.success("Trošak je obrisan.", { autoClose: 400 });
    } catch (err) {
      console.error(
        "Greška pri brisanju troška:",
        err?.response?.data || err.message
      );
      toast.error("Greška pri brisanju troška.", { autoClose: 700 });
    }
  };

  //spremanje izmjene kilometraže
  const handleUpdateOdometer = async (e) => {
    e.preventDefault();
    const formEl = e.currentTarget; 
    const form = new FormData(formEl);
    const value = form.get("odometer");
    if (value === "" || Number(value) < 0) {
      toast.warn("Unesi valjanu kilometražu.");
      return;
    }
    try {
      const res = await axios.put(`http://localhost:3001/vehicle/${id}/odometer`, {
        odometer: value,
      });
      setVehicle(res.data.vehicle); 
      toast.success("Kilometraža je ažurirana.", { autoClose: 300 });
      formEl.reset()
    } catch (err) {
      console.error("Greška pri ažuriranju odometra:", err?.response?.data || err.message);
      toast.error("Greška pri ažuriranju kilometraže.");
    }
  };

  // funkcija za izračun koliko je preostalo do sljedećeg intervala
  function calcServiceStatus(counter, odometer) {
    if (!counter) return { kmLeft: null, daysLeft: null, level: "unknown" };
    const { lastKm, lastDate, intervalKm, intervalMonths } = counter;

    let kmLeft = null;
    if (typeof lastKm === "number") {
      const delta =
        typeof odometer === "number" ? Math.max(0, odometer - lastKm) : 0;
      kmLeft = (intervalKm || 0) - delta;
    }

    let daysLeft = null;
    if (lastDate) {
      const next = new Date(lastDate);
      next.setMonth(next.getMonth() + (intervalMonths || 0));
      daysLeft = Math.ceil((next - new Date()) / (1000 * 60 * 60 * 24));
    }

    const toLevel = (left, total) => {
      if (left == null || total == null || total === 0) return "unknown";
      if (left <= 0) return "danger";
      const ratio = left / total;
      if (ratio <= 0.1) return "warning";
      return "ok";
    };
    const kmLevel = kmLeft != null ? toLevel(kmLeft, intervalKm) : "unknown";
    const dayLevel =
      daysLeft != null ? toLevel(daysLeft, intervalMonths * 30) : "unknown";
    const order = { danger: 3, warning: 2, ok: 1, unknown: 0 };
    const level = [kmLevel, dayLevel].sort((a, b) => order[b] - order[a])[0];

    return { kmLeft, daysLeft, level };
  };

  const sc = vehicle?.serviceCounters || {};
  const stSmall = calcServiceStatus(sc.small, vehicle?.odometer);
  const stBig   = calcServiceStatus(sc.big, vehicle?.odometer);
  const stBrk   = calcServiceStatus(sc.brakes, vehicle?.odometer);

  const badge = (lvl) =>
    lvl === "danger" ? "bg-danger" :
    lvl === "warning" ? "bg-warning text-dark" :
    lvl === "ok" ? "bg-success" : "bg-secondary";

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
                    .map((c) => (
                      <div
                        key={c._id}
                        className="expense-row"
                        role="button"
                        onClick={() => openViewEditCost(c)}
                        title="Otvori detalje troška"
                      >
                        <div>
                          <div className="expense-title text-capitalize">
                            {c.type} {c.subcategory ? `· ${c.subcategory}` : ""}{" "}
                            — {c.description || "Bez opisa"}
                          </div>
                          <div className="expense-sub">
                            {new Date(c.date).toLocaleDateString("hr-HR")}
                            {c.mileage !== undefined && c.mileage !== null
                              ? ` · ${c.mileage.toLocaleString("hr-HR")} km`
                              : ""}
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
                </ul>
              ) : (
                <div className="text-muted">Učitavanje...</div>
              )}
              {vehicle && (
                <>
                  <hr className="my-3" />
                  <div className="mb-2">
                    <strong>Trenutna kilometraža:</strong>{" "}
                    {typeof vehicle.odometer === "number"
                      ? vehicle.odometer.toLocaleString("hr-HR") + " km"
                      : "—"}
                  </div>
                  <form className="row g-2" onSubmit={handleUpdateOdometer}>
                    <div className="col-7">
                      <input
                        name="odometer"
                        type="number"
                        min="0"
                        className="form-control"
                        placeholder="Unesi trenutne km"
                        defaultValue={vehicle?.odometer ?? ""}
                      />
                    </div>
                    <div className="col-5 d-grid">
                      <button
                        type="submit"
                        className="btn btn-outline-primary btn-sm"
                      >
                        Spremi km
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
          <div className="row g-3 mt-2">
            <div className="col-12"></div>

            <div className="col-12 col-md-4">
              <div className="p-3 rounded border">
                <div className="d-flex justify-content-between align-items-center">
                  <strong>Mali servis</strong>
                  <span className={`badge ${badge(stSmall.level)}`}>
                    {stSmall.level === "danger"
                      ? "ODMAH"
                      : stSmall.level === "warning"
                      ? "USKORO"
                      : stSmall.level === "ok"
                      ? "OK"
                      : "NEPOZNATO"}
                  </span>
                </div>
                <div className="mt-2 small">
                  Km preostalo:{" "}
                  {stSmall.kmLeft != null
                    ? stSmall.kmLeft.toLocaleString("hr-HR") + " km"
                    : "—"}
                  <br />
                  Dana preostalo:{" "}
                  {stSmall.daysLeft != null ? `${stSmall.daysLeft}` : "—"}
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="p-3 rounded border">
                <div className="d-flex justify-content-between align-items-center">
                  <strong>Veliki servis</strong>
                  <span className={`badge ${badge(stBig.level)}`}>
                    {stBig.level === "danger"
                      ? "ODMAH"
                      : stBig.level === "warning"
                      ? "USKORO"
                      : stBig.level === "ok"
                      ? "OK"
                      : "NEPOZNATO"}
                  </span>
                </div>
                <div className="mt-2 small">
                  Km preostalo:{" "}
                  {stBig.kmLeft != null
                    ? stBig.kmLeft.toLocaleString("hr-HR") + " km"
                    : "—"}
                  <br />
                  Dana preostalo:{" "}
                  {stBig.daysLeft != null ? `${stBig.daysLeft}` : "—"}
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="p-3 rounded border">
                <div className="d-flex justify-content-between align-items-center">
                  <strong>Kočnice</strong>
                  <span className={`badge ${badge(stBrk.level)}`}>
                    {stBrk.level === "danger"
                      ? "ODMAH"
                      : stBrk.level === "warning"
                      ? "USKORO"
                      : stBrk.level === "ok"
                      ? "OK"
                      : "NEPOZNATO"}
                  </span>
                </div>
                <div className="mt-2 small">
                  Km preostalo:{" "}
                  {stBrk.kmLeft != null
                    ? stBrk.kmLeft.toLocaleString("hr-HR") + " km"
                    : "—"}
                  <br />
                  Dana preostalo:{" "}
                  {stBrk.daysLeft != null ? `${stBrk.daysLeft}` : "—"}
                </div>
              </div>
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
                        {pieData.map((e) => (
                          <Cell key={e.key} fill={COLOR_BY_TYPE[e.key]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) =>
                          `${Number(value).toLocaleString("hr-HR", {
                            minimumFractionDigits: 2,
                          })} €`
                        }
                      />
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
                      setNewCost({
                        ...newCost,
                        type: e.target.value,
                        subcategory: "",
                      })
                    }
                    required
                  >
                    {CATEGORY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {(newCost.type === "servis" || newCost.type === "kvar") && (
                  <div className="mb-3">
                    <label className="form-label">Podkategorija</label>
                    <select
                      className="form-select"
                      value={newCost.subcategory}
                      onChange={(e) =>
                        setNewCost({ ...newCost, subcategory: e.target.value })
                      }
                    >
                      <option value="">(odaberi)</option>
                      {(SUBCATEGORIES[newCost.type] || []).map((sc) => (
                        <option key={sc} value={sc}>
                          {sc}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label">Opis (kratko)</label>
                  <input
                    className="form-control"
                    value={newCost.description}
                    onChange={(e) =>
                      setNewCost({ ...newCost, description: e.target.value })
                    }
                    placeholder="Ulje i filteri, Zupčasti remen i pumpa vode"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Napomene (detaljni opis)</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={newCost.notes}
                    onChange={(e) =>
                      setNewCost({ ...newCost, notes: e.target.value })
                    }
                    placeholder="Napišite što je sve napravljeno i koji dijelovi su promijenjeni"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Lokacija</label>
                  <input
                    className="form-control"
                    value={newCost.location}
                    onChange={(e) =>
                      setNewCost({ ...newCost, location: e.target.value })
                    }
                    placeholder="Napišite lokaciju gdje je odrađena izmjena"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Servis / Majstor</label>
                  <input
                    className="form-control"
                    value={newCost.vendor}
                    onChange={(e) =>
                      setNewCost({ ...newCost, vendor: e.target.value })
                    }
                    placeholder="Auto Hrvatksa, Tomić d.o.o"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Kilometraža (km)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="form-control"
                    value={newCost.mileage}
                    onChange={(e) =>
                      setNewCost({ ...newCost, mileage: e.target.value })
                    }
                    required={
                      newCost.type === "servis" &&
                      TRACKED_SUBS.includes(newCost.subcategory)
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
                    placeholder="npr. 350"
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

      {/* Modal za pregled troška */}
      <div
        className="modal fade"
        ref={viewEditModalRef}
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <form onSubmit={handleSaveEditCost}>
              <div className="modal-header">
                <h5 className="modal-title">Detalji troška</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => viewEditModalInstance.current?.hide()}
                  aria-label="Close"
                ></button>
              </div>

              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Kategorija</label>
                  <select
                    className="form-select"
                    value={editCost.type}
                    onChange={(e) =>
                      setEditCost({
                        ...editCost,
                        type: e.target.value,
                        subcategory: "",
                      })
                    }
                    required
                  >
                    {CATEGORY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {(editCost.type === "servis" || editCost.type === "kvar") && (
                  <div className="mb-3">
                    <label className="form-label">Podkategorija</label>
                    <select
                      className="form-select"
                      value={editCost.subcategory}
                      onChange={(e) =>
                        setEditCost({
                          ...editCost,
                          subcategory: e.target.value,
                        })
                      }
                    >
                      <option value="">(odaberi)</option>
                      {(SUBCATEGORIES[editCost.type] || []).map((sc) => (
                        <option key={sc} value={sc}>
                          {sc}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label">Opis (kratko)</label>
                  <input
                    className="form-control"
                    value={editCost.description}
                    onChange={(e) =>
                      setEditCost({ ...editCost, description: e.target.value })
                    }
                    placeholder="Ulje i filteri, Zupčasti remen i pumpa vode"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Napomene (detaljni opis)</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={editCost.notes}
                    onChange={(e) =>
                      setEditCost({ ...editCost, notes: e.target.value })
                    }
                    placeholder="Napišite što je sve napravljeno i koji dijelovi su promijenjeni"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Lokacija</label>
                  <input
                    className="form-control"
                    value={editCost.location}
                    onChange={(e) =>
                      setEditCost({ ...editCost, location: e.target.value })
                    }
                    placeholder="Napišite lokaciju gdje je odrađena izmjena"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Servis / Majstor</label>
                  <input
                    className="form-control"
                    value={editCost.vendor}
                    onChange={(e) =>
                      setEditCost({ ...editCost, vendor: e.target.value })
                    }
                    placeholder="Auto Hrvatksa, Tomić d.o.o"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Kilometraža (km)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="form-control"
                    value={editCost.mileage}
                    onChange={(e) =>
                      setEditCost({ ...editCost, mileage: e.target.value })
                    }
                    required={
                      editCost.type === "servis" &&
                      TRACKED_SUBS.includes(editCost.subcategory)
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
                    value={editCost.amount}
                    onChange={(e) =>
                      setEditCost({ ...editCost, amount: e.target.value })
                    }
                    placeholder="npr. 350"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Datum</label>
                  <input
                    type="date"
                    className="form-control"
                    value={editCost.date}
                    onChange={(e) =>
                      setEditCost({ ...editCost, date: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="modal-footer d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteCost}
                >
                  Izbriši
                </button>
                <div>
                  <button type="submit" className="btn btn-primary">
                    Spremi
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
