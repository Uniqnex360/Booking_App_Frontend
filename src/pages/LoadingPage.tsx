import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Loader } from "@/components/common/Loader";
import { useEffect } from "react";
import { PageLoader } from "./PageLoader";

interface LoadingPageProps {
  showFooter?: boolean;
}

export function LoadingPage({ showFooter = false }: LoadingPageProps) {
  

  return (
    <div className="min-h-screen bg-[#F5F5FA] flex flex-col">
      <Header />
        <div className="flex-grow flex justify-center items-center py-20">
        <PageLoader />
      </div>
      {showFooter && <Footer />}
    </div>
  );
}