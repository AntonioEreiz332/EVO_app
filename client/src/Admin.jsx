import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import LogoutButton from "./components/LogoutButton";
import Modal from "bootstrap/js/dist/modal";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" });

  // Dohvati sve korisnike
  useEffect(() => {
    axios.get("http://localhost:3001/admin/users")
      .then(res => setUsers(res.data))
      .catch(() => toast.error("Ne mogu učitati korisnike"));
  }, []);

  // Otvori modal za uređivanje
  const openEdit = (u) => {
    setEditUser(u);
    setForm({ name: u.name || "", email: u.email || "", password: "", role: u.role || "user" });
    const el = document.getElementById("editUserModal");
    const m = Modal.getOrCreateInstance(el);
    m.show();
  };

  // Spremi izmjene
  const saveUser = (e) => {
    e.preventDefault();
    axios.put(`http://localhost:3001/admin/users/${editUser._id}`, form)
      .then(res => {
        setUsers(prev => prev.map(u => (u._id === editUser._id ? res.data.user : u)));
        toast.success("Korisnik ažuriran");

        const el = document.getElementById("editUserModal");
        const inst = Modal.getInstance(el) || Modal.getOrCreateInstance(el);
        el.addEventListener(
          "hidden.bs.modal",
          () => {
            document.body.classList.remove("modal-open");
            document.body.style.overflow = "";
            document.body.style.paddingRight = "";
            document.querySelectorAll(".modal-backdrop").forEach((b) => b.remove());
            inst.dispose();
          },
          { once: true }
        );
        inst.hide();
      })
      .catch(() => toast.error("Greška pri spremanju korisnika"));
  };

  // Brisanje korisnika
  const deleteUser = (u) => {
    if (!confirm(`Obrisati korisnika "${u.name}" i sva njegova vozila?`)) return;
    axios.delete(`http://localhost:3001/admin/users/${u._id}`)
      .then(() => {
        setUsers(prev => prev.filter(x => x._id !== u._id));
        toast.success("Korisnik obrisan");
      })
      .catch(() => toast.error("Greška pri brisanju korisnika"));
  };

  return (
    <>
      <header className="app-header">
        <div className="logo-wrap">
          <span style={{ fontWeight: 700 }}>EVO</span>
          <span className="ms-2 text-muted">Admin panel</span>
        </div>
        <LogoutButton />
      </header>

      <div className="container my-4">
        <div className="card-soft p-3 p-md-4">
          <div className="section-title mb-3">Korisnici</div>

          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Ime</th>
                  <th>Email</th>
                  <th>Uloga</th>
                  <th className="text-end">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className="badge bg-light text-dark">{u.role || "user"}</span></td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEdit(u)}>Uredi</button>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteUser(u)}>Obriši</button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan="4" className="text-muted">Nema korisnika.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <div className="modal fade" id="editUserModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <form onSubmit={saveUser}>
              <div className="modal-header">
                <h5 className="modal-title">Uredi korisnika</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"/>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Ime</label>
                  <input className="form-control"
                         value={form.name}
                         onChange={(e)=>setForm({...form, name: e.target.value})}
                         required/>
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control"
                         value={form.email}
                         onChange={(e)=>setForm({...form, email: e.target.value})}
                         required/>
                </div>
                <div className="mb-3">
                  <label className="form-label">Lozinka (ostavi prazno ako ne mijenjaš)</label>
                  <input type="password" className="form-control"
                         value={form.password}
                         onChange={(e)=>setForm({...form, password: e.target.value})}/>
                </div>
                <div className="mb-3">
                  <label className="form-label">Uloga</label>
                  <select className="form-select"
                          value={form.role}
                          onChange={(e)=>setForm({...form, role: e.target.value})}>
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary" type="submit">Spremi</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
