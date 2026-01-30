import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import "./index.css";

function App() {
  return (
    <TooltipProvider>
      <Home />
    </TooltipProvider>
  );
}

export default App;
