import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import { useContracts, useCryptoVersePetNFT, useCryptoVerseToken } from '../context/ContractContext';

// Import Walrus verified upload data
import walrusData from '../contractData/WalrusVerifiedUpload.json';

const PetNFTShop = () => {
  const { account, signer } = useWallet();
  const { contracts } = useContracts();
  const { contract: petNFTContract } = useCryptoVersePetNFT();
  const { contract: cvrsTokenContract } = useCryptoVerseToken();
  const [pets, setPets] = useState([]);
  const [userPets, setUserPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [cvrsBalance, setCvrsBalance] = useState('0');
  const [cvrsAllowance, setCvrsAllowance] = useState('0');
  const [needsApproval, setNeedsApproval] = useState(false);

  const tierColors = {
    0: { name: 'COMMON', color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-300' },
    1: { name: 'RARE', color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-300' },
    2: { name: 'EPIC', color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-300' },
    3: { name: 'LEGENDARY', color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-300' }
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
            image: petImages[tokenId.toString()]
          };
        })
      );

      setPets(petData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading pet data:', error);
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
      const allowance = await cvrsTokenContract.allowance(account, petNFTAddress);
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
            image: petImages[tokenId.toString()]
          };
        })
      );

      setUserPets(userPetData);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const approveCVRS = async (amount) => {
    try {
      setNeedsApproval(true);
      const cvrsContract = cvrsTokenContract.connect(signer);
      const petNFTAddress = await petNFTContract.getAddress();
      
      const tx = await cvrsContract.approve(petNFTAddress, ethers.parseEther(amount));
      await tx.wait();
      
      // Refresh allowance
      const allowance = await cvrsTokenContract.allowance(account, petNFTAddress);
      setCvrsAllowance(ethers.formatEther(allowance));
      setNeedsApproval(false);
      
      return true;
    } catch (error) {
      console.error('Error approving CVRS:', error);
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
      console.error('Error purchasing pet:', error);
      alert(`Failed to purchase pet: ${error.message}`);
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🐾 CryptoVerse Pet Collection
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Discover and collect unique digital companions for your journey through the CryptoVerse
          </p>
          
          {/* User Stats */}
          {account && (
            <div className="bg-white rounded-lg shadow-md p-4 mb-6 inline-block">
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500">CVRS Balance</p>
                  <p className="text-xl font-bold text-blue-600">
                    {parseFloat(cvrsBalance).toFixed(2)} CVRS
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Pets Owned</p>
                  <p className="text-xl font-bold text-purple-600">{userPets.length}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User's Pets Collection */}
        {userPets.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Pet Collection</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {userPets.map((pet) => {
                const tierData = tierColors[pet.tier];
                return (
                  <div
                    key={pet.tokenId}
                    className={`bg-white rounded-lg shadow-lg overflow-hidden ${tierData.border} border-2`}
                  >
                    <div className="relative">
                      <img
                        src={pet.image}
                        alt={pet.name}
                        className="w-full h-48 object-cover"
                      />
                      <div className={`absolute top-2 right-2 ${tierData.bg} ${tierData.color} px-2 py-1 rounded-full text-xs font-bold`}>
                        {tierData.name}
                      </div>
                      {pet.image.includes('walrus.space') && (
                        <div className="absolute top-2 left-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">
                          🌊 Walrus
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{pet.name}</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Token ID: #{pet.tokenId}</span>
                        <span className="text-sm text-green-600 font-bold">OWNED ✓</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Available Pets Shop */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Available Pets ({pets.length} available)
          </h2>
          
          {pets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-gray-600">All pets have been adopted! 🎉</p>
              <p className="text-gray-500 mt-2">Check back later for new additions to the collection.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {pets.map((pet) => {
                const tierData = tierColors[pet.tier];
                const canAfford = parseFloat(cvrsBalance) >= parseFloat(pet.price);
                
                return (
                  <div
                    key={pet.tokenId}
                    className={`bg-white rounded-lg shadow-lg overflow-hidden ${tierData.border} border-2 hover:shadow-xl transition-shadow`}
                  >
                    <div className="relative">
                      <img
                        src={pet.image}
                        alt={pet.name}
                        className="w-full h-48 object-cover"
                      />
                      <div className={`absolute top-2 right-2 ${tierData.bg} ${tierData.color} px-2 py-1 rounded-full text-xs font-bold`}>
                        {tierData.name}
                      </div>
                      {pet.image.includes('walrus.space') && (
                        <div className="absolute top-2 left-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">
                          🌊 Walrus
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{pet.name}</h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{pet.description}</p>
                      
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xl font-bold text-blue-600">
                          {pet.price} CVRS
                        </span>
                        <span className="text-sm text-gray-500">
                          #{pet.tokenId}
                        </span>
                      </div>

                      <button
                        onClick={() => purchasePet(pet.tokenId, pet.price)}
                        disabled={!account || !canAfford || purchasing === pet.tokenId}
                        className={`w-full py-2 px-4 rounded-lg font-bold transition-colors ${
                          !account
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : !canAfford
                            ? 'bg-red-100 text-red-600 cursor-not-allowed'
                            : purchasing === pet.tokenId
                            ? 'bg-blue-300 text-blue-800 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {!account
                          ? 'Connect Wallet'
                          : !canAfford
                          ? 'Insufficient CVRS'
                          : purchasing === pet.tokenId
                          ? 'Purchasing...'
                          : `Adopt for ${pet.price} CVRS`}
                      </button>

                      {!canAfford && account && (
                        <p className="text-xs text-red-500 mt-1 text-center">
                          Need {(parseFloat(pet.price) - parseFloat(cvrsBalance)).toFixed(2)} more CVRS
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
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Pet Rarity Tiers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(tierColors).map(([tier, data]) => (
              <div key={tier} className={`${data.bg} ${data.border} border rounded-lg p-3 text-center`}>
                <div className={`${data.color} font-bold text-lg`}>{data.name}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {tier === '0' && '100 CVRS'}
                  {tier === '1' && '250 CVRS'}
                  {tier === '2' && '500 CVRS'}
                  {tier === '3' && '1000 CVRS'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PetNFTShop;