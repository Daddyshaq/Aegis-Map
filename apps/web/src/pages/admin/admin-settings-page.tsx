import type { SystemSetting } from '@crisis/types';
import { useState } from 'react';

import { EmptyState, ErrorState } from '@/components/data-states';
import { Icon } from '@/components/icon';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useSystemSettings, useUpdateSystemSetting } from '@/hooks/use-admin';
import { formatDateTime } from '@/lib/format';
import { SectionHeader } from '@/pages/admin/admin-layout';

function stringify(value: unknown): string {
  if (value === undefined) return 'null';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function AdminSettingsPage() {
  const { data: settings, isLoading, isError, error, refetch } = useSystemSettings();

  return (
    <div>
      <SectionHeader
        title="System settings"
        description="Configuration values used across the platform, edited as JSON. Changes take effect immediately — edit with care."
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !settings || settings.length === 0 ? (
        <EmptyState
          icon="settings"
          title="No settings"
          description="There are no configurable system settings."
        />
      ) : (
        <ul className="space-y-4">
          {settings.map((setting) => (
            <li key={setting.key}>
              <SettingCard setting={setting} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SettingCard({ setting }: { setting: SystemSetting }) {
  const updateSetting = useUpdateSystemSetting();
  const initial = stringify(setting.value);
  const [text, setText] = useState(initial);
  const [parseError, setParseError] = useState<string | null>(null);

  const dirty = text !== initial;

  const save = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setParseError('Value must be valid JSON. Wrap plain text in double quotes.');
      return;
    }
    setParseError(null);
    updateSetting.mutate({
      key: setting.key,
      input: { value: parsed, description: setting.description ?? null },
    });
  };

  const reset = () => {
    setText(initial);
    setParseError(null);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-mono text-sm">
          <Icon name="database" className="size-4 text-muted-foreground" aria-hidden />
          {setting.key}
        </CardTitle>
        {setting.description && (
          <p className="text-sm text-muted-foreground">{setting.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          rows={Math.min(Math.max(text.split('\n').length, 3), 16)}
          className="font-mono text-sm"
          aria-label={`Value for ${setting.key}`}
        />

        {parseError && (
          <Alert variant="destructive">
            <Icon name="triangle-alert" aria-hidden />
            <AlertDescription>{parseError}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            Updated {formatDateTime(setting.updatedAt)}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              disabled={!dirty || updateSetting.isPending}
            >
              Reset
            </Button>
            <Button size="sm" onClick={save} disabled={!dirty || updateSetting.isPending}>
              {updateSetting.isPending && (
                <Icon name="loader" className="mr-2 size-4 animate-spin" aria-hidden />
              )}
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
