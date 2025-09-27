import React, { useState, useCallback, useMemo } from 'react';
import { Search, User, Wifi, WifiOff, Cloud, Database } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import useWalrusProfile from '../hooks/useWalrusProfile';
import { truncateAddress } from '../utils/formatters';

/**
 * PlayerSearch Component
 * Search players using Walrus decentralized storage with fallback to connected players
 */
const PlayerSearch = ({ 
  onPlayerSelect, 
  isOpen, 
  onClose,
  className = ""
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [lastSearchMethod, setLastSearchMethod] = useState(null);
  
  const { 
    searchPlayers, 
    isLoading, 
    error 
  } = useWalrusProfile();

  // Debounced search function
  const handleSearch = useCallback(async (term) => {
    if (!term || term.trim().length < 2) {
      setSearchResults([]);
      setLastSearchMethod(null);
      return;
    }

    try {
      const result = await searchPlayers(term);
      setSearchResults(result.results || []);
      setLastSearchMethod(result.method);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
      setLastSearchMethod('error');
    }
  }, [searchPlayers]);

  // Handle input change with debouncing
  React.useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, handleSearch]);

  // Handle player selection
  const handlePlayerClick = useCallback((player) => {
    onPlayerSelect?.(player);
    onClose?.();
    setSearchTerm('');
    setSearchResults([]);
  }, [onPlayerSelect, onClose]);

  // Get search method display info
  const searchMethodInfo = useMemo(() => {
    const methods = {
      'walrus': { 
        icon: Cloud, 
        label: 'Walrus Storage', 
        color: 'text-purple-400' 
      },
      'cache_empty': { 
        icon: Database, 
        label: 'No Results in Storage', 
        color: 'text-gray-400' 
      },
      'walrus_failed': { 
        icon: WifiOff, 
        label: 'Storage Unavailable', 
        color: 'text-orange-400' 
      },
      'fallback_connected': { 
        icon: Wifi, 
        label: 'Connected Players Only', 
        color: 'text-blue-400' 
      },
      'error': { 
        icon: WifiOff, 
        label: 'Search Failed', 
        color: 'text-red-400' 
      }
    };
    
    return methods[lastSearchMethod] || null;
  }, [lastSearchMethod]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 ${className}`}>
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-6 w-full max-w-md max-h-96">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Search className="w-5 h-5" />
            Find Players
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </Button>
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search by username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
            autoFocus
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Search Method Indicator */}
        {searchMethodInfo && (
          <div className={`flex items-center gap-2 text-xs mb-3 ${searchMethodInfo.color}`}>
            <searchMethodInfo.icon className="w-3 h-3" />
            <span>{searchMethodInfo.label}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="text-red-400 text-sm mb-3 p-2 bg-red-900/20 border border-red-800 rounded">
            {error}
          </div>
        )}

        {/* Search Results */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {searchResults.length === 0 && searchTerm.length >= 2 && !isLoading ? (
            <div className="text-gray-400 text-center py-4">
              No players found matching "{searchTerm}"
            </div>
          ) : (
            searchResults.map((player, index) => (
              <PlayerSearchResult
                key={`${player.userAddress}-${index}`}
                player={player}
                onClick={() => handlePlayerClick(player)}
              />
            ))
          )}
        </div>

        {/* Help Text */}
        {searchTerm.length < 2 && (
          <div className="text-gray-500 text-sm text-center py-4">
            Enter at least 2 characters to search
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Individual search result component
 */
const PlayerSearchResult = ({ player, onClick }) => {
  const getStatusIndicator = () => {
    if (player.isOnline) {
      return <div className="w-2 h-2 bg-green-400 rounded-full" />;
    }
    return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
  };

  const getSourceBadge = () => {
    const badges = {
      'walrus': { label: 'Stored', color: 'bg-purple-600' },
      'connected': { label: 'Online', color: 'bg-blue-600' },
      'contract': { label: 'Chain', color: 'bg-green-600' }
    };
    
    const badge = badges[player.source] || { label: 'Unknown', color: 'bg-gray-600' };
    
    return (
      <span className={`px-1.5 py-0.5 text-xs rounded ${badge.color} text-white`}>
        {badge.label}
      </span>
    );
  };

  return (
    <Button
      variant="ghost"
      className="w-full p-3 flex items-center gap-3 text-left hover:bg-gray-800/50 border border-transparent hover:border-gray-600"
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
        <User className="w-4 h-4 text-white" />
      </div>
      
      {/* Player Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate">
            {player.username || 'Unknown Player'}
          </span>
          {getStatusIndicator()}
        </div>
        
        <div className="text-xs text-gray-400 truncate">
          {player.userAddress ? truncateAddress(player.userAddress) : 'No Address'}
        </div>
        
        {player.room && (
          <div className="text-xs text-blue-400">
            Room: {player.room}
          </div>
        )}
      </div>
      
      {/* Source Badge */}
      <div className="flex-shrink-0">
        {getSourceBadge()}
      </div>
    </Button>
  );
};

export default PlayerSearch;