import React, { useEffect } from "react";
import Button from "../components/Button";
import Footer from "../components/Footer";

export default function NotFound() {
  useEffect(() => {
    document.title = "404 - Page Not Found | Lyra";
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-body flex flex-col justify-between">
      {/* Main Center Stage with generous breathing room */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 flex flex-col items-center justify-center text-center py-20 sm:py-28 md:py-36">
        <div className="flex flex-col items-center max-w-md mx-auto">
          {/* Watermark-styled 404 in Poppins body font */}
          <span className="text-7xl sm:text-8xl md:text-9xl font-bold font-body text-[var(--text-muted)] opacity-20 select-none tracking-tight leading-none mb-1 sm:mb-2 pointer-events-none">
            404
          </span>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl font-medium font-heading text-[var(--text-primary)] tracking-tight mb-2">
            Page not found.
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-[var(--text-muted)] font-body leading-relaxed mb-8 sm:mb-10">
            Looks like you found a dead end.
          </p>

          {/* Action Button */}
          <div className="flex items-center justify-center">
            <Button
              to="/"
              variant="primary"
              size="lg"
              className="w-full sm:w-auto"
            >
              Go Back Home
            </Button>
          </div>
        </div>
      </main>

      {/* Full Homepage Footer */}
      <Footer />
    </div>
  );
}




