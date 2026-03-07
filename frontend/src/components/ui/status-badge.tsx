export interface StatusBadgeProps {
  status: 'Verified' | 'Pending' | 'Error';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    Verified: {
      bg: 'bg-green-500/10',
      text: 'text-green-400',
      dot: 'bg-green-400',
    },
    Pending: {
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-400',
      dot: 'bg-yellow-400',
    },
    Error: {
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      dot: 'bg-red-400',
    },
  };

  const { bg, text, dot } = config[status] || config.Pending;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${bg} ${text} text-xs font-medium`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status}
    </div>
  );
}
