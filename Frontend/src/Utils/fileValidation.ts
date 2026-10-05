import toast from 'react-hot-toast';

export const validateCVFile = (file: File): boolean => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  const maxSizeInMB = 5;
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    toast.error('Yalnız PDF və ya DOCX formatında fayllar qəbul olunur!');
    return false;
  }

  if (file.size > maxSizeInBytes) {
    toast.error(`Faylın həcmi ${maxSizeInMB}MB-dan böyük ola bilməz!`);
    return false;
  }

  return true;
};
