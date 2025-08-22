const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Generate a random salt
const generateSalt = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Hash a password with salt
const hashPassword = async (password, salt) => {
  return await bcrypt.hash(password + salt, 12);
};

// Verify a password
const verifyPassword = async (password, salt, hash) => {
  return await bcrypt.compare(password + salt, hash);
};

// Encrypt content
const encryptContent = (content, key) => {
  const algorithm = 'aes-256-cbc';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(content, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    encrypted,
    iv: iv.toString('hex')
  };
};

// Decrypt content
const decryptContent = (encryptedContent, key, iv) => {
  const algorithm = 'aes-256-cbc';
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(encryptedContent, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Generate encryption key from password
const generateKeyFromPassword = (password, salt) => {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
};

module.exports = {
  generateSalt,
  hashPassword,
  verifyPassword,
  encryptContent,
  decryptContent,
  generateKeyFromPassword
}; 