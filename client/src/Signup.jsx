import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import AuthLayout from "./components/AuthLayout";
import logo from "./assets/evo-logo.svg";
import { toast } from "react-toastify"; 

function Signup() {
  const [name, setName] = useState();
  const [email, setEmail] = useState();
  const [password, setPassword] = useState();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post("http://localhost:3001/register", { name, email, password })
      .then((res) => {
        if (res?.data?.status === "Registered") {
          toast.success("Uspješna registracija!");
          setTimeout(() => navigate("/login"), 1500);
        } else {
          toast.error("Nešto nije u redu. Pokušaj ponovno.");
        }
      })
      .catch((err) => {
        if (err.response?.status === 409 || err.response?.data?.error === "EmailExists") {
          toast.error("Korisnik s ovim emailom već postoji.");
        } else if (err.response?.data?.message) {
          toast.error(err.response.data.message);
        } else {
          toast.error("Greška pri spajanju na server.");
        }
      });
  };

  return (
    <AuthLayout title="Registriraj se" logoSrc={logo}>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label"><strong>Ime</strong></label>
          <input className="form-control" placeholder="Unesi ime" onChange={(e)=>setName(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="form-label"><strong>Email</strong></label>
          <input type="email" placeholder="Unesi email adresu" className="form-control" onChange={(e)=>setEmail(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="form-label"><strong>Lozinka</strong></label>
          <input type="password" placeholder="Unesi lozinku" className="form-control" onChange={(e)=>setPassword(e.target.value)} required />
        </div>
        <button type="submit" className="btn btn-brand w-100 mb-3">Registriraj se</button>
        <div className="text-center">
          <small className="text-muted d-block mb-2">Već imaš račun?</small>
          <Link to="/login" className="btn btn-light w-100 text-decoration-none">Prijavi se</Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export default Signup;
