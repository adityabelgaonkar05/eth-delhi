/**
 * Utility functions for formatting and display
 */

/**
 * Truncates an Ethereum address for display
 * @param {string} address - Full Ethereum address
 * @param {number} startChars - Number of characters to show at start (default 6)
 * @param {number} endChars - Number of characters to show at end (default 4)
 * @returns {string} Truncated address like "0x1234...5678"
 */
export const truncateAddress = (address, startChars = 6, endChars = 4) => {
  if (!address) return 'Unknown';
  if (address.length <= startChars + endChars) return address;
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

/**
 * Formats a token balance for display
 * @param {string|number} balance - Token balance
 * @param {number} decimals - Number of decimal places to show
 * @returns {string} Formatted balance
 */
export const formatBalance = (balance, decimals = 2) => {
  if (!balance || balance === '0') return '0';
  
  const num = parseFloat(balance);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(decimals)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(decimals)}K`;
  }
  
  return num.toFixed(decimals);
};

/**
 * Formats a timestamp to relative time
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Unknown';
  
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

/**
 * Capitalizes the first letter of each word
 * @param {string} str - Input string
 * @returns {string} Capitalized string
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

/**
 * Formats a reputation score with appropriate suffix
 * @param {number} reputation - Reputation score
 * @returns {string} Formatted reputation
 */
export const formatReputation = (reputation) => {
  if (!reputation || reputation === 0) return '0 pts';
  
  if (reputation >= 1000000) {
    return `${(reputation / 1000000).toFixed(1)}M pts`;
  }
  if (reputation >= 1000) {
    return `${(reputation / 1000).toFixed(1)}K pts`;
  }
  
  return `${reputation} pts`;
};

export default {
  truncateAddress,
  formatBalance,
  formatRelativeTime,
  capitalize,
  formatReputation
};