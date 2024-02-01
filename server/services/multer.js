const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now();
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uniqueSuffix}-${file.originalname}`;
    cb(null, fileName);
  },
});

const imageFilter = (req, file, cb) => {
  const allowedExtensions = /\.(jpg|jpeg|png|gif)$/i;
  if (!allowedExtensions.test(path.extname(file.originalname))) {
    const error = new Error("Only image files are allowed!");
    error.status = 400;
    return cb(error, false);
  }
  cb(null, true);
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: imageFilter,
});

module.exports = upload;
