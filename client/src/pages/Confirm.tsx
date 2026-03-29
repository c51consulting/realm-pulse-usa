import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CheckCircle, XCircle } from "lucide-react";

export default function Confirm() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      return;
    }
    fetch(`/api/register/confirm?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => setStatus(data.success ? "success" : "error"))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="text-center max-w-md">
        {status === "loading" && (
          <div className="animate-pulse">
            <div className="h-12 w-12 rounded-full bg-dark-card mx-auto mb-4" />
            <div className="h-6 bg-dark-card rounded w-48 mx-auto" />
          </div>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Email Confirmed!</h2>
            <p className="text-[#888] mb-6">Your registration is complete. You now have full access to REALM PULSE DAILY.</p>
            <Link href="/">
              <a className="inline-block px-6 py-2 bg-gold text-black font-semibold rounded-lg hover:bg-gold/90">
                Go to Dashboard
              </a>
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Confirmation Failed</h2>
            <p className="text-[#888] mb-6">Invalid or expired confirmation link.</p>
            <Link href="/">
              <a className="inline-block px-6 py-2 bg-dark-card text-white rounded-lg hover:bg-dark-border">
                Go to Dashboard
              </a>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}