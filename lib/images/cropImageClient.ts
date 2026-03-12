"use client";

import type { Area } from "react-easy-crop";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => {
      reject(new Error("이미지를 불러오지 못했어요."));
    };
    image.src = src;
  });
}

function getOutputMimeType(file: File): string {
  if (file.type === "image/png") return "image/png";
  if (file.type === "image/webp") return "image/webp";
  return "image/jpeg";
}

function replaceFileExtension(fileName: string, extension: string): string {
  const trimmedFileName = fileName.trim();
  if (!trimmedFileName) return `pet-photo.${extension}`;

  const dotIndex = trimmedFileName.lastIndexOf(".");
  if (dotIndex <= 0) return `${trimmedFileName}.${extension}`;
  return `${trimmedFileName.slice(0, dotIndex)}.${extension}`;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("이미지 변환에 실패했어요."));
          return;
        }
        resolve(blob);
      },
      type,
      type === "image/jpeg" || type === "image/webp" ? 0.92 : undefined,
    );
  });
}

export async function createCroppedImageFile({
  imageUrl,
  cropAreaPixels,
  file,
}: {
  imageUrl: string;
  cropAreaPixels: Area;
  file: File;
}): Promise<File> {
  const image = await loadImage(imageUrl);
  const x = Math.max(0, Math.round(cropAreaPixels.x));
  const y = Math.max(0, Math.round(cropAreaPixels.y));
  const width = Math.max(
    1,
    Math.min(Math.round(cropAreaPixels.width), image.naturalWidth - x),
  );
  const height = Math.max(
    1,
    Math.min(Math.round(cropAreaPixels.height), image.naturalHeight - y),
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("이미지 편집을 준비하지 못했어요.");
  }

  context.drawImage(image, x, y, width, height, 0, 0, width, height);

  const mimeType = getOutputMimeType(file);
  const extension =
    mimeType === "image/png"
      ? "png"
      : mimeType === "image/webp"
        ? "webp"
        : "jpg";
  const blob = await canvasToBlob(canvas, mimeType);

  return new File([blob], replaceFileExtension(file.name, extension), {
    type: mimeType,
    lastModified: Date.now(),
  });
}
