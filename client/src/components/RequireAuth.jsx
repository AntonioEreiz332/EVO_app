import { Navigate, useLocation } from "react-router-dom";
import { getUserSession } from "../utils/auth";

export default function RequireAuth({ children }) {
  const user = getUserSession();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}
