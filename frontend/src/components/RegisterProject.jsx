import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const RegisterProject = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    projectName: "",
    teamName: "",
    description: "",
    category: "",
    techStack: "",
    githubUrl: "",
    demoUrl: "",
    videoUrl: "",
    teamMembers: [""],
    contactEmail: "",
    contactPhone: "",
    projectStatus: "",
    fundingRequired: "",
    timeline: "",
    challenges: "",
    achievements: "",
    futureGoals: "",
  });

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const categories = [
    "DeFi & Finance",
    "Gaming & NFTs",
    "Infrastructure & Tools",
    "Social & Community",
    "AI & Machine Learning",
    "IoT & Hardware",
    "Healthcare",
    "Education",
    "Sustainability",
    "Other",
  ];

  const projectStatuses = [
    "Concept/Idea",
    "Prototype",
    "MVP",
    "Beta",
    "Production",
    "Scaling",
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTeamMemberChange = (index, value) => {
    const newTeamMembers = [...formData.teamMembers];
    newTeamMembers[index] = value;
    setFormData((prev) => ({
      ...prev,
      teamMembers: newTeamMembers,
    }));
  };

  const addTeamMember = () => {
    setFormData((prev) => ({
      ...prev,
      teamMembers: [...prev.teamMembers, ""],
    }));
  };

  const removeTeamMember = (index) => {
    const newTeamMembers = formData.teamMembers.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      teamMembers: newTeamMembers,
    }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Here you would typically send the data to your backend
      console.log("Project Registration Data:", formData);

      // Show success message or redirect
      alert("Project registered successfully! 🎮");
      navigate("/projects"); // Redirect to projects page
    } catch (error) {
      console.error("Error registering project:", error);
      alert("Error registering project. Please try again.");
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2
          className="text-3xl font-bold pixel-text mb-2"
          style={{ color: "#00ffb6" }}
        >
          PROJECT BASICS
        </h2>
        <p className="text-gray-400 normal-text">
          Tell us about your awesome project!
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label
            className="block text-sm font-bold mb-2 pixel-text"
            style={{ color: "#00ffb6" }}
          >
            PROJECT NAME *
          </label>
          <input
            type="text"
            name="projectName"
            value={formData.projectName}
            onChange={handleInputChange}
            className="w-full p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-white normal-text focus:border-[#00ffb6] focus:outline-none"
            placeholder="Enter your project name"
            required
          />
        </div>

        <div>
          <label
            className="block text-sm font-bold mb-2 pixel-text"
            style={{ color: "#00ffb6" }}
          >
            TEAM NAME *
          </label>
          <input
            type="text"
            name="teamName"
            value={formData.teamName}
            onChange={handleInputChange}
            className="w-full p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-white normal-text focus:border-[#00ffb6] focus:outline-none"
            placeholder="Enter your team name"
            required
          />
        </div>
      </div>

      <div>
        <label
          className="block text-sm font-bold mb-2 pixel-text"
          style={{ color: "#00ffb6" }}
        >
          PROJECT DESCRIPTION *
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows="4"
          className="w-full p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-white normal-text focus:border-[#00ffb6] focus:outline-none resize-none"
          placeholder="Describe your project in detail..."
          required
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label
            className="block text-sm font-bold mb-2 pixel-text"
            style={{ color: "#00ffb6" }}
          >
            CATEGORY *
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className="w-full p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-white normal-text focus:border-[#00ffb6] focus:outline-none"
            required
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="block text-sm font-bold mb-2 pixel-text"
            style={{ color: "#00ffb6" }}
          >
            TECH STACK *
          </label>
          <input
            type="text"
            name="techStack"
            value={formData.techStack}
            onChange={handleInputChange}
            className="w-full p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-white normal-text focus:border-[#00ffb6] focus:outline-none"
            placeholder="e.g., React, Node.js, Solidity..."
            required
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2
          className="text-3xl font-bold pixel-text mb-2"
          style={{ color: "#00ffb6" }}
        >
          LINKS & RESOURCES
        </h2>
        <p className="text-gray-400 normal-text">
          Share your project links and resources
        </p>
      </div>

      <div>
        <label
          className="block text-sm font-bold mb-2 pixel-text"
          style={{ color: "#00ffb6" }}
        >
          GITHUB REPOSITORY *
        </label>
        <input
          type="url"
          name="githubUrl"
          value={formData.githubUrl}
          onChange={handleInputChange}
          className="w-full p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-white normal-text focus:border-[#00ffb6] focus:outline-none"
          placeholder="https://github.com/your-repo"
          required
        />
      </div>

      <div>
        <label
          className="block text-sm font-bold mb-2 pixel-text"
          style={{ color: "#00ffb6" }}
        >
          DEMO URL
        </label>
        <input
          type="url"
          name="demoUrl"
          value={formData.demoUrl}
          onChange={handleInputChange}
          className="w-full p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-white normal-text focus:border-[#00ffb6] focus:outline-none"
          placeholder="https://your-demo-site.com"
        />
      </div>

      <div>
        <label
          className="block text-sm font-bold mb-2 pixel-text"
          style={{ color: "#00ffb6" }}
        >
          VIDEO DEMO URL
        </label>
        <input
          type="url"
          name="videoUrl"
          value={formData.videoUrl}
          onChange={handleInputChange}
          className="w-full p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-white normal-text focus:border-[#00ffb6] focus:outline-none"
          placeholder="https://youtube.com/watch?v=..."
        />
      </div>

      <div>
        <label
          className="block text-sm font-bold mb-2 pixel-text"
          style={{ color: "#00ffb6" }}
        >
          TEAM MEMBERS *
        </label>
        {formData.teamMembers.map((member, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="text"
              value={member}
              onChange={(e) => handleTeamMemberChange(index, e.target.value)}
              className="flex-1 p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-white normal-text focus:border-[#00ffb6] focus:outline-none"
              placeholder={`Team member ${index + 1} name`}
              required={index === 0}
            />
            {index > 0 && (
              <button
                type="button"
                onClick={() => removeTeamMember(index)}
                className="px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white pixel-text text-sm"
              >
                REMOVE
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addTeamMember}
          className="mt-2 px-4 py-2 bg-[#00ffb6] hover:bg-[#00e6a6] text-black rounded-lg pixel-text text-sm"
        >
          + ADD MEMBER
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2
          className="text-3xl font-bold pixel-text mb-2"
          style={{ color: "#00ffb6" }}
        >
          PROJECT DETAILS
        </h2>
        <p className="text-gray-400 normal-text">
          Tell us more about your project status and goals
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label
            className="block text-sm font-bold mb-2 pixel-text"
            style={{ color: "#00ffb6" }}
          >
            PROJECT STATUS *
          </label>
          <select
            name="projectStatus"
            value={formData.projectStatus}
            onChange={handleInputChange}
            className="w-full p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-white normal-text focus:border-[#00ffb6] focus:outline-none"
            required
          >
            <option value="">Select status</option>
            {projectStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="block text-sm font-bold mb-2 pixel-text"
            style={{ color: "#00ffb6" }}
          >
            FUNDING REQUIRED
          </label>
          <input
            type="text"
            name="fundingRequired"
            value={formData.fundingRequired}
            onChange={handleInputChange}
            className="w-full p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-white normal-text focus:border-[#00ffb6] focus:outline-none"
            placeholder="e.g., $50,000 or No funding needed"
          />
        </div>
      </div>

      <div>
        <label
          className="block text-sm font-bold mb-2 pixel-text"
          style={{ color: "#00ffb6" }}
        >
          PROJECT TIMELINE
        </label>
        <input
          type="text"
          name="timeline"
          value={formData.timeline}
          onChange={handleInputChange}
          className="w-full p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-white normal-text focus:border-[#00ffb6] focus:outline-none"
          placeholder="e.g., 6 months to MVP, 1 year to production"
        />
      </div>

      <div>
        <label
          className="block text-sm font-bold mb-2 pixel-text"
          style={{ color: "#00ffb6" }}
        >
          KEY CHALLENGES
        </label>
        <textarea
          name="challenges"
          value={formData.challenges}
          onChange={handleInputChange}
          rows="3"
          className="w-full p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-white normal-text focus:border-[#00ffb6] focus:outline-none resize-none"
          placeholder="What are the main challenges you're facing?"
        />
      </div>

      <div>
        <label
          className="block text-sm font-bold mb-2 pixel-text"
          style={{ color: "#00ffb6" }}
        >
          ACHIEVEMENTS SO FAR
        </label>
        <textarea
          name="achievements"
          value={formData.achievements}
          onChange={handleInputChange}
          rows="3"
          className="w-full p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-white normal-text focus:border-[#00ffb6] focus:outline-none resize-none"
          placeholder="What have you accomplished so far?"
        />
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2
          className="text-3xl font-bold pixel-text mb-2"
          style={{ color: "#00ffb6" }}
        >
          CONTACT & GOALS
        </h2>
        <p className="text-gray-400 normal-text">
          Final details and future aspirations
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label
            className="block text-sm font-bold mb-2 pixel-text"
            style={{ color: "#00ffb6" }}
          >
            CONTACT EMAIL *
          </label>
          <input
            type="email"
            name="contactEmail"
            value={formData.contactEmail}
            onChange={handleInputChange}
            className="w-full p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-white normal-text focus:border-[#00ffb6] focus:outline-none"
            placeholder="your-email@example.com"
            required
          />
        </div>

        <div>
          <label
            className="block text-sm font-bold mb-2 pixel-text"
            style={{ color: "#00ffb6" }}
          >
            CONTACT PHONE
          </label>
          <input
            type="tel"
            name="contactPhone"
            value={formData.contactPhone}
            onChange={handleInputChange}
            className="w-full p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-white normal-text focus:border-[#00ffb6] focus:outline-none"
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      <div>
        <label
          className="block text-sm font-bold mb-2 pixel-text"
          style={{ color: "#00ffb6" }}
        >
          FUTURE GOALS & VISION
        </label>
        <textarea
          name="futureGoals"
          value={formData.futureGoals}
          onChange={handleInputChange}
          rows="4"
          className="w-full p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-white normal-text focus:border-[#00ffb6] focus:outline-none resize-none"
          placeholder="Where do you see this project in the future? What's your ultimate vision?"
        />
      </div>

      {/* Summary */}
      <div className="mt-8 p-6 bg-gray-900 rounded-lg border-2 border-[#00ffb6]/30">
        <h3
          className="text-xl font-bold pixel-text mb-4"
          style={{ color: "#00ffb6" }}
        >
          REGISTRATION SUMMARY
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm normal-text">
          <div>
            <strong>Project:</strong> {formData.projectName || "Not specified"}
          </div>
          <div>
            <strong>Team:</strong> {formData.teamName || "Not specified"}
          </div>
          <div>
            <strong>Category:</strong> {formData.category || "Not specified"}
          </div>
          <div>
            <strong>Status:</strong> {formData.projectStatus || "Not specified"}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return renderStep1();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-black border-b-2 border-[#00ffb6] py-8">
        <div className="max-w-4xl mx-auto px-6">
          <button
            onClick={() => navigate("/")}
            className="mb-4 text-[#00ffb6] hover:text-white transition-colors pixel-text text-sm"
          >
            ← BACK TO HOME
          </button>
          <h1
            className="text-4xl md:text-5xl font-bold pixel-text mb-2"
            style={{ color: "#00ffb6" }}
          >
            PROJECT SHOWCASE
          </h1>
          <p className="text-xl normal-text text-gray-400">
            Register your project for the ultimate showcase experience
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 pixel-text font-bold ${
                step <= currentStep
                  ? "bg-[#00ffb6] border-[#00ffb6] text-black"
                  : "bg-gray-800 border-gray-600 text-gray-400"
              }`}
            >
              {step}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs pixel-text text-gray-400">
          <span>BASICS</span>
          <span>LINKS</span>
          <span>DETAILS</span>
          <span>CONTACT</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2 mt-4">
          <div
            className="bg-[#00ffb6] h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-6 pb-8">
        <form
          onSubmit={handleSubmit}
          className="bg-gray-900 rounded-lg p-8 border-2 border-gray-700"
        >
          {renderCurrentStep()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-700">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-6 py-3 rounded-lg pixel-text font-bold transition-colors ${
                currentStep === 1
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-gray-700 hover:bg-gray-600 text-white"
              }`}
            >
              ← PREVIOUS
            </button>

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-3 bg-[#00ffb6] hover:bg-[#00e6a6] text-black rounded-lg pixel-text font-bold transition-colors"
              >
                NEXT →
              </button>
            ) : (
              <button
                type="submit"
                className="px-8 py-3 bg-gradient-to-r from-[#00ffb6] to-[#00e6a6] hover:from-[#00e6a6] hover:to-[#00d199] text-black rounded-lg pixel-text font-bold transition-all duration-300 transform hover:scale-105"
              >
                🚀 REGISTER PROJECT
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterProject;
