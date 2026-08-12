import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../lib/firebase';

export interface UploadResult {
  url: string;
  path: string;
}

export const uploadFile = async (
  file: File,
  folderPath: string = 'uploads'
): Promise<UploadResult> => {
  const fileExtension = file.name.split('.').pop();
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const fileName = `${timestamp}_${randomStr}.${fileExtension}`;
  const fullPath = `${folderPath}/${fileName}`;
  
  const storageRef = ref(storage, fullPath);
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);

  return { url, path: fullPath };
};

export const deleteFileByPath = async (filePath: string): Promise<void> => {
  const storageRef = ref(storage, filePath);
  await deleteObject(storageRef);
};
