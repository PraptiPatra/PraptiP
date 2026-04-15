import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import WhiteboardPage from "@/pages/WhiteboardPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WhiteboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
