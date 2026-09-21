import type { CrisisReport } from '@crisis/types';
import { Link } from 'react-router-dom';

import { Icon } from '@/components/icon';
import {
  CategoryChip,
  RiskBadge,
  SeverityBadge,
  VerificationBadge,
} from '@/components/status-badges';
import { Card, CardContent } from '@/components/ui/card';
import { formatRelativeTime } from '@/lib/format';
import { routes } from '@/lib/routes';

/** Compact, linkable summary of a crisis report used across lists. */
export function ReportCard({ report }: { report: CrisisReport }) {
  const place = report.locationName ?? `${report.lat.toFixed(4)}, ${report.lng.toFixed(4)}`;

  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {report.category && (
            <CategoryChip
              name={report.category.name}
              icon={report.category.icon}
              color={report.category.color}
              size="sm"
            />
          )}
          <SeverityBadge severity={report.severity} size="sm" />
          <VerificationBadge status={report.verificationStatus} size="sm" />
        </div>

        <div>
          <h3 className="font-semibold leading-snug">
            <Link
              to={routes.reportDetail(report.id)}
              className="hover:underline focus-visible:underline"
            >
              {report.title}
            </Link>
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{report.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Icon name="map-pin" className="size-3.5" aria-hidden />
            <span className="max-w-[16rem] truncate">{place}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="clock" className="size-3.5" aria-hidden />
            <time dateTime={report.reportedAt}>{formatRelativeTime(report.reportedAt)}</time>
          </span>
          {report.corroborationCount > 0 && (
            <span className="inline-flex items-center gap-1" title="Corroborating reports">
              <Icon name="users" className="size-3.5" aria-hidden />
              {report.corroborationCount} corroboration{report.corroborationCount === 1 ? '' : 's'}
            </span>
          )}
          <span className="ml-auto">
            <RiskBadge level={report.riskLevel} size="sm" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
