'use client';

export function TextField({
  value,
  onChange,
  placeholder,
  multiline,
  autoFocus,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  autoFocus?: boolean;
  onSubmit?: () => void;
}) {
  if (multiline) {
    return (
      <label className="fld multi">
        <textarea
          value={value}
          rows={4}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (onSubmit && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmit();
          }}
        />
      </label>
    );
  }
  return (
    <label className="fld">
      <input
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (onSubmit && e.key === 'Enter') onSubmit();
        }}
      />
    </label>
  );
}
