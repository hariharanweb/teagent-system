import { useRef } from 'react';

interface Props {
  label: string;
  accept: string;
  capture?: boolean;
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function FileDropzone({ label, accept, capture, onFile, disabled }: Props) {
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
        capture={capture ? 'environment' : undefined}
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
