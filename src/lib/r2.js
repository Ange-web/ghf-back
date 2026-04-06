// src/lib/r2.js
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

/**
 * Upload un buffer vers R2
 */
async function uploadToR2(buffer, originalName, folder = 'gallery') {
  const ext = originalName.split('.').pop();
  const key = `${folder}/${uuidv4()}.${ext}`;

  await r2Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: getContentType(ext),
    CacheControl: 'public, max-age=31536000',
  }));

  return {
    key,
    url: `${PUBLIC_URL}/${key}`,
  };
}

/**
 * Supprimer un fichier de R2
 */
async function deleteFromR2(key) {
  await r2Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/**
 * Générer une URL signée pour upload direct depuis le frontend
 */
async function getPresignedUploadUrl(fileName, folder = 'gallery') {
  const ext = fileName.split('.').pop();
  const key = `${folder}/${uuidv4()}.${ext}`;

  const url = await getSignedUrl(
    r2Client,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: getContentType(ext) }),
    { expiresIn: 300 } // 5 min
  );

  return { url, key, publicUrl: `${PUBLIC_URL}/${key}` };
}

function getContentType(ext) {
  const types = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', webp: 'image/webp',
    gif: 'image/gif', avif: 'image/avif',
  };
  return types[ext.toLowerCase()] || 'application/octet-stream';
}

module.exports = { uploadToR2, deleteFromR2, getPresignedUploadUrl };
