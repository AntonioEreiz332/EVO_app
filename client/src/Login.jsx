import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import AuthLayout from "./components/AuthLayout";
import logo from "./assets/evo-logo.svg";
import { toast } from "react-toastify"; 
import { saveUserSession } from "./utils/auth";


function Login() {
  const [email, setEmail] = useState();
  const [password, setPassword] = useState();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post("http://localhost:3001/login", { email, password })
      .then((result) => {
        const user = result?.data?.user;
        if (result?.data?.status === "Success" && user) {
          saveUserSession(user);
          toast.success("Uspješna prijava!", { autoClose: 800 });
          
          // Redirect po ulozi
          if (user.role === "admin") {
            setTimeout(() => navigate("/admin"), 1000);
          } else {
             setTimeout(() => navigate("/home"), 1000);
          }

        } else {
          toast.error("Nešto nije u redu. Pokušaj ponovno.");
        }
      })
      .catch((err) => {
        if (err.response?.data?.message) {
          toast.error(err.response.data.message, { autoClose: 3000 });
        } else {
          toast.error("Greška pri spajanju na server.", { autoClose: 3000 });
        }
      });
  };

  return (
    <AuthLayout title="Prijavi se" logoSrc={logo}>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label"><strong>Email</strong></label>
          <input
            type="email"
            placeholder="Unesi email adresu"
            autoComplete="off"
            name="email"
            className="form-control"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label"><strong>Lozinka</strong></label>
          <input
            type="password"
            placeholder="Unesi lozinku"
            autoComplete="off"
            name="password"
            className="form-control"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-brand w-100 mb-3">
          Prijavi se
        </button>
        <div className="text-center">
          <small className="text-muted d-block mb-2">Kreiraj novi korisnički račun</small>
          <Link to="/register" className="btn btn-light w-100 text-decoration-none">
            Registriraj se
          </Link>
        </div>
      </form>

    </AuthLayout>
  );
}

export default Login;
