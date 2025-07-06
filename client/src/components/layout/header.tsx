import { Button } from "@/components/ui/button";
import { Bell, Plus } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ComponentType<any>;
  };
}

export default function Header({ title, subtitle, primaryAction, secondaryAction }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          {subtitle && (
            <p className="text-gray-600">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              2
            </span>
          </Button>
          {secondaryAction && (
            <Button 
              variant="outline" 
              onClick={secondaryAction.onClick}
              className="flex items-center"
            >
              {secondaryAction.icon && <secondaryAction.icon className="w-4 h-4 mr-2" />}
              {secondaryAction.label}
            </Button>
          )}
          {primaryAction && (
            <Button onClick={primaryAction.onClick} className="flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              {primaryAction.label}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
