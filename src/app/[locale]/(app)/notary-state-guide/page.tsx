import { isDatabaseConfigured } from "@/lib/db/config";
import { getNotaryStateGuideData } from "@/lib/queries/notaryStateGuide";
import { NotaryStateGuide } from "@/components/notary-state-guide/NotaryStateGuide";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

export default async function NotaryStateGuidePage() {
  const configured = isDatabaseConfigured();
  const data = configured ? await getNotaryStateGuideData() : {};

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      {!configured && <DatabaseNotConfigured />}
      {configured && <NotaryStateGuide data={data} />}
    </div>
  );
}
