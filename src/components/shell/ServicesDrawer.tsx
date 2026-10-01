import { Layers } from "lucide-react";
import { NavDrawer } from "./NavDrawer";
import { SERVICES_DRAWER_SECTIONS } from "./nav-drawers";

export function ServicesDrawer({ collapsedTrigger }: { collapsedTrigger?: boolean }) {
  return (
    <NavDrawer
      labelKey="services"
      icon={Layers}
      sections={SERVICES_DRAWER_SECTIONS}
      collapsedTrigger={collapsedTrigger}
    />
  );
}
