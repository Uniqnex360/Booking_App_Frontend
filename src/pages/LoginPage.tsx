import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import HomePage from "./HomePage";

export default function LoginPage() {
  const { openAuthModal, isAuthModalOpen, isAuthenticated, user } = useAuth() as any;
  const navigate = useNavigate();
  const openedOnce = useRef(false);

  useEffect(() => {
    if (isAuthenticated) {
      const isAdminRole = ["ADMIN", "SUPER_ADMIN", "OPERATIONS_ADMIN", "FINANCE_ADMIN", "SUPPORT_ADMIN"].includes(user?.role);
      if (user?.role === "THEATRE_PARTNER") {
        navigate("/theatre/dashboard");
      } else if (user?.role === "PARTNER") {
        navigate("/partner/dashboard");
      } else if (isAdminRole) {
        navigate("/admin");
      } else {
        navigate("/");
      }
      return;
    }
    if (!openedOnce.current) {
      openedOnce.current = true;
      openAuthModal("get-started");
    } else if (!isAuthModalOpen) {
      navigate("/");
    }
  }, [isAuthenticated, isAuthModalOpen, openAuthModal, navigate, user]);

  return <HomePage />;
}