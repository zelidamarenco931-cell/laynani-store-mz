import { Plane, Ship } from "lucide-react";
import { DELIVERY } from "@/lib/delivery";

interface DeliveryTimesProps {
  showNotice?: boolean;
  className?: string;
}

const DeliveryTimes = ({ showNotice = true, className = "" }: DeliveryTimesProps) => (
  <div className={`space-y-2 ${className}`}>
    <div className="flex items-center gap-2 text-sm">
      <Plane className="h-4 w-4 shrink-0 text-primary" />
      <span>
        <strong className="font-semibold">Entrega aérea:</strong> {DELIVERY.air}
      </span>
    </div>
    <div className="flex items-center gap-2 text-sm">
      <Ship className="h-4 w-4 shrink-0 text-primary" />
      <span>
        <strong className="font-semibold">Entrega marítima:</strong> {DELIVERY.sea}
      </span>
    </div>
    {showNotice && <p className="pt-1 text-xs text-muted-foreground">{DELIVERY.notice}</p>}
  </div>
);

export default DeliveryTimes;
