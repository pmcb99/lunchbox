import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlatformLayout } from '@/components/PlatformLayout';
import { createKey, deleteKey, getKeys, type KeyRecord } from '@/lib/api';
import { DEFAULT_WORKSPACE_ID } from '@/lib/constants';
import { getActiveApiKey, setActiveApiKey, clearActiveApiKey } from '@/lib/apiKey';

export function PlatformKeysPage() {
  const [keys, setKeys] = useState<KeyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');

  const refresh = async () => {
    const response = await getKeys(DEFAULT_WORKSPACE_ID);
    setKeys(response.data);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await refresh();
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleCreateKey = async () => {
    setIsCreating(true);
    try {
      const response = await createKey(DEFAULT_WORKSPACE_ID, 'Generated from keys page');
      setActiveApiKey(response.data.value);
      await refresh();
      setActionMessage('New API key generated and set as active.');
    } catch {
      setActionMessage('Failed to generate API key.');
    } finally {
      setIsCreating(false);
      window.setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const handleRevokeKey = async (keyId: string, keyValue: string) => {
    const activeKey = getActiveApiKey();
    if (activeKey === keyValue) {
      clearActiveApiKey();
    }
    setIsRevoking(keyId);
    try {
      await deleteKey(DEFAULT_WORKSPACE_ID, keyId, keyValue);
      await refresh();
      setActionMessage('API key revoked.');
    } catch {
      setActionMessage('Failed to revoke API key. Check API key permissions.');
    } finally {
      setIsRevoking(null);
      window.setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const handleSetActiveKey = (keyValue: string) => {
    setActiveApiKey(keyValue);
    setActionMessage('API key set as active.');
    window.setTimeout(() => setActionMessage(''), 3000);
  };

  const activeApiKey = getActiveApiKey();

  return (
    <PlatformLayout
      eyebrow="API keys"
      title="Access control"
      subtitle={actionMessage || 'Rotate, revoke, and scope keys for teams and automation.'}
      actions={
        <Button
          className="bg-[#ff6b35] hover:bg-[#ff6b35]/90 text-white"
          onClick={handleCreateKey}
          disabled={isCreating}
        >
          {isCreating ? 'Generating key...' : 'Generate API key'}
        </Button>
      }
    >
      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-display font-semibold">Keys</h2>
              <p className="text-sm text-[#777]">Dummy data for layout review</p>
            </div>
            <Button variant="outline" className="border-[#2a2a2a] text-white hover:bg-white/5">
              Export keys
            </Button>
          </div>

          <div className="space-y-4">
            {keys.map((key) => (
              <div
                key={key.id}
                className="grid lg:grid-cols-[2fr_1.2fr_1fr_1fr_1fr] gap-4 border border-[#1f1f1f] rounded-xl p-4 bg-[#0c0c0c]"
              >
                <div>
                  <div className="text-sm text-[#a0a0a0]">{key.name}</div>
                  <div className="text-white font-mono">{key.value}</div>
                  {activeApiKey === key.value && (
                    <div className="text-xs text-[#ff6b35] mt-1">Active</div>
                  )}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Created</div>
                  <div className="text-sm text-white mt-2">{key.created_at}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Last used</div>
                  <div className="text-sm text-white mt-2">{key.last_used}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Status</div>
                  <span
                    className={`inline-flex mt-2 text-xs px-2 py-1 rounded-full border ${
                      key.status === 'Active'
                        ? 'border-[#4ade80]/40 text-[#4ade80]'
                        : 'border-[#f97316]/40 text-[#f97316]'
                    }`}
                  >
                    {key.status}
                  </span>
                </div>
                <div className="flex items-center lg:justify-end gap-2">
                  {activeApiKey !== key.value && key.status === 'Active' && (
                    <Button
                      variant="outline"
                      onClick={() => handleSetActiveKey(key.value)}
                      className="border-[#2a2a2a] text-white hover:bg-white/5 text-sm"
                    >
                      Set active
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => handleRevokeKey(key.id, key.value)}
                    disabled={isRevoking === key.id || key.status !== 'Active'}
                    className="border-[#2a2a2a] text-white hover:bg-white/5 text-sm"
                  >
                    {isRevoking === key.id ? 'Revoking...' : 'Revoke'}
                  </Button>
                </div>
              </div>
            ))}
            {!isLoading && keys.length === 0 && (
              <div className="text-sm text-[#777]">No keys found.</div>
            )}
          </div>
        </div>

        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6">
          <h2 className="text-lg font-display font-semibold mb-2">Key policy</h2>
          <p className="text-sm text-[#777] mb-6">Rotation and access governance</p>
          <div className="space-y-4">
            <div className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-xl p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Rotation cadence</div>
              <div className="text-2xl font-display font-semibold mt-2">90 days</div>
            </div>
            <div className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-xl p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Compromised keys</div>
              <div className="text-2xl font-display font-semibold mt-2">0</div>
              <div className="text-xs text-[#777] mt-2">Last 30 days</div>
            </div>
            <Button className="w-full bg-[#ff6b35] hover:bg-[#ff6b35]/90 text-white">
              Update policy
            </Button>
          </div>
        </div>
      </section>
    </PlatformLayout>
  );
}
