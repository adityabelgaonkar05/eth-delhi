import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../context/WalletContext";
import {
  useContracts,
  useCryptoVersePetNFT,
  useCryptoVerseToken,
} from "../context/ContractContext";

// Import Walrus verified upload data
import walrusData from "../contractData/WalrusVerifiedUpload.json";

const PetNFTShop = () => {
  const { account, signer } = useWallet();
  const { contracts } = useContracts();
  const { contract: petNFTContract } = useCryptoVersePetNFT();
  const { contract: cvrsTokenContract } = useCryptoVerseToken();
  const [pets, setPets] = useState([]);
  const [userPets, setUserPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [cvrsBalance, setCvrsBalance] = useState("0");
  const [cvrsAllowance, setCvrsAllowance] = useState("0");
  const [needsApproval, setNeedsApproval] = useState(false);

  const tierColors = {
    0: {
      name: "COMMON",
      color: "text-gray-600",
      bg: "bg-gray-100",
      border: "border-gray-300",
    },
    1: {
      name: "RARE",
      color: "text-blue-600",
      bg: "bg-blue-100",
      border: "border-blue-300",
    },
    2: {
      name: "EPIC",
      color: "text-purple-600",
      bg: "bg-purple-100",
      border: "border-purple-300",
    },
    3: {
      name: "LEGENDARY",
      color: "text-yellow-600",
      bg: "bg-yellow-100",
      border: "border-yellow-300",
    },
  };

  // Create mapping from Walrus verified uploads
  const petImages = walrusData.assets.reduce((acc, asset) => {
    if (asset.imageBlobId) {
      acc[asset.petId] = asset.imageUrl;
    } else {
      // Fallback to local images for pets that failed to upload
      acc[asset.petId] = `/images/pet${asset.petId}.webp`;
    }
    return acc;
  }, {});

  useEffect(() => {
    if (petNFTContract && cvrsTokenContract && account) {
      loadPetData();
      loadUserData();
    }
  }, [petNFTContract, cvrsTokenContract, account]);

  const loadPetData = async () => {
    try {
      // Get available pets
      const [tokenIds, availablePets] = await petNFTContract.getAvailablePets();

      const petData = await Promise.all(
        tokenIds.map(async (tokenId, index) => {
          const pet = availablePets[index];
          return {
            tokenId: tokenId.toString(),
            name: pet.name,
            description: pet.description,
            tier: pet.tier,
            price: ethers.formatEther(pet.price),
            isForSale: pet.isForSale,
            image: petImages[tokenId.toString()],
          };
        })
      );

      setPets(petData);
      setLoading(false);
    } catch (error) {
      console.error("Error loading pet data:", error);
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      // Get CVRS balance
      const balance = await cvrsTokenContract.balanceOf(account);
      setCvrsBalance(ethers.formatEther(balance));

      // Get CVRS allowance for Pet NFT contract
      const petNFTAddress = await petNFTContract.getAddress();
      const allowance = await cvrsTokenContract.allowance(
        account,
        petNFTAddress
      );
      setCvrsAllowance(ethers.formatEther(allowance));

      // Get user's pets
      const userTokens = await petNFTContract.getUserPets(account);
      const userPetData = await Promise.all(
        userTokens.map(async (tokenId) => {
          const pet = await petNFTContract.getPetDetails(tokenId);
          return {
            tokenId: tokenId.toString(),
            name: pet.name,
            tier: pet.tier,
            image: petImages[tokenId.toString()],
          };
        })
      );

      setUserPets(userPetData);
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const approveCVRS = async (amount) => {
    try {
      setNeedsApproval(true);
      const cvrsContract = cvrsTokenContract.connect(signer);
      const petNFTAddress = await petNFTContract.getAddress();

      const tx = await cvrsContract.approve(
        petNFTAddress,
        ethers.parseEther(amount)
      );
      await tx.wait();

      // Refresh allowance
      const allowance = await cvrsTokenContract.allowance(
        account,
        petNFTAddress
      );
      setCvrsAllowance(ethers.formatEther(allowance));
      setNeedsApproval(false);

      return true;
    } catch (error) {
      console.error("Error approving CVRS:", error);
      setNeedsApproval(false);
      return false;
    }
  };

  const purchasePet = async (tokenId, price) => {
    try {
      setPurchasing(tokenId);

      // Check if approval is needed
      if (parseFloat(cvrsAllowance) < parseFloat(price)) {
        const approved = await approveCVRS(price);
        if (!approved) {
          setPurchasing(null);
          return;
        }
      }

      // Purchase the pet
      const petNFTContractWithSigner = petNFTContract.connect(signer);
      const tx = await petNFTContractWithSigner.purchasePet(tokenId);
      await tx.wait();

      // Refresh data
      await loadPetData();
      await loadUserData();

      alert(`Successfully purchased pet ${tokenId}!`);
    } catch (error) {
      console.error("Error purchasing pet:", error);
      alert(`Failed to purchase pet: ${error.message}`);
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{
          fontFamily: "monospace",
          backgroundImage: "url(/src/assets/bg-sections.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: "#44ff44" }}
        ></div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-8 px-6"
      style={{
        fontFamily: "monospace",
        backgroundImage: "url(/src/assets/bg-sections.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Page Header */}
        <div className="text-center">
          <div
            style={{
              backgroundColor: "#2a1810",
              border: "3px solid #8b4513",
              borderRadius: "0",
              boxShadow:
                "6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321",
              padding: "25px",
              imageRendering: "pixelated",
              textShadow: "2px 2px 0px #1a0f08",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              position: "relative",
            }}
          >
            {/* Medieval decorative border pattern */}
            <div
              style={{
                position: "absolute",
                top: "2px",
                left: "2px",
                right: "2px",
                height: "2px",
                background:
                  "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
                imageRendering: "pixelated",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "2px",
                left: "2px",
                right: "2px",
                height: "2px",
                background:
                  "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
                imageRendering: "pixelated",
              }}
            />

            <div className="flex items-center justify-center gap-4 mb-3">
              <span style={{ color: "#d2b48c", fontSize: "2rem" }}>🐾</span>
              <h1
                className="text-4xl font-bold uppercase tracking-wider"
                style={{
                  fontFamily: "monospace",
                  textShadow: "3px 3px 0px #1a0f08",
                  color: "#d2b48c",
                  fontWeight: "bold",
                }}
              >
                PET COLLECTION
              </h1>
              <span style={{ color: "#d2b48c", fontSize: "2rem" }}>🐾</span>
            </div>
            <p
              className="uppercase tracking-wider text-lg"
              style={{
                fontFamily: "monospace",
                color: "#ffd700",
                fontWeight: "bold",
              }}
            >
              DISCOVER & COLLECT DIGITAL COMPANIONS
            </p>
          </div>
        </div>
      </div>

      {/* User Stats */}
      {account && (
        <div className="text-center mt-8 mb-8">
          <div
            style={{
              backgroundColor: "#2a1810",
              border: "3px solid #8b4513",
              borderRadius: "0",
              boxShadow:
                "6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321",
              padding: "20px",
              imageRendering: "pixelated",
              textShadow: "2px 2px 0px #1a0f08",
              position: "relative",
              display: "inline-block",
            }}
          >
            {/* Medieval decorative border pattern */}
            <div
              style={{
                position: "absolute",
                top: "2px",
                left: "2px",
                right: "2px",
                height: "2px",
                background:
                  "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
                imageRendering: "pixelated",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "2px",
                left: "2px",
                right: "2px",
                height: "2px",
                background:
                  "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
                imageRendering: "pixelated",
              }}
            />

            <div className="flex items-center space-x-8">
              <div className="text-center">
                <p
                  className="text-sm uppercase tracking-wider"
                  style={{
                    fontFamily: "monospace",
                    color: "#d2b48c",
                    fontWeight: "bold",
                  }}
                >
                  CVRS BALANCE
                </p>
                <p
                  className="text-xl font-bold uppercase tracking-wider"
                  style={{
                    fontFamily: "monospace",
                    color: "#44ff44",
                    fontWeight: "bold",
                  }}
                >
                  {parseFloat(cvrsBalance).toFixed(2)} CVRS
                </p>
              </div>
              <div className="text-center">
                <p
                  className="text-sm uppercase tracking-wider"
                  style={{
                    fontFamily: "monospace",
                    color: "#d2b48c",
                    fontWeight: "bold",
                  }}
                >
                  PETS OWNED
                </p>
                <p
                  className="text-xl font-bold uppercase tracking-wider"
                  style={{
                    fontFamily: "monospace",
                    color: "#ff6b6b",
                    fontWeight: "bold",
                  }}
                >
                  {userPets.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User's Pets Collection */}
      {userPets.length > 0 && (
        <div className="mt-8 mb-8">
          <div
            style={{
              backgroundColor: "#2a1810",
              border: "3px solid #8b4513",
              borderRadius: "0",
              boxShadow:
                "6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321",
              padding: "25px",
              imageRendering: "pixelated",
              textShadow: "2px 2px 0px #1a0f08",
              position: "relative",
            }}
          >
            {/* Medieval decorative border pattern */}
            <div
              style={{
                position: "absolute",
                top: "2px",
                left: "2px",
                right: "2px",
                height: "2px",
                background:
                  "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
                imageRendering: "pixelated",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "2px",
                left: "2px",
                right: "2px",
                height: "2px",
                background:
                  "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
                imageRendering: "pixelated",
              }}
            />

            <h2
              className="text-2xl font-bold mb-6 uppercase tracking-wider text-center"
              style={{
                fontFamily: "monospace",
                color: "#d2b48c",
                fontWeight: "bold",
              }}
            >
              🏰 YOUR PET COLLECTION
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {userPets.map((pet) => {
                const tierData = tierColors[pet.tier];
                return (
                  <div
                    key={pet.tokenId}
                    className="overflow-hidden"
                    style={{
                      backgroundColor: "#1a0f08",
                      border: "2px solid #8b4513",
                      borderRadius: "0",
                      boxShadow: "3px 3px 0px #1a0f08",
                    }}
                  >
                    <div className="relative">
                      <img
                        src={pet.image}
                        alt={pet.name}
                        className="w-full h-48 object-cover"
                      />
                      <div
                        className="absolute top-2 right-2 px-2 py-1 text-xs font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor:
                            tierData.name === "COMMON"
                              ? "#654321"
                              : tierData.name === "RARE"
                              ? "#6b6bff"
                              : tierData.name === "EPIC"
                              ? "#ff6b6b"
                              : "#ffd700",
                          color: "#ffffff",
                          fontFamily: "monospace",
                          textShadow: "1px 1px 0px #1a0f08",
                        }}
                      >
                        {tierData.name}
                      </div>
                      {pet.image.includes("walrus.space") && (
                        <div
                          className="absolute top-2 left-2 px-2 py-1 text-xs font-bold uppercase tracking-wider"
                          style={{
                            backgroundColor: "#44ff44",
                            color: "#1a0f08",
                            fontFamily: "monospace",
                            textShadow: "1px 1px 0px #ffffff",
                          }}
                        >
                          🌊 WALRUS
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3
                        className="text-lg font-bold mb-2 uppercase tracking-wider"
                        style={{
                          fontFamily: "monospace",
                          color: "#d2b48c",
                          fontWeight: "bold",
                        }}
                      >
                        {pet.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span
                          className="text-sm uppercase tracking-wider"
                          style={{
                            fontFamily: "monospace",
                            color: "#ffd700",
                            fontWeight: "bold",
                          }}
                        >
                          TOKEN ID: #{pet.tokenId}
                        </span>
                        <span
                          className="text-sm font-bold uppercase tracking-wider"
                          style={{
                            fontFamily: "monospace",
                            color: "#44ff44",
                            fontWeight: "bold",
                          }}
                        >
                          OWNED ✓
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Available Pets Shop */}
      <div className="mt-8 mb-8 max-w-6xl mx-auto">
        <div
          style={{
            backgroundColor: "#2a1810",
            border: "3px solid #8b4513",
            borderRadius: "0",
            boxShadow:
              "6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321",
            padding: "25px",
            imageRendering: "pixelated",
            textShadow: "2px 2px 0px #1a0f08",
            position: "relative",
          }}
        >
          {/* Medieval decorative border pattern */}
          <div
            style={{
              position: "absolute",
              top: "2px",
              left: "2px",
              right: "2px",
              height: "2px",
              background:
                "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
              imageRendering: "pixelated",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "2px",
              left: "2px",
              right: "2px",
              height: "2px",
              background:
                "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
              imageRendering: "pixelated",
            }}
          />

          <h2
            className="text-2xl font-bold mb-6 uppercase tracking-wider text-center"
            style={{
              fontFamily: "monospace",
              color: "#d2b48c",
              fontWeight: "bold",
            }}
          >
            🛒 AVAILABLE PETS ({pets.length} AVAILABLE)
          </h2>

          {pets.length === 0 ? (
            <div className="text-center py-12">
              <p
                className="text-xl uppercase tracking-wider"
                style={{
                  fontFamily: "monospace",
                  color: "#ffd700",
                  fontWeight: "bold",
                }}
              >
                ALL PETS HAVE BEEN ADOPTED! 🎉
              </p>
              <p
                className="mt-2 uppercase tracking-wider"
                style={{
                  fontFamily: "monospace",
                  color: "#d2b48c",
                  fontWeight: "bold",
                }}
              >
                CHECK BACK LATER FOR NEW ADDITIONS TO THE COLLECTION.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {pets.map((pet) => {
                const tierData = tierColors[pet.tier];
                const canAfford =
                  parseFloat(cvrsBalance) >= parseFloat(pet.price);

                return (
                  <div
                    key={pet.tokenId}
                    className="overflow-hidden transition-all duration-200"
                    style={{
                      backgroundColor: "#1a0f08",
                      border: "2px solid #8b4513",
                      borderRadius: "0",
                      boxShadow: "3px 3px 0px #1a0f08",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "6px 6px 0px #1a0f08";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "3px 3px 0px #1a0f08";
                      e.currentTarget.style.transform = "translateY(0px)";
                    }}
                  >
                    <div className="relative">
                      <img
                        src={pet.image}
                        alt={pet.name}
                        className="w-full h-48 object-cover"
                      />
                      <div
                        className="absolute top-2 right-2 px-2 py-1 text-xs font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor:
                            tierData.name === "COMMON"
                              ? "#654321"
                              : tierData.name === "RARE"
                              ? "#6b6bff"
                              : tierData.name === "EPIC"
                              ? "#ff6b6b"
                              : "#ffd700",
                          color: "#ffffff",
                          fontFamily: "monospace",
                          textShadow: "1px 1px 0px #1a0f08",
                        }}
                      >
                        {tierData.name}
                      </div>
                      {pet.image.includes("walrus.space") && (
                        <div
                          className="absolute top-2 left-2 px-2 py-1 text-xs font-bold uppercase tracking-wider"
                          style={{
                            backgroundColor: "#44ff44",
                            color: "#1a0f08",
                            fontFamily: "monospace",
                            textShadow: "1px 1px 0px #ffffff",
                          }}
                        >
                          🌊 WALRUS
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3
                        className="text-lg font-bold mb-2 uppercase tracking-wider"
                        style={{
                          fontFamily: "monospace",
                          color: "#d2b48c",
                          fontWeight: "bold",
                        }}
                      >
                        {pet.name}
                      </h3>
                      <p
                        className="text-sm mb-3 line-clamp-2 uppercase tracking-wide"
                        style={{
                          fontFamily: "monospace",
                          color: "#ffd700",
                          fontWeight: "bold",
                        }}
                      >
                        {pet.description}
                      </p>

                      <div className="flex items-center justify-between mb-4">
                        <span
                          className="text-xl font-bold uppercase tracking-wider"
                          style={{
                            fontFamily: "monospace",
                            color: "#44ff44",
                            fontWeight: "bold",
                          }}
                        >
                          {pet.price} CVRS
                        </span>
                        <span
                          className="text-sm uppercase tracking-wider"
                          style={{
                            fontFamily: "monospace",
                            color: "#d2b48c",
                            fontWeight: "bold",
                          }}
                        >
                          #{pet.tokenId}
                        </span>
                      </div>

                      <button
                        onClick={() => purchasePet(pet.tokenId, pet.price)}
                        disabled={
                          !account || !canAfford || purchasing === pet.tokenId
                        }
                        className="w-full py-2 px-4 font-bold uppercase tracking-wider transition-all duration-200"
                        style={{
                          fontFamily: "monospace",
                          border: "2px solid #8b4513",
                          borderRadius: "0",
                          textShadow: "2px 2px 0px #1a0f08",
                          backgroundColor: !account
                            ? "#654321"
                            : !canAfford
                            ? "#ff6b6b"
                            : purchasing === pet.tokenId
                            ? "#6b6bff"
                            : "#44ff44",
                          color: "#ffffff",
                          cursor:
                            !account || !canAfford || purchasing === pet.tokenId
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        {!account
                          ? "CONNECT WALLET"
                          : !canAfford
                          ? "INSUFFICIENT CVRS"
                          : purchasing === pet.tokenId
                          ? "PURCHASING..."
                          : `ADOPT FOR ${pet.price} CVRS`}
                      </button>

                      {!canAfford && account && (
                        <p
                          className="text-xs mt-1 text-center uppercase tracking-wider"
                          style={{
                            fontFamily: "monospace",
                            color: "#ff6b6b",
                            fontWeight: "bold",
                          }}
                        >
                          NEED{" "}
                          {(
                            parseFloat(pet.price) - parseFloat(cvrsBalance)
                          ).toFixed(2)}{" "}
                          MORE CVRS
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tier Information */}
        <div className="mt-8 mb-8">
          <div
            style={{
              backgroundColor: "#2a1810",
              border: "3px solid #8b4513",
              borderRadius: "0",
              boxShadow:
                "6px 6px 0px #1a0f08, inset 2px 2px 0px #d2b48c, inset -2px -2px 0px #654321",
              padding: "25px",
              imageRendering: "pixelated",
              textShadow: "2px 2px 0px #1a0f08",
              position: "relative",
            }}
          >
            {/* Medieval decorative border pattern */}
            <div
              style={{
                position: "absolute",
                top: "2px",
                left: "2px",
                right: "2px",
                height: "2px",
                background:
                  "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
                imageRendering: "pixelated",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "2px",
                left: "2px",
                right: "2px",
                height: "2px",
                background:
                  "linear-gradient(90deg, #8b4513 0%, #d2b48c 50%, #8b4513 100%)",
                imageRendering: "pixelated",
              }}
            />

            <h3
              className="text-xl font-bold mb-4 uppercase tracking-wider text-center"
              style={{
                fontFamily: "monospace",
                color: "#d2b48c",
                fontWeight: "bold",
              }}
            >
              ⚔️ PET RARITY TIERS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(tierColors).map(([tier, data]) => (
                <div
                  key={tier}
                  className="border p-3 text-center"
                  style={{
                    backgroundColor: "#1a0f08",
                    border: "2px solid #8b4513",
                    borderRadius: "0",
                    boxShadow: "3px 3px 0px #1a0f08",
                  }}
                >
                  <div
                    className="font-bold text-lg uppercase tracking-wider"
                    style={{
                      fontFamily: "monospace",
                      color:
                        tier === "0"
                          ? "#654321"
                          : tier === "1"
                          ? "#6b6bff"
                          : tier === "2"
                          ? "#ff6b6b"
                          : "#ffd700",
                      fontWeight: "bold",
                    }}
                  >
                    {data.name}
                  </div>
                  <div
                    className="text-sm mt-1 uppercase tracking-wider"
                    style={{
                      fontFamily: "monospace",
                      color: "#ffd700",
                      fontWeight: "bold",
                    }}
                  >
                    {tier === "0" && "100 CVRS"}
                    {tier === "1" && "250 CVRS"}
                    {tier === "2" && "500 CVRS"}
                    {tier === "3" && "1000 CVRS"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PetNFTShop;
