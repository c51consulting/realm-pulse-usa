import { Shield } from "lucide-react";

export default function Admin() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-gold" />
        <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
      </div>
      <div className="bg-dark-card border border-dark-border rounded-xl p-6">
        <p className="text-[#888]">Admin functionality coming soon.</p>
      </div>
    </div>
  );
}