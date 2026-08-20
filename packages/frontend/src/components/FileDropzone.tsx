import { useRef } from 'react';

interface Props {
  label: string;
  accept: string;
  capture?: boolean;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export function FileDropzone({ label, accept, capture, multiple, onFiles, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <button
        type="button"
        className="button-primary"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        style={{ width: '100%' }}
      >
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        capture={capture ? 'environment' : undefined}
        style={{ display: 'none' }}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) onFiles(files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
