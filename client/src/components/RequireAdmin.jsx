import { Navigate, useLocation } from "react-router-dom";
import { getUserSession } from "../utils/auth";

export default function RequireAdmin({ children }) {
  const user = getUserSession();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (user.role !== "admin") {
    return <Navigate to="/home" replace />;
  }
  return children;
}
