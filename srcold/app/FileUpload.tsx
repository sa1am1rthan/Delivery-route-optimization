import React, { ChangeEvent } from 'react';

interface FileUploadProps {
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  return (
    <div>
      <input type="file" accept=".csv" onChange={onFileUpload} />
    </div>
  );
};

export default FileUpload;

