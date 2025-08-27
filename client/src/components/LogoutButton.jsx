import { clearUserSession } from "../utils/auth";
import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
  const navigate = useNavigate();
  return (
    <button
      className="btn btn-danger"
      onClick={() => { clearUserSession(); navigate("/login"); }}
    >
      Odjava
    </button>
  );
}
