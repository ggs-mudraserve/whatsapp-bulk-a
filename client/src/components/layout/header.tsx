import { Button } from "@/components/ui/button";
import { Bell, Plus } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  primaryAction?: {
    label: string;
    onClick?: () => void;
    component?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    component?: React.ReactNode;
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
          {secondaryAction && (
            secondaryAction.component ? secondaryAction.component : (
              <Button 
                variant="outline" 
                onClick={secondaryAction.onClick}
                className="flex items-center"
              >
                {secondaryAction.icon && <secondaryAction.icon className="w-4 h-4 mr-2" />}
                {secondaryAction.label}
              </Button>
            )
          )}
          {primaryAction && (
            primaryAction.component ? primaryAction.component : (
              <Button onClick={primaryAction.onClick} className="flex items-center">
                {primaryAction.label}
              </Button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
