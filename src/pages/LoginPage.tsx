import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import HomePage from "./HomePage";

export default function LoginPage() {
  const { openAuthModal, isAuthenticated, isAuthModalOpen } = useAuth() as any;
  const navigate = useNavigate();
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    } else if (!hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      openAuthModal("get-started");
    }
  }, [isAuthenticated, openAuthModal, navigate]);

  useEffect(() => {
    if (hasTriggeredRef.current && !isAuthModalOpen && !isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthModalOpen, isAuthenticated, navigate]);

  return <HomePage />;
}
