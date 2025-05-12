import React, { useEffect, useState, useCallback } from "react";
import { t } from "i18next";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { FiUploadCloud, FiXCircle } from "react-icons/fi";
import Pica from "pica";
import { sha256 } from 'js-sha256';

// Internal imports
import useUtilsFunction from "@/hooks/useUtilsFunction";
import { notifyError, notifySuccess } from "@/utils/toast";
import Container from "@/components/image-uploader/Container";

const Uploader = ({
  setImageUrl,
  imageUrl,
  product,
  folder,
  targetWidth = 800,
  targetHeight = 800,
}) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setError] = useState("");
  const pica = Pica();
  const { globalSetting } = useUtilsFunction();

  // Generate Cloudinary signature for signed uploads
  const generateSignature = useCallback((public_id, timestamp) => {
    const apiSecret = import.meta.env.VITE_APP_CLOUDINARY_API_SECRET;
    const signatureString = `folder=${folder}&public_id=${public_id}&timestamp=${timestamp}&upload_preset=${import.meta.env.VITE_APP_CLOUDINARY_UPLOAD_PRESET}${apiSecret}`;
    return sha256(signatureString);
  }, [folder]);

  const resizeImageToFixedDimensions = useCallback(async (file, width, height) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    return new Promise((resolve) => {
      pica
        .resize(img, canvas, {
          unsharpAmount: 80,
          unsharpRadius: 0.6,
          unsharpThreshold: 2,
        })
        .then((result) => pica.toBlob(result, file.type, 0.9))
        .then((blob) => {
          const resizedFile = new File([blob], file.name, { type: file.type });
          resolve(resizedFile);
        });
    });
  }, [pica]);

  const { getRootProps, getInputProps, fileRejections } = useDropzone({
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    multiple: product ? true : false,
    maxSize: 5242880, // 5 MB in bytes
    maxFiles: globalSetting?.number_of_image_per_product || 2,
    onDrop: async (acceptedFiles) => {
      const resizedFiles = await Promise.all(
        acceptedFiles.map((file) =>
          resizeImageToFixedDimensions(file, targetWidth, targetHeight)
        )
      );
      setFiles(
        resizedFiles.map((file) =>
          Object.assign(file, {
            preview: URL.createObjectURL(file),
          })
        )
      );
    },
  });

  const uploadToCloudinary = useCallback(async (file) => {
    try {
      setLoading(true);
      setError("Uploading....");
  
      const name = file.name.replaceAll(/\s/g, "");
      const public_id = name?.substring(0, name.lastIndexOf("."));
      const timestamp = Math.round(new Date().getTime() / 1000);
      const signature = generateSignature(public_id, timestamp);
  
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", import.meta.env.VITE_APP_CLOUDINARY_UPLOAD_PRESET);
      formData.append("api_key", import.meta.env.VITE_APP_CLOUDINARY_API_KEY);
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);
      formData.append("folder", folder);
      
      if (public_id) {
        formData.append("public_id", public_id);
      }
  
      const response = await axios({
        url: import.meta.env.VITE_APP_CLOUDINARY_URL,
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: formData,
      });
  
      notifySuccess("Image Uploaded successfully!");
      return response.data.secure_url;
    } catch (error) {
      console.error("Upload error:", error);
      notifyError(error.response?.data?.error?.message || "Upload failed");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [folder, generateSignature]);

  useEffect(() => {
    if (fileRejections.length > 0) {
      fileRejections.forEach(({ errors }) => {
        errors.forEach((e) => {
          if (e.code === "too-many-files") {
            notifyError(
              `Maximum ${globalSetting?.number_of_image_per_product} images can be uploaded!`
            );
          } else {
            notifyError(e.message);
          }
        });
      });
    }
  }, [fileRejections, globalSetting]);

  useEffect(() => {
    const uploadFiles = async () => {
      if (files.length === 0) return;

      try {
        const uploadPromises = files.map(uploadToCloudinary);
        const uploadedUrls = await Promise.all(uploadPromises);

        if (product) {
          setImageUrl((prevUrls) => [...prevUrls, ...uploadedUrls]);
        } else {
          setImageUrl(uploadedUrls[0]);
        }
      } catch (error) {
        console.error("Error uploading files:", error);
      } finally {
        setFiles([]);
      }
    };

    uploadFiles();
  }, [files, product, setImageUrl, uploadToCloudinary]);

  const thumbs = files.map((file) => (
    <div key={file.name}>
      <div>
        <img
          className="inline-flex border-2 border-gray-100 w-24 max-h-24"
          src={file.preview}
          alt={file.name}
        />
      </div>
    </div>
  ));

  useEffect(() => {
    return () => {
      files.forEach((file) => URL.revokeObjectURL(file.preview));
    };
  }, [files]);

  const handleRemoveImage = async (img) => {
    try {
      setLoading(true);
      notifyError("Image deleted successfully!");
      if (product) {
        setImageUrl((prev) => prev.filter((i) => i !== img));
      } else {
        setImageUrl("");
      }
    } catch (err) {
      console.error("Error deleting image:", err);
      notifyError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full text-center">
      <div
        className="border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md cursor-pointer px-6 pt-5 pb-6"
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        <span className="mx-auto flex justify-center">
          <FiUploadCloud className="text-3xl text-emerald-500" />
        </span>
        <p className="text-sm mt-2">{t("DragYourImage")}</p>
        <em className="text-xs text-gray-400">{t("imageFormat")}</em>
      </div>

      <div className="text-emerald-500">{loading && err}</div>
      <aside className="flex flex-row flex-wrap mt-4">
        {product ? (
          <DndProvider backend={HTML5Backend}>
            <Container
              setImageUrl={setImageUrl}
              imageUrl={imageUrl}
              handleRemoveImage={handleRemoveImage}
            />
          </DndProvider>
        ) : !product && imageUrl ? (
          <div className="relative">
            <img
              className="inline-flex border rounded-md border-gray-100 dark:border-gray-600 w-24 max-h-24 p-2"
              src={imageUrl}
              alt="product"
            />
            <button
              type="button"
              className="absolute top-0 right-0 text-red-500 focus:outline-none"
              onClick={() => handleRemoveImage(imageUrl)}
            >
              <FiXCircle />
            </button>
          </div>
        ) : (
          thumbs
        )}
      </aside>
    </div>
  );
};

export default Uploader;