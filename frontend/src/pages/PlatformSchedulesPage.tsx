import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlatformLayout } from '@/components/PlatformLayout';
import { getSchedules, type ScheduleRecord } from '@/lib/api';
import { DEFAULT_WORKSPACE_ID } from '@/lib/constants';

export function PlatformSchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getSchedules(DEFAULT_WORKSPACE_ID);
        setSchedules(response.data);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return (
    <PlatformLayout
      eyebrow="Schedules"
      title="Backup automation"
      subtitle="Coordinate cron-based syncs across databases."
      actions={<Button className="bg-[#ff6b35] hover:bg-[#ff6b35]/90 text-white">New schedule</Button>}
    >
      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-display font-semibold">Scheduled jobs</h2>
              <p className="text-sm text-[#777]">Dummy data for layout review</p>
            </div>
            <Button variant="outline" className="border-[#2a2a2a] text-white hover:bg-white/5">
              Pause all
            </Button>
          </div>

          <div className="space-y-4">
            {schedules.map((schedule) => (
              <div
                key={schedule.name}
                className="grid lg:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border border-[#1f1f1f] rounded-xl p-4 bg-[#0c0c0c]"
              >
                <div>
                  <div className="text-sm text-[#a0a0a0]">{schedule.database}</div>
                  <div className="text-white font-medium">{schedule.name}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Cadence</div>
                  <div className="text-sm text-white mt-2 font-mono">{schedule.cadence}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Next run</div>
                  <div className="text-sm text-white mt-2">{schedule.next_run}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Status</div>
                  <span
                    className={`inline-flex mt-2 text-xs px-2 py-1 rounded-full border ${
                      schedule.status === 'Active'
                        ? 'border-[#4ade80]/40 text-[#4ade80]'
                        : 'border-[#f59e0b]/40 text-[#f59e0b]'
                    }`}
                  >
                    {schedule.status}
                  </span>
                </div>
                <div className="flex items-center lg:justify-end">
                  <Button variant="outline" className="border-[#2a2a2a] text-white hover:bg-white/5">
                    Manage
                  </Button>
                </div>
              </div>
            ))}
            {!isLoading && schedules.length === 0 && (
              <div className="text-sm text-[#777]">No schedules found.</div>
            )}
          </div>
        </div>

        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6">
          <h2 className="text-lg font-display font-semibold mb-2">Schedule health</h2>
          <p className="text-sm text-[#777] mb-6">Operational insights for automation</p>
          <div className="space-y-4">
            <div className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-xl p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[#777]">On-time rate</div>
              <div className="text-2xl font-display font-semibold mt-2">98.4%</div>
            </div>
            <div className="bg-[#0c0c0c] border border-[#1f1f1f] rounded-xl p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[#777]">Missed runs</div>
              <div className="text-2xl font-display font-semibold mt-2">3</div>
              <div className="text-xs text-[#777] mt-2">Last 7 days</div>
            </div>
            <Button className="w-full bg-[#ff6b35] hover:bg-[#ff6b35]/90 text-white">
              Review incidents
            </Button>
          </div>
        </div>
      </section>
    </PlatformLayout>
  );
}
