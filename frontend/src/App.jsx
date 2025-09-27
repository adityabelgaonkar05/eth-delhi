import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SelfAuthProvider } from "./context/SelfAuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthGuard from "./components/AuthGuard";
import LandingPage from "./components/LandingPage";
import BusinessLanding from "./components/BusinessLanding";
import MultiplayerGame from "./components/MultiplayerGame";
import Cinema from "./components/Cinema";
import Library from "./components/Library";
import Townhall from "./components/Townhall";
import Workwithus from "./components/Workwithus";
import ChatTest from "./components/ChatTest";
import PetNFTShop from "./components/PetNFTShop";
import LeaderboardsPage from "./components/LeaderboardsPage";
import QuickNavigation from "./components/QuickNavigation";
import OnboardingPage from "./components/OnboardingPage";
import UserOnboarding from "./components/UserOnboarding";
import "./App.css";
import { WalletProvider } from "./context/WalletContext";
import WalletSelector from "./components/WalletSelector";
import { TokenProvider } from "./context/TokenContract";
import { ContractProvider } from "./context/ContractContext";
import ContractExample from "./components/ContractExample";
import SelfAuthentication from "./components/SelfAuthenticationFixed";

function App() {
  return (
    // <AuthProvider> currently commented out for testing purposes
    <WalletProvider>
      <ContractProvider>
        <TokenProvider>
          <Router>
            <SelfAuthProvider>
              <div className="App">
                <Routes>
                  {/* Public routes */}
                  <Route path="/auth" element={<SelfAuthentication />} />
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/business" element={<BusinessLanding />} />
                  <Route path="/onboarding" element={<OnboardingPage />} />

                  {/* Protected routes that require authentication and onboarding */}
                  <Route path="/game" element={
                    // <AuthGuard>
                    <MultiplayerGame />
                    // </AuthGuard>
                  } />
                  <Route path="/cinema" element={
                    // <AuthGuard>
                    <Cinema />
                    // </AuthGuard>
                  } />
                  <Route path="/library" element={
                    // <AuthGuard>
                    <Library />
                    // </AuthGuard>
                  } />
                  <Route path="/townhall" element={
                    // <AuthGuard>
                    <Townhall />
                    // </AuthGuard>
                  } />

                  {/* Pet Shop route */}
                  <Route path="/pets" element={
                    // <AuthGuard>
                    <PetNFTShop />
                    // </AuthGuard>
                  } />

                  {/* Leaderboards route */}
                  <Route path="/leaderboards" element={
                    // <AuthGuard>
                    <LeaderboardsPage />
                    // </AuthGuard>
                  } />

                  {/* Admin/work routes */}
                  <Route path="/workwithus" element={<Workwithus />} />
                  <Route path="/admin" element={<Workwithus />} />

                  {/* Development/testing routes */}
                  <Route path="/contractTesting" element={<ContractExample />} />
                  {/* <Route path="wallet" element={<WalletSelector />} /> */}
                </Routes>

                {/* Quick Navigation - remove in production */}
                <QuickNavigation />
              </div>
            </SelfAuthProvider>
          </Router>
        </TokenProvider>
      </ContractProvider>
    </WalletProvider>
    // </AuthProvider >
  );
}

export default App;
