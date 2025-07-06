import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "lucide-react";

export default function CampaignChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <BarChart className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">Chart visualization will be implemented here</p>
            <p className="text-sm text-gray-400">Using Recharts library</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
