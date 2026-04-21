export function DangerIconBtn({
  onClick,
  onBlur,
  title,
  disabled,
  className = "",
  style,
  children,
}: {
  onClick?: (e: React.MouseEvent) => void;
  onBlur?: () => void;
  title?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      onBlur={onBlur}
      title={title}
      disabled={disabled}
      style={style}
      className={`btn-icon danger ${className}`.trim()}
    >
      {children}
    </button>
  );
}
