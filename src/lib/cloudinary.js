// src/lib/cloudinary.js
const cloudinary = require('cloudinary').v2;

// ── Configuration ─────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload un buffer image vers Cloudinary
 * @param {Buffer} buffer - Le buffer du fichier image
 * @param {string} folder - Le dossier Cloudinary (ex: 'gallery', 'events')
 * @returns {Promise<{url: string, publicId: string}>}
 */
async function uploadToCloudinary(buffer, folder = 'ghf-gallery') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        // Transformations automatiques pour optimiser les images
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );
    stream.end(buffer);
  });
}

/**
 * Supprimer une image de Cloudinary par son public_id
 * @param {string} publicId - L'identifiant public Cloudinary
 */
async function deleteFromCloudinary(publicId) {
  await cloudinary.uploader.destroy(publicId);
}

/**
 * Générer une URL optimisée pour une image Cloudinary
 * Utile pour le frontend : créer des vignettes, redimensionner, etc.
 * @param {string} publicId - L'identifiant public Cloudinary
 * @param {object} options - Options de transformation (width, height, crop...)
 * @returns {string} URL transformée
 */
function getOptimizedUrl(publicId, options = {}) {
  return cloudinary.url(publicId, {
    secure: true,
    quality: 'auto',
    fetch_format: 'auto',
    ...options,
  });
}

module.exports = { cloudinary, uploadToCloudinary, deleteFromCloudinary, getOptimizedUrl };
