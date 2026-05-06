import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fc]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center px-4"
      >
        <div className="w-24 h-24 rounded-full bg-[#1a2744] flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl font-bold text-[#d4a843]">404</span>
        </div>
        <h1 className="text-3xl font-bold text-[#0f1a2e] mb-2">Page Not Found</h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/">
            <Button className="bg-[#1a2744] hover:bg-[#1a2744]/90">
              <Home className="w-4 h-4 mr-2" />
              Back Home
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
