import { Sparkles } from "lucide-react";
import { NavDrawer } from "./NavDrawer";
import { ECOSYSTEM_DRAWER_SECTIONS } from "./nav-drawers";

export function EcosystemDrawer({ collapsedTrigger }: { collapsedTrigger?: boolean }) {
  return (
    <NavDrawer
      labelKey="amsEcosystem"
      icon={Sparkles}
      sections={ECOSYSTEM_DRAWER_SECTIONS}
      collapsedTrigger={collapsedTrigger}
    />
  );
}
