import { Routes, Route } from "react-router-dom";
import "./App.css";
import Home from "../src/pages/Home";
import Connect from "./pages/Connect";

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path={"/"} element={<Home />} />
        <Route path={"/connect"} element={<Connect />} />
      </Routes>
    </div>
  );
}

export default App;
