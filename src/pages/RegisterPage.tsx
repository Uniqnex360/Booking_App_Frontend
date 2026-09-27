import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import HomePage from "./HomePage";

export default function RegisterPage() {
  const { openAuthModal, isAuthenticated } = useAuth() as any;
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    } else {
      openAuthModal("email");
    }
  }, [isAuthenticated, openAuthModal, navigate]);

  return <HomePage />;
}
