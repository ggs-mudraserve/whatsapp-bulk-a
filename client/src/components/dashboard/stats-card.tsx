import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number;
  suffix?: string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple' | 'emerald' | 'red' | 'yellow';
  trend?: {
    value?: number;
    label: string;
    suffix?: string;
  };
  loading?: boolean;
}

const colorClasses = {
  blue: 'bg-blue-100 text-blue-500',
  green: 'bg-green-100 text-green-500',
  purple: 'bg-purple-100 text-purple-500',
  emerald: 'bg-emerald-100 text-emerald-500',
  red: 'bg-red-100 text-red-500',
  yellow: 'bg-yellow-100 text-yellow-500',
};

export default function StatsCard({ 
  title, 
  value, 
  suffix, 
  icon: Icon, 
  color, 
  trend, 
  loading 
}: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            {loading ? (
              <div className="animate-pulse bg-gray-200 h-8 w-16 rounded mt-1"></div>
            ) : (
              <p className="text-2xl font-bold text-gray-800">
                {value.toLocaleString()}{suffix}
              </p>
            )}
          </div>
          <div className={cn("p-3 rounded-full", colorClasses[color])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center text-sm">
            {trend.value && (
              <span className="text-green-500 font-medium">
                +{trend.value}{trend.suffix || ''}
              </span>
            )}
            <span className={cn("ml-1 text-gray-500", trend.value ? "" : "text-green-500 font-medium")}>
              {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
