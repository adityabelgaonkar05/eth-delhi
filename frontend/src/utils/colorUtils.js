// Utility function to generate consistent colors for usernames
export const getUsernameColor = (username) => {
  // Predefined colors that are readable on dark backgrounds
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Mint
    '#F7DC6F', // Light Yellow
    '#BB8FCE', // Light Purple
    '#85C1E9', // Light Blue
    '#F8C471', // Orange
    '#82E0AA', // Light Green
    '#F1948A', // Pink
    '#AED6F1', // Sky Blue
    '#A9DFBF'  // Pastel Green
  ];
  
  // Create a simple hash from username
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get color index
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};