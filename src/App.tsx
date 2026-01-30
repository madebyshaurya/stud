import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { PrereqWizard } from "@/components/prereq/PrereqWizard";
import Home from "@/pages/Home";
import "./index.css";

function App() {
  return (
    <TooltipProvider>
      <PrereqWizard />
      <Home />
      <Toaster position="bottom-right" richColors />
    </TooltipProvider>
  );
}

export default App;
