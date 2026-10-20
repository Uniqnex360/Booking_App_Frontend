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
      if (user?.role === "THEATRE_PARTNER") {
        navigate("/theatre/dashboard");
      } else if (user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") {
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