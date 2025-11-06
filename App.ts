import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import InterviewHelper from "./InterviewHelper";
import NotFound from "./pages/NotFound";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/interview" element={<InterviewHelper />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default App;