// Multer storage engine that saves uploads to Cloudflare R2 through the
// Worker's internal /_r2 endpoint (containers have no persistent disk).
const path = require("path");

const putToR2 = async (key, buffer, contentType) => {
  const res = await fetch(`${process.env.WORKER_URL}/_r2/${key}`, {
    method: "PUT",
    headers: {
      "x-internal-secret": process.env.INTERNAL_SECRET || "",
      "content-type": contentType || "application/octet-stream",
    },
    body: buffer,
  });
  if (!res.ok) throw new Error(`R2 upload failed: ${res.status}`);
};

// namer(req, file) -> filename ; dir is the key prefix under uploads/
const r2Storage = ({ dir = "", namer }) => ({
  _handleFile(req, file, cb) {
    const chunks = [];
    file.stream.on("data", (c) => chunks.push(c));
    file.stream.on("error", cb);
    file.stream.on("end", async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const filename = namer(req, file);
        const key = path.posix.join("uploads", dir, filename);
        await putToR2(key, buffer, file.mimetype);
        cb(null, { filename, path: key, size: buffer.length });
      } catch (e) {
        cb(e);
      }
    });
  },
  _removeFile(req, file, cb) {
    cb(null);
  },
});

module.exports = { r2Storage, putToR2 };
