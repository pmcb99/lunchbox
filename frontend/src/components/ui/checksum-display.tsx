import { useState } from 'react';
import { truncateChecksum } from '@/lib/format';

export interface ChecksumDisplayProps {
  checksum: string;
}

export function ChecksumDisplay({ checksum }: ChecksumDisplayProps) {
  const [showFull, setShowFull] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayChecksum = showFull ? checksum : truncateChecksum(checksum);
  const needsTruncation = checksum.length > 12;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(checksum);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group flex items-center gap-2">
      <code
        className="text-sm font-mono text-white cursor-pointer hover:text-[#ff6b35] transition-colors"
        onClick={() => needsTruncation && setShowFull(!showFull)}
        title={checksum}
      >
        {displayChecksum}
        {needsTruncation && !showFull && (
          <span className="text-[#777] ml-1">...</span>
        )}
      </code>
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#1f1f1f] rounded"
        title={copied ? 'Copied!' : 'Copy checksum'}
      >
        <svg
          className={`w-3.5 h-3.5 ${copied ? 'text-green-400' : 'text-[#777] hover:text-white'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {copied ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          )}
        </svg>
      </button>
    </div>
  );
}
