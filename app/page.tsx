import Simulator from "@/components/Simulator";
import { TEMPLATES, CLINIC_NAME } from "@/config/templates";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Simulator
      templates={TEMPLATES}
      clinicName={CLINIC_NAME}
      backendUrl={process.env.DENTAL_CARD_URL ?? ""}
    />
  );
}
