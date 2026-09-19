// Generate unique password for users
export const generateCommonPassword = (): string => {
  const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4 random digits
  return `Welcome${randomDigits}`;
};

// Generate a more secure password for admin users
export const generateAdminPassword = (): string => {
  const randomDigits = Math.floor(10000 + Math.random() * 90000); // 5 random digits
  return `Admin${randomDigits}`;
};
