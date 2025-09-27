import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import LandingPage from "./components/LandingPage";
import BusinessLanding from "./components/BusinessLanding";
import MultiplayerGame from "./components/MultiplayerGame";
import Cinema from "./components/Cinema";
import Library from "./components/Library";
import Townhall from "./components/Townhall";
import Workwithus from "./components/Workwithus";
import "./App.css";
import { WalletProvider } from "../context/WalletContext";
import { AuthProvider } from "./context/AuthContext";
import WalletSelector from "./components/WalletSelector";

function App() {
  return (
    <AuthProvider>
      <WalletProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/business" element={<BusinessLanding />} />
              <Route path="/game" element={<MultiplayerGame />} />
              <Route path="/workwithus" element={<Workwithus />} />
              <Route path="/admin" element={<Workwithus />} />
              <Route path="/cinema" element={<Cinema />} />
              <Route path="/library" element={<Library />} />
              <Route path="/townhall" element={<Townhall />} />
              {/* <Route path="wallet" element={<WalletSelector />} /> */}
            </Routes>
          </div>
        </Router>
      </WalletProvider>
    </AuthProvider>
  );
}

export default App;
