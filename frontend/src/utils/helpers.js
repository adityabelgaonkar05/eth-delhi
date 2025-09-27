// Utility functions for business dashboard
export const formatNumber = (num, decimals = 0) => {
  if (!num) return '0';
  const number = typeof num === 'string' ? parseFloat(num) : num;
  
  if (number >= 1000000) {
    return (number / 1000000).toFixed(decimals) + 'M';
  }
  if (number >= 1000) {
    return (number / 1000).toFixed(decimals) + 'K';
  }
  return number.toFixed(decimals);
};

export const formatCurrency = (amount, decimals = 2) => {
  if (!amount) return '$0.00';
  const number = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(number);
};

export const formatEther = (wei, decimals = 4) => {
  if (!wei) return '0 ETH';
  return `${parseFloat(wei).toFixed(decimals)} ETH`;
};

export const formatPercentage = (value, total) => {
  if (!total || total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(1)}%`;
};

export const truncateAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validateUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const getTimeAgo = (timestamp) => {
  const now = Date.now();
  const time = typeof timestamp === 'string' ? parseInt(timestamp) * 1000 : timestamp;
  const diff = now - time;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
};

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
};