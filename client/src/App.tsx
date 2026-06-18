import { Router, Route } from "wouter";
import Home from "@/pages/Home";
import Show1 from "@/pages/Show1";
import Show2 from "@/pages/Show2";
import Show3 from "@/pages/Show3";
import Show4 from "@/pages/Show4";
import Show5 from "@/pages/Show5";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <Router>
      <Route path="/" component={Home} />
      <Route path="/show1" component={Show1} />
      <Route path="/show2" component={Show2} />
      <Route path="/show3" component={Show3} />
      <Route path="/show4" component={Show4} />
      <Route path="/show5" component={Show5} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Router>
  );
}
