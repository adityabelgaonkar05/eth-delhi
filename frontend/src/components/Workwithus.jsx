import React, { useState, useEffect } from "react";
import bgWorkwithus from "../assets/bg-workwithus.png";

const Workwithus = () => {
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Advercase font
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @font-face {
        font-family: 'Advercase';
        src: url('./src/assets/Advercase.otf') format('opentype');
        font-weight: normal;
        font-style: normal;
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  const navigationSections = [
    "Dashboard",
    "Organizer Registration",
    "Business Verification",
    "Reputation Update",
    "Admin Configuration",
    "Global Metrics",
    "Emergency Recovery",
  ];

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e, formType) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      console.log(`Submitting ${formType}:`, formData);
      setIsSubmitting(false);
      setFormData({});
    }, 2000);
  };

  const renderDashboard = () => (
    <div className="space-y-8">
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-3xl">
        <h2
          className="text-4xl font-bold mb-6 uppercase tracking-wider"
          style={{ fontFamily: "Advercase, monospace" }}
        >
          CRYPTOVERSE BUSINESS DASHBOARD
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-yellow-300 border-3 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl">
            <h3 className="font-bold text-lg mb-2 uppercase">
              TOTAL ORGANIZERS
            </h3>
            <p className="text-3xl font-black">1,247</p>
          </div>
          <div
            style={{ backgroundColor: "#00ffb6" }}
            className="border-3 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl"
          >
            <h3 className="font-bold text-lg mb-2 uppercase">
              VERIFIED BUSINESSES
            </h3>
            <p className="text-3xl font-black">856</p>
          </div>
          <div
            style={{ backgroundColor: "#ff8352" }}
            className="border-3 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl"
          >
            <h3 className="font-bold text-lg mb-2 uppercase text-white">
              TOTAL PREMIERES
            </h3>
            <p className="text-3xl font-black text-white">3,421</p>
          </div>
          <div className="bg-white border-3 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-2xl">
            <h3 className="font-bold text-lg mb-2 uppercase">
              REVENUE GENERATED
            </h3>
            <p className="text-3xl font-black">$2.1M</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderOrganizerRegistration = () => (
    <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-3xl">
      <h2
        className="text-4xl font-bold mb-8 uppercase tracking-wider"
        style={{ fontFamily: "Advercase, monospace" }}
      >
        REGISTER ORGANIZER
      </h2>
      <form
        onSubmit={(e) => handleSubmit(e, "organizer-registration")}
        className="space-y-6"
      >
        <div>
          <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
            Business Name *
          </label>
          <input
            type="text"
            required
            className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
            onChange={(e) => handleInputChange("businessName", e.target.value)}
            value={formData.businessName || ""}
          />
        </div>

        <div>
          <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
            Business Description
          </label>
          <textarea
            className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium h-32 rounded-xl"
            onChange={(e) => handleInputChange("description", e.target.value)}
            value={formData.description || ""}
          />
        </div>

        <div>
          <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
            Website URL
          </label>
          <input
            type="url"
            className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
            onChange={(e) => handleInputChange("website", e.target.value)}
            value={formData.website || ""}
          />
        </div>

        <div>
          <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
            Contact Email *
          </label>
          <input
            type="email"
            required
            className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
            onChange={(e) => handleInputChange("contactEmail", e.target.value)}
            value={formData.contactEmail || ""}
          />
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="requestVerification"
            className="w-6 h-6 border-3 border-black"
            onChange={(e) =>
              handleInputChange("requestVerification", e.target.checked)
            }
            checked={formData.requestVerification || false}
          />
          <label
            htmlFor="requestVerification"
            className="text-lg font-bold uppercase tracking-wide"
          >
            Request Business Verification
          </label>
        </div>

        {formData.requestVerification && (
          <div>
            <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
              Payment Amount (ETH) *
            </label>
            <input
              type="number"
              step="0.001"
              required
              className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
              onChange={(e) =>
                handleInputChange("paymentAmount", e.target.value)
              }
              value={formData.paymentAmount || ""}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-yellow-300 hover:bg-yellow-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 text-xl font-black uppercase tracking-wider transition-all duration-150 rounded-2xl"
        >
          {isSubmitting ? "REGISTERING..." : "REGISTER ORGANIZER"}
        </button>
      </form>
    </div>
  );

  const renderBusinessVerification = () => (
    <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-3xl">
      <h2
        className="text-4xl font-bold mb-8 uppercase tracking-wider"
        style={{ fontFamily: "Advercase, monospace" }}
      >
        BUSINESS VERIFICATION
      </h2>
      <form
        onSubmit={(e) => handleSubmit(e, "business-verification")}
        className="space-y-6"
      >
        <div>
          <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
            Organizer Wallet Address *
          </label>
          <input
            type="text"
            required
            placeholder="0x..."
            className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium font-mono rounded-xl"
            onChange={(e) => handleInputChange("organizer", e.target.value)}
            value={formData.organizer || ""}
          />
        </div>

        <div>
          <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
            Verification Status
          </label>
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => handleInputChange("verified", true)}
              className={`px-6 py-3 border-3 border-black font-bold uppercase rounded-xl ${
                formData.verified === true
                  ? "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              } transition-all duration-150`}
              style={{
                backgroundColor:
                  formData.verified === true ? "#00ffb6" : "#ffffff",
              }}
            >
              VERIFIED
            </button>
            <button
              type="button"
              onClick={() => handleInputChange("verified", false)}
              className={`px-6 py-3 border-3 border-black font-bold uppercase rounded-xl ${
                formData.verified === false
                  ? "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white"
                  : "bg-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              } transition-all duration-150`}
              style={{
                backgroundColor:
                  formData.verified === false ? "#ff8352" : "#ffffff",
              }}
            >
              REJECTED
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 text-xl font-black uppercase tracking-wider transition-all duration-150 rounded-2xl"
          style={{ backgroundColor: "#00ffb6" }}
        >
          {isSubmitting ? "UPDATING..." : "UPDATE VERIFICATION"}
        </button>
      </form>
    </div>
  );

  const renderReputationUpdate = () => (
    <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-3xl">
      <h2
        className="text-4xl font-bold mb-8 uppercase tracking-wider"
        style={{ fontFamily: "Advercase, monospace" }}
      >
        UPDATE REPUTATION
      </h2>
      <form
        onSubmit={(e) => handleSubmit(e, "reputation-update")}
        className="space-y-6"
      >
        <div>
          <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
            Organizer Wallet Address *
          </label>
          <input
            type="text"
            required
            placeholder="0x..."
            className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium font-mono rounded-xl"
            onChange={(e) => handleInputChange("organizer", e.target.value)}
            value={formData.organizer || ""}
          />
        </div>

        <div>
          <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
            New Reputation Score (0-10,000) *
          </label>
          <input
            type="number"
            required
            min="0"
            max="10000"
            className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
            onChange={(e) => handleInputChange("newScore", e.target.value)}
            value={formData.newScore || ""}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 text-xl font-black uppercase tracking-wider transition-all duration-150 rounded-2xl text-white"
          style={{ backgroundColor: "#ff8352" }}
        >
          {isSubmitting ? "UPDATING..." : "UPDATE REPUTATION"}
        </button>
      </form>
    </div>
  );

  const renderAdminConfiguration = () => (
    <div className="space-y-8">
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-3xl">
        <h2
          className="text-4xl font-bold mb-8 uppercase tracking-wider"
          style={{ fontFamily: "Advercase, monospace" }}
        >
          SET BUSINESS VERIFICATION FEE
        </h2>
        <form
          onSubmit={(e) => handleSubmit(e, "verification-fee")}
          className="space-y-6"
        >
          <div>
            <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
              New Fee (wei) *
            </label>
            <input
              type="number"
              required
              className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
              onChange={(e) => handleInputChange("fee", e.target.value)}
              value={formData.fee || ""}
            />
          </div>
          <button
            type="submit"
            className="w-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 text-xl font-black uppercase tracking-wider rounded-2xl text-white"
            style={{ backgroundColor: "#ff8352" }}
          >
            UPDATE FEE
          </button>
        </form>
      </div>

      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-3xl">
        <h2
          className="text-4xl font-bold mb-8 uppercase tracking-wider"
          style={{ fontFamily: "Advercase, monospace" }}
        >
          SET PREMIUM ORGANIZER FEE
        </h2>
        <form
          onSubmit={(e) => handleSubmit(e, "premium-fee")}
          className="space-y-6"
        >
          <div>
            <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
              New Fee (wei) *
            </label>
            <input
              type="number"
              required
              className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
              onChange={(e) => handleInputChange("premiumFee", e.target.value)}
              value={formData.premiumFee || ""}
            />
          </div>
          <button
            type="submit"
            className="w-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 text-xl font-black uppercase tracking-wider rounded-2xl"
            style={{ backgroundColor: "#00ffb6" }}
          >
            UPDATE PREMIUM FEE
          </button>
        </form>
      </div>
    </div>
  );

  const renderGlobalMetrics = () => (
    <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-3xl">
      <h2
        className="text-4xl font-bold mb-8 uppercase tracking-wider"
        style={{ fontFamily: "Advercase, monospace" }}
      >
        UPDATE GLOBAL METRICS
      </h2>
      <form
        onSubmit={(e) => handleSubmit(e, "global-metrics")}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            "totalPremieres",
            "totalAttendees",
            "totalAirdropsDistributed",
            "totalTokensDistributed",
            "totalRevenueGenerated",
            "averageAttendanceRate",
            "totalNFTsBadgesMinted",
            "activeOrganizers",
          ].map((field) => (
            <div key={field}>
              <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
                {field.replace(/([A-Z])/g, " $1").toUpperCase()}
              </label>
              <input
                type="number"
                className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
                onChange={(e) => handleInputChange(field, e.target.value)}
                value={formData[field] || ""}
              />
            </div>
          ))}
        </div>
        <button
          type="submit"
          className="w-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 text-xl font-black uppercase tracking-wider rounded-2xl text-white"
          style={{ backgroundColor: "#ff8352" }}
        >
          UPDATE METRICS
        </button>
      </form>
    </div>
  );

  const renderEmergencyRecovery = () => (
    <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 rounded-3xl">
      <h2
        className="text-4xl font-bold mb-8 uppercase tracking-wider text-red-600"
        style={{ fontFamily: "Advercase, monospace" }}
      >
        EMERGENCY TOKEN RECOVERY
      </h2>
      <div className="bg-red-100 border-3 border-red-500 p-4 mb-6 rounded-xl">
        <p className="font-bold uppercase text-red-700">
          ⚠️ WARNING: This action is irreversible!
        </p>
      </div>
      <form
        onSubmit={(e) => handleSubmit(e, "emergency-recovery")}
        className="space-y-6"
      >
        <div>
          <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
            Token Contract Address *
          </label>
          <input
            type="text"
            required
            placeholder="0x..."
            className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium font-mono rounded-xl"
            onChange={(e) => handleInputChange("token", e.target.value)}
            value={formData.token || ""}
          />
        </div>

        <div>
          <label className="block text-lg font-bold mb-2 uppercase tracking-wide">
            Amount to Recover *
          </label>
          <input
            type="number"
            required
            className="w-full p-4 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-lg font-medium rounded-xl"
            onChange={(e) => handleInputChange("amount", e.target.value)}
            value={formData.amount || ""}
          />
        </div>

        <button
          type="submit"
          className="w-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 text-xl font-black uppercase tracking-wider text-white rounded-2xl"
          style={{ backgroundColor: "#ff8352" }}
        >
          EMERGENCY RECOVER
        </button>
      </form>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "Dashboard":
        return renderDashboard();
      case "Organizer Registration":
        return renderOrganizerRegistration();
      case "Business Verification":
        return renderBusinessVerification();
      case "Reputation Update":
        return renderReputationUpdate();
      case "Admin Configuration":
        return renderAdminConfiguration();
      case "Global Metrics":
        return renderGlobalMetrics();
      case "Emergency Recovery":
        return renderEmergencyRecovery();
      default:
        return renderDashboard();
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: `url(${bgWorkwithus})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="min-h-screen bg-black/20 flex">
        {/* Sidebar Navigation */}
        <div className="w-96 bg-white border-r-4 border-black shadow-[12px_0px_0px_0px_rgba(0,0,0,0.2)] overflow-y-auto relative">
          <div className="sticky top-0 bg-white border-b-4 border-black p-8 z-10">
            <h1
              className="text-3xl font-black text-black mb-2 uppercase tracking-wider"
              style={{ fontFamily: "Advercase, monospace" }}
            >
              CRYPTOVERSE
            </h1>
            <p className="text-lg font-bold text-gray-600 uppercase tracking-wide">
              ADMIN PANEL
            </p>
          </div>
          <nav className="p-6 space-y-3">
            {navigationSections.map((section, index) => {
              const getIcon = (idx) => {
                const iconProps = "w-5 h-5 stroke-current fill-none stroke-2";
                switch (idx) {
                  case 0: // Dashboard
                    return (
                      <svg className={iconProps} viewBox="0 0 24 24">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                      </svg>
                    );
                  case 1: // Organizer Registration
                    return (
                      <svg className={iconProps} viewBox="0 0 24 24">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="m22 2-5 5" />
                        <path d="m17 7 5-5" />
                      </svg>
                    );
                  case 2: // Business Verification
                    return (
                      <svg className={iconProps} viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4" />
                        <path d="M21 12c.552 0 1-.448 1-1V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v3c0 .552.448 1 1 1" />
                        <path d="M3 12v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      </svg>
                    );
                  case 3: // Reputation Update
                    return (
                      <svg className={iconProps} viewBox="0 0 24 24">
                        <polygon points="12,2 15.09,8.26 22,9 17,14.74 18.18,21.02 12,17.77 5.82,21.02 7,14.74 2,9 8.91,8.26" />
                      </svg>
                    );
                  case 4: // Admin Configuration
                    return (
                      <svg className={iconProps} viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                    );
                  case 5: // Global Metrics
                    return (
                      <svg className={iconProps} viewBox="0 0 24 24">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                    );
                  case 6: // Emergency Recovery
                    return (
                      <svg className={iconProps} viewBox="0 0 24 24">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                        <path d="M12 9v4" />
                        <path d="M12 17h.01" />
                      </svg>
                    );
                  default:
                    return null;
                }
              };

              return (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`w-full text-left p-4 border-2 font-bold uppercase tracking-wide transition-all duration-200 rounded-xl group flex items-center space-x-4 ${
                    activeSection === section
                      ? "bg-gray-50 text-black border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transform -translate-y-0.5"
                      : "bg-white text-gray-700 border-gray-300 hover:border-gray-500 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] hover:transform hover:-translate-y-0.5"
                  }`}
                >
                  <div
                    className={`${
                      activeSection === section ? "text-black" : "text-gray-500"
                    } transition-colors duration-200`}
                  >
                    {getIcon(index)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-black">{section}</div>
                    {activeSection === section && (
                      <div className="text-xs font-medium text-gray-500 mt-1">
                        ACTIVE
                      </div>
                    )}
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                      activeSection === section ? "bg-black" : "bg-gray-300"
                    }`}
                  ></div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
};

export default Workwithus;
